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
security = HTTPBearer()

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
    """Get Alpaca trading client"""
    try:
        # First try to get OAuth token from database
        resp = supabase.table("brokerage_accounts").select("*").eq("user_id", current_user.id).eq("brokerage_name", "alpaca").eq("is_connected", True).execute()
        
        if resp.data and len(resp.data) > 0:
            account = resp.data[0]
            access_token = account.get("access_token")
            refresh_token = account.get("refresh_token")
            expires_at = account.get("expires_at")
            
            # Check if token is expired
            if expires_at:
                expiry_time = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) >= expiry_time and refresh_token:
                    # Refresh the token
                    access_token = await refresh_alpaca_token(account["id"], refresh_token, supabase)
            
            if access_token:
                # Use OAuth token
                return TradingClient(api_key=access_token, secret_key="", paper=True, oauth_token=access_token)
        
        # Fallback to API key method
        api_key = os.getenv("ALPACA_API_KEY")
        secret_key = os.getenv("ALPACA_SECRET_KEY")
        
        if not api_key or not secret_key:
            raise HTTPException(
                status_code=500, 
                detail="No Alpaca connection found. Please connect your Alpaca account or configure API credentials."
            )
        
        return TradingClient(api_key, secret_key, paper=True)
        
    except Exception as e:
        logger.error(f"Error creating Alpaca trading client: {e}")
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
    

def get_alpaca_stock_data_client() -> StockHistoricalDataClient:
    """Get Alpaca stock data client"""
    api_key = os.getenv("ALPACA_API_KEY")
    secret_key = os.getenv("ALPACA_SECRET_KEY")
    
    if not api_key or not secret_key:
        raise HTTPException(status_code=500, detail="Alpaca API credentials missing")
    
    return StockHistoricalDataClient(api_key, secret_key)

def get_alpaca_crypto_data_client() -> CryptoHistoricalDataClient:
    """Get Alpaca crypto data client"""
    api_key = os.getenv("ALPACA_API_KEY")
    secret_key = os.getenv("ALPACA_SECRET_KEY")
    
    if not api_key or not secret_key:
        raise HTTPException(status_code=500, detail="Alpaca API credentials missing")
    
    return CryptoHistoricalDataClient(api_key, secret_key)

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