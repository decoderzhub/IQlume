"""
Mean Reversion Strategy Executor

Trades based on the assumption that prices revert to their mean over time.
Buys oversold conditions and sells overbought conditions.
"""

import logging
from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.data.requests import StockBarsRequest, CryptoBarsRequest
from alpaca.data.timeframe import TimeFrame
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class MeanReversionExecutor(BaseStrategyExecutor):
    """Executor for mean reversion trading strategies"""

    async def execute(self, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute mean reversion strategy logic"""
        try:
            strategy_id = strategy_data.get("id")
            strategy_name = strategy_data.get("name", "Unknown Strategy")
            configuration = strategy_data.get("configuration", {})

            self.logger.info(f"📉📈 Executing mean reversion strategy: {strategy_name}")

            symbol = configuration.get("symbol", "SPY")
            allocated_capital = configuration.get("allocated_capital", 1000)
            lookback_period = configuration.get("lookback_period", 20)
            std_dev_threshold = configuration.get("std_dev_threshold", 2.0)
            stop_loss_percent = configuration.get("stop_loss_percent", 3.0)

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

            bars = self.get_historical_bars(symbol, lookback_period)
            if not bars or len(bars) < lookback_period:
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": "Insufficient historical data"
                }

            closes = [bar['close'] for bar in bars]
            mean_price = sum(closes) / len(closes)
            variance = sum((x - mean_price) ** 2 for x in closes) / len(closes)
            std_dev = variance ** 0.5

            z_score = (current_price - mean_price) / std_dev if std_dev > 0 else 0

            self.logger.info(f"💰 Current: ${current_price:.2f} | Mean: ${mean_price:.2f} | StdDev: ${std_dev:.2f}")
            self.logger.info(f"📊 Z-Score: {z_score:.2f}")

            positions = self.trading_client.get_all_positions()
            current_position = next((p for p in positions if p.symbol == symbol), None)

            if current_position:
                entry_price = float(current_position.avg_entry_price)
                current_qty = float(current_position.qty)
                unrealized_pnl_percent = float(current_position.unrealized_plpc) * 100

                self.logger.info(f"📍 Current position: {current_qty} @ ${entry_price:.2f} | P&L: {unrealized_pnl_percent:.2f}%")

                price_returned_to_mean = abs(z_score) < 0.5
                stop_loss_hit = unrealized_pnl_percent <= -stop_loss_percent

                if price_returned_to_mean or stop_loss_hit:
                    order_request = MarketOrderRequest(
                        symbol=symbol,
                        qty=abs(current_qty),
                        side=OrderSide.SELL if current_qty > 0 else OrderSide.BUY,
                        time_in_force=TimeInForce.DAY
                    )

                    order = self.trading_client.submit_order(order_request)

                    reason = "Price returned to mean" if price_returned_to_mean else "Stop loss triggered"
                    self.logger.info(f"✅ {reason}: Closing position")

                    return {
                        "action": "sell" if current_qty > 0 else "buy",
                        "symbol": symbol,
                        "quantity": abs(current_qty),
                        "price": current_price,
                        "order_id": str(order.id),
                        "reason": f"{reason} (Z-Score: {z_score:.2f})"
                    }

                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": f"Holding position. Z-Score: {z_score:.2f}, P&L: {unrealized_pnl_percent:.2f}%"
                }

            else:
                is_oversold = z_score <= -std_dev_threshold
                is_overbought = z_score >= std_dev_threshold

                if is_oversold:
                    buy_quantity = allocated_capital / current_price

                    order_request = MarketOrderRequest(
                        symbol=symbol,
                        qty=buy_quantity,
                        side=OrderSide.BUY,
                        time_in_force=TimeInForce.DAY
                    )

                    order = self.trading_client.submit_order(order_request)
                    self.logger.info(f"✅ Oversold condition: Bought {buy_quantity} @ ${current_price:.2f}")

                    return {
                        "action": "buy",
                        "symbol": symbol,
                        "quantity": buy_quantity,
                        "price": current_price,
                        "order_id": str(order.id),
                        "reason": f"Oversold (Z-Score: {z_score:.2f})"
                    }

                elif is_overbought:
                    sell_quantity = allocated_capital / current_price

                    order_request = MarketOrderRequest(
                        symbol=symbol,
                        qty=sell_quantity,
                        side=OrderSide.SELL,
                        time_in_force=TimeInForce.DAY
                    )

                    order = self.trading_client.submit_order(order_request)
                    self.logger.info(f"✅ Overbought condition: Sold {sell_quantity} @ ${current_price:.2f}")

                    return {
                        "action": "sell",
                        "symbol": symbol,
                        "quantity": sell_quantity,
                        "price": current_price,
                        "order_id": str(order.id),
                        "reason": f"Overbought (Z-Score: {z_score:.2f})"
                    }

                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": f"No signal. Z-Score: {z_score:.2f} (threshold: ±{std_dev_threshold})"
                }

        except Exception as e:
            self.logger.error(f"❌ Critical error in mean reversion strategy: {e}")
            return {
                "action": "error",
                "symbol": symbol if 'symbol' in locals() else "Unknown",
                "quantity": 0,
                "price": 0,
                "reason": f"Critical error: {str(e)}"
            }

    def get_historical_bars(self, symbol: str, days: int):
        """Get historical price bars"""
        try:
            end = datetime.now(timezone.utc)
            start = end - timedelta(days=days + 5)

            is_crypto = "/" in symbol or "USD" in symbol

            if is_crypto:
                request = CryptoBarsRequest(
                    symbol_or_symbols=symbol,
                    timeframe=TimeFrame.Day,
                    start=start,
                    end=end
                )
                bars = self.crypto_client.get_crypto_bars(request)
            else:
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
                        'open': float(bar.open),
                        'high': float(bar.high),
                        'low': float(bar.low),
                        'close': float(bar.close),
                        'volume': float(bar.volume),
                        'timestamp': bar.timestamp
                    }
                    for bar in bars[symbol]
                ]

            return []

        except Exception as e:
            self.logger.error(f"❌ Error fetching historical bars: {e}")
            return []
