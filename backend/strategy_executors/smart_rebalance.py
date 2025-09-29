"""
Smart Rebalance Strategy Executor

This module implements the execution logic for smart rebalance strategies.
Smart rebalancing involves maintaining target allocations across multiple assets.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.common.exceptions import APIError as AlpacaAPIError
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class SmartRebalanceExecutor(BaseStrategyExecutor):
    """Executor for smart rebalance strategies"""
    
    async def execute(self, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute smart rebalance strategy logic"""
        try:
            strategy_id = strategy_data.get("id")
            strategy_name = strategy_data.get("name", "Unknown Strategy")
            configuration = strategy_data.get("configuration", {})
            
            self.logger.info(f"🤖 Executing smart rebalance strategy: {strategy_name}")
            
            # Extract configuration
            allocated_capital = configuration.get("allocated_capital", 5000)
            allocation_method = configuration.get("allocation_method", "even_split")
            cash_balance_percent = configuration.get("cash_balance_percent", 20)
            assets = configuration.get("assets", [])
            rebalance_frequency = configuration.get("rebalance_frequency", "weekly")
            deviation_threshold_percent = configuration.get("deviation_threshold_percent", 5)
            
            # Get telemetry data and check initial buy status
            telemetry_data = strategy_data.get("telemetry_data", {})
            if not isinstance(telemetry_data, dict):
                telemetry_data = {}
            
            initial_buy_order_submitted = telemetry_data.get("initial_buy_order_submitted", False)
            
            self.logger.info(f"📊 Rebalance config: {len(assets)} assets | Method: {allocation_method} | Cash: {cash_balance_percent}%")
            self.logger.info(f"🎯 Initial buy order submitted: {initial_buy_order_submitted}")
            
            # INITIAL PORTFOLIO BUY LOGIC - Execute once per strategy
            if not initial_buy_order_submitted and assets:
                self.logger.info(f"🚀 [INITIAL BUY] Performing initial portfolio buy for {strategy_name}")
                
                # Calculate investment amount (excluding cash allocation)
                investment_amount = allocated_capital * (1 - cash_balance_percent / 100)
                
                orders_placed = []
                total_orders_value = 0
                
                for asset in assets:
                    if not asset.get("symbol") or not asset.get("allocation"):
                        continue
                    
                    symbol = asset["symbol"]
                    allocation_percent = asset["allocation"]
                    
                    # Calculate amount to invest in this asset
                    asset_investment = investment_amount * (allocation_percent / 100)
                    
                    # Get current price
                    current_price = self.get_current_price(symbol)
                    if not current_price or current_price <= 0:
                        self.logger.error(f"❌ [INITIAL BUY] Unable to get price for {symbol}")
                        continue
                    
                    # Calculate quantity
                    quantity = asset_investment / current_price
                    
                    if quantity > 0:
                        try:
                            # Check if market is open
                            is_market_open = self.is_market_open(symbol)
                            time_in_force = TimeInForce.DAY if is_market_open else TimeInForce.OPG
                            
                            self.logger.info(f"📈 [INITIAL BUY] {symbol}: ${asset_investment:.2f} = {quantity:.6f} shares @ ${current_price:.2f}")
                            
                            # Create market order request
                            order_request = MarketOrderRequest(
                                symbol=symbol.replace("/", ""),  # Remove slash for Alpaca format
                                qty=quantity,
                                side=OrderSide.BUY,
                                time_in_force=time_in_force
                            )
                            
                            # Submit order to Alpaca
                            order = self.trading_client.submit_order(order_request)
                            order_id = str(order.id)
                            
                            self.logger.info(f"✅ [INITIAL BUY] {symbol} order placed: {order_id}")
                            
                            orders_placed.append({
                                "symbol": symbol,
                                "quantity": quantity,
                                "price": current_price,
                                "order_id": order_id,
                                "allocation_percent": allocation_percent,
                                "investment_amount": asset_investment
                            })
                            
                            total_orders_value += asset_investment
                            
                            # Record trade in Supabase
                            try:
                                trade_data = {
                                    "user_id": strategy_data.get("user_id"),
                                    "strategy_id": strategy_id,
                                    "symbol": symbol,
                                    "type": "buy",
                                    "quantity": quantity,
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
                                    self.logger.info(f"✅ [INITIAL BUY] {symbol} trade recorded: {trade_id}")
                                    
                            except Exception as trade_error:
                                self.logger.error(f"❌ [INITIAL BUY] Error recording {symbol} trade: {trade_error}")
                            
                        except AlpacaAPIError as e:
                            self.logger.error(f"❌ [INITIAL BUY] Failed to place {symbol} order: {e}")
                            continue
                        except Exception as e:
                            self.logger.error(f"❌ [INITIAL BUY] Unexpected error placing {symbol} order: {e}")
                            continue
                
                if orders_placed:
                    # Mark initial buy as completed
                    telemetry_data["initial_buy_order_submitted"] = True
                    telemetry_data["initial_orders"] = orders_placed
                    telemetry_data["last_updated"] = datetime.now(timezone.utc).isoformat()
                    
                    # Update telemetry in database
                    self.update_strategy_telemetry(strategy_id, telemetry_data)
                    
                    # Return result
                    market_status = "Market is open" if self.is_market_open(assets[0]["symbol"]) else "Market is closed - orders will execute at market open"
                    return {
                        "action": "buy",
                        "symbol": f"{len(orders_placed)} assets",
                        "quantity": len(orders_placed),
                        "price": total_orders_value,
                        "order_ids": [order["order_id"] for order in orders_placed],
                        "reason": f"Initial portfolio buy orders placed for {len(orders_placed)} assets. {market_status}. Total investment: ${total_orders_value:.2f}"
                    }
                else:
                    return {
                        "action": "error",
                        "symbol": "portfolio",
                        "quantity": 0,
                        "price": 0,
                        "reason": "Failed to place any initial buy orders"
                    }
            
            # REGULAR REBALANCING LOGIC - Only execute after initial buy is completed
            if not initial_buy_order_submitted:
                return {
                    "action": "hold",
                    "symbol": "portfolio",
                    "quantity": 0,
                    "price": 0,
                    "reason": "Waiting for initial portfolio buy orders to be submitted"
                }
            
            self.logger.info(f"🔄 [REBALANCE LOGIC] Initial buy completed, checking for rebalancing needs")
            
            # Check if it's time to rebalance
            last_execution = strategy_data.get("last_execution")
            should_rebalance = self.should_execute_rebalance(last_execution, rebalance_frequency)
            
            if not should_rebalance:
                return {
                    "action": "hold",
                    "symbol": "portfolio",
                    "quantity": 0,
                    "price": 0,
                    "reason": f"Next rebalance not due yet (frequency: {rebalance_frequency})"
                }
            
            # Get current positions
            try:
                positions = self.trading_client.get_all_positions()
                current_portfolio_value = sum(float(p.market_value) for p in positions)
                
                self.logger.info(f"📊 Current portfolio value: ${current_portfolio_value:.2f}")
                
                # Check if rebalancing is needed based on deviation threshold
                rebalance_needed = False
                rebalance_actions = []
                
                for asset in assets:
                    symbol = asset["symbol"]
                    target_allocation = asset["allocation"] / 100
                    
                    # Find current position
                    current_position = next((p for p in positions if p.symbol == symbol), None)
                    current_value = float(current_position.market_value) if current_position else 0
                    current_allocation = current_value / current_portfolio_value if current_portfolio_value > 0 else 0
                    
                    # Check if deviation exceeds threshold
                    deviation = abs(current_allocation - target_allocation) * 100
                    
                    if deviation > deviation_threshold_percent:
                        rebalance_needed = True
                        target_value = current_portfolio_value * target_allocation
                        rebalance_amount = target_value - current_value
                        
                        rebalance_actions.append({
                            "symbol": symbol,
                            "current_allocation": current_allocation * 100,
                            "target_allocation": target_allocation * 100,
                            "deviation": deviation,
                            "rebalance_amount": rebalance_amount,
                            "action": "buy" if rebalance_amount > 0 else "sell"
                        })
                
                if rebalance_needed and rebalance_actions:
                    # Execute the first rebalance action (one at a time for safety)
                    action = rebalance_actions[0]
                    symbol = action["symbol"]
                    amount = abs(action["rebalance_amount"])
                    
                    # Get current price
                    current_price = self.get_current_price(symbol)
                    if not current_price:
                        return {
                            "action": "error",
                            "symbol": symbol,
                            "quantity": 0,
                            "price": 0,
                            "reason": f"Unable to fetch current price for {symbol}"
                        }
                    
                    # Calculate quantity
                    quantity = amount / current_price
                    
                    try:
                        # Create market order request
                        order_request = MarketOrderRequest(
                            symbol=symbol.replace("/", ""),
                            qty=quantity,
                            side=OrderSide.BUY if action["action"] == "buy" else OrderSide.SELL,
                            time_in_force=TimeInForce.DAY
                        )
                        
                        # Submit order to Alpaca
                        order = self.trading_client.submit_order(order_request)
                        
                        return {
                            "action": action["action"],
                            "symbol": symbol,
                            "quantity": quantity,
                            "price": current_price,
                            "order_id": str(order.id),
                            "reason": f"Rebalancing {symbol}: {action['current_allocation']:.1f}% → {action['target_allocation']:.1f}% (deviation: {action['deviation']:.1f}%)"
                        }
                        
                    except AlpacaAPIError as e:
                        self.logger.error(f"❌ [REBALANCE] Failed to place {symbol} order: {e}")
                        return {
                            "action": "error",
                            "symbol": symbol,
                            "quantity": 0,
                            "price": current_price,
                            "reason": f"Failed to place rebalance order for {symbol}: {str(e)}"
                        }
                else:
                    return {
                        "action": "hold",
                        "symbol": "portfolio",
                        "quantity": 0,
                        "price": current_portfolio_value,
                        "reason": f"Portfolio is balanced within {deviation_threshold_percent}% threshold"
                    }
                    
            except Exception as e:
                self.logger.error(f"❌ [REBALANCE] Error checking positions: {e}")
                return {
                    "action": "error",
                    "symbol": "portfolio",
                    "quantity": 0,
                    "price": 0,
                    "reason": f"Error checking portfolio positions: {str(e)}"
                }
                
        except Exception as e:
            self.logger.error(f"❌ Error in smart rebalance execution: {e}", exc_info=True)
            return {
                "action": "error",
                "symbol": configuration.get("assets", [{}])[0].get("symbol", "UNKNOWN") if configuration.get("assets") else "UNKNOWN",
                "quantity": 0,
                "price": 0,
                "reason": f"Smart rebalance execution error: {str(e)}"
            }
    
    def should_execute_rebalance(self, last_execution: Optional[str], frequency: str) -> bool:
        """Determine if it's time to execute rebalancing based on frequency"""
        if not last_execution:
            return True  # First execution
        
        last_exec_time = datetime.fromisoformat(last_execution.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        time_diff = now - last_exec_time
        
        if frequency == "daily":
            return time_diff >= timedelta(days=1)
        elif frequency == "weekly":
            return time_diff >= timedelta(weeks=1)
        elif frequency == "monthly":
            return time_diff >= timedelta(days=30)
        else:
            return time_diff >= timedelta(hours=1)  # Default to hourly for testing