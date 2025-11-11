"""
Bot Management Routes

API endpoints for managing trading bots, positions, and performance metrics.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
import logging
from datetime import datetime, timezone
from dependencies import get_supabase_client, get_current_user
from supabase import Client

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "bots"}

@router.get("/positions")
async def get_bot_positions(
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> List[Dict[str, Any]]:
    """Get all open bot positions for the current user"""
    try:
        result = supabase.table("bot_positions")\
            .select("*")\
            .eq("user_id", user.id)\
            .eq("is_closed", False)\
            .order("entry_timestamp", desc=True)\
            .execute()

        return result.data if result.data else []

    except Exception as e:
        logger.error(f"Error fetching bot positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions/{strategy_id}")
async def get_strategy_positions(
    strategy_id: str,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> List[Dict[str, Any]]:
    """Get positions for a specific strategy"""
    try:
        result = supabase.table("bot_positions")\
            .select("*")\
            .eq("user_id", user.id)\
            .eq("strategy_id", strategy_id)\
            .eq("is_closed", False)\
            .order("entry_timestamp", desc=True)\
            .execute()

        return result.data if result.data else []

    except Exception as e:
        logger.error(f"Error fetching strategy positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics")
async def get_bot_metrics(
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> Dict[str, Any]:
    """Get aggregate bot performance metrics"""
    try:
        open_positions = supabase.table("bot_positions")\
            .select("*")\
            .eq("user_id", user.id)\
            .eq("is_closed", False)\
            .execute()

        closed_positions = supabase.table("bot_positions")\
            .select("*")\
            .eq("user_id", user.id)\
            .eq("is_closed", True)\
            .execute()

        open_data = open_positions.data if open_positions.data else []
        closed_data = closed_positions.data if closed_positions.data else []

        total_value = sum(
            float(p.get("quantity", 0)) * float(p.get("current_price", 0))
            for p in open_data
        )

        total_unrealized_pnl = sum(
            float(p.get("unrealized_pnl", 0))
            for p in open_data
        )

        total_realized_pnl = sum(
            float(p.get("realized_pnl", 0))
            for p in closed_data
        )

        avg_unrealized_pnl_percent = 0
        if open_data:
            avg_unrealized_pnl_percent = sum(
                float(p.get("unrealized_pnl_percent", 0))
                for p in open_data
            ) / len(open_data)

        winning_trades = len([p for p in closed_data if float(p.get("realized_pnl", 0)) > 0])
        win_rate = (winning_trades / len(closed_data) * 100) if closed_data else 0

        return {
            "total_positions": len(open_data),
            "total_value": total_value,
            "total_unrealized_pnl": total_unrealized_pnl,
            "total_realized_pnl": total_realized_pnl,
            "avg_unrealized_pnl_percent": avg_unrealized_pnl_percent,
            "win_rate": win_rate,
            "closed_trades": len(closed_data),
            "winning_trades": winning_trades
        }

    except Exception as e:
        logger.error(f"Error calculating bot metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders")
async def get_bot_orders(
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Get recent bot orders"""
    try:
        result = supabase.table("bot_orders")\
            .select("*")\
            .eq("user_id", user.id)\
            .order("submitted_at", desc=True)\
            .limit(limit)\
            .execute()

        return result.data if result.data else []

    except Exception as e:
        logger.error(f"Error fetching bot orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/{strategy_id}")
async def get_strategy_performance(
    strategy_id: str,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    days: int = 30
) -> List[Dict[str, Any]]:
    """Get performance history for a strategy"""
    try:
        result = supabase.table("bot_performance_history")\
            .select("*")\
            .eq("user_id", user.id)\
            .eq("strategy_id", strategy_id)\
            .order("snapshot_date", desc=True)\
            .limit(days)\
            .execute()

        return result.data if result.data else []

    except Exception as e:
        logger.error(f"Error fetching strategy performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk-events")
async def get_risk_events(
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    limit: int = 20
) -> List[Dict[str, Any]]:
    """Get recent risk management events"""
    try:
        result = supabase.table("bot_risk_events")\
            .select("*")\
            .eq("user_id", user.id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()

        return result.data if result.data else []

    except Exception as e:
        logger.error(f"Error fetching risk events: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/positions/{position_id}/close")
async def close_position(
    position_id: str,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> Dict[str, Any]:
    """Manually close a bot position"""
    try:
        position_result = supabase.table("bot_positions")\
            .select("*")\
            .eq("id", position_id)\
            .eq("user_id", user.id)\
            .single()\
            .execute()

        if not position_result.data:
            raise HTTPException(status_code=404, detail="Position not found")

        position = position_result.data
        current_price = float(position.get("current_price", 0))

        entry_price = float(position["entry_price"])
        quantity = float(position["quantity"])
        side = position["side"]

        if side == "long":
            realized_pnl = (current_price - entry_price) * quantity
        else:
            realized_pnl = (entry_price - current_price) * quantity

        supabase.table("bot_positions").update({
            "is_closed": True,
            "close_price": current_price,
            "close_timestamp": datetime.now(timezone.utc).isoformat(),
            "realized_pnl": realized_pnl
        }).eq("id", position_id).execute()

        logger.info(f"Position {position_id} closed manually. P&L: ${realized_pnl:.2f}")

        return {
            "success": True,
            "position_id": position_id,
            "realized_pnl": realized_pnl
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error closing position: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/execution-state/{strategy_id}")
async def get_execution_state(
    strategy_id: str,
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> Dict[str, Any]:
    """Get current execution state for a strategy"""
    try:
        result = supabase.table("bot_execution_state")\
            .select("*")\
            .eq("strategy_id", strategy_id)\
            .eq("user_id", user.id)\
            .single()\
            .execute()

        if not result.data:
            return {"state": {}, "current_phase": None}

        return result.data

    except Exception as e:
        logger.error(f"Error fetching execution state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_bot_summary(
    user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> Dict[str, Any]:
    """Get comprehensive bot trading summary"""
    try:
        strategies = supabase.table("trading_strategies")\
            .select("id, name, is_active, strategy_type")\
            .eq("user_id", user.id)\
            .execute()

        active_strategies = [s for s in (strategies.data or []) if s.get("is_active")]

        metrics = await get_bot_metrics(user, supabase)

        recent_orders = supabase.table("bot_orders")\
            .select("*")\
            .eq("user_id", user.id)\
            .order("submitted_at", desc=True)\
            .limit(10)\
            .execute()

        return {
            "total_strategies": len(strategies.data or []),
            "active_strategies": len(active_strategies),
            "metrics": metrics,
            "recent_orders": recent_orders.data if recent_orders.data else []
        }

    except Exception as e:
        logger.error(f"Error fetching bot summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
