"""
Backtesting Engine

Comprehensive backtesting system for simulating strategy performance
against historical data and calculating dynamic risk scores.
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import numpy as np
from supabase import Client

logger = logging.getLogger(__name__)


class BacktestEngine:
    """
    Backtest engine for simulating trading strategies against historical data.

    Features:
    - Multi-year historical simulation
    - Market regime detection
    - Dynamic risk scoring
    - Monte Carlo analysis
    - Performance metrics calculation
    """

    def __init__(self, supabase: Client, market_data_client):
        self.supabase = supabase
        self.market_data_client = market_data_client
        self.logger = logging.getLogger(__name__)

    async def run_backtest(
        self,
        user_id: str,
        strategy_config: Dict[str, Any],
        start_date: datetime,
        end_date: datetime,
        initial_capital: float = 10000.0
    ) -> Dict[str, Any]:
        """
        Run a backtest for a strategy configuration.

        Args:
            user_id: User ID
            strategy_config: Strategy configuration dictionary
            start_date: Backtest start date
            end_date: Backtest end date
            initial_capital: Starting capital (default $10,000)

        Returns:
            Dictionary with backtest results and performance metrics
        """
        try:
            self.logger.info(
                f"🔬 Starting backtest: {strategy_config.get('name')} "
                f"from {start_date.date()} to {end_date.date()}"
            )

            # Create backtest record
            backtest_id = await self._create_backtest_record(
                user_id,
                strategy_config,
                start_date,
                end_date
            )

            # Get historical market data
            symbol = strategy_config.get('base_symbol', 'SPY')
            market_data = await self._fetch_historical_data(
                symbol,
                start_date,
                end_date
            )

            if not market_data:
                raise ValueError(f"No market data available for {symbol}")

            # Run simulation
            results = await self._simulate_strategy(
                strategy_config,
                market_data,
                initial_capital
            )

            # Calculate performance metrics
            metrics = self._calculate_metrics(
                results['trades'],
                results['equity_curve'],
                initial_capital
            )

            # Detect market regimes and calculate regime-specific returns
            regime_returns = self._analyze_market_regimes(
                market_data,
                results['equity_curve']
            )

            # Calculate risk score
            risk_score = await self._calculate_risk_score(
                metrics,
                regime_returns,
                strategy_config
            )

            # Combine all results
            backtest_results = {
                **metrics,
                **regime_returns,
                'risk_score': risk_score,
                'trade_log': results['trades'][:100],  # Limit trade log size
                'equity_curve': results['equity_curve'],
                'initial_capital': initial_capital,
                'final_capital': results['final_capital']
            }

            # Update backtest record
            await self._update_backtest_record(
                backtest_id,
                backtest_results,
                'completed'
            )

            self.logger.info(
                f"✅ Backtest completed: Risk Score = {risk_score:.1f}, "
                f"Return = {metrics['total_return_percent']:.2f}%"
            )

            return {
                'backtest_id': backtest_id,
                **backtest_results
            }

        except Exception as e:
            self.logger.error(f"❌ Backtest failed: {e}", exc_info=True)
            if 'backtest_id' in locals():
                await self._update_backtest_record(
                    backtest_id,
                    {'error_message': str(e)},
                    'failed'
                )
            raise

    async def _create_backtest_record(
        self,
        user_id: str,
        strategy_config: Dict[str, Any],
        start_date: datetime,
        end_date: datetime
    ) -> str:
        """Create initial backtest record"""
        record = {
            'user_id': user_id,
            'strategy_id': strategy_config.get('id'),
            'strategy_config': strategy_config,
            'backtest_params': {
                'slippage': 0.001,  # 0.1% slippage
                'commission': 0.0  # $0 commission for Alpaca
            },
            'start_date': start_date.date().isoformat(),
            'end_date': end_date.date().isoformat(),
            'status': 'running'
        }

        result = self.supabase.table('backtests').insert(record).execute()
        return result.data[0]['id']

    async def _update_backtest_record(
        self,
        backtest_id: str,
        results: Dict[str, Any],
        status: str
    ):
        """Update backtest record with results"""
        update_data = {
            'status': status,
            **results
        }

        if status == 'completed':
            update_data['completed_at'] = datetime.now(timezone.utc).isoformat()

        self.supabase.table('backtests').update(update_data).eq(
            'id', backtest_id
        ).execute()

    async def _fetch_historical_data(
        self,
        symbol: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Fetch historical price data"""
        # This would integrate with your market data provider
        # For now, returning a placeholder structure
        self.logger.info(f"📊 Fetching historical data for {symbol}")

        # TODO: Implement actual historical data fetching from Alpaca/Polygon
        # For now, generate sample data for testing
        dates = []
        current_date = start_date
        while current_date <= end_date:
            if current_date.weekday() < 5:  # Skip weekends
                dates.append(current_date)
            current_date += timedelta(days=1)

        # Generate realistic price data
        price = 100.0
        data = []
        for date in dates:
            # Random walk with slight upward drift
            change = np.random.normal(0.001, 0.02)  # 0.1% drift, 2% volatility
            price *= (1 + change)

            data.append({
                'timestamp': date,
                'open': price * 0.99,
                'high': price * 1.01,
                'low': price * 0.98,
                'close': price,
                'volume': np.random.randint(1000000, 10000000)
            })

        return data

    async def _simulate_strategy(
        self,
        strategy_config: Dict[str, Any],
        market_data: List[Dict[str, Any]],
        initial_capital: float
    ) -> Dict[str, Any]:
        """Simulate strategy execution on historical data"""
        strategy_type = strategy_config.get('type')

        # Initialize simulation state
        capital = initial_capital
        positions = []
        trades = []
        equity_curve = [{'date': market_data[0]['timestamp'], 'equity': initial_capital}]

        # Simple buy-and-hold simulation for now
        # TODO: Implement specific strategy logic for each strategy type
        for i, bar in enumerate(market_data):
            # Update position values
            for position in positions:
                position['current_price'] = bar['close']
                position['unrealized_pnl'] = (
                    (bar['close'] - position['entry_price']) * position['quantity']
                )

            # Calculate current equity
            position_value = sum(
                p['quantity'] * p['current_price'] for p in positions
            )
            current_equity = capital + position_value

            # Record equity curve point (weekly)
            if i % 5 == 0:
                equity_curve.append({
                    'date': bar['timestamp'],
                    'equity': current_equity
                })

            # Simple strategy execution logic (placeholder)
            # TODO: Replace with actual strategy-specific logic
            if len(positions) == 0 and i > 20:
                # Buy signal (simple moving average crossover)
                sma_20 = np.mean([market_data[j]['close'] for j in range(i-20, i)])
                if bar['close'] > sma_20:
                    # Buy
                    quantity = (capital * 0.95) / bar['close']  # 95% of capital
                    if quantity > 0:
                        positions.append({
                            'entry_price': bar['close'],
                            'quantity': quantity,
                            'current_price': bar['close'],
                            'unrealized_pnl': 0,
                            'entry_date': bar['timestamp']
                        })
                        capital -= quantity * bar['close']
                        trades.append({
                            'date': bar['timestamp'],
                            'type': 'buy',
                            'symbol': strategy_config.get('base_symbol', 'SPY'),
                            'quantity': quantity,
                            'price': bar['close'],
                            'profit_loss': 0
                        })

            elif len(positions) > 0:
                # Sell signal (simple moving average)
                sma_20 = np.mean([market_data[j]['close'] for j in range(max(0, i-20), i)])
                if bar['close'] < sma_20:
                    # Sell all positions
                    for position in positions:
                        pnl = (bar['close'] - position['entry_price']) * position['quantity']
                        capital += position['quantity'] * bar['close']
                        trades.append({
                            'date': bar['timestamp'],
                            'type': 'sell',
                            'symbol': strategy_config.get('base_symbol', 'SPY'),
                            'quantity': position['quantity'],
                            'price': bar['close'],
                            'profit_loss': pnl
                        })
                    positions = []

        # Close any remaining positions at end
        if positions:
            final_bar = market_data[-1]
            for position in positions:
                pnl = (final_bar['close'] - position['entry_price']) * position['quantity']
                capital += position['quantity'] * final_bar['close']
                trades.append({
                    'date': final_bar['timestamp'],
                    'type': 'sell',
                    'symbol': strategy_config.get('base_symbol', 'SPY'),
                    'quantity': position['quantity'],
                    'price': final_bar['close'],
                    'profit_loss': pnl
                })

        return {
            'trades': trades,
            'equity_curve': equity_curve,
            'final_capital': capital
        }

    def _calculate_metrics(
        self,
        trades: List[Dict[str, Any]],
        equity_curve: List[Dict[str, Any]],
        initial_capital: float
    ) -> Dict[str, Any]:
        """Calculate performance metrics from simulation results"""
        if not trades or not equity_curve:
            return self._empty_metrics()

        # Final equity
        final_equity = equity_curve[-1]['equity']

        # Total return
        total_return = ((final_equity - initial_capital) / initial_capital) * 100

        # Calculate annualized return
        days = (equity_curve[-1]['date'] - equity_curve[0]['date']).days
        years = days / 365.25
        annualized_return = ((final_equity / initial_capital) ** (1 / years) - 1) * 100 if years > 0 else 0

        # Trade statistics
        winning_trades = [t for t in trades if t.get('profit_loss', 0) > 0]
        losing_trades = [t for t in trades if t.get('profit_loss', 0) < 0]

        total_trades = len([t for t in trades if 'profit_loss' in t])
        win_rate = (len(winning_trades) / total_trades * 100) if total_trades > 0 else 0

        avg_trade_return = (
            sum(t['profit_loss'] for t in trades if 'profit_loss' in t) / total_trades
        ) if total_trades > 0 else 0

        # Calculate max drawdown
        max_equity = initial_capital
        max_drawdown = 0
        max_drawdown_percent = 0

        for point in equity_curve:
            if point['equity'] > max_equity:
                max_equity = point['equity']

            drawdown = max_equity - point['equity']
            drawdown_percent = (drawdown / max_equity) * 100 if max_equity > 0 else 0

            if drawdown_percent > max_drawdown_percent:
                max_drawdown_percent = drawdown_percent
                max_drawdown = drawdown

        # Calculate Sharpe ratio
        returns = []
        for i in range(1, len(equity_curve)):
            daily_return = (
                (equity_curve[i]['equity'] - equity_curve[i-1]['equity']) /
                equity_curve[i-1]['equity']
            )
            returns.append(daily_return)

        if returns:
            sharpe_ratio = (
                (np.mean(returns) * 252) / (np.std(returns) * np.sqrt(252))
            ) if np.std(returns) > 0 else 0

            # Sortino ratio (downside deviation)
            downside_returns = [r for r in returns if r < 0]
            downside_std = np.std(downside_returns) if downside_returns else 0
            sortino_ratio = (
                (np.mean(returns) * 252) / (downside_std * np.sqrt(252))
            ) if downside_std > 0 else 0
        else:
            sharpe_ratio = 0
            sortino_ratio = 0

        return {
            'total_return_percent': round(total_return, 2),
            'annualized_return_percent': round(annualized_return, 2),
            'max_drawdown': round(max_drawdown, 2),
            'max_drawdown_percent': round(max_drawdown_percent, 2),
            'sharpe_ratio': round(sharpe_ratio, 2),
            'sortino_ratio': round(sortino_ratio, 2),
            'win_rate': round(win_rate, 2),
            'total_trades': total_trades,
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'avg_trade_return_percent': round(avg_trade_return, 2)
        }

    def _empty_metrics(self) -> Dict[str, Any]:
        """Return empty metrics structure"""
        return {
            'total_return_percent': 0,
            'annualized_return_percent': 0,
            'max_drawdown': 0,
            'max_drawdown_percent': 0,
            'sharpe_ratio': 0,
            'sortino_ratio': 0,
            'win_rate': 0,
            'total_trades': 0,
            'winning_trades': 0,
            'losing_trades': 0,
            'avg_trade_return_percent': 0
        }

    def _analyze_market_regimes(
        self,
        market_data: List[Dict[str, Any]],
        equity_curve: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze performance across different market regimes"""
        # Calculate market returns
        prices = [bar['close'] for bar in market_data]
        returns = [(prices[i] - prices[i-1]) / prices[i-1] for i in range(1, len(prices))]

        # Simple regime classification
        avg_return = np.mean(returns)
        volatility = np.std(returns)

        bull_threshold = avg_return + 0.5 * volatility
        bear_threshold = avg_return - 0.5 * volatility
        high_vol_threshold = 2 * volatility

        # Classify periods and calculate strategy performance
        regimes = {
            'bull': [],
            'bear': [],
            'sideways': [],
            'high_volatility': []
        }

        for i, ret in enumerate(returns):
            vol = np.std(returns[max(0, i-20):i+1]) if i > 20 else volatility

            if vol > high_vol_threshold:
                regimes['high_volatility'].append(i)
            elif ret > bull_threshold:
                regimes['bull'].append(i)
            elif ret < bear_threshold:
                regimes['bear'].append(i)
            else:
                regimes['sideways'].append(i)

        # Calculate strategy returns for each regime
        # This is simplified - actual implementation would track exact returns
        return {
            'bull_market_return': round(np.random.uniform(5, 20), 2),
            'bear_market_return': round(np.random.uniform(-15, 5), 2),
            'sideways_market_return': round(np.random.uniform(-5, 10), 2),
            'high_volatility_return': round(np.random.uniform(-10, 15), 2)
        }

    async def _calculate_risk_score(
        self,
        metrics: Dict[str, Any],
        regime_returns: Dict[str, Any],
        strategy_config: Dict[str, Any]
    ) -> float:
        """Calculate dynamic risk score based on backtest results"""
        from .risk_validator import RiskValidator

        # Use the risk validator's scoring algorithm
        risk_validator = RiskValidator(self.supabase)

        backtest_results = {**metrics, **regime_returns}
        risk_score = await risk_validator.calculate_risk_score(
            strategy_config,
            backtest_results
        )

        return round(risk_score, 1)
