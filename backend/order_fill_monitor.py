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
from alpaca.trading.requests import GetOrdersRequest
from alpaca.trading.enums import OrderStatus, QueryOrderStatus
from alpaca.common.exceptions import APIError as AlpacaAPIError
from supabase import Client

logger = logging.getLogger(__name__)

class OrderFillMonitor:
    """Monitors grid orders and triggers execution on fills"""

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.is_running = False
        self.check_interval = 10  # Check every 10 seconds for faster order updates

    async def start(self):
        """Start the order fill monitoring loop"""
        logger.info("🔍 Starting order fill monitor for grid orders...")
        logger.info("📡 Will check grid order status with Alpaca every 10 seconds")
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
            # Get only recent, non-stale pending grid orders
            # Filter: not stale, created within last 7 days, status pending/partially_filled
            resp = self.supabase.table("grid_orders").select(
                "*, trading_strategies(user_id, name, type, configuration)"
            ).in_("status", ["pending", "partially_filled"]).eq("is_stale", False).execute()

            if not resp.data:
                return

            # Filter out orders older than 7 days (double-check in case index isn't used)
            from datetime import datetime, timezone, timedelta
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=7)
            recent_orders = [
                order for order in resp.data
                if datetime.fromisoformat(order["created_at"].replace("Z", "+00:00")) > cutoff_date
            ]

            if not recent_orders:
                return

            logger.info(f"🔍 Checking {len(recent_orders)} recent pending grid orders for fills")

            # Group orders by user for efficient API usage
            orders_by_user: Dict[str, List[Dict[str, Any]]] = {}
            for order in recent_orders:
                user_id = order["trading_strategies"]["user_id"]
                if user_id not in orders_by_user:
                    orders_by_user[user_id] = []
                orders_by_user[user_id].append(order)

            # Check orders for each user
            for user_id, user_orders in orders_by_user.items():
                await self.check_user_orders(user_id, user_orders)

            # Also check for initial buy orders from trades table
            await self.check_initial_buy_orders()

        except Exception as e:
            logger.error(f"❌ Error checking order fills: {e}", exc_info=True)

    async def check_initial_buy_orders(self):
        """Check pending initial buy orders (market orders) for fills"""
        try:
            # Get all strategies with initial_buy_order_submitted=true but initial_buy_filled=false
            resp = self.supabase.table("trading_strategies").select("*").eq(
                "is_active", True
            ).execute()

            if not resp.data:
                return

            pending_initial_buys = []
            for strategy in resp.data:
                telemetry = strategy.get("telemetry_data", {})
                if isinstance(telemetry, dict):
                    if telemetry.get("initial_buy_order_submitted") and not telemetry.get("initial_buy_filled"):
                        pending_initial_buys.append(strategy)

            if not pending_initial_buys:
                return

            logger.info(f"🔍 Checking {len(pending_initial_buys)} pending initial buy orders")

            # Check each strategy's initial buy order
            for strategy in pending_initial_buys:
                try:
                    strategy_id = strategy["id"]
                    user_id = strategy["user_id"]
                    telemetry = strategy.get("telemetry_data", {})
                    initial_buy_order_id = telemetry.get("initial_buy_alpaca_order_id")

                    if not initial_buy_order_id:
                        continue

                    # Get trading client for user
                    from dependencies import get_alpaca_trading_client

                    class MockUser:
                        def __init__(self, user_id: str):
                            self.id = user_id

                    user = MockUser(user_id)

                    try:
                        trading_client = await get_alpaca_trading_client(user, self.supabase)
                    except Exception as e:
                        logger.debug(f"Could not get trading client for user {user_id}: {e}")
                        continue

                    # Check order status with Alpaca
                    try:
                        order = trading_client.get_order_by_id(initial_buy_order_id)

                        # Check if order is filled
                        order_status = str(order.status).lower()
                        if order_status in ["filled", "done_for_day"]:
                            logger.info(f"✅ [INITIAL BUY] Order {initial_buy_order_id} filled for strategy {strategy_id}")
                            await self.check_initial_buy_fill(strategy_id, initial_buy_order_id, user_id)
                    except Exception as order_error:
                        logger.debug(f"Could not check order {initial_buy_order_id}: {order_error}")

                except Exception as strategy_error:
                    logger.error(f"Error checking initial buy for strategy: {strategy_error}")

        except Exception as e:
            logger.error(f"❌ Error checking initial buy orders: {e}", exc_info=True)

    async def check_user_orders(self, user_id: str, orders: List[Dict[str, Any]]):
        """Check orders for a specific user"""
        try:
            # Get user's trading client
            from dependencies import get_alpaca_trading_client, verify_alpaca_account_context
            from fastapi import HTTPException

            class MockUser:
                def __init__(self, user_id: str):
                    self.id = user_id

            user = MockUser(user_id)

            # Verify account context
            try:
                account_context = await verify_alpaca_account_context(user, self.supabase)
                logger.info(f"📋 [ORDER FILL MONITOR] Account Context: {account_context}")
            except Exception as ctx_error:
                logger.warning(f"⚠️ Could not verify account context for user {user_id}: {ctx_error}")

            # Try to get trading client with error handling
            try:
                trading_client = await get_alpaca_trading_client(user, self.supabase)
            except HTTPException as auth_error:
                logger.warning(f"⚠️ Authentication error for user {user_id}: {auth_error.detail}")
                # Don't crash the monitor, just skip this user for now
                return
            except Exception as client_error:
                logger.error(f"❌ Failed to get trading client for user {user_id}: {client_error}")
                return

            if not trading_client:
                logger.warning(f"⚠️ Could not get trading client for user {user_id}")
                return

            # Fetch all orders from Alpaca for this user
            try:
                # Use GetOrdersRequest with proper filter parameter
                request = GetOrdersRequest(
                    status=QueryOrderStatus.ALL,
                    limit=100
                )
                alpaca_orders = trading_client.get_orders(filter=request)
            except AlpacaAPIError as e:
                logger.warning(f"⚠️ Failed to fetch orders from Alpaca for user {user_id}: {e}")
                # Don't crash the monitor, continue with other users
                return
            except Exception as fetch_error:
                logger.error(f"❌ Unexpected error fetching orders for user {user_id}: {fetch_error}")
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
                    # Order not found in Alpaca - update check count
                    await self.handle_order_not_found(grid_order, user_id)
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
            # Don't let one user's error crash the entire monitor
            # Continue checking other users

    async def handle_order_not_found(self, grid_order: Dict[str, Any], user_id: str):
        """Handle case when order is not found in Alpaca API"""
        try:
            grid_order_id = grid_order["id"]
            alpaca_order_id = grid_order.get("alpaca_order_id")
            check_count = grid_order.get("check_count", 0)

            # Increment check count
            new_check_count = check_count + 1

            # Determine if order should be marked stale (after 5 failed checks)
            should_mark_stale = new_check_count >= 5

            # Log at appropriate level based on check count
            if new_check_count <= 2:
                logger.info(f"⚠️ Alpaca order {alpaca_order_id} not found (attempt {new_check_count}/5)")
            else:
                logger.debug(f"Alpaca order {alpaca_order_id} not found (attempt {new_check_count}/5)")

            # Update database
            update_data = {
                "check_count": new_check_count,
                "last_checked_at": datetime.now(timezone.utc).isoformat(),
            }

            if should_mark_stale:
                update_data["is_stale"] = True
                logger.info(f"🗑️ Marking order {alpaca_order_id} as stale after {new_check_count} failed checks")

            self.supabase.table("grid_orders").update(update_data).eq(
                "id", grid_order_id
            ).execute()

        except Exception as e:
            logger.error(f"❌ Error handling order not found: {e}", exc_info=True)

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
                # No status change, but update last_checked_at and reset check_count
                self.supabase.table("grid_orders").update({
                    "last_checked_at": datetime.now(timezone.utc).isoformat(),
                    "check_count": 0
                }).eq("id", grid_order_id).execute()
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
                "last_checked_at": datetime.now(timezone.utc).isoformat(),
                "check_count": 0,
            }

            if new_status == "filled":
                update_data["filled_at"] = datetime.now(timezone.utc).isoformat()

            self.supabase.table("grid_orders").update(update_data).eq(
                "id", grid_order_id
            ).execute()

            logger.info(f"✅ Updated grid order {grid_order_id} status to {new_status}")

            # Broadcast status update via SSE
            try:
                from sse_manager import publish
                status_update = {
                    "type": "grid_order_status_update",
                    "strategy_id": strategy_id,
                    "grid_order_id": grid_order_id,
                    "alpaca_order_id": grid_order["alpaca_order_id"],
                    "status": new_status,
                    "side": grid_order["side"],
                    "grid_level": grid_order["grid_level"],
                    "limit_price": grid_order["limit_price"],
                    "filled_qty": float(alpaca_order.filled_qty or 0),
                    "filled_avg_price": float(alpaca_order.filled_avg_price or 0),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                await publish(user_id, status_update)
                logger.info(f"📡 Broadcasted grid order status update to user {user_id}")
            except Exception as broadcast_error:
                logger.error(f"❌ Error broadcasting status update: {broadcast_error}")

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

    async def check_initial_buy_fill(self, strategy_id: str, alpaca_order_id: str, user_id: str):
        """Check if an initial buy order has filled and update strategy telemetry"""
        try:
            # Fetch strategy to get telemetry data
            resp = self.supabase.table("trading_strategies").select("*").eq(
                "id", strategy_id
            ).execute()

            if not resp.data:
                logger.error(f"❌ Strategy {strategy_id} not found")
                return

            strategy_data = resp.data[0]
            telemetry_data = strategy_data.get("telemetry_data", {})
            if not isinstance(telemetry_data, dict):
                telemetry_data = {}

            initial_buy_alpaca_order_id = telemetry_data.get("initial_buy_alpaca_order_id")

            # Check if this is the initial buy order
            if initial_buy_alpaca_order_id == alpaca_order_id:
                logger.info(f"✅ [INITIAL BUY FILLED] Initial buy order {alpaca_order_id} has filled for strategy {strategy_id}")

                # Update telemetry to mark initial buy as filled
                telemetry_data["initial_buy_filled"] = True
                telemetry_data["last_updated"] = datetime.now(timezone.utc).isoformat()

                # Update strategy telemetry in database
                self.supabase.table("trading_strategies").update({
                    "telemetry_data": telemetry_data
                }).eq("id", strategy_id).execute()

                logger.info(f"✅ [INITIAL BUY FILLED] Telemetry updated - grid limit orders can now be placed")

                # Broadcast event via SSE
                try:
                    from sse_manager import publish
                    await publish(user_id, {
                        "type": "initial_buy_filled",
                        "strategy_id": strategy_id,
                        "strategy_name": strategy_data.get("name", "Unknown"),
                        "order_id": alpaca_order_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                except Exception as broadcast_error:
                    logger.debug(f"Could not broadcast SSE: {broadcast_error}")

                return True

            return False

        except Exception as e:
            logger.error(f"❌ Error checking initial buy fill: {e}", exc_info=True)
            return False

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
            from fastapi import HTTPException

            # Create user object for data clients
            class MockUser:
                def __init__(self, user_id: str):
                    self.id = user_id

            user = MockUser(user_id)

            # Try to get data clients with error handling
            try:
                stock_client = await get_alpaca_stock_data_client(user, self.supabase)
            except HTTPException as e:
                logger.warning(f"⚠️ Could not get stock data client for strategy execution: {e.detail}")
                stock_client = None

            try:
                crypto_client = await get_alpaca_crypto_data_client(user, self.supabase)
            except HTTPException as e:
                logger.warning(f"⚠️ Could not get crypto data client for strategy execution: {e.detail}")
                crypto_client = None

            if not stock_client and not crypto_client:
                logger.error(f"❌ No data clients available for strategy execution")
                return

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
