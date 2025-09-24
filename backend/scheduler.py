import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from dependencies import (
    get_supabase_client,
    get_alpaca_trading_client,
    get_alpaca_stock_data_client,
    get_alpaca_crypto_data_client,
)

logger = logging.getLogger(__name__)

class TradingScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.active_jobs: Dict[str, Any] = {}
        self.supabase = get_supabase_client()
        
    async def start(self):
        """Start the scheduler and load active strategies"""
        logger.info("🚀 Starting autonomous trading scheduler...")
        self.scheduler.start()
        await self.load_active_strategies()
        
        # Schedule periodic strategy reload (every 5 minutes)
        self.scheduler.add_job(
            self.reload_strategies,
            IntervalTrigger(minutes=5),
            id="reload_strategies",
            name="Reload Active Strategies"
        )
        
        logger.info("✅ Trading scheduler started successfully")
    
    async def stop(self):
        """Stop the scheduler"""
        logger.info("🛑 Stopping trading scheduler...")
        self.scheduler.shutdown()
        
    async def load_active_strategies(self):
        """Load all active strategies from database and schedule them"""
        try:
            resp = self.supabase.table("trading_strategies").select("*").eq("is_active", True).execute()
            
            if not resp.data:
                logger.info("📭 No active strategies found")
                return
                
            logger.info(f"📊 Found {len(resp.data)} active strategies")
            
            for strategy in resp.data:
                await self.schedule_strategy(strategy)
                
        except Exception as e:
            logger.error(f"❌ Error loading active strategies: {e}")
    
    async def reload_strategies(self):
        """Reload strategies and update scheduler"""
        logger.info("🔄 Reloading active strategies...")
        
        # Remove all existing strategy jobs
        for job_id in list(self.active_jobs.keys()):
            if job_id != "reload_strategies":
                self.scheduler.remove_job(job_id)
                del self.active_jobs[job_id]
        
        # Reload active strategies
        await self.load_active_strategies()
    
    async def schedule_strategy(self, strategy: Dict[str, Any]):
        """Schedule a single strategy for autonomous execution"""
        strategy_id = strategy["id"]
        strategy_name = strategy["name"]
        strategy_type = strategy["type"]
        
        # Determine execution interval based on strategy type
        interval_seconds = self.get_execution_interval(strategy_type)
        
        job_id = f"strategy_{strategy_id}"
        
        # Remove existing job if it exists
        if job_id in self.active_jobs:
            self.scheduler.remove_job(job_id)
        
        # Add new job
        self.scheduler.add_job(
            self.execute_strategy_job,
            IntervalTrigger(seconds=interval_seconds),
            id=job_id,
            name=f"Execute {strategy_name}",
            kwargs={"strategy": strategy},
            max_instances=1,  # Prevent overlapping executions
            coalesce=True,    # Combine missed executions
        )
        
        self.active_jobs[job_id] = {
            "strategy_id": strategy_id,
            "strategy_name": strategy_name,
            "interval_seconds": interval_seconds,
            "last_execution": None,
        }
        
        logger.info(f"⏰ Scheduled {strategy_name} ({strategy_type}) to run every {interval_seconds}s")
    
    def get_execution_interval(self, strategy_type: str) -> int:
        """Get execution interval in seconds based on strategy type"""
        intervals = {
            # High frequency strategies
            "scalping": 30,           # 30 seconds
            "arbitrage": 60,          # 1 minute
            
            # Medium frequency strategies  
            "spot_grid": 300,         # 5 minutes
            "futures_grid": 300,      # 5 minutes
            "infinity_grid": 300,     # 5 minutes
            "momentum_breakout": 300, # 5 minutes
            "news_based_trading": 300, # 5 minutes
            
            # Lower frequency strategies
            "covered_calls": 3600,    # 1 hour
            "wheel": 3600,            # 1 hour
            "iron_condor": 3600,      # 1 hour
            "short_put": 3600,        # 1 hour
            "mean_reversion": 1800,   # 30 minutes
            "pairs_trading": 1800,    # 30 minutes
            "swing_trading": 1800,    # 30 minutes
            
            # Very low frequency strategies
            "dca": 86400,             # 24 hours (daily)
            "smart_rebalance": 604800, # 7 days (weekly)
        }
        
        return intervals.get(strategy_type, 1800)  # Default: 30 minutes
    
    async def execute_strategy_job(self, strategy: Dict[str, Any]):
        """Execute a single strategy iteration"""
        strategy_id = strategy["id"]
        strategy_name = strategy["name"]
        strategy_type = strategy["type"]
        user_id = strategy["user_id"]
        
        try:
            logger.info(f"🤖 [SCHEDULER] Executing {strategy_name} ({strategy_type}) for user {user_id}")
            
            # Get user object (simplified - in production you'd cache this)
            class MockUser:
                def __init__(self, user_id: str):
                    self.id = user_id
            
            user = MockUser(user_id)
            
            logger.info(f"🔗 Getting trading clients for user {user_id}")
            
            # Get clients
            trading_client = await get_alpaca_trading_client(user, self.supabase)
            stock_client = get_alpaca_stock_data_client()
            crypto_client = get_alpaca_crypto_data_client()
            
            logger.info(f"✅ Trading clients obtained successfully")
            
            # Execute strategy based on type
            result = None
            if strategy_type == "spot_grid":
                from strategy_executors.factory import StrategyExecutorFactory
                executor = StrategyExecutorFactory.create_executor(strategy, trading_client, stock_client, crypto_client, self.supabase)
                result = await executor.execute()
            elif strategy_type == "dca":
                from strategy_executors.factory import StrategyExecutorFactory
                executor = StrategyExecutorFactory.create_executor(strategy, trading_client, stock_client, crypto_client, self.supabase)
                result = await executor.execute()
            elif strategy_type == "covered_calls":
                from strategy_executors.factory import StrategyExecutorFactory
                executor = StrategyExecutorFactory.create_executor(strategy, trading_client, stock_client, crypto_client, self.supabase)
                result = await executor.execute()
            elif strategy_type == "wheel":
                from strategy_executors.factory import StrategyExecutorFactory
                executor = StrategyExecutorFactory.create_executor(strategy, trading_client, stock_client, crypto_client, self.supabase)
                result = await executor.execute()
            elif strategy_type == "smart_rebalance":
                from strategy_executors.factory import StrategyExecutorFactory
                executor = StrategyExecutorFactory.create_executor(strategy, trading_client, stock_client, crypto_client, self.supabase)
                result = await executor.execute()
            else:
                logger.warning(f"⚠️ Strategy type {strategy_type} not implemented for autonomous execution")
                result = {
                    "action": "hold",
                    "reason": f"Strategy type {strategy_type} not implemented for autonomous execution"
                }
            
            logger.info(f"📊 [SCHEDULER] Strategy execution result: {result}")
            
            # Update strategy performance if trade was executed
            if result and result.get("action") in ["buy", "sell"]:
                try:
                    from routers.strategies import update_strategy_performance
                    await update_strategy_performance(strategy.get("id"), strategy.get("user_id"), self.supabase, trading_client)
                    logger.info(f"📊 Updated performance for strategy {strategy.get('name')}")
                except Exception as perf_error:
                    logger.error(f"❌ Failed to update strategy performance: {perf_error}")
            
            # Update last execution time
            if strategy_id in self.active_jobs:
                self.active_jobs[strategy_id]["last_execution"] = datetime.now(timezone.utc)
            
            # Broadcast update to frontend (if SSE is connected)
            try:
                from sse_manager import publish
                update_data = {
                    "type": "trade_executed",
                    "strategy_id": strategy.get("id"),
                    "strategy_name": strategy.get("name"),
                    "action": result.get("action", "unknown"),
                    "symbol": result.get("symbol", "N/A"),
                    "quantity": result.get("quantity", 0),
                    "price": result.get("price", 0),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                await publish(strategy.get("user_id"), update_data)
                logger.info(f"📡 Broadcasted SSE update to user {user_id}")
            except Exception as broadcast_error:
                logger.error(f"Error broadcasting update: {broadcast_error}")
            
            # Log result
            if result:
                action = result.get("action", "unknown")
                if action == "buy":
                    logger.info(f"✅ [SCHEDULER] {strategy_name}: BUY executed - {result.get('symbol', 'N/A')} x{result.get('quantity', 0):.6f} @ ${result.get('price', 0):.2f}")
                elif action == "sell":
                    logger.info(f"✅ [SCHEDULER] {strategy_name}: SELL executed - {result.get('symbol', 'N/A')} x{result.get('quantity', 0):.6f} @ ${result.get('price', 0):.2f}")
                elif action == "hold":
                    logger.info(f"⏸️ [SCHEDULER] {strategy_name}: HOLDING - {result.get('reason', 'No action needed')}")
                elif action == "error":
                    logger.error(f"❌ [SCHEDULER] {strategy_name}: ERROR - {result.get('reason', 'Unknown error')}")
                else:
                    logger.info(f"ℹ️ [SCHEDULER] {strategy_name}: {action.upper()} - {result.get('reason', 'No details')}")
            
        except Exception as e:
            logger.error(f"❌ [SCHEDULER] Error executing strategy {strategy_name}: {e}", exc_info=True)
    
    async def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status"""
        jobs = []
        for job in self.scheduler.get_jobs():
            job_info = {
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger),
            }
            if job.id in self.active_jobs:
                job_info.update(self.active_jobs[job.id])
            jobs.append(job_info)
        
        return {
            "scheduler_running": self.scheduler.running,
            "total_jobs": len(jobs),
            "active_strategies": len([j for j in jobs if j["id"].startswith("strategy_")]),
            "jobs": jobs,
        }

# Global scheduler instance
trading_scheduler = TradingScheduler()