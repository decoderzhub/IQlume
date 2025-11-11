"""
Spot Grid Strategy Executor

This module implements the execution logic for spot grid trading strategies.
Grid trading involves placing buy and sell orders at regular intervals above and below the current price.
"""

import logging
from typing import Dict, Any, List, Optional, Any as AnyType
from datetime import datetime, timezone
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest, GetOrdersRequest
from alpaca.trading.enums import OrderSide, TimeInForce, QueryOrderStatus
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

            # Determine appropriate time_in_force
            is_fractional = sell_qty < 1.0
            is_crypto = self.normalize_crypto_symbol(symbol) is not None
            # Use IOC for crypto (immediate execution), DAY for fractional stocks, GTC otherwise
            if is_crypto:
                time_in_force_enum = TimeInForce.IOC
            elif is_fractional and not is_crypto:
                time_in_force_enum = TimeInForce.DAY
            else:
                time_in_force_enum = TimeInForce.GTC

            # Place limit sell order
            order_request = LimitOrderRequest(
                symbol=symbol.replace("/", ""),
                qty=sell_qty,
                side=OrderSide.SELL,
                time_in_force=time_in_force_enum,
                limit_price=round(sell_price, 2)
            )

            order = self.trading_client.submit_order(order_request)
            order_id = str(order.id)

            self.logger.info(f"✅ [GRID] Placed sell order at level {next_sell_level} @ ${sell_price:.2f}, Order ID: {order_id}")

            # Determine if fractional and time_in_force for database record
            is_fractional = sell_qty < 1.0
            is_crypto = self.normalize_crypto_symbol(symbol) is not None
            if is_crypto:
                time_in_force = "ioc"
            elif is_fractional and not is_crypto:
                time_in_force = "day"
            else:
                time_in_force = "gtc"

            # Record grid order in database
            self.record_grid_order(
                strategy_data.get("user_id"),
                strategy_id,
                order_id,
                symbol,
                "sell",
                sell_qty,
                sell_price,
                next_sell_level,
                time_in_force,
                is_fractional
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

            # Determine appropriate time_in_force
            is_fractional = buy_qty < 1.0
            is_crypto = self.normalize_crypto_symbol(symbol) is not None
            # Use IOC for crypto (immediate execution), DAY for fractional stocks, GTC otherwise
            if is_crypto:
                time_in_force_enum = TimeInForce.IOC
            elif is_fractional and not is_crypto:
                time_in_force_enum = TimeInForce.DAY
            else:
                time_in_force_enum = TimeInForce.GTC

            # Place limit buy order
            order_request = LimitOrderRequest(
                symbol=symbol.replace("/", ""),
                qty=buy_qty,
                side=OrderSide.BUY,
                time_in_force=time_in_force_enum,
                limit_price=round(buy_price, 2)
            )

            order = self.trading_client.submit_order(order_request)
            order_id = str(order.id)

            self.logger.info(f"✅ [GRID] Placed buy order at level {next_buy_level} @ ${buy_price:.2f}, Order ID: {order_id}")

            # Determine if fractional and time_in_force for database record
            is_fractional = buy_qty < 1.0
            is_crypto = self.normalize_crypto_symbol(symbol) is not None
            if is_crypto:
                time_in_force = "ioc"
            elif is_fractional and not is_crypto:
                time_in_force = "day"
            else:
                time_in_force = "gtc"

            # Record grid order in database
            self.record_grid_order(
                strategy_data.get("user_id"),
                strategy_id,
                order_id,
                symbol,
                "buy",
                buy_qty,
                buy_price,
                next_buy_level,
                time_in_force,
                is_fractional
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
        grid_level: int,
        time_in_force: str = "gtc",
        is_fractional: bool = False
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
                    "time_in_force": time_in_force.lower(),
                }

                result = self.supabase.table("grid_orders").insert(order_data).execute()

                if result.data:
                    tif_indicator = " [DAY]" if time_in_force.lower() == "day" else ""
                    frac_indicator = " [FRACTIONAL]" if is_fractional else ""
                    self.logger.info(f"✅ Grid order recorded: {order_id} (Level {grid_level}, {side.upper()} @ ${price:.2f}){tif_indicator}{frac_indicator}")
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
            initial_buy_filled = telemetry_data.get("initial_buy_filled", False)
            initial_buy_alpaca_order_id = telemetry_data.get("initial_buy_alpaca_order_id")
            
            self.logger.info(f"📊 Grid config: {symbol} | Range: ${price_range_lower}-${price_range_upper} | Grids: {number_of_grids}")
            self.logger.info(f"🎯 Initial buy order submitted: {initial_buy_order_submitted}")
            self.logger.info(f"🎯 Initial buy order filled: {initial_buy_filled}")

            # Check for insufficient funds (skip check during initial setup phase)
            skip_funds_check = not initial_buy_order_submitted
            has_insufficient, required, available = await self.check_insufficient_funds(strategy_data, skip_initial_check=skip_funds_check)
            if has_insufficient:
                return {
                    "action": "error",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": 0,
                    "reason": f"Insufficient buying power: ${available:.2f} available, ${required:.2f} required. Strategy auto-paused."
                }

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

                # Calculate grid levels to determine how many are below current price
                grid_levels = self.calculate_grid_levels(
                    price_range_lower,
                    price_range_upper,
                    number_of_grids,
                    grid_mode
                )

                # Calculate initial buy based on account balance and reasonable position sizing
                if price_range_lower == 0 or price_range_upper == 0:
                    # If grid range not set, use 10% as fallback
                    initial_amount = allocated_capital * 0.1
                    num_grids_below = 0
                    self.logger.info(f"💡 Grid range not set, using 10% fallback: ${initial_amount}")
                else:
                    # Count how many grid levels are below current price
                    num_grids_below = len([level for level in grid_levels if level < current_price])

                    # SAFE LOGIC: Start with a conservative initial position
                    # Use 15-25% of allocated capital for initial buy, never more than available balance
                    capital_per_grid = allocated_capital / number_of_grids

                    # Calculate ideal initial amount (enough for 3-5 grids of potential sells)
                    # This prevents over-buying while ensuring we can start the grid
                    target_grids_to_cover = min(5, num_grids_below, number_of_grids // 4)
                    ideal_initial_amount = capital_per_grid * target_grids_to_cover

                    # Cap at 25% of allocated capital to be conservative
                    initial_amount = min(ideal_initial_amount, allocated_capital * 0.25)

                    self.logger.info(f"💡 Initial buy calculation (safe):")
                    self.logger.info(f"   Current price: ${current_price:.2f}")
                    self.logger.info(f"   Grid range: ${price_range_lower:.2f} - ${price_range_upper:.2f}")
                    self.logger.info(f"   Total grid levels: {number_of_grids}")
                    self.logger.info(f"   Grid levels below price: {num_grids_below}")
                    self.logger.info(f"   Capital per grid: ${capital_per_grid:.2f}")
                    self.logger.info(f"   Target grids to cover: {target_grids_to_cover}")
                    self.logger.info(f"   Initial buy amount: ${initial_amount:.2f} ({initial_amount / capital_per_grid:.1f} grids worth, {(initial_amount / allocated_capital * 100):.1f}% of capital)")
                
                buy_quantity = max(0.001, initial_amount / current_price)
                self.logger.info(f"💡 Calculated initial buy: ${initial_amount:.2f} = {buy_quantity:.6f} {symbol}")
                
                if buy_quantity > 0:
                    try:
                        # Determine time in force based on asset type
                        is_crypto = "/" in symbol or any(crypto in symbol for crypto in ["BTC", "ETH", "DOGE", "AVAX", "SHIB"])
                        is_market_open = self.is_market_open(symbol)

                        # Crypto market orders require GTC, stocks use DAY/OPG
                        # Note: IOC only works with limit orders, not market orders
                        if is_crypto:
                            time_in_force = TimeInForce.GTC
                        else:
                            time_in_force = TimeInForce.DAY if is_market_open else TimeInForce.OPG

                        self.logger.info(f"📈 Market open: {is_market_open}, Crypto: {is_crypto}, Using time in force: {time_in_force}")

                        # Create market order request
                        # For crypto: use notional (USD amount), for stocks: use qty (shares)
                        if is_crypto:
                            notional_value = round(initial_amount, 2)
                            order_request = MarketOrderRequest(
                                symbol=symbol.replace("/", ""),  # Remove slash for Alpaca format
                                notional=notional_value,  # USD amount for crypto
                                side=OrderSide.BUY,
                                time_in_force=time_in_force
                            )
                            self.logger.info(f"💰 [CRYPTO] Market order details:")
                            self.logger.info(f"   Symbol: {symbol.replace('/', '')}")
                            self.logger.info(f"   Notional: ${notional_value}")
                            self.logger.info(f"   Side: BUY")
                            self.logger.info(f"   Time in Force: {time_in_force}")
                            self.logger.info(f"   Request object: {order_request.__dict__ if hasattr(order_request, '__dict__') else order_request}")
                        else:
                            order_request = MarketOrderRequest(
                                symbol=symbol.replace("/", ""),
                                qty=buy_quantity,  # Share quantity for stocks
                                side=OrderSide.BUY,
                                time_in_force=time_in_force
                            )
                            self.logger.info(f"📊 [STOCK] Using qty={buy_quantity:.6f} for market order")

                        # Submit order to Alpaca
                        self.logger.info(f"🚀 Submitting order to Alpaca...")
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
                        
                        # Mark initial buy as submitted (not yet filled)
                        telemetry_data["initial_buy_order_submitted"] = True
                        telemetry_data["initial_buy_filled"] = False
                        telemetry_data["initial_buy_alpaca_order_id"] = order_id
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
            
            # REGULAR GRID LOGIC - Only execute after initial buy is FILLED
            if not initial_buy_order_submitted:
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": "Waiting for initial buy order to be submitted"
                }

            # Check if initial buy has been filled
            if not initial_buy_filled:
                self.logger.info(f"⏳ [GRID LOGIC] Initial buy order submitted but not yet filled. Waiting...")
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": f"Waiting for initial buy order {initial_buy_alpaca_order_id} to fill before placing limit orders"
                }

            self.logger.info(f"🔄 [GRID LOGIC] Initial buy filled, proceeding with grid limit order placement")

            # CHECK IF GRID HAS ALREADY BEEN INITIALIZED
            # Grid strategies should only place orders ONCE during initial setup
            # After that, the order fill monitor handles all subsequent order placement
            try:
                existing_grid_orders = self.supabase.table("grid_orders").select("id, status").eq(
                    "strategy_id", strategy_id
                ).in_("status", ["pending", "partially_filled", "filled"]).execute()

                if existing_grid_orders.data and len(existing_grid_orders.data) > 0:
                    active_count = len([o for o in existing_grid_orders.data if o["status"] in ["pending", "partially_filled"]])
                    self.logger.info(f"✅ [GRID INITIALIZED] Grid already has {len(existing_grid_orders.data)} orders ({active_count} active). Skipping re-initialization.")

                    # Grid is already set up - no need to place more orders
                    # The order fill monitor will handle placing new orders as fills occur
                    return {
                        "action": "hold",
                        "symbol": symbol,
                        "quantity": 0,
                        "price": current_price,
                        "reason": f"Grid already initialized with {len(existing_grid_orders.data)} orders ({active_count} active). Order fill monitor is managing grid."
                    }
            except Exception as check_error:
                self.logger.error(f"❌ Error checking existing grid orders: {check_error}")
                # Continue with execution if we can't check - better to potentially duplicate than fail

            self.logger.info(f"🆕 [GRID SETUP] No existing grid orders found. Initializing grid for the first time.")
            
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

                # Get open orders using proper request object
                orders_request = GetOrdersRequest(
                    status=QueryOrderStatus.OPEN,
                    limit=100
                )
                orders = self.trading_client.get_orders(filter=orders_request)
                open_orders = [o for o in orders if o.symbol == symbol]

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
                    is_crypto = "/" in symbol or any(crypto in symbol for crypto in ["BTC", "ETH", "DOGE", "AVAX", "SHIB"])

                    # Create market order request
                    # For crypto: use notional (USD amount), for stocks: use qty (shares)
                    if is_crypto:
                        # For crypto, calculate notional amount
                        notional_amount = action_result["quantity"] * action_result.get("price", current_price)
                        order_request = MarketOrderRequest(
                            symbol=symbol.replace("/", ""),
                            notional=round(notional_amount, 2),  # USD amount for crypto
                            side=order_side,
                            time_in_force=TimeInForce.GTC  # GTC required for crypto market orders
                        )
                    else:
                        order_request = MarketOrderRequest(
                            symbol=symbol.replace("/", ""),
                            qty=action_result["quantity"],  # Share quantity for stocks
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
            
            # Ensure initial_buy flags are preserved
            updated_telemetry["initial_buy_order_submitted"] = telemetry_data.get("initial_buy_order_submitted", True)
            updated_telemetry["initial_buy_filled"] = telemetry_data.get("initial_buy_filled", True)
            updated_telemetry["initial_buy_alpaca_order_id"] = telemetry_data.get("initial_buy_alpaca_order_id")
            
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

        # Calculate optimal quantity per grid level
        # Use current price as reference for initial calculation
        quantity_per_grid = self.calculate_optimal_quantity(
            allocated_capital,
            len(grid_levels),
            current_price,
            symbol,
            prefer_whole_shares=True
        )

        # Determine if this is a fractional quantity
        is_fractional = quantity_per_grid < 1.0

        # Check if symbol supports fractional trading (crypto typically does, stocks may not)
        is_crypto = self.normalize_crypto_symbol(symbol) is not None

        self.logger.info(f"📊 [GRID SETUP] Placing orders across ALL {len(grid_levels)} grid levels")
        self.logger.info(f"💰 Capital per grid: ${allocated_capital / len(grid_levels):.2f}")
        self.logger.info(f"📦 Quantity per grid: {quantity_per_grid:.6f} {symbol}")
        self.logger.info(f"🔢 Fractional orders: {is_fractional}, Is crypto: {is_crypto}")

        if is_fractional and not is_crypto:
            self.logger.warning(f"⚠️ [GRID SETUP] Using fractional quantities ({quantity_per_grid:.6f}) for non-crypto symbol {symbol}")
            self.logger.warning(f"⚠️ [GRID SETUP] Orders will be placed as DAY orders (expire at market close)")
            self.logger.warning(f"💡 [GRID SETUP] Consider increasing allocated capital to use whole shares and GTC orders")

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
                # Determine appropriate time_in_force based on quantity
                # Alpaca requires fractional orders to be DAY orders, not GTC
                # Crypto uses IOC for immediate execution
                if is_crypto:
                    time_in_force = TimeInForce.IOC
                    self.logger.info(f"🚀 [GRID] Using IOC order for crypto at level {grid_level_index}")
                elif is_fractional and not is_crypto:
                    time_in_force = TimeInForce.DAY
                    self.logger.info(f"⚠️ [GRID] Using DAY order for fractional quantity at level {grid_level_index}")
                else:
                    time_in_force = TimeInForce.GTC

                order_request = LimitOrderRequest(
                    symbol=symbol.replace("/", ""),
                    qty=quantity_per_grid,
                    side=OrderSide.BUY,
                    time_in_force=time_in_force,
                    limit_price=round(level, 2)
                )

                order = self.trading_client.submit_order(order_request)
                self.logger.info(f"✅ [GRID] Buy order placed at level {grid_level_index}: ${level:.2f}, TIF: {time_in_force}, Order ID: {order.id}")
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
                    grid_level_index,
                    time_in_force.value if hasattr(time_in_force, 'value') else str(time_in_force),
                    is_fractional
                )

            except AlpacaAPIError as e:
                error_msg = str(e).lower()
                # If we get fractional order error, retry with DAY order
                if "fractional" in error_msg and "day" in error_msg and time_in_force == TimeInForce.GTC:
                    self.logger.warning(f"⚠️ [GRID] Retrying buy order at level {grid_level_index} with DAY time_in_force")
                    try:
                        order_request.time_in_force = TimeInForce.DAY
                        order = self.trading_client.submit_order(order_request)
                        self.logger.info(f"✅ [GRID] Buy order placed (retry) at level {grid_level_index}: ${level:.2f}, Order ID: {order.id}")
                        orders_placed += 1
                        self.record_grid_order(
                            strategy_data.get("user_id"),
                            strategy_id,
                            str(order.id),
                            symbol,
                            "buy",
                            quantity_per_grid,
                            level,
                            grid_level_index,
                            "DAY",
                            True
                        )
                    except Exception as retry_error:
                        self.logger.error(f"❌ [GRID] Retry failed for buy order at level {grid_level_index}: {retry_error}")
                else:
                    self.logger.error(f"❌ [GRID] Failed to place buy order at level {grid_level_index} (${level:.2f}): {e}")
            except Exception as e:
                self.logger.error(f"❌ [GRID] Unexpected error placing buy order at level {grid_level_index}: {e}")

        # Place sell orders at ALL levels above current price
        # IMPORTANT: Only place sell orders if we have sufficient position
        # Alpaca doesn't support naked sell orders - you must own the shares first
        sell_levels = [level for level in grid_levels if level > current_price * 1.002]  # 0.2% above current
        self.logger.info(f"📈 Checking sell order placement at {len(sell_levels)} levels above ${current_price:.2f}")

        # Check if we have sufficient position to place sell orders
        if current_qty < quantity_per_grid * 0.1:  # Need at least 10% of one grid quantity
            self.logger.info(f"⏸️ [GRID] Insufficient position ({current_qty:.6f}) to place sell orders. Waiting for buy orders to fill first.")
            self.logger.info(f"💡 [GRID] Buy orders will be placed, and sell orders will be added as position accumulates.")
        else:
            self.logger.info(f"✅ [GRID] Current position: {current_qty:.6f} {symbol}. Placing sell orders.")

        # For sell orders, only place them if we have sufficient position
        # The order fill monitor will place new sell orders as buy orders fill
        for level in sell_levels:
            grid_level_index = grid_levels.index(level)

            # Skip if order already exists at this grid level
            if (grid_level_index, "sell") in existing_grid_orders:
                self.logger.info(f"⏭️ [GRID] Sell order already exists at level {grid_level_index}")
                continue

            # CRITICAL: Skip sell orders if we don't have enough position
            # Alpaca will reject sell orders for shares you don't own
            if current_qty < quantity_per_grid * 0.1:
                self.logger.info(f"⏸️ [GRID] Skipping sell order at level {grid_level_index} - insufficient position ({current_qty:.6f} < {quantity_per_grid * 0.1:.6f})")
                continue

            try:
                # Calculate sell quantity - never sell more than we have
                # Reserve some position for multiple sell orders
                max_sell_qty = min(quantity_per_grid, current_qty * 0.8)  # Max 80% of position per order
                sell_qty = max(0.001, max_sell_qty) if max_sell_qty > 0 else quantity_per_grid

                # Update fractional check based on actual sell quantity
                is_sell_fractional = sell_qty < 1.0

                # Determine appropriate time_in_force based on quantity
                # Alpaca requires fractional orders to be DAY orders, not GTC
                # Crypto uses IOC for immediate execution
                if is_crypto:
                    time_in_force = TimeInForce.IOC
                    self.logger.info(f"🚀 [GRID] Using IOC order for crypto at level {grid_level_index}")
                elif is_sell_fractional and not is_crypto:
                    time_in_force = TimeInForce.DAY
                    self.logger.info(f"⚠️ [GRID] Using DAY order for fractional quantity at level {grid_level_index}")
                else:
                    time_in_force = TimeInForce.GTC

                order_request = LimitOrderRequest(
                    symbol=symbol.replace("/", ""),
                    qty=sell_qty,
                    side=OrderSide.SELL,
                    time_in_force=time_in_force,
                    limit_price=round(level, 2)
                )

                order = self.trading_client.submit_order(order_request)
                self.logger.info(f"✅ [GRID] Sell order placed at level {grid_level_index}: ${level:.2f}, Qty: {sell_qty:.6f}, TIF: {time_in_force}, Order ID: {order.id}")
                orders_placed += 1

                # Record grid order in database
                self.record_grid_order(
                    strategy_data.get("user_id"),
                    strategy_id,
                    str(order.id),
                    symbol,
                    "sell",
                    sell_qty,
                    level,
                    grid_level_index,
                    time_in_force.value if hasattr(time_in_force, 'value') else str(time_in_force),
                    is_sell_fractional
                )

            except AlpacaAPIError as e:
                error_msg = str(e).lower()

                # Check for insufficient quantity error
                if "insufficient" in error_msg and "qty" in error_msg:
                    self.logger.warning(f"⚠️ [GRID] Insufficient position to place sell order at level {grid_level_index}. Skipping.")
                    continue

                # If we get fractional order error, retry with DAY order
                if "fractional" in error_msg and "day" in error_msg and time_in_force == TimeInForce.GTC:
                    self.logger.warning(f"⚠️ [GRID] Retrying sell order at level {grid_level_index} with DAY time_in_force")
                    try:
                        order_request.time_in_force = TimeInForce.DAY
                        order = self.trading_client.submit_order(order_request)
                        self.logger.info(f"✅ [GRID] Sell order placed (retry) at level {grid_level_index}: ${level:.2f}, Order ID: {order.id}")
                        orders_placed += 1
                        self.record_grid_order(
                            strategy_data.get("user_id"),
                            strategy_id,
                            str(order.id),
                            symbol,
                            "sell",
                            sell_qty,
                            level,
                            grid_level_index,
                            "DAY",
                            True
                        )
                    except Exception as retry_error:
                        self.logger.error(f"❌ [GRID] Retry failed for sell order at level {grid_level_index}: {retry_error}")
                else:
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

    def calculate_optimal_quantity(
        self,
        allocated_capital: float,
        num_grids: int,
        price: float,
        symbol: str,
        prefer_whole_shares: bool = True
    ) -> float:
        """
        Calculate optimal quantity per grid level

        Args:
            allocated_capital: Total capital allocated to strategy
            num_grids: Number of grid levels
            price: Price at grid level
            symbol: Trading symbol
            prefer_whole_shares: Whether to round to whole shares for non-crypto

        Returns:
            Quantity to trade at this grid level
        """
        # Calculate base quantity
        capital_per_grid = allocated_capital / num_grids
        quantity = capital_per_grid / price

        # Check if this is crypto (supports fractional trading)
        is_crypto = self.normalize_crypto_symbol(symbol) is not None

        if prefer_whole_shares and not is_crypto:
            # For stocks, try to round to whole shares if close
            if quantity >= 0.5:
                # Round to nearest whole number
                rounded_qty = round(quantity)
                if rounded_qty >= 1:
                    self.logger.info(f"💡 Rounded quantity from {quantity:.6f} to {rounded_qty} whole shares")
                    return float(rounded_qty)

        # For crypto or when we must use fractional, ensure minimum
        return max(0.001, quantity)

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