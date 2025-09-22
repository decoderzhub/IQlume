from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import logging
import os
from dotenv import load_dotenv
import asyncio

# Load environment variables
load_dotenv()

# Import routers
from routers import chat, trades, strategies, market_data, plaid_routes, brokerage_auth
from scheduler import trading_scheduler

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
    """Start the autonomous trading scheduler"""
    try:
        await trading_scheduler.start()
        logger.info("🚀 Autonomous trading scheduler started")
    except Exception as e:
        logger.error(f"❌ Failed to start trading scheduler: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Stop the autonomous trading scheduler"""
    try:
        await trading_scheduler.stop()
        logger.info("🛑 Autonomous trading scheduler stopped")
    except Exception as e:
        logger.error(f"❌ Error stopping trading scheduler: {e}")
# Include routers
app.include_router(chat.router)
app.include_router(trades.router)
app.include_router(strategies.router)
app.include_router(market_data.router)
app.include_router(plaid_routes.router)
app.include_router(brokerage_auth.router)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)