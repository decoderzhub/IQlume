from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import logging
import os
from datetime import datetime
from dotenv import load_dotenv
import asyncio
import json
from typing import Dict, Set
import uuid

# Load environment variables
load_dotenv()

# Import routers
from routers import chat, trades, strategies, market_data, plaid_routes, brokerage_auth
from scheduler import trading_scheduler

# Global connections store for SSE
sse_connections: Dict[str, Set[str]] = {}  # user_id -> set of connection_ids

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

@app.get("/api/sse/trading-updates")
async def trading_updates_stream(user_id: str):
    """Server-Sent Events stream for real-time trading updates"""
    
    async def event_generator():
        connection_id = str(uuid.uuid4())
        
        # Add connection to user's connection set
        if user_id not in sse_connections:
            sse_connections[user_id] = set()
        sse_connections[user_id].add(connection_id)
        
        try:
            # Send initial connection confirmation
            yield f"data: {json.dumps({'type': 'connected', 'message': 'Real-time updates connected'})}\n\n"
            
            # Keep connection alive and wait for events
            while True:
                # Send heartbeat every 30 seconds
                yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.now().isoformat()})}\n\n"
                await asyncio.sleep(30)
                
        except Exception as e:
            logger.error(f"SSE connection error for user {user_id}: {e}")
        finally:
            # Clean up connection
            if user_id in sse_connections and connection_id in sse_connections[user_id]:
                sse_connections[user_id].remove(connection_id)
                if not sse_connections[user_id]:
                    del sse_connections[user_id]
    
    return StreamingResponse(
        event_generator(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )

async def broadcast_trading_update(user_id: str, update_data: dict):
    """Broadcast trading update to all user's SSE connections"""
    if user_id not in sse_connections:
        return
    
    message = f"data: {json.dumps(update_data)}\n\n"
    
    # In a real implementation, you'd need to store the actual generators
    # For now, we'll use a different approach with polling
    logger.info(f"Broadcasting update to user {user_id}: {update_data}")

# Export for use in other modules
app.broadcast_trading_update = broadcast_trading_update

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)