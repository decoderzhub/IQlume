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

router = APIRouter(prefix="/api/market-data", tags=["market-data"])
logger = logging.getLogger(__name__)

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
            for sym, q in (data or {}).items():
                quotes[sym] = {
                    "bid_price": float(q.bid_price) if getattr(q, "bid_price", None) else 0.0,
                    "ask_price": float(q.ask_price) if getattr(q, "ask_price", None) else 0.0,
                    "bid_size": int(getattr(q, "bid_size", 0) or 0),
                    "ask_size": int(getattr(q, "ask_size", 0) or 0),
                    "timestamp": q.timestamp.isoformat() if getattr(q, "timestamp", None) else tz_now_iso(),
                    "source": "alpaca:iex",
                }
        except Exception as e:
            logger.error(f"Error fetching stock quotes: {e}")
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
