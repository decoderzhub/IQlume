"""
Grid Status API Routes

Provides endpoints for monitoring grid trading strategy status,
validation, and health metrics.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import logging
from dependencies import get_current_user, get_supabase_client
from services.grid_state_validator import create_grid_state_validator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/grid-status", tags=["grid-status"])


@router.get("/{strategy_id}/validation")
async def get_grid_validation(
    strategy_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
) -> Dict[str, Any]:
    """
    Get detailed validation report for a grid strategy

    Returns coverage analysis, gap detection, and recommendations
    """
    try:
        # Get strategy data
        resp = supabase.table("trading_strategies").select("*").eq(
            "id", strategy_id
        ).eq(
            "user_id", user.id
        ).single().execute()

        if not resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")

        strategy_data = resp.data

        # Validate grid state
        validator = create_grid_state_validator(supabase)
        validation = await validator.validate_strategy_grid(strategy_id, strategy_data)

        return validation

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting grid validation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{strategy_id}/health")
async def get_grid_health(
    strategy_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
) -> Dict[str, Any]:
    """
    Get health score and status for a grid strategy

    Returns overall health score (0-100) and breakdown
    """
    try:
        # Get strategy data
        resp = supabase.table("trading_strategies").select("*").eq(
            "id", strategy_id
        ).eq(
            "user_id", user.id
        ).single().execute()

        if not resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")

        strategy_data = resp.data

        # Calculate health score
        validator = create_grid_state_validator(supabase)
        health = await validator.get_grid_health_score(strategy_id, strategy_data)

        return health

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting grid health: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{strategy_id}/cleanup-stale")
async def cleanup_stale_orders(
    strategy_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
) -> Dict[str, Any]:
    """
    Clean up stale orders for a grid strategy

    Returns number of orders cleaned up
    """
    try:
        # Verify strategy belongs to user
        resp = supabase.table("trading_strategies").select("id").eq(
            "id", strategy_id
        ).eq(
            "user_id", user.id
        ).single().execute()

        if not resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")

        # Clean up stale orders
        validator = create_grid_state_validator(supabase)
        cleaned_count = await validator.cleanup_stale_orders(strategy_id)

        return {
            "success": True,
            "strategy_id": strategy_id,
            "orders_cleaned": cleaned_count,
            "message": f"Cleaned up {cleaned_count} stale orders"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cleaning up stale orders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{strategy_id}/coverage")
async def get_grid_coverage(
    strategy_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
) -> Dict[str, Any]:
    """
    Get simple coverage statistics for a grid strategy

    Returns basic coverage metrics without full validation
    """
    try:
        # Get strategy data
        resp = supabase.table("trading_strategies").select("*").eq(
            "id", strategy_id
        ).eq(
            "user_id", user.id
        ).single().execute()

        if not resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")

        strategy_data = resp.data
        config = strategy_data.get("configuration", {})
        num_grids = config.get("number_of_grids", 10)

        # Get active orders count
        orders_resp = supabase.table("grid_orders").select("id, status").eq(
            "strategy_id", strategy_id
        ).in_(
            "status", ["pending", "partially_filled"]
        ).eq(
            "is_stale", False
        ).execute()

        active_orders = len(orders_resp.data or [])
        coverage_percent = (active_orders / num_grids) * 100 if num_grids > 0 else 0

        return {
            "strategy_id": strategy_id,
            "strategy_name": strategy_data.get("name", "Unknown"),
            "total_grid_levels": num_grids,
            "active_orders": active_orders,
            "coverage_percent": round(coverage_percent, 1),
            "status": "excellent" if coverage_percent >= 90 else "good" if coverage_percent >= 70 else "fair" if coverage_percent >= 50 else "poor"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting grid coverage: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
