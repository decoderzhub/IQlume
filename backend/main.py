#!/usr/bin/env python3

# Load environment variables FIRST, before any other imports
from dotenv import load_dotenv
load_dotenv()

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import routers AFTER environment variables are loaded
from routers import chat, trades, strategies, market_data, plaid_routes, brokerage_auth, sse_routes, bots, payments, grid_status, positions, grid_diagnostics, admin
from scheduler import trading_scheduler
from trade_sync import trade_sync_service
from order_fill_monitor import order_fill_monitor
from sse_manager import publish
from dependencies import get_supabase_client
from services.market_data_service import initialize_market_data_service
from middleware.error_handler import setup_error_handlers
from utils.logger import setup_supabase_logging, log_system_event
import os

# Configure logging with precise timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d | %(levelname)-8s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Reduce verbosity of third-party loggers
logging.getLogger('httpx').setLevel(logging.WARNING)
logging.getLogger('httpcore').setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)

# Setup Supabase logging handler
setup_supabase_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("🚀 Starting brokernomex backend...")
    log_system_event('INFO', 'backend.startup', 'Backend server starting up')

    # Initialize Supabase client
    supabase = get_supabase_client()

    # Initialize market data service with system-level Alpaca credentials
    try:
        from alpaca.data.historical import StockHistoricalDataClient

        alpaca_key = os.getenv("ALPACA_API_KEY")
        alpaca_secret = os.getenv("ALPACA_SECRET_KEY")

        if alpaca_key and alpaca_secret:
            stock_client = StockHistoricalDataClient(alpaca_key, alpaca_secret)
            initialize_market_data_service(supabase, stock_client)
            logger.info("📊 Market data service initialized with system credentials")
            log_system_event('INFO', 'market_data', 'Market data service initialized successfully')
        else:
            initialize_market_data_service(supabase, None)
            logger.warning("⚠️ Market data service initialized without Alpaca credentials")
            log_system_event('WARNING', 'market_data', 'Market data service initialized without Alpaca credentials')

    except Exception as e:
        logger.error(f"❌ Error initializing market data service: {e}")
        log_system_event('ERROR', 'market_data', f'Failed to initialize market data service: {str(e)}')
        initialize_market_data_service(supabase, None)

    # Initialize order fill monitor with Supabase client
    order_fill_monitor.supabase = supabase

    # Start order fill monitor for event-based grid execution
    asyncio.create_task(order_fill_monitor.start())
    logger.info("🔍 Order fill monitor started (event-based grid trading)")

    # Start Grid Price Monitor (single instance, NOT started in scheduler)
    from services.grid_price_monitor import GridPriceMonitor
    grid_price_monitor = GridPriceMonitor(supabase)
    asyncio.create_task(grid_price_monitor.start())
    logger.info("📈 Grid price monitor started")

    # Start Position Exit Monitor for TP/SL automation (single instance)
    from services.position_exit_monitor import PositionExitMonitor
    position_exit_monitor = PositionExitMonitor(supabase)
    asyncio.create_task(position_exit_monitor.start())
    logger.info("🎯 Position exit monitor started (TP/SL automation)")

    # Start Real-Time Strategy Manager for WebSocket-driven grid trading
    from services.realtime_strategy_manager import get_realtime_manager
    realtime_manager = get_realtime_manager(supabase)
    asyncio.create_task(realtime_manager.start())
    logger.info("⚡ Real-time strategy manager started (WebSocket-driven grid trading)")

    # Store service references for shutdown
    app.state.grid_price_monitor = grid_price_monitor
    app.state.position_exit_monitor = position_exit_monitor
    app.state.realtime_manager = realtime_manager

    # Start autonomous trading scheduler
    asyncio.create_task(trading_scheduler.start())
    logger.info("🚀 Autonomous trading scheduler started")

    # Start trade sync service
    asyncio.create_task(trade_sync_service.start())
    logger.info("🔄 Trade sync service started")

    yield

    # Shutdown
    logger.info("🛑 Shutting down brokernomex backend...")
    await order_fill_monitor.stop()
    await app.state.grid_price_monitor.stop()
    await app.state.position_exit_monitor.stop()
    await app.state.realtime_manager.stop()
    await trading_scheduler.stop()
    await trade_sync_service.stop()

# Create FastAPI app
app = FastAPI(
    title="brokernomex Trading API",
    description="Advanced trading automation platform API",
    version="1.0.0",
    lifespan=lifespan
)

