"""
Real-Time Grid Trading Monitor

Monitors live market data via WebSocket and triggers grid trades based on price levels.
Prevents infinite loops by tracking grid level states.
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timezone
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import LimitOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.common.exceptions import APIError as AlpacaAPIError
from supabase import Client

logger = logging.getLogger(__name__)

class GridRealtimeMonitor:
    """Monitors real-time price data and executes grid trades"""

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.active_strategies: Dict[str, Dict[str, Any]] = {}
        self.price_cache: Dict[str, float] = {}
        self.processing_lock: Dict[str, asyncio.Lock] = {}

    async def register_strategy(self, strategy_id: str, strategy_data: Dict[str, Any]):
        """Register a strategy for real-time monitoring"""
        self.active_strategies[strategy_id] = strategy_data
        self.processing_lock[strategy_id] = asyncio.Lock()

        symbol = strategy_data.get("configuration", {}).get("symbol", "")
        logger.info(f"📡 Registered strategy {strategy_id} for real-time monitoring: {symbol}")

        # Initialize grid level states if not exists
        await self.initialize_grid_states(strategy_id, strategy_data)

    async def unregister_strategy(self, strategy_id: str):
        """Unregister a strategy from monitoring"""
        if strategy_id in self.active_strategies:
            symbol = self.active_strategies[strategy_id].get("configuration", {}).get("symbol", "")
            del self.active_strategies[strategy_id]
            if strategy_id in self.processing_lock:
                del self.processing_lock[strategy_id]
            logger.info(f"📴 Unregistered strategy {strategy_id}: {symbol}")

    async def initialize_grid_states(self, strategy_id: str, strategy_data: Dict[str, Any]):
        """Initialize grid level states for a strategy"""
        try:
            configuration = strategy_data.get("configuration", {})
            price_range_lower = configuration.get("price_range_lower", 0)
            price_range_upper = configuration.get("price_range_upper", 0)
            number_of_grids = configuration.get("number_of_grids", 20)
            grid_mode = strategy_data.get("grid_mode", "arithmetic")

            # Calculate grid levels
            grid_levels = self.calculate_grid_levels(
                price_range_lower,
                price_range_upper,
                number_of_grids,
                grid_mode
            )

            # Check existing states
            existing_states = self.supabase.table("grid_level_states")\
                .select("grid_level")\
                .eq("strategy_id", strategy_id)\
                .execute()

            existing_levels = {state["grid_level"] for state in existing_states.data} if existing_states.data else set()

            # Initialize missing states
            new_states = []
            for idx, level in enumerate(grid_levels):
                if idx not in existing_levels:
                    new_states.append({
                        "strategy_id": strategy_id,
                        "grid_level": idx,
                        "has_position": False,
                        "position_quantity": 0,
                        "last_buy_price": None,
                        "last_sell_price": None
                    })

            if new_states:
                self.supabase.table("grid_level_states").insert(new_states).execute()
                logger.info(f"✅ Initialized {len(new_states)} grid level states for strategy {strategy_id}")
            else:
                logger.info(f"✅ Grid level states already exist for strategy {strategy_id}")

        except Exception as e:
            logger.error(f"❌ Error initializing grid states for {strategy_id}: {e}")

    async def on_price_update(self, symbol: str, price: float, timestamp: datetime):
        """Handle real-time price update"""
        self.price_cache[symbol] = price

        # Find all active strategies for this symbol
        strategies_to_check = [
            (sid, sdata) for sid, sdata in self.active_strategies.items()
            if sdata.get("configuration", {}).get("symbol", "").replace("/", "") == symbol.replace("/", "")
            and sdata.get("status") == "active"
        ]

        if not strategies_to_check:
            return

        # Process each strategy asynchronously
        tasks = []
        for strategy_id, strategy_data in strategies_to_check:
            tasks.append(self.check_and_execute_grid(strategy_id, strategy_data, price, timestamp))

        await asyncio.gather(*tasks, return_exceptions=True)

    async def check_and_execute_grid(
        self,
        strategy_id: str,
        strategy_data: Dict[str, Any],
        current_price: float,
        timestamp: datetime
    ):
        """Check if price crossed any grid levels and execute trades"""

        # Prevent concurrent execution for same strategy
        async with self.processing_lock.get(strategy_id, asyncio.Lock()):
            try:
                configuration = strategy_data.get("configuration", {})
                symbol = configuration.get("symbol", "")
                price_range_lower = configuration.get("price_range_lower", 0)
                price_range_upper = configuration.get("price_range_upper", 0)
                number_of_grids = configuration.get("number_of_grids", 20)
                grid_mode = strategy_data.get("grid_mode", "arithmetic")
                allocated_capital = configuration.get("allocated_capital", 1000)

                # Calculate grid levels
                grid_levels = self.calculate_grid_levels(
                    price_range_lower,
                    price_range_upper,
                    number_of_grids,
                    grid_mode
                )

                # Get grid level states
                states_resp = self.supabase.table("grid_level_states")\
                    .select("*")\
                    .eq("strategy_id", strategy_id)\
                    .execute()

                if not states_resp.data:
                    logger.warning(f"⚠️ No grid states found for strategy {strategy_id}")
                    return

                states_by_level = {state["grid_level"]: state for state in states_resp.data}

                # Check for buy triggers (price at or below buy levels)
                buy_triggered = []
                for idx, level in enumerate(grid_levels):
                    # Buy trigger: price dropped to or below this level
                    if current_price <= level * 1.001:  # 0.1% tolerance
                        state = states_by_level.get(idx, {})

                        # Only trigger if we don't already have a position at this level
                        if not state.get("has_position", False):
                            # Check if we have a pending buy order at this level
                            pending_buy = await self.has_pending_order(strategy_id, idx, "buy")
                            if not pending_buy:
                                buy_triggered.append((idx, level))

                # Check for sell triggers (price at or above sell levels with position)
                sell_triggered = []
                for idx, level in enumerate(grid_levels):
                    # Sell trigger: price rose to or above this level
                    if current_price >= level * 0.999:  # 0.1% tolerance
                        state = states_by_level.get(idx, {})

                        # Only trigger if we have a position at a lower level to sell
                        # Look for positions at levels below this one
                        for lower_idx in range(idx):
                            lower_state = states_by_level.get(lower_idx, {})
                            if lower_state.get("has_position", False) and lower_state.get("position_quantity", 0) > 0:
                                # Check if we have a pending sell order at this level
                                pending_sell = await self.has_pending_order(strategy_id, idx, "sell")
                                if not pending_sell:
                                    sell_triggered.append((idx, level, lower_idx))
                                    break  # One sell per level

                # Execute buy orders
                for grid_level, price_level in buy_triggered:
                    await self.execute_buy(
                        strategy_id,
                        strategy_data,
                        symbol,
                        grid_level,
                        price_level,
                        current_price,
                        allocated_capital,
                        len(grid_levels),
                        timestamp
                    )

                # Execute sell orders
                for grid_level, price_level, position_level in sell_triggered:
                    await self.execute_sell(
                        strategy_id,
                        strategy_data,
                        symbol,
                        grid_level,
                        price_level,
                        position_level,
                        current_price,
                        states_by_level[position_level],
                        timestamp
                    )

            except Exception as e:
                logger.error(f"❌ Error checking grid for strategy {strategy_id}: {e}", exc_info=True)

    async def has_pending_order(self, strategy_id: str, grid_level: int, side: str) -> bool:
        """Check if there's a pending order at this grid level"""
        try:
            resp = self.supabase.table("grid_orders")\
                .select("id")\
                .eq("strategy_id", strategy_id)\
                .eq("grid_level", grid_level)\
                .eq("side", side)\
                .in_("status", ["pending", "partially_filled"])\
                .execute()

            return bool(resp.data)
        except Exception as e:
            logger.error(f"❌ Error checking pending orders: {e}")
            return False

    async def execute_buy(
        self,
        strategy_id: str,
        strategy_data: Dict[str, Any],
        symbol: str,
        grid_level: int,
        price_level: float,
        current_price: float,
        allocated_capital: float,
        num_grids: int,
        timestamp: datetime
    ):
        """Execute a buy order at a grid level"""
        try:
            # Get trading client
            from dependencies import get_alpaca_trading_client
            user_id = strategy_data.get("user_id")
            account_id = strategy_data.get("account_id")

            trading_client = get_alpaca_trading_client(self.supabase, user_id, account_id)
            if not trading_client:
                logger.error(f"❌ Could not get trading client for strategy {strategy_id}")
                return

            # Calculate quantity
            quantity_per_grid = allocated_capital / num_grids / price_level
            buy_qty = max(0.001, quantity_per_grid)

            # Determine if crypto (supports fractional)
            is_crypto = "/" in symbol or "USD" in symbol and len(symbol) > 3
            is_fractional = buy_qty < 1.0
            time_in_force = TimeInForce.GTC if is_crypto or not is_fractional else TimeInForce.DAY

            # Place limit buy order
            order_request = LimitOrderRequest(
                symbol=symbol.replace("/", ""),
                qty=buy_qty,
                side=OrderSide.BUY,
                time_in_force=time_in_force,
                limit_price=round(price_level, 2)
            )

            order = trading_client.submit_order(order_request)
            order_id = str(order.id)

            logger.info(f"✅ [REALTIME BUY] {symbol} at level {grid_level} @ ${price_level:.2f}, Qty: {buy_qty:.6f}, Order: {order_id}")

            # Record in database
            grid_order_data = {
                "user_id": user_id,
                "strategy_id": strategy_id,
                "alpaca_order_id": order_id,
                "symbol": symbol,
                "side": "buy",
                "order_type": "limit",
                "quantity": float(buy_qty),
                "limit_price": float(price_level),
                "grid_level": grid_level,
                "grid_price": float(price_level),
                "status": "pending",
                "time_in_force": time_in_force.value if hasattr(time_in_force, 'value') else str(time_in_force),
                "last_triggered_at": timestamp.isoformat(),
                "trigger_price": float(current_price)
            }

            self.supabase.table("grid_orders").insert(grid_order_data).execute()

        except AlpacaAPIError as e:
            logger.error(f"❌ [REALTIME BUY] Failed to place buy order: {e}")
        except Exception as e:
            logger.error(f"❌ [REALTIME BUY] Unexpected error: {e}", exc_info=True)

    async def execute_sell(
        self,
        strategy_id: str,
        strategy_data: Dict[str, Any],
        symbol: str,
        grid_level: int,
        price_level: float,
        position_level: int,
        current_price: float,
        position_state: Dict[str, Any],
        timestamp: datetime
    ):
        """Execute a sell order at a grid level"""
        try:
            # Get trading client
            from dependencies import get_alpaca_trading_client
            user_id = strategy_data.get("user_id")
            account_id = strategy_data.get("account_id")

            trading_client = get_alpaca_trading_client(self.supabase, user_id, account_id)
            if not trading_client:
                logger.error(f"❌ Could not get trading client for strategy {strategy_id}")
                return

            # Get sell quantity from position state
            sell_qty = position_state.get("position_quantity", 0)
            if sell_qty <= 0:
                logger.warning(f"⚠️ [REALTIME SELL] No position quantity available at level {position_level}")
                return

            # Determine if crypto
            is_crypto = "/" in symbol or "USD" in symbol and len(symbol) > 3
            is_fractional = sell_qty < 1.0
            time_in_force = TimeInForce.GTC if is_crypto or not is_fractional else TimeInForce.DAY

            # Place limit sell order
            order_request = LimitOrderRequest(
                symbol=symbol.replace("/", ""),
                qty=sell_qty,
                side=OrderSide.SELL,
                time_in_force=time_in_force,
                limit_price=round(price_level, 2)
            )

            order = trading_client.submit_order(order_request)
            order_id = str(order.id)

            logger.info(f"✅ [REALTIME SELL] {symbol} at level {grid_level} @ ${price_level:.2f}, Qty: {sell_qty:.6f}, Order: {order_id}")

            # Record in database
            grid_order_data = {
                "user_id": user_id,
                "strategy_id": strategy_id,
                "alpaca_order_id": order_id,
                "symbol": symbol,
                "side": "sell",
                "order_type": "limit",
                "quantity": float(sell_qty),
                "limit_price": float(price_level),
                "grid_level": grid_level,
                "grid_price": float(price_level),
                "status": "pending",
                "time_in_force": time_in_force.value if hasattr(time_in_force, 'value') else str(time_in_force),
                "last_triggered_at": timestamp.isoformat(),
                "trigger_price": float(current_price)
            }

            self.supabase.table("grid_orders").insert(grid_order_data).execute()

        except AlpacaAPIError as e:
            logger.error(f"❌ [REALTIME SELL] Failed to place sell order: {e}")
        except Exception as e:
            logger.error(f"❌ [REALTIME SELL] Unexpected error: {e}", exc_info=True)

    def calculate_grid_levels(
        self,
        lower_price: float,
        upper_price: float,
        num_grids: int,
        mode: str = "arithmetic"
    ) -> List[float]:
        """Calculate grid price levels"""
        levels = []

        if mode == "geometric":
            ratio = (upper_price / lower_price) ** (1 / (num_grids - 1))
            for i in range(num_grids):
                level = lower_price * (ratio ** i)
                levels.append(level)
        else:
            step = (upper_price - lower_price) / (num_grids - 1)
            for i in range(num_grids):
                level = lower_price + (step * i)
                levels.append(level)

        return levels


# Global instance
_monitor_instance: Optional[GridRealtimeMonitor] = None

def get_grid_monitor(supabase: Client) -> GridRealtimeMonitor:
    """Get or create the global grid monitor instance"""
    global _monitor_instance
    if _monitor_instance is None:
        _monitor_instance = GridRealtimeMonitor(supabase)
    return _monitor_instance
