"""
Grid Price Monitor Service

Continuously monitors market prices for active grid strategies and automatically
places orders at appropriate grid levels based on current price position.
"""

import asyncio
import logging
import os
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from supabase import Client
from alpaca.trading.client import TradingClient
from alpaca.data.historical import StockHistoricalDataClient, CryptoHistoricalDataClient
from alpaca.trading.requests import LimitOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.common.exceptions import APIError as AlpacaAPIError

logger = logging.getLogger(__name__)


class GridPriceMonitor:
    """Monitors prices and manages grid order placement"""

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.is_running = False
        self.check_interval = int(os.getenv('GRID_MONITOR_INTERVAL', '180'))
        self.idle_sleep_duration = int(os.getenv('IDLE_SLEEP_DURATION', '300'))
        self.error_count = 0
        self.error_threshold_pause = int(os.getenv('ERROR_THRESHOLD_PAUSE', '5'))
        self.error_pause_duration = int(os.getenv('ERROR_PAUSE_DURATION', '300'))
        self.price_cache: Dict[str, Dict[str, Any]] = {}
        self.active_strategies: Dict[str, Dict[str, Any]] = {}
        self.processing_locks: Dict[str, asyncio.Lock] = {}

    async def start(self):
        """Start the grid price monitoring loop"""
        logger.info("🔍 Starting Grid Price Monitor...")
        logger.info(f"📊 Will poll prices every {self.check_interval} seconds")
        self.is_running = True

        while self.is_running:
            try:
                await self.monitor_cycle()
                self.error_count = 0  # Reset on success
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                self.error_count += 1
                logger.error(f"❌ Error in grid price monitor loop (error #{self.error_count}): {e}", exc_info=True)

                if self.error_count >= self.error_threshold_pause:
                    logger.error(f"🛑 Grid monitor pausing for {self.error_pause_duration}s due to errors")
                    await asyncio.sleep(self.error_pause_duration)
                    self.error_count = 0
                else:
                    await asyncio.sleep(self.check_interval)

    async def stop(self):
        """Stop the grid price monitoring loop"""
        logger.info("🛑 Stopping Grid Price Monitor...")
        self.is_running = False

    async def monitor_cycle(self):
        """Execute one monitoring cycle"""
        try:
            # Load active grid strategies
            await self.load_active_grid_strategies()

            if not self.active_strategies:
                logger.debug("📭 No active grid strategies to monitor")
                return

            logger.info(f"📊 Monitoring {len(self.active_strategies)} active grid strategies")

            # Group strategies by symbol for efficient price fetching
            strategies_by_symbol = self.group_strategies_by_symbol()

            # Fetch prices for all symbols
            await self.fetch_prices(strategies_by_symbol.keys())

            # Forward price updates to real-time manager for WebSocket-driven strategies
            try:
                from services.realtime_strategy_manager import get_realtime_manager
                realtime_manager = get_realtime_manager(self.supabase)

                for symbol, price_data in self.price_cache.items():
                    if price_data.get("price"):
                        await realtime_manager.on_market_data_update(
                            symbol,
                            float(price_data["price"]),
                            price_data.get("timestamp")
                        )
            except Exception as e:
                logger.debug(f"⚠️ Could not forward prices to realtime manager: {e}")

            # Process each strategy
            for strategy_id, strategy_data in self.active_strategies.items():
                try:
                    await self.process_strategy(strategy_id, strategy_data)
                except Exception as e:
                    logger.error(f"❌ Error processing strategy {strategy_id}: {e}", exc_info=True)

        except Exception as e:
            logger.error(f"❌ Error in monitor cycle: {e}", exc_info=True)

    async def load_active_grid_strategies(self):
        """Load all active grid strategies from database"""
        try:
            # Query for active grid-type strategies
            resp = self.supabase.table("trading_strategies").select("*").eq(
                "is_active", True
            ).in_(
                "type", ["spot_grid", "futures_grid", "infinity_grid", "reverse_grid"]
            ).execute()

            # Update active strategies dictionary
            self.active_strategies = {
                strategy["id"]: strategy for strategy in (resp.data or [])
            }

            logger.debug(f"📋 Loaded {len(self.active_strategies)} active grid strategies")

        except Exception as e:
            logger.error(f"❌ Error loading active strategies: {e}", exc_info=True)
            self.active_strategies = {}

    def group_strategies_by_symbol(self) -> Dict[str, List[Dict[str, Any]]]:
        """Group strategies by their trading symbol"""
        grouped: Dict[str, List[Dict[str, Any]]] = {}

        for strategy_id, strategy_data in self.active_strategies.items():
            config = strategy_data.get("configuration", {})
            symbol = config.get("symbol", "").upper().replace("/", "")

            if symbol:
                if symbol not in grouped:
                    grouped[symbol] = []
                grouped[symbol].append(strategy_data)

        return grouped

    async def fetch_prices(self, symbols: Set[str]):
        """Fetch current prices for all symbols"""
        try:
            if not symbols:
                return

            # Use market data service to get prices
            from dependencies import get_alpaca_stock_data_client, get_alpaca_crypto_data_client

            for symbol in symbols:
                try:
                    # Determine if crypto or stock
                    is_crypto = symbol.endswith("USD") and not symbol.startswith("$")

                    # Simple mock user for data client (doesn't require auth for market data)
                    class MockUser:
                        def __init__(self):
                            self.id = "system"

                    user = MockUser()

                    if is_crypto:
                        client = await get_alpaca_crypto_data_client(user, self.supabase)
                    else:
                        client = await get_alpaca_stock_data_client(user, self.supabase)

                    # Get latest quote
                    from alpaca.data.requests import StockLatestQuoteRequest, CryptoLatestQuoteRequest

                    if is_crypto:
                        request = CryptoLatestQuoteRequest(symbol_or_symbols=symbol)
                        quote_data = client.get_crypto_latest_quote(request)
                        quote = quote_data.get(symbol)
                    else:
                        request = StockLatestQuoteRequest(symbol_or_symbols=symbol)
                        quote_data = client.get_stock_latest_quote(request)
                        quote = quote_data.get(symbol)

                    if quote:
                        mid_price = (float(quote.ask_price) + float(quote.bid_price)) / 2
                        self.price_cache[symbol] = {
                            "price": mid_price,
                            "bid": float(quote.bid_price),
                            "ask": float(quote.ask_price),
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                        logger.debug(f"💰 {symbol}: ${mid_price:.2f}")

                except Exception as e:
                    logger.warning(f"⚠️ Could not fetch price for {symbol}: {e}")

        except Exception as e:
            logger.error(f"❌ Error fetching prices: {e}", exc_info=True)

    async def process_strategy(self, strategy_id: str, strategy_data: Dict[str, Any]):
        """Process a single strategy and manage its grid orders"""
        try:
            # Get or create lock for this strategy
            if strategy_id not in self.processing_locks:
                self.processing_locks[strategy_id] = asyncio.Lock()

            # Acquire lock to prevent concurrent processing
            async with self.processing_locks[strategy_id]:
                # Check if initial buy has been filled
                telemetry_data = strategy_data.get("telemetry_data", {})
                if not isinstance(telemetry_data, dict):
                    telemetry_data = {}

                initial_buy_filled = telemetry_data.get("initial_buy_filled", False)
                initial_buy_order_submitted = telemetry_data.get("initial_buy_order_submitted", False)

                # Only place grid orders if initial buy has been filled
                if not initial_buy_filled:
                    if initial_buy_order_submitted:
                        logger.debug(f"⏳ Strategy {strategy_id}: Waiting for initial buy order to fill before placing limit orders")
                    else:
                        logger.debug(f"⏳ Strategy {strategy_id}: Initial buy not yet submitted")
                    return

                config = strategy_data.get("configuration", {})
                symbol = config.get("symbol", "").upper().replace("/", "")
                user_id = strategy_data.get("user_id")

                if not symbol or symbol not in self.price_cache:
                    logger.debug(f"⚠️ No price data for {symbol}")
                    return

                current_price = self.price_cache[symbol]["price"]

                # Get grid configuration
                lower_price = config.get("price_range_lower", 0)
                upper_price = config.get("price_range_upper", 0)
                num_grids = config.get("number_of_grids", 10)
                allocated_capital = config.get("allocated_capital", 1000)
                grid_mode = strategy_data.get("grid_mode", "arithmetic")

                if lower_price == 0 or upper_price == 0:
                    logger.warning(f"⚠️ Invalid price range for strategy {strategy_id}")
                    return

                # Calculate grid levels
                grid_levels = self.calculate_grid_levels(
                    lower_price, upper_price, num_grids, grid_mode
                )

                # Check if price is within range
                if current_price < lower_price or current_price > upper_price:
                    logger.info(
                        f"📊 [{strategy_data.get('name', 'Unknown')}] Price ${current_price:.2f} "
                        f"outside grid range (${lower_price:.2f} - ${upper_price:.2f})"
                    )
                    return

                # Get existing orders
                existing_orders = await self.get_existing_grid_orders(strategy_id)

                # Check which grid levels need orders
                await self.ensure_grid_coverage(
                    strategy_id,
                    user_id,
                    symbol,
                    grid_levels,
                    current_price,
                    allocated_capital,
                    existing_orders,
                    strategy_data
                )

        except Exception as e:
            logger.error(f"❌ Error processing strategy {strategy_id}: {e}", exc_info=True)

    def calculate_grid_levels(
        self,
        lower_price: float,
        upper_price: float,
        num_grids: int,
        grid_mode: str = "arithmetic"
    ) -> List[float]:
        """Calculate grid price levels"""
        levels = []

        if grid_mode == "geometric":
            # Geometric progression
            ratio = (upper_price / lower_price) ** (1 / (num_grids - 1))
            for i in range(num_grids):
                levels.append(lower_price * (ratio ** i))
        else:
            # Arithmetic progression (default)
            step = (upper_price - lower_price) / (num_grids - 1)
            for i in range(num_grids):
                levels.append(lower_price + step * i)

        return levels

    async def get_existing_grid_orders(self, strategy_id: str) -> Dict[int, Dict[str, Any]]:
        """Get existing grid orders for a strategy"""
        try:
            resp = self.supabase.table("grid_orders").select("*").eq(
                "strategy_id", strategy_id
            ).in_(
                "status", ["pending", "partially_filled"]
            ).eq(
                "is_stale", False
            ).execute()

            # Create a map of grid_level -> order
            orders_map = {}
            for order in (resp.data or []):
                grid_level = order.get("grid_level")
                if grid_level is not None:
                    orders_map[grid_level] = order

            return orders_map

        except Exception as e:
            logger.error(f"❌ Error getting existing orders: {e}")
            return {}

    async def ensure_grid_coverage(
        self,
        strategy_id: str,
        user_id: str,
        symbol: str,
        grid_levels: List[float],
        current_price: float,
        allocated_capital: float,
        existing_orders: Dict[int, Dict[str, Any]],
        strategy_data: Dict[str, Any]
    ):
        """Ensure all grid levels have appropriate orders"""
        try:
            # Get trading client for this user
            from dependencies import get_alpaca_trading_client

            class MockUser:
                def __init__(self, user_id: str):
                    self.id = user_id

            user = MockUser(user_id)

            try:
                trading_client = await get_alpaca_trading_client(user, self.supabase)
            except Exception as e:
                logger.warning(f"⚠️ Could not get trading client for user {user_id}: {e}")
                return

            # Calculate quantity per grid
            quantity_per_grid = allocated_capital / len(grid_levels) / current_price

            orders_placed = 0
            max_orders_per_cycle = 5  # Limit orders placed per cycle to avoid API throttling

            # Check each grid level
            for level_index, level_price in enumerate(grid_levels):
                # Skip if we've placed enough orders this cycle
                if orders_placed >= max_orders_per_cycle:
                    logger.info(f"⏸️ Reached max orders per cycle ({max_orders_per_cycle}), will continue next cycle")
                    break

                # Skip if order already exists at this level
                if level_index in existing_orders:
                    continue

                # Determine order side based on price position
                if level_price < current_price:
                    # Below current price - place buy order
                    side = "buy"
                    order_side = OrderSide.BUY
                elif level_price > current_price:
                    # Above current price - place sell order
                    side = "sell"
                    order_side = OrderSide.SELL
                else:
                    # At current price - skip
                    continue

                # For sell orders, check if we have sufficient position
                if side == "sell":
                    try:
                        positions = trading_client.get_all_positions()
                        position = next((p for p in positions if p.symbol == symbol), None)
                        available_qty = float(position.qty) if position else 0

                        if available_qty < quantity_per_grid:
                            logger.debug(
                                f"⚠️ Insufficient position for sell order at level {level_index} "
                                f"(need {quantity_per_grid:.6f}, have {available_qty:.6f})"
                            )
                            continue
                    except Exception as e:
                        logger.warning(f"⚠️ Could not check position for sell order: {e}")
                        continue

                # Place the order
                try:
                    # Determine time in force
                    is_fractional = quantity_per_grid < 1.0
                    is_crypto = symbol.endswith("USD") and not symbol.startswith("$")
                    # Use IOC for crypto (immediate execution), DAY for fractional stocks, GTC otherwise
                    if is_crypto:
                        time_in_force = TimeInForce.IOC
                    elif is_fractional and not is_crypto:
                        time_in_force = TimeInForce.DAY
                    else:
                        time_in_force = TimeInForce.GTC

                    # Create order request
                    order_request = LimitOrderRequest(
                        symbol=symbol,
                        qty=round(quantity_per_grid, 6),
                        side=order_side,
                        time_in_force=time_in_force,
                        limit_price=round(level_price, 2)
                    )

                    # Submit order
                    order = trading_client.submit_order(order_request)
                    order_id = str(order.id)

                    # Record in database
                    grid_order = {
                        "strategy_id": strategy_id,
                        "user_id": user_id,
                        "alpaca_order_id": order_id,
                        "symbol": symbol,
                        "side": side,
                        "quantity": round(quantity_per_grid, 6),
                        "limit_price": round(level_price, 2),
                        "grid_price": round(level_price, 2),
                        "grid_level": level_index,
                        "status": "pending",
                        "time_in_force": "day" if time_in_force == TimeInForce.DAY else "gtc",
                        "is_fractional": is_fractional,
                        "is_stale": False,
                        "check_count": 0
                    }

                    self.supabase.table("grid_orders").insert(grid_order).execute()

                    logger.info(
                        f"✅ [{strategy_data.get('name', 'Unknown')}] Placed {side.upper()} order "
                        f"at level {level_index} @ ${level_price:.2f} (Order: {order_id[:8]}...)"
                    )

                    orders_placed += 1

                    # Broadcast to frontend via SSE
                    try:
                        from sse_manager import publish
                        await publish(user_id, {
                            "type": "grid_order_placed",
                            "strategy_id": strategy_id,
                            "strategy_name": strategy_data.get("name", "Unknown"),
                            "side": side,
                            "grid_level": level_index,
                            "price": level_price,
                            "quantity": round(quantity_per_grid, 6),
                            "order_id": order_id,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                    except Exception as broadcast_error:
                        logger.debug(f"Could not broadcast SSE: {broadcast_error}")

                except AlpacaAPIError as e:
                    logger.error(
                        f"❌ Failed to place {side} order at level {level_index} @ ${level_price:.2f}: {e}"
                    )
                except Exception as e:
                    logger.error(f"❌ Unexpected error placing order: {e}", exc_info=True)

            if orders_placed > 0:
                logger.info(f"✅ Placed {orders_placed} new grid orders for strategy {strategy_id}")

        except Exception as e:
            logger.error(f"❌ Error ensuring grid coverage: {e}", exc_info=True)


# Global instance
grid_price_monitor = GridPriceMonitor
