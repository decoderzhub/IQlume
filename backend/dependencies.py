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
from jose import jwt, JWTError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer(auto_error=False)

def get_jwt_secret() -> str:
    """
    Get JWT secret for verifying Supabase tokens.

    First tries SUPABASE_JWT_SECRET from environment.

    Note: For production, you should set SUPABASE_JWT_SECRET explicitly
    from your Supabase project settings (Dashboard > Settings > API > JWT Secret).
    """
    # Try explicit JWT secret first
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
    if jwt_secret:
        return jwt_secret

    # If not set, log a warning
    logger.warning("⚠️ SUPABASE_JWT_SECRET not set. JWT verification will use Supabase SDK fallback.")
    return None

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

        try:
            resp = supabase.table("brokerage_accounts").select("*").eq("user_id", current_user.id).eq("brokerage", "alpaca").eq("is_connected", True).execute()
        except Exception as db_error:
            logger.error(f"❌ Database query failed for user {current_user.id}: {db_error}")
            raise HTTPException(
                status_code=500,
                detail="Database connection error. Please try again later."
            )

        logger.info(f"📊 Database query returned {len(resp.data) if resp.data else 0} connected Alpaca accounts")

        if not resp.data or len(resp.data) == 0:
            logger.warning(f"⚠️ No connected Alpaca account found for user {current_user.id}")
            logger.info(f"💡 User needs to connect their Alpaca account. Redirecting to Accounts page.")
            raise HTTPException(
                status_code=403,
                detail="No Alpaca account connected. Please visit the Accounts page to connect your Alpaca brokerage account. You'll need to authorize Brokernomex to access your Alpaca account via OAuth."
            )

        account = resp.data[0]
        oauth_data = account.get("oauth_data", {})

        # Try to get access token from multiple locations (for backward compatibility)
        access_token = account.get("access_token") or account.get("oauth_token") or oauth_data.get("access_token")
        refresh_token = account.get("refresh_token") or oauth_data.get("refresh_token")
        expires_at = account.get("expires_at")
        account_number = account.get("account_number")
        account_name = account.get("account_name", "Unknown")

        # Determine if this is a paper or live account from OAuth data
        is_paper = oauth_data.get("env", "paper") == "paper"
        api_base = oauth_data.get("api_base", "https://paper-api.alpaca.markets")
        alpaca_account_id = oauth_data.get("alpaca_account_id", account_number)

        # Log which field provided the token
        token_source = "access_token" if account.get("access_token") else ("oauth_token" if account.get("oauth_token") else "oauth_data.access_token")
        logger.info(f"🔗 Found Alpaca account - User: {current_user.id}, Account: {account_name}, Alpaca ID: {alpaca_account_id}, Mode: {'PAPER' if is_paper else 'LIVE'}")
        logger.info(f"🔗 API Base: {api_base}, DB Account ID: {account['id']}, Token source: {token_source}")

        # Check if token is expired
        if expires_at:
            try:
                expiry_time = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) >= expiry_time:
                    logger.warning(f"⚠️ OAuth token expired at {expires_at}, attempting refresh...")
                    if refresh_token:
                        access_token = await refresh_alpaca_token(account["id"], refresh_token, supabase)
                        if not access_token:
                            logger.error(f"❌ Token refresh failed for user {current_user.id}")
                            raise HTTPException(
                                status_code=401,
                                detail="Alpaca token expired and refresh failed. Please reconnect your account."
                            )
                    else:
                        logger.error(f"❌ No refresh token available for user {current_user.id}")
                        raise HTTPException(
                            status_code=401,
                            detail="Alpaca token expired and no refresh token available. Please reconnect your account."
                        )
            except ValueError as date_error:
                logger.warning(f"⚠️ Invalid expiry date format: {expires_at}. Proceeding with token validation...")

        if not access_token:
            logger.error(f"❌ No valid access token found for user {current_user.id}")
            raise HTTPException(
                status_code=401,
                detail="No valid Alpaca access token found. Please reconnect your account."
            )

        # Use OAuth token with correct paper/live mode
        # IMPORTANT: When using OAuth, only pass oauth_token parameter, NOT api_key
        logger.info(f"✅ Using OAuth token for {'PAPER' if is_paper else 'LIVE'} trading on account {alpaca_account_id}")
        try:
            return TradingClient(oauth_token=access_token, paper=is_paper)
        except Exception as client_error:
            logger.error(f"❌ Failed to create Alpaca trading client: {client_error}")
            raise HTTPException(
                status_code=500,
                detail="Failed to initialize Alpaca trading client. Please try again."
            )

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
            logger.error("❌ Alpaca OAuth configuration missing for token refresh (ALPACA_CLIENT_ID or ALPACA_CLIENT_SECRET not set)")
            return None

        if not refresh_token:
            logger.error("❌ No refresh token provided for token refresh")
            return None

        token_data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret
        }

        logger.info(f"🔄 Attempting to refresh Alpaca OAuth token for account {account_id}")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://api.alpaca.markets/oauth/token",
                    data=token_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
        except httpx.TimeoutException:
            logger.error("❌ Token refresh request timed out")
            return None
        except httpx.RequestError as req_error:
            logger.error(f"❌ Token refresh request failed: {req_error}")
            return None

        if response.status_code == 200:
            token_response = response.json()
            new_access_token = token_response.get("access_token")
            new_refresh_token = token_response.get("refresh_token", refresh_token)
            expires_in = token_response.get("expires_in", 3600)

            if not new_access_token:
                logger.error("❌ Token refresh response missing access_token")
                return None

            # Update database with tokens in all fields for consistency
            try:
                expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

                # Update all token fields to maintain consistency
                update_data = {
                    "access_token": new_access_token,
                    "oauth_token": new_access_token,
                    "refresh_token": new_refresh_token,
                    "expires_at": expires_at.isoformat()
                }

                # Also update oauth_data to keep it in sync
                result = supabase.table("brokerage_accounts").select("oauth_data").eq("id", account_id).execute()
                if result.data and result.data[0].get("oauth_data"):
                    oauth_data = result.data[0]["oauth_data"]
                    oauth_data["access_token"] = new_access_token
                    oauth_data["refresh_token"] = new_refresh_token
                    oauth_data["expires_in"] = expires_in
                    update_data["oauth_data"] = oauth_data

                supabase.table("brokerage_accounts").update(update_data).eq("id", account_id).execute()

                logger.info(f"✅ Successfully refreshed Alpaca OAuth token for account {account_id}")
                logger.info(f"✅ Token fields updated: access_token=✓, oauth_token=✓, refresh_token=✓, oauth_data=✓")
                return new_access_token
            except Exception as db_error:
                logger.error(f"❌ Failed to update database with new token: {db_error}")
                # Return the token anyway so user can continue, but log the error
                return new_access_token
        else:
            logger.error(f"❌ Token refresh failed with status {response.status_code}: {response.text}")

            # If refresh token is invalid, mark account as disconnected
            if response.status_code in [400, 401]:
                try:
                    logger.warning(f"⚠️ Marking account {account_id} as disconnected due to invalid refresh token")
                    supabase.table("brokerage_accounts").update({
                        "is_connected": False,
                        "error_message": "OAuth token expired and refresh failed. Please reconnect your account."
                    }).eq("id", account_id).execute()
                except Exception as update_error:
                    logger.error(f"❌ Failed to mark account as disconnected: {update_error}")

            return None

    except Exception as e:
        logger.error(f"❌ Unexpected error refreshing token: {e}", exc_info=True)
        return None
    

