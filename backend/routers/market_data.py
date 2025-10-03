from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import logging

from alpaca.data.historical import StockHistoricalDataClient, CryptoHistoricalDataClient
from alpaca.data.requests import (
    StockLatestQuoteRequest,
    CryptoLatestQuoteRequest,
    StockBarsRequest,
    CryptoBarsRequest,
    StockSnapshotRequest,
)
from alpaca.data.timeframe import TimeFrame
from alpaca.data.enums import DataFeed
from alpaca.common.exceptions import APIError as AlpacaAPIError

from dependencies import (
    get_current_user,
    get_alpaca_stock_data_client,
    get_alpaca_crypto_data_client,
    security,
)
import math
from scipy.stats import norm
import numpy as np
from technical_indicators import TechnicalIndicators

router = APIRouter(prefix="/api/market-data", tags=["market-data"])
logger = logging.getLogger(__name__)

# Popular symbols for quick access
POPULAR_SYMBOLS = [
    # Major stocks
    "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "NFLX", "ADBE", "CRM",
    "SPY", "QQQ", "IWM", "VTI", "VOO", "VEA", "VWO", "BND", "AGG", "GLD",
    # Major crypto pairs
    "BTC/USD", "ETH/USD", "LTC/USD", "BCH/USD", "LINK/USD", "UNI/USD", "AAVE/USD", "DOT/USD"
]

# Common stock symbols with company names for search
STOCK_SYMBOLS_WITH_NAMES = [
    {"symbol": "AAPL", "name": "Apple Inc.", "type": "stock"},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "type": "stock"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "type": "stock"},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "type": "stock"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "type": "stock"},
    {"symbol": "META", "name": "Meta Platforms Inc.", "type": "stock"},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "type": "stock"},
    {"symbol": "NFLX", "name": "Netflix Inc.", "type": "stock"},
    {"symbol": "ADBE", "name": "Adobe Inc.", "type": "stock"},
    {"symbol": "CRM", "name": "Salesforce Inc.", "type": "stock"},
    {"symbol": "ORCL", "name": "Oracle Corporation", "type": "stock"},
    {"symbol": "IBM", "name": "International Business Machines", "type": "stock"},
    {"symbol": "INTC", "name": "Intel Corporation", "type": "stock"},
    {"symbol": "AMD", "name": "Advanced Micro Devices", "type": "stock"},
    {"symbol": "CSCO", "name": "Cisco Systems Inc.", "type": "stock"},
    {"symbol": "V", "name": "Visa Inc.", "type": "stock"},
    {"symbol": "MA", "name": "Mastercard Inc.", "type": "stock"},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "type": "stock"},
    {"symbol": "BAC", "name": "Bank of America Corp.", "type": "stock"},
    {"symbol": "WFC", "name": "Wells Fargo & Company", "type": "stock"},
    {"symbol": "GS", "name": "Goldman Sachs Group Inc.", "type": "stock"},
    {"symbol": "MS", "name": "Morgan Stanley", "type": "stock"},
    {"symbol": "C", "name": "Citigroup Inc.", "type": "stock"},
    {"symbol": "JNJ", "name": "Johnson & Johnson", "type": "stock"},
    {"symbol": "PFE", "name": "Pfizer Inc.", "type": "stock"},
    {"symbol": "UNH", "name": "UnitedHealth Group Inc.", "type": "stock"},
    {"symbol": "HD", "name": "Home Depot Inc.", "type": "stock"},
    {"symbol": "WMT", "name": "Walmart Inc.", "type": "stock"},
    {"symbol": "PG", "name": "Procter & Gamble Co.", "type": "stock"},
    {"symbol": "KO", "name": "Coca-Cola Company", "type": "stock"},
    {"symbol": "PEP", "name": "PepsiCo Inc.", "type": "stock"},
    {"symbol": "DIS", "name": "Walt Disney Company", "type": "stock"},
    {"symbol": "NKE", "name": "Nike Inc.", "type": "stock"},
    {"symbol": "MCD", "name": "McDonald's Corporation", "type": "stock"},
    {"symbol": "SBUX", "name": "Starbucks Corporation", "type": "stock"},
    # ETFs
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust", "type": "etf"},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust", "type": "etf"},
    {"symbol": "IWM", "name": "iShares Russell 2000 ETF", "type": "etf"},
    {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "type": "etf"},
    {"symbol": "VOO", "name": "Vanguard S&P 500 ETF", "type": "etf"},
    {"symbol": "VEA", "name": "Vanguard FTSE Developed Markets ETF", "type": "etf"},
    {"symbol": "VWO", "name": "Vanguard FTSE Emerging Markets ETF", "type": "etf"},
    {"symbol": "BND", "name": "Vanguard Total Bond Market ETF", "type": "etf"},
    {"symbol": "AGG", "name": "iShares Core U.S. Aggregate Bond ETF", "type": "etf"},
    {"symbol": "GLD", "name": "SPDR Gold Shares", "type": "etf"},
    {"symbol": "SLV", "name": "iShares Silver Trust", "type": "etf"},
    # Crypto
    {"symbol": "BTC/USD", "name": "Bitcoin", "type": "crypto"},
    {"symbol": "ETH/USD", "name": "Ethereum", "type": "crypto"},
    {"symbol": "LTC/USD", "name": "Litecoin", "type": "crypto"},
    {"symbol": "BCH/USD", "name": "Bitcoin Cash", "type": "crypto"},
    {"symbol": "LINK/USD", "name": "Chainlink", "type": "crypto"},
    {"symbol": "UNI/USD", "name": "Uniswap", "type": "crypto"},
    {"symbol": "AAVE/USD", "name": "Aave", "type": "crypto"},
    {"symbol": "DOT/USD", "name": "Polkadot", "type": "crypto"},
]

