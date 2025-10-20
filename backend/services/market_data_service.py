"""
Market Data Service

Manages automated population, validation, and maintenance of historical market data.
Ensures data is always available for backtesting and analysis.
"""

import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Set
from supabase import Client
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.data.enums import DataFeed

logger = logging.getLogger(__name__)


class MarketDataService:
    """
    Service for managing historical market data persistence.

    Features:
    - Automated daily data population
    - Data validation and gap detection
    - Smart caching and incremental updates
    - Multi-symbol batch processing
    """

    # Core symbols to always maintain
    CORE_SYMBOLS = [
        "SPY", "QQQ", "IWM", "VTI", "VOO",  # Major ETFs
        "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA",  # Tech giants
        "JPM", "BAC", "WFC", "GS", "MS",  # Financials
        "XLE", "XLF", "XLK", "XLV", "XLI"  # Sector ETFs
    ]

    # Extended symbols for comprehensive coverage
    EXTENDED_SYMBOLS = [
        "AMD", "INTC", "CSCO", "ORCL", "IBM",
        "NFLX", "DIS", "PYPL", "SQ", "ROKU",
        "V", "MA", "AXP", "COF",
        "JNJ", "UNH", "PFE", "ABBV", "TMO",
        "XOM", "CVX", "COP", "SLB",
        "HD", "LOW", "TGT", "WMT", "COST",
        "GLD", "SLV", "TLT", "AGG"
    ]

    def __init__(self, supabase: Client, stock_client: Optional[StockHistoricalDataClient] = None):
        self.supabase = supabase
        self.stock_client = stock_client
        self.logger = logging.getLogger(__name__)

    async def initialize_data(self) -> Dict[str, Any]:
        """
        Initialize historical data on first startup.
        Checks if data exists and populates if needed.
        """
        self.logger.info("🔍 Checking historical market data availability...")

        try:
            # Check if we have any data
            result = self.supabase.table('historical_market_data').select('symbol', count='exact').limit(1).execute()

            data_exists = result.count and result.count > 0

            if data_exists:
                self.logger.info(f"✅ Historical data found ({result.count} records)")
                # Check data freshness and coverage
                coverage = await self.check_data_coverage()
                return {
                    "initialized": True,
                    "data_exists": True,
                    "coverage": coverage
                }
            else:
                self.logger.warning("⚠️ No historical data found - starting initial population")
                # Populate initial data (last 2 years for core symbols)
                result = await self.populate_initial_data()
                return {
                    "initialized": True,
                    "data_exists": False,
                    "initial_population": result
                }

        except Exception as e:
            self.logger.error(f"❌ Error initializing market data: {e}")
            return {
                "initialized": False,
                "error": str(e)
            }

    async def populate_initial_data(self) -> Dict[str, Any]:
        """
        Populate initial historical data for core symbols.
        Fetches 2 years of daily data.
        """
        self.logger.info("📊 Starting initial data population (2 years)...")

        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(days=730)  # 2 years

        return await self.populate_symbols(
            symbols=self.CORE_SYMBOLS,
            start_time=start_time,
            end_time=end_time,
            timeframe="1Day"
        )

    async def populate_daily_update(self) -> Dict[str, Any]:
        """
        Daily update job - fetches latest data for all tracked symbols.
        Only fetches new data since last update (incremental).
        """
        self.logger.info("📅 Running daily market data update...")

        try:
            # Get list of all symbols we're tracking
            tracked_symbols = await self.get_tracked_symbols()

            if not tracked_symbols:
                self.logger.warning("⚠️ No symbols tracked yet, using core symbols")
                tracked_symbols = self.CORE_SYMBOLS

            # For each symbol, find last data point and fetch from there
            results = {
                "symbols_updated": [],
                "symbols_failed": [],
                "total_bars_added": 0
            }

            for symbol in tracked_symbols:
                try:
                    # Get last data point for this symbol
                    last_data = self.supabase.table('historical_market_data') \
                        .select('timestamp') \
                        .eq('symbol', symbol) \
                        .eq('timeframe', '1Day') \
                        .order('timestamp', desc=True) \
                        .limit(1) \
                        .execute()

                    if last_data.data and len(last_data.data) > 0:
                        last_timestamp = datetime.fromisoformat(last_data.data[0]['timestamp'].replace('Z', '+00:00'))
                        start_time = last_timestamp + timedelta(days=1)
                    else:
                        # No data exists, fetch last 30 days
                        start_time = datetime.now(timezone.utc) - timedelta(days=30)

                    end_time = datetime.now(timezone.utc)

                    # Skip if already up to date
                    if start_time >= end_time:
                        self.logger.info(f"✓ {symbol} already up to date")
                        continue

                    # Fetch and store new data
                    bars_added = await self.fetch_and_store_symbol_data(
                        symbol=symbol,
                        start_time=start_time,
                        end_time=end_time,
                        timeframe="1Day"
                    )

                    if bars_added > 0:
                        results["symbols_updated"].append(symbol)
                        results["total_bars_added"] += bars_added
                        self.logger.info(f"✅ {symbol}: Added {bars_added} new bars")

                except Exception as symbol_error:
                    self.logger.error(f"❌ Error updating {symbol}: {symbol_error}")
                    results["symbols_failed"].append(symbol)

            self.logger.info(
                f"✅ Daily update complete: "
                f"{len(results['symbols_updated'])} updated, "
                f"{results['total_bars_added']} bars added"
            )

            return results

        except Exception as e:
            self.logger.error(f"❌ Error in daily update: {e}")
            return {
                "error": str(e),
                "symbols_updated": [],
                "symbols_failed": [],
                "total_bars_added": 0
            }

    async def populate_symbols(
        self,
        symbols: List[str],
        start_time: datetime,
        end_time: datetime,
        timeframe: str = "1Day"
    ) -> Dict[str, Any]:
        """
        Populate historical data for a list of symbols.
        """
        results = {
            "symbols_processed": [],
            "symbols_failed": [],
            "total_bars_inserted": 0
        }

        for symbol in symbols:
            try:
                bars_added = await self.fetch_and_store_symbol_data(
                    symbol=symbol,
                    start_time=start_time,
                    end_time=end_time,
                    timeframe=timeframe
                )

                if bars_added > 0:
                    results["symbols_processed"].append(symbol)
                    results["total_bars_inserted"] += bars_added
                    self.logger.info(f"✅ {symbol}: Inserted {bars_added} bars")
                else:
                    results["symbols_failed"].append(symbol)

            except Exception as symbol_error:
                self.logger.error(f"❌ Error processing {symbol}: {symbol_error}")
                results["symbols_failed"].append(symbol)

        return results

    async def fetch_and_store_symbol_data(
        self,
        symbol: str,
        start_time: datetime,
        end_time: datetime,
        timeframe: str = "1Day"
    ) -> int:
        """
        Fetch data for a single symbol and store in database.
        Returns number of bars inserted.
        """
        if not self.stock_client:
            self.logger.warning("No stock client available for fetching data")
            return 0

        try:
            # Map timeframe string to Alpaca TimeFrame
            tf_map = {
                "1Min": TimeFrame.Minute,
                "5Min": TimeFrame(5, "Min"),
                "15Min": TimeFrame(15, "Min"),
                "1Hour": TimeFrame.Hour,
                "1Day": TimeFrame.Day,
            }
            tf = tf_map.get(timeframe, TimeFrame.Day)

            # Fetch bars from Alpaca
            request = StockBarsRequest(
                symbol_or_symbols=symbol.upper(),
                timeframe=tf,
                start=start_time,
                end=end_time,
                feed=DataFeed.IEX
            )

            bars_data = self.stock_client.get_stock_bars(request)

            if not bars_data or symbol.upper() not in bars_data:
                self.logger.warning(f"⚠️ No data returned for {symbol}")
                return 0

            bars = bars_data[symbol.upper()]

            # Prepare records for insertion
            records = []
            for bar in bars:
                records.append({
                    "symbol": symbol.upper(),
                    "timeframe": timeframe,
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

            if not records:
                return 0

            # Insert in batches to avoid timeouts
            batch_size = 1000
            total_inserted = 0

            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                try:
                    self.supabase.table("historical_market_data").upsert(
                        batch,
                        on_conflict="symbol,timeframe,timestamp"
                    ).execute()
                    total_inserted += len(batch)
                except Exception as batch_error:
                    self.logger.error(f"Error inserting batch for {symbol}: {batch_error}")

            return total_inserted

        except Exception as e:
            self.logger.error(f"❌ Error fetching/storing data for {symbol}: {e}")
            return 0

    async def check_data_coverage(self) -> Dict[str, Any]:
        """
        Check data coverage and quality for all symbols.
        """
        try:
            # Use the market_data_completeness view
            result = self.supabase.rpc('market_data_completeness').execute()

            if not result.data:
                # Fallback: query directly
                result = self.supabase.table('historical_market_data') \
                    .select('symbol, timeframe, timestamp', count='exact') \
                    .execute()

                symbols = set(row['symbol'] for row in result.data) if result.data else set()

                return {
                    "total_symbols": len(symbols),
                    "total_records": result.count or 0,
                    "symbols": list(symbols)
                }

            # Process completeness data
            coverage = {
                "total_symbols": len(result.data),
                "symbols_detail": result.data
            }

            return coverage

        except Exception as e:
            self.logger.error(f"❌ Error checking data coverage: {e}")
            return {
                "error": str(e),
                "total_symbols": 0
            }

    async def get_tracked_symbols(self) -> List[str]:
        """
        Get list of all symbols we're currently tracking.
        """
        try:
            result = self.supabase.table('historical_market_data') \
                .select('symbol') \
                .eq('timeframe', '1Day') \
                .execute()

            if result.data:
                symbols = list(set(row['symbol'] for row in result.data))
                return symbols

            return []

        except Exception as e:
            self.logger.error(f"Error getting tracked symbols: {e}")
            return []

    async def validate_and_fix_gaps(self) -> Dict[str, Any]:
        """
        Detect and fill gaps in historical data.
        """
        self.logger.info("🔍 Validating data and detecting gaps...")

        try:
            tracked_symbols = await self.get_tracked_symbols()
            gaps_filled = 0
            symbols_with_gaps = []

            for symbol in tracked_symbols:
                # Get all timestamps for this symbol
                result = self.supabase.table('historical_market_data') \
                    .select('timestamp') \
                    .eq('symbol', symbol) \
                    .eq('timeframe', '1Day') \
                    .order('timestamp') \
                    .execute()

                if not result.data or len(result.data) < 2:
                    continue

                # Check for gaps (more than 5 days between records)
                timestamps = [datetime.fromisoformat(row['timestamp'].replace('Z', '+00:00'))
                             for row in result.data]

                for i in range(1, len(timestamps)):
                    gap_days = (timestamps[i] - timestamps[i-1]).days
                    if gap_days > 5:  # Significant gap (accounting for weekends)
                        self.logger.warning(
                            f"⚠️ Gap detected in {symbol}: "
                            f"{timestamps[i-1].date()} to {timestamps[i].date()} ({gap_days} days)"
                        )

                        # Fill the gap
                        bars_added = await self.fetch_and_store_symbol_data(
                            symbol=symbol,
                            start_time=timestamps[i-1],
                            end_time=timestamps[i],
                            timeframe="1Day"
                        )

                        if bars_added > 0:
                            gaps_filled += bars_added
                            if symbol not in symbols_with_gaps:
                                symbols_with_gaps.append(symbol)

            self.logger.info(f"✅ Gap validation complete: Filled {gaps_filled} gaps in {len(symbols_with_gaps)} symbols")

            return {
                "gaps_filled": gaps_filled,
                "symbols_affected": symbols_with_gaps
            }

        except Exception as e:
            self.logger.error(f"❌ Error validating gaps: {e}")
            return {
                "error": str(e),
                "gaps_filled": 0,
                "symbols_affected": []
            }

    async def add_symbol(self, symbol: str, days_back: int = 365) -> Dict[str, Any]:
        """
        Add a new symbol to tracking with historical data.
        """
        self.logger.info(f"➕ Adding new symbol: {symbol}")

        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(days=days_back)

        bars_added = await self.fetch_and_store_symbol_data(
            symbol=symbol,
            start_time=start_time,
            end_time=end_time,
            timeframe="1Day"
        )

        return {
            "symbol": symbol,
            "bars_added": bars_added,
            "success": bars_added > 0
        }


# Global market data service instance (will be initialized with proper clients)
market_data_service: Optional[MarketDataService] = None


def initialize_market_data_service(supabase: Client, stock_client: Optional[StockHistoricalDataClient] = None):
    """Initialize the global market data service instance"""
    global market_data_service
    market_data_service = MarketDataService(supabase, stock_client)
    return market_data_service
