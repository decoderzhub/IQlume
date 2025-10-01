"""
Pairs Trading Strategy Executor

Trades correlated pairs of securities - long one, short the other when spread widens.
"""

import logging
from typing import Dict, Any, Tuple, Optional
from datetime import datetime, timezone, timedelta
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class PairsTradingExecutor(BaseStrategyExecutor):
    """Executor for pairs trading strategies"""

    async def execute(self, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute pairs trading strategy logic"""
        try:
            strategy_id = strategy_data.get("id")
            strategy_name = strategy_data.get("name", "Unknown Strategy")
            configuration = strategy_data.get("configuration", {})

            self.logger.info(f"🔗 Executing pairs trading strategy: {strategy_name}")

            symbol_a = configuration.get("symbol_a", "SPY")
            symbol_b = configuration.get("symbol_b", "QQQ")
            allocated_capital = configuration.get("allocated_capital", 1000)
            lookback_period = configuration.get("lookback_period", 30)
            entry_z_score = configuration.get("entry_z_score", 2.0)
            exit_z_score = configuration.get("exit_z_score", 0.5)

            price_a = self.get_current_price(symbol_a)
            price_b = self.get_current_price(symbol_b)

            if not price_a or not price_b:
                return {
                    "action": "error",
                    "symbol": f"{symbol_a}/{symbol_b}",
                    "quantity": 0,
                    "price": 0,
                    "reason": "Unable to fetch prices for pair"
                }

            is_market_open = self.is_market_open(symbol_a)
            if not is_market_open:
                market_status = self.get_market_status_message(symbol_a)
                return {
                    "action": "hold",
                    "symbol": f"{symbol_a}/{symbol_b}",
                    "quantity": 0,
                    "price": 0,
                    "reason": f"Market is closed. {market_status}"
                }

            bars_a = self.get_historical_bars(symbol_a, lookback_period)
            bars_b = self.get_historical_bars(symbol_b, lookback_period)

            if not bars_a or not bars_b or len(bars_a) < lookback_period or len(bars_b) < lookback_period:
                return {
                    "action": "hold",
                    "symbol": f"{symbol_a}/{symbol_b}",
                    "quantity": 0,
                    "price": 0,
                    "reason": "Insufficient historical data"
                }

            spreads = [bars_a[i]['close'] - bars_b[i]['close'] for i in range(len(bars_a))]
            mean_spread = sum(spreads) / len(spreads)
            variance = sum((s - mean_spread) ** 2 for s in spreads) / len(spreads)
            std_dev = variance ** 0.5

            current_spread = price_a - price_b
            z_score = (current_spread - mean_spread) / std_dev if std_dev > 0 else 0

            self.logger.info(f"📊 {symbol_a}: ${price_a:.2f} | {symbol_b}: ${price_b:.2f}")
            self.logger.info(f"📊 Spread: ${current_spread:.2f} | Mean: ${mean_spread:.2f} | Z-Score: {z_score:.2f}")

            positions = self.trading_client.get_all_positions()
            position_a = next((p for p in positions if p.symbol == symbol_a), None)
            position_b = next((p for p in positions if p.symbol == symbol_b), None)

            in_trade = position_a is not None and position_b is not None

            if in_trade:
                should_exit = abs(z_score) <= exit_z_score

                if should_exit:
                    orders = []

                    if position_a:
                        qty_a = abs(float(position_a.qty))
                        side_a = OrderSide.SELL if float(position_a.qty) > 0 else OrderSide.BUY
                        order_a = self.trading_client.submit_order(
                            MarketOrderRequest(symbol=symbol_a, qty=qty_a, side=side_a, time_in_force=TimeInForce.DAY)
                        )
                        orders.append(f"{symbol_a}: {side_a.value} {qty_a}")

                    if position_b:
                        qty_b = abs(float(position_b.qty))
                        side_b = OrderSide.SELL if float(position_b.qty) > 0 else OrderSide.BUY
                        order_b = self.trading_client.submit_order(
                            MarketOrderRequest(symbol=symbol_b, qty=qty_b, side=side_b, time_in_force=TimeInForce.DAY)
                        )
                        orders.append(f"{symbol_b}: {side_b.value} {qty_b}")

                    self.logger.info(f"✅ Pair trade closed: {' | '.join(orders)}")

                    return {
                        "action": "close_pair",
                        "symbol": f"{symbol_a}/{symbol_b}",
                        "quantity": 0,
                        "price": 0,
                        "reason": f"Spread converged (Z-Score: {z_score:.2f})"
                    }

                return {
                    "action": "hold",
                    "symbol": f"{symbol_a}/{symbol_b}",
                    "quantity": 0,
                    "price": 0,
                    "reason": f"Holding pair trade (Z-Score: {z_score:.2f})"
                }

            else:
                spread_wide_positive = z_score >= entry_z_score
                spread_wide_negative = z_score <= -entry_z_score

                if spread_wide_positive:
                    capital_per_leg = allocated_capital / 2
                    qty_a = capital_per_leg / price_a
                    qty_b = capital_per_leg / price_b

                    order_a = self.trading_client.submit_order(
                        MarketOrderRequest(symbol=symbol_a, qty=qty_a, side=OrderSide.SELL, time_in_force=TimeInForce.DAY)
                    )
                    order_b = self.trading_client.submit_order(
                        MarketOrderRequest(symbol=symbol_b, qty=qty_b, side=OrderSide.BUY, time_in_force=TimeInForce.DAY)
                    )

                    self.logger.info(f"✅ Pair trade opened: SHORT {symbol_a} / LONG {symbol_b}")

                    return {
                        "action": "open_pair",
                        "symbol": f"{symbol_a}/{symbol_b}",
                        "quantity": qty_a,
                        "price": 0,
                        "reason": f"Spread wide positive (Z-Score: {z_score:.2f})"
                    }

                elif spread_wide_negative:
                    capital_per_leg = allocated_capital / 2
                    qty_a = capital_per_leg / price_a
                    qty_b = capital_per_leg / price_b

                    order_a = self.trading_client.submit_order(
                        MarketOrderRequest(symbol=symbol_a, qty=qty_a, side=OrderSide.BUY, time_in_force=TimeInForce.DAY)
                    )
                    order_b = self.trading_client.submit_order(
                        MarketOrderRequest(symbol=symbol_b, qty=qty_b, side=OrderSide.SELL, time_in_force=TimeInForce.DAY)
                    )

                    self.logger.info(f"✅ Pair trade opened: LONG {symbol_a} / SHORT {symbol_b}")

                    return {
                        "action": "open_pair",
                        "symbol": f"{symbol_a}/{symbol_b}",
                        "quantity": qty_a,
                        "price": 0,
                        "reason": f"Spread wide negative (Z-Score: {z_score:.2f})"
                    }

                return {
                    "action": "hold",
                    "symbol": f"{symbol_a}/{symbol_b}",
                    "quantity": 0,
                    "price": 0,
                    "reason": f"No entry signal (Z-Score: {z_score:.2f}, threshold: ±{entry_z_score})"
                }

        except Exception as e:
            self.logger.error(f"❌ Critical error in pairs trading strategy: {e}")
            return {
                "action": "error",
                "symbol": f"{symbol_a}/{symbol_b}" if 'symbol_a' in locals() and 'symbol_b' in locals() else "Unknown",
                "quantity": 0,
                "price": 0,
                "reason": f"Critical error: {str(e)}"
            }

    def get_historical_bars(self, symbol: str, days: int):
        """Get historical price bars"""
        try:
            end = datetime.now(timezone.utc)
            start = end - timedelta(days=days + 5)

            request = StockBarsRequest(
                symbol_or_symbols=symbol,
                timeframe=TimeFrame.Day,
                start=start,
                end=end
            )
            bars = self.stock_client.get_stock_bars(request)

            if symbol in bars:
                return [
                    {
                        'close': float(bar.close),
                        'timestamp': bar.timestamp
                    }
                    for bar in bars[symbol]
                ]

            return []

        except Exception as e:
            self.logger.error(f"❌ Error fetching historical bars: {e}")
            return []
