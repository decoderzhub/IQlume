"""
Smart Rebalance Strategy Executor
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from alpaca.trading.enums import OrderSide
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class SmartRebalanceExecutor(BaseStrategyExecutor):
    """Executor for Smart Rebalance trading strategies"""
    
    async def execute(self) -> Dict[str, Any]:
        """Execute a single iteration of the Smart Rebalance strategy"""
        self.logger.info(f"🤖 Executing Smart Rebalance strategy: {self.strategy['name']}")
        
        strategy_id = self.strategy["id"]
        capital_allocation = self.strategy.get("capital_allocation", {})
        total_capital = capital_allocation.get("value", self.strategy.get("min_capital", 10000))
        target_assets = capital_allocation.get("assets", [])
        allocation_mode = capital_allocation.get("allocation_mode", "manual")
        rebalance_threshold = self.strategy["configuration"].get("rebalance_threshold", 5.0)
        
        if not target_assets:
            return {"action": "error", "reason": "No target assets configured for rebalancing"}
        
        # Get current portfolio positions
        current_positions = {}
        try:
            positions = self.trading_client.get_all_positions()
            for position in positions:
                current_positions[position.symbol] = {
                    "quantity": float(position.qty),
                    "market_value": float(position.market_value),
                    "current_price": float(position.current_price) if hasattr(position, 'current_price') else 0
                }
        except Exception as e:
            self.logger.error(f"Error fetching positions: {e}")
            return {"action": "error", "reason": f"Could not fetch current positions: {e}"}
        
        # Calculate current allocations
        total_portfolio_value = sum(pos["market_value"] for pos in current_positions.values())
        if total_portfolio_value == 0:
            total_portfolio_value = total_capital  # Use allocated capital if no positions
        
        # Check if rebalancing is needed
        rebalance_needed = False
        rebalance_actions = []
        
        for target_asset in target_assets:
            symbol = target_asset["symbol"]
            target_percent = target_asset["allocation_percent"]
            target_value = (target_percent / 100) * total_capital
            
            # Skip CASH for now (would be handled differently in production)
            if symbol == "CASH":
                continue
            
            current_position = current_positions.get(symbol, {"market_value": 0, "quantity": 0})
            current_value = current_position["market_value"]
            current_percent = (current_value / total_portfolio_value) * 100 if total_portfolio_value > 0 else 0
            
            deviation = abs(current_percent - target_percent)
            
            if deviation > rebalance_threshold:
                rebalance_needed = True
                
                # Calculate required action
                value_difference = target_value - current_value
                
                if abs(value_difference) > 100:  # Only rebalance if difference > $100
                    # Get current price for quantity calculation
                    current_price = self.get_current_price(symbol)
                    if not current_price:
                        continue
                    
                    if value_difference > 0:
                        # Need to buy more
                        quantity_to_buy = value_difference / current_price
                        rebalance_actions.append({
                            "action": "buy",
                            "symbol": symbol,
                            "quantity": quantity_to_buy,
                            "value": value_difference,
                            "reason": f"Underweight by {deviation:.1f}%"
                        })
                    else:
                        # Need to sell some
                        quantity_to_sell = abs(value_difference) / current_price
                        available_quantity = current_position["quantity"]
                        
                        if quantity_to_sell <= available_quantity:
                            rebalance_actions.append({
                                "action": "sell",
                                "symbol": symbol,
                                "quantity": quantity_to_sell,
                                "value": abs(value_difference),
                                "reason": f"Overweight by {deviation:.1f}%"
                            })
        
        if not rebalance_needed:
            return {
                "action": "hold",
                "reason": f"Portfolio is balanced within {rebalance_threshold}% threshold"
            }
        
        # Execute the first rebalancing action (in production, you might batch these)
        if rebalance_actions:
            action = rebalance_actions[0]
            
            order_side = OrderSide.BUY if action["action"] == "buy" else OrderSide.SELL
            order_result = self.place_order(
                action["symbol"], 
                order_side, 
                action["quantity"],
                "market", 
                None, 
                strategy_id, 
                "rebalance"
            )
            
            if order_result["success"]:
                # Update telemetry
                telemetry_data = {
                    "allocated_capital_usd": total_capital,
                    "current_profit_loss_usd": 0,  # Would calculate from positions
                    "current_profit_loss_percent": 0,
                    "active_orders_count": 1,
                    "last_updated": datetime.now(timezone.utc).isoformat(),
                }
                
                self.update_strategy_telemetry(strategy_id, telemetry_data)
                
                return {
                    "action": action["action"],
                    "symbol": action["symbol"],
                    "quantity": action["quantity"],
                    "price": order_result.get("price", 0),
                    "reason": f"Rebalancing: {action['reason']}",
                    "order_id": order_result["order_id"]
                }
            else:
                return {"action": "error", "reason": order_result["error"]}
        
        return {"action": "hold", "reason": "No rebalancing actions needed"}