import os
from typing import Optional
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from alpaca.trading.client import TradingClient
from alpaca.data.historical import StockHistoricalDataClient, CryptoHistoricalDataClient
from alpaca.data.live import StockDataStream, CryptoDataStream
from datetime import datetime, timezone, timedelta
import httpx
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
import anthropic
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer(auto_error=False)

# Initialize clients
def get_supabase_client() -> Client:
    """Get Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase configuration missing")
    
    return create_client(supabase_url, supabase_key)

async def get_alpaca_trading_client(
    current_user,
    supabase: Client
) -> TradingClient:
    """Get Alpaca trading client with proper paper/live mode detection"""
    try:
        # Query for user's connected Alpaca account
        logger.info(f"🔍 Looking up Alpaca account for user_id: {current_user.id}")
        resp = supabase.table("brokerage_accounts").select("*").eq("user_id", current_user.id).eq("brokerage", "alpaca").eq("is_connected", True).execute()

        logger.info(f"📊 Database query returned {len(resp.data) if resp.data else 0} connected Alpaca accounts")

        if not resp.data or len(resp.data) == 0:
            logger.error(f"❌ No connected Alpaca account found for user {current_user.id}")
            raise HTTPException(
                status_code=403,
                detail="No Alpaca account connected. Please connect your Alpaca account in the Accounts page before trading."
            )

        account = resp.data[0]
        access_token = account.get("access_token")
        refresh_token = account.get("refresh_token")
        expires_at = account.get("expires_at")
        oauth_data = account.get("oauth_data", {})
        account_number = account.get("account_number")
        account_name = account.get("account_name", "Unknown")

        # Determine if this is a paper or live account from OAuth data
        is_paper = oauth_data.get("env", "paper") == "paper"
        api_base = oauth_data.get("api_base", "https://paper-api.alpaca.markets")
        alpaca_account_id = oauth_data.get("alpaca_account_id", account_number)

        logger.info(f"🔗 Found Alpaca account - User: {current_user.id}, Account: {account_name}, Alpaca ID: {alpaca_account_id}, Mode: {'PAPER' if is_paper else 'LIVE'}")
        logger.info(f"🔗 API Base: {api_base}, DB Account ID: {account['id']}")

        # Check if token is expired
        if expires_at:
            expiry_time = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) >= expiry_time:
                logger.warning(f"⚠️ OAuth token expired at {expires_at}, attempting refresh...")
                if refresh_token:
                    access_token = await refresh_alpaca_token(account["id"], refresh_token, supabase)
                    if not access_token:
                        raise HTTPException(
                            status_code=401,
                            detail="Alpaca token expired and refresh failed. Please reconnect your account."
                        )
                else:
                    raise HTTPException(
                        status_code=401,
                        detail="Alpaca token expired and no refresh token available. Please reconnect your account."
                    )

        if not access_token:
            logger.error(f"❌ No valid access token found for user {current_user.id}")
            raise HTTPException(
                status_code=401,
                detail="No valid Alpaca access token found. Please reconnect your account."
            )

        # Use OAuth token with correct paper/live mode
        logger.info(f"✅ Using OAuth token for {'PAPER' if is_paper else 'LIVE'} trading on account {alpaca_account_id}")
        return TradingClient(api_key=access_token, secret_key="", paper=is_paper, oauth_token=access_token)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating Alpaca trading client: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create Alpaca client: {str(e)}")

async def refresh_alpaca_token(account_id: str, refresh_token: str, supabase: Client) -> Optional[str]:
    """Refresh Alpaca OAuth token"""
    try:
        client_id = os.getenv("ALPACA_CLIENT_ID")
        client_secret = os.getenv("ALPACA_CLIENT_SECRET")
        
        if not client_id or not client_secret:
            logger.error("Alpaca OAuth configuration missing for token refresh")
            return None
        
        token_data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.alpaca.markets/oauth/token",
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
        
        if response.status_code == 200:
            token_data = response.json()
            new_access_token = token_data.get("access_token")
            new_refresh_token = token_data.get("refresh_token", refresh_token)
            expires_in = token_data.get("expires_in", 3600)
            
            # Update database
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            supabase.table("brokerage_accounts").update({
                "access_token": new_access_token,
                "refresh_token": new_refresh_token,
                "expires_at": expires_at.isoformat()
            }).eq("id", account_id).execute()
            
            return new_access_token
        else:
            logger.error(f"Token refresh failed: {response.status_code} {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        return None
    

async def get_alpaca_stock_data_client(
    current_user,
    supabase: Client
) -> StockHistoricalDataClient:
    """Get Alpaca stock data client with user-scoped OAuth token"""
    try:
        # Try to get OAuth token from database
        resp = supabase.table("brokerage_accounts").select("*").eq("user_id", current_user.id).eq("brokerage", "alpaca").eq("is_connected", True).execute()

        if not resp.data or len(resp.data) == 0:
            logger.error(f"❌ No connected Alpaca account found for user {current_user.id}")
            raise HTTPException(
                status_code=403,
                detail="No Alpaca account connected. Please connect your Alpaca account in the Accounts page."
            )

        account = resp.data[0]
        access_token = account.get("access_token")
        oauth_data = account.get("oauth_data", {})

        # Determine if this is a paper or live account from OAuth data
        is_paper = oauth_data.get("env", "paper") == "paper"

        logger.info(f"🔗 Stock data client - User: {current_user.id}, Mode: {'PAPER' if is_paper else 'LIVE'}")

        if not access_token:
            raise HTTPException(
                status_code=401,
                detail="No valid Alpaca access token found. Please reconnect your account."
            )

        # Use OAuth token with correct paper/live mode
        return StockHistoricalDataClient(api_key=access_token, secret_key="", paper=is_paper, oauth_token=access_token)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating stock data client: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create stock data client: {str(e)}")

async def get_alpaca_crypto_data_client(
    current_user,
    supabase: Client
) -> CryptoHistoricalDataClient:
    """Get Alpaca crypto data client with user-scoped OAuth token"""
    try:
        # Try to get OAuth token from database
        resp = supabase.table("brokerage_accounts").select("*").eq("user_id", current_user.id).eq("brokerage", "alpaca").eq("is_connected", True).execute()

        if not resp.data or len(resp.data) == 0:
            logger.error(f"❌ No connected Alpaca account found for user {current_user.id}")
            raise HTTPException(
                status_code=403,
                detail="No Alpaca account connected. Please connect your Alpaca account in the Accounts page."
            )

        account = resp.data[0]
        access_token = account.get("access_token")
        oauth_data = account.get("oauth_data", {})

        # Determine if this is a paper or live account from OAuth data
        is_paper = oauth_data.get("env", "paper") == "paper"

        logger.info(f"🔗 Crypto data client - User: {current_user.id}, Mode: {'PAPER' if is_paper else 'LIVE'}")

        if not access_token:
            raise HTTPException(
                status_code=401,
                detail="No valid Alpaca access token found. Please reconnect your account."
            )

        # Use OAuth token with correct paper/live mode
        return CryptoHistoricalDataClient(api_key=access_token, secret_key="", oauth_token=access_token)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating crypto data client: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create crypto data client: {str(e)}")

def get_plaid_client() -> plaid_api.PlaidApi:
    """Get Plaid client"""
    plaid_client_id = os.getenv("PLAID_CLIENT_ID")
    plaid_secret = os.getenv("PLAID_SECRET")
    plaid_env = os.getenv("PLAID_ENV", "sandbox")
    
    if not plaid_client_id or not plaid_secret:
        raise HTTPException(status_code=500, detail="Plaid configuration missing")
    
    configuration = Configuration(
        host=getattr(Configuration, plaid_env.upper()),
        api_key={
            'clientId': plaid_client_id,
            'secret': plaid_secret,
        }
    )
    api_client = ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)

def get_anthropic_client() -> anthropic.Anthropic:
    """Get Anthropic client"""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key missing")
    
    return anthropic.Anthropic(api_key=api_key)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """Get current user from JWT token"""
    try:
        # Verify the JWT token with Supabase
        user = supabase.auth.get_user(credentials.credentials)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

async def verify_alpaca_account_context(current_user, supabase: Client) -> dict:
    """Verify and log which Alpaca account is being used for trading operations"""
    try:
        resp = supabase.table("brokerage_accounts").select("*").eq("user_id", current_user.id).eq("brokerage", "alpaca").eq("is_connected", True).execute()

        if resp.data and len(resp.data) > 0:
            account = resp.data[0]
            oauth_data = account.get("oauth_data", {})
            alpaca_account_id = oauth_data.get("alpaca_account_id", "unknown")
            env = oauth_data.get("env", "paper")

            logger.info(f"✅ Account verification - User: {current_user.id}, Alpaca Account: {alpaca_account_id}, Mode: {env.upper()}")

            return {
                "user_id": current_user.id,
                "alpaca_account_id": alpaca_account_id,
                "environment": env,
                "account_name": account.get("account_name", "Unknown")
            }
        else:
            logger.warning(f"⚠️ No Alpaca account found for user {current_user.id}")
            return {
                "user_id": current_user.id,
                "alpaca_account_id": None,
                "environment": None,
                "account_name": None
            }
    except Exception as e:
        logger.error(f"❌ Error verifying account context: {e}")
        return {
            "user_id": current_user.id,
            "error": str(e)
        }