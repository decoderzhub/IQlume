"""
Risk Management Service

Provides comprehensive risk management controls including:
- Position sizing limits
- Daily loss limits
- Buying power checks
- Portfolio drawdown monitoring
- Maximum position count enforcement
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from alpaca.trading.client import TradingClient
from alpaca.common.exceptions import APIError as AlpacaAPIError
from supabase import Client

logger = logging.getLogger(__name__)


class RiskManagementService:
    """Service for enforcing risk management rules"""

    def __init__(self, trading_client: TradingClient, supabase: Client):
        self.trading_client = trading_client
        self.supabase = supabase
        self.logger = logging.getLogger(__name__)

    async def validate_trade(
        self,
        user_id: str,
        strategy_id: str,
        symbol: str,
        side: str,
        quantity: float,
        price: float,
        strategy_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate a trade against all risk management rules

        Returns:
            Dict with 'allowed' (bool) and 'reason' (str) if not allowed
        """
        try:
            # 1. Check buying power
            buying_power_check = await self.check_buying_power(quantity, price, side)
            if not buying_power_check["allowed"]:
                return buying_power_check

            # 2. Check daily loss limits
            daily_loss_check = await self.check_daily_loss_limit(user_id, strategy_config)
            if not daily_loss_check["allowed"]:
                return daily_loss_check

            # 3. Check position size limits
            position_size_check = await self.check_position_size_limit(
                symbol, quantity, price, strategy_config
            )
            if not position_size_check["allowed"]:
                return position_size_check

            # 4. Check maximum positions
            max_positions_check = await self.check_max_positions(user_id, strategy_config)
            if not max_positions_check["allowed"]:
                return max_positions_check

            # 5. Check portfolio drawdown
            drawdown_check = await self.check_portfolio_drawdown(user_id, strategy_config)
            if not drawdown_check["allowed"]:
                return drawdown_check

            # All checks passed
            return {"allowed": True, "reason": "All risk checks passed"}

        except Exception as e:
            self.logger.error(f"❌ Error validating trade: {e}", exc_info=True)
            return {
                "allowed": False,
                "reason": f"Risk validation error: {str(e)}"
            }

    async def check_buying_power(
        self,
        quantity: float,
        price: float,
        side: str
    ) -> Dict[str, Any]:
        """Check if user has sufficient buying power"""
        try:
            if side.lower() != "buy":
                # Selling doesn't require buying power check
                return {"allowed": True}

            account = self.trading_client.get_account()
            buying_power = float(account.buying_power)
            required_capital = quantity * price

            if buying_power < required_capital:
                return {
                    "allowed": False,
                    "reason": f"Insufficient buying power. Required: ${required_capital:.2f}, Available: ${buying_power:.2f}"
                }

            return {"allowed": True}

        except AlpacaAPIError as e:
            self.logger.error(f"❌ Alpaca API error checking buying power: {e}")
            return {
                "allowed": False,
                "reason": "Unable to verify buying power. Please try again."
            }
        except Exception as e:
            self.logger.error(f"❌ Error checking buying power: {e}")
            return {
                "allowed": False,
                "reason": "Error checking buying power"
            }

    async def check_daily_loss_limit(
        self,
        user_id: str,
        strategy_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check if daily loss limit has been exceeded"""
        try:
            risk_controls = strategy_config.get("risk_controls", {})
            max_daily_loss = risk_controls.get("max_daily_loss_usd")

            if not max_daily_loss:
                # No daily loss limit configured
                return {"allowed": True}

            # Get today's trades for this user
            today = datetime.now(timezone.utc).date()
            resp = self.supabase.table("trades").select("profit_loss").eq(
                "user_id", user_id
            ).gte("timestamp", today.isoformat()).execute()

            if not resp.data:
                return {"allowed": True}

            # Calculate total P&L for today
            total_pnl = sum(float(trade.get("profit_loss", 0)) for trade in resp.data)

            if total_pnl < 0 and abs(total_pnl) >= max_daily_loss:
                return {
                    "allowed": False,
                    "reason": f"Daily loss limit reached. Today's loss: ${abs(total_pnl):.2f}, Limit: ${max_daily_loss:.2f}"
                }

            return {"allowed": True}

        except Exception as e:
            self.logger.error(f"❌ Error checking daily loss limit: {e}")
            # Allow trade on error to avoid blocking legitimate trades
            return {"allowed": True}

    async def check_position_size_limit(
        self,
        symbol: str,
        quantity: float,
        price: float,
        strategy_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check if position size is within limits"""
        try:
            risk_controls = strategy_config.get("risk_controls", {})
            max_position_percent = risk_controls.get("max_position_size_percent", 20)

            # Get account equity
            account = self.trading_client.get_account()
            equity = float(account.equity)

            position_value = quantity * price
            position_percent = (position_value / equity) * 100

            if position_percent > max_position_percent:
                return {
                    "allowed": False,
                    "reason": f"Position size too large. {position_percent:.1f}% of portfolio exceeds {max_position_percent}% limit"
                }

            return {"allowed": True}

        except AlpacaAPIError as e:
            self.logger.error(f"❌ Alpaca API error checking position size: {e}")
            # Allow trade on error
            return {"allowed": True}
        except Exception as e:
            self.logger.error(f"❌ Error checking position size: {e}")
            return {"allowed": True}

    async def check_max_positions(
        self,
        user_id: str,
        strategy_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check if maximum number of positions has been reached"""
        try:
            capital_allocation = strategy_config.get("capital_allocation", {})
            max_positions = capital_allocation.get("max_positions")

            if not max_positions:
                # No position limit configured
                return {"allowed": True}

            # Get current positions
            positions = self.trading_client.get_all_positions()
            current_position_count = len(positions)

            if current_position_count >= max_positions:
                return {
                    "allowed": False,
                    "reason": f"Maximum positions reached. Current: {current_position_count}, Limit: {max_positions}"
                }

            return {"allowed": True}

        except AlpacaAPIError as e:
            self.logger.error(f"❌ Alpaca API error checking max positions: {e}")
            return {"allowed": True}
        except Exception as e:
            self.logger.error(f"❌ Error checking max positions: {e}")
            return {"allowed": True}

    async def check_portfolio_drawdown(
        self,
        user_id: str,
        strategy_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check if portfolio drawdown exceeds limit"""
        try:
            risk_controls = strategy_config.get("risk_controls", {})
            max_drawdown_percent = risk_controls.get("max_drawdown_percent")

            if not max_drawdown_percent:
                # No drawdown limit configured
                return {"allowed": True}

            # Get account info
            account = self.trading_client.get_account()
            current_equity = float(account.equity)

            # Get peak equity from last 30 days
            thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            resp = self.supabase.table("bot_performance_history").select(
                "portfolio_value"
            ).eq("user_id", user_id).gte("snapshot_date", thirty_days_ago).execute()

            if not resp.data:
                # No historical data, allow trade
                return {"allowed": True}

            peak_equity = max(float(record["portfolio_value"]) for record in resp.data)

            # Calculate current drawdown
            if peak_equity > 0:
                drawdown_percent = ((peak_equity - current_equity) / peak_equity) * 100

                if drawdown_percent > max_drawdown_percent:
                    return {
                        "allowed": False,
                        "reason": f"Portfolio drawdown too high. Current: {drawdown_percent:.1f}%, Limit: {max_drawdown_percent}%"
                    }

            return {"allowed": True}

        except AlpacaAPIError as e:
            self.logger.error(f"❌ Alpaca API error checking drawdown: {e}")
            return {"allowed": True}
        except Exception as e:
            self.logger.error(f"❌ Error checking drawdown: {e}")
            return {"allowed": True}

    async def check_strategy_risk_event(
        self,
        strategy_id: str,
        user_id: str
    ) -> bool:
        """Check if strategy has any unresolved risk events"""
        try:
            resp = self.supabase.table("bot_risk_events").select("id").eq(
                "strategy_id", strategy_id
            ).eq("resolved", False).eq("severity", "critical").execute()

            return len(resp.data) > 0 if resp.data else False

        except Exception as e:
            self.logger.error(f"❌ Error checking risk events: {e}")
            return False

    async def log_risk_violation(
        self,
        user_id: str,
        strategy_id: str,
        violation_type: str,
        details: Dict[str, Any]
    ):
        """Log a risk management violation"""
        try:
            event_data = {
                "user_id": user_id,
                "strategy_id": strategy_id,
                "event_type": violation_type,
                "severity": "warning",
                "event_data": details,
                "resolved": False,
            }

            self.supabase.table("bot_risk_events").insert(event_data).execute()
            self.logger.warning(f"⚠️ Risk violation logged: {violation_type} for strategy {strategy_id}")

        except Exception as e:
            self.logger.error(f"❌ Error logging risk violation: {e}")

    async def enforce_stop_loss(
        self,
        position_id: str,
        current_price: float,
        entry_price: float,
        stop_loss_percent: float
    ) -> bool:
        """Check if stop loss should be triggered"""
        try:
            loss_percent = ((entry_price - current_price) / entry_price) * 100

            if loss_percent >= stop_loss_percent:
                self.logger.warning(
                    f"⚠️ Stop loss triggered for position {position_id}. "
                    f"Loss: {loss_percent:.2f}%, Stop: {stop_loss_percent}%"
                )
                return True

            return False

        except Exception as e:
            self.logger.error(f"❌ Error checking stop loss: {e}")
            return False

    async def enforce_take_profit(
        self,
        position_id: str,
        current_price: float,
        entry_price: float,
        take_profit_percent: float
    ) -> bool:
        """Check if take profit should be triggered"""
        try:
            profit_percent = ((current_price - entry_price) / entry_price) * 100

            if profit_percent >= take_profit_percent:
                self.logger.info(
                    f"✅ Take profit triggered for position {position_id}. "
                    f"Profit: {profit_percent:.2f}%, Target: {take_profit_percent}%"
                )
                return True

            return False

        except Exception as e:
            self.logger.error(f"❌ Error checking take profit: {e}")
            return False
