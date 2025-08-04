from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.country_code import CountryCode
from plaid.model.products import Products
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
import uvicorn
import os
from typing import Dict, List, Optional
import asyncio
import httpx
from datetime import datetime, timedelta
import json

app = FastAPI(title="IQlume Trading API", version="1.0.0")

# Plaid configuration
PLAID_CLIENT_ID = os.getenv('PLAID_CLIENT_ID')
PLAID_SECRET = os.getenv('PLAID_SECRET')
PLAID_ENV = os.getenv('PLAID_ENV', 'sandbox')

if not PLAID_CLIENT_ID or not PLAID_SECRET:
    print("Warning: Plaid credentials not found. Bank account linking will not work.")
    plaid_client = None
else:
    configuration = Configuration(
        host=getattr(plaid.Environment, PLAID_ENV.lower(), plaid.Environment.sandbox),
        api_key={
            'clientId': PLAID_CLIENT_ID,
            'secret': PLAID_SECRET,
        }
    )
    api_client = ApiClient(configuration)
    plaid_client = plaid_api.PlaidApi(api_client)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Mock data for demonstration
MOCK_PORTFOLIO = {
    "total_value": 125420.50,
    "day_change": 1247.82,
    "day_change_percent": 1.01,
    "accounts": [
        {
            "id": "1",
            "brokerage": "alpaca",
            "account_name": "Main Trading",
            "account_type": "stocks",
            "balance": 85420.50,
            "is_connected": True,
            "last_sync": "2024-01-15T10:30:00Z"
        }
    ]
}


@app.get("/")
async def root():
    return {"message": "Welcome to IQlume Trading API", "status": "active"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "IQlume Trading API"}


