"""
DCA (Dollar Cost Averaging) Strategy Executor
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from alpaca.trading.enums import OrderSide
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class DCAExecutor(BaseStrategyExecutor):
    """Executor for DCA trading strategies"""
    
    async def execute(self) -> Dict[str, Any]:
        """Execute a single iteration of the DCA strategy"""
        self.logger.info(f"🤖 Executing DCA strategy: {self.strategy['name']}")
        
        strategy_id = self.strategy["id"]
        symbol = self.strategy["configuration"].get("symbol", "BTC/USD")
        investment_amount = self.strategy["configuration"].get("investment_amount_per_interval", 100)
        frequency = self.strategy["configuration"].get("frequency", "daily")
        
        # Get current market price
        current_price = self.get_current_price(symbol)
        if not current_price:
            return {"action": "error", "reason": "Could not fetch current price"}
        
        # Calculate quantity to buy
        quantity_to_buy = investment_amount / current_price
        
        # Check if we should execute based on frequency
        last_execution = self.strategy.get("last_execution")
        should_execute = self._should_execute_dca(last_execution, frequency)
        
        if not should_execute:
            return {
                "action": "hold",
                "symbol": symbol,
                "quantity": 0,
                "price": current_price,
                "reason": f"DCA frequency not met ({frequency})"
            }
        
        # Place DCA buy order
        order_result = self.place_order(
            symbol, OrderSide.BUY, quantity_to_buy,
            "market", None, strategy_id, "dca"
        )
        
        if order_result["success"]:
            # Update telemetry
            telemetry_data = {
                "allocated_capital_usd": self.strategy.get("min_capital", 0),
                "current_profit_loss_usd": 0,  # Would calculate from positions
                "current_profit_loss_percent": 0,
                "active_orders_count": 1,
                "last_updated": datetime.now(timezone.utc).isoformat(),
            }
            
            self.update_strategy_telemetry(strategy_id, telemetry_data)
            
            return {
                "action": "buy",
                "symbol": symbol,
                "quantity": quantity_to_buy,
                "price": order_result.get("price", current_price),
                "reason": f"DCA {frequency} purchase executed",
                "order_id": order_result["order_id"]
            }
        else:
            return {"action": "error", "reason": order_result["error"]}
    
    def _should_execute_dca(self, last_execution: str, frequency: str) -> bool:
        """Check if DCA should execute based on frequency"""
        if not last_execution:
            return True
        
        last_exec_time = datetime.fromisoformat(last_execution.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        time_diff = now - last_exec_time
        
        if frequency == "daily":
            return time_diff.days >= 1
        elif frequency == "weekly":
            return time_diff.days >= 7
        elif frequency == "monthly":
            return time_diff.days >= 30
        
        return False