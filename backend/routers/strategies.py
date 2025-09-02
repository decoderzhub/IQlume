# backend/routers/strategies.py
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging

from supabase import Client
from dependencies import (
    get_current_user,
    get_supabase_client,
    security,
)
from schemas import (
    TradingStrategyCreate,
    TradingStrategyUpdate,
    TradingStrategyResponse,
    RiskLevel,
    SkillLevel,
    AssetClass,
    TimeHorizon,
    AutomationLevel,
    BacktestMode,
)

router = APIRouter(prefix="/api/strategies", tags=["strategies"])
logger = logging.getLogger(__name__)

@router.post(
    "/",
    response_model=TradingStrategyResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_strategy(
    strategy_data: TradingStrategyCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Create a new trading strategy."""
    try:
        # Convert Pydantic model to dictionary, handling nested models
        strategy_dict = strategy_data.model_dump(exclude_unset=True, exclude_none=True)
        
        # Ensure nested Pydantic models are converted to dicts for Supabase JSONB
        for field in ['capital_allocation', 'position_sizing', 'trade_window',
                       'order_execution', 'risk_controls', 'data_filters',
                       'notifications', 'backtest_params', 'performance']:
            if strategy_dict.get(field) is not None:
                if isinstance(strategy_dict[field], BaseModel):
                    strategy_dict[field] = strategy_dict[field].model_dump(exclude_unset=True, exclude_none=True)
                elif isinstance(strategy_dict[field], dict):
                    # Ensure any sub-fields within these are also dumped if they were models
                    for k, v in strategy_dict[field].items():
                        if isinstance(v, BaseModel):
                            strategy_dict[field][k] = v.model_dump(exclude_unset=True, exclude_none=True)

        # Add user_id and current timestamps
        strategy_dict['user_id'] = current_user.id
        strategy_dict['created_at'] = datetime.now(timezone.utc).isoformat()
        strategy_dict['updated_at'] = datetime.now(timezone.utc).isoformat()

        resp = (
            supabase.table("trading_strategies")
            .insert(strategy_dict)
            .select("*")
            .single()
            .execute()
        )
        return TradingStrategyResponse.model_validate(resp.data)
    except Exception as e:
        logger.error(f"Error creating strategy: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create strategy: {str(e)}")

@router.get(
    "/",
    response_model=List[TradingStrategyResponse]
)
async def get_all_strategies(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    is_active: Optional[bool] = None,
    strategy_type: Optional[str] = None,
    risk_level: Optional[RiskLevel] = None,
    limit: int = 100,
    offset: int = 0,
):
    """Retrieve all trading strategies for the current user, with optional filters."""
    try:
        query = supabase.table("trading_strategies").select("*").eq("user_id", current_user.id)

        if is_active is not None:
            query = query.eq("is_active", is_active)
        if strategy_type:
            query = query.eq("type", strategy_type)
        if risk_level:
            query = query.eq("risk_level", risk_level.value)

        query = query.order("updated_at", desc=True).limit(limit).offset(offset)
        
        resp = query.execute()
        return [TradingStrategyResponse.model_validate(s) for s in resp.data]
    except Exception as e:
        logger.error(f"Error fetching strategies: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch strategies: {str(e)}")

@router.get(
    "/{strategy_id}",
    response_model=TradingStrategyResponse
)
async def get_strategy_by_id(
    strategy_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Retrieve a single trading strategy by its ID."""
    try:
        resp = (
            supabase.table("trading_strategies")
            .select("*")
            .eq("id", strategy_id)
            .eq("user_id", current_user.id)
            .single()
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
        return TradingStrategyResponse.model_validate(resp.data)
    except HTTPException:
        raise # Re-raise HTTPExceptions
    except Exception as e:
        logger.error(f"Error fetching strategy {strategy_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch strategy: {str(e)}")

@router.put(
    "/{strategy_id}",
    response_model=TradingStrategyResponse
)
async def update_strategy(
    strategy_id: str,
    strategy_data: TradingStrategyUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Update an existing trading strategy."""
    try:
        # Convert Pydantic model to dictionary, excluding unset fields
        update_dict = strategy_data.model_dump(exclude_unset=True, exclude_none=True)
        
        # Ensure nested Pydantic models are converted to dicts for Supabase JSONB
        for field in ['capital_allocation', 'position_sizing', 'trade_window',
                       'order_execution', 'risk_controls', 'data_filters',
                       'notifications', 'backtest_params', 'performance']:
            if field in update_dict and update_dict[field] is not None:
                if isinstance(update_dict[field], BaseModel):
                    update_dict[field] = update_dict[field].model_dump(exclude_unset=True, exclude_none=True)
                elif isinstance(update_dict[field], dict):
                    # Ensure any sub-fields within these are also dumped if they were models
                    for k, v in update_dict[field].items():
                        if isinstance(v, BaseModel):
                            update_dict[field][k] = v.model_dump(exclude_unset=True, exclude_none=True)

        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()

        resp = (
            supabase.table("trading_strategies")
            .update(update_dict)
            .eq("id", strategy_id)
            .eq("user_id", current_user.id)
            .select("*")
            .single()
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found or not authorized")
        return TradingStrategyResponse.model_validate(resp.data)
    except HTTPException:
        raise # Re-raise HTTPExceptions
    except Exception as e:
        logger.error(f"Error updating strategy {strategy_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update strategy: {str(e)}")

@router.delete(
    "/{strategy_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_strategy(
    strategy_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Delete a trading strategy."""
    try:
        resp = (
            supabase.table("trading_strategies")
            .delete()
            .eq("id", strategy_id)
            .eq("user_id", current_user.id)
            .execute()
        )
        # Supabase delete returns data=None if no rows matched, or data=[] if rows were deleted.
        # Check if any rows were actually deleted.
        if resp.data is None or len(resp.data) == 0:
             # This check might be tricky with Supabase-py. A more robust check might involve
             # a select before delete, or checking the count of affected rows if the client supports it.
             # For now, assuming if no error, it's fine, or if data is empty, it wasn't found.
             # A 404 is more appropriate if the item wasn't found.
             # Supabase-py's delete() doesn't return affected rows directly in a simple way.
             # We'll rely on the .single() behavior for update/create, but for delete,
             # if it doesn't raise an error, we assume success.
             # If you want to return 404 for non-existent, you'd need a prior select.
             pass # No content to return, 204 is success
    except Exception as e:
        logger.error(f"Error deleting strategy {strategy_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete strategy: {str(e)}")