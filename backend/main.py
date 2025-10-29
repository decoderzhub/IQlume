#!/usr/bin/env python3

# Load environment variables FIRST, before any other imports
from dotenv import load_dotenv
load_dotenv()

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import routers AFTER environment variables are loaded
from routers import chat, trades, strategies, market_data, plaid_routes, brokerage_auth, sse_routes, bots, payments, grid_status, positions
from scheduler import trading_scheduler
from trade_sync import trade_sync_service
from order_fill_monitor import order_fill_monitor
from sse_manager import publish
from dependencies import get_supabase_client
from services.market_data_service import initialize_market_data_service
from middleware.error_handler import setup_error_handlers
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("🚀 Starting brokernomex backend...")

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
        else:
            initialize_market_data_service(supabase, None)
            logger.warning("⚠️ Market data service initialized without Alpaca credentials")

    except Exception as e:
        logger.error(f"❌ Error initializing market data service: {e}")
        initialize_market_data_service(supabase, None)

    # Initialize order fill monitor with Supabase client
    order_fill_monitor.supabase = supabase

    # Start order fill monitor for event-based grid execution
    asyncio.create_task(order_fill_monitor.start())
    logger.info("🔍 Order fill monitor started (event-based grid trading)")

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

@app.get("/")
async def root():
    return {"message": "brokernomex Trading API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2025-01-15T12:00:00Z"}

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