async def get_alpaca_stock_data_client(
    current_user,
    supabase: Client
) -> StockHistoricalDataClient:
    """Get Alpaca stock data client - uses API keys for data access"""
    try:
        # Market data API requires API keys, not OAuth tokens
        # OAuth tokens are only for trading endpoints
        api_key = os.getenv("ALPACA_API_KEY")
        secret_key = os.getenv("ALPACA_SECRET_KEY")

        if not api_key or not secret_key:
            logger.error(f"❌ Alpaca API credentials missing for market data access")
            raise HTTPException(
                status_code=500,
                detail="Market data API credentials not configured. Please contact support."
            )

        logger.info(f"🔗 Stock data client - User: {current_user.id}, Mode: PAPER (API key)")

        try:
            return StockHistoricalDataClient(api_key, secret_key)
        except Exception as client_error:
            logger.error(f"❌ Failed to create stock data client: {client_error}")
            raise HTTPException(
                status_code=500,
                detail="Failed to initialize Alpaca stock data client. Please try again."
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating stock data client: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create stock data client: {str(e)}")

async def get_alpaca_crypto_data_client(
    current_user,
    supabase: Client
) -> CryptoHistoricalDataClient:
    """Get Alpaca crypto data client - uses API keys for data access"""
    try:
        # Market data API requires API keys, not OAuth tokens
        # OAuth tokens are only for trading endpoints
        api_key = os.getenv("ALPACA_API_KEY")
        secret_key = os.getenv("ALPACA_SECRET_KEY")

        if not api_key or not secret_key:
            logger.error(f"❌ Alpaca API credentials missing for crypto data access")
            raise HTTPException(
                status_code=500,
                detail="Market data API credentials not configured. Please contact support."
            )

        logger.info(f"🔗 Crypto data client - User: {current_user.id}, Mode: PAPER (API key)")

        try:
            return CryptoHistoricalDataClient(api_key, secret_key)
        except Exception as client_error:
            logger.error(f"❌ Failed to create crypto data client: {client_error}")
            raise HTTPException(
                status_code=500,
                detail="Failed to initialize Alpaca crypto data client. Please try again."
            )

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
    if not credentials:
        logger.warning("⚠️ No authorization credentials provided")
        raise HTTPException(status_code=401, detail="Authorization required")

    try:
        token = credentials.credentials

        # Decode JWT to extract user info (without verification first, to check structure)
        try:
            # Decode without verification to inspect the token
            unverified = jwt.decode(token, options={"verify_signature": False})
            token_role = unverified.get('role')
            user_id = unverified.get('sub')

            logger.info(f"🔍 JWT token decoded - sub: {user_id}, role: {token_role}, exp: {unverified.get('exp')}")

            # Check if user is passing API keys instead of session token
            if token_role == "anon":
                logger.error("❌ User passed SUPABASE_ANON_KEY instead of session token")
                raise HTTPException(
                    status_code=401,
                    detail="Invalid token: You're using the Supabase ANON key. Please log in to your app and use your session token instead. See the test script instructions."
                )
            elif token_role == "service_role":
                logger.error("❌ User passed SUPABASE_SERVICE_ROLE_KEY instead of session token")
                raise HTTPException(
                    status_code=401,
                    detail="Invalid token: You're using the Supabase SERVICE_ROLE key. Please log in to your app and use your session token instead. See the test script instructions."
                )
            elif token_role != "authenticated":
                logger.warning(f"⚠️ Unexpected token role: {token_role}")
                raise HTTPException(
                    status_code=401,
                    detail=f"Invalid token: Expected role 'authenticated', got '{token_role}'. Please use a valid user session token."
                )

        except HTTPException:
            raise
        except Exception as decode_err:
            logger.error(f"❌ Failed to decode JWT token: {decode_err}")
            raise HTTPException(status_code=401, detail="Invalid token format")

        # Get JWT secret for proper signature verification
        jwt_secret = get_jwt_secret()

        if jwt_secret:
            # Full JWT verification with signature check (recommended for production)
            try:
                decoded = jwt.decode(
                    token,
                    jwt_secret,
                    algorithms=["HS256"],
                    audience="authenticated",
                    options={"verify_exp": True, "verify_aud": True}
                )

                logger.info(f"✅ JWT signature verified - user_id: {user_id}")

            except jwt.ExpiredSignatureError:
                logger.warning("⚠️ JWT token has expired")
                raise HTTPException(status_code=401, detail="Token has expired")
            except jwt.InvalidAudienceError:
                logger.warning("⚠️ JWT token has invalid audience")
                raise HTTPException(status_code=401, detail="Invalid token audience")
            except JWTError as jwt_error:
                logger.error(f"❌ JWT signature verification failed: {jwt_error}")
                raise HTTPException(status_code=401, detail=f"Invalid token signature: {str(jwt_error)}")
        else:
            # Fallback: Basic verification without signature check
            # This checks token structure, expiration, and verifies user exists in DB
            # Recommended to set SUPABASE_JWT_SECRET for full security
            logger.info(f"ℹ️ Performing basic JWT verification (no signature check) for user_id: {user_id}")

            # Check token expiration manually
            exp = unverified.get('exp')
            if exp:
                import time
                if time.time() > exp:
                    logger.warning("⚠️ JWT token has expired")
                    raise HTTPException(status_code=401, detail="Token has expired")

            # Verify user exists in database (additional security layer)
            try:
                user_query = supabase.from_("auth.users").select("id, email").eq("id", user_id).execute()
                if not user_query.data:
                    logger.warning(f"⚠️ User {user_id} not found in database")
                    raise HTTPException(status_code=401, detail="User not found")
            except Exception as db_error:
                # If we can't query auth.users, just proceed (RLS might block it)
                logger.debug(f"Could not verify user in database: {db_error}")

        # Create a minimal user object
        class User:
            def __init__(self, user_id, email=None):
                self.id = user_id
                self.email = email or unverified.get("email")
                self.role = token_role

        logger.info(f"✅ User authenticated - user_id: {user_id}, email: {unverified.get('email')}")
        return User(user_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected authentication error: {e}", exc_info=True)
        raise HTTPException(status_code=401, detail="Authentication failed")

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