"""
Position Exit Monitor Service

Continuously monitors all open positions for take profit and stop loss triggers.
Executes exit orders automatically when conditions are met.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.common.exceptions import APIError as AlpacaAPIError
from supabase import Client

logger = logging.getLogger(__name__)

class PositionExitMonitor:
    """Monitors positions and executes TP/SL exits automatically"""

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.is_running = False
        self.check_interval = 10  # Check every 10 seconds

    async def start(self):
        """Start the position exit monitoring loop"""
        logger.info("🎯 Starting position exit monitor for TP/SL automation...")
        logger.info("📊 Will check all open positions every 10 seconds")
        self.is_running = True

        while self.is_running:
            try:
                await self.check_all_positions()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"❌ Error in position exit monitor loop: {e}", exc_info=True)
                await asyncio.sleep(self.check_interval)

    async def stop(self):
        """Stop the position exit monitoring loop"""
        logger.info("🛑 Stopping position exit monitor...")
        self.is_running = False

    async def check_all_positions(self):
        """Check all open positions for TP/SL triggers"""
        try:
            # Get all open positions with TP or SL configured
            resp = self.supabase.table("bot_positions").select(
                "*, trading_strategies(user_id, name, type, stop_loss_type, trailing_stop_distance_percent, breakeven_trigger_percent, take_profit_levels)"
            ).eq("is_closed", False).execute()

            if not resp.data:
                return

            # Filter positions with TP or SL configured
            positions_to_check = [
                p for p in resp.data
                if p.get("take_profit_price") or p.get("stop_loss_price") or p.get("trailing_stop_price")
            ]

            if not positions_to_check:
                return

            logger.debug(f"🔍 Checking {len(positions_to_check)} positions with TP/SL configured")

            # Group by user for efficient market data fetching
            positions_by_user: Dict[str, List[Dict[str, Any]]] = {}
            for position in positions_to_check:
                user_id = position["trading_strategies"]["user_id"]
                if user_id not in positions_by_user:
                    positions_by_user[user_id] = []
                positions_by_user[user_id].append(position)

            # Check positions for each user
            for user_id, user_positions in positions_by_user.items():
                await self.check_user_positions(user_id, user_positions)

        except Exception as e:
            logger.error(f"❌ Error checking positions: {e}", exc_info=True)

    async def check_user_positions(self, user_id: str, positions: List[Dict[str, Any]]):
        """Check positions for a specific user"""
        try:
            # Get current market prices for all symbols
            symbols = list(set(p["symbol"] for p in positions))
            current_prices = await self.get_current_prices(user_id, symbols)

            if not current_prices:
                return

            # Check each position
            for position in positions:
                symbol = position["symbol"]
                current_price = current_prices.get(symbol)

                if not current_price:
                    continue

                await self.check_position_exits(position, current_price, user_id)

        except Exception as e:
            logger.error(f"❌ Error checking user positions: {e}", exc_info=True)

    async def get_current_prices(self, user_id: str, symbols: List[str]) -> Dict[str, float]:
        """Get current market prices for symbols"""
        try:
            from dependencies import get_alpaca_stock_data_client

            class MockUser:
                def __init__(self, user_id: str):
                    self.id = user_id

            user = MockUser(user_id)
            data_client = await get_alpaca_stock_data_client(user, self.supabase)

            if not data_client:
                return {}

            # Get latest bars for all symbols
            from alpaca.data.requests import StockLatestBarRequest
            request = StockLatestBarRequest(symbol_or_symbols=symbols)
            bars = data_client.get_stock_latest_bar(request)

            prices = {}
            for symbol, bar in bars.items():
                prices[symbol] = float(bar.close)

            return prices

        except Exception as e:
            logger.debug(f"Could not get current prices: {e}")
            return {}

    async def check_position_exits(self, position: Dict[str, Any], current_price: float, user_id: str):
        """Check if position should exit based on TP/SL levels"""
        try:
            position_id = position["id"]
            symbol = position["symbol"]
            entry_price = float(position.get("entry_price", 0))
            quantity = float(position.get("quantity", 0))
            side = position.get("side", "long")

            if entry_price <= 0 or quantity <= 0:
                return

            # Update highest/lowest price reached for trailing stops
            await self.update_price_extremes(position, current_price)

            # Check for trailing stop trigger
            if await self.check_trailing_stop(position, current_price, user_id):
                return  # Position closed

            # Check for breakeven stop activation
            await self.check_breakeven_activation(position, current_price, entry_price)

            # Check for stop loss trigger
            if await self.check_stop_loss(position, current_price, entry_price, side, user_id):
                return  # Position closed

            # Check for take profit trigger
            if await self.check_take_profit(position, current_price, entry_price, side, user_id):
                return  # Position closed or partially closed

            # Check for time-based exit
            await self.check_time_based_exit(position, user_id)

        except Exception as e:
            logger.error(f"❌ Error checking position exits for {position.get('symbol')}: {e}", exc_info=True)

    async def update_price_extremes(self, position: Dict[str, Any], current_price: float):
        """Update highest and lowest prices reached for position"""
        try:
            position_id = position["id"]
            highest = position.get("highest_price_reached")
            lowest = position.get("lowest_price_reached")

            update_data = {}

            if highest is None or current_price > float(highest):
                update_data["highest_price_reached"] = current_price

            if lowest is None or current_price < float(lowest):
                update_data["lowest_price_reached"] = current_price

            if update_data:
                self.supabase.table("bot_positions").update(update_data).eq("id", position_id).execute()

        except Exception as e:
            logger.debug(f"Could not update price extremes: {e}")

    async def check_trailing_stop(self, position: Dict[str, Any], current_price: float, user_id: str) -> bool:
        """Check if trailing stop should trigger"""
        try:
            trailing_stop_price = position.get("trailing_stop_price")
            if not trailing_stop_price:
                return False

            trailing_stop_price = float(trailing_stop_price)
            side = position.get("side", "long")

            should_exit = False
            if side == "long" and current_price <= trailing_stop_price:
                should_exit = True
            elif side == "short" and current_price >= trailing_stop_price:
                should_exit = True

            if should_exit:
                logger.info(f"🎯 Trailing stop triggered for {position['symbol']} at ${current_price:.2f}")
                await self.execute_exit(
                    position,
                    current_price,
                    user_id,
                    "trailing_stop",
                    "Trailing stop triggered"
                )
                return True

            # Update trailing stop if price moved favorably
            strategy = position.get("trading_strategies", {})
            trailing_distance_percent = float(strategy.get("trailing_stop_distance_percent", 0))

            if trailing_distance_percent > 0:
                highest = float(position.get("highest_price_reached", current_price))
                new_trailing_stop = highest * (1 - trailing_distance_percent / 100)

                if new_trailing_stop > trailing_stop_price:
                    self.supabase.table("bot_positions").update({
                        "trailing_stop_price": new_trailing_stop
                    }).eq("id", position["id"]).execute()
                    logger.info(f"📈 Updated trailing stop for {position['symbol']} to ${new_trailing_stop:.2f}")

            return False

        except Exception as e:
            logger.error(f"Error checking trailing stop: {e}")
            return False

    async def check_breakeven_activation(self, position: Dict[str, Any], current_price: float, entry_price: float):
        """Check if breakeven stop should be activated"""
        try:
            if position.get("breakeven_stop_active"):
                return

            strategy = position.get("trading_strategies", {})
            breakeven_trigger = float(strategy.get("breakeven_trigger_percent", 0))

            if breakeven_trigger <= 0:
                return

            side = position.get("side", "long")
            profit_percent = ((current_price - entry_price) / entry_price) * 100

            if side == "short":
                profit_percent = -profit_percent

            if profit_percent >= breakeven_trigger:
                # Move stop loss to breakeven (entry price)
                self.supabase.table("bot_positions").update({
                    "stop_loss_price": entry_price,
                    "breakeven_stop_active": True
                }).eq("id", position["id"]).execute()

                logger.info(f"🎯 Breakeven stop activated for {position['symbol']} at ${entry_price:.2f}")

        except Exception as e:
            logger.debug(f"Error checking breakeven: {e}")

    async def check_stop_loss(self, position: Dict[str, Any], current_price: float, entry_price: float, side: str, user_id: str) -> bool:
        """Check if stop loss should trigger"""
        try:
            stop_loss_price = position.get("stop_loss_price")
            if not stop_loss_price:
                return False

            stop_loss_price = float(stop_loss_price)

            should_exit = False
            if side == "long" and current_price <= stop_loss_price:
                should_exit = True
            elif side == "short" and current_price >= stop_loss_price:
                should_exit = True

            if should_exit:
                logger.warning(f"🛑 Stop loss triggered for {position['symbol']} at ${current_price:.2f}")
                await self.execute_exit(
                    position,
                    current_price,
                    user_id,
                    "stop_loss",
                    f"Stop loss hit at ${stop_loss_price:.2f}"
                )
                return True

            return False

        except Exception as e:
            logger.error(f"Error checking stop loss: {e}")
            return False

    async def check_take_profit(self, position: Dict[str, Any], current_price: float, entry_price: float, side: str, user_id: str) -> bool:
        """Check if take profit should trigger"""
        try:
            take_profit_price = position.get("take_profit_price")
            if not take_profit_price:
                return False

            take_profit_price = float(take_profit_price)

            should_exit = False
            if side == "long" and current_price >= take_profit_price:
                should_exit = True
            elif side == "short" and current_price <= take_profit_price:
                should_exit = True

            if should_exit:
                logger.info(f"✅ Take profit triggered for {position['symbol']} at ${current_price:.2f}")
                await self.execute_exit(
                    position,
                    current_price,
                    user_id,
                    "take_profit",
                    f"Take profit hit at ${take_profit_price:.2f}"
                )
                return True

            # Check for multi-level take profits
            take_profit_levels = position.get("take_profit_levels", [])
            if take_profit_levels and isinstance(take_profit_levels, list):
                await self.check_multi_level_take_profit(position, current_price, user_id, take_profit_levels)

            return False

        except Exception as e:
            logger.error(f"Error checking take profit: {e}")
            return False

    async def check_multi_level_take_profit(self, position: Dict[str, Any], current_price: float, user_id: str, levels: List[Dict]):
        """Check and execute multi-level take profit exits"""
        try:
            for i, level in enumerate(levels):
                if level.get("status") == "hit":
                    continue

                target_price = float(level.get("price", 0))
                quantity_percent = float(level.get("quantity_percent", 0))
                side = position.get("side", "long")

                should_exit = False
                if side == "long" and current_price >= target_price:
                    should_exit = True
                elif side == "short" and current_price <= target_price:
                    should_exit = True

                if should_exit:
                    # Calculate partial quantity
                    total_quantity = float(position.get("quantity", 0))
                    partial_quantity = total_quantity * (quantity_percent / 100)

                    logger.info(f"✅ Take profit level {i+1} hit for {position['symbol']} - closing {quantity_percent}% at ${current_price:.2f}")

                    # Execute partial exit
                    await self.execute_partial_exit(
                        position,
                        current_price,
                        user_id,
                        partial_quantity,
                        f"Take profit level {i+1} ({quantity_percent}%)"
                    )

                    # Mark level as hit
                    levels[i]["status"] = "hit"
                    self.supabase.table("bot_positions").update({
                        "take_profit_levels": levels
                    }).eq("id", position["id"]).execute()

        except Exception as e:
            logger.error(f"Error checking multi-level take profit: {e}")

    async def check_time_based_exit(self, position: Dict[str, Any], user_id: str):
        """Check if position should exit based on holding time"""
        try:
            strategy = position.get("trading_strategies", {})
            time_based_exit_hours = float(strategy.get("time_based_exit_hours", 0))

            if time_based_exit_hours <= 0:
                return

            opened_at = datetime.fromisoformat(position["opened_at"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            hours_held = (now - opened_at).total_seconds() / 3600

            if hours_held >= time_based_exit_hours:
                logger.info(f"⏰ Time-based exit triggered for {position['symbol']} after {hours_held:.1f} hours")

                # Get current price for exit
                current_prices = await self.get_current_prices(user_id, [position["symbol"]])
                current_price = current_prices.get(position["symbol"])

                if current_price:
                    await self.execute_exit(
                        position,
                        current_price,
                        user_id,
                        "timeout",
                        f"Maximum holding period of {time_based_exit_hours} hours reached"
                    )

        except Exception as e:
            logger.debug(f"Error checking time-based exit: {e}")

    async def execute_exit(self, position: Dict[str, Any], exit_price: float, user_id: str, exit_type: str, exit_reason: str):
        """Execute full position exit via Alpaca"""
        try:
            from dependencies import get_alpaca_trading_client

            class MockUser:
                def __init__(self, user_id: str):
                    self.id = user_id

            user = MockUser(user_id)
            trading_client = await get_alpaca_trading_client(user, self.supabase)

            if not trading_client:
                logger.error(f"Could not get trading client for user {user_id}")
                return

            symbol = position["symbol"]
            quantity = abs(float(position["quantity"]))
            side = position.get("side", "long")

            # Determine order side (opposite of position side)
            order_side = OrderSide.SELL if side == "long" else OrderSide.BUY

            # Submit market order for immediate exit
            order_request = MarketOrderRequest(
                symbol=symbol,
                qty=quantity,
                side=order_side,
                time_in_force=TimeInForce.GTC
            )

            order = trading_client.submit_order(order_request)
            logger.info(f"✅ Exit order submitted for {symbol}: {order.id}")

            # Update position as closed
            entry_price = float(position.get("entry_price", 0))
            profit_loss = (exit_price - entry_price) * quantity
            if side == "short":
                profit_loss = -profit_loss

            profit_loss_percent = ((exit_price - entry_price) / entry_price * 100) if entry_price > 0 else 0
            if side == "short":
                profit_loss_percent = -profit_loss_percent

            self.supabase.table("bot_positions").update({
                "is_closed": True,
                "closed_at": datetime.now(timezone.utc).isoformat(),
                "exit_price": exit_price,
                "exit_type": exit_type,
                "exit_reason": exit_reason,
                "exit_alpaca_order_id": order.id,
                "realized_pnl": profit_loss,
                "realized_pnl_percent": profit_loss_percent
            }).eq("id", position["id"]).execute()

            # Record exit event
            self.supabase.table("exit_events").insert({
                "user_id": user_id,
                "position_id": position["id"],
                "strategy_id": position["strategy_id"],
                "symbol": symbol,
                "exit_type": exit_type,
                "exit_price": exit_price,
                "entry_price": entry_price,
                "exit_quantity": quantity,
                "exit_reason": exit_reason,
                "profit_loss": profit_loss,
                "profit_loss_percent": profit_loss_percent,
                "alpaca_order_id": order.id,
                "executed_at": datetime.now(timezone.utc).isoformat()
            }).execute()

            logger.info(f"💰 Position closed: {symbol} | P&L: ${profit_loss:.2f} ({profit_loss_percent:+.2f}%)")

        except Exception as e:
            logger.error(f"❌ Error executing exit for {position['symbol']}: {e}", exc_info=True)

    async def execute_partial_exit(self, position: Dict[str, Any], exit_price: float, user_id: str, exit_quantity: float, reason: str):
        """Execute partial position exit"""
        try:
            from dependencies import get_alpaca_trading_client

            class MockUser:
                def __init__(self, user_id: str):
                    self.id = user_id

            user = MockUser(user_id)
            trading_client = await get_alpaca_trading_client(user, self.supabase)

            if not trading_client:
                return

            symbol = position["symbol"]
            side = position.get("side", "long")
            order_side = OrderSide.SELL if side == "long" else OrderSide.BUY

            # Submit partial exit order
            order_request = MarketOrderRequest(
                symbol=symbol,
                qty=exit_quantity,
                side=order_side,
                time_in_force=TimeInForce.GTC
            )

            order = trading_client.submit_order(order_request)
            logger.info(f"✅ Partial exit order submitted for {symbol}: {order.id}")

            # Update position quantity
            current_quantity = float(position.get("quantity", 0))
            new_quantity = current_quantity - exit_quantity

            entry_price = float(position.get("entry_price", 0))
            profit_loss = (exit_price - entry_price) * exit_quantity
            if side == "short":
                profit_loss = -profit_loss

            profit_loss_percent = ((exit_price - entry_price) / entry_price * 100) if entry_price > 0 else 0
            if side == "short":
                profit_loss_percent = -profit_loss_percent

            # Update position with reduced quantity
            current_realized_pnl = float(position.get("realized_pnl", 0))
            self.supabase.table("bot_positions").update({
                "quantity": new_quantity,
                "realized_pnl": current_realized_pnl + profit_loss
            }).eq("id", position["id"]).execute()

            # Record exit event
            self.supabase.table("exit_events").insert({
                "user_id": user_id,
                "position_id": position["id"],
                "strategy_id": position["strategy_id"],
                "symbol": symbol,
                "exit_type": "take_profit",
                "exit_price": exit_price,
                "entry_price": entry_price,
                "exit_quantity": exit_quantity,
                "exit_reason": reason,
                "profit_loss": profit_loss,
                "profit_loss_percent": profit_loss_percent,
                "alpaca_order_id": order.id,
                "executed_at": datetime.now(timezone.utc).isoformat()
            }).execute()

            logger.info(f"💰 Partial exit: {symbol} | {exit_quantity} shares | P&L: ${profit_loss:.2f}")

        except Exception as e:
            logger.error(f"❌ Error executing partial exit: {e}", exc_info=True)
