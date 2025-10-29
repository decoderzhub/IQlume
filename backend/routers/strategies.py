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
from strategy_executors.factory import StrategyExecutorFactory
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
        strategy_dict = strategy_data.model_dump(mode='json')
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
            strategy_dict["technical_indicators"] = TechnicalIndicators(**strategy_dict["technical_indicators"]).model_dump(mode='json')
        if strategy_dict.get("telemetry_data"):
            strategy_dict["telemetry_data"] = TelemetryData(**strategy_dict["telemetry_data"]).model_dump(mode='json')

        resp = supabase.table("trading_strategies").insert(strategy_dict).execute()

        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to create strategy in database")

        # Convert back to Pydantic model for response
        created_strategy = TradingStrategyResponse(**resp.data[0])
        logger.info(f"✅ Strategy created: {created_strategy.name} (ID: {created_strategy.id})")

        # Check if auto_start is enabled - if so, immediately execute and activate
        should_auto_execute = strategy_data.auto_start or (created_strategy.type in ["spot_grid", "futures_grid", "reverse_grid", "infinity_grid"])

        if should_auto_execute:
            logger.info(f"🚀 Auto-start enabled for {created_strategy.name}, executing immediately")

        # Immediately execute the strategy after creation if auto_start is enabled
        if should_auto_execute:
            try:
                logger.info(f"🚀 Executing newly created strategy: {created_strategy.name}")

                # Verify account context before executing
                from dependencies import verify_alpaca_account_context
                account_context = await verify_alpaca_account_context(current_user, supabase)
                logger.info(f"📋 Account Context for strategy creation: {account_context}")

                # Get trading clients with user context
                trading_client = await get_alpaca_trading_client(current_user, supabase)
                stock_client = await get_alpaca_stock_data_client(current_user, supabase)
                crypto_client = await get_alpaca_crypto_data_client(current_user, supabase)

                # Get strategy executor from factory
                executor = StrategyExecutorFactory.create_executor(
                    created_strategy.type,
                    trading_client,
                    stock_client,
                    crypto_client,
                    supabase
                )

                if executor:
                    # Execute strategy using the appropriate executor
                    result = await executor.execute(resp.data[0])  # Use raw DB data
                    logger.info(f"📊 Initial execution result: {result}")
                
                    # Record trade in database if action was taken
                    # Skip for strategies that manage their own trade recording
                    if result and result.get("action") in ["buy", "sell"] and created_strategy.type not in ["smart_rebalance", "spot_grid", "reverse_grid"]:
                        try:
                            trade_data = {
                                "user_id": current_user.id,
                                "strategy_id": created_strategy.id,
                                "symbol": result.get("symbol", "UNKNOWN"),
                                "type": result.get("action"),
                                "quantity": result.get("quantity", 0),
                                "price": result.get("price", 0),
                                "profit_loss": 0,
                                "status": "pending",
                                "order_type": "market",
                                "time_in_force": "day",
                                "filled_qty": 0,
                                "filled_avg_price": 0,
                                "commission": 0,
                                "fees": 0,
                                "alpaca_order_id": result.get("order_id"),
                            }

                            trade_resp = supabase.table("trades").insert(trade_data).execute()

                            if trade_resp.data:
                                trade_id = trade_resp.data[0]["id"]
                                logger.info(f"✅ Initial trade recorded: {trade_id}")

                        except Exception as trade_error:
                            logger.error(f"❌ Error recording initial trade: {trade_error}")

                    # Add execution result to the response
                    created_strategy_dict = created_strategy.model_dump()
                    created_strategy_dict["initial_execution_result"] = result
                    return TradingStrategyResponse(**created_strategy_dict)
                else:
                    logger.warning(f"⚠️ No executor available for strategy type: {created_strategy.type}")

            except Exception as exec_error:
                logger.error(f"❌ Error executing newly created strategy: {exec_error}")
                # Don't fail the creation, just log the error
        
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

        # Check if strategy is being activated
        was_activated = False
        if strategy_data.is_active is not None:
            # Get current strategy state
            current_resp = supabase.table("trading_strategies").select("is_active, type, telemetry_data").eq("id", strategy_id).eq("user_id", current_user.id).execute()
            if current_resp.data:
                old_is_active = current_resp.data[0].get("is_active", False)
                new_is_active = strategy_data.is_active
                strategy_type = current_resp.data[0].get("type", "")
                telemetry_data = current_resp.data[0].get("telemetry_data", {})

                # Check if being activated and is a grid strategy without initial buy
                if not old_is_active and new_is_active:
                    was_activated = True
                    initial_buy_submitted = telemetry_data.get("initial_buy_order_submitted", False) if isinstance(telemetry_data, dict) else False
                    logger.info(f"🔄 Strategy being activated. Type: {strategy_type}, Initial buy submitted: {initial_buy_submitted}")

        # Convert Pydantic model to dictionary for Supabase update
        update_dict = strategy_data.model_dump(exclude_unset=True, mode='json')

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
            update_dict["technical_indicators"] = TechnicalIndicators(**update_dict["technical_indicators"]).model_dump(mode='json')
        if update_dict.get("telemetry_data"):
            update_dict["telemetry_data"] = TelemetryData(**update_dict["telemetry_data"]).model_dump(mode='json')

        resp = supabase.table("trading_strategies").update(update_dict).eq("id", strategy_id).eq("user_id", current_user.id).execute()

        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to update strategy in database")

        updated_strategy = TradingStrategyResponse(**resp.data[0])
        logger.info(f"✅ Strategy updated: {updated_strategy.name} (ID: {updated_strategy.id})")

        # If strategy was just activated, execute it immediately
        if was_activated:
            try:
                logger.info(f"🚀 Executing newly activated strategy: {updated_strategy.name}")

                # Get trading clients
                trading_client = await get_alpaca_trading_client(current_user, supabase)
                stock_client = await get_alpaca_stock_data_client(current_user, supabase)
                crypto_client = await get_alpaca_crypto_data_client(current_user, supabase)

                # Validate clients were initialized
                if not trading_client:
                    logger.error(f"❌ Failed to initialize trading client for user {current_user.id}")
                    raise HTTPException(status_code=500, detail="Failed to initialize trading client. Please check your Alpaca credentials.")

                logger.info(f"✅ All Alpaca clients initialized successfully for user {current_user.id}")

                # Get strategy executor from factory
                executor = StrategyExecutorFactory.create_executor(
                    updated_strategy.type,
                    trading_client,
                    stock_client,
                    crypto_client,
                    supabase
                )

                if executor:
                    # Execute strategy
                    result = await executor.execute(resp.data[0])
                    logger.info(f"📊 Activation execution result: {result}")
                else:
                    logger.warning(f"⚠️ No executor for strategy type: {updated_strategy.type}")

            except Exception as exec_error:
                logger.error(f"❌ Error executing activated strategy: {exec_error}")

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
        stock_client = await get_alpaca_stock_data_client(current_user, supabase)
        crypto_client = await get_alpaca_crypto_data_client(current_user, supabase)

        # Validate clients were initialized
        if not trading_client:
            logger.error(f"❌ Failed to initialize trading client for user {current_user.id}")
            raise HTTPException(status_code=500, detail="Failed to initialize trading client. Please check your Alpaca credentials.")

        logger.info(f"✅ All Alpaca clients initialized successfully for user {current_user.id}")

        # Get strategy executor from factory
        executor = StrategyExecutorFactory.create_executor(
            strategy_data["type"],
            trading_client,
            stock_client,
            crypto_client,
            supabase
        )
        
        if not executor:
            logger.warning(f"⚠️ No executor available for strategy type: {strategy_data['type']}")
            result = {
                "action": "hold",
                "symbol": strategy_data.get("configuration", {}).get("symbol", "N/A"),
                "quantity": 0,
                "price": 0,
                "reason": f"Strategy type {strategy_data['type']} not yet implemented"
            }
        else:
            # Execute strategy using the appropriate executor
            logger.info(f"🚀 Executing {strategy_data['type']} strategy with dedicated executor")
            result = await executor.execute(strategy_data)
        
        # Record trade in database if action was taken
        # Skip for strategies that manage their own trade recording
        if result and result.get("action") in ["buy", "sell"] and strategy_data["type"] not in ["smart_rebalance", "spot_grid", "reverse_grid"]:
            try:
                trade_data = {
                    "user_id": current_user.id,
                    "strategy_id": strategy_id,
                    "symbol": result.get("symbol", "UNKNOWN"),
                    "type": result.get("action"),  # "buy" or "sell"
                    "quantity": result.get("quantity", 0),
                    "price": result.get("price", 0),
                    "profit_loss": 0,  # Will be updated by trade sync service
                    "status": "pending",  # Initial status
                    "order_type": "market",  # Default order type
                    "time_in_force": "day",  # Default time in force
                    "filled_qty": 0,  # Will be updated by trade sync service
                    "filled_avg_price": 0,  # Will be updated by trade sync service
                    "commission": 0,  # Will be updated by trade sync service
                    "fees": 0,  # Will be updated by trade sync service
                    "alpaca_order_id": result.get("order_id"),  # If available from execution
                }

                # Insert trade record into Supabase
                trade_resp = supabase.table("trades").insert(trade_data).execute()
                
                if trade_resp.data:
                    trade_id = trade_resp.data[0]["id"]
                    logger.info(f"✅ Trade recorded in database: {trade_id}")
                    result["trade_id"] = trade_id
                else:
                    logger.error(f"❌ Failed to record trade in database")
                    
            except Exception as trade_error:
                logger.error(f"❌ Error recording trade: {trade_error}")
        
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