# --------- helpers ---------
STOCK_ETFS = {"SPY", "QQQ", "VTI", "IWM", "GLD", "SLV"}

def is_stock_symbol(symbol: str) -> bool:
    s = symbol.upper()
    if s in STOCK_ETFS:
        return True
    # US equities tickers are typically <=5 alpha chars
    return len(s) <= 5 and s.isalpha()

def normalize_crypto_symbol(symbol: str) -> Optional[str]:
    """Return normalized Alpaca crypto pair like 'BTC/USD', or None if not crypto."""
    s = symbol.upper().replace("USDT", "USD")  # map USDT→USD if users pass it
    # Common shapes
    if s in {"BTC", "BITCOIN"}:
        return "BTC/USD"
    if s in {"ETH", "ETHEREUM"}:
        return "ETH/USD"
    if s in {"BTCUSD", "BTC/USD"}:
        return "BTC/USD"
    if s in {"ETHUSD", "ETH/USD"}:
        return "ETH/USD"
    if s in {"BTC/USDT", "BTCUSDT"}:
        return "BTC/USD"
    if s in {"ETH/USDT", "ETHUSDT"}:
        return "ETH/USD"
    # Generic: ABCUSD -> ABC/USD
    if s.endswith("USD") and len(s) <= 7:
        base = s[:-3]
        if base.isalpha() and 2 <= len(base) <= 5:
            return f"{base}/USD"
    if "/" in s and s.endswith("/USD"):
        return s
    return None

def tz_now_iso() -> str:
    return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()

def _mock_quote(symbol: str) -> Dict[str, Any]:
    return {
        "bid_price": 0.0,
        "ask_price": 0.0,
        "bid_size": 0,
        "ask_size": 0,
        "timestamp": tz_now_iso(),
        "source": "unavailable",
    }

def _mock_bar() -> Dict[str, Any]:
    return {
        "timestamp": tz_now_iso(),
        "open": 0.0,
        "high": 0.0,
        "low": 0.0,
        "close": 0.0,
        "volume": 0,
        "source": "unavailable",
    }

def _is_403(e: Exception) -> bool:
    text = str(e)
    return "403" in text or "Forbidden" in text

