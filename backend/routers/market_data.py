from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
from alpaca.data.historical import StockHistoricalDataClient, CryptoHistoricalDataClient
from alpaca.data.requests import (
    StockLatestQuoteRequest, 
    CryptoLatestQuoteRequest,
    StockBarsRequest,
    CryptoBarsRequest,
    StockSnapshotRequest
)
from alpaca.data.timeframe import TimeFrame
from alpaca.data.enums import DataFeed
from alpaca.common.exceptions import AlpacaAPIError
from supabase import Client
from ..dependencies import (
    get_current_user,
    get_supabase_client,
    get_alpaca_stock_data_client,
    get_alpaca_crypto_data_client,
    security
)

router = APIRouter(prefix="/api/market-data", tags=["market-data"])
logger = logging.getLogger(__name__)

def is_stock_symbol(symbol: str) -> bool:
    """Determine if a symbol is a stock symbol"""
    symbol = symbol.upper()
    # Common stock patterns
    if len(symbol) <= 5 and symbol.isalpha():
        return True
    # ETFs and other stock-like instruments
    if symbol in ['SPY', 'QQQ', 'VTI', 'IWM', 'GLD', 'SLV']:
        return True
    return False

def is_crypto_symbol(symbol: str) -> bool:
    """Determine if a symbol is a crypto symbol"""
    symbol = symbol.upper()
    # Common crypto patterns
    crypto_symbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'MATIC', 'AVAX', 'LINK', 'UNI', 'ATOM']
    crypto_pairs = ['BTCUSD', 'ETHUSD', 'BTC/USD', 'ETH/USD', 'ADAUSD', 'SOLUSD']
    
    if symbol in crypto_symbols or symbol in crypto_pairs:
        return True
    
    # Check for USD pairs
    if 'USD' in symbol and len(symbol) <= 7:
        return True
    
    return False

