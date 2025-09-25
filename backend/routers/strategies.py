# backend/routers/strategies.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging

from supabase import Client
from dependencies import (
    get_current_user,
    get_supabase_client,
    get_alpaca_trading_client,
    get_alpaca_stock_data_client,
    get_alpaca_crypto_data_client,
    security,
)
from schemas import (
    TradingStrategyCreate, 
    TradingStrategyUpdate, 
    TradingStrategyResponse, 
    RiskLevel, 
    AssetClass, 
    TimeHorizon, 
    AutomationLevel, 
    BacktestMode, 
    GridMode, 
    TechnicalIndicators, 
    TelemetryData
)
from strategy_executors.factory import StrategyExecutorFactory

router = APIRouter(prefix="/api/strategies", tags=["strategies"])
logger = logging.getLogger(__name__)

@router.post("/", response_model=TradingStrategyResponse)
async def create_strategy(
    strategy_data: TradingStrategyCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Create a new trading strategy"""
    try:
        logger.info(f"➕ Creating new strategy for user {current_user.id}: {strategy_data.name}")
        
        # Convert Pydantic model to dictionary for Supabase insert
        strategy_dict = strategy_data.model_dump()
        strategy_dict["user_id"] = current_user.id
        
        # Ensure enum values are strings for Supabase
        if isinstance(strategy_dict.get("risk_level"), RiskLevel):
            strategy_dict["risk_level"] = strategy_dict["risk_level"].value
        if isinstance(strategy_dict.get("asset_class"), AssetClass):
            strategy_dict["asset_class"] = strategy_dict["asset_class"].value
        if isinstance(strategy_dict.get("time_horizon"), TimeHorizon):
            strategy_dict["time_horizon"] = strategy_dict["time_horizon"].value
        if isinstance(strategy_dict.get("automation_level"), AutomationLevel):
            strategy_dict["automation_level"] = strategy_dict["automation_level"].value
        if isinstance(strategy_dict.get("backtest_mode"), BacktestMode):
            strategy_dict["backtest_mode"] = strategy_dict["backtest_mode"].value
        if isinstance(strategy_dict.get("grid_mode"), GridMode):
            strategy_dict["grid_mode"] = strategy_dict["grid_mode"].value
        
        # Handle nested Pydantic models for JSONB fields
        if strategy_dict.get("technical_indicators"):
            strategy_dict["technical_indicators"] = TechnicalIndicators(**strategy_dict["technical_indicators"]).model_dump()
        if strategy_dict.get("telemetry_data"):
            strategy_dict["telemetry_data"] = TelemetryData(**strategy_dict["telemetry_data"]).model_dump()

        resp = supabase.table("trading_strategies").insert(strategy_dict).execute()
        
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to create strategy in database")
        
        # Convert back to Pydantic model for response
        created_strategy = TradingStrategyResponse(**resp.data[0])
        logger.info(f"✅ Strategy created: {created_strategy.name} (ID: {created_strategy.id})")
        return created_strategy
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating strategy: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create strategy: {str(e)}")

@router.get("/", response_model=List[TradingStrategyResponse])
async def get_strategies(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get all trading strategies for the current user"""
    try:
        logger.info(f"📋 Fetching strategies for user {current_user.id}")
        resp = supabase.table("trading_strategies").select("*").eq("user_id", current_user.id).execute()
        
        strategies = [TradingStrategyResponse(**s) for s in resp.data]
        logger.info(f"✅ Found {len(strategies)} strategies for user {current_user.id}")
        return strategies
        
    except Exception as e:
        logger.error(f"❌ Error fetching strategies: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch strategies: {str(e)}")

@router.get("/{strategy_id}", response_model=TradingStrategyResponse)
async def get_strategy(
    strategy_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get a single trading strategy by ID"""
    try:
        logger.info(f"🔍 Fetching strategy {strategy_id} for user {current_user.id}")
        resp = supabase.table("trading_strategies").select("*").eq("id", strategy_id).eq("user_id", current_user.id).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")
            
        strategy = TradingStrategyResponse(**resp.data[0])
        logger.info(f"✅ Found strategy {strategy_id}")
        return strategy
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching strategy {strategy_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch strategy: {str(e)}")

@router.put("/{strategy_id}", response_model=TradingStrategyResponse)
async def update_strategy(
    strategy_id: str,
    strategy_data: TradingStrategyUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Update an existing trading strategy"""
    try:
        logger.info(f"✏️ Updating strategy {strategy_id} for user {current_user.id}")
        
        # Convert Pydantic model to dictionary for Supabase update
        update_dict = strategy_data.model_dump(exclude_unset=True)
        
        # Ensure enum values are strings for Supabase
        if isinstance(update_dict.get("risk_level"), RiskLevel):
            update_dict["risk_level"] = update_dict["risk_level"].value
        if isinstance(update_dict.get("asset_class"), AssetClass):
            update_dict["asset_class"] = update_dict["asset_class"].value
        if isinstance(update_dict.get("time_horizon"), TimeHorizon):
            update_dict["time_horizon"] = update_dict["time_horizon"].value
        if isinstance(update_dict.get("automation_level"), AutomationLevel):
            update_dict["automation_level"] = update_dict["automation_level"].value
        if isinstance(update_dict.get("backtest_mode"), BacktestMode):
            update_dict["backtest_mode"] = update_dict["backtest_mode"].value
        if isinstance(update_dict.get("grid_mode"), GridMode):
            update_dict["grid_mode"] = update_dict["grid_mode"].value
            
        # Handle nested Pydantic models for JSONB fields
        if update_dict.get("technical_indicators"):
            update_dict["technical_indicators"] = TechnicalIndicators(**update_dict["technical_indicators"]).model_dump()
        if update_dict.get("telemetry_data"):
            update_dict["telemetry_data"] = TelemetryData(**update_dict["telemetry_data"]).model_dump()

        resp = supabase.table("trading_strategies").update(update_dict).eq("id", strategy_id).eq("user_id", current_user.id).execute()
        
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to update strategy in database")
            
        updated_strategy = TradingStrategyResponse(**resp.data[0])
        logger.info(f"✅ Strategy updated: {updated_strategy.name} (ID: {updated_strategy.id})")
        return updated_strategy
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating strategy {strategy_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update strategy: {str(e)}")

@router.delete("/{strategy_id}")
async def delete_strategy(
    strategy_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Delete a trading strategy"""
    try:
        logger.info(f"🗑️ Deleting strategy {strategy_id} for user {current_user.id}")
        resp = supabase.table("trading_strategies").delete().eq("id", strategy_id).eq("user_id", current_user.id).execute()
        
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to delete strategy from database")
            
        logger.info(f"✅ Strategy {strategy_id} deleted successfully")
        return {"message": "Strategy deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting strategy {strategy_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete strategy: {str(e)}")

@router.post("/{strategy_id}/execute")
async def execute_strategy(
    strategy_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Manually trigger a single execution of a strategy"""
    try:
        logger.info(f"⚡ Manually executing strategy {strategy_id} for user {current_user.id}")
        
        # Fetch strategy details
        resp = supabase.table("trading_strategies").select("*").eq("id", strategy_id).eq("user_id", current_user.id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        strategy_data = resp.data[0]  # Get the first (and only) strategy from the response
        
        # Ensure we have valid strategy data
        if not isinstance(strategy_data, dict):
            logger.error(f"❌ Invalid strategy data type: {type(strategy_data)}")
            raise HTTPException(status_code=500, detail="Invalid strategy data format")
        
        logger.info(f"📊 Strategy data loaded: {strategy_data.get('name', 'Unknown')} ({strategy_data.get('type', 'Unknown')})")
        
        # Get trading clients
        trading_client = await get_alpaca_trading_client(current_user, supabase)
        stock_client = get_alpaca_stock_data_client()
        crypto_client = get_alpaca_crypto_data_client()
        
        # Create executor using factory
        executor = StrategyExecutorFactory.create_executor(
            strategy_data, trading_client, stock_client, crypto_client, supabase
        )
        
        # Execute strategy
        result = await executor.execute()
        
        logger.info(f"✅ Manual execution of strategy {strategy_id} completed with result: {result}")
        return {"message": "Strategy execution triggered", "result": result}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error executing strategy {strategy_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute strategy: {str(e)}")

async def update_strategy_performance(
    strategy_id: str,
    user_id: str,
    supabase: Client,
    trading_client
):
    """Update strategy performance metrics after a trade"""
    logger.info(f"📊 Updating performance for strategy {strategy_id}")
    
    # Fetch all trades for this strategy
    resp = supabase.table("trades").select("*").eq("strategy_id", strategy_id).eq("user_id", user_id).execute()
    strategy_trades = resp.data or []
    
    total_profit_loss = sum(t.get("profit_loss", 0) for t in strategy_trades if t.get("status") == "executed")
    executed_trades = len([t for t in strategy_trades if t.get("status") == "executed"])
    winning_trades = len([t for t in strategy_trades if t.get("status") == "executed" and t.get("profit_loss", 0) > 0])
    
    win_rate = (winning_trades / executed_trades) if executed_trades > 0 else 0.0
    
    # Mock total return and max drawdown for now
    total_return = total_profit_loss / 10000  # Assuming $10k initial capital for calculation
    max_drawdown = -0.05  # Mock 5% max drawdown
    
    performance_data = {
        "total_return": total_return,
        "win_rate": win_rate,
        "max_drawdown": max_drawdown,
        "sharpe_ratio": 1.2,  # Mock
        "total_trades": executed_trades,
        "avg_trade_duration": 5,  # Mock
    }
    
    supabase.table("trading_strategies").update({"performance": performance_data}).eq("id", strategy_id).execute()
    logger.info(f"✅ Performance updated for strategy {strategy_id}")