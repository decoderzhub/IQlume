"""
Iron Condor Strategy Executor

A neutral strategy that profits from low volatility. Combines:
- Short call spread (OTM)
- Short put spread (OTM)
Maximum profit when underlying stays between short strikes at expiration.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class IronCondorExecutor(BaseStrategyExecutor):
    """Executor for iron condor options strategy"""

    async def execute(self, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute iron condor strategy logic"""
        try:
            strategy_id = strategy_data.get("id")
            strategy_name = strategy_data.get("name", "Unknown Strategy")
            configuration = strategy_data.get("configuration", {})

            self.logger.info(f"🦅 Executing iron condor strategy: {strategy_name}")

            symbol = configuration.get("symbol", "SPY")
            allocated_capital = configuration.get("allocated_capital", 1000)
            wing_width = configuration.get("wing_width", 10)
            expiration_days = configuration.get("expiration_days", 45)
            profit_target_percent = configuration.get("profit_target_percent", 50)
            stop_loss_percent = configuration.get("stop_loss_percent", 200)

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

            short_call_strike = self.round_to_nearest_strike(current_price * 1.05)
            long_call_strike = short_call_strike + wing_width
            short_put_strike = self.round_to_nearest_strike(current_price * 0.95)
            long_put_strike = short_put_strike - wing_width

            expiration_date = self.get_expiration_date(expiration_days)

            self.logger.info(f"💰 Underlying: ${current_price:.2f}")
            self.logger.info(f"📊 Call Spread: ${short_call_strike:.2f}/${long_call_strike:.2f}")
            self.logger.info(f"📊 Put Spread: ${short_put_strike:.2f}/${long_put_strike:.2f}")
            self.logger.info(f"📅 Expiration: {expiration_date}")

            telemetry_data = strategy_data.get("telemetry_data", {})
            if not isinstance(telemetry_data, dict):
                telemetry_data = {}

            position_opened = telemetry_data.get("position_opened", False)

            if not position_opened:
                self.logger.info(f"🚀 Opening Iron Condor")

                telemetry_data["position_opened"] = True
                telemetry_data["entry_price"] = current_price
                telemetry_data["short_call_strike"] = short_call_strike
                telemetry_data["long_call_strike"] = long_call_strike
                telemetry_data["short_put_strike"] = short_put_strike
                telemetry_data["long_put_strike"] = long_put_strike
                telemetry_data["expiration_date"] = expiration_date.isoformat()
                telemetry_data["opened_at"] = datetime.now(timezone.utc).isoformat()
                telemetry_data["max_profit"] = allocated_capital * 0.2
                telemetry_data["max_loss"] = wing_width * 100 - (allocated_capital * 0.2)

                self.update_strategy_telemetry(strategy_id, telemetry_data)

                return {
                    "action": "open_iron_condor",
                    "symbol": symbol,
                    "quantity": 1,
                    "price": current_price,
                    "reason": f"Iron Condor opened: Profit zone ${short_put_strike:.2f}-${short_call_strike:.2f}"
                }

            else:
                entry_price = telemetry_data.get("entry_price", current_price)
                short_call = telemetry_data.get("short_call_strike", short_call_strike)
                short_put = telemetry_data.get("short_put_strike", short_put_strike)
                max_profit = telemetry_data.get("max_profit", 0)

                price_change_percent = abs((current_price - entry_price) / entry_price) * 100

                in_profit_zone = short_put < current_price < short_call
                breached_upside = current_price >= short_call
                breached_downside = current_price <= short_put

                self.logger.info(f"📍 Iron Condor Position | Entry: ${entry_price:.2f} | Current: ${current_price:.2f}")
                self.logger.info(f"📊 Profit Zone: ${short_put:.2f}-${short_call:.2f} | In Zone: {in_profit_zone}")

                days_to_expiration = self.calculate_days_to_expiration(
                    telemetry_data.get("expiration_date")
                )

                should_close = False
                close_reason = None

                if days_to_expiration is not None and days_to_expiration <= 7:
                    if in_profit_zone:
                        should_close = True
                        close_reason = "Near expiration - in profit zone"
                    elif days_to_expiration <= 3:
                        should_close = True
                        close_reason = "Expiration imminent"

                elif breached_upside or breached_downside:
                    if price_change_percent >= stop_loss_percent / 100:
                        should_close = True
                        close_reason = "Stop loss - price breached short strike"

                if should_close:
                    self.logger.info(f"✅ Closing Iron Condor: {close_reason}")

                    telemetry_data["position_opened"] = False
                    telemetry_data["closed_at"] = datetime.now(timezone.utc).isoformat()
                    telemetry_data["close_price"] = current_price
                    telemetry_data["close_reason"] = close_reason

                    self.update_strategy_telemetry(strategy_id, telemetry_data)

                    return {
                        "action": "close_iron_condor",
                        "symbol": symbol,
                        "quantity": 1,
                        "price": current_price,
                        "reason": f"Iron Condor closed: {close_reason}"
                    }

                status = "in profit zone" if in_profit_zone else "breached"
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": f"Holding iron condor ({status}). DTE: {days_to_expiration}, Price: ${current_price:.2f}"
                }

        except Exception as e:
            self.logger.error(f"❌ Critical error in iron condor strategy: {e}")
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