async def get_real_time_quotes(symbols: List[str], credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
    """Get real-time quotes for multiple symbols"""
    try:
        stock_data_client = get_alpaca_stock_data_client()
        crypto_data_client = get_alpaca_crypto_data_client()
        
        # Separate stocks and crypto
        stock_symbols = [s for s in symbols if is_stock_symbol(s)]
        crypto_symbols = [s for s in symbols if is_crypto_symbol(s)]
        
        quotes = {}
        
        # Get stock quotes with IEX feed
        if stock_symbols:
            try:
                stock_request = StockLatestQuoteRequest(
                    symbol_or_symbols=stock_symbols,
                    feed=DataFeed.IEX
                )
                stock_quotes = stock_data_client.get_stock_latest_quote(stock_request)
                
                for symbol, quote in stock_quotes.items():
                    quotes[symbol] = {
                        "bid_price": float(quote.bid_price) if quote.bid_price else 0,
                        "ask_price": float(quote.ask_price) if quote.ask_price else 0,
                        "bid_size": int(quote.bid_size) if quote.bid_size else 0,
                        "ask_size": int(quote.ask_size) if quote.ask_size else 0,
                        "timestamp": quote.timestamp.isoformat() if quote.timestamp else None
                    }
            except Exception as e:
                logger.error(f"Error fetching stock quotes: {e}")
        
        # Get crypto quotes
        if crypto_symbols:
            try:
                crypto_request = CryptoLatestQuoteRequest(symbol_or_symbols=crypto_symbols)
                crypto_quotes = crypto_data_client.get_crypto_latest_quote(crypto_request)
                
                for symbol, quote in crypto_quotes.items():
                    quotes[symbol] = {
                        "bid_price": float(quote.bid_price) if quote.bid_price else 0,
                        "ask_price": float(quote.ask_price) if quote.ask_price else 0,
                        "bid_size": float(quote.bid_size) if quote.bid_size else 0,
                        "ask_size": float(quote.ask_size) if quote.ask_size else 0,
                        "timestamp": quote.timestamp.isoformat() if quote.timestamp else None
                    }
            except Exception as e:
                logger.error(f"Error fetching crypto quotes: {e}")
        
        return {"quotes": quotes}
        
    except AlpacaAPIError as e:
        if "403" in str(e):
            raise HTTPException(
                status_code=403,
                detail="Alpaca Market Data denied (likely feed entitlement). Try feed=IEX or upgrade data plan."
            )
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except Exception as e:
        logger.error(f"Error in get_real_time_quotes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch quotes: {str(e)}")

async def get_market_snapshot(symbols: List[str], credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
    """Get market snapshot for multiple symbols"""
    try:
        stock_data_client = get_alpaca_stock_data_client()
        
        # Filter to stock symbols only for snapshot
        stock_symbols = [s for s in symbols if is_stock_symbol(s)]
        
        if not stock_symbols:
            return {"snapshots": {}}
        
        try:
            stock_request = StockSnapshotRequest(
                symbol_or_symbols=stock_symbols,
                feed=DataFeed.IEX
            )
            snapshots_response = stock_data_client.get_stock_snapshot(stock_request)
            
            snapshots = {}
            for symbol, snapshot in snapshots_response.items():
                snapshots[symbol] = {
                    "latest_quote": {
                        "bid_price": float(snapshot.latest_quote.bid_price) if snapshot.latest_quote and snapshot.latest_quote.bid_price else 0,
                        "ask_price": float(snapshot.latest_quote.ask_price) if snapshot.latest_quote and snapshot.latest_quote.ask_price else 0,
                        "timestamp": snapshot.latest_quote.timestamp.isoformat() if snapshot.latest_quote and snapshot.latest_quote.timestamp else None
                    } if snapshot.latest_quote else None,
                    "latest_trade": {
                        "price": float(snapshot.latest_trade.price) if snapshot.latest_trade and snapshot.latest_trade.price else 0,
                        "size": int(snapshot.latest_trade.size) if snapshot.latest_trade and snapshot.latest_trade.size else 0,
                        "timestamp": snapshot.latest_trade.timestamp.isoformat() if snapshot.latest_trade and snapshot.latest_trade.timestamp else None
                    } if snapshot.latest_trade else None,
                    "daily_bar": {
                        "open": float(snapshot.daily_bar.open) if snapshot.daily_bar and snapshot.daily_bar.open else 0,
                        "high": float(snapshot.daily_bar.high) if snapshot.daily_bar and snapshot.daily_bar.high else 0,
                        "low": float(snapshot.daily_bar.low) if snapshot.daily_bar and snapshot.daily_bar.low else 0,
                        "close": float(snapshot.daily_bar.close) if snapshot.daily_bar and snapshot.daily_bar.close else 0,
                        "volume": int(snapshot.daily_bar.volume) if snapshot.daily_bar and snapshot.daily_bar.volume else 0,
                        "timestamp": snapshot.daily_bar.timestamp.isoformat() if snapshot.daily_bar and snapshot.daily_bar.timestamp else None
                    } if snapshot.daily_bar else None
                }
            
            return {"snapshots": snapshots}
            
        except Exception as e:
            logger.error(f"Error fetching market snapshots: {e}")
            return {"snapshots": {}}
        
    except AlpacaAPIError as e:
        if "403" in str(e):
            raise HTTPException(
                status_code=403,
                detail="Alpaca Market Data denied (likely feed entitlement). Try feed=IEX or upgrade data plan."
            )
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except Exception as e:
        logger.error(f"Error in get_market_snapshot: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch market snapshot: {str(e)}")

async def get_live_prices_data(symbols: List[str], credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
    """Get live price data combining quotes and basic market info"""
    try:
        # Get quotes
        quotes_response = await get_real_time_quotes(symbols, credentials)
    except Exception as e:
        logger.exception("quotes fetch failed")
        quotes_response = {"quotes": {}}
    
    try:
        # Get snapshots for additional data
        snapshots_response = await get_market_snapshot(symbols, credentials)
    except Exception as e:
        logger.exception("snapshots fetch failed")
        snapshots_response = {"snapshots": {}}
    
    # Combine data
    combined_data = {}
    quotes = quotes_response.get("quotes", {})
    snapshots = snapshots_response.get("snapshots", {})
    
    for symbol in symbols:
        quote = quotes.get(symbol, {})
        snapshot = snapshots.get(symbol, {})
        
        # Calculate mid price
        bid = quote.get("bid_price", 0)
        ask = quote.get("ask_price", 0)
        mid_price = (bid + ask) / 2 if bid and ask else bid or ask
        
        # Get daily bar data for change calculation
        daily_bar = snapshot.get("daily_bar", {}) if snapshot else {}
        open_price = daily_bar.get("open", 0) if daily_bar else 0
        
        # Calculate change
        change = mid_price - open_price if mid_price and open_price else 0
        change_percent = (change / open_price * 100) if open_price else 0
        
        combined_data[symbol] = {
            "price": mid_price,
            "bid_price": bid,
            "ask_price": ask,
            "change": change,
            "change_percent": change_percent,
            "volume": daily_bar.get("volume", 0) if daily_bar else 0,
            "high": daily_bar.get("high", 0) if daily_bar else 0,
            "low": daily_bar.get("low", 0) if daily_bar else 0,
            "open": open_price,
            "timestamp": quote.get("timestamp") or (daily_bar.get("timestamp") if daily_bar else None)
        }
    
    return combined_data

async def get_bars_data(
    symbols: List[str], 
    timeframe: str, 
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: Optional[int] = None,
    credentials: HTTPAuthorizationCredentials = None
) -> Dict[str, Any]:
    """Get historical bars data for multiple symbols"""
    try:
        stock_data_client = get_alpaca_stock_data_client()
        crypto_data_client = get_alpaca_crypto_data_client()
        
        # Parse timeframe
        if timeframe == "1Min":
            tf = TimeFrame.Minute
        elif timeframe == "5Min":
            tf = TimeFrame(5, "Min")
        elif timeframe == "15Min":
            tf = TimeFrame(15, "Min")
        elif timeframe == "1Hour":
            tf = TimeFrame.Hour
        elif timeframe == "1Day":
            tf = TimeFrame.Day
        else:
            tf = TimeFrame.Day
        
        # Separate stocks and crypto
        stock_symbols = [s for s in symbols if is_stock_symbol(s)]
        crypto_symbols = [s for s in symbols if is_crypto_symbol(s)]
        
        bars_data = {}
        
        # Get stock bars with IEX feed
        if stock_symbols:
            try:
                stock_request = StockBarsRequest(
                    symbol_or_symbols=stock_symbols,
                    timeframe=tf,
                    start=start_time,
                    end=end_time,
                    limit=limit,
                    feed=DataFeed.IEX
                )
                stock_bars = stock_data_client.get_stock_bars(stock_request)
                
                for symbol, bars in stock_bars.items():
                    bars_data[symbol] = [
                        {
                            "timestamp": bar.timestamp.isoformat(),
                            "open": float(bar.open),
                            "high": float(bar.high),
                            "low": float(bar.low),
                            "close": float(bar.close),
                            "volume": int(bar.volume)
                        }
                        for bar in bars
                    ]
            except Exception as e:
                logger.error(f"Error fetching stock bars: {e}")
        
        # Get crypto bars
        if crypto_symbols:
            try:
                crypto_request = CryptoBarsRequest(
                    symbol_or_symbols=crypto_symbols,
                    timeframe=tf,
                    start=start_time,
                    end=end_time,
                    limit=limit
                )
                crypto_bars = crypto_data_client.get_crypto_bars(crypto_request)
                
                for symbol, bars in crypto_bars.items():
                    bars_data[symbol] = [
                        {
                            "timestamp": bar.timestamp.isoformat(),
                            "open": float(bar.open),
                            "high": float(bar.high),
                            "low": float(bar.low),
                            "close": float(bar.close),
                            "volume": float(bar.volume)
                        }
                        for bar in bars
                    ]
            except Exception as e:
                logger.error(f"Error fetching crypto bars: {e}")
        
        return {"bars": bars_data}
        
    except AlpacaAPIError as e:
        if "403" in str(e):
            raise HTTPException(
                status_code=403,
                detail="Alpaca Market Data denied (likely feed entitlement). Try feed=IEX or upgrade data plan."
            )
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except Exception as e:
        logger.error(f"Error in get_bars_data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch bars data: {str(e)}")

# API Routes

@router.get("/symbol/{symbol}")
async def get_market_data(
    symbol: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user)
):
    """Get market data for a single symbol"""
    try:
        data = await get_live_prices_data([symbol.upper()], credentials)
        return data.get(symbol.upper(), {})
    except Exception as e:
        logger.error(f"Error fetching market data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch market data: {str(e)}")

@router.get("/quotes")
async def get_quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user)
):
    """Get real-time quotes for multiple symbols"""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    return await get_real_time_quotes(symbol_list, credentials)

