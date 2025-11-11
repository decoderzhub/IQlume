# backend/routers/positions.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from supabase import Client
from dependencies import (
    get_current_user,
    get_supabase_client,
    security,
)

router = APIRouter(prefix="/api/positions", tags=["positions"])
logger = logging.getLogger(__name__)


class UpdatePositionTPSL(BaseModel):
    """Request model for updating position TP/SL"""
    take_profit_price: Optional[float] = None
    stop_loss_price: Optional[float] = None
    trailing_stop_price: Optional[float] = None
    take_profit_levels: Optional[List[Dict[str, Any]]] = None


class PositionResponse(BaseModel):
    """Response model for position data"""
    id: str
    strategy_id: str
    user_id: str
    symbol: str
    quantity: float
    entry_price: float
    current_price: float
    side: str
    is_closed: bool
    take_profit_price: Optional[float] = None
    stop_loss_price: Optional[float] = None
    trailing_stop_price: Optional[float] = None
    unrealized_pnl: float
    unrealized_pnl_percent: float
    realized_pnl: float
    opened_at: datetime
    closed_at: Optional[datetime] = None


class ExitEventResponse(BaseModel):
    """Response model for exit events"""
    id: str
    symbol: str
    exit_type: str
    exit_price: float
    entry_price: float
    exit_quantity: float
    profit_loss: float
    profit_loss_percent: float
    executed_at: datetime



@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "positions"}

@router.get("/", response_model=List[PositionResponse])
async def get_positions(
    strategy_id: Optional[str] = None,
    is_closed: Optional[bool] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get all positions for the current user"""
    try:
        query = supabase.table("bot_positions").select("*").eq("user_id", current_user.id)

        if strategy_id:
            query = query.eq("strategy_id", strategy_id)

        if is_closed is not None:
            query = query.eq("is_closed", is_closed)

        query = query.order("opened_at", desc=True)

        resp = query.execute()

        return resp.data

    except Exception as e:
        logger.error(f"Error fetching positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{position_id}", response_model=PositionResponse)
async def get_position(
    position_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get a specific position by ID"""
    try:
        resp = supabase.table("bot_positions").select("*").eq("id", position_id).eq("user_id", current_user.id).single().execute()

        if not resp.data:
            raise HTTPException(status_code=404, detail="Position not found")

        return resp.data

    except Exception as e:
        logger.error(f"Error fetching position: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{position_id}/tp-sl")
async def update_position_tp_sl(
    position_id: str,
    update_data: UpdatePositionTPSL,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Update take profit and stop loss for an open position"""
    try:
        # Verify position belongs to user and is open
        position_resp = supabase.table("bot_positions").select("*").eq("id", position_id).eq("user_id", current_user.id).single().execute()

        if not position_resp.data:
            raise HTTPException(status_code=404, detail="Position not found")

        if position_resp.data.get("is_closed"):
            raise HTTPException(status_code=400, detail="Cannot modify closed position")

        # Prepare update payload
        update_payload = {}

        if update_data.take_profit_price is not None:
            update_payload["take_profit_price"] = update_data.take_profit_price

        if update_data.stop_loss_price is not None:
            update_payload["stop_loss_price"] = update_data.stop_loss_price

        if update_data.trailing_stop_price is not None:
            update_payload["trailing_stop_price"] = update_data.trailing_stop_price

        if update_data.take_profit_levels is not None:
            update_payload["take_profit_levels"] = update_data.take_profit_levels

        if not update_payload:
            raise HTTPException(status_code=400, detail="No updates provided")

        # Update position
        resp = supabase.table("bot_positions").update(update_payload).eq("id", position_id).execute()

        logger.info(f"✅ Updated TP/SL for position {position_id}")

        return {
            "success": True,
            "message": "Position TP/SL updated successfully",
            "position": resp.data[0] if resp.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating position TP/SL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{position_id}/close")
async def close_position_manually(
    position_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Manually close a position"""
    try:
        from dependencies import get_alpaca_trading_client
        from alpaca.trading.requests import MarketOrderRequest
        from alpaca.trading.enums import OrderSide, TimeInForce

        # Get position
        position_resp = supabase.table("bot_positions").select("*").eq("id", position_id).eq("user_id", current_user.id).single().execute()

        if not position_resp.data:
            raise HTTPException(status_code=404, detail="Position not found")

        position = position_resp.data

        if position.get("is_closed"):
            raise HTTPException(status_code=400, detail="Position already closed")

        # Get trading client
        trading_client = await get_alpaca_trading_client(current_user, supabase)

        if not trading_client:
            raise HTTPException(status_code=500, detail="Could not connect to trading client")

        # Submit market order to close position
        symbol = position["symbol"]
        quantity = abs(float(position["quantity"]))
        side = position.get("side", "long")

        order_side = OrderSide.SELL if side == "long" else OrderSide.BUY

        order_request = MarketOrderRequest(
            symbol=symbol,
            qty=quantity,
            side=order_side,
            time_in_force=TimeInForce.GTC
        )

        order = trading_client.submit_order(order_request)

        logger.info(f"✅ Manual close order submitted for position {position_id}: {order.id}")

        # Update position record
        supabase.table("bot_positions").update({
            "exit_alpaca_order_id": order.id,
            "exit_type": "manual",
            "exit_reason": "Manual close requested by user"
        }).eq("id", position_id).execute()

        return {
            "success": True,
            "message": "Position close order submitted",
            "order_id": order.id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error closing position manually: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exits/history", response_model=List[ExitEventResponse])
async def get_exit_history(
    strategy_id: Optional[str] = None,
    limit: int = 100,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get exit event history"""
    try:
        query = supabase.table("exit_events").select("*").eq("user_id", current_user.id)

        if strategy_id:
            query = query.eq("strategy_id", strategy_id)

        query = query.order("executed_at", desc=True).limit(limit)

        resp = query.execute()

        return resp.data

    except Exception as e:
        logger.error(f"Error fetching exit history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/exit-metrics")
async def get_exit_performance_metrics(
    strategy_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get exit performance metrics"""
    try:
        query = supabase.table("exit_performance_metrics").select("*").eq("user_id", current_user.id)

        if strategy_id:
            query = query.eq("strategy_id", strategy_id)

        resp = query.execute()

        return {
            "success": True,
            "metrics": resp.data
        }

    except Exception as e:
        logger.error(f"Error fetching exit performance metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
