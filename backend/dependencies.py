import os
from typing import Optional
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from alpaca.trading.client import TradingClient
from alpaca.data.historical import StockHistoricalDataClient, CryptoHistoricalDataClient
from alpaca.data.live import StockDataStream, CryptoDataStream
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

def get_alpaca_trading_client() -> TradingClient:
    """Get Alpaca trading client"""
    api_key = os.getenv("ALPACA_API_KEY")
    secret_key = os.getenv("ALPACA_SECRET_KEY")
    
    if not api_key or not secret_key:
        raise HTTPException(status_code=500, detail="Alpaca API credentials missing")
    
    return TradingClient(api_key, secret_key, paper=True)

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