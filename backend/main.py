from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import logging
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
import asyncio
import json
from typing import Dict, Set
import uuid

# Load environment variables
load_dotenv()

# Import routers
from routers import chat, trades, strategies, market_data, plaid_routes, brokerage_auth
from routers import sse_routes
# from scheduler import trading_scheduler
# from trade_sync import trade_sync_service
from sse_manager import publish

# Global connections store for SSE

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="brokernomex Trading API",
    description="Advanced trading automation platform API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Start the autonomous trading scheduler and trade sync service"""
    try:
        from scheduler import trading_scheduler
        await trading_scheduler.start()
        logger.info("🚀 Autonomous trading scheduler started")
        
        # Start trade sync service in background
        from trade_sync import trade_sync_service
        asyncio.create_task(trade_sync_service.start())
        logger.info("🔄 Trade sync service started")
    except Exception as e:
        logger.error(f"❌ Failed to start services: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Stop the autonomous trading scheduler and trade sync service"""
    try:
        from scheduler import trading_scheduler
        await trading_scheduler.stop()
        logger.info("🛑 Autonomous trading scheduler stopped")
        
        from trade_sync import trade_sync_service
        await trade_sync_service.stop()
        logger.info("🛑 Trade sync service stopped")
    except Exception as e:
        logger.error(f"❌ Error stopping services: {e}")
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
    return {
        "message": "brokernomex Trading API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2024-01-15T10:30:00Z"}


async def broadcast_trading_update(user_id: str, update_data: dict):
    """Broadcast trading update to user's SSE connection"""
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