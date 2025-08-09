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
import anthropic
from typing import Dict, List, Optional
import asyncio
import httpx
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv
from alpaca.trading.client import TradingClient
from alpaca.data.historical import StockHistoricalDataClient, OptionHistoricalDataClient, CryptoHistoricalDataClient
from alpaca.data.live import StockDataStream, OptionDataStream, CryptoDataStream
from alpaca.data.requests import StockLatestQuoteRequest, StockBarsRequest, OptionChainRequest, CryptoLatestQuoteRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.common.exceptions import APIError as AlpacaAPIError

load_dotenv()  # will look for .env in the current working directory

app = FastAPI(title="brokernomex Trading API", version="1.0.0")

# Plaid configuration
PLAID_CLIENT_ID = os.getenv('PLAID_CLIENT_ID')
PLAID_SECRET = os.getenv('PLAID_SECRET')
PLAID_ENV = os.getenv('PLAID_ENV', 'sandbox')

# Anthropic configuration
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# Alpaca configuration
ALPACA_API_KEY = os.getenv('ALPACA_API_KEY')
ALPACA_SECRET_KEY = os.getenv('ALPACA_SECRET_KEY')
ALPACA_BASE_URL = os.getenv('ALPACA_BASE_URL', 'https://paper-api.alpaca.markets')

if ANTHROPIC_API_KEY:
    anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
else:
    print("Warning: Anthropic API key not found. AI chat will not work.")
    anthropic_client = None

# Initialize Alpaca clients
if ALPACA_API_KEY and ALPACA_SECRET_KEY:
    # Trading client for account info and orders
    trading_client = TradingClient(ALPACA_API_KEY, ALPACA_SECRET_KEY, paper=True)
    
    # Data clients for market data
    stock_data_client = StockHistoricalDataClient(ALPACA_API_KEY, ALPACA_SECRET_KEY)
    option_data_client = OptionHistoricalDataClient(ALPACA_API_KEY, ALPACA_SECRET_KEY)
    crypto_data_client = CryptoHistoricalDataClient(ALPACA_API_KEY, ALPACA_SECRET_KEY)
    
    print("Alpaca API clients initialized successfully")
else:
    print("Warning: Alpaca API credentials not found. Market data will use mock data.")
    trading_client = None
    stock_data_client = None
    option_data_client = None
    crypto_data_client = None

if not PLAID_CLIENT_ID or not PLAID_SECRET:
    print("Warning: Plaid credentials not found. Bank account linking will not work.")
    plaid_client = None