# Setup error handlers
setup_error_handlers(app)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router)
app.include_router(trades.router)
app.include_router(strategies.router)
app.include_router(market_data.router)
app.include_router(plaid_routes.router)
app.include_router(brokerage_auth.router)
app.include_router(sse_routes.router)
app.include_router(bots.router, prefix="/api/bots", tags=["bots"])
app.include_router(payments.router)
app.include_router(grid_status.router)
app.include_router(positions.router)
app.include_router(grid_diagnostics.router)
app.include_router(admin.router)

@app.get("/")
async def root():
    return {"message": "brokernomex Trading API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Basic health check endpoint for deployment monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with service status information"""
    try:
        from datetime import datetime, timezone

        health_data = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0",
            "services": {},
            "system": {}
        }

        # Check scheduler status
        try:
            scheduler_status = await trading_scheduler.get_scheduler_status()
            health_data["services"]["scheduler"] = {
                "status": "running" if scheduler_status.get("scheduler_running") else "stopped",
                "active_strategies": scheduler_status.get("active_strategies", 0),
                "total_jobs": scheduler_status.get("total_jobs", 0)
            }
        except Exception as e:
            health_data["services"]["scheduler"] = {"status": "error", "error": str(e)}

        # Check order fill monitor
        try:
            health_data["services"]["order_fill_monitor"] = {
                "status": "running" if order_fill_monitor.is_running else "stopped",
                "check_interval": order_fill_monitor.check_interval,
                "error_count": order_fill_monitor.error_count
            }
        except Exception as e:
            health_data["services"]["order_fill_monitor"] = {"status": "error", "error": str(e)}

        # Check trade sync service
        try:
            health_data["services"]["trade_sync"] = {
                "status": "running" if trade_sync_service.is_running else "stopped",
                "sync_interval": trade_sync_service.sync_interval,
                "error_count": trade_sync_service.error_count
            }
        except Exception as e:
            health_data["services"]["trade_sync"] = {"status": "error", "error": str(e)}

        # Check grid price monitor
        try:
            if hasattr(app.state, 'grid_price_monitor'):
                health_data["services"]["grid_monitor"] = {
                    "status": "running" if app.state.grid_price_monitor.is_running else "stopped",
                    "check_interval": app.state.grid_price_monitor.check_interval,
                    "error_count": app.state.grid_price_monitor.error_count
                }
            else:
                health_data["services"]["grid_monitor"] = {"status": "not_initialized"}
        except Exception as e:
            health_data["services"]["grid_monitor"] = {"status": "error", "error": str(e)}

        # Check position exit monitor
        try:
            if hasattr(app.state, 'position_exit_monitor'):
                health_data["services"]["position_exit_monitor"] = {
                    "status": "running" if app.state.position_exit_monitor.is_running else "stopped",
                    "check_interval": app.state.position_exit_monitor.check_interval,
                    "error_count": app.state.position_exit_monitor.error_count
                }
            else:
                health_data["services"]["position_exit_monitor"] = {"status": "not_initialized"}
        except Exception as e:
            health_data["services"]["position_exit_monitor"] = {"status": "error", "error": str(e)}

        # Check database connectivity
        try:
            supabase = get_supabase_client()
            test_query = supabase.table("trading_strategies").select("id").limit(1).execute()
            health_data["services"]["database"] = {"status": "connected"}
        except Exception as e:
            health_data["services"]["database"] = {"status": "error", "error": str(e)}
            health_data["status"] = "degraded"

        # System information
        import psutil
        try:
            health_data["system"]["memory_percent"] = psutil.virtual_memory().percent
            health_data["system"]["cpu_percent"] = psutil.cpu_percent(interval=0.1)
        except:
            pass  # psutil not available in all environments

        return health_data

    except Exception as e:
        logger.error(f"Error in detailed health check: {e}", exc_info=True)
        return {
            "status": "error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }

# Broadcast function for SSE updates
async def broadcast_trading_update(user_id: str, update_data: dict):
    """Broadcast trading updates to connected users via SSE"""
    try:
        await publish(user_id, update_data)
        logger.info(f"📡 Broadcasted trading update to user {user_id}: {update_data.get('type', 'unknown')}")
    except Exception as e:
        logger.error(f"❌ Error broadcasting trading update to user {user_id}: {e}")

# Export for use in other modules
app.broadcast_trading_update = broadcast_trading_update

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)