@app.get("/api/portfolio")
async def get_portfolio(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get user's portfolio overview"""
    # In production, verify JWT token and get user-specific data
    return MOCK_PORTFOLIO

@app.get("/api/strategies")
async def get_strategies(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get user's trading strategies"""
    return [
        {
            "id": "1",
            "name": "Covered Calls - AAPL",
            "type": "covered_calls",
            "description": "Conservative income strategy on Apple stock",
            "risk_level": "low",
            "min_capital": 15000,
            "is_active": True,
            "performance": {
                "total_return": 0.12,
                "win_rate": 0.85,
                "max_drawdown": 0.03
            }
        }
    ]

@app.get("/api/trades")
async def get_trades(
    limit: int = 50,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get user's trade history"""
    return [
        {
            "id": "1",
            "strategy_id": "1",
            "symbol": "AAPL",
            "type": "sell",
            "quantity": 1,
            "price": 175.50,
            "timestamp": "2024-01-15T14:30:00Z",
            "profit_loss": 125.50,
            "status": "executed"
        }
    ]

@app.get("/api/market-data/{symbol}")
async def get_market_data(
    symbol: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get real-time market data for a symbol"""
    # In production, integrate with Alpaca, Polygon, or other market data providers
    return {
        "symbol": symbol,
        "price": 175.50,
        "change": 2.25,
        "change_percent": 1.30,
        "volume": 45123000,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/options-chain/{symbol}")
async def get_options_chain(
    symbol: str,
    expiry: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get options chain data for a symbol"""
    # Mock options data - integrate with real provider
    return {
        "symbol": symbol,
        "expiry": expiry or "2024-02-16",
        "chains": [
            {
                "strike": 170.0,
                "call": {"bid": 8.50, "ask": 8.60, "iv": 0.25, "delta": 0.65},
                "put": {"bid": 2.10, "ask": 2.20, "iv": 0.24, "delta": -0.35}
            }
        ]
    }

@app.post("/api/backtest")
async def run_backtest(
    strategy_config: Dict,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Run backtesting for a trading strategy"""
    # Add background task for backtesting
    background_tasks.add_task(execute_backtest, strategy_config)
    
    return {
        "status": "started",
        "backtest_id": "bt_123456",
        "message": "Backtesting started in background"
    }

async def execute_backtest(strategy_config: Dict):
    """Execute backtesting logic in background"""
    # Simulate backtesting process
    await asyncio.sleep(10)  # Simulated processing time
    # In production: fetch historical data, run strategy, calculate metrics
    print(f"Backtest completed for strategy: {strategy_config.get('name', 'Unknown')}")

@app.post("/api/brokerage/connect")
async def connect_brokerage(
    brokerage_config: Dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Connect to a brokerage account"""
    brokerage = brokerage_config.get("brokerage")
    
    if brokerage not in ["alpaca", "ibkr", "binance", "robinhood", "vanguard", "tdameritrade", "schwab", "coinbase", "gemini"]:
        raise HTTPException(status_code=400, detail="Unsupported brokerage")
    
    # In production: handle OAuth flow, store encrypted credentials
    return {
        "status": "connected",
        "brokerage": brokerage,
        "account_id": "mock_account_123"
    }

@app.post("/api/execute-trade")
async def execute_trade(
    trade_request: Dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Execute a trade through connected brokerage"""
    # In production: validate trade, check account balance, execute via brokerage API
    return {
        "status": "executed",
        "trade_id": "trade_123456",
        "symbol": trade_request.get("symbol"),
        "quantity": trade_request.get("quantity"),
        "price": 175.50,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/plaid/create-link-token")
async def create_plaid_link_token(
    request_data: Dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create Plaid Link token for bank account connection"""
    if not plaid_client:
        raise HTTPException(status_code=500, detail="Plaid not configured. Please set PLAID_CLIENT_ID and PLAID_SECRET environment variables.")
    
    user_id = request_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    try:
        request = LinkTokenCreateRequest(
            products=[Products('auth'), Products('transactions')],
            client_name="IQlume Trading Platform",
            country_codes=[CountryCode('US')],
            language='en',
            user=LinkTokenCreateRequestUser(client_user_id=user_id)
        )
        
        response = plaid_client.link_token_create(request)
        return {"link_token": response['link_token']}
        
    except Exception as e:
        print(f"Plaid link token creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create link token: {str(e)}")
    

@app.post("/api/plaid/exchange-public-token")
async def exchange_plaid_public_token(
    request_data: Dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Exchange Plaid public token for access token"""
    if not plaid_client:
        raise HTTPException(status_code=500, detail="Plaid not configured. Please set PLAID_CLIENT_ID and PLAID_SECRET environment variables.")
    
    public_token = request_data.get("public_token")
    metadata = request_data.get("metadata")
    
    if not public_token:
        raise HTTPException(status_code=400, detail="public_token is required")
    
    try:
        request = ItemPublicTokenExchangeRequest(public_token=public_token)
        response = plaid_client.item_public_token_exchange(request)
        
        return {
            "access_token": response['access_token'],
            "item_id": response['item_id'],
            "accounts": metadata.get("accounts", []) if metadata else []
        }
        
    except Exception as e:
        print(f"Plaid token exchange error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to exchange public token: {str(e)}")

@app.get("/api/custodial-wallets")
async def get_custodial_wallets(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get user's custodial wallets"""
    return [
        {
            "id": "1",
            "wallet_name": "High-Yield Treasury Wallet",
            "balance_usd": 25000.00,
            "balance_treasuries": 75000.00,
            "apy": 0.0485,
            "is_fdic_insured": True,
            "created_at": "2024-01-01T00:00:00Z"
        }
    ]

@app.post("/api/market-cap")
async def get_market_cap_data(
    request_data: Dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get market capitalization data for multiple symbols"""
    symbols = request_data.get("symbols", [])
    
    if not symbols:
        raise HTTPException(status_code=400, detail="symbols list is required")
    
    # Mock market cap data - in production, integrate with CoinGecko, CoinMarketCap, etc.
    mock_market_cap_data = {
        "BTC": {"market_cap": 850000000000, "price": 43500, "name": "Bitcoin"},
        "ETH": {"market_cap": 280000000000, "price": 2650, "name": "Ethereum"},
        "ADA": {"market_cap": 18000000000, "price": 0.52, "name": "Cardano"},
        "SOL": {"market_cap": 45000000000, "price": 105, "name": "Solana"},
        "DOT": {"market_cap": 9000000000, "price": 7.2, "name": "Polkadot"},
        "MATIC": {"market_cap": 8500000000, "price": 0.92, "name": "Polygon"},
        "AVAX": {"market_cap": 14000000000, "price": 38, "name": "Avalanche"},
        "LINK": {"market_cap": 8200000000, "price": 14.5, "name": "Chainlink"},
        "UNI": {"market_cap": 5000000000, "price": 8.3, "name": "Uniswap"},
        "ATOM": {"market_cap": 3800000000, "price": 12.8, "name": "Cosmos"},
        "USDT": {"market_cap": 95000000000, "price": 1.0, "name": "Tether"},
        "USDC": {"market_cap": 25000000000, "price": 1.0, "name": "USD Coin"},
        "BNB": {"market_cap": 42000000000, "price": 280, "name": "BNB"},
        "XRP": {"market_cap": 32000000000, "price": 0.58, "name": "XRP"},
        "DOGE": {"market_cap": 12000000000, "price": 0.085, "name": "Dogecoin"},
    }
    
    result = []
    for symbol in symbols:
        symbol_upper = symbol.upper()
        if symbol_upper in mock_market_cap_data:
            data = mock_market_cap_data[symbol_upper]
            result.append({
                "symbol": symbol_upper,
                "market_cap": data["market_cap"],
                "price": data["price"],
                "name": data["name"]
            })
    
    return {"data": result}

@app.post("/api/custodial-wallets")
async def create_custodial_wallet(
    wallet_config: Dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new custodial wallet"""
    # In production: integrate with custodial wallet provider
    return {
        "status": "created",
        "wallet_id": f"wallet_{datetime.now().timestamp()}",
        "message": "Custodial wallet created successfully"
    }

@app.post("/api/webhooks/stripe")
async def stripe_webhook(request_data: Dict):
    """Handle Stripe webhooks for subscription events"""
    event_type = request_data.get("type")
    
    if event_type == "customer.subscription.created":
        # Handle new subscription
        pass
    elif event_type == "customer.subscription.updated":
        # Handle subscription changes
        pass
    elif event_type == "invoice.payment_succeeded":
        # Handle successful payment
        pass
    
    return {"status": "received"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )