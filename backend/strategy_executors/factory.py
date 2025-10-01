"""
Strategy Executor Factory

This module provides a factory for creating strategy executor instances
based on the strategy type.
"""

import logging
from typing import Dict, Any, Optional, List
from alpaca.trading.client import TradingClient
from alpaca.data.historical import StockHistoricalDataClient, CryptoHistoricalDataClient
from supabase import Client

from .base import BaseStrategyExecutor
from .spot_grid import SpotGridExecutor
from .reverse_grid import ReverseGridExecutor
from .dca import DCAExecutor
from .covered_calls import CoveredCallsExecutor
from .smart_rebalance import SmartRebalanceExecutor
from .momentum import MomentumBreakoutExecutor
from .mean_reversion import MeanReversionExecutor
from .pairs_trading import PairsTradingExecutor
from .scalping import ScalpingExecutor
from .straddle import StraddleExecutor
from .iron_condor import IronCondorExecutor

logger = logging.getLogger(__name__)

class StrategyExecutorFactory:
    """Factory for creating strategy executor instances"""
    
    @staticmethod
    def create_executor(
        strategy_type: str,
        trading_client: TradingClient,
        stock_client: StockHistoricalDataClient,
        crypto_client: CryptoHistoricalDataClient,
        supabase: Client
    ) -> Optional[BaseStrategyExecutor]:
        """
        Create a strategy executor instance based on strategy type
        
        Args:
            strategy_type: Type of strategy (e.g., 'spot_grid', 'dca', 'covered_calls')
            trading_client: Alpaca trading client
            stock_client: Alpaca stock data client
            crypto_client: Alpaca crypto data client
            supabase: Supabase client
            
        Returns:
            Strategy executor instance or None if type not supported
        """
        
        executors = {
            'spot_grid': SpotGridExecutor,
            'reverse_grid': ReverseGridExecutor,
            'futures_grid': SpotGridExecutor,
            'infinity_grid': SpotGridExecutor,
            'dca': DCAExecutor,
            'smart_rebalance': SmartRebalanceExecutor,
            'covered_calls': CoveredCallsExecutor,
            'wheel': CoveredCallsExecutor,
            'short_put': CoveredCallsExecutor,
            'momentum_breakout': MomentumBreakoutExecutor,
            'mean_reversion': MeanReversionExecutor,
            'pairs_trading': PairsTradingExecutor,
            'scalping': ScalpingExecutor,
            'long_straddle': StraddleExecutor,
            'short_straddle': StraddleExecutor,
            'iron_condor': IronCondorExecutor,
        }
        
        executor_class = executors.get(strategy_type)
        if not executor_class:
            logger.warning(f"⚠️ No executor found for strategy type: {strategy_type}")
            return None
        
        try:
            return executor_class(trading_client, stock_client, crypto_client, supabase)
        except Exception as e:
            logger.error(f"❌ Error creating executor for {strategy_type}: {e}")
            return None
    
    @staticmethod
    def get_supported_strategies() -> List[str]:
        """Get list of supported strategy types"""
        return [
            'spot_grid',
            'reverse_grid',
            'futures_grid',
            'infinity_grid',
            'dca',
            'smart_rebalance',
            'covered_calls',
            'wheel',
            'short_put',
            'momentum_breakout',
            'mean_reversion',
            'pairs_trading',
            'scalping',
            'long_straddle',
            'short_straddle',
            'iron_condor'
        ]
    
    @staticmethod
    def is_strategy_supported(strategy_type: str) -> bool:
        """Check if a strategy type is supported"""
        return strategy_type in StrategyExecutorFactory.get_supported_strategies()