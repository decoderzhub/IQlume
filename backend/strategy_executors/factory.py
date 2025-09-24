"""
Strategy Executor Factory
"""

from typing import Dict, Any
from .base import BaseStrategyExecutor
from .spot_grid import SpotGridExecutor
from .dca import DCAExecutor
from .covered_calls import CoveredCallsExecutor
from .wheel import WheelExecutor
from .smart_rebalance import SmartRebalanceExecutor

class StrategyExecutorFactory:
    """Factory for creating strategy executors"""
    
    @staticmethod
    def create_executor(strategy: Dict[str, Any], trading_client, stock_client, 
                       crypto_client, supabase) -> BaseStrategyExecutor:
        """Create appropriate executor based on strategy type"""
        
        strategy_type = strategy["type"]
        
        if strategy_type == "spot_grid":
            return SpotGridExecutor(strategy, trading_client, stock_client, crypto_client, supabase)
        elif strategy_type == "dca":
            return DCAExecutor(strategy, trading_client, stock_client, crypto_client, supabase)
        elif strategy_type == "covered_calls":
            return CoveredCallsExecutor(strategy, trading_client, stock_client, crypto_client, supabase)
        elif strategy_type == "wheel":
            return WheelExecutor(strategy, trading_client, stock_client, crypto_client, supabase)
        elif strategy_type == "smart_rebalance":
            return SmartRebalanceExecutor(strategy, trading_client, stock_client, crypto_client, supabase)
        else:
            raise ValueError(f"Unsupported strategy type: {strategy_type}")