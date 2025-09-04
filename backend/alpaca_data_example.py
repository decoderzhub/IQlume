# pip install "alpaca-py>=0.25.0" python-dotenv

import os
from datetime import datetime, timedelta, timezone

from alpaca.data.historical import StockHistoricalDataClient, CryptoHistoricalDataClient
from alpaca.data.requests import (
    StockLatestQuoteRequest,
    StockBarsRequest,
    StockSnapshotRequest,
    CryptoLatestQuoteRequest,
    CryptoBarsRequest,
)
from alpaca.data.timeframe import TimeFrame
from alpaca.data.enums import DataFeed
from alpaca.common.exceptions import APIError as AlpacaAPIError
from dotenv import load_dotenv

load_dotenv()  # will look for .env in the current working directory


ALPACA_API_KEY = os.environ.get("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.environ.get("ALPACA_SECRET_KEY")

if not ALPACA_API_KEY or not ALPACA_SECRET_KEY:
    raise SystemExit("Set ALPACA_API_KEY and ALPACA_SECRET_KEY in your environment first.")

# NOTE: Market Data uses data.alpaca.markets (no sandbox host). Keys can be paper keys.
stock_client = StockHistoricalDataClient(ALPACA_API_KEY, ALPACA_SECRET_KEY)
crypto_client = CryptoHistoricalDataClient(ALPACA_API_KEY, ALPACA_SECRET_KEY)


def normalize_crypto(sym: str) -> str:
    s = sym.upper().replace("USDT", "USD")
    if s in ("BTC", "BITCOIN", "BTCUSD", "BTC/USD"):
        return "BTC/USD"
    if s in ("ETH", "ETHEREUM", "ETHUSD", "ETH/USD"):
        return "ETH/USD"
    if s.endswith("USD") and "/" not in s:
        return f"{s[:-3]}/USD"
    return s


def demo_equity_quote(symbol="AAPL"):
    print(f"\n=== STOCK LATEST QUOTE ({symbol}) | feed=IEX ===")
    try:
        req = StockLatestQuoteRequest(symbol_or_symbols=[symbol], feed=DataFeed.IEX)
        resp = stock_client.get_stock_latest_quote(req)
        q = resp.get(symbol)
        print(q)
    except AlpacaAPIError as e:
        print("AlpacaAPIError:", e)
    except Exception as e:
        print("Error:", e)


def demo_equity_bars(symbol="AAPL"):
    print(f"\n=== STOCK BARS ({symbol}) last 10 x 1Min | feed=IEX ===")
    end = datetime.now(timezone.utc)
    start = end - timedelta(minutes=30)
    try:
        req = StockBarsRequest(
            symbol_or_symbols=[symbol],
            timeframe=TimeFrame.Minute,
            start=start,
            end=end,
            limit=10,
            feed=DataFeed.IEX,
        )
        resp = stock_client.get_stock_bars(req)
        bars = resp.get(symbol, [])
        print(f"bars: {len(bars)}")
        for b in bars[:3]:
            print(b.timestamp, b.open, b.high, b.low, b.close, b.volume)
    except AlpacaAPIError as e:
        print("AlpacaAPIError:", e)
    except Exception as e:
        print("Error:", e)


def demo_equity_snapshot(symbol="MSFT"):
    print(f"\n=== STOCK SNAPSHOT ({symbol}) | feed=IEX ===")
    try:
        req = StockSnapshotRequest(symbol_or_symbols=[symbol], feed=DataFeed.IEX)
        resp = stock_client.get_stock_snapshot(req)
        snap = resp.get(symbol)
        if snap:
            print("latest_trade:", getattr(snap.latest_trade, "price", None))
            print("latest_quote bid/ask:", getattr(snap.latest_quote, "bid_price", None), getattr(snap.latest_quote, "ask_price", None))
            if snap.daily_bar:
                print("daily open/high/low/close:", snap.daily_bar.open, snap.daily_bar.high, snap.daily_bar.low, snap.daily_bar.close)
        else:
            print("No snapshot returned.")
    except AlpacaAPIError as e:
        print("AlpacaAPIError:", e)
    except Exception as e:
        print("Error:", e)


def demo_crypto_quote(symbol="BTC"):
    pair = normalize_crypto(symbol)
    print(f"\n=== CRYPTO LATEST QUOTE ({pair}) ===")
    try:
        req = CryptoLatestQuoteRequest(symbol_or_symbols=[pair])
        resp = crypto_client.get_crypto_latest_quote(req)
        q = resp.get(pair)
        print(q)
    except AlpacaAPIError as e:
        print("AlpacaAPIError:", e)
    except Exception as e:
        print("Error:", e)


def demo_crypto_bars(symbol="ETH"):
    pair = normalize_crypto(symbol)
    print(f"\n=== CRYPTO BARS ({pair}) last 10 x 1Min ===")
    end = datetime.now(timezone.utc)
    start = end - timedelta(minutes=20)
    try:
        req = CryptoBarsRequest(
            symbol_or_symbols=[pair],
            timeframe=TimeFrame.Minute,
            start=start,
            end=end,
            limit=10,
        )
        resp = crypto_client.get_crypto_bars(req)
        bars = resp.get(pair, [])
        print(f"bars: {len(bars)}")
        for b in bars[:3]:
            print(b.timestamp, b.open, b.high, b.low, b.close, b.volume)
    except AlpacaAPIError as e:
        print("AlpacaAPIError:", e)
    except Exception as e:
        print("Error:", e)


if __name__ == "__main__":
    demo_equity_quote("AAPL")   # uses IEX (avoids 403 on free/paper)
    demo_equity_bars("AAPL")    # uses IEX
    demo_equity_snapshot("MSFT")# uses IEX
    demo_crypto_quote("BTC")    # BTC/USD
    demo_crypto_bars("ETH")     # ETH/USD
