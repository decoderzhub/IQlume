from fastapi import APIRouter, Request, Query
from fastapi.responses import StreamingResponse
import asyncio
import json
import logging
from datetime import datetime, timezone
from sse_manager import get_user_queue, remove_user_queue

router = APIRouter(prefix="/api/sse", tags=["sse"])
logger = logging.getLogger(__name__)

async def event_generator(user_id: str):
    """Generate Server-Sent Events for a specific user"""
    logger.info(f"🔗 Starting SSE connection for user {user_id}")
    
    try:
        # Get the user's message queue
        queue = get_user_queue(user_id)
        
        # Send initial connection confirmation
        yield f"data: {json.dumps({'type': 'connected', 'message': 'Real-time trading updates connected'})}\n\n"
        
        while True:
            try:
                # Wait for a message with timeout for heartbeat
                message = await asyncio.wait_for(queue.get(), timeout=20.0)
                
                # Send the message as SSE event
                yield f"data: {json.dumps(message)}\n\n"
                
            except asyncio.TimeoutError:
                # Send heartbeat every 20 seconds to keep connection alive
                heartbeat = {
                    'type': 'heartbeat',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                yield f"data: {json.dumps(heartbeat)}\n\n"
                
    except asyncio.CancelledError:
        logger.info(f"🔌 SSE connection cancelled for user {user_id}")
        raise
    except Exception as e:
        logger.error(f"❌ SSE connection error for user {user_id}: {e}")
        # Send error event before closing
        error_event = {
            'type': 'error',
            'message': f'Connection error: {str(e)}',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        yield f"data: {json.dumps(error_event)}\n\n"
    finally:
        # Clean up user queue when connection closes
        remove_user_queue(user_id)
        logger.info(f"🔌 SSE connection closed for user {user_id}")

@router.get("/trading-updates")
async def trading_updates_stream(
    request: Request,
    user_id: str = Query(..., description="User ID for SSE connection")
):
    """Server-Sent Events endpoint for real-time trading updates"""
    logger.info(f"📡 New SSE connection request for user {user_id}")
    
    return StreamingResponse(
        event_generator(user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
        }
    )