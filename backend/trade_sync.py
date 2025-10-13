"""
Trade synchronization service to update Supabase trades with Alpaca order status.
This service periodically checks pending trades and updates their status based on Alpaca data.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from dependencies import (
    get_supabase_client,
    get_alpaca_trading_client,
    verify_alpaca_account_context,
)
from alpaca.trading.requests import GetOrdersRequest
from alpaca.trading.enums import QueryOrderStatus, OrderStatus
from alpaca.common.exceptions import APIError as AlpacaAPIError

logger = logging.getLogger(__name__)

class TradeSyncService:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.is_running = False
        
    async def start(self):
        """Start the trade sync service"""
        self.is_running = True
        logger.info("🔄 Starting trade sync service for manual orders...")
        logger.info("📡 Will sync pending orders with Alpaca every 30 seconds")

        while self.is_running:
            try:
                await self.sync_pending_trades()
                # Run every 30 seconds for faster order status updates
                await asyncio.sleep(30)
            except Exception as e:
                logger.error(f"❌ Error in trade sync loop: {e}")
                await asyncio.sleep(30)  # Wait 30 seconds before retrying
    
    async def stop(self):
        """Stop the trade sync service"""
        self.is_running = False
        logger.info("🛑 Trade sync service stopped")
    
    async def sync_pending_trades(self):
        """Sync pending trades with Alpaca order status"""
        try:
            # Get all pending trades from the last 7 days
            seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
            
            resp = self.supabase.table("trades").select("*").eq("status", "pending").gte("created_at", seven_days_ago.isoformat()).execute()
            
            pending_trades = resp.data or []
            
            if not pending_trades:
                # Only log occasionally to reduce noise
                return

            logger.info(f"🔄 [TRADE SYNC] Syncing {len(pending_trades)} pending trades with Alpaca...")
            
            # Group trades by user_id to minimize API calls
            trades_by_user: Dict[str, List[Dict[str, Any]]] = {}
            for trade in pending_trades:
                user_id = trade["user_id"]
                if user_id not in trades_by_user:
                    trades_by_user[user_id] = []
                trades_by_user[user_id].append(trade)
            
            # Sync trades for each user
            for user_id, user_trades in trades_by_user.items():
                await self.sync_user_trades(user_id, user_trades)
                
        except Exception as e:
            logger.error(f"❌ Error syncing pending trades: {e}")
    
    async def sync_user_trades(self, user_id: str, trades: List[Dict[str, Any]]):
        """Sync trades for a specific user"""
        try:
            # Create mock user object for trading client
            class MockUser:
                def __init__(self, user_id: str):
                    self.id = user_id
            
            user = MockUser(user_id)

            # Verify account context
            account_context = await verify_alpaca_account_context(user, self.supabase)
            logger.info(f"📋 [TRADE SYNC] Account Context for user {user_id}: {account_context}")

            # Get trading client for this user
            trading_client = await get_alpaca_trading_client(user, self.supabase)
            
            # Get recent orders from Alpaca
            orders_request = GetOrdersRequest(
                status=QueryOrderStatus.ALL,
                limit=200,
                after=datetime.now(timezone.utc) - timedelta(days=7)
            )
            alpaca_orders = trading_client.get_orders(orders_request)
            
            # Create lookup map of Alpaca orders by order ID
            alpaca_orders_map = {}
            for order in alpaca_orders or []:
                alpaca_orders_map[str(order.id)] = order
            
            # Update each pending trade
            updates_made = 0
            for trade in trades:
                alpaca_order_id = trade.get("alpaca_order_id")
                if not alpaca_order_id:
                    continue

                # Check if this is a Portfolio trade (multiple orders)
                if alpaca_order_id.startswith("Portfolio:"):
                    # Extract individual order IDs
                    order_ids_str = alpaca_order_id.replace("Portfolio: ", "").strip()
                    order_ids = [oid.strip() for oid in order_ids_str.split(",")]

                    # Check status of all individual orders
                    all_filled = True
                    any_failed = False

                    for order_id in order_ids:
                        alpaca_order = alpaca_orders_map.get(order_id)
                        if not alpaca_order:
                            logger.warning(f"⚠️ Alpaca order {order_id} not found in portfolio trade {trade['id']}")
                            all_filled = False
                            continue

                        if alpaca_order.status != OrderStatus.FILLED:
                            all_filled = False

                        if alpaca_order.status in {OrderStatus.CANCELED, OrderStatus.EXPIRED, OrderStatus.REJECTED}:
                            any_failed = True

                    # Determine portfolio trade status
                    new_status = "pending"
                    if all_filled and len(order_ids) > 0:
                        new_status = "executed"
                    elif any_failed:
                        new_status = "failed"

                    # Update portfolio trade
                    update_data = {
                        "status": new_status,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }

                    # Update trade in Supabase
                    update_resp = self.supabase.table("trades").update(update_data).eq("id", trade["id"]).execute()

                    if update_resp.data:
                        updates_made += 1
                        logger.info(f"✅ [TRADE SYNC] Updated portfolio trade {trade['id']}: {len(order_ids)} orders -> {new_status}")
                    else:
                        logger.error(f"❌ [TRADE SYNC] Failed to update portfolio trade {trade['id']}")

                    continue

                # Handle single-order trades
                alpaca_order = alpaca_orders_map.get(alpaca_order_id)
                if not alpaca_order:
                    logger.warning(f"⚠️ Alpaca order {alpaca_order_id} not found for trade {trade['id']}")
                    continue
                
                # Determine new status
                new_status = "pending"
                if alpaca_order.status == OrderStatus.FILLED:
                    new_status = "executed"
                elif alpaca_order.status in {OrderStatus.CANCELED, OrderStatus.EXPIRED, OrderStatus.REJECTED}:
                    new_status = "failed"
                elif alpaca_order.status in {OrderStatus.NEW, OrderStatus.ACCEPTED, OrderStatus.PARTIALLY_FILLED}:
                    new_status = "pending"
                
                # Prepare update data
                update_data = {
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Add filled data if order is filled
                if alpaca_order.status == OrderStatus.FILLED:
                    filled_qty = float(getattr(alpaca_order, "filled_qty", 0) or 0)
                    filled_avg_price = float(getattr(alpaca_order, "filled_avg_price", 0) or 0)
                    
                    update_data.update({
                        "filled_qty": filled_qty,
                        "filled_avg_price": filled_avg_price,
                        "price": filled_avg_price,  # Update price with actual filled price
                    })
                    
                    # Calculate basic P&L for sells (simplified)
                    if trade["type"] == "sell":
                        order_value = filled_qty * filled_avg_price
                        estimated_profit = order_value * 0.02  # 2% estimated profit
                        update_data["profit_loss"] = estimated_profit
                
                # Update trade in Supabase
                update_resp = self.supabase.table("trades").update(update_data).eq("id", trade["id"]).execute()
                
                if update_resp.data:
                    updates_made += 1
                    filled_info = ""
                    if alpaca_order.status == OrderStatus.FILLED:
                        filled_info = f" @ ${float(getattr(alpaca_order, 'filled_avg_price', 0) or 0):.2f}"
                    logger.info(f"✅ [TRADE SYNC] Updated trade {trade['id']}: {trade['symbol']} {trade['type']} -> {new_status}{filled_info}")
                else:
                    logger.error(f"❌ [TRADE SYNC] Failed to update trade {trade['id']}")

            if updates_made > 0:
                logger.info(f"📊 [TRADE SYNC] Successfully updated {updates_made}/{len(trades)} trades for user {user_id}")
            
        except AlpacaAPIError as e:
            logger.error(f"❌ Alpaca API error syncing trades for user {user_id}: {e}")
        except Exception as e:
            logger.error(f"❌ Error syncing trades for user {user_id}: {e}")

# Global trade sync service instance
trade_sync_service = TradeSyncService()

async def start_trade_sync():
    """Start the trade sync service"""
    await trade_sync_service.start()

async def stop_trade_sync():
    """Stop the trade sync service"""
    await trade_sync_service.stop()