import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from dependencies import (
    get_supabase_client,
    get_alpaca_trading_client,
    get_alpaca_stock_data_client,
    get_alpaca_crypto_data_client,
    verify_alpaca_account_context,
)
from strategy_executors.factory import StrategyExecutorFactory
from services.market_data_service import market_data_service
from services.grid_price_monitor import GridPriceMonitor
from services.position_exit_monitor import PositionExitMonitor

logger = logging.getLogger(__name__)

class TradingScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.active_jobs: Dict[str, Any] = {}
        self.supabase = get_supabase_client()
        self.grid_price_monitor = None
        self.position_exit_monitor = None

    async def start(self):
        """Start the scheduler and load active strategies"""
        logger.info("🚀 Starting autonomous trading scheduler...")
        self.scheduler.start()

        # Initialize market data on startup
        if market_data_service:
            logger.info("📊 Initializing market data service...")
            asyncio.create_task(self.initialize_market_data())

        # Start Grid Price Monitor
        logger.info("🔍 Starting Grid Price Monitor...")
        self.grid_price_monitor = GridPriceMonitor(self.supabase)
        asyncio.create_task(self.grid_price_monitor.start())

        # Start Position Exit Monitor for TP/SL automation
        logger.info("🎯 Starting Position Exit Monitor for TP/SL automation...")
        self.position_exit_monitor = PositionExitMonitor(self.supabase)
        asyncio.create_task(self.position_exit_monitor.start())

        await self.load_active_strategies()

        # Schedule periodic strategy reload (every 5 minutes)
        self.scheduler.add_job(
            self.reload_strategies,
            IntervalTrigger(minutes=5),
            id="reload_strategies",
            name="Reload Active Strategies"
        )

        # Schedule daily market data update (at 7 PM EST daily)
        self.scheduler.add_job(
            self.update_market_data,
            CronTrigger(hour=19, minute=0, timezone="America/New_York"),
            id="daily_market_data_update",
            name="Daily Market Data Update"
        )

        # Schedule weekly data validation (Sundays at 2 AM EST)
        self.scheduler.add_job(
            self.validate_market_data,
            CronTrigger(day_of_week='sun', hour=2, minute=0, timezone="America/New_York"),
            id="weekly_data_validation",
            name="Weekly Data Validation"
        )

        logger.info("✅ Trading scheduler started successfully")
    
    async def stop(self):
        """Stop the scheduler"""
        logger.info("🛑 Stopping trading scheduler...")

        # Stop Grid Price Monitor
        if self.grid_price_monitor:
            await self.grid_price_monitor.stop()

        # Stop Position Exit Monitor
        if self.position_exit_monitor:
            await self.position_exit_monitor.stop()

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

            # Grid strategies - event-driven via order fill monitor
            # These run ONCE at startup to place initial orders, then rely on order fill monitor
            # Set to a very long interval since they only need initial setup
            "spot_grid": 86400,       # 24 hours (only runs once for setup, then order fill monitor takes over)
            "futures_grid": 86400,    # 24 hours
            "infinity_grid": 86400,   # 24 hours
            "reverse_grid": 86400,    # 24 hours

            # Medium frequency strategies
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

            # Verify account context before trading
            account_context = await verify_alpaca_account_context(user, self.supabase)
            logger.info(f"📋 Account Context: {account_context}")

            # Get clients with user context
            trading_client = await get_alpaca_trading_client(user, self.supabase)
            stock_client = await get_alpaca_stock_data_client(user, self.supabase)
            crypto_client = await get_alpaca_crypto_data_client(user, self.supabase)

            logger.info(f"✅ User-scoped trading clients obtained for user {user_id}")
            
            # Get strategy executor from factory
            executor = StrategyExecutorFactory.create_executor(
                strategy_type,
                trading_client,
                stock_client,
                crypto_client,
                self.supabase
            )
            
            if not executor:
                logger.warning(f"⚠️ No executor available for strategy type: {strategy_type}")
                result = {
                    "action": "hold",
                    "symbol": strategy.get("configuration", {}).get("symbol", "N/A"),
                    "quantity": 0,
                    "price": 0,
                    "reason": f"Strategy type {strategy_type} not yet implemented"
                }
            else:
                # Execute strategy using the appropriate executor
                logger.info(f"🚀 Executing {strategy_type} strategy with dedicated executor")
                result = await executor.execute(strategy)
            
            logger.info(f"📊 [SCHEDULER] Strategy execution result: {result}")

            # Record trade in Supabase if action was taken
            # Skip for strategies that manage their own trade recording
            if result and result.get("action") in ["buy", "sell"] and strategy_type not in ["smart_rebalance", "spot_grid", "reverse_grid"]:
                try:
                    trade_data = {
                        "user_id": user_id,
                        "strategy_id": strategy_id,
                        "symbol": result.get("symbol", "UNKNOWN"),
                        "type": result.get("action"),  # "buy" or "sell"
                        "quantity": result.get("quantity", 0),
                        "price": result.get("price", 0),
                        "profit_loss": 0,  # Will be updated by trade sync service
                        "status": "pending",  # Initial status
                        "order_type": "market",  # Default order type
                        "time_in_force": "day",  # Default time in force
                        "filled_qty": 0,  # Will be updated by trade sync service
                        "filled_avg_price": 0,  # Will be updated by trade sync service
                        "commission": 0,  # Will be updated by trade sync service
                        "fees": 0,  # Will be updated by trade sync service
                        "alpaca_order_id": result.get("order_id"),  # If available from execution
                    }

                    # Insert trade record into Supabase
                    trade_resp = self.supabase.table("trades").insert(trade_data).execute()

                    if trade_resp.data:
                        trade_id = trade_resp.data[0]["id"]
                        logger.info(f"✅ [SCHEDULER] Trade recorded in database: {trade_id}")

                        # Update result with trade ID for logging
                        result["trade_id"] = trade_id
                    else:
                        logger.error(f"❌ [SCHEDULER] Failed to record trade in database")

                except Exception as trade_error:
                    logger.error(f"❌ [SCHEDULER] Error recording trade: {trade_error}")
            
            # Update strategy performance if trade was executed
            if result and result.get("action") in ["buy", "sell"]:
                try:
                    from routers.strategies import update_strategy_performance
                    await update_strategy_performance(strategy_id, user_id, self.supabase, trading_client)
                    logger.info(f"📊 Updated performance for strategy {strategy_name}")
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
                    "strategy_id": strategy_id,
                    "strategy_name": strategy_name,
                    "action": result.get("action", "unknown"),
                    "symbol": result.get("symbol", "N/A"),
                    "quantity": result.get("quantity", 0),
                    "price": result.get("price", 0),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                await publish(user_id, update_data)
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
    
    async def initialize_market_data(self):
        """Initialize market data on startup"""
        if not market_data_service:
            logger.warning("⚠️ Market data service not available")
            return

        try:
            logger.info("📊 Initializing historical market data...")
            result = await market_data_service.initialize_data()

            if result.get("data_exists"):
                logger.info("✅ Historical market data already available")
            elif result.get("initial_population"):
                pop_result = result["initial_population"]
                logger.info(
                    f"✅ Initial data population complete: "
                    f"{len(pop_result.get('symbols_processed', []))} symbols, "
                    f"{pop_result.get('total_bars_inserted', 0)} bars"
                )
            else:
                logger.warning("⚠️ Market data initialization incomplete")

        except Exception as e:
            logger.error(f"❌ Error initializing market data: {e}")

    async def update_market_data(self):
        """Daily market data update job"""
        if not market_data_service:
            logger.warning("⚠️ Market data service not available for daily update")
            return

        try:
            logger.info("📅 Running daily market data update...")
            result = await market_data_service.populate_daily_update()

            logger.info(
                f"✅ Daily update complete: "
                f"{len(result.get('symbols_updated', []))} symbols updated, "
                f"{result.get('total_bars_added', 0)} new bars"
            )

            if result.get('symbols_failed'):
                logger.warning(f"⚠️ Failed symbols: {result['symbols_failed']}")

        except Exception as e:
            logger.error(f"❌ Error in daily market data update: {e}")

    async def validate_market_data(self):
        """Weekly data validation and gap filling job"""
        if not market_data_service:
            logger.warning("⚠️ Market data service not available for validation")
            return

        try:
            logger.info("🔍 Running weekly data validation...")
            result = await market_data_service.validate_and_fix_gaps()

            logger.info(
                f"✅ Validation complete: "
                f"{result.get('gaps_filled', 0)} gaps filled in "
                f"{len(result.get('symbols_affected', []))} symbols"
            )

        except Exception as e:
            logger.error(f"❌ Error in data validation: {e}")

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

        # Get market data status
        market_data_status = None
        if market_data_service:
            try:
                coverage = await market_data_service.check_data_coverage()
                market_data_status = {
                    "symbols_tracked": coverage.get("total_symbols", 0),
                    "total_records": coverage.get("total_records", 0)
                }
            except Exception as e:
                logger.error(f"Error getting market data status: {e}")

        return {
            "scheduler_running": self.scheduler.running,
            "total_jobs": len(jobs),
            "active_strategies": len([j for j in jobs if j["id"].startswith("strategy_")]),
            "market_data_status": market_data_status,
            "jobs": jobs,
        }

# Global scheduler instance
trading_scheduler = TradingScheduler()