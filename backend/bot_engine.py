"""
Bot Execution Engine

Core engine for managing bot lifecycle, order execution, position tracking, and risk management.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from decimal import Decimal
from supabase import Client
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest, StopLimitOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce, OrderType
from alpaca.common.exceptions import APIError as AlpacaAPIError

logger = logging.getLogger(__name__)

class BotExecutionEngine:
    """Core engine for bot execution and order management"""

    def __init__(self, trading_client: TradingClient, supabase: Client):
        self.trading_client = trading_client
        self.supabase = supabase
        self.logger = logging.getLogger(__name__)

    async def execute_order(
        self,
        strategy_id: str,
        user_id: str,
        symbol: str,
        side: str,
        quantity: float,
        order_type: str = "market",
        limit_price: Optional[float] = None,
        stop_price: Optional[float] = None,
        time_in_force: str = "day",
        grid_level: Optional[int] = None
    ) -> Dict[str, Any]:
        """Execute a trading order and track it in the database"""
        try:
            bot_order_id = None

            bot_order = {
                "strategy_id": strategy_id,
                "user_id": user_id,
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "order_type": order_type,
                "limit_price": limit_price,
                "stop_price": stop_price,
                "status": "pending",
                "time_in_force": time_in_force,
                "grid_level": grid_level,
                "is_grid_order": grid_level is not None,
                "submitted_at": datetime.now(timezone.utc).isoformat()
            }

            result = self.supabase.table("bot_orders").insert(bot_order).execute()
            bot_order_id = result.data[0]["id"]

            order_side = OrderSide.BUY if side.lower() == "buy" else OrderSide.SELL
            tif = TimeInForce.DAY if time_in_force == "day" else TimeInForce.GTC

            if order_type == "market":
                order_data = MarketOrderRequest(
                    symbol=symbol,
                    qty=quantity,
                    side=order_side,
                    time_in_force=tif
                )
            elif order_type == "limit":
                order_data = LimitOrderRequest(
                    symbol=symbol,
                    qty=quantity,
                    side=order_side,
                    time_in_force=tif,
                    limit_price=limit_price
                )
            elif order_type == "stop_limit":
                order_data = StopLimitOrderRequest(
                    symbol=symbol,
                    qty=quantity,
                    side=order_side,
                    time_in_force=tif,
                    limit_price=limit_price,
                    stop_price=stop_price
                )
            else:
                raise ValueError(f"Unsupported order type: {order_type}")

            broker_order = self.trading_client.submit_order(order_data)

            self.supabase.table("bot_orders").update({
                "status": "submitted",
                "broker_order_id": str(broker_order.id),
                "submitted_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", bot_order_id).execute()

            self.logger.info(f"✅ Order submitted: {side} {quantity} {symbol} @ {order_type}")

            return {
                "success": True,
                "bot_order_id": bot_order_id,
                "broker_order_id": str(broker_order.id),
                "status": broker_order.status,
                "symbol": symbol,
                "side": side,
                "quantity": quantity
            }

        except AlpacaAPIError as e:
            self.logger.error(f"❌ Alpaca API error: {e}")
            if bot_order_id:
                self.supabase.table("bot_orders").update({
                    "status": "rejected",
                    "rejection_reason": str(e)
                }).eq("id", bot_order_id).execute()

            return {
                "success": False,
                "error": str(e),
                "error_type": "alpaca_api_error"
            }

        except Exception as e:
            self.logger.error(f"❌ Error executing order: {e}")
            if bot_order_id:
                self.supabase.table("bot_orders").update({
                    "status": "rejected",
                    "rejection_reason": str(e)
                }).eq("id", bot_order_id).execute()

            return {
                "success": False,
                "error": str(e),
                "error_type": "execution_error"
            }

    async def open_position(
        self,
        strategy_id: str,
        user_id: str,
        symbol: str,
        side: str,
        quantity: float,
        entry_price: float,
        position_type: str = "stock",
        grid_level: Optional[int] = None
    ) -> Dict[str, Any]:
        """Record a new open position"""
        try:
            position = {
                "strategy_id": strategy_id,
                "user_id": user_id,
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "entry_price": entry_price,
                "current_price": entry_price,
                "position_type": position_type,
                "grid_level": grid_level,
                "is_grid_position": grid_level is not None,
                "entry_timestamp": datetime.now(timezone.utc).isoformat(),
                "is_closed": False
            }

            result = self.supabase.table("bot_positions").insert(position).execute()
            position_id = result.data[0]["id"]

            self.logger.info(f"✅ Position opened: {side} {quantity} {symbol} @ ${entry_price}")

            return {
                "success": True,
                "position_id": position_id,
                "position": result.data[0]
            }

        except Exception as e:
            self.logger.error(f"❌ Error opening position: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def close_position(
        self,
        position_id: str,
        close_price: float,
        user_id: str
    ) -> Dict[str, Any]:
        """Close an existing position"""
        try:
            position_result = self.supabase.table("bot_positions")\
                .select("*")\
                .eq("id", position_id)\
                .eq("user_id", user_id)\
                .single()\
                .execute()

            if not position_result.data:
                return {"success": False, "error": "Position not found"}

            position = position_result.data
            entry_price = float(position["entry_price"])
            quantity = float(position["quantity"])
            side = position["side"]

            if side == "long":
                realized_pnl = (close_price - entry_price) * quantity
            else:
                realized_pnl = (entry_price - close_price) * quantity

            self.supabase.table("bot_positions").update({
                "is_closed": True,
                "close_price": close_price,
                "close_timestamp": datetime.now(timezone.utc).isoformat(),
                "realized_pnl": realized_pnl
            }).eq("id", position_id).execute()

            self.logger.info(f"✅ Position closed: {position['symbol']} | P&L: ${realized_pnl:.2f}")

            return {
                "success": True,
                "position_id": position_id,
                "realized_pnl": realized_pnl
            }

        except Exception as e:
            self.logger.error(f"❌ Error closing position: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def update_execution_state(
        self,
        strategy_id: str,
        user_id: str,
        state: Dict[str, Any],
        current_phase: Optional[str] = None
    ) -> bool:
        """Update bot execution state"""
        try:
            existing = self.supabase.table("bot_execution_state")\
                .select("id")\
                .eq("strategy_id", strategy_id)\
                .eq("user_id", user_id)\
                .execute()

            update_data = {
                "state": state,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }

            if current_phase:
                update_data["current_phase"] = current_phase

            if existing.data:
                self.supabase.table("bot_execution_state")\
                    .update(update_data)\
                    .eq("strategy_id", strategy_id)\
                    .execute()
            else:
                update_data.update({
                    "strategy_id": strategy_id,
                    "user_id": user_id
                })
                self.supabase.table("bot_execution_state")\
                    .insert(update_data)\
                    .execute()

            return True

        except Exception as e:
            self.logger.error(f"❌ Error updating execution state: {e}")
            return False

    async def get_execution_state(
        self,
        strategy_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get bot execution state"""
        try:
            result = self.supabase.table("bot_execution_state")\
                .select("*")\
                .eq("strategy_id", strategy_id)\
                .eq("user_id", user_id)\
                .single()\
                .execute()

            return result.data if result.data else None

        except Exception as e:
            self.logger.error(f"❌ Error getting execution state: {e}")
            return None

    async def log_risk_event(
        self,
        strategy_id: str,
        user_id: str,
        event_type: str,
        severity: str,
        event_data: Dict[str, Any],
        action_taken: Optional[str] = None,
        position_id: Optional[str] = None,
        order_id: Optional[str] = None
    ) -> bool:
        """Log a risk management event"""
        try:
            risk_event = {
                "strategy_id": strategy_id,
                "user_id": user_id,
                "event_type": event_type,
                "severity": severity,
                "event_data": event_data,
                "action_taken": action_taken,
                "position_id": position_id,
                "order_id": order_id,
                "resolved": False
            }

            self.supabase.table("bot_risk_events").insert(risk_event).execute()
            self.logger.warning(f"⚠️ Risk event logged: {event_type} ({severity})")

            return True

        except Exception as e:
            self.logger.error(f"❌ Error logging risk event: {e}")
            return False

    async def update_positions_pnl(
        self,
        strategy_id: str,
        user_id: str,
        current_prices: Dict[str, float]
    ) -> int:
        """Update unrealized P&L for open positions"""
        try:
            positions = self.supabase.table("bot_positions")\
                .select("*")\
                .eq("strategy_id", strategy_id)\
                .eq("user_id", user_id)\
                .eq("is_closed", False)\
                .execute()

            updated_count = 0

            for position in positions.data:
                symbol = position["symbol"]
                if symbol not in current_prices:
                    continue

                current_price = current_prices[symbol]
                entry_price = float(position["entry_price"])
                quantity = float(position["quantity"])
                side = position["side"]

                if side == "long":
                    unrealized_pnl = (current_price - entry_price) * quantity
                    unrealized_pnl_percent = ((current_price - entry_price) / entry_price) * 100
                else:
                    unrealized_pnl = (entry_price - current_price) * quantity
                    unrealized_pnl_percent = ((entry_price - current_price) / entry_price) * 100

                self.supabase.table("bot_positions").update({
                    "current_price": current_price,
                    "unrealized_pnl": unrealized_pnl,
                    "unrealized_pnl_percent": unrealized_pnl_percent,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", position["id"]).execute()

                updated_count += 1

            return updated_count

        except Exception as e:
            self.logger.error(f"❌ Error updating positions P&L: {e}")
            return 0

    async def get_open_positions(
        self,
        strategy_id: str,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Get all open positions for a strategy"""
        try:
            result = self.supabase.table("bot_positions")\
                .select("*")\
                .eq("strategy_id", strategy_id)\
                .eq("user_id", user_id)\
                .eq("is_closed", False)\
                .execute()

            return result.data if result.data else []

        except Exception as e:
            self.logger.error(f"❌ Error getting open positions: {e}")
            return []

    async def record_performance_snapshot(
        self,
        strategy_id: str,
        user_id: str,
        metrics: Dict[str, Any]
    ) -> bool:
        """Record a daily performance snapshot"""
        try:
            snapshot = {
                "strategy_id": strategy_id,
                "user_id": user_id,
                "snapshot_date": datetime.now(timezone.utc).date().isoformat(),
                "total_pnl": metrics.get("total_pnl", 0),
                "daily_pnl": metrics.get("daily_pnl", 0),
                "win_rate": metrics.get("win_rate", 0),
                "total_trades": metrics.get("total_trades", 0),
                "winning_trades": metrics.get("winning_trades", 0),
                "losing_trades": metrics.get("losing_trades", 0),
                "sharpe_ratio": metrics.get("sharpe_ratio"),
                "max_drawdown": metrics.get("max_drawdown", 0),
                "portfolio_value": metrics.get("portfolio_value", 0),
                "capital_deployed": metrics.get("capital_deployed", 0),
                "custom_metrics": metrics.get("custom_metrics", {})
            }

            existing = self.supabase.table("bot_performance_history")\
                .select("id")\
                .eq("strategy_id", strategy_id)\
                .eq("snapshot_date", snapshot["snapshot_date"])\
                .execute()

            if existing.data:
                self.supabase.table("bot_performance_history")\
                    .update(snapshot)\
                    .eq("id", existing.data[0]["id"])\
                    .execute()
            else:
                self.supabase.table("bot_performance_history")\
                    .insert(snapshot)\
                    .execute()

            self.logger.info(f"✅ Performance snapshot recorded for {strategy_id}")
            return True

        except Exception as e:
            self.logger.error(f"❌ Error recording performance snapshot: {e}")
            return False
