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
from routers import chat, trades, strategies, market_data, plaid_routes, brokerage_auth, sse_routes
from scheduler import trading_scheduler
from trade_sync import trade_sync_service
from sse_manager import publish

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
    
    # Start autonomous trading scheduler
    asyncio.create_task(trading_scheduler.start())
    logger.info("🚀 Autonomous trading scheduler started")
    
    # Start trade sync service
    asyncio.create_task(trade_sync_service.start())
    logger.info("🔄 Trade sync service started")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down brokernomex backend...")
    await trading_scheduler.stop()
    await trade_sync_service.stop()

# Create FastAPI app
app = FastAPI(
    title="brokernomex Trading API",
    description="Advanced trading automation platform API",
    version="1.0.0",
    lifespan=lifespan
)

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