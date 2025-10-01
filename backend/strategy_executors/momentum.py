"""
Momentum Breakout Strategy Executor

Trades based on strong price momentum and breakouts above resistance levels.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.data.requests import StockBarsRequest, CryptoBarsRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.common.exceptions import APIError as AlpacaAPIError
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class MomentumBreakoutExecutor(BaseStrategyExecutor):
    """Executor for momentum breakout trading strategies"""

    async def execute(self, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute momentum breakout strategy logic"""
        try:
            strategy_id = strategy_data.get("id")
            strategy_name = strategy_data.get("name", "Unknown Strategy")
            configuration = strategy_data.get("configuration", {})

            self.logger.info(f"🚀 Executing momentum breakout strategy: {strategy_name}")

            symbol = configuration.get("symbol", "SPY")
            allocated_capital = configuration.get("allocated_capital", 1000)
            lookback_period = configuration.get("lookback_period", 20)
            breakout_threshold = configuration.get("breakout_threshold", 2.0)
            stop_loss_percent = configuration.get("stop_loss_percent", 2.0)
            take_profit_percent = configuration.get("take_profit_percent", 5.0)

            current_price = self.get_current_price(symbol)
            if not current_price:
                return {
                    "action": "error",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": 0,
                    "reason": f"Unable to fetch current price for {symbol}"
                }

            self.logger.info(f"💰 Current price for {symbol}: ${current_price}")

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

            highest_high = max(bar['high'] for bar in bars)
            avg_volume = sum(bar['volume'] for bar in bars) / len(bars)
            current_volume = bars[-1]['volume'] if bars else 0

            momentum_score = ((current_price - bars[0]['close']) / bars[0]['close']) * 100
            volume_surge = (current_volume / avg_volume) if avg_volume > 0 else 0

            self.logger.info(f"📊 Momentum Score: {momentum_score:.2f}%")
            self.logger.info(f"📊 Volume Surge: {volume_surge:.2f}x")
            self.logger.info(f"📊 Highest High: ${highest_high:.2f}")

            positions = self.trading_client.get_all_positions()
            current_position = next((p for p in positions if p.symbol == symbol), None)

            if current_position:
                entry_price = float(current_position.avg_entry_price)
                current_qty = float(current_position.qty)
                unrealized_pnl_percent = float(current_position.unrealized_plpc) * 100

                self.logger.info(f"📍 Current position: {current_qty} @ ${entry_price:.2f} | P&L: {unrealized_pnl_percent:.2f}%")

                if unrealized_pnl_percent >= take_profit_percent:
                    order_request = MarketOrderRequest(
                        symbol=symbol,
                        qty=current_qty,
                        side=OrderSide.SELL,
                        time_in_force=TimeInForce.DAY
                    )

                    order = self.trading_client.submit_order(order_request)
                    self.logger.info(f"✅ Take profit triggered: Sold {current_qty} @ ${current_price:.2f}")

                    return {
                        "action": "sell",
                        "symbol": symbol,
                        "quantity": current_qty,
                        "price": current_price,
                        "order_id": str(order.id),
                        "reason": f"Take profit at {unrealized_pnl_percent:.2f}% gain"
                    }

                elif unrealized_pnl_percent <= -stop_loss_percent:
                    order_request = MarketOrderRequest(
                        symbol=symbol,
                        qty=current_qty,
                        side=OrderSide.SELL,
                        time_in_force=TimeInForce.DAY
                    )

                    order = self.trading_client.submit_order(order_request)
                    self.logger.info(f"🛑 Stop loss triggered: Sold {current_qty} @ ${current_price:.2f}")

                    return {
                        "action": "sell",
                        "symbol": symbol,
                        "quantity": current_qty,
                        "price": current_price,
                        "order_id": str(order.id),
                        "reason": f"Stop loss at {unrealized_pnl_percent:.2f}% loss"
                    }

                else:
                    return {
                        "action": "hold",
                        "symbol": symbol,
                        "quantity": 0,
                        "price": current_price,
                        "reason": f"Holding position. Unrealized P&L: {unrealized_pnl_percent:.2f}%"
                    }

            else:
                is_breakout = current_price > highest_high
                has_momentum = momentum_score >= breakout_threshold
                has_volume = volume_surge >= 1.5

                self.logger.info(f"🎯 Breakout: {is_breakout} | Momentum: {has_momentum} | Volume: {has_volume}")

                if is_breakout and has_momentum and has_volume:
                    buy_quantity = allocated_capital / current_price

                    order_request = MarketOrderRequest(
                        symbol=symbol,
                        qty=buy_quantity,
                        side=OrderSide.BUY,
                        time_in_force=TimeInForce.DAY
                    )

                    order = self.trading_client.submit_order(order_request)
                    self.logger.info(f"✅ Momentum breakout: Bought {buy_quantity} @ ${current_price:.2f}")

                    return {
                        "action": "buy",
                        "symbol": symbol,
                        "quantity": buy_quantity,
                        "price": current_price,
                        "order_id": str(order.id),
                        "reason": f"Momentum breakout detected (Score: {momentum_score:.2f}%, Volume: {volume_surge:.2f}x)"
                    }

                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": "No breakout signal detected"
                }

        except Exception as e:
            self.logger.error(f"❌ Critical error in momentum strategy: {e}")
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
