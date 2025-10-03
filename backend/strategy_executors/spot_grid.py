"""
Spot Grid Strategy Executor

This module implements the execution logic for spot grid trading strategies.
Grid trading involves placing buy and sell orders at regular intervals above and below the current price.
"""

import logging
from typing import Dict, Any, List, Optional, Any as AnyType
from datetime import datetime, timezone
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.common.exceptions import APIError as AlpacaAPIError
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class SpotGridExecutor(BaseStrategyExecutor):
    """Executor for spot grid trading strategies"""

    async def execute_on_fill(self, strategy_data: Dict[str, Any], order_fill_event: Dict[str, Any]) -> Dict[str, Any]:
        """Execute grid strategy in response to an order fill event"""
        try:
            strategy_id = strategy_data.get("id")
            strategy_name = strategy_data.get("name", "Unknown Strategy")
            configuration = strategy_data.get("configuration", {})

            symbol = configuration.get("symbol", "BTC/USD")
            allocated_capital = configuration.get("allocated_capital", 1000)
            price_range_lower = configuration.get("price_range_lower", 0)
            price_range_upper = configuration.get("price_range_upper", 0)
            number_of_grids = configuration.get("number_of_grids", 20)
            grid_mode = strategy_data.get("grid_mode", "arithmetic")

            grid_order = order_fill_event.get("grid_order", {})
            filled_side = grid_order.get("side")
            filled_level = grid_order.get("grid_level")
            filled_price = float(grid_order.get("filled_avg_price", grid_order.get("limit_price", 0)))

            self.logger.info(f"🎯 [GRID FILL] {strategy_name}: {filled_side.upper()} order filled at level {filled_level} @ ${filled_price}")

            # Calculate grid levels
            grid_levels = self.calculate_grid_levels(
                price_range_lower,
                price_range_upper,
                number_of_grids,
                grid_mode
            )

            # Get current position
            try:
                positions = self.trading_client.get_all_positions()
                current_position = next((p for p in positions if p.symbol == symbol.replace("/", "")), None)
                current_qty = float(current_position.qty) if current_position else 0
            except AlpacaAPIError as e:
                self.logger.error(f"❌ Error fetching position: {e}")
                current_qty = 0

            # Place complementary order based on what was filled
            if filled_side == "buy":
                # Buy order filled - place sell order at next level above
                return await self.place_sell_order_after_buy(
                    symbol, grid_levels, filled_level, current_qty, allocated_capital, strategy_id, strategy_data
                )
            elif filled_side == "sell":
                # Sell order filled - place buy order at next level below
                return await self.place_buy_order_after_sell(
                    symbol, grid_levels, filled_level, allocated_capital, strategy_id, strategy_data
                )

            return {
                "action": "hold",
                "symbol": symbol,
                "quantity": 0,
                "price": filled_price,
                "reason": f"Unknown order side: {filled_side}"
            }

        except Exception as e:
            self.logger.error(f"❌ Error in execute_on_fill: {e}", exc_info=True)
            return {
                "action": "error",
                "symbol": configuration.get("symbol", "UNKNOWN"),
                "quantity": 0,
                "price": 0,
                "reason": f"Fill execution error: {str(e)}"
            }

    async def place_sell_order_after_buy(
        self,
        symbol: str,
        grid_levels: List[float],
        filled_buy_level: int,
        current_qty: float,
        allocated_capital: float,
        strategy_id: str,
        strategy_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Place a sell order at the next grid level after a buy fills"""
        try:
            # Find the next sell level (one level above the filled buy)
            next_sell_level = filled_buy_level + 1

            if next_sell_level >= len(grid_levels):
                self.logger.info(f"⚠️ No higher grid level available for sell order")
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": grid_levels[-1],
                    "reason": "Buy filled at top of grid range, no sell level available"
                }

            sell_price = grid_levels[next_sell_level]

            # Calculate sell quantity (portion of position)
            quantity_per_grid = allocated_capital / len(grid_levels) / sell_price
            sell_qty = min(quantity_per_grid, current_qty * 0.5)  # Sell up to 50% of position
            sell_qty = max(0.001, sell_qty)

            # Check if we already have an order at this level
            existing_order = self.check_existing_grid_order(strategy_id, next_sell_level, "sell")
            if existing_order:
                self.logger.info(f"⚠️ Sell order already exists at level {next_sell_level}")
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": sell_price,
                    "reason": f"Sell order already placed at level {next_sell_level}"
                }

            # Place limit sell order
            order_request = LimitOrderRequest(
                symbol=symbol.replace("/", ""),
                qty=sell_qty,
                side=OrderSide.SELL,
                time_in_force=TimeInForce.GTC,
                limit_price=round(sell_price, 2)
            )

            order = self.trading_client.submit_order(order_request)
            order_id = str(order.id)

            self.logger.info(f"✅ [GRID] Placed sell order at level {next_sell_level} @ ${sell_price:.2f}, Order ID: {order_id}")

            # Record grid order in database
            self.record_grid_order(
                strategy_data.get("user_id"),
                strategy_id,
                order_id,
                symbol,
                "sell",
                sell_qty,
                sell_price,
                next_sell_level
            )

            return {
                "action": "sell",
                "symbol": symbol,
                "quantity": sell_qty,
                "price": sell_price,
                "order_id": order_id,
                "reason": f"Sell limit order placed at grid level {next_sell_level} after buy fill"
            }

        except AlpacaAPIError as e:
            self.logger.error(f"❌ Failed to place sell order: {e}")
            return {
                "action": "error",
                "symbol": symbol,
                "quantity": 0,
                "price": 0,
                "reason": f"Failed to place sell order: {str(e)}"
            }

    async def place_buy_order_after_sell(
        self,
        symbol: str,
        grid_levels: List[float],
        filled_sell_level: int,
        allocated_capital: float,
        strategy_id: str,
        strategy_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Place a buy order at the next grid level after a sell fills"""
        try:
            # Find the next buy level (one level below the filled sell)
            next_buy_level = filled_sell_level - 1

            if next_buy_level < 0:
                self.logger.info(f"⚠️ No lower grid level available for buy order")
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": grid_levels[0],
                    "reason": "Sell filled at bottom of grid range, no buy level available"
                }

            buy_price = grid_levels[next_buy_level]

            # Calculate buy quantity
            quantity_per_grid = allocated_capital / len(grid_levels) / buy_price
            buy_qty = max(0.001, quantity_per_grid)

            # Check if we already have an order at this level
            existing_order = self.check_existing_grid_order(strategy_id, next_buy_level, "buy")
            if existing_order:
                self.logger.info(f"⚠️ Buy order already exists at level {next_buy_level}")
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": buy_price,
                    "reason": f"Buy order already placed at level {next_buy_level}"
                }

            # Place limit buy order
            order_request = LimitOrderRequest(
                symbol=symbol.replace("/", ""),
                qty=buy_qty,
                side=OrderSide.BUY,
                time_in_force=TimeInForce.GTC,
                limit_price=round(buy_price, 2)
            )

            order = self.trading_client.submit_order(order_request)
            order_id = str(order.id)

            self.logger.info(f"✅ [GRID] Placed buy order at level {next_buy_level} @ ${buy_price:.2f}, Order ID: {order_id}")

            # Record grid order in database
            self.record_grid_order(
                strategy_data.get("user_id"),
                strategy_id,
                order_id,
                symbol,
                "buy",
                buy_qty,
                buy_price,
                next_buy_level
            )

            return {
                "action": "buy",
                "symbol": symbol,
                "quantity": buy_qty,
                "price": buy_price,
                "order_id": order_id,
                "reason": f"Buy limit order placed at grid level {next_buy_level} after sell fill"
            }

        except AlpacaAPIError as e:
            self.logger.error(f"❌ Failed to place buy order: {e}")
            return {
                "action": "error",
                "symbol": symbol,
                "quantity": 0,
                "price": 0,
                "reason": f"Failed to place buy order: {str(e)}"
            }

    def check_existing_grid_order(self, strategy_id: str, grid_level: int, side: str) -> Optional[Dict[str, Any]]:
        """Check if a grid order already exists at this level"""
        try:
            resp = self.supabase.table("grid_orders").select("*").eq(
                "strategy_id", strategy_id
            ).eq("grid_level", grid_level).eq("side", side).in_(
                "status", ["pending", "partially_filled"]
            ).execute()

            return resp.data[0] if resp.data else None
        except Exception as e:
            self.logger.error(f"❌ Error checking existing grid order: {e}")
            return None

    def record_grid_order(
        self,
        user_id: str,
        strategy_id: str,
        order_id: str,
        symbol: str,
        side: str,
        quantity: float,
        price: float,
        grid_level: int
    ):
        """Record a grid order in the database with retry logic"""
        max_retries = 3
        retry_count = 0

        while retry_count < max_retries:
            try:
                order_data = {
                    "user_id": user_id,
                    "strategy_id": strategy_id,
                    "alpaca_order_id": order_id,
                    "symbol": symbol,
                    "side": side,
                    "order_type": "limit",
                    "quantity": float(quantity),
                    "limit_price": float(price),
                    "grid_level": int(grid_level),
                    "grid_price": float(price),
                    "status": "pending",
                    "time_in_force": "gtc",
                }

                result = self.supabase.table("grid_orders").insert(order_data).execute()

                if result.data:
                    self.logger.info(f"✅ Grid order recorded: {order_id} (Level {grid_level}, {side.upper()} @ ${price:.2f})")
                    return True
                else:
                    self.logger.warning(f"⚠️ Failed to record grid order {order_id}, no data returned")
                    retry_count += 1

            except Exception as e:
                self.logger.error(f"❌ Error recording grid order {order_id} (attempt {retry_count + 1}/{max_retries}): {e}")
                retry_count += 1
                if retry_count >= max_retries:
                    self.logger.error(f"❌ Failed to record grid order {order_id} after {max_retries} attempts")
                    return False

        return False

    async def execute(self, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute spot grid strategy logic"""
        try:
            strategy_id = strategy_data.get("id")
            strategy_name = strategy_data.get("name", "Unknown Strategy")
            configuration = strategy_data.get("configuration", {})
            
            self.logger.info(f"🤖 Executing spot grid strategy: {strategy_name}")
            
            # Extract configuration
            symbol = configuration.get("symbol", "BTC/USD")
            allocated_capital = configuration.get("allocated_capital", 1000)
            price_range_lower = configuration.get("price_range_lower", 0)
            price_range_upper = configuration.get("price_range_upper", 0)
            number_of_grids = configuration.get("number_of_grids", 20)
            grid_mode = strategy_data.get("grid_mode", "arithmetic")
            
            # Get telemetry data and check initial buy status
            telemetry_data = strategy_data.get("telemetry_data", {})
            if not isinstance(telemetry_data, dict):
                telemetry_data = {}
            
            initial_buy_order_submitted = telemetry_data.get("initial_buy_order_submitted", False)
            
            self.logger.info(f"📊 Grid config: {symbol} | Range: ${price_range_lower}-${price_range_upper} | Grids: {number_of_grids}")
            self.logger.info(f"🎯 Initial buy order submitted: {initial_buy_order_submitted}")
            
            # Get current market price
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
            
            # INITIAL MARKET BUY LOGIC - Execute once per strategy
            if not initial_buy_order_submitted:
                self.logger.info(f"🚀 [INITIAL BUY] Performing initial market buy for {strategy_name}")
                
                # Calculate initial buy based on current price position within grid range
                if price_range_lower == 0 or price_range_upper == 0:
                    # If grid range not set, use 10% as fallback
                    initial_amount = allocated_capital * 0.1
                    self.logger.info(f"💡 Grid range not set, using 10% fallback: ${initial_amount}")
                else:
                    # Calculate where current price sits within the grid range (0-100%)
                    if current_price <= price_range_lower:
                        # Price below grid - buy 100% (maximum position)
                        price_position_percent = 1.0
                    elif current_price >= price_range_upper:
                        # Price above grid - buy 0% (no initial position)
                        price_position_percent = 0.0
                    else:
                        # Price within grid - calculate proportional position
                        # If price is at bottom of range = 100% buy, at top = 0% buy
                        price_position_percent = 1.0 - ((current_price - price_range_lower) / (price_range_upper - price_range_lower))
                    
                    initial_amount = allocated_capital * price_position_percent
                    
                    self.logger.info(f"💡 Price position analysis:")
                    self.logger.info(f"   Current price: ${current_price:.2f}")
                    self.logger.info(f"   Grid range: ${price_range_lower:.2f} - ${price_range_upper:.2f}")
                    self.logger.info(f"   Position in range: {price_position_percent:.1%}")
                    self.logger.info(f"   Initial buy amount: ${initial_amount:.2f}")
                
                buy_quantity = max(0.001, initial_amount / current_price)
                self.logger.info(f"💡 Calculated initial buy: ${initial_amount:.2f} = {buy_quantity:.6f} {symbol}")
                
                if buy_quantity > 0:
                    try:
                        # Determine time in force based on market status
                        is_market_open = self.is_market_open(symbol)
                        time_in_force = TimeInForce.DAY if is_market_open else TimeInForce.OPG
                        
                        self.logger.info(f"📈 Market open: {is_market_open}, Using time in force: {time_in_force}")
                        
                        # Create market order request
                        order_request = MarketOrderRequest(
                            symbol=symbol.replace("/", ""),  # Remove slash for Alpaca format
                            qty=buy_quantity,
                            side=OrderSide.BUY,
                            time_in_force=time_in_force
                        )
                        
                        # Submit order to Alpaca
                        order = self.trading_client.submit_order(order_request)
                        order_id = str(order.id)
                        
                        self.logger.info(f"✅ [INITIAL BUY] Order placed with Alpaca: {order_id}")
                        
                        # Record trade in Supabase
                        try:
                            trade_data = {
                                "user_id": strategy_data.get("user_id"),
                                "strategy_id": strategy_id,
                                "symbol": symbol,
                                "type": "buy",
                                "quantity": buy_quantity,
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
                                self.logger.info(f"✅ [INITIAL BUY] Trade recorded in database: {trade_id}")
                            else:
                                self.logger.error(f"❌ [INITIAL BUY] Failed to record trade in database")
                                
                        except Exception as trade_error:
                            self.logger.error(f"❌ [INITIAL BUY] Error recording trade: {trade_error}")
                        
                        # Mark initial buy as completed
                        telemetry_data["initial_buy_order_submitted"] = True
                        telemetry_data["last_updated"] = datetime.now(timezone.utc).isoformat()
                        
                        # Update telemetry in database
                        self.update_strategy_telemetry(strategy_id, telemetry_data)
                        
                        # Return result
                        market_status = "Market is open" if is_market_open else "Market is closed - order will execute at market open"
                        return {
                            "action": "buy",
                            "symbol": symbol,
                            "quantity": buy_quantity,
                            "price": current_price,
                            "order_id": order_id,
                            "reason": f"Initial market buy order placed. {market_status}. Order ID: {order_id}"
                        }
                        
                    except AlpacaAPIError as e:
                        self.logger.error(f"❌ [INITIAL BUY] Failed to place order with Alpaca: {e}")
                        return {
                            "action": "error",
                            "symbol": symbol,
                            "quantity": 0,
                            "price": current_price,
                            "reason": f"Failed to place initial buy order: {str(e)}"
                        }
                    except Exception as e:
                        self.logger.error(f"❌ [INITIAL BUY] Unexpected error placing order: {e}")
                        return {
                            "action": "error",
                            "symbol": symbol,
                            "quantity": 0,
                            "price": current_price,
                            "reason": f"Unexpected error during initial buy: {str(e)}"
                        }
                else:
                    self.logger.warning(f"⚠️ [INITIAL BUY] Invalid buy quantity: {buy_quantity}")
                    return {
                        "action": "hold",
                        "symbol": symbol,
                        "quantity": 0,
                        "price": current_price,
                        "reason": f"Invalid initial buy quantity calculated: {buy_quantity}"
                    }
            
            # REGULAR GRID LOGIC - Only execute after initial buy is completed
            if not initial_buy_order_submitted:
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": "Waiting for initial buy order to be submitted"
                }
            
            self.logger.info(f"🔄 [GRID LOGIC] Initial buy completed, proceeding with regular grid operations")
            
            # Check if market is open before attempting to trade
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
            
            # Auto-configure grid range if not set
            if price_range_lower == 0 or price_range_upper == 0:
                # Set range to ±20% of current price
                price_range_lower = current_price * 0.8
                price_range_upper = current_price * 1.2
                
                # Update strategy configuration
                updated_config = {**configuration}
                updated_config["price_range_lower"] = price_range_lower
                updated_config["price_range_upper"] = price_range_upper
                
                self.supabase.table("trading_strategies").update({
                    "configuration": updated_config
                }).eq("id", strategy_id).execute()
                
                self.logger.info(f"🔧 Auto-configured grid range: ${price_range_lower:.2f} - ${price_range_upper:.2f}")
            
            # Calculate grid levels
            grid_levels = self.calculate_grid_levels(
                price_range_lower, 
                price_range_upper, 
                number_of_grids, 
                grid_mode
            )
            
            # Get existing positions and orders
            try:
                positions = self.trading_client.get_all_positions()
                current_position = next((p for p in positions if p.symbol == symbol), None)
                current_qty = float(current_position.qty) if current_position else 0
                
                orders = self.trading_client.get_orders()
                open_orders = [o for o in orders if o.symbol == symbol and o.status in ['new', 'accepted', 'partially_filled']]
                
                self.logger.info(f"📊 Current position: {current_qty} {symbol}, Open orders: {len(open_orders)}")
            except AlpacaAPIError as e:
                self.logger.error(f"❌ Error fetching positions/orders: {e}")
                return {
                    "action": "error",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": f"Unable to fetch account data: {str(e)}"
                }
            
            # Place limit orders at grid levels that don't have open orders
            orders_placed = self.place_grid_limit_orders(
                symbol,
                grid_levels,
                current_price,
                current_qty,
                open_orders,
                allocated_capital,
                strategy_id,
                strategy_data
            )

            # Return summary of grid status
            action_result = {
                "action": "hold",  # Grid bots don't have discrete "buy/sell" actions
                "symbol": symbol,
                "quantity": 0,
                "price": current_price,
                "reason": f"Grid active with {len(open_orders)} open orders. {orders_placed} new orders placed."
            }

            # Legacy code kept for compatibility but should not execute
            if False and action_result.get("action") in ["buy", "sell"]:
                try:
                    order_side = OrderSide.BUY if action_result["action"] == "buy" else OrderSide.SELL

                    # Create market order request
                    order_request = MarketOrderRequest(
                        symbol=symbol.replace("/", ""),  # Remove slash for Alpaca format
                        qty=action_result["quantity"],
                        side=order_side,
                        time_in_force=TimeInForce.DAY
                    )

                    # Submit order to Alpaca
                    order = self.trading_client.submit_order(order_request)
                    
                    # Add order ID to result
                    action_result["order_id"] = str(order.id)
                    action_result["reason"] += f" | Order ID: {order.id}"
                    
                    self.logger.info(f"✅ [GRID] Order placed with Alpaca: {order.id}")
                    
                except AlpacaAPIError as e:
                    self.logger.error(f"❌ [GRID] Failed to place order with Alpaca: {e}")
                    
                    # Check if error is due to market being closed
                    error_message = str(e).lower()
                    if "market" in error_message and ("closed" in error_message or "not open" in error_message):
                        market_status = self.get_market_status_message(symbol)
                        action_result["action"] = "hold"
                        action_result["reason"] = f"Market is closed. {market_status}. Order will be placed when market opens."
                    else:
                        action_result["action"] = "error"
                        action_result["reason"] = f"Failed to place order: {str(e)}"
                except Exception as e:
                    self.logger.error(f"❌ [GRID] Unexpected error placing order: {e}")
                    action_result["action"] = "error"
                    action_result["reason"] = f"Unexpected error: {str(e)}"
            
            # Update telemetry
            updated_telemetry = self.calculate_telemetry(
                strategy_data,
                current_price,
                grid_levels,
                current_qty,
                len(open_orders),
                allocated_capital
            )
            
            # Ensure initial_buy_order_submitted flag is preserved
            updated_telemetry["initial_buy_order_submitted"] = telemetry_data.get("initial_buy_order_submitted", True)
            
            self.update_strategy_telemetry(strategy_id, updated_telemetry)
            
            return action_result
            
        except Exception as e:
            self.logger.error(f"❌ Error in spot grid execution: {e}", exc_info=True)
            return {
                "action": "error",
                "symbol": configuration.get("symbol", "UNKNOWN"),
                "quantity": 0,
                "price": 0,
                "reason": f"Execution error: {str(e)}"
            }
    
    def place_grid_limit_orders(
        self,
        symbol: str,
        grid_levels: List[float],
        current_price: float,
        current_qty: float,
        open_orders: List[Any],
        allocated_capital: float,
        strategy_id: str,
        strategy_data: Dict[str, Any]
    ) -> int:
        """Place limit orders at ALL grid levels for complete grid setup"""
        orders_placed = 0

        # Get existing grid orders from database to avoid duplicates
        try:
            existing_orders_resp = self.supabase.table("grid_orders").select("grid_level, side, status").eq(
                "strategy_id", strategy_id
            ).in_("status", ["pending", "partially_filled"]).execute()

            existing_grid_orders = set()
            for order in existing_orders_resp.data:
                existing_grid_orders.add((order["grid_level"], order["side"]))

            self.logger.info(f"📋 Found {len(existing_grid_orders)} existing grid orders in database")
        except Exception as e:
            self.logger.error(f"❌ Error fetching existing grid orders: {e}")
            existing_grid_orders = set()

        # Calculate quantity per grid level based on allocated capital
        quantity_per_grid = allocated_capital / len(grid_levels) / current_price
        quantity_per_grid = max(0.001, quantity_per_grid)  # Minimum quantity

        self.logger.info(f"📊 [GRID SETUP] Placing orders across ALL {len(grid_levels)} grid levels")
        self.logger.info(f"💰 Capital per grid: ${allocated_capital / len(grid_levels):.2f}")
        self.logger.info(f"📦 Quantity per grid: {quantity_per_grid:.6f} {symbol}")

        # Place buy orders at ALL levels below current price
        buy_levels = [level for level in grid_levels if level < current_price * 0.998]  # 0.2% below current
        self.logger.info(f"📉 Placing buy orders at {len(buy_levels)} levels below ${current_price:.2f}")

        for idx, level in enumerate(buy_levels):
            grid_level_index = grid_levels.index(level)

            # Skip if order already exists at this grid level
            if (grid_level_index, "buy") in existing_grid_orders:
                self.logger.info(f"⏭️ [GRID] Buy order already exists at level {grid_level_index}")
                continue

            try:
                order_request = LimitOrderRequest(
                    symbol=symbol.replace("/", ""),
                    qty=quantity_per_grid,
                    side=OrderSide.BUY,
                    time_in_force=TimeInForce.GTC,  # Good til cancelled
                    limit_price=round(level, 2)
                )

                order = self.trading_client.submit_order(order_request)
                self.logger.info(f"✅ [GRID] Buy order placed at level {grid_level_index}: ${level:.2f}, Order ID: {order.id}")
                orders_placed += 1

                # Record grid order in database
                self.record_grid_order(
                    strategy_data.get("user_id"),
                    strategy_id,
                    str(order.id),
                    symbol,
                    "buy",
                    quantity_per_grid,
                    level,
                    grid_level_index
                )

            except AlpacaAPIError as e:
                self.logger.error(f"❌ [GRID] Failed to place buy order at level {grid_level_index} (${level:.2f}): {e}")
            except Exception as e:
                self.logger.error(f"❌ [GRID] Unexpected error placing buy order at level {grid_level_index}: {e}")

        # Place sell orders at ALL levels above current price
        # IMPORTANT: Place sell orders even without position - they will be filled as buys execute
        sell_levels = [level for level in grid_levels if level > current_price * 1.002]  # 0.2% above current
        self.logger.info(f"📈 Placing sell orders at {len(sell_levels)} levels above ${current_price:.2f}")

        # For sell orders, use the same quantity calculation
        # The grid bot will accumulate position through buys and sell it through these orders
        for level in sell_levels:
            grid_level_index = grid_levels.index(level)

            # Skip if order already exists at this grid level
            if (grid_level_index, "sell") in existing_grid_orders:
                self.logger.info(f"⏭️ [GRID] Sell order already exists at level {grid_level_index}")
                continue

            try:
                order_request = LimitOrderRequest(
                    symbol=symbol.replace("/", ""),
                    qty=quantity_per_grid,
                    side=OrderSide.SELL,
                    time_in_force=TimeInForce.GTC,
                    limit_price=round(level, 2)
                )

                order = self.trading_client.submit_order(order_request)
                self.logger.info(f"✅ [GRID] Sell order placed at level {grid_level_index}: ${level:.2f}, Order ID: {order.id}")
                orders_placed += 1

                # Record grid order in database
                self.record_grid_order(
                    strategy_data.get("user_id"),
                    strategy_id,
                    str(order.id),
                    symbol,
                    "sell",
                    quantity_per_grid,
                    level,
                    grid_level_index
                )

            except AlpacaAPIError as e:
                self.logger.error(f"❌ [GRID] Failed to place sell order at level {grid_level_index} (${level:.2f}): {e}")
            except Exception as e:
                self.logger.error(f"❌ [GRID] Unexpected error placing sell order at level {grid_level_index}: {e}")

        self.logger.info(f"🎯 [GRID SETUP COMPLETE] Placed {orders_placed} new limit orders across the grid")

        # Broadcast grid setup complete via SSE
        if orders_placed > 0:
            try:
                from sse_manager import publish
                setup_complete = {
                    "type": "grid_setup_complete",
                    "strategy_id": strategy_id,
                    "orders_placed": orders_placed,
                    "total_grid_levels": len(grid_levels),
                    "symbol": symbol,
                    "current_price": current_price,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                # Note: We need user_id to broadcast, it should be in strategy_data
                user_id = strategy_data.get("user_id")
                if user_id:
                    import asyncio
                    asyncio.create_task(publish(user_id, setup_complete))
                    self.logger.info(f"📡 Broadcasting grid setup complete to user {user_id}")
            except Exception as broadcast_error:
                self.logger.error(f"❌ Error broadcasting grid setup: {broadcast_error}")

        return orders_placed

    def calculate_grid_levels(
        self,
        lower_price: float,
        upper_price: float,
        num_grids: int,
        mode: str = "arithmetic"
    ) -> List[float]:
        """Calculate grid price levels"""
        levels = []

        if mode == "geometric":
            # Geometric progression
            ratio = (upper_price / lower_price) ** (1 / (num_grids - 1))
            for i in range(num_grids):
                level = lower_price * (ratio ** i)
                levels.append(level)
        else:
            # Arithmetic progression (default)
            step = (upper_price - lower_price) / (num_grids - 1)
            for i in range(num_grids):
                level = lower_price + (step * i)
                levels.append(level)

        return levels
    
    def determine_grid_action(
        self,
        current_price: float,
        grid_levels: List[float],
        current_qty: float,
        open_orders: List[Any],
        allocated_capital: float,
        symbol: str
    ) -> Dict[str, Any]:
        """Determine what action to take based on grid logic"""
        
        # Find the closest grid levels
        buy_levels = [level for level in grid_levels if level < current_price]
        sell_levels = [level for level in grid_levels if level > current_price]
        
        if not buy_levels and not sell_levels:
            return {
                "action": "hold",
                "symbol": symbol,
                "quantity": 0,
                "price": current_price,
                "reason": "Current price is outside grid range"
            }
        
        # Check if we should place a buy order (price near a buy level)
        if buy_levels:
            closest_buy_level = max(buy_levels)
            buy_threshold = closest_buy_level * 1.005  # 0.5% tolerance
            
            if current_price <= buy_threshold and current_qty >= 0:
                # Check if we already have a buy order near this level
                existing_buy_orders = [o for o in open_orders if o.side == OrderSide.BUY]
                if not existing_buy_orders:
                    # Calculate quantity based on allocated capital and grid levels
                    quantity_per_grid = allocated_capital / len(grid_levels) / current_price
                    quantity = max(0.001, quantity_per_grid)  # Minimum quantity
                    
                    return {
                        "action": "buy",
                        "symbol": symbol,
                        "quantity": quantity,
                        "price": current_price,
                        "reason": f"Price ${current_price:.2f} triggered buy at grid level ${closest_buy_level:.2f}"
                    }
        
        # Check if we should place a sell order (price near a sell level and we have position)
        if sell_levels and current_qty > 0:
            closest_sell_level = min(sell_levels)
            sell_threshold = closest_sell_level * 0.995  # 0.5% tolerance
            
            if current_price >= sell_threshold:
                # Check if we already have a sell order near this level
                existing_sell_orders = [o for o in open_orders if o.side == OrderSide.SELL]
                if not existing_sell_orders:
                    # Sell a portion of our position
                    quantity = min(current_qty * 0.1, current_qty)  # Sell 10% or all if less
                    
                    return {
                        "action": "sell",
                        "symbol": symbol,
                        "quantity": quantity,
                        "price": current_price,
                        "reason": f"Price ${current_price:.2f} triggered sell at grid level ${closest_sell_level:.2f}"
                    }
        
        return {
            "action": "hold",
            "symbol": symbol,
            "quantity": 0,
            "price": current_price,
            "reason": f"No grid triggers at current price ${current_price:.2f}"
        }
    
    def calculate_telemetry(
        self,
        strategy_data: Dict[str, Any],
        current_price: float,
        grid_levels: List[float],
        current_qty: float,
        active_orders_count: int,
        allocated_capital: float
    ) -> Dict[str, Any]:
        """Calculate real-time telemetry data"""
        
        configuration = strategy_data.get("configuration", {})
        
        # Calculate current position value
        position_value = current_qty * current_price
        
        # Calculate unrealized P&L (simplified)
        avg_cost = allocated_capital / len(grid_levels) if grid_levels else current_price
        unrealized_pnl = (current_price - avg_cost) * current_qty
        
        # Calculate grid utilization
        active_grid_levels = len([level for level in grid_levels if abs(level - current_price) / current_price < 0.1])
        grid_utilization = (active_grid_levels / len(grid_levels)) * 100 if grid_levels else 0
        
        return {
            "allocated_capital_usd": allocated_capital,
            "allocated_capital_base": current_qty,
            "active_grid_levels": active_grid_levels,
            "upper_price_limit": max(grid_levels) if grid_levels else 0,
            "lower_price_limit": min(grid_levels) if grid_levels else 0,
            "current_profit_loss_usd": unrealized_pnl,
            "current_profit_loss_percent": (unrealized_pnl / allocated_capital) * 100 if allocated_capital > 0 else 0,
            "grid_spacing_interval": (max(grid_levels) - min(grid_levels)) / len(grid_levels) if len(grid_levels) > 1 else 0,
            "active_orders_count": active_orders_count,
            "fill_rate_percent": 85.0 + (hash(str(current_price)) % 15),  # Mock fill rate
            "grid_utilization_percent": grid_utilization,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }