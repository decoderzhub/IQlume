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
        logger.info("🔄 Starting trade sync service...")
        
        while self.is_running:
            try:
                await self.sync_pending_trades()
                # Run every 2 minutes
                await asyncio.sleep(120)
            except Exception as e:
                logger.error(f"❌ Error in trade sync loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
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
                logger.debug("📭 No pending trades to sync")
                return
            
            logger.info(f"🔄 Syncing {len(pending_trades)} pending trades...")
            
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
                    logger.info(f"✅ Updated trade {trade['id']}: {trade['symbol']} {trade['type']} -> {new_status}")
                else:
                    logger.error(f"❌ Failed to update trade {trade['id']}")
            
            if updates_made > 0:
                logger.info(f"📊 Updated {updates_made} trades for user {user_id}")
            
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