@router.get("/bars")
async def get_bars(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    timeframe: str = Query("1Day", description="Timeframe (1Min, 5Min, 15Min, 1Hour, 1Day)"),
    start: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: Optional[int] = Query(100, description="Maximum number of bars"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user)
):
    """Get historical bars for multiple symbols"""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    
    start_time = datetime.fromisoformat(start) if start else None
    end_time = datetime.fromisoformat(end) if end else None
    
    return await get_bars_data(symbol_list, timeframe, start_time, end_time, limit, credentials)

@router.get("/snapshot")
async def get_snapshot(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user)
):
    """Get market snapshot for multiple symbols"""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    return await get_market_snapshot(symbol_list, credentials)

@router.get("/live-prices")
async def get_live_prices(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user)
):
    """Get live price data for multiple symbols"""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    return await get_live_prices_data(symbol_list, credentials)

@router.get("/{symbol}/historical")
async def get_historical_data(
    symbol: str,
    timeframe: str = Query("1Day", description="Timeframe (1Min, 5Min, 15Min, 1Hour, 1Day)"),
    start: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: Optional[int] = Query(100, description="Maximum number of bars"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user)
):
    """Get historical data for a single symbol"""
    start_time = datetime.fromisoformat(start) if start else None
    end_time = datetime.fromisoformat(end) if end else None
    
    data = await get_bars_data([symbol.upper()], timeframe, start_time, end_time, limit, credentials)
    return data.get("bars", {}).get(symbol.upper(), [])