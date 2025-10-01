"""
Straddle Strategy Executor

Long Straddle: Buy both a call and put at the same strike (ATM)
Short Straddle: Sell both a call and put at the same strike (ATM)
Profits from high volatility (long) or low volatility (short)
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class StraddleExecutor(BaseStrategyExecutor):
    """Executor for straddle options strategies"""

    async def execute(self, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute straddle strategy logic"""
        try:
            strategy_id = strategy_data.get("id")
            strategy_name = strategy_data.get("name", "Unknown Strategy")
            configuration = strategy_data.get("configuration", {})

            self.logger.info(f"🎯 Executing straddle strategy: {strategy_name}")

            symbol = configuration.get("symbol", "SPY")
            direction = configuration.get("direction", "long")
            allocated_capital = configuration.get("allocated_capital", 1000)
            expiration_days = configuration.get("expiration_days", 30)
            profit_target_percent = configuration.get("profit_target_percent", 50)
            stop_loss_percent = configuration.get("stop_loss_percent", 50)

            current_price = self.get_current_price(symbol)
            if not current_price:
                return {
                    "action": "error",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": 0,
                    "reason": f"Unable to fetch current price for {symbol}"
                }

            is_market_open = self.is_market_open(symbol)
            if not is_market_open:
                market_status = self.get_market_status_message(symbol)
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": f"Market is closed. {market_status}"
                }

            atm_strike = self.round_to_nearest_strike(current_price)
            expiration_date = self.get_expiration_date(expiration_days)

            self.logger.info(f"💰 Underlying: ${current_price:.2f} | ATM Strike: ${atm_strike:.2f}")
            self.logger.info(f"📅 Expiration: {expiration_date} | Direction: {direction.upper()}")

            telemetry_data = strategy_data.get("telemetry_data", {})
            if not isinstance(telemetry_data, dict):
                telemetry_data = {}

            position_opened = telemetry_data.get("position_opened", False)

            if not position_opened:
                if direction == "long":
                    self.logger.info(f"🚀 Opening LONG Straddle: Buy ATM Call + Buy ATM Put")

                    telemetry_data["position_opened"] = True
                    telemetry_data["entry_price"] = current_price
                    telemetry_data["strike_price"] = atm_strike
                    telemetry_data["expiration_date"] = expiration_date.isoformat()
                    telemetry_data["direction"] = "long"
                    telemetry_data["opened_at"] = datetime.now(timezone.utc).isoformat()

                    self.update_strategy_telemetry(strategy_id, telemetry_data)

                    return {
                        "action": "open_straddle",
                        "symbol": symbol,
                        "quantity": 1,
                        "price": current_price,
                        "reason": f"Long Straddle opened at ${atm_strike:.2f} strike, expires {expiration_date}"
                    }

                elif direction == "short":
                    self.logger.info(f"🚀 Opening SHORT Straddle: Sell ATM Call + Sell ATM Put")

                    telemetry_data["position_opened"] = True
                    telemetry_data["entry_price"] = current_price
                    telemetry_data["strike_price"] = atm_strike
                    telemetry_data["expiration_date"] = expiration_date.isoformat()
                    telemetry_data["direction"] = "short"
                    telemetry_data["opened_at"] = datetime.now(timezone.utc).isoformat()

                    self.update_strategy_telemetry(strategy_id, telemetry_data)

                    return {
                        "action": "open_straddle",
                        "symbol": symbol,
                        "quantity": 1,
                        "price": current_price,
                        "reason": f"Short Straddle opened at ${atm_strike:.2f} strike, expires {expiration_date}"
                    }

            else:
                entry_price = telemetry_data.get("entry_price", current_price)
                strike_price = telemetry_data.get("strike_price", atm_strike)
                position_direction = telemetry_data.get("direction", direction)

                price_move_percent = abs((current_price - entry_price) / entry_price) * 100

                self.logger.info(f"📍 Straddle Position: {position_direction.upper()} | Entry: ${entry_price:.2f} | Current: ${current_price:.2f}")
                self.logger.info(f"📊 Price Move: {price_move_percent:.2f}%")

                should_take_profit = False
                should_stop_loss = False

                if position_direction == "long":
                    should_take_profit = price_move_percent >= profit_target_percent / 100
                    should_stop_loss = price_move_percent < stop_loss_percent / 100 / 2

                elif position_direction == "short":
                    should_take_profit = price_move_percent < profit_target_percent / 100 / 2
                    should_stop_loss = price_move_percent >= stop_loss_percent / 100

                days_to_expiration = self.calculate_days_to_expiration(
                    telemetry_data.get("expiration_date")
                )

                if days_to_expiration is not None and days_to_expiration <= 5:
                    should_take_profit = True
                    reason = "Near expiration"
                elif should_take_profit:
                    reason = "Profit target reached"
                elif should_stop_loss:
                    reason = "Stop loss triggered"
                else:
                    reason = None

                if reason:
                    self.logger.info(f"✅ Closing Straddle: {reason}")

                    telemetry_data["position_opened"] = False
                    telemetry_data["closed_at"] = datetime.now(timezone.utc).isoformat()
                    telemetry_data["close_price"] = current_price
                    telemetry_data["close_reason"] = reason

                    self.update_strategy_telemetry(strategy_id, telemetry_data)

                    return {
                        "action": "close_straddle",
                        "symbol": symbol,
                        "quantity": 1,
                        "price": current_price,
                        "reason": f"Straddle closed: {reason}"
                    }

                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": f"Holding {position_direction} straddle. Price move: {price_move_percent:.2f}%, DTE: {days_to_expiration}"
                }

        except Exception as e:
            self.logger.error(f"❌ Critical error in straddle strategy: {e}")
            return {
                "action": "error",
                "symbol": symbol if 'symbol' in locals() else "Unknown",
                "quantity": 0,
                "price": 0,
                "reason": f"Critical error: {str(e)}"
            }

    def round_to_nearest_strike(self, price: float, interval: float = 5.0) -> float:
        """Round price to nearest strike price interval"""
        return round(price / interval) * interval

    def get_expiration_date(self, days: int) -> datetime:
        """Get option expiration date (next Friday after specified days)"""
        target_date = datetime.now(timezone.utc) + timedelta(days=days)
        days_until_friday = (4 - target_date.weekday()) % 7
        expiration = target_date + timedelta(days=days_until_friday)
        return expiration.replace(hour=16, minute=0, second=0, microsecond=0)

    def calculate_days_to_expiration(self, expiration_date_str: Optional[str]) -> Optional[int]:
        """Calculate days remaining until expiration"""
        if not expiration_date_str:
            return None

        try:
            expiration = datetime.fromisoformat(expiration_date_str.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            delta = expiration - now
            return delta.days
        except:
            return None
