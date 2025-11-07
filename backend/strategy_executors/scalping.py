"""
Scalping Strategy Executor

High-frequency trading strategy that makes profits from small price changes.
Multiple trades per day with tight stop losses and quick profits.
"""

import logging
from typing import Dict, Any
from datetime import datetime, timezone, timedelta
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.data.requests import StockBarsRequest, CryptoBarsRequest
from alpaca.data.timeframe import TimeFrame
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class ScalpingExecutor(BaseStrategyExecutor):
    """Executor for scalping trading strategies"""

    async def execute(self, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute scalping strategy logic"""
        try:
            strategy_id = strategy_data.get("id")
            strategy_name = strategy_data.get("name", "Unknown Strategy")
            configuration = strategy_data.get("configuration", {})

            self.logger.info(f"⚡ Executing scalping strategy: {strategy_name}")

            symbol = configuration.get("symbol", "SPY")
            allocated_capital = configuration.get("allocated_capital", 1000)
            profit_target_percent = configuration.get("profit_target_percent", 0.5)
            stop_loss_percent = configuration.get("stop_loss_percent", 0.3)
            short_ma_period = configuration.get("short_ma_period", 5)
            long_ma_period = configuration.get("long_ma_period", 15)

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

            bars = self.get_intraday_bars(symbol, long_ma_period * 2)
            if not bars or len(bars) < long_ma_period:
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": "Insufficient intraday data"
                }

            closes = [bar['close'] for bar in bars]
            short_ma = sum(closes[-short_ma_period:]) / short_ma_period
            long_ma = sum(closes[-long_ma_period:]) / long_ma_period

            price_change = ((current_price - bars[-2]['close']) / bars[-2]['close']) * 100 if len(bars) > 1 else 0
            spread = bars[-1]['high'] - bars[-1]['low']
            avg_spread = sum(bar['high'] - bar['low'] for bar in bars[-10:]) / min(10, len(bars))
            volatility = spread / current_price * 100

            self.logger.info(f"💰 Price: ${current_price:.2f} | Short MA: ${short_ma:.2f} | Long MA: ${long_ma:.2f}")
            self.logger.info(f"📊 Price Change: {price_change:.2f}% | Volatility: {volatility:.2f}%")

            positions = self.trading_client.get_all_positions()
            current_position = next((p for p in positions if p.symbol == symbol), None)

            if current_position:
                entry_price = float(current_position.avg_entry_price)
                current_qty = float(current_position.qty)
                unrealized_pnl_percent = float(current_position.unrealized_plpc) * 100

                self.logger.info(f"📍 Position: {current_qty} @ ${entry_price:.2f} | P&L: {unrealized_pnl_percent:.2f}%")

                hit_profit_target = unrealized_pnl_percent >= profit_target_percent
                hit_stop_loss = unrealized_pnl_percent <= -stop_loss_percent
                trend_reversed = (current_qty > 0 and short_ma < long_ma) or (current_qty < 0 and short_ma > long_ma)

                if hit_profit_target or hit_stop_loss or trend_reversed:
                    # Determine appropriate time_in_force based on asset type
                    is_crypto = self.normalize_crypto_symbol(symbol) is not None
                    time_in_force = TimeInForce.GTC if is_crypto else TimeInForce.DAY

                    order_request = MarketOrderRequest(
                        symbol=symbol,
                        qty=abs(current_qty),
                        side=OrderSide.SELL if current_qty > 0 else OrderSide.BUY,
                        time_in_force=time_in_force
                    )

                    order = self.trading_client.submit_order(order_request)

                    if hit_profit_target:
                        reason = "Profit target hit"
                    elif hit_stop_loss:
                        reason = "Stop loss triggered"
                    else:
                        reason = "Trend reversed"

                    self.logger.info(f"✅ {reason}: Closed scalp trade")

                    return {
                        "action": "sell" if current_qty > 0 else "buy",
                        "symbol": symbol,
                        "quantity": abs(current_qty),
                        "price": current_price,
                        "order_id": str(order.id),
                        "reason": f"{reason} (P&L: {unrealized_pnl_percent:.2f}%)"
                    }

                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": f"Holding scalp position (P&L: {unrealized_pnl_percent:.2f}%)"
                }

            else:
                bullish_signal = short_ma > long_ma and price_change > 0
                bearish_signal = short_ma < long_ma and price_change < 0
                sufficient_volatility = volatility >= 0.1

                if bullish_signal and sufficient_volatility:
                    buy_quantity = allocated_capital / current_price

                    # Determine appropriate time_in_force based on asset type
                    is_crypto = self.normalize_crypto_symbol(symbol) is not None
                    time_in_force = TimeInForce.GTC if is_crypto else TimeInForce.DAY

                    order_request = MarketOrderRequest(
                        symbol=symbol,
                        qty=buy_quantity,
                        side=OrderSide.BUY,
                        time_in_force=time_in_force
                    )

                    order = self.trading_client.submit_order(order_request)
                    self.logger.info(f"⚡ Scalp entry LONG: {buy_quantity} @ ${current_price:.2f}")

                    return {
                        "action": "buy",
                        "symbol": symbol,
                        "quantity": buy_quantity,
                        "price": current_price,
                        "order_id": str(order.id),
                        "reason": f"Bullish scalp signal (Short MA > Long MA, momentum positive)"
                    }

                elif bearish_signal and sufficient_volatility:
                    sell_quantity = allocated_capital / current_price

                    # Determine appropriate time_in_force based on asset type
                    is_crypto = self.normalize_crypto_symbol(symbol) is not None
                    time_in_force = TimeInForce.GTC if is_crypto else TimeInForce.DAY

                    order_request = MarketOrderRequest(
                        symbol=symbol,
                        qty=sell_quantity,
                        side=OrderSide.SELL,
                        time_in_force=time_in_force
                    )

                    order = self.trading_client.submit_order(order_request)
                    self.logger.info(f"⚡ Scalp entry SHORT: {sell_quantity} @ ${current_price:.2f}")

                    return {
                        "action": "sell",
                        "symbol": symbol,
                        "quantity": sell_quantity,
                        "price": current_price,
                        "order_id": str(order.id),
                        "reason": f"Bearish scalp signal (Short MA < Long MA, momentum negative)"
                    }

                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": f"No scalp signal. Short MA: ${short_ma:.2f}, Long MA: ${long_ma:.2f}"
                }

        except Exception as e:
            self.logger.error(f"❌ Critical error in scalping strategy: {e}")
            return {
                "action": "error",
                "symbol": symbol if 'symbol' in locals() else "Unknown",
                "quantity": 0,
                "price": 0,
                "reason": f"Critical error: {str(e)}"
            }

    def get_intraday_bars(self, symbol: str, bar_count: int):
        """Get intraday price bars (5-minute bars)"""
        try:
            end = datetime.now(timezone.utc)
            start = end - timedelta(hours=bar_count * 2)

            is_crypto = "/" in symbol or "USD" in symbol

            if is_crypto:
                request = CryptoBarsRequest(
                    symbol_or_symbols=symbol,
                    timeframe=TimeFrame.Minute,
                    start=start,
                    end=end
                )
                bars = self.crypto_client.get_crypto_bars(request)
            else:
                request = StockBarsRequest(
                    symbol_or_symbols=symbol,
                    timeframe=TimeFrame.Minute,
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
                ][-bar_count:]

            return []

        except Exception as e:
            self.logger.error(f"❌ Error fetching intraday bars: {e}")
            return []
