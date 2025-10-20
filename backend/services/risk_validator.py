"""
Risk Validation Service

Multi-layer risk validation system that checks every trade before execution.
Protects users from catastrophic losses through comprehensive safety checks.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from supabase import Client

logger = logging.getLogger(__name__)


class RiskValidationError(Exception):
    """Raised when a trade fails risk validation"""
    pass


class RiskValidator:
    """
    Core risk validation service implementing multi-layer safety checks.

    Validates:
    - Account balance and buying power
    - Position size limits
    - Portfolio exposure limits
    - Daily loss limits
    - Market hours
    - Strategy-specific risk controls
    """

    def __init__(self, supabase: Client):
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
        account_balance: float,
        buying_power: float
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate a trade against all risk checks.

        Returns:
            Tuple of (is_valid, error_message)
            - (True, None) if trade passes all checks
            - (False, error_message) if trade fails any check
        """
        try:
            # Get strategy configuration and risk controls
            strategy = await self._get_strategy(strategy_id, user_id)
            if not strategy:
                return False, "Strategy not found"

            risk_controls = strategy.get('risk_controls', {})

            # Calculate trade value
            trade_value = quantity * price

            # 1. Validate buying power
            is_valid, error = self._validate_buying_power(
                trade_value, buying_power, side
            )
            if not is_valid:
                return False, error

            # 2. Validate position size limits
            is_valid, error = await self._validate_position_size(
                user_id, strategy_id, symbol, side, quantity, price,
                account_balance, risk_controls
            )
            if not is_valid:
                return False, error

            # 3. Validate portfolio exposure
            is_valid, error = await self._validate_portfolio_exposure(
                user_id, symbol, trade_value, account_balance
            )
            if not is_valid:
                return False, error

            # 4. Validate daily loss limits
            is_valid, error = await self._validate_daily_loss_limit(
                user_id, strategy_id, risk_controls
            )
            if not is_valid:
                return False, error

            # 5. Validate strategy-specific limits
            is_valid, error = await self._validate_strategy_limits(
                user_id, strategy_id, strategy, account_balance
            )
            if not is_valid:
                return False, error

            # 6. Validate market hours (if required)
            is_valid, error = self._validate_market_hours(strategy)
            if not is_valid:
                return False, error

            self.logger.info(
                f"✅ Trade validation passed for {symbol}: "
                f"{side} {quantity} @ ${price}"
            )
            return True, None

        except Exception as e:
            self.logger.error(f"❌ Risk validation error: {e}", exc_info=True)
            return False, f"Risk validation error: {str(e)}"

    def _validate_buying_power(
        self,
        trade_value: float,
        buying_power: float,
        side: str
    ) -> Tuple[bool, Optional[str]]:
        """Validate sufficient buying power for the trade"""
        if side.lower() == 'buy':
            if trade_value > buying_power:
                return False, (
                    f"Insufficient buying power. Required: ${trade_value:.2f}, "
                    f"Available: ${buying_power:.2f}"
                )

        return True, None

    async def _validate_position_size(
        self,
        user_id: str,
        strategy_id: str,
        symbol: str,
        side: str,
        quantity: float,
        price: float,
        account_balance: float,
        risk_controls: Dict[str, Any]
    ) -> Tuple[bool, Optional[str]]:
        """Validate position size against limits"""
        trade_value = quantity * price

        # Get platform default limits
        platform_config = await self._get_platform_config('default_risk_limits')
        default_limits = platform_config.get('value', {})

        # Get max position size percentage (default 20%)
        max_position_percent = risk_controls.get(
            'max_position_size_percent',
            default_limits.get('max_position_size_percent', 20)
        )

        max_position_value = (account_balance * max_position_percent) / 100

        if trade_value > max_position_value:
            return False, (
                f"Position size exceeds limit. Trade value: ${trade_value:.2f}, "
                f"Max allowed: ${max_position_value:.2f} "
                f"({max_position_percent}% of account)"
            )

        # Check if adding to existing position would exceed limit
        if side.lower() == 'buy':
            current_position = await self._get_current_position_value(
                user_id, strategy_id, symbol
            )
            total_position_value = current_position + trade_value

            if total_position_value > max_position_value:
                return False, (
                    f"Total position size would exceed limit. "
                    f"Current: ${current_position:.2f}, "
                    f"Adding: ${trade_value:.2f}, "
                    f"Max: ${max_position_value:.2f}"
                )

        return True, None

    async def _validate_portfolio_exposure(
        self,
        user_id: str,
        symbol: str,
        trade_value: float,
        account_balance: float
    ) -> Tuple[bool, Optional[str]]:
        """Validate total portfolio exposure to a single symbol"""
        # Get total exposure across all strategies
        result = self.supabase.table('bot_positions').select(
            'quantity, current_price'
        ).eq('user_id', user_id).eq('symbol', symbol).eq(
            'is_closed', False
        ).execute()

        total_exposure = sum(
            float(pos['quantity']) * float(pos['current_price'])
            for pos in result.data
        )

        # Add new trade value
        total_exposure += trade_value

        # Maximum 30% exposure to single symbol
        max_exposure = account_balance * 0.30

        if total_exposure > max_exposure:
            return False, (
                f"Total exposure to {symbol} would exceed 30% of portfolio. "
                f"Current: ${total_exposure - trade_value:.2f}, "
                f"Adding: ${trade_value:.2f}, "
                f"Max: ${max_exposure:.2f}"
            )

        return True, None

    async def _validate_daily_loss_limit(
        self,
        user_id: str,
        strategy_id: str,
        risk_controls: Dict[str, Any]
    ) -> Tuple[bool, Optional[str]]:
        """Validate daily loss limit hasn't been breached"""
        max_daily_loss_usd = risk_controls.get('max_daily_loss_usd')

        if max_daily_loss_usd:
            # Get today's P&L for this strategy
            today = datetime.now(timezone.utc).date()
            result = self.supabase.table('trades').select(
                'profit_loss'
            ).eq('user_id', user_id).eq(
                'strategy_id', strategy_id
            ).gte('timestamp', today.isoformat()).execute()

            total_daily_loss = sum(
                float(t['profit_loss'])
                for t in result.data
                if float(t['profit_loss']) < 0
            )

            if abs(total_daily_loss) >= max_daily_loss_usd:
                return False, (
                    f"Daily loss limit reached. "
                    f"Loss today: ${abs(total_daily_loss):.2f}, "
                    f"Limit: ${max_daily_loss_usd:.2f}. "
                    f"Strategy has been paused."
                )

        # Check portfolio-wide daily loss limit
        platform_config = await self._get_platform_config('default_risk_limits')
        default_limits = platform_config.get('value', {})
        max_daily_loss_percent = default_limits.get('max_daily_loss_percent', 5)

        # Get user's account balance
        account = await self._get_primary_account(user_id)
        if account:
            account_balance = float(account['balance'])
            max_daily_loss_value = (account_balance * max_daily_loss_percent) / 100

            # Get today's total P&L across all strategies
            today = datetime.now(timezone.utc).date()
            result = self.supabase.table('trades').select(
                'profit_loss'
            ).eq('user_id', user_id).gte(
                'timestamp', today.isoformat()
            ).execute()

            total_daily_pnl = sum(
                float(t['profit_loss']) for t in result.data
            )

            if total_daily_pnl < -max_daily_loss_value:
                return False, (
                    f"Portfolio daily loss limit reached. "
                    f"Loss today: ${abs(total_daily_pnl):.2f}, "
                    f"Limit: ${max_daily_loss_value:.2f} ({max_daily_loss_percent}%). "
                    f"All trading has been halted."
                )

        return True, None

    async def _validate_strategy_limits(
        self,
        user_id: str,
        strategy_id: str,
        strategy: Dict[str, Any],
        account_balance: float
    ) -> Tuple[bool, Optional[str]]:
        """Validate strategy-specific limits"""
        capital_allocation = strategy.get('capital_allocation', {})

        # Validate capital allocation limit
        if capital_allocation:
            mode = capital_allocation.get('mode')
            value = capital_allocation.get('value', 0)

            # Get current capital deployed
            result = self.supabase.table('bot_positions').select(
                'quantity, entry_price'
            ).eq('strategy_id', strategy_id).eq('is_closed', False).execute()

            current_capital = sum(
                float(pos['quantity']) * float(pos['entry_price'])
                for pos in result.data
            )

            if mode == 'fixed_amount_usd':
                max_capital = value
            elif mode == 'percent_of_portfolio':
                max_capital = (account_balance * value) / 100
            else:
                max_capital = float('inf')

            if current_capital >= max_capital:
                return False, (
                    f"Strategy capital limit reached. "
                    f"Deployed: ${current_capital:.2f}, "
                    f"Limit: ${max_capital:.2f}"
                )

        # Validate max positions limit
        max_positions = capital_allocation.get('max_positions')
        if max_positions:
            result = self.supabase.table('bot_positions').select(
                'id', count='exact'
            ).eq('strategy_id', strategy_id).eq('is_closed', False).execute()

            current_positions = result.count or 0

            if current_positions >= max_positions:
                return False, (
                    f"Maximum positions limit reached. "
                    f"Current: {current_positions}, Limit: {max_positions}"
                )

        return True, None

    def _validate_market_hours(
        self,
        strategy: Dict[str, Any]
    ) -> Tuple[bool, Optional[str]]:
        """Validate trade is within allowed market hours"""
        trade_window = strategy.get('trade_window', {})

        if not trade_window.get('enabled', False):
            return True, None

        now = datetime.now(timezone.utc)
        current_time = now.strftime('%H:%M')
        current_day = now.weekday()  # 0 = Monday, 6 = Sunday

        # Check time window
        start_time = trade_window.get('start_time')
        end_time = trade_window.get('end_time')

        if start_time and end_time:
            if not (start_time <= current_time <= end_time):
                return False, (
                    f"Outside trading window. "
                    f"Current time: {current_time}, "
                    f"Allowed: {start_time} - {end_time}"
                )

        # Check day of week
        allowed_days = trade_window.get('days_of_week', [])
        if allowed_days and current_day not in allowed_days:
            day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            return False, (
                f"Trading not allowed on {day_names[current_day]}. "
                f"Allowed days: {[day_names[d] for d in allowed_days]}"
            )

        return True, None

    async def _get_strategy(
        self,
        strategy_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get strategy configuration"""
        try:
            result = self.supabase.table('trading_strategies').select(
                '*'
            ).eq('id', strategy_id).eq('user_id', user_id).single().execute()
            return result.data
        except Exception as e:
            self.logger.error(f"Error fetching strategy: {e}")
            return None

    async def _get_current_position_value(
        self,
        user_id: str,
        strategy_id: str,
        symbol: str
    ) -> float:
        """Get current position value for a symbol"""
        try:
            result = self.supabase.table('bot_positions').select(
                'quantity, current_price'
            ).eq('user_id', user_id).eq('strategy_id', strategy_id).eq(
                'symbol', symbol
            ).eq('is_closed', False).execute()

            total_value = sum(
                float(pos['quantity']) * float(pos['current_price'])
                for pos in result.data
            )
            return total_value
        except Exception as e:
            self.logger.error(f"Error fetching position value: {e}")
            return 0.0

    async def _get_platform_config(self, key: str) -> Dict[str, Any]:
        """Get platform configuration value"""
        try:
            result = self.supabase.table('platform_config').select(
                'value'
            ).eq('key', key).single().execute()
            return result.data if result.data else {}
        except Exception as e:
            self.logger.error(f"Error fetching platform config: {e}")
            return {}

    async def _get_primary_account(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's primary brokerage account"""
        try:
            result = self.supabase.table('brokerage_accounts').select(
                '*'
            ).eq('user_id', user_id).eq('is_connected', True).limit(1).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Error fetching account: {e}")
            return None

    async def calculate_risk_score(
        self,
        strategy_config: Dict[str, Any],
        backtest_results: Optional[Dict[str, Any]] = None
    ) -> float:
        """
        Calculate dynamic risk score (0-100) for a strategy.

        Score factors:
        - Max drawdown from backtest
        - Volatility of returns
        - Win rate
        - Strategy type complexity
        - Position sizing aggressiveness
        """
        risk_score = 50.0  # Base risk score

        if backtest_results:
            # Factor 1: Max Drawdown (0-40 points)
            max_drawdown = abs(backtest_results.get('max_drawdown_percent', 0))
            if max_drawdown > 50:
                risk_score += 40
            elif max_drawdown > 30:
                risk_score += 30
            elif max_drawdown > 20:
                risk_score += 20
            elif max_drawdown > 10:
                risk_score += 10

            # Factor 2: Win Rate (-20 to 0 points, reduces risk)
            win_rate = backtest_results.get('win_rate', 50)
            if win_rate > 70:
                risk_score -= 20
            elif win_rate > 60:
                risk_score -= 10
            elif win_rate < 40:
                risk_score += 10

            # Factor 3: Sharpe Ratio (-15 to 15 points)
            sharpe_ratio = backtest_results.get('sharpe_ratio', 0)
            if sharpe_ratio > 2:
                risk_score -= 15
            elif sharpe_ratio > 1:
                risk_score -= 10
            elif sharpe_ratio < 0:
                risk_score += 15
            elif sharpe_ratio < 0.5:
                risk_score += 10

        # Factor 4: Strategy Type (0-15 points)
        strategy_type = strategy_config.get('type', '')
        high_risk_strategies = [
            'scalping', 'short_straddle', 'short_strangle', 'iron_condor',
            'futures_grid', 'momentum_breakout'
        ]
        medium_risk_strategies = [
            'covered_calls', 'wheel', 'spot_grid', 'mean_reversion'
        ]

        if strategy_type in high_risk_strategies:
            risk_score += 15
        elif strategy_type not in medium_risk_strategies:
            risk_score += 5

        # Factor 5: Leverage/Position Sizing (0-10 points)
        position_sizing = strategy_config.get('position_sizing', {})
        if position_sizing.get('mode') == 'percent_equity':
            percent = position_sizing.get('value', 0)
            if percent > 50:
                risk_score += 10
            elif percent > 30:
                risk_score += 5

        # Clamp score to 0-100 range
        risk_score = max(0, min(100, risk_score))

        return risk_score