@router.post("/{strategy_id}/backtest")
async def run_backtest(
    strategy_id: str,
    backtest_config: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Run a backtest for a trading strategy"""
    try:
        from services.backtest_engine import BacktestEngine
        from alpaca.data.historical import StockHistoricalDataClient
        import os

        logger.info(f"🔬 Starting backtest for strategy {strategy_id}")

        # Get strategy
        strategy_resp = supabase.table("trading_strategies").select("*").eq(
            "id", strategy_id
        ).eq("user_id", current_user.id).execute()

        if not strategy_resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")

        strategy = strategy_resp.data[0]

        # Parse backtest parameters
        start_date_str = backtest_config.get("start_date")
        end_date_str = backtest_config.get("end_date")
        initial_capital = backtest_config.get("initial_capital", 100000)

        if not start_date_str or not end_date_str:
            raise HTTPException(
                status_code=400,
                detail="start_date and end_date are required"
            )

        # Parse dates
        from datetime import datetime, timezone
        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid date format: {str(e)}"
            )

        # Initialize backtest engine with market data client
        alpaca_api_key = os.getenv("ALPACA_API_KEY")
        alpaca_secret_key = os.getenv("ALPACA_SECRET_KEY")

        if not alpaca_api_key or not alpaca_secret_key:
            raise HTTPException(
                status_code=500,
                detail="Alpaca API credentials not configured"
            )

        market_data_client = StockHistoricalDataClient(
            alpaca_api_key,
            alpaca_secret_key
        )

        backtest_engine = BacktestEngine(supabase, market_data_client)

        # Run backtest
        results = await backtest_engine.run_backtest(
            user_id=current_user.id,
            strategy_config=strategy,
            start_date=start_date,
            end_date=end_date,
            initial_capital=initial_capital
        )

        logger.info(f"✅ Backtest completed for strategy {strategy_id}")

        return {
            "success": True,
            "backtest_id": results["backtest_id"],
            "results": results
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error running backtest: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to run backtest: {str(e)}"
        )


@router.get("/{strategy_id}/backtest/{backtest_id}")
async def get_backtest_results(
    strategy_id: str,
    backtest_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get backtest results including equity curves"""
    try:
        logger.info(f"📊 Fetching backtest {backtest_id} for strategy {strategy_id}")

        # Get backtest record
        backtest_resp = supabase.table("backtests").select("*").eq(
            "id", backtest_id
        ).eq("user_id", current_user.id).execute()

        if not backtest_resp.data:
            raise HTTPException(status_code=404, detail="Backtest not found")

        backtest = backtest_resp.data[0]

        # Get equity curve data
        equity_resp = supabase.table("backtest_equity_curves").select("*").eq(
            "backtest_id", backtest_id
        ).order("timestamp").execute()

        equity_data = equity_resp.data or []

        # Format response
        return {
            "backtest": backtest,
            "equity_curve": equity_data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching backtest results: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch backtest results: {str(e)}"
        )

@router.get("/scheduler/status")
async def get_scheduler_status(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get the current status of the trading scheduler and active strategy jobs"""
    try:
        logger.info(f"📊 Fetching scheduler status for user {current_user.id}")

        # Import scheduler from main app state
        from main import trading_scheduler

        if not trading_scheduler:
            return {
                "scheduler_running": False,
                "active_strategies": 0,
                "total_jobs": 0,
                "jobs": [],
                "error": "Scheduler not initialized"
            }

        # Get scheduler status
        is_running = trading_scheduler.scheduler.running
        all_jobs = trading_scheduler.scheduler.get_jobs()

        # Filter to strategy jobs only (exclude system jobs)
        strategy_jobs = [
            job for job in all_jobs
            if job.id.startswith("strategy_")
        ]

        # Get user's active strategies from database
        strategies_resp = supabase.table("trading_strategies").select(
            "id, name, type, is_active"
        ).eq("user_id", current_user.id).eq("is_active", True).execute()

        user_active_strategies = {s["id"]: s for s in strategies_resp.data} if strategies_resp.data else {}

        # Build job details
        job_details = []
        for job in strategy_jobs:
            strategy_id = job.id.replace("strategy_", "")

            # Check if this strategy belongs to current user
            if strategy_id in user_active_strategies:
                strategy = user_active_strategies[strategy_id]
                job_details.append({
                    "job_id": job.id,
                    "strategy_id": strategy_id,
                    "strategy_name": strategy["name"],
                    "strategy_type": strategy["type"],
                    "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
                    "interval_seconds": trading_scheduler.active_jobs.get(job.id, {}).get("interval_seconds"),
                })

        return {
            "scheduler_running": is_running,
            "active_strategies": len(user_active_strategies),
            "scheduled_jobs": len(job_details),
            "total_scheduler_jobs": len(all_jobs),
            "jobs": job_details,
            "next_reload": trading_scheduler.scheduler.get_job("reload_strategies").next_run_time.isoformat() if trading_scheduler.scheduler.get_job("reload_strategies") else None
        }

    except Exception as e:
        logger.error(f"❌ Error fetching scheduler status: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch scheduler status: {str(e)}"
        )