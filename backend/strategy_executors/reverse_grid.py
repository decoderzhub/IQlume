"""
Reverse Grid Strategy Executor

This module implements the execution logic for reverse grid trading strategies.
Reverse grid is optimized for down/bear markets - it profits from price declines
by selling at higher prices and buying back at lower prices.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.common.exceptions import APIError as AlpacaAPIError
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class ReverseGridExecutor(BaseStrategyExecutor):
    """Executor for reverse grid trading strategies - optimized for down markets"""

    async def execute(self, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute reverse grid strategy logic"""
        try:
            strategy_id = strategy_data.get("id")
            strategy_name = strategy_data.get("name", "Unknown Strategy")
            configuration = strategy_data.get("configuration", {})

            self.logger.info(f"🐻 Executing reverse grid strategy: {strategy_name}")

            symbol = configuration.get("symbol", "BTC/USD")
            allocated_capital = configuration.get("allocated_capital", 1000)
            price_range_lower = configuration.get("price_range_lower", 0)
            price_range_upper = configuration.get("price_range_upper", 0)
            number_of_grids = configuration.get("number_of_grids", 20)
            grid_mode = strategy_data.get("grid_mode", "arithmetic")

            telemetry_data = strategy_data.get("telemetry_data", {})
            if not isinstance(telemetry_data, dict):
                telemetry_data = {}

            initial_sell_order_submitted = telemetry_data.get("initial_sell_order_submitted", False)

            self.logger.info(f"📊 Reverse Grid config: {symbol} | Range: ${price_range_lower}-${price_range_upper} | Grids: {number_of_grids}")
            self.logger.info(f"🎯 Initial sell order submitted: {initial_sell_order_submitted}")

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

            if not initial_sell_order_submitted:
                self.logger.info(f"🚀 [INITIAL SELL] Performing initial short position for {strategy_name}")

                if price_range_lower == 0 or price_range_upper == 0:
                    initial_amount = allocated_capital * 0.1
                    self.logger.info(f"💡 Grid range not set, using 10% fallback: ${initial_amount}")
                else:
                    if current_price >= price_range_upper:
                        price_position_percent = 1.0
                    elif current_price <= price_range_lower:
                        price_position_percent = 0.0
                    else:
                        price_position_percent = (current_price - price_range_lower) / (price_range_upper - price_range_lower)

                    initial_amount = allocated_capital * price_position_percent

                    self.logger.info(f"💡 Price position analysis:")
                    self.logger.info(f"   Current price: ${current_price:.2f}")
                    self.logger.info(f"   Grid range: ${price_range_lower:.2f} - ${price_range_upper:.2f}")
                    self.logger.info(f"   Position in range: {price_position_percent:.1%}")
                    self.logger.info(f"   Initial sell amount: ${initial_amount:.2f}")

                sell_quantity = max(0.001, initial_amount / current_price)
                self.logger.info(f"💡 Calculated initial sell: ${initial_amount:.2f} = {sell_quantity:.6f} {symbol}")

                if sell_quantity > 0:
                    try:
                        is_market_open = self.is_market_open(symbol)
                        time_in_force = TimeInForce.DAY if is_market_open else TimeInForce.GTC

                        self.logger.info(f"📈 Market open: {is_market_open}, Using time in force: {time_in_force}")

                        order_request = MarketOrderRequest(
                            symbol=symbol.replace("/", ""),
                            qty=sell_quantity,
                            side=OrderSide.SELL,
                            time_in_force=time_in_force
                        )

                        order = self.trading_client.submit_order(order_request)
                        order_id = str(order.id)

                        self.logger.info(f"✅ [INITIAL SELL] Order placed with Alpaca: {order_id}")

                        try:
                            trade_data = {
                                "user_id": strategy_data.get("user_id"),
                                "strategy_id": strategy_id,
                                "symbol": symbol,
                                "type": "sell",
                                "quantity": sell_quantity,
                                "price": current_price,
                                "profit_loss": 0,
                                "status": "pending",
                                "order_type": "market",
                                "time_in_force": time_in_force.value if hasattr(time_in_force, 'value') else str(time_in_force),
                                "filled_qty": 0,
                                "filled_avg_price": 0,
                                "commission": 0,
                                "fees": 0,
                                "alpaca_order_id": order_id,
                            }

                            trade_resp = self.supabase.table("trades").insert(trade_data).execute()

                            if trade_resp.data:
                                trade_id = trade_resp.data[0]["id"]
                                self.logger.info(f"✅ [INITIAL SELL] Trade recorded in database: {trade_id}")
                            else:
                                self.logger.error(f"❌ [INITIAL SELL] Failed to record trade in database")

                        except Exception as trade_error:
                            self.logger.error(f"❌ [INITIAL SELL] Error recording trade: {trade_error}")

                        telemetry_data["initial_sell_order_submitted"] = True
                        telemetry_data["last_updated"] = datetime.now(timezone.utc).isoformat()

                        self.update_strategy_telemetry(strategy_id, telemetry_data)

                        market_status = "Market is open" if is_market_open else "Market is closed - order will execute at market open"
                        return {
                            "action": "sell",
                            "symbol": symbol,
                            "quantity": sell_quantity,
                            "price": current_price,
                            "order_id": order_id,
                            "reason": f"Initial short position placed. {market_status}. Order ID: {order_id}"
                        }

                    except AlpacaAPIError as e:
                        self.logger.error(f"❌ [INITIAL SELL] Failed to place order with Alpaca: {e}")
                        return {
                            "action": "error",
                            "symbol": symbol,
                            "quantity": 0,
                            "price": current_price,
                            "reason": f"Failed to place initial sell order: {str(e)}"
                        }
                    except Exception as e:
                        self.logger.error(f"❌ [INITIAL SELL] Unexpected error placing order: {e}")
                        return {
                            "action": "error",
                            "symbol": symbol,
                            "quantity": 0,
                            "price": current_price,
                            "reason": f"Unexpected error during initial sell: {str(e)}"
                        }
                else:
                    self.logger.warning(f"⚠️ [INITIAL SELL] Invalid sell quantity: {sell_quantity}")
                    return {
                        "action": "hold",
                        "symbol": symbol,
                        "quantity": 0,
                        "price": current_price,
                        "reason": f"Invalid initial sell quantity calculated: {sell_quantity}"
                    }

            if not initial_sell_order_submitted:
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": "Waiting for initial sell order to be submitted"
                }

            self.logger.info(f"🔄 [REVERSE GRID LOGIC] Initial sell completed, proceeding with reverse grid operations")

            is_market_open = self.is_market_open(symbol)
            if not is_market_open:
                market_status = self.get_market_status_message(symbol)
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": f"Market is closed. {market_status}. Strategy will execute when market opens."
                }

            if price_range_lower == 0 or price_range_upper == 0:
                price_range_lower = current_price * 0.8
                price_range_upper = current_price * 1.2

                updated_config = {**configuration}
                updated_config["price_range_lower"] = price_range_lower
                updated_config["price_range_upper"] = price_range_upper

                self.supabase.table("trading_strategies").update({
                    "configuration": updated_config
                }).eq("id", strategy_id).execute()

                self.logger.info(f"🔧 Auto-configured reverse grid range: ${price_range_lower:.2f} - ${price_range_upper:.2f}")

            grid_levels = self.calculate_grid_levels(
                price_range_lower,
                price_range_upper,
                number_of_grids,
                grid_mode
            )

            try:
                positions = self.trading_client.get_all_positions()
                current_position = next((p for p in positions if p.symbol == symbol), None)
                current_qty = float(current_position.qty) if current_position else 0

                orders = self.trading_client.get_orders()
                open_orders = [o for o in orders if o.symbol == symbol and o.status in ['new', 'accepted', 'partially_filled']]

                if current_qty > 0:
                    nearest_sell_level = self.find_nearest_grid_level_above(current_price, grid_levels)
                    if nearest_sell_level and not any(o.side == OrderSide.SELL for o in open_orders):
                        sell_quantity = current_qty * 0.2

                        order_request = LimitOrderRequest(
                            symbol=symbol.replace("/", ""),
                            qty=sell_quantity,
                            side=OrderSide.SELL,
                            time_in_force=TimeInForce.GTC,
                            limit_price=nearest_sell_level
                        )

                        order = self.trading_client.submit_order(order_request)

                        self.logger.info(f"📤 Placed reverse grid sell order: {sell_quantity} @ ${nearest_sell_level}")

                        return {
                            "action": "sell",
                            "symbol": symbol,
                            "quantity": sell_quantity,
                            "price": nearest_sell_level,
                            "order_id": str(order.id),
                            "reason": f"Reverse grid sell order at ${nearest_sell_level:.2f}"
                        }

                elif current_qty < 0:
                    nearest_buy_level = self.find_nearest_grid_level_below(current_price, grid_levels)
                    if nearest_buy_level and not any(o.side == OrderSide.BUY for o in open_orders):
                        buy_quantity = abs(current_qty) * 0.2

                        order_request = LimitOrderRequest(
                            symbol=symbol.replace("/", ""),
                            qty=buy_quantity,
                            side=OrderSide.BUY,
                            time_in_force=TimeInForce.GTC,
                            limit_price=nearest_buy_level
                        )

                        order = self.trading_client.submit_order(order_request)

                        self.logger.info(f"📥 Placed reverse grid buy order: {buy_quantity} @ ${nearest_buy_level}")

                        return {
                            "action": "buy",
                            "symbol": symbol,
                            "quantity": buy_quantity,
                            "price": nearest_buy_level,
                            "order_id": str(order.id),
                            "reason": f"Reverse grid buy back order at ${nearest_buy_level:.2f}"
                        }

                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": "No grid levels triggered or orders already placed"
                }

            except Exception as e:
                self.logger.error(f"❌ Error in reverse grid logic: {e}")
                return {
                    "action": "error",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": f"Error executing reverse grid logic: {str(e)}"
                }

        except Exception as e:
            self.logger.error(f"❌ Critical error in reverse grid strategy: {e}")
            return {
                "action": "error",
                "symbol": symbol if 'symbol' in locals() else "Unknown",
                "quantity": 0,
                "price": 0,
                "reason": f"Critical error: {str(e)}"
            }

    def calculate_grid_levels(
        self,
        lower_price: float,
        upper_price: float,
        num_grids: int,
        mode: str = "arithmetic"
    ) -> List[float]:
        """Calculate grid price levels"""
        if mode == "geometric":
            ratio = (upper_price / lower_price) ** (1 / (num_grids - 1))
            return [lower_price * (ratio ** i) for i in range(num_grids)]
        else:
            step = (upper_price - lower_price) / (num_grids - 1)
            return [lower_price + (step * i) for i in range(num_grids)]

    def find_nearest_grid_level_above(self, current_price: float, grid_levels: List[float]) -> Optional[float]:
        """Find the nearest grid level above current price"""
        above_levels = [level for level in grid_levels if level > current_price]
        return min(above_levels) if above_levels else None

    def find_nearest_grid_level_below(self, current_price: float, grid_levels: List[float]) -> Optional[float]:
        """Find the nearest grid level below current price"""
        below_levels = [level for level in grid_levels if level < current_price]
        return max(below_levels) if below_levels else None
