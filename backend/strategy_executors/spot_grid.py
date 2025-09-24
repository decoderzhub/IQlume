"""
Spot Grid Strategy Executor
"""

import logging
from typing import Dict, Any
from datetime import datetime, timezone

from alpaca.trading.enums import OrderSide
from .base import BaseStrategyExecutor

logger = logging.getLogger(__name__)

class SpotGridExecutor(BaseStrategyExecutor):
    """Executor for Spot Grid trading strategies"""
    
    async def execute(self) -> Dict[str, Any]:
        """Execute a single iteration of the spot grid strategy"""
        self.logger.info(f"🤖 Executing spot grid strategy: {self.strategy['name']}")
        
        strategy_id = self.strategy["id"]
        symbol = self.strategy["configuration"].get("symbol", "BTC/USD")
        lower_price_limit = self.strategy["configuration"].get("price_range_lower", 50000)
        upper_price_limit = self.strategy["configuration"].get("price_range_upper", 70000)
        number_of_grids = self.strategy["configuration"].get("number_of_grids", 20)
        grid_mode = self.strategy.get("grid_mode", "arithmetic")
        quantity_per_grid = self.strategy.get("quantity_per_grid", 0.0001)
        stop_loss_percent = self.strategy.get("stop_loss_percent", 0)
        trailing_stop_loss_percent = self.strategy.get("trailing_stop_loss_percent", 0)
        take_profit_levels = self.strategy.get("take_profit_levels", [])
        technical_indicators_config = self.strategy.get("technical_indicators", {})
        
        # Get current market price
        current_price = self.get_current_price(symbol)
        if not current_price:
            return {"action": "error", "reason": "Could not fetch current price"}
        
        # Generate grid levels
        grid_levels = self._generate_grid_levels(
            lower_price_limit, upper_price_limit, number_of_grids, grid_mode
        )
        
        # Check technical indicators
        ti_signals = self.check_technical_indicators(symbol, technical_indicators_config)
        buy_signal_ti = ti_signals["buy_signal"]
        sell_signal_ti = ti_signals["sell_signal"]
        
        # Get current position and open orders
        symbol_position = self.get_current_position(symbol)
        strategy_open_orders = self.get_open_orders(strategy_id)
        
        # Calculate current P&L
        current_total_profit_loss_usd = 0.0
        if symbol_position:
            current_total_profit_loss_usd = float(symbol_position.unrealized_pl or 0)
        
        current_strategy_value = float(symbol_position.market_value or 0) if symbol_position else 0.0
        initial_capital_for_strategy = self.strategy.get("min_capital", 1000)
        current_profit_loss_percent = (
            (current_strategy_value - initial_capital_for_strategy) / initial_capital_for_strategy * 100 
            if initial_capital_for_strategy > 0 else 0
        )
        
        # Check stop loss
        stop_loss_result = self._check_stop_loss(
            symbol, current_profit_loss_percent, stop_loss_percent, 
            symbol_position, strategy_id
        )
        if stop_loss_result:
            return stop_loss_result
        
        # Check take profit
        take_profit_result = self._check_take_profit(
            symbol, current_price, take_profit_levels, symbol_position, strategy_id
        )
        if take_profit_result:
            return take_profit_result
        
        # Execute grid trading logic
        grid_result = self._execute_grid_logic(
            symbol, current_price, lower_price_limit, upper_price_limit,
            number_of_grids, quantity_per_grid, strategy_open_orders,
            buy_signal_ti, sell_signal_ti, strategy_id
        )
        
        # Update telemetry
        telemetry_data = self._calculate_telemetry(
            current_price, lower_price_limit, upper_price_limit, number_of_grids,
            current_total_profit_loss_usd, current_profit_loss_percent,
            strategy_open_orders, stop_loss_percent, take_profit_levels
        )
        
        self.update_strategy_telemetry(strategy_id, telemetry_data)
        
        return grid_result
    
    def _generate_grid_levels(self, lower: float, upper: float, num_grids: int, mode: str) -> list:
        """Generate grid price levels"""
        grid_levels = []
        
        if mode == "arithmetic":
            step = (upper - lower) / num_grids
            grid_levels = [lower + i * step for i in range(num_grids + 1)]
        elif mode == "geometric":
            ratio = (upper / lower) ** (1 / num_grids)
            grid_levels = [lower * (ratio ** i) for i in range(num_grids + 1)]
        
        return grid_levels
    
    def _check_stop_loss(self, symbol: str, current_profit_loss_percent: float,
                        stop_loss_percent: float, symbol_position: Any, strategy_id: str) -> Optional[Dict[str, Any]]:
        """Check and execute stop loss if triggered"""
        if stop_loss_percent <= 0:
            return None
            
        if current_profit_loss_percent < -stop_loss_percent:
            self.logger.warning(f"🚨 Stop Loss triggered for {symbol}! Current P/L: {current_profit_loss_percent:.2f}%")
            
            if symbol_position and float(symbol_position.qty) > 0:
                order_result = self.place_order(
                    symbol, OrderSide.SELL, float(symbol_position.qty),
                    "market", None, strategy_id, "sl"
                )
                
                if order_result["success"]:
                    # Deactivate strategy after stop loss
                    self.supabase.table("trading_strategies").update({"is_active": False}).eq("id", strategy_id).execute()
                    return {
                        "action": "sell",
                        "symbol": symbol,
                        "quantity": float(symbol_position.qty),
                        "price": order_result.get("price", 0),
                        "reason": "Stop Loss Triggered",
                        "order_id": order_result["order_id"]
                    }
                else:
                    return {"action": "error", "reason": order_result["error"]}
            else:
                return {"action": "hold", "reason": "Stop Loss triggered but no position to sell"}
        
        return None
    
    def _check_take_profit(self, symbol: str, current_price: float, take_profit_levels: list,
                          symbol_position: Any, strategy_id: str) -> Optional[Dict[str, Any]]:
        """Check and execute take profit if triggered"""
        if not take_profit_levels or not symbol_position:
            return None
            
        current_total_profit_loss_usd = float(symbol_position.unrealized_pl or 0)
        
        if current_total_profit_loss_usd > 0:
            for tp_level in take_profit_levels:
                tp_percent = tp_level.get("percent", 0)
                tp_quantity_percent = tp_level.get("quantity_percent", 100)
                
                if float(symbol_position.avg_entry_price) > 0:
                    profit_from_entry_percent = (
                        (current_price - float(symbol_position.avg_entry_price)) / 
                        float(symbol_position.avg_entry_price) * 100
                    )
                    
                    if profit_from_entry_percent >= tp_percent:
                        self.logger.info(f"💰 Take Profit triggered for {symbol} at {tp_percent}% profit!")
                        qty_to_sell = float(symbol_position.qty) * (tp_quantity_percent / 100)
                        
                        if qty_to_sell > 0:
                            order_result = self.place_order(
                                symbol, OrderSide.SELL, qty_to_sell,
                                "market", None, strategy_id, "tp"
                            )
                            
                            if order_result["success"]:
                                return {
                                    "action": "sell",
                                    "symbol": symbol,
                                    "quantity": qty_to_sell,
                                    "price": order_result.get("price", current_price),
                                    "reason": "Take Profit Triggered",
                                    "order_id": order_result["order_id"]
                                }
                            else:
                                return {"action": "error", "reason": order_result["error"]}
        
        return None
    
    def _calculate_telemetry(self, current_price: float, lower_limit: float, upper_limit: float,
                           num_grids: int, profit_loss_usd: float, profit_loss_percent: float,
                           open_orders: list, stop_loss_percent: float, take_profit_levels: list) -> Dict[str, Any]:
        """Calculate telemetry data for the strategy"""
        return {
            "allocated_capital_usd": self.strategy.get("min_capital", 0),
            "allocated_capital_base": (self.strategy.get("min_capital", 0) / current_price) if current_price else 0,
            "active_grid_levels": len(open_orders),
            "upper_price_limit": upper_limit,
            "lower_price_limit": lower_limit,
            "current_profit_loss_usd": profit_loss_usd,
            "current_profit_loss_percent": profit_loss_percent,
            "grid_spacing_interval": (upper_limit - lower_limit) / num_grids if num_grids > 0 else 0,
            "stop_loss_price": current_price * (1 - stop_loss_percent / 100) if stop_loss_percent > 0 else None,
            "stop_loss_distance_percent": (
                (current_price - (current_price * (1 - stop_loss_percent / 100))) / current_price * 100 
                if stop_loss_percent > 0 else None
            ),
            "next_take_profit_price": (
                current_price * (1 + take_profit_levels[0].get("percent", 0) / 100) 
                if take_profit_levels else None
            ),
            "take_profit_progress_percent": (
                (profit_loss_percent / take_profit_levels[0].get("percent", 1)) * 100 
                if take_profit_levels and take_profit_levels[0].get("percent", 1) > 0 else None
            ),
            "active_orders_count": len(open_orders),
            "fill_rate_percent": 0,  # Placeholder
            "grid_utilization_percent": (len(open_orders) / num_grids) * 100 if num_grids > 0 else 0,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
    
    def _execute_grid_logic(self, symbol: str, current_price: float, lower_limit: float,
                           upper_limit: float, num_grids: int, quantity_per_grid: float,
                           open_orders: list, buy_signal_ti: bool, sell_signal_ti: bool,
                           strategy_id: str) -> Dict[str, Any]:
        """Execute the core grid trading logic"""
        # Check if price is near lower boundary (buy zone)
        buy_threshold = lower_limit + (upper_limit - lower_limit) / (num_grids * 2)
        sell_threshold = upper_limit - (upper_limit - lower_limit) / (num_grids * 2)
        
        if current_price < buy_threshold and (buy_signal_ti or not any(open_orders)):
            # Check if there's already an open buy order
            buy_order_exists = any(o.side == OrderSide.BUY for o in open_orders)
            if not buy_order_exists:
                order_result = self.place_order(
                    symbol, OrderSide.BUY, quantity_per_grid,
                    "limit", round(current_price * 0.99, 2), strategy_id, "grid-buy"
                )
                
                if order_result["success"]:
                    return {
                        "action": "buy",
                        "symbol": symbol,
                        "quantity": quantity_per_grid,
                        "price": order_result["price"],
                        "reason": "Price near lower grid boundary, placed buy order",
                        "order_id": order_result["order_id"]
                    }
                else:
                    return {"action": "error", "reason": order_result["error"]}
        
        elif current_price > sell_threshold and (sell_signal_ti or not any(open_orders)):
            # Check if there's already an open sell order
            sell_order_exists = any(o.side == OrderSide.SELL for o in open_orders)
            if not sell_order_exists:
                order_result = self.place_order(
                    symbol, OrderSide.SELL, quantity_per_grid,
                    "limit", round(current_price * 1.01, 2), strategy_id, "grid-sell"
                )
                
                if order_result["success"]:
                    return {
                        "action": "sell",
                        "symbol": symbol,
                        "quantity": quantity_per_grid,
                        "price": order_result["price"],
                        "reason": "Price near upper grid boundary, placed sell order",
                        "order_id": order_result["order_id"]
                    }
                else:
                    return {"action": "error", "reason": order_result["error"]}
        
        return {
            "action": "hold",
            "symbol": symbol,
            "quantity": quantity_per_grid,
            "price": current_price,
            "reason": "No grid action needed at current price level"
        }