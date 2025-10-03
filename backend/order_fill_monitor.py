"""
Order Fill Monitor Service

This service continuously monitors grid orders for fills and triggers
strategy execution when orders are filled. This enables event-based
grid trading instead of time-based periodic checks.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from alpaca.trading.client import TradingClient
from alpaca.trading.enums import OrderStatus
from alpaca.common.exceptions import APIError as AlpacaAPIError
from supabase import Client

logger = logging.getLogger(__name__)

class OrderFillMonitor:
    """Monitors grid orders and triggers execution on fills"""

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.is_running = False
        self.check_interval = 15  # Check every 15 seconds

    async def start(self):
        """Start the order fill monitoring loop"""
        logger.info("🔍 Starting order fill monitor...")
        self.is_running = True

        while self.is_running:
            try:
                await self.check_order_fills()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"❌ Error in order fill monitor loop: {e}", exc_info=True)
                await asyncio.sleep(self.check_interval)

    async def stop(self):
        """Stop the order fill monitoring loop"""
        logger.info("🛑 Stopping order fill monitor...")
        self.is_running = False

    async def check_order_fills(self):
        """Check all pending grid orders for fills"""
        try:
            # Get all pending grid orders
            resp = self.supabase.table("grid_orders").select(
                "*, trading_strategies(user_id, name, type, configuration)"
            ).in_("status", ["pending", "partially_filled"]).execute()

            if not resp.data:
                return

            logger.info(f"🔍 Checking {len(resp.data)} pending grid orders for fills")

            # Group orders by user for efficient API usage
            orders_by_user: Dict[str, List[Dict[str, Any]]] = {}
            for order in resp.data:
                user_id = order["trading_strategies"]["user_id"]
                if user_id not in orders_by_user:
                    orders_by_user[user_id] = []
                orders_by_user[user_id].append(order)

            # Check orders for each user
            for user_id, user_orders in orders_by_user.items():
                await self.check_user_orders(user_id, user_orders)

        except Exception as e:
            logger.error(f"❌ Error checking order fills: {e}", exc_info=True)

    async def check_user_orders(self, user_id: str, orders: List[Dict[str, Any]]):
        """Check orders for a specific user"""
        try:
            # Get user's trading client
            from dependencies import get_alpaca_trading_client, get_supabase_client

            class MockUser:
                def __init__(self, user_id: str):
                    self.id = user_id

            user = MockUser(user_id)
            trading_client = await get_alpaca_trading_client(user, self.supabase)

            if not trading_client:
                logger.warning(f"⚠️ Could not get trading client for user {user_id}")
                return

            # Fetch all orders from Alpaca for this user
            try:
                alpaca_orders = trading_client.get_orders(status="all", limit=100)
            except AlpacaAPIError as e:
                logger.error(f"❌ Failed to fetch orders from Alpaca for user {user_id}: {e}")
                return

            # Create a map of Alpaca orders by ID
            alpaca_orders_map = {str(order.id): order for order in alpaca_orders}

            # Check each grid order
            for grid_order in orders:
                alpaca_order_id = grid_order.get("alpaca_order_id")
                if not alpaca_order_id:
                    continue

                alpaca_order = alpaca_orders_map.get(alpaca_order_id)
                if not alpaca_order:
                    logger.warning(f"⚠️ Alpaca order {alpaca_order_id} not found")
                    continue

                # Check if order status has changed
                await self.process_order_update(
                    grid_order,
                    alpaca_order,
                    trading_client,
                    user_id
                )

        except Exception as e:
            logger.error(f"❌ Error checking orders for user {user_id}: {e}", exc_info=True)

    async def process_order_update(
        self,
        grid_order: Dict[str, Any],
        alpaca_order: Any,
        trading_client: TradingClient,
        user_id: str
    ):
        """Process an order update and trigger execution if filled"""
        try:
            grid_order_id = grid_order["id"]
            strategy_id = grid_order["strategy_id"]
            current_status = grid_order["status"]

            # Map Alpaca status to our status
            alpaca_status = str(alpaca_order.status).lower()
            new_status = self.map_alpaca_status(alpaca_status)

            # Check if status has changed
            if new_status == current_status:
                return

            logger.info(
                f"📊 Order status change detected: {grid_order['alpaca_order_id']} "
                f"{current_status} → {new_status}"
            )

            # Update grid order in database
            update_data = {
                "status": new_status,
                "filled_qty": float(alpaca_order.filled_qty or 0),
                "filled_avg_price": float(alpaca_order.filled_avg_price or 0),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            if new_status == "filled":
                update_data["filled_at"] = datetime.now(timezone.utc).isoformat()

            self.supabase.table("grid_orders").update(update_data).eq(
                "id", grid_order_id
            ).execute()

            logger.info(f"✅ Updated grid order {grid_order_id} status to {new_status}")

            # If order is filled, trigger strategy execution
            if new_status == "filled":
                await self.trigger_strategy_execution(
                    strategy_id,
                    grid_order,
                    alpaca_order,
                    trading_client,
                    user_id
                )

        except Exception as e:
            logger.error(f"❌ Error processing order update: {e}", exc_info=True)

    def map_alpaca_status(self, alpaca_status: str) -> str:
        """Map Alpaca order status to our grid order status"""
        status_map = {
            "new": "pending",
            "accepted": "pending",
            "pending_new": "pending",
            "accepted_for_bidding": "pending",
            "partially_filled": "partially_filled",
            "filled": "filled",
            "done_for_day": "filled",
            "canceled": "cancelled",
            "expired": "cancelled",
            "replaced": "cancelled",
            "pending_cancel": "pending",
            "pending_replace": "pending",
            "rejected": "rejected",
            "suspended": "rejected",
            "stopped": "cancelled",
        }
        return status_map.get(alpaca_status, "pending")

    async def trigger_strategy_execution(
        self,
        strategy_id: str,
        grid_order: Dict[str, Any],
        alpaca_order: Any,
        trading_client: TradingClient,
        user_id: str
    ):
        """Trigger strategy execution when a grid order is filled"""
        try:
            logger.info(
                f"🚀 [ORDER FILL EVENT] Grid order filled: {grid_order['symbol']} "
                f"{grid_order['side']} @ ${grid_order['limit_price']} (Level {grid_order['grid_level']})"
            )

            # Fetch strategy data
            resp = self.supabase.table("trading_strategies").select("*").eq(
                "id", strategy_id
            ).execute()

            if not resp.data:
                logger.error(f"❌ Strategy {strategy_id} not found")
                return

            strategy_data = resp.data[0]
            strategy_type = strategy_data["type"]

            # Only trigger for grid strategies
            if strategy_type not in ["spot_grid", "reverse_grid", "futures_grid", "infinity_grid"]:
                logger.warning(f"⚠️ Strategy {strategy_id} is not a grid strategy, skipping")
                return

            # Get strategy executor
            from strategy_executors.factory import StrategyExecutorFactory
            from dependencies import get_alpaca_stock_data_client, get_alpaca_crypto_data_client

            stock_client = get_alpaca_stock_data_client()
            crypto_client = get_alpaca_crypto_data_client()

            executor = StrategyExecutorFactory.create_executor(
                strategy_type,
                trading_client,
                stock_client,
                crypto_client,
                self.supabase
            )

            if not executor:
                logger.error(f"❌ No executor found for strategy type {strategy_type}")
                return

            # Create order fill event data
            order_fill_event = {
                "event": "order_filled",
                "grid_order": grid_order,
                "alpaca_order": {
                    "id": str(alpaca_order.id),
                    "symbol": alpaca_order.symbol,
                    "side": str(alpaca_order.side),
                    "filled_qty": float(alpaca_order.filled_qty or 0),
                    "filled_avg_price": float(alpaca_order.filled_avg_price or 0),
                    "filled_at": alpaca_order.filled_at.isoformat() if hasattr(alpaca_order, 'filled_at') and alpaca_order.filled_at else None,
                }
            }

            # Execute strategy with order fill event
            result = await executor.execute_on_fill(strategy_data, order_fill_event)

            logger.info(f"✅ [ORDER FILL EVENT] Strategy execution result: {result}")

            # Broadcast update via SSE
            try:
                from sse_manager import publish
                update_data = {
                    "type": "grid_order_filled",
                    "strategy_id": strategy_id,
                    "strategy_name": strategy_data.get("name", "Unknown"),
                    "grid_order": grid_order,
                    "execution_result": result,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                await publish(user_id, update_data)
                logger.info(f"📡 Broadcasted grid fill event to user {user_id}")
            except Exception as broadcast_error:
                logger.error(f"❌ Error broadcasting grid fill event: {broadcast_error}")

        except Exception as e:
            logger.error(f"❌ Error triggering strategy execution on fill: {e}", exc_info=True)

# Global monitor instance
order_fill_monitor = OrderFillMonitor(None)  # Will be initialized with supabase in main.py
