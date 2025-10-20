"""
Script to populate historical market data for common symbols.
This should be run once to seed the database with initial data for backtesting.
"""

import os
import asyncio
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.data.enums import DataFeed
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

COMMON_SYMBOLS = [
    "SPY",    # S&P 500 ETF
    "QQQ",    # NASDAQ 100 ETF
    "AAPL",   # Apple
    "MSFT",   # Microsoft
    "GOOGL",  # Google
    "AMZN",   # Amazon
    "TSLA",   # Tesla
    "META",   # Meta
    "NVDA",   # NVIDIA
    "AMD",    # AMD
]


async def populate_data():
    """Populate historical market data for common symbols"""

    # Initialize Supabase client
    supabase_url = os.getenv("VITE_SUPABASE_URL")
    supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        logger.error("❌ Supabase credentials not found in environment variables")
        return

    supabase: Client = create_client(supabase_url, supabase_key)

    # Initialize Alpaca client
    alpaca_key = os.getenv("ALPACA_API_KEY")
    alpaca_secret = os.getenv("ALPACA_SECRET_KEY")

    if not alpaca_key or not alpaca_secret:
        logger.error("❌ Alpaca API credentials not found in environment variables")
        return

    stock_client = StockHistoricalDataClient(alpaca_key, alpaca_secret)

    # Fetch data for the last 2 years
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=730)  # 2 years

    logger.info(f"📊 Populating data from {start_time.date()} to {end_time.date()}")

    total_bars = 0

    for symbol in COMMON_SYMBOLS:
        try:
            logger.info(f"📈 Fetching data for {symbol}...")

            # Fetch daily bars
            request = StockBarsRequest(
                symbol_or_symbols=symbol,
                timeframe=TimeFrame.Day,
                start=start_time,
                end=end_time,
                feed=DataFeed.IEX
            )

            bars_data = stock_client.get_stock_bars(request)

            if not bars_data or symbol not in bars_data:
                logger.warning(f"⚠️ No data returned for {symbol}")
                continue

            bars = bars_data[symbol]

            # Prepare records for insertion
            records = []
            for bar in bars:
                records.append({
                    "symbol": symbol,
                    "timeframe": "1Day",
                    "timestamp": bar.timestamp.isoformat(),
                    "open": float(bar.open),
                    "high": float(bar.high),
                    "low": float(bar.low),
                    "close": float(bar.close),
                    "volume": int(bar.volume),
                    "trade_count": int(getattr(bar, "trade_count", 0) or 0),
                    "vwap": float(getattr(bar, "vwap", 0) or 0) if hasattr(bar, "vwap") and getattr(bar, "vwap") else None,
                    "data_source": "alpaca",
                    "data_quality": "verified"
                })

            if records:
                # Insert in batches
                batch_size = 500
                for i in range(0, len(records), batch_size):
                    batch = records[i:i + batch_size]
                    try:
                        supabase.table("historical_market_data").upsert(
                            batch,
                            on_conflict="symbol,timeframe,timestamp"
                        ).execute()
                    except Exception as batch_error:
                        logger.error(f"❌ Error inserting batch for {symbol}: {batch_error}")

                total_bars += len(records)
                logger.info(f"✅ Inserted {len(records)} bars for {symbol}")

        except Exception as e:
            logger.error(f"❌ Error processing {symbol}: {e}")
            continue

    logger.info(f"✅ Data population complete! Total bars inserted: {total_bars}")


if __name__ == "__main__":
    asyncio.run(populate_data())
