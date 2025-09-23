import asyncio
import json
import logging
from collections import defaultdict
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Store asyncio queues for each connected user
user_queues: Dict[str, asyncio.Queue] = defaultdict(asyncio.Queue)

async def publish(user_id: str, message: Dict[str, Any]):
    """Publish a message to a specific user's SSE queue"""
    try:
        if user_id in user_queues:
            await user_queues[user_id].put(message)
            logger.info(f"📡 Published SSE message to user {user_id}: {message.get('type', 'unknown')}")
        else:
            logger.debug(f"📭 No SSE connection for user {user_id}")
    except Exception as e:
        logger.error(f"❌ Error publishing SSE message to user {user_id}: {e}")

def get_user_queue(user_id: str) -> asyncio.Queue:
    """Get or create a queue for a specific user"""
    return user_queues[user_id]

def remove_user_queue(user_id: str):
    """Remove a user's queue when they disconnect"""
    if user_id in user_queues:
        del user_queues[user_id]
        logger.info(f"🗑️ Removed SSE queue for user {user_id}")

def get_connected_users() -> list:
    """Get list of currently connected users"""
    return list(user_queues.keys())