else:
    configuration = Configuration(
        host=getattr(plaid.Environment, PLAID_ENV.capitalize(), plaid.Environment.Sandbox),
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
    return {"message": "Welcome to brokernomex Trading API", "status": "active"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "brokernomex Trading API"}


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
    if not stock_data_client and not crypto_data_client:
        # Fallback to mock data if Alpaca not configured
        return {
            "symbol": symbol,
            "price": 175.50,
            "change": 2.25,
            "change_percent": 1.30,
            "volume": 45123000,
            "timestamp": datetime.now().isoformat(),
            "source": "mock"
        }
    
    try:
        symbol_upper = symbol.upper()
        
        # Determine if it's a crypto symbol
        crypto_symbols = ['BTC/USD', 'ETH/USD', 'BTCUSD', 'ETHUSD', 'BTC', 'ETH']
        is_crypto = any(crypto_sym in symbol_upper for crypto_sym in crypto_symbols)
        
        if is_crypto and crypto_data_client:
            # Handle crypto symbols
            if symbol_upper in ['BTC', 'BITCOIN']:
                symbol_upper = 'BTC/USD'
            elif symbol_upper in ['ETH', 'ETHEREUM']:
                symbol_upper = 'ETH/USD'
            elif symbol_upper == 'BTCUSD':
                symbol_upper = 'BTC/USD'
            elif symbol_upper == 'ETHUSD':
                symbol_upper = 'ETH/USD'
            
            request_params = CryptoLatestQuoteRequest(symbol_or_symbols=[symbol_upper])
            latest_quote = crypto_data_client.get_crypto_latest_quote(request_params)
            
            if symbol_upper in latest_quote:
                quote = latest_quote[symbol_upper]
                return {
                    "symbol": symbol_upper,
                    "price": float(quote.bid_price) if quote.bid_price else 0.0,
                    "bid": float(quote.bid_price) if quote.bid_price else 0.0,
                    "ask": float(quote.ask_price) if quote.ask_price else 0.0,
                    "timestamp": quote.timestamp.isoformat(),
                    "source": "alpaca_crypto"
                }
        
        elif stock_data_client:
            # Handle stock symbols
            request_params = StockLatestQuoteRequest(symbol_or_symbols=[symbol_upper])
            latest_quote = stock_data_client.get_stock_latest_quote(request_params)
            
            if symbol_upper in latest_quote:
                quote = latest_quote[symbol_upper]
                return {
                    "symbol": symbol_upper,
                    "price": float(quote.bid_price) if quote.bid_price else 0.0,
                    "bid": float(quote.bid_price) if quote.bid_price else 0.0,
                    "ask": float(quote.ask_price) if quote.ask_price else 0.0,
                    "bid_size": quote.bid_size if quote.bid_size else 0,
                    "ask_size": quote.ask_size if quote.ask_size else 0,
                    "timestamp": quote.timestamp.isoformat(),
                    "source": "alpaca_stock"
                }
        
        # If no data found, return error
        raise HTTPException(status_code=404, detail=f"No market data found for symbol: {symbol}")
        
    except AlpacaAPIError as e:
        print(f"Alpaca API error for symbol {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except Exception as e:
        print(f"Error fetching market data for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch market data: {str(e)}")

@app.get("/api/options-chain/{symbol}")
async def get_options_chain(
    symbol: str,
    expiry: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get options chain data for a symbol"""
    if not option_data_client:
        # Fallback to mock data if Alpaca not configured
        return {
            "symbol": symbol,
            "expiry": expiry or "2024-02-16",
            "chains": [
                {
                    "strike": 170.0,
                    "call": {"bid": 8.50, "ask": 8.60, "iv": 0.25, "delta": 0.65},
                    "put": {"bid": 7.50, "ask": 7.60, "iv": 0.30, "delta": -0.35}
                }
            ],
            "source": "mock"
        }
    
    try:
        symbol_upper = symbol.upper()
        
        # Set default expiry if not provided (next Friday)
        if not expiry:
            from datetime import datetime, timedelta
            today = datetime.now()
            days_ahead = 4 - today.weekday()  # Friday is 4
            if days_ahead <= 0:  # Target next Friday
                days_ahead += 7
            next_friday = today + timedelta(days_ahead)
            expiry = next_friday.strftime('%Y-%m-%d')
        
        # Create options chain request
        request_params = OptionChainRequest(
            underlying_symbol=symbol_upper,
            expiration_date=expiry
        )
        
        options_chain = option_data_client.get_option_chain(request_params)
        
        # Process the options chain data
        chains = []
        strikes = {}
        
        for option in options_chain:
            strike = float(option.strike_price)
            if strike not in strikes:
                strikes[strike] = {"strike": strike, "call": None, "put": None}
            
            option_data = {
                "bid": float(option.bid_price) if option.bid_price else 0.0,
                "ask": float(option.ask_price) if option.ask_price else 0.0,
                "last": float(option.last_price) if option.last_price else 0.0,
                "volume": option.volume if option.volume else 0,
                "open_interest": option.open_interest if option.open_interest else 0,
                "iv": option.implied_volatility if option.implied_volatility else 0.0
            }
            
            if option.option_type == "call":
                strikes[strike]["call"] = option_data
            else:
                strikes[strike]["put"] = option_data
        
        # Convert to list and sort by strike
        chains = list(strikes.values())
        chains.sort(key=lambda x: x["strike"])
        
        return {
            "symbol": symbol_upper,
            "expiry": expiry,
            "chains": chains,
            "source": "alpaca"
        }
        
    except AlpacaAPIError as e:
        print(f"Alpaca API error for options chain {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except Exception as e:
        print(f"Error fetching options chain for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch options chain: {str(e)}")

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
            client_name="brokernomex Trading Platform",
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
        # Cryptocurrencies
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
        # Major Stocks
        "AAPL": {"market_cap": 3000000000000, "price": 195.50, "name": "Apple Inc."},
        "MSFT": {"market_cap": 2800000000000, "price": 375.25, "name": "Microsoft Corporation"},
        "GOOGL": {"market_cap": 1700000000000, "price": 140.75, "name": "Alphabet Inc."},
        "AMZN": {"market_cap": 1500000000000, "price": 155.20, "name": "Amazon.com Inc."},
        "NVDA": {"market_cap": 1800000000000, "price": 740.50, "name": "NVIDIA Corporation"},
        "TSLA": {"market_cap": 800000000000, "price": 250.80, "name": "Tesla Inc."},
        "META": {"market_cap": 750000000000, "price": 295.40, "name": "Meta Platforms Inc."},
        "SPY": {"market_cap": 450000000000, "price": 475.30, "name": "SPDR S&P 500 ETF"},
        "QQQ": {"market_cap": 200000000000, "price": 385.60, "name": "Invesco QQQ Trust"},
        "VTI": {"market_cap": 300000000000, "price": 245.75, "name": "Vanguard Total Stock Market ETF"},
        "IWM": {"market_cap": 65000000000, "price": 195.40, "name": "iShares Russell 2000 ETF"},
        "GLD": {"market_cap": 55000000000, "price": 185.20, "name": "SPDR Gold Shares"},
        "TLT": {"market_cap": 45000000000, "price": 95.75, "name": "iShares 20+ Year Treasury Bond ETF"},
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

@app.post("/api/chat/anthropic")
async def chat_with_anthropic(
    request_data: Dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Chat with Anthropic Claude for trading strategy assistance"""
    if not ANTHROPIC_API_KEY or not anthropic_client:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")
    
    user_message = request_data.get("message")
    chat_history = request_data.get("history", [])
    model = request_data.get("model", "claude-opus-4-1-20250805")  # Default to latest Opus
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    try:
        # Prepare system message for trading context
        system_message = """You are Brokernomex AI, an expert trading strategy assistant. You help users understand and create trading strategies including:
- Straddle: Profit from high volatility in either direction
- The Wheel: Systematic approach combining puts and covered calls
- Opening Range Breakout (ORB): Trade breakouts from market open
- Spot Grid Bot: Automate buy-low/sell-high trades within price ranges
- Futures Grid Bot: Grid trading on futures with leverage
- Infinity Grid Bot: Grid trading without upper limits for trending markets
- DCA Bot: Dollar-cost averaging to minimize volatility risk
- Smart Rebalance Bot: Maintain target allocations across portfolios

Provide clear, actionable advice. When users want to create a strategy, guide them through the key parameters they need to consider. Be concise but thorough. Focus on risk management and realistic expectations."""
        
        # Prepare messages for Anthropic Claude
        messages = []
        
        # Add chat history (limit to last 10 messages to stay within token limits)
        if chat_history:
            messages.extend(chat_history[-10:])
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        # Make request to Anthropic Claude
        response = anthropic_client.messages.create(
            model=model,
            max_tokens=1000,
            temperature=0.7,
            system=system_message,
            messages=messages
        )
        
        ai_message = response.content[0].text
        
        return {
            "message": ai_message,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens
            },
            "model": response.model
        }
        
    except anthropic.APITimeoutError:
        raise HTTPException(status_code=504, detail="Anthropic API request timed out")
    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"Anthropic API error: {str(e)}")
    except Exception as e:
        print(f"Anthropic API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get AI response: {str(e)}")

@app.get("/api/historical-data/{symbol}")
async def get_historical_data(
    symbol: str,
    timeframe: str = "1Day",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get historical market data for backtesting and charting"""
    if not stock_data_client and not crypto_data_client:
        raise HTTPException(status_code=500, detail="Alpaca API not configured")
    
    try:
        symbol_upper = symbol.upper()
        
        # Set default date range if not provided
        if not start_date:
            start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')
        
        # Convert timeframe string to Alpaca TimeFrame
        timeframe_map = {
            "1Min": TimeFrame.Minute,
            "5Min": TimeFrame(5, "Min"),
            "15Min": TimeFrame(15, "Min"),
            "1Hour": TimeFrame.Hour,
            "1Day": TimeFrame.Day,
            "1Week": TimeFrame.Week,
            "1Month": TimeFrame.Month
        }
        
        tf = timeframe_map.get(timeframe, TimeFrame.Day)
        
        # Determine if it's a crypto symbol
        crypto_symbols = ['BTC/USD', 'ETH/USD', 'BTCUSD', 'ETHUSD', 'BTC', 'ETH']
        is_crypto = any(crypto_sym in symbol_upper for crypto_sym in crypto_symbols)
        
        if is_crypto and crypto_data_client:
            # Handle crypto symbols
            if symbol_upper in ['BTC', 'BITCOIN']:
                symbol_upper = 'BTC/USD'
            elif symbol_upper in ['ETH', 'ETHEREUM']:
                symbol_upper = 'ETH/USD'
            elif symbol_upper == 'BTCUSD':
                symbol_upper = 'BTC/USD'
            elif symbol_upper == 'ETHUSD':
                symbol_upper = 'ETH/USD'
            
            request_params = StockBarsRequest(
                symbol_or_symbols=[symbol_upper],
                timeframe=tf,
                start=start_date,
                end=end_date
            )
            
            bars = crypto_data_client.get_crypto_bars(request_params)
        
        elif stock_data_client:
            # Handle stock symbols
            request_params = StockBarsRequest(
                symbol_or_symbols=[symbol_upper],
                timeframe=tf,
                start=start_date,
                end=end_date
            )
            
            bars = stock_data_client.get_stock_bars(request_params)
        
        # Process the bars data
        historical_data = []
        if symbol_upper in bars:
            for bar in bars[symbol_upper]:
                historical_data.append({
                    "timestamp": bar.timestamp.isoformat(),
                    "open": float(bar.open),
                    "high": float(bar.high),
                    "low": float(bar.low),
                    "close": float(bar.close),
                    "volume": bar.volume if bar.volume else 0
                })
        
        return {
            "symbol": symbol_upper,
            "timeframe": timeframe,
            "start_date": start_date,
            "end_date": end_date,
            "data": historical_data,
            "source": "alpaca"
        }
        
    except AlpacaAPIError as e:
        print(f"Alpaca API error for historical data {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except Exception as e:
        print(f"Error fetching historical data for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch historical data: {str(e)}")

@app.get("/api/account/info")
async def get_account_info(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get Alpaca account information"""
    if not trading_client:
        raise HTTPException(status_code=500, detail="Alpaca trading client not configured")
    
    try:
        account = trading_client.get_account()
        
        return {
            "account_id": account.id,
            "status": account.status,
            "currency": account.currency,
            "buying_power": float(account.buying_power),
            "cash": float(account.cash),
            "portfolio_value": float(account.portfolio_value),
            "equity": float(account.equity),
            "last_equity": float(account.last_equity),
            "multiplier": account.multiplier,
            "day_trade_count": account.day_trade_count,
            "daytrade_buying_power": float(account.daytrade_buying_power),
            "regt_buying_power": float(account.regt_buying_power),
            "source": "alpaca"
        }
        
    except AlpacaAPIError as e:
        print(f"Alpaca API error getting account info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except Exception as e:
        print(f"Error getting account info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get account info: {str(e)}")

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