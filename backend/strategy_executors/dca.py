"""
DCA (Dollar Cost Averaging) Strategy Executor

This module implements the execution logic for DCA trading strategies.
DCA involves making regular purchases of an asset regardless of price.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.common.exceptions import APIError as AlpacaAPIError
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class DCAExecutor(BaseStrategyExecutor):
    """Executor for DCA (Dollar Cost Averaging) strategies"""
    
    async def execute(self, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute DCA strategy logic"""
        try:
            strategy_id = strategy_data.get("id")
            strategy_name = strategy_data.get("name", "Unknown Strategy")
            configuration = strategy_data.get("configuration", {})
            
            self.logger.info(f"🤖 Executing DCA strategy: {strategy_name}")
            
            # Extract configuration
            symbol = configuration.get("symbol", "BTC/USD")
            investment_amount = configuration.get("investment_amount_per_interval", 100)
            frequency = configuration.get("frequency", "daily")
            
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
            
            # Check if it's time to invest based on frequency
            last_execution = strategy_data.get("last_execution")
            should_invest = self.should_execute_dca(last_execution, frequency)
            
            if should_invest:
                # Calculate quantity to buy
                quantity = investment_amount / current_price
                
                # Try to place the order with Alpaca
                try:
                    order_request = MarketOrderRequest(
                        symbol=symbol.replace("/", ""),  # Remove slash for Alpaca format
                        qty=quantity,
                        side=OrderSide.BUY,
                        time_in_force=TimeInForce.DAY
                    )
                    
                    # Submit order to Alpaca
                    order = self.trading_client.submit_order(order_request)
                    
                    return {
                        "action": "buy",
                        "symbol": symbol,
                        "quantity": quantity,
                        "price": current_price,
                        "order_id": str(order.id),
                        "reason": f"DCA {frequency} investment of ${investment_amount} | Order ID: {order.id}"
                    }
                    
                except AlpacaAPIError as e:
                    self.logger.error(f"❌ [DCA] Failed to place order with Alpaca: {e}")
                    return {
                        "action": "error",
                        "symbol": symbol,
                        "quantity": 0,
                        "price": current_price,
                        "reason": f"Failed to place DCA order: {str(e)}"
                    }
                except Exception as e:
                    self.logger.error(f"❌ [DCA] Unexpected error placing order: {e}")
                    return {
                        "action": "error",
                        "symbol": symbol,
                        "quantity": 0,
                        "price": current_price,
                        "reason": f"Unexpected error: {str(e)}"
                    }
            else:
                return {
                    "action": "hold",
                    "symbol": symbol,
                    "quantity": 0,
                    "price": current_price,
                    "reason": f"Next DCA investment not due yet (frequency: {frequency})"
                }
                
        except Exception as e:
            self.logger.error(f"❌ Error in DCA execution: {e}", exc_info=True)
            return {
                "action": "error",
                "symbol": configuration.get("symbol", "UNKNOWN"),
                "quantity": 0,
                "price": 0,
                "reason": f"DCA execution error: {str(e)}"
            }
    
    def should_execute_dca(self, last_execution: Optional[str], frequency: str) -> bool:
        """Determine if it's time to execute DCA based on frequency"""
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