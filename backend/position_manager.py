"""
Position Manager

Advanced position tracking, risk management, and portfolio optimization.
"""

import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone
from decimal import Decimal

logger = logging.getLogger(__name__)

class PositionManager:
    """Manages position sizing, risk limits, and portfolio allocation"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def calculate_position_size(
        self,
        account_balance: float,
        risk_percent: float,
        entry_price: float,
        stop_loss_price: Optional[float] = None,
        max_position_size: Optional[float] = None
    ) -> float:
        """
        Calculate optimal position size based on risk parameters

        Args:
            account_balance: Total account balance
            risk_percent: Percentage of account to risk (e.g., 1.0 for 1%)
            entry_price: Entry price for the position
            stop_loss_price: Stop loss price (optional)
            max_position_size: Maximum position size in USD (optional)

        Returns:
            Position size in quantity
        """
        risk_amount = account_balance * (risk_percent / 100)

        if stop_loss_price and entry_price > 0:
            price_diff = abs(entry_price - stop_loss_price)
            if price_diff > 0:
                position_size = risk_amount / price_diff
            else:
                position_size = risk_amount / entry_price
        else:
            default_stop_distance = entry_price * 0.02
            position_size = risk_amount / default_stop_distance

        if max_position_size:
            max_quantity = max_position_size / entry_price
            position_size = min(position_size, max_quantity)

        return max(0, position_size)

    def calculate_kelly_criterion(
        self,
        win_rate: float,
        avg_win: float,
        avg_loss: float
    ) -> float:
        """
        Calculate optimal position size using Kelly Criterion

        Args:
            win_rate: Historical win rate (0-1)
            avg_win: Average winning trade amount
            avg_loss: Average losing trade amount

        Returns:
            Optimal position size as fraction of capital (0-1)
        """
        if avg_loss == 0 or win_rate == 0:
            return 0.0

        win_loss_ratio = avg_win / abs(avg_loss)
        kelly = (win_rate * win_loss_ratio - (1 - win_rate)) / win_loss_ratio

        kelly = max(0, min(kelly, 0.25))

        return kelly

    def check_portfolio_limits(
        self,
        current_positions: List[Dict[str, Any]],
        new_position_value: float,
        max_portfolio_risk: float = 10.0,
        max_position_correlation: float = 0.7
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if new position violates portfolio limits

        Returns:
            (is_allowed, reason)
        """
        total_exposure = sum(
            float(pos.get("quantity", 0)) * float(pos.get("current_price", 0))
            for pos in current_positions
            if not pos.get("is_closed", False)
        )

        total_exposure += new_position_value

        symbols = [pos.get("symbol") for pos in current_positions if not pos.get("is_closed", False)]

        if len(symbols) >= 20:
            return False, "Maximum number of open positions reached"

        return True, None

    def calculate_risk_reward_ratio(
        self,
        entry_price: float,
        take_profit: float,
        stop_loss: float
    ) -> float:
        """Calculate risk/reward ratio for a trade"""
        if stop_loss == 0 or entry_price == stop_loss:
            return 0.0

        potential_profit = abs(take_profit - entry_price)
        potential_loss = abs(entry_price - stop_loss)

        if potential_loss == 0:
            return 0.0

        return potential_profit / potential_loss

    def should_take_profit(
        self,
        entry_price: float,
        current_price: float,
        take_profit_percent: float,
        trailing_stop: bool = False,
        highest_price: Optional[float] = None
    ) -> Tuple[bool, Optional[float]]:
        """
        Determine if take profit conditions are met

        Returns:
            (should_exit, exit_price)
        """
        price_change_percent = ((current_price - entry_price) / entry_price) * 100

        if price_change_percent >= take_profit_percent:
            return True, current_price

        if trailing_stop and highest_price:
            trailing_stop_price = highest_price * (1 - take_profit_percent / 100)
            if current_price <= trailing_stop_price:
                return True, current_price

        return False, None

    def should_stop_loss(
        self,
        entry_price: float,
        current_price: float,
        stop_loss_percent: float
    ) -> Tuple[bool, Optional[float]]:
        """
        Determine if stop loss should be triggered

        Returns:
            (should_exit, exit_price)
        """
        price_change_percent = ((current_price - entry_price) / entry_price) * 100

        if price_change_percent <= -stop_loss_percent:
            return True, current_price

        return False, None

    def calculate_position_metrics(
        self,
        positions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate aggregate portfolio metrics"""
        if not positions:
            return {
                "total_positions": 0,
                "total_value": 0,
                "total_unrealized_pnl": 0,
                "total_realized_pnl": 0,
                "avg_unrealized_pnl_percent": 0,
                "win_rate": 0,
                "largest_position": None
            }

        open_positions = [p for p in positions if not p.get("is_closed", False)]
        closed_positions = [p for p in positions if p.get("is_closed", False)]

        total_value = sum(
            float(p.get("quantity", 0)) * float(p.get("current_price", 0))
            for p in open_positions
        )

        total_unrealized_pnl = sum(
            float(p.get("unrealized_pnl", 0))
            for p in open_positions
        )

        total_realized_pnl = sum(
            float(p.get("realized_pnl", 0))
            for p in closed_positions
        )

        avg_unrealized_pnl_percent = 0
        if open_positions:
            avg_unrealized_pnl_percent = sum(
                float(p.get("unrealized_pnl_percent", 0))
                for p in open_positions
            ) / len(open_positions)

        winning_trades = len([p for p in closed_positions if float(p.get("realized_pnl", 0)) > 0])
        win_rate = (winning_trades / len(closed_positions) * 100) if closed_positions else 0

        largest_position = None
        if open_positions:
            largest_position = max(
                open_positions,
                key=lambda p: float(p.get("quantity", 0)) * float(p.get("current_price", 0))
            )

        return {
            "total_positions": len(open_positions),
            "total_value": total_value,
            "total_unrealized_pnl": total_unrealized_pnl,
            "total_realized_pnl": total_realized_pnl,
            "avg_unrealized_pnl_percent": avg_unrealized_pnl_percent,
            "win_rate": win_rate,
            "largest_position": largest_position,
            "closed_trades": len(closed_positions),
            "winning_trades": winning_trades
        }

    def apply_grid_position_sizing(
        self,
        total_capital: float,
        num_grids: int,
        price_range: Tuple[float, float],
        mode: str = "arithmetic"
    ) -> List[Dict[str, Any]]:
        """
        Calculate position sizes for grid trading

        Args:
            total_capital: Total capital allocated to grid
            num_grids: Number of grid levels
            price_range: (lower_price, upper_price)
            mode: 'arithmetic' or 'geometric'

        Returns:
            List of grid levels with price and quantity
        """
        lower_price, upper_price = price_range
        capital_per_grid = total_capital / num_grids

        grid_levels = []

        if mode == "arithmetic":
            price_step = (upper_price - lower_price) / (num_grids - 1)
            for i in range(num_grids):
                price = lower_price + (i * price_step)
                quantity = capital_per_grid / price
                grid_levels.append({
                    "level": i,
                    "price": price,
                    "quantity": quantity,
                    "capital": capital_per_grid
                })

        elif mode == "geometric":
            ratio = (upper_price / lower_price) ** (1 / (num_grids - 1))
            for i in range(num_grids):
                price = lower_price * (ratio ** i)
                quantity = capital_per_grid / price
                grid_levels.append({
                    "level": i,
                    "price": price,
                    "quantity": quantity,
                    "capital": capital_per_grid
                })

        return grid_levels

    def calculate_drawdown(
        self,
        performance_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate maximum drawdown from performance history"""
        if not performance_history:
            return {
                "max_drawdown": 0,
                "max_drawdown_percent": 0,
                "current_drawdown": 0,
                "peak_value": 0
            }

        sorted_history = sorted(performance_history, key=lambda x: x.get("snapshot_date", ""))

        peak_value = 0
        max_drawdown = 0
        max_drawdown_percent = 0

        for snapshot in sorted_history:
            portfolio_value = float(snapshot.get("portfolio_value", 0))

            if portfolio_value > peak_value:
                peak_value = portfolio_value

            drawdown = peak_value - portfolio_value
            drawdown_percent = (drawdown / peak_value * 100) if peak_value > 0 else 0

            if drawdown > max_drawdown:
                max_drawdown = drawdown
                max_drawdown_percent = drawdown_percent

        current_value = float(sorted_history[-1].get("portfolio_value", 0)) if sorted_history else 0
        current_drawdown = peak_value - current_value

        return {
            "max_drawdown": max_drawdown,
            "max_drawdown_percent": max_drawdown_percent,
            "current_drawdown": current_drawdown,
            "peak_value": peak_value
        }