# --------- core getters ---------
async def get_real_time_quotes(symbols: List[str], credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
    stock_data_client: StockHistoricalDataClient = get_alpaca_stock_data_client()
    crypto_data_client: CryptoHistoricalDataClient = get_alpaca_crypto_data_client()

    stock_symbols = [s for s in symbols if is_stock_symbol(s)]
    crypto_symbols_norm = [normalize_crypto_symbol(s) for s in symbols]
    crypto_symbols = [s for s in crypto_symbols_norm if s]

    quotes: Dict[str, Any] = {}

    # Stocks (IEX feed required for free/paper)
    if stock_symbols:
        try:
            req = StockLatestQuoteRequest(symbol_or_symbols=stock_symbols, feed=DataFeed.IEX)
            data = stock_data_client.get_stock_latest_quote(req)
            logger.info(f"📊 Alpaca IEX quote response for {stock_symbols}: {len(data or {})} quotes received")
            for sym, q in (data or {}).items():
                bid = float(q.bid_price) if getattr(q, "bid_price", None) else 0.0
                ask = float(q.ask_price) if getattr(q, "ask_price", None) else 0.0
                logger.info(f"💰 {sym} IEX Quote - Bid: ${bid}, Ask: ${ask}")
                quotes[sym] = {
                    "bid_price": bid,
                    "ask_price": ask,
                    "bid_size": int(getattr(q, "bid_size", 0) or 0),
                    "ask_size": int(getattr(q, "ask_size", 0) or 0),
                    "timestamp": q.timestamp.isoformat() if getattr(q, "timestamp", None) else tz_now_iso(),
                    "source": "alpaca:iex",
                }
        except Exception as e:
            logger.error(f"❌ ERROR fetching stock quotes from Alpaca IEX: {e}", exc_info=True)
            # graceful degrade: add mocks so UI stays alive
            for sym in stock_symbols:
                quotes[sym] = _mock_quote(sym)

    # Crypto
    if crypto_symbols:
        try:
            req = CryptoLatestQuoteRequest(symbol_or_symbols=crypto_symbols)
            data = crypto_data_client.get_crypto_latest_quote(req)
            for sym, q in (data or {}).items():
                quotes[sym] = {
                    "bid_price": float(q.bid_price) if getattr(q, "bid_price", None) else 0.0,
                    "ask_price": float(q.ask_price) if getattr(q, "ask_price", None) else 0.0,
                    "bid_size": float(getattr(q, "bid_size", 0) or 0.0),
                    "ask_size": float(getattr(q, "ask_size", 0) or 0.0),
                    "timestamp": q.timestamp.isoformat() if getattr(q, "timestamp", None) else tz_now_iso(),
                    "source": "alpaca:crypto",
                }
        except Exception as e:
            logger.error(f"Error fetching crypto quotes: {e}")
            for sym in crypto_symbols:
                quotes[sym] = _mock_quote(sym)

    # Return only the symbols user asked for (after normalization for crypto)
    out: Dict[str, Any] = {}
    for original in symbols:
        if is_stock_symbol(original):
            out[original.upper()] = quotes.get(original.upper(), _mock_quote(original))
        else:
            norm = normalize_crypto_symbol(original)
            out[original.upper()] = quotes.get(norm or original.upper(), _mock_quote(original))
    return {"quotes": out}


async def get_market_snapshot(symbols: List[str], credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
    stock_data_client: StockHistoricalDataClient = get_alpaca_stock_data_client()

    stock_syms = [s for s in symbols if is_stock_symbol(s)]
    if not stock_syms:
        return {"snapshots": {}}

    snapshots: Dict[str, Any] = {}
    try:
        req = StockSnapshotRequest(symbol_or_symbols=stock_syms, feed=DataFeed.IEX)
        resp = stock_data_client.get_stock_snapshot(req)
        for sym, snap in (resp or {}).items():
            latest_quote = getattr(snap, "latest_quote", None)
            latest_trade = getattr(snap, "latest_trade", None)
            daily_bar = getattr(snap, "daily_bar", None)
            snapshots[sym] = {
                "latest_quote": {
                    "bid_price": float(getattr(latest_quote, "bid_price", 0) or 0),
                    "ask_price": float(getattr(latest_quote, "ask_price", 0) or 0),
                    "timestamp": latest_quote.timestamp.isoformat() if getattr(latest_quote, "timestamp", None) else None,
                } if latest_quote else None,
                "latest_trade": {
                    "price": float(getattr(latest_trade, "price", 0) or 0),
                    "size": int(getattr(latest_trade, "size", 0) or 0),
                    "timestamp": latest_trade.timestamp.isoformat() if getattr(latest_trade, "timestamp", None) else None,
                } if latest_trade else None,
                "daily_bar": {
                    "open": float(getattr(daily_bar, "open", 0) or 0),
                    "high": float(getattr(daily_bar, "high", 0) or 0),
                    "low": float(getattr(daily_bar, "low", 0) or 0),
                    "close": float(getattr(daily_bar, "close", 0) or 0),
                    "volume": int(getattr(daily_bar, "volume", 0) or 0),
                    "timestamp": daily_bar.timestamp.isoformat() if getattr(daily_bar, "timestamp", None) else None,
                } if daily_bar else None,
            }
    except Exception as e:
        logger.error(f"Error fetching market snapshots: {e}")
        for sym in stock_syms:
            snapshots[sym] = {
                "latest_quote": _mock_quote(sym),
                "latest_trade": {"price": 0.0, "size": 0, "timestamp": None, "source": "unavailable"},
                "daily_bar": _mock_bar(),
            }
    return {"snapshots": snapshots}


async def get_live_prices_data(symbols: List[str], credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
    try:
        quotes_response = await get_real_time_quotes(symbols, credentials)
    except Exception:
        logger.exception("quotes fetch failed")
        quotes_response = {"quotes": {}}

    try:
        snapshots_response = await get_market_snapshot(symbols, credentials)
    except Exception:
        logger.exception("snapshots fetch failed")
        snapshots_response = {"snapshots": {}}

    combined: Dict[str, Any] = {}
    quotes = quotes_response.get("quotes", {})
    snaps = snapshots_response.get("snapshots", {})

    for original in symbols:
        sym_u = original.upper()
        # match stock snapshot by stock symbol only
        snap = snaps.get(sym_u)
        quote_key = sym_u if is_stock_symbol(sym_u) else (normalize_crypto_symbol(sym_u) or sym_u)
        q = quotes.get(sym_u) or quotes.get(quote_key) or _mock_quote(sym_u)

        bid = q.get("bid_price", 0) or 0
        ask = q.get("ask_price", 0) or 0
        mid = (bid + ask) / 2 if bid and ask else (bid or ask or 0)

        # If no valid price data, log error and return zero (don't use fake prices)
        if not mid or mid <= 0:
            logger.error(f"❌ No valid market data for {sym_u} from Alpaca API. Bid: {bid}, Ask: {ask}")
            # Check if this is a crypto symbol
            if normalize_crypto_symbol(sym_u):
                logger.warning(f"⚠️ Crypto symbol {sym_u} has no data. API might not support this pair.")
            else:
                logger.warning(f"⚠️ Stock symbol {sym_u} has no data. Market might be closed or API error.")
        daily_bar = (snap or {}).get("daily_bar") if snap else None
        open_px = (daily_bar or {}).get("open", 0) if daily_bar else 0
        change = (mid - open_px) if (mid and open_px) else 0
        change_pct = (change / open_px * 100) if open_px else 0

        combined[sym_u] = {
            "price": mid,
            "bid_price": bid,
            "ask_price": ask,
            "change": change,
            "change_percent": change_pct,
            "volume": (daily_bar or {}).get("volume", 0) if daily_bar else 0,
            "high": (daily_bar or {}).get("high", 0) if daily_bar else 0,
            "low": (daily_bar or {}).get("low", 0) if daily_bar else 0,
            "open": open_px,
            "timestamp": q.get("timestamp") or ((daily_bar or {}).get("timestamp") if daily_bar else None),
        }

    return combined


async def get_bars_data(
    symbols: List[str],
    timeframe: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: Optional[int] = None,
    credentials: HTTPAuthorizationCredentials = None,
) -> Dict[str, Any]:
    stock_data_client: StockHistoricalDataClient = get_alpaca_stock_data_client()
    crypto_data_client: CryptoHistoricalDataClient = get_alpaca_crypto_data_client()

    # timeframe mapping
    tf = {
        "1Min": TimeFrame.Minute,
        "5Min": TimeFrame(5, "Min"),
        "15Min": TimeFrame(15, "Min"),
        "1Hour": TimeFrame.Hour,
        "1Day": TimeFrame.Day,
    }.get(timeframe, TimeFrame.Day)

    stock_syms = [s for s in symbols if is_stock_symbol(s)]
    crypto_syms = [normalize_crypto_symbol(s) for s in symbols]
    crypto_syms = [s for s in crypto_syms if s]

    bars: Dict[str, List[Dict[str, Any]]] = {}

    # Stocks
    if stock_syms:
        try:
            req = StockBarsRequest(
                symbol_or_symbols=stock_syms,
                timeframe=tf,
                start=start_time,
                end=end_time,
                limit=limit,
                feed=DataFeed.IEX,
            )
            data = stock_data_client.get_stock_bars(req)
            for sym, series in (data or {}).items():
                bars[sym] = [
                    {
                        "timestamp": b.timestamp.isoformat(),
                        "open": float(b.open),
                        "high": float(b.high),
                        "low": float(b.low),
                        "close": float(b.close),
                        "volume": int(getattr(b, "volume", 0) or 0),
                        "source": "alpaca:iex",
                    }
                    for b in series or []
                ]
        except Exception as e:
            logger.error(f"Error fetching stock bars: {e}")
            for sym in stock_syms:
                bars[sym] = [_mock_bar()]

    # Crypto
    if crypto_syms:
        try:
            req = CryptoBarsRequest(
                symbol_or_symbols=crypto_syms,
                timeframe=tf,
                start=start_time,
                end=end_time,
                limit=limit,
            )
            data = crypto_data_client.get_crypto_bars(req)
            for sym, series in (data or {}).items():
                bars[sym] = [
                    {
                        "timestamp": b.timestamp.isoformat(),
                        "open": float(b.open),
                        "high": float(b.high),
                        "low": float(b.low),
                        "close": float(b.close),
                        "volume": float(getattr(b, "volume", 0) or 0.0),
                        "source": "alpaca:crypto",
                    }
                    for b in series or []
                ]
        except Exception as e:
            logger.error(f"Error fetching crypto bars: {e}")
            for sym in crypto_syms:
                bars[sym] = [_mock_bar()]

    return {"bars": bars}

# --------- routes ---------
@router.get("/symbol/{symbol}")
async def get_market_data(
    symbol: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    """Get market data for a single symbol"""
    data = await get_live_prices_data([symbol.upper()], credentials)
    return data.get(symbol.upper(), {})

@router.get("/quotes")
async def quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    return await get_real_time_quotes(symbol_list, credentials)

@router.get("/bars")
async def bars(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    timeframe: str = Query("1Day", description="1Min, 5Min, 15Min, 1Hour, 1Day"),
    start: Optional[str] = Query(None, description="Start ISO (YYYY-MM-DD or RFC3339)"),
    end: Optional[str] = Query(None, description="End ISO (YYYY-MM-DD or RFC3339)"),
    limit: Optional[int] = Query(100, description="Max bars"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]

    def parse(s: Optional[str]) -> Optional[datetime]:
        if not s:
            return None
        try:
            dt = datetime.fromisoformat(s)
        except ValueError:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    start_dt = parse(start)
    end_dt = parse(end)

    return await get_bars_data(symbol_list, timeframe, start_dt, end_dt, limit, credentials)

@router.get("/snapshot")
async def snapshot(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    return await get_market_snapshot(symbol_list, credentials)

@router.get("/live-prices")
async def live_prices(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    # current_user=Depends(get_current_user),  # optional for public ping
):
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    return await get_live_prices_data(symbol_list, credentials)

@router.get("/{symbol}/historical")
async def historical(
    symbol: str,
    timeframe: str = Query("1Day", description="1Min, 5Min, 15Min, 1Hour, 1Day"),
    start: Optional[str] = Query(None, description="Start ISO (YYYY-MM-DD or RFC3339)"),
    end: Optional[str] = Query(None, description="End ISO (YYYY-MM-DD or RFC3339)"),
    limit: Optional[int] = Query(100, description="Max bars"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    def parse(s: Optional[str]) -> Optional[datetime]:
        if not s:
            return None
        try:
            dt = datetime.fromisoformat(s)
        except ValueError:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    start_dt = parse(start)
    end_dt = parse(end)
    data = await get_bars_data([symbol.upper()], timeframe, start_dt, end_dt, limit, credentials)
    # prefer normalized crypto key if needed
    sym_key = symbol.upper() if is_stock_symbol(symbol) else (normalize_crypto_symbol(symbol) or symbol.upper())
    return data.get("bars", {}).get(sym_key, [])

def calculate_black_scholes_greeks(S, K, T, r, sigma, option_type='call'):
    """
    Calculate Black-Scholes option price and Greeks
    S: Current stock price
    K: Strike price
    T: Time to expiration (in years)
    r: Risk-free rate
    sigma: Volatility
    """
    try:
        if T <= 0 or sigma <= 0:
            return {
                'price': 0,
                'delta': 0,
                'gamma': 0,
                'theta': 0,
                'vega': 0,
                'rho': 0
            }
        
        d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
        d2 = d1 - sigma * math.sqrt(T)
        
        if option_type == 'call':
            price = S * norm.cdf(d1) - K * math.exp(-r * T) * norm.cdf(d2)
            delta = norm.cdf(d1)
            rho = K * T * math.exp(-r * T) * norm.cdf(d2) / 100
        else:  # put
            price = K * math.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
            delta = -norm.cdf(-d1)
            rho = -K * T * math.exp(-r * T) * norm.cdf(-d2) / 100
        
        gamma = norm.pdf(d1) / (S * sigma * math.sqrt(T))
        theta = -(S * norm.pdf(d1) * sigma / (2 * math.sqrt(T)) + 
                 r * K * math.exp(-r * T) * (norm.cdf(d2) if option_type == 'call' else norm.cdf(-d2))) / 365
        vega = S * norm.pdf(d1) * math.sqrt(T) / 100
        
        return {
            'price': max(price, 0),
            'delta': delta,
            'gamma': gamma,
            'theta': theta,
            'vega': vega,
            'rho': rho
        }
    except Exception as e:
        logger.error(f"Error calculating Black-Scholes: {e}")
        return {
            'price': 0,
            'delta': 0,
            'gamma': 0,
            'theta': 0,
            'vega': 0,
            'rho': 0
        }

def calculate_probability_of_success(delta, option_type='call'):
    """
    Calculate probability of success based on delta
    For calls: PoS = 1 - |delta| (probability of expiring OTM)
    For puts: PoS = 1 - |delta| (probability of expiring OTM)
    """
    try:
        if option_type == 'call':
            # For calls, we want the probability of staying below the strike
            return (1 - abs(delta)) * 100
        else:  # put
            # For puts, we want the probability of staying above the strike
            return (1 - abs(delta)) * 100
    except:
        return 50.0  # Default 50% if calculation fails

async def get_options_chain_data(symbol: str, expiration_date: str = None) -> Dict[str, Any]:
    """
    Get options chain data for a symbol
    In production, this would fetch from a real options data provider
    For now, we'll generate realistic mock data
    """
    try:
        # Get current stock price
        stock_data_client = get_alpaca_stock_data_client()
        
        # Try to get real stock price
        current_price = 150.0  # Default fallback
        try:
            req = StockLatestQuoteRequest(symbol_or_symbols=[symbol], feed=DataFeed.IEX)
            resp = stock_data_client.get_stock_latest_quote(req)
            quote = resp.get(symbol)
            if quote and hasattr(quote, 'ask_price') and quote.ask_price:
                current_price = float(quote.ask_price)
            elif quote and hasattr(quote, 'bid_price') and quote.bid_price:
                current_price = float(quote.bid_price)
        except Exception as e:
            logger.warning(f"Could not fetch real price for {symbol}, using fallback: {e}")
            # Use symbol-specific fallback prices
            if symbol == 'AAPL':
                current_price = 185.0
            elif symbol == 'MSFT':
                current_price = 420.0
            elif symbol == 'SPY':
                current_price = 580.0
            elif symbol == 'QQQ':
                current_price = 480.0
        
        # Generate expiration dates (next 4 monthly expirations)
        from datetime import datetime, timedelta
        import calendar
        
        expirations = []
        current_date = datetime.now()
        
        for i in range(4):
            # Find third Friday of the month
            year = current_date.year
            month = current_date.month + i
            if month > 12:
                year += 1
                month -= 12
            
            # Find third Friday
            first_day = datetime(year, month, 1)
            first_friday = first_day + timedelta(days=(4 - first_day.weekday()) % 7)
            third_friday = first_friday + timedelta(days=14)
            
            expirations.append(third_friday.strftime('%Y-%m-%d'))
        
        # Use provided expiration or default to first one
        target_expiration = expiration_date or expirations[0]
        expiration_dt = datetime.strptime(target_expiration, '%Y-%m-%d')
        days_to_expiration = (expiration_dt - datetime.now()).days
        time_to_expiration = max(days_to_expiration / 365.0, 0.01)  # Minimum 1 day
        
        # Generate strike prices around current price
        strike_range = 0.2  # ±20% from current price
        num_strikes = 20
        min_strike = current_price * (1 - strike_range)
        max_strike = current_price * (1 + strike_range)
        
        strikes = []
        for i in range(num_strikes):
            strike = min_strike + (max_strike - min_strike) * i / (num_strikes - 1)
            # Round to nearest $5 for stocks, $1 for lower priced stocks
            if current_price > 100:
                strike = round(strike / 5) * 5
            else:
                strike = round(strike)
            strikes.append(strike)
        
        # Remove duplicates and sort
        strikes = sorted(list(set(strikes)))
        
        # Risk-free rate (approximate)
        risk_free_rate = 0.045  # 4.5%
        
        # Implied volatility (mock - varies by moneyness)
        base_iv = 0.25  # 25% base IV
        
        options_data = []
        
        for strike in strikes:
            # Calculate IV based on moneyness (smile effect)
            moneyness = strike / current_price
            iv_adjustment = abs(moneyness - 1) * 0.5  # IV smile
            iv = base_iv + iv_adjustment
            
            # Calculate Greeks for calls and puts
            call_greeks = calculate_black_scholes_greeks(current_price, strike, time_to_expiration, risk_free_rate, iv, 'call')
            put_greeks = calculate_black_scholes_greeks(current_price, strike, time_to_expiration, risk_free_rate, iv, 'put')
            
            # Calculate probability of success
            call_pos = calculate_probability_of_success(call_greeks['delta'], 'call')
            put_pos = calculate_probability_of_success(put_greeks['delta'], 'put')
            
            # Generate bid/ask spreads
            call_price = call_greeks['price']
            put_price = put_greeks['price']
            
            spread_pct = 0.05  # 5% bid-ask spread
            call_bid = max(call_price * (1 - spread_pct), 0.01)
            call_ask = call_price * (1 + spread_pct)
            put_bid = max(put_price * (1 - spread_pct), 0.01)
            put_ask = put_price * (1 + spread_pct)
            
            # Mock volume and open interest
            base_volume = max(100, int(1000 * math.exp(-abs(moneyness - 1) * 2)))
            base_oi = max(50, int(500 * math.exp(-abs(moneyness - 1) * 1.5)))
            
            options_data.append({
                'strike': strike,
                'expiration': target_expiration,
                'days_to_expiration': days_to_expiration,
                'call': {
                    'bid': round(call_bid, 2),
                    'ask': round(call_ask, 2),
                    'last': round(call_price, 2),
                    'volume': base_volume + int(np.random.normal(0, base_volume * 0.3)),
                    'open_interest': base_oi + int(np.random.normal(0, base_oi * 0.2)),
                    'implied_volatility': round(iv * 100, 1),
                    'delta': round(call_greeks['delta'], 3),
                    'gamma': round(call_greeks['gamma'], 4),
                    'theta': round(call_greeks['theta'], 3),
                    'vega': round(call_greeks['vega'], 3),
                    'rho': round(call_greeks['rho'], 3),
                    'probability_of_success': round(call_pos, 1)
                },
                'put': {
                    'bid': round(put_bid, 2),
                    'ask': round(put_ask, 2),
                    'last': round(put_price, 2),
                    'volume': base_volume + int(np.random.normal(0, base_volume * 0.3)),
                    'open_interest': base_oi + int(np.random.normal(0, base_oi * 0.2)),
                    'implied_volatility': round(iv * 100, 1),
                    'delta': round(put_greeks['delta'], 3),
                    'gamma': round(put_greeks['gamma'], 4),
                    'theta': round(put_greeks['theta'], 3),
                    'vega': round(put_greeks['vega'], 3),
                    'rho': round(put_greeks['rho'], 3),
                    'probability_of_success': round(put_pos, 1)
                }
            })
        
        return {
            'symbol': symbol,
            'current_price': current_price,
            'expirations': expirations,
            'selected_expiration': target_expiration,
            'options': options_data,
            'implied_volatility_avg': round(base_iv * 100, 1),
            'time_to_expiration': time_to_expiration
        }
        
    except Exception as e:
        logger.error(f"Error generating options chain data: {e}")
        return {
            'symbol': symbol,
            'current_price': 150.0,
            'expirations': [],
            'selected_expiration': expiration_date or '2025-02-21',
            'options': [],
            'implied_volatility_avg': 25.0,
            'time_to_expiration': 0.1
        }

@router.get("/options-chain")
async def get_options_chain(
    symbol: str = Query(..., description="Stock symbol"),
    expiration: Optional[str] = Query(None, description="Expiration date (YYYY-MM-DD)"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    """Get options chain data for a symbol"""
    try:
        data = await get_options_chain_data(symbol.upper(), expiration)
        return data
    except Exception as e:
        logger.error(f"Error fetching options chain: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch options chain: {str(e)}")

@router.get("/symbols/search")
async def search_symbols(
    query: str = Query(..., description="Search query for symbols", min_length=1),
    limit: int = Query(20, description="Maximum number of results", le=50),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    """Search for trading symbols (stocks, ETFs, crypto)"""
    try:
        query_lower = query.lower().strip()
        
        if not query_lower:
            return {"symbols": POPULAR_SYMBOLS[:limit]}
        
        # Search through our symbol database
        matching_symbols = []
        
        for symbol_data in STOCK_SYMBOLS_WITH_NAMES:
            symbol = symbol_data["symbol"]
            name = symbol_data["name"]
            symbol_type = symbol_data["type"]
            
            # Check if query matches symbol or company name
            if (query_lower in symbol.lower() or 
                query_lower in name.lower() or
                symbol.lower().startswith(query_lower)):
                
                matching_symbols.append({
                    "symbol": symbol,
                    "name": name,
                    "type": symbol_type,
                    "score": 100 if symbol.lower().startswith(query_lower) else 
                            80 if symbol.lower() == query_lower else
                            60 if query_lower in symbol.lower() else 50
                })
        
        # Add exact symbol match if not found in database
        if not any(s["symbol"].upper() == query.upper() for s in matching_symbols):
            # Add the typed symbol as a potential match
            matching_symbols.append({
                "symbol": query.upper(),
                "name": f"{query.upper()} (Symbol)",
                "type": "stock",
                "score": 90  # High score for exact matches
            })
        
        # Add common symbols that might not be in the main database
        additional_symbols = [
            {"symbol": "TSM", "name": "Taiwan Semiconductor Manufacturing", "type": "stock"},
            {"symbol": "ASML", "name": "ASML Holding N.V.", "type": "stock"},
            {"symbol": "BABA", "name": "Alibaba Group Holding", "type": "stock"},
            {"symbol": "TCEHY", "name": "Tencent Holdings", "type": "stock"},
            {"symbol": "SHOP", "name": "Shopify Inc.", "type": "stock"},
            {"symbol": "SQ", "name": "Block Inc.", "type": "stock"},
            {"symbol": "PYPL", "name": "PayPal Holdings", "type": "stock"},
            {"symbol": "ROKU", "name": "Roku Inc.", "type": "stock"},
            {"symbol": "ZM", "name": "Zoom Video Communications", "type": "stock"},
            {"symbol": "DOCU", "name": "DocuSign Inc.", "type": "stock"},
            {"symbol": "SNOW", "name": "Snowflake Inc.", "type": "stock"},
            {"symbol": "PLTR", "name": "Palantir Technologies", "type": "stock"},
            {"symbol": "RBLX", "name": "Roblox Corporation", "type": "stock"},
            {"symbol": "U", "name": "Unity Software Inc.", "type": "stock"},
            {"symbol": "DDOG", "name": "Datadog Inc.", "type": "stock"},
            {"symbol": "OKTA", "name": "Okta Inc.", "type": "stock"},
            {"symbol": "TWLO", "name": "Twilio Inc.", "type": "stock"},
            {"symbol": "NET", "name": "Cloudflare Inc.", "type": "stock"},
            {"symbol": "FSLY", "name": "Fastly Inc.", "type": "stock"},
            {"symbol": "CRWD", "name": "CrowdStrike Holdings", "type": "stock"},
        ]
        
        # Add additional symbols that match the query
        for additional in additional_symbols:
            if (query_lower in additional["symbol"].lower() or 
                query_lower in additional["name"].lower()) and \
               not any(s["symbol"] == additional["symbol"] for s in matching_symbols):
                matching_symbols.append({
                    **additional,
                    "score": 85 if additional["symbol"].lower().startswith(query_lower) else 70
                })
        
        # Sort by relevance score (exact matches first)
        matching_symbols.sort(key=lambda x: x["score"], reverse=True)
        
        # Limit results
        results = matching_symbols[:limit]
        
        # If we have few results, add popular symbols that match
        if len(results) < limit:
            for popular_symbol in POPULAR_SYMBOLS:
                if query_lower in popular_symbol.lower() and popular_symbol not in [r["symbol"] for r in results]:
                    symbol_type = "crypto" if "/" in popular_symbol else "stock"
                    results.append({
                        "symbol": popular_symbol,
                        "name": popular_symbol,
                        "type": symbol_type,
                        "score": 25
                    })
                    if len(results) >= limit:
                        break
        
        return {"symbols": results}
        
    except Exception as e:
        logger.error(f"Error searching symbols: {e}")
        # Return popular symbols as fallback
        return {"symbols": [{"symbol": s, "name": s, "type": "stock", "score": 0} for s in POPULAR_SYMBOLS[:limit]]}

@router.post("/ai-configure-grid-range")
async def ai_configure_grid_range(
    request_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    """AI-powered grid range configuration using technical analysis and market data"""
    try:
        symbol = request_data.get("symbol")
        allocated_capital = request_data.get("allocated_capital", 1000)
        number_of_grids = request_data.get("number_of_grids", 20)
        
        if not symbol:
            raise HTTPException(status_code=400, detail="Symbol is required")
        
        logger.info(f"🤖 AI configuring grid range for {symbol} with ${allocated_capital} capital and {number_of_grids} grids")
        
        # Fetch 1-year historical data
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(days=365)
        
        historical_data = await get_bars_data(
            symbols=[symbol.upper()],
            timeframe="1Day",
            start_time=start_time,
            end_time=end_time,
            limit=365,
            credentials=credentials
        )
        
        # Get the symbol key (handle crypto normalization)
        symbol_key = symbol.upper()
        if not is_stock_symbol(symbol):
            normalized = normalize_crypto_symbol(symbol)
            if normalized:
                symbol_key = normalized
        
        bars = historical_data.get("bars", {}).get(symbol_key, [])
        
        if not bars or len(bars) < 30:
            logger.warning(f"⚠️ Insufficient historical data for {symbol}, using fallback calculation")
            # Fallback to current price with percentage range
            current_price_data = await get_live_prices_data([symbol], credentials)
            current_price = current_price_data.get(symbol.upper(), {}).get("price", 100)
            
            fallback_lower = current_price * 0.8  # 20% below
            fallback_upper = current_price * 1.2  # 20% above
            
            return {
                "lower_limit": round(fallback_lower, 2),
                "upper_limit": round(fallback_upper, 2),
                "reasoning": f"Used fallback 20% range around current price (${current_price:.2f}) due to limited historical data."
            }
        
        logger.info(f"📊 Analyzing {len(bars)} historical bars for {symbol}")
        
        # Extract price data
        closing_prices = [float(bar["close"]) for bar in bars]
        high_prices = [float(bar["high"]) for bar in bars]
        low_prices = [float(bar["low"]) for bar in bars]

        # Calculate yearly extremes
        yearly_high = max(high_prices)
        yearly_low = min(low_prices)

        # IMPORTANT: Use LIVE current price, not historical close
        logger.info(f"📊 Fetching live current price for {symbol}...")
        current_price_data = await get_live_prices_data([symbol], credentials)
        live_current_price = current_price_data.get(symbol.upper(), {}).get("price", 0)

        # Use historical as fallback only if live price fails
        historical_close = closing_prices[-1]
        if live_current_price and live_current_price > 0:
            current_price = live_current_price
            logger.info(f"✅ Using LIVE current price: ${current_price:.2f}")
        else:
            current_price = historical_close
            logger.warning(f"⚠️ Live price unavailable, using historical close: ${current_price:.2f}")

        logger.info(f"📈 Yearly range: ${yearly_low:.2f} - ${yearly_high:.2f}, Current: ${current_price:.2f}")
        
        # Calculate Bollinger Bands (20-period, 2 std dev)
        bb_data = TechnicalIndicators.calculate_bollinger_bands(closing_prices, period=20, std_dev=2.0)
        bb_upper = bb_data["upper"]
        bb_lower = bb_data["lower"]
        bb_middle = bb_data["middle"]
        
        logger.info(f"📊 Bollinger Bands: Lower=${bb_lower:.2f}, Middle=${bb_middle:.2f}, Upper=${bb_upper:.2f}")
        
        # Calculate recent volatility (last 30 days)
        recent_prices = closing_prices[-30:] if len(closing_prices) >= 30 else closing_prices
        recent_volatility = np.std(recent_prices) if len(recent_prices) > 1 else 0
        
        # Calculate RSI for momentum analysis
        rsi = TechnicalIndicators.calculate_rsi(closing_prices, period=14)
        
        # Calculate price momentum (20-day moving average)
        ma_20 = np.mean(closing_prices[-20:]) if len(closing_prices) >= 20 else current_price
        momentum = (current_price - ma_20) / ma_20 if ma_20 > 0 else 0
        
        logger.info(f"📊 Technical indicators: RSI={rsi:.1f}, Volatility=${recent_volatility:.2f}, Momentum={momentum:.2%}")
        
        # AI LOGIC FOR OPTIMAL GRID RANGE
        
        # 1. Start with Bollinger Bands as base mean-reversion range
        ai_lower_base = bb_lower
        ai_upper_base = bb_upper
        
        # 2. Adjust based on volatility
        volatility_multiplier = 1.0
        if recent_volatility > np.std(closing_prices) * 1.5:  # High recent volatility
            volatility_multiplier = 1.3  # Widen range
            logger.info("🔥 High volatility detected, widening range by 30%")
        elif recent_volatility < np.std(closing_prices) * 0.7:  # Low recent volatility
            volatility_multiplier = 0.8  # Narrow range
            logger.info("😴 Low volatility detected, narrowing range by 20%")
        
        # 3. Adjust based on RSI (momentum)
        rsi_adjustment = 1.0
        if rsi > 70:  # Overbought - expect downward movement
            rsi_adjustment = 0.9  # Favor lower range
            logger.info("📈 Overbought conditions (RSI>70), favoring lower range")
        elif rsi < 30:  # Oversold - expect upward movement
            rsi_adjustment = 1.1  # Favor upper range
            logger.info("📉 Oversold conditions (RSI<30), favoring upper range")
        
        # 4. Apply adjustments
        range_width = (ai_upper_base - ai_lower_base) * volatility_multiplier
        range_center = (ai_upper_base + ai_lower_base) / 2
        
        # Adjust center based on momentum
        if momentum > 0.05:  # Strong upward momentum
            range_center *= 1.05  # Shift range up
            logger.info("🚀 Strong upward momentum, shifting range up 5%")
        elif momentum < -0.05:  # Strong downward momentum
            range_center *= 0.95  # Shift range down
            logger.info("📉 Strong downward momentum, shifting range down 5%")
        
        # 5. Calculate final range
        ai_lower_limit = range_center - (range_width / 2)
        ai_upper_limit = range_center + (range_width / 2)
        
        # 6. Ensure current price is comfortably within range (20% buffer from edges)
        range_span = ai_upper_limit - ai_lower_limit
        min_distance_from_edge = range_span * 0.2
        
        if current_price - ai_lower_limit < min_distance_from_edge:
            ai_lower_limit = current_price - min_distance_from_edge
            logger.info("🔧 Adjusted lower limit to maintain 20% buffer from current price")
        
        if ai_upper_limit - current_price < min_distance_from_edge:
            ai_upper_limit = current_price + min_distance_from_edge
            logger.info("🔧 Adjusted upper limit to maintain 20% buffer from current price")
        
        # 7. Ensure we don't exceed yearly extremes (with small buffer)
        yearly_buffer = (yearly_high - yearly_low) * 0.05  # 5% buffer
        ai_lower_limit = max(ai_lower_limit, yearly_low - yearly_buffer)
        ai_upper_limit = min(ai_upper_limit, yearly_high + yearly_buffer)
        
        # 8. Final validation - ensure minimum range
        if ai_upper_limit - ai_lower_limit < current_price * 0.1:  # Minimum 10% range
            logger.info("🔧 Range too narrow, applying minimum 15% range around current price")
            ai_lower_limit = current_price * 0.925  # 7.5% below
            ai_upper_limit = current_price * 1.075  # 7.5% above
        
        # 9. Round to appropriate precision
        if current_price > 1000:  # High-value assets like BTC
            ai_lower_limit = round(ai_lower_limit, 0)
            ai_upper_limit = round(ai_upper_limit, 0)
        elif current_price > 100:  # Medium-value assets
            ai_lower_limit = round(ai_lower_limit, 1)
            ai_upper_limit = round(ai_upper_limit, 1)
        else:  # Low-value assets
            ai_lower_limit = round(ai_lower_limit, 2)
            ai_upper_limit = round(ai_upper_limit, 2)
        
        # Calculate grid spacing for user information
        grid_spacing = (ai_upper_limit - ai_lower_limit) / (number_of_grids - 1)
        range_percentage = ((ai_upper_limit - ai_lower_limit) / current_price) * 100
        
        # Generate reasoning explanation
        reasoning = f"""AI Grid Configuration for {symbol}:

📊 Market Analysis:
• Current Price: ${current_price:.2f}
• Yearly Range: ${yearly_low:.2f} - ${yearly_high:.2f}
• RSI: {rsi:.1f} ({'Overbought' if rsi > 70 else 'Oversold' if rsi < 30 else 'Neutral'})
• Recent Volatility: {recent_volatility:.2f}
• Momentum: {momentum:.1%}

🎯 Optimized Grid Range:
• Lower Limit: ${ai_lower_limit:.2f}
• Upper Limit: ${ai_upper_limit:.2f}
• Range Width: {range_percentage:.1f}% of current price
• Grid Spacing: ${grid_spacing:.2f}

🧠 AI Reasoning:
• Used Bollinger Bands as base mean-reversion range
• Applied volatility adjustment (×{volatility_multiplier:.1f})
• Considered RSI momentum signals
• Ensured 20% buffer from current price
• Optimized for {number_of_grids} grid levels"""
        
        logger.info(f"✅ AI configuration complete: ${ai_lower_limit:.2f} - ${ai_upper_limit:.2f}")
        
        return {
            "lower_limit": ai_lower_limit,
            "upper_limit": ai_upper_limit,
            "reasoning": reasoning,
            "technical_data": {
                "current_price": current_price,
                "yearly_high": yearly_high,
                "yearly_low": yearly_low,
                "bollinger_upper": bb_upper,
                "bollinger_lower": bb_lower,
                "rsi": rsi,
                "volatility": recent_volatility,
                "momentum": momentum,
                "grid_spacing": grid_spacing,
                "range_percentage": range_percentage,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in AI grid configuration: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to configure grid range: {str(e)}")

@router.get("/symbols/popular")
async def get_popular_symbols(
    limit: int = Query(20, description="Maximum number of results", le=50),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    """Get popular trading symbols"""
    try:
        popular_with_details = []
        
        for symbol in POPULAR_SYMBOLS[:limit]:
            # Find details if available
            symbol_data = next((s for s in STOCK_SYMBOLS_WITH_NAMES if s["symbol"] == symbol), None)
            if symbol_data:
                popular_with_details.append(symbol_data)
            else:
                # Add basic info for symbols not in detailed list
                symbol_type = "crypto" if "/" in symbol else "stock"
                popular_with_details.append({
                    "symbol": symbol,
                    "name": symbol,
                    "type": symbol_type,
                    "score": 100
                })
        
        return {"symbols": popular_with_details}
        
    except Exception as e:
        logger.error(f"Error fetching popular symbols: {e}")
        return {"symbols": [{"symbol": s, "name": s, "type": "stock", "score": 0} for s in POPULAR_SYMBOLS[:limit]]}