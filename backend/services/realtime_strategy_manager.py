"""
Real-Time Strategy Manager

Manages real-time trading strategies (execution_interval=0) by monitoring live market data
and triggering trades via WebSocket price streams.
"""

import logging
import asyncio
from typing import Dict, Any, Set, Optional
from datetime import datetime, timezone
from supabase import Client
from services.grid_realtime_monitor import get_grid_monitor

logger = logging.getLogger(__name__)

class RealtimeStrategyManager:
    """Manages real-time strategy execution"""

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.active_strategies: Set[str] = set()
        self.grid_monitor = get_grid_monitor(supabase)
        self.market_data_subscriptions: Dict[str, Set[str]] = {}  # symbol -> strategy_ids
        self.running = False
        self.monitoring_task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the real-time strategy manager"""
        if self.running:
            logger.warning("⚠️ Real-time strategy manager already running")
            return

        self.running = True
        logger.info("🚀 Starting real-time strategy manager...")

        # Load all active real-time strategies
        await self.load_active_strategies()

        # Start monitoring task
        self.monitoring_task = asyncio.create_task(self.monitor_strategies())

        logger.info("✅ Real-time strategy manager started")

    async def stop(self):
        """Stop the real-time strategy manager"""
        if not self.running:
            return

        self.running = False
        logger.info("🛑 Stopping real-time strategy manager...")

        # Cancel monitoring task
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass

        # Clear all subscriptions
        self.active_strategies.clear()
        self.market_data_subscriptions.clear()

        logger.info("✅ Real-time strategy manager stopped")

    async def load_active_strategies(self):
        """Load all active real-time strategies from database"""
        try:
            resp = self.supabase.table("trading_strategies")\
                .select("*")\
                .eq("status", "active")\
                .eq("is_realtime_mode", True)\
                .eq("execution_interval", 0)\
                .execute()

            if not resp.data:
                logger.info("📭 No active real-time strategies found")
                return

            for strategy in resp.data:
                await self.register_strategy(strategy)

            logger.info(f"✅ Loaded {len(resp.data)} active real-time strategies")

        except Exception as e:
            logger.error(f"❌ Error loading active strategies: {e}", exc_info=True)

    async def register_strategy(self, strategy_data: Dict[str, Any]):
        """Register a strategy for real-time monitoring"""
        try:
            strategy_id = strategy_data["id"]
            strategy_type = strategy_data["type"]
            symbol = strategy_data.get("configuration", {}).get("symbol", "")

            # Only support spot grid for now
            if strategy_type != "spot_grid":
                logger.warning(f"⚠️ Strategy {strategy_id} type '{strategy_type}' not supported for real-time mode yet")
                return

            # Register with grid monitor
            await self.grid_monitor.register_strategy(strategy_id, strategy_data)

            # Add to active strategies
            self.active_strategies.add(strategy_id)

            # Subscribe to market data for this symbol
            normalized_symbol = symbol.replace("/", "")
            if normalized_symbol not in self.market_data_subscriptions:
                self.market_data_subscriptions[normalized_symbol] = set()

            self.market_data_subscriptions[normalized_symbol].add(strategy_id)

            logger.info(f"✅ Registered real-time strategy {strategy_id}: {symbol}")

        except Exception as e:
            logger.error(f"❌ Error registering strategy: {e}", exc_info=True)

    async def unregister_strategy(self, strategy_id: str):
        """Unregister a strategy from real-time monitoring"""
        try:
            if strategy_id not in self.active_strategies:
                return

            # Unregister from grid monitor
            await self.grid_monitor.unregister_strategy(strategy_id)

            # Remove from active strategies
            self.active_strategies.discard(strategy_id)

            # Remove from market data subscriptions
            for symbol, strategy_ids in list(self.market_data_subscriptions.items()):
                strategy_ids.discard(strategy_id)
                if not strategy_ids:
                    del self.market_data_subscriptions[symbol]

            logger.info(f"✅ Unregistered real-time strategy {strategy_id}")

        except Exception as e:
            logger.error(f"❌ Error unregistering strategy: {e}", exc_info=True)

    async def monitor_strategies(self):
        """Monitor strategy status and reload if needed"""
        while self.running:
            try:
                # Check for new strategies every 30 seconds
                await asyncio.sleep(30)

                # Reload strategies
                await self.load_active_strategies()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Error in strategy monitoring loop: {e}", exc_info=True)
                await asyncio.sleep(5)

    async def on_market_data_update(self, symbol: str, price: float, timestamp: Optional[datetime] = None):
        """Handle market data update from WebSocket or polling"""
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)

        # Normalize symbol
        normalized_symbol = symbol.replace("/", "")

        # Forward to grid monitor
        await self.grid_monitor.on_price_update(normalized_symbol, price, timestamp)

    def get_active_strategy_count(self) -> int:
        """Get count of active real-time strategies"""
        return len(self.active_strategies)

    def get_subscribed_symbols(self) -> Set[str]:
        """Get all symbols that are being monitored"""
        return set(self.market_data_subscriptions.keys())


# Global instance
_manager_instance: Optional[RealtimeStrategyManager] = None

def get_realtime_manager(supabase: Client) -> RealtimeStrategyManager:
    """Get or create the global realtime manager instance"""
    global _manager_instance
    if _manager_instance is None:
        _manager_instance = RealtimeStrategyManager(supabase)
    return _manager_instance

async def start_realtime_manager(supabase: Client):
    """Start the global realtime manager"""
    manager = get_realtime_manager(supabase)
    await manager.start()

async def stop_realtime_manager():
    """Stop the global realtime manager"""
    global _manager_instance
    if _manager_instance:
        await _manager_instance.stop()
