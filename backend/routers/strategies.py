# backend/routers/strategies.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging

from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest, GetOrdersRequest
from alpaca.trading.enums import OrderSide, TimeInForce, OrderStatus
from alpaca.common.exceptions import APIError as AlpacaAPIError

from supabase import Client
from uuid import uuid4
from dependencies import (
    get_current_user,
    get_supabase_client,
    get_alpaca_trading_client,
    get_alpaca_stock_data_client,
    get_alpaca_crypto_data_client,
    security,
)
from schemas import TradingStrategyCreate, TradingStrategyUpdate, TradingStrategyResponse, RiskLevel, AssetClass, TimeHorizon, AutomationLevel, BacktestMode, GridMode, TakeProfitLevel, TechnicalIndicators, TelemetryData # Import new schemas
from technical_indicators import TechnicalIndicators as TI # Import the TI class

router = APIRouter(prefix="/api/strategies", tags=["strategies"])
logger = logging.getLogger(__name__)

# Helper function to convert strategy type string to enum
def _get_strategy_type_enum(strategy_type_str: str):
    # This needs to map to the actual enum values in your DB schema
    # For now, we'll just return the string, assuming the DB handles it
    return strategy_type_str

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
        created_strategy = TradingStrategyResponse(**resp.data)
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
            
        strategy = TradingStrategyResponse(**resp.data)
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
            
        updated_strategy = TradingStrategyResponse(**resp.data)
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
        
        strategy = resp.data[0]  # resp.data is a list, get the first item
        
        # Get trading clients
        trading_client = await get_alpaca_trading_client(current_user, supabase)
        stock_client = get_alpaca_stock_data_client()
        crypto_client = get_alpaca_crypto_data_client()
        
        result = None
        if strategy["type"] == "spot_grid":
            result = await execute_spot_grid_strategy(strategy, trading_client, stock_client, crypto_client, supabase)
        elif strategy["type"] == "dca":
            result = await execute_dca_strategy(strategy, trading_client, stock_client, crypto_client, supabase)
        elif strategy["type"] == "covered_calls":
            result = await execute_covered_calls_strategy(strategy, trading_client, stock_client, crypto_client, supabase)
        elif strategy["type"] == "wheel":
            result = await execute_wheel_strategy(strategy, trading_client, stock_client, crypto_client, supabase)
        elif strategy["type"] == "smart_rebalance":
            result = await execute_smart_rebalance_strategy(strategy, trading_client, stock_client, crypto_client, supabase)
        else:
            raise HTTPException(status_code=400, detail=f"Strategy type {strategy['type']} not supported for manual execution")
            
        logger.info(f"✅ Manual execution of strategy {strategy_id} completed with result: {result}")
        return {"message": "Strategy execution triggered", "result": result}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error executing strategy {strategy_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute strategy: {str(e)}")

# --- Strategy Execution Functions (Simplified/Mocked for now) ---

async def execute_spot_grid_strategy(
    strategy: Dict[str, Any],
    trading_client: TradingClient,
    stock_client: Any, # StockHistoricalDataClient
    crypto_client: Any, # CryptoHistoricalDataClient
    supabase: Client
) -> Dict[str, Any]:
    """Execute a single iteration of the spot grid strategy"""
    logger.info(f"🤖 Executing spot grid strategy: {strategy['name']}")
    
    user_id = strategy["user_id"]
    strategy_id = strategy["id"]
    symbol = strategy["configuration"].get("symbol", "BTC/USD")
    lower_price_limit = strategy["configuration"].get("price_range_lower", 50000)
    upper_price_limit = strategy["configuration"].get("price_range_upper", 70000)
    number_of_grids = strategy["configuration"].get("number_of_grids", 20)
    grid_mode = strategy.get("grid_mode", GridMode.ARITHMETIC).value
    quantity_per_grid = strategy.get("quantity_per_grid", 0.0001)
    stop_loss_percent = strategy.get("stop_loss_percent", 0)
    trailing_stop_loss_percent = strategy.get("trailing_stop_loss_percent", 0)
    take_profit_levels = strategy.get("take_profit_levels", [])
    technical_indicators_config = strategy.get("technical_indicators", {})
    volume_threshold = strategy.get("volume_threshold", 0)
    price_movement_threshold = strategy.get("price_movement_threshold", 0)

    # --- 1. Get current market data ---
    try:
        # Determine if stock or crypto
        is_crypto = "/" in symbol or symbol in ["BTC", "ETH", "SOL", "ADA"] # Simplified check
        
        if is_crypto:
            # For crypto, use crypto_client
            from alpaca.data.requests import CryptoLatestQuoteRequest
            market_data_resp = crypto_client.get_crypto_latest_quote(CryptoLatestQuoteRequest(symbol_or_symbols=[symbol]))
            current_price = float(market_data_resp[symbol].ask_price) if market_data_resp and market_data_resp.get(symbol) else None
        else:
            # For stocks, use stock_client
            from alpaca.data.requests import StockLatestQuoteRequest
            from alpaca.data.enums import DataFeed
            market_data_resp = stock_client.get_stock_latest_quote(StockLatestQuoteRequest(symbol_or_symbols=[symbol], feed=DataFeed.IEX))
            current_price = float(market_data_resp[symbol].ask_price) if market_data_resp and market_data_resp.get(symbol) else None

        if not current_price:
            logger.warning(f"⚠️ Could not get current price for {symbol}, using mock price.")
            # Fallback to mock price for demo purposes
            current_price = (lower_price_limit + upper_price_limit) / 2 + (upper_price_limit - lower_price_limit) / 10 * (0.5 - (datetime.now().second % 10) / 10)
            
        logger.info(f"Current price for {symbol}: {current_price}")
    except Exception as e:
        logger.error(f"❌ Error fetching market data for {symbol}: {e}")
        current_price = (lower_price_limit + upper_price_limit) / 2 # Fallback
        logger.info(f"Using fallback current price for {symbol}: {current_price}")

    # --- 2. Generate grid levels ---
    grid_levels = []
    if grid_mode == GridMode.ARITHMETIC.value:
        step = (upper_price_limit - lower_price_limit) / number_of_grids
        grid_levels = [lower_price_limit + i * step for i in range(number_of_grids + 1)]
    elif grid_mode == GridMode.GEOMETRIC.value:
        ratio = (upper_price_limit / lower_price_limit) ** (1 / number_of_grids)
        grid_levels = [lower_price_limit * (ratio ** i) for i in range(number_of_grids + 1)]
    
    # --- 3. Check Technical Indicators (if enabled) ---
    buy_signal_ti = False
    sell_signal_ti = False
    
    if technical_indicators_config:
        # Fetch recent prices for TI calculation (mock for now)
        recent_prices = [current_price * (1 + (i - 20)/1000) for i in range(40)] # Mock 40 recent prices
        
        ti_signals = TI.check_indicator_signals(recent_prices, technical_indicators_config)
        buy_signal_ti = ti_signals["buy_signal"]
        sell_signal_ti = ti_signals["sell_signal"]
        logger.info(f"Technical indicator signals: Buy={buy_signal_ti}, Sell={sell_signal_ti}")

    # --- 4. Implement Stop Loss Logic ---
    # Fetch current positions and calculate average entry price for SL
    positions = trading_client.get_all_positions()
    symbol_position = next((p for p in positions if p.symbol == symbol), None)
    
    current_total_profit_loss_usd = 0.0
    if symbol_position:
        current_total_profit_loss_usd = float(symbol_position.unrealized_pl or 0)
        
    # Calculate current strategy value (simplified: just current position value)
    current_strategy_value = float(symbol_position.market_value or 0) if symbol_position else 0.0
    
    # Calculate initial capital for P/L tracking (mock for now)
    initial_capital_for_strategy = strategy.get("min_capital", 1000) # Use min_capital as proxy
    
    # Calculate current P/L percentage relative to initial capital
    current_profit_loss_percent = (current_strategy_value - initial_capital_for_strategy) / initial_capital_for_strategy * 100 if initial_capital_for_strategy > 0 else 0

    stop_loss_triggered = False
    if stop_loss_percent > 0:
        # Check if current P/L % is below stop loss threshold (negative value)
        if current_profit_loss_percent < -stop_loss_percent:
            stop_loss_triggered = True
            logger.warning(f"🚨 Stop Loss triggered for {symbol}! Current P/L: {current_profit_loss_percent:.2f}%")
            # Place market sell order for entire position
            if symbol_position and float(symbol_position.qty) > 0:
                try:
                    order_request = MarketOrderRequest(
                        symbol=symbol,
                        qty=float(symbol_position.qty),
                        side=OrderSide.SELL,
                        time_in_force=TimeInForce.Day,
                        client_order_id=f"sl-{strategy_id}-{uuid4().hex[:8]}"
                    )
                    order = trading_client.submit_order(order_request)
                    logger.info(f"✅ Stop Loss order placed for {symbol}: {order.id}")
                    # Update strategy status to inactive after stop loss
                    supabase.table("trading_strategies").update({"is_active": False}).eq("id", strategy_id).execute()
                    return {"action": "sell", "symbol": symbol, "quantity": float(symbol_position.qty), "price": current_price, "reason": "Stop Loss Triggered", "order_id": str(order.id)}
                except AlpacaAPIError as e:
                    logger.error(f"❌ Alpaca API error placing SL order: {e}")
                    return {"action": "error", "reason": f"Alpaca API error placing SL order: {e}"}
            else:
                logger.info(f"ℹ️ Stop Loss triggered but no position to sell for {symbol}.")
                return {"action": "hold", "reason": "Stop Loss triggered but no position to sell"}

    # --- 5. Implement Take Profit Logic ---
    if take_profit_levels and current_total_profit_loss_usd > 0:
        for tp_level in take_profit_levels:
            tp_percent = tp_level.get("percent", 0)
            tp_quantity_percent = tp_level.get("quantity_percent", 100)
            
            # Calculate profit percentage relative to average entry price
            if symbol_position and float(symbol_position.avg_entry_price) > 0:
                profit_from_entry_percent = (current_price - float(symbol_position.avg_entry_price)) / float(symbol_position.avg_entry_price) * 100
                
                if profit_from_entry_percent >= tp_percent:
                    logger.info(f"💰 Take Profit triggered for {symbol} at {tp_percent}% profit!")
                    qty_to_sell = float(symbol_position.qty) * (tp_quantity_percent / 100)
                    if qty_to_sell > 0:
                        try:
                            order_request = MarketOrderRequest(
                                symbol=symbol,
                                qty=qty_to_sell,
                                side=OrderSide.SELL,
                                time_in_force=TimeInForce.Day,
                                client_order_id=f"tp-{strategy_id}-{uuid4().hex[:8]}"
                            )
                            order = trading_client.submit_order(order_request)
                            logger.info(f"✅ Take Profit order placed for {symbol}: {order.id}")
                            return {"action": "sell", "symbol": symbol, "quantity": qty_to_sell, "price": current_price, "reason": "Take Profit Triggered", "order_id": str(order.id)}
                        except AlpacaAPIError as e:
                            logger.error(f"❌ Alpaca API error placing TP order: {e}")
                            return {"action": "error", "reason": f"Alpaca API error placing TP order: {e}"}
                    else:
                        logger.info(f"ℹ️ Take Profit triggered but no quantity to sell for {symbol}.")
                        return {"action": "hold", "reason": "Take Profit triggered but no quantity to sell"}

    # --- 6. Place/Manage Grid Orders ---
    # Simplified logic: check if current price is near a grid level and place order
    action = "hold"
    reason = "No action needed"
    order_details = None
    
    # Get existing open orders for this strategy
    open_orders_request = GetOrdersRequest(status=OrderStatus.OPEN)
    open_orders = trading_client.get_orders(open_orders_request)
    strategy_open_orders = [o for o in open_orders if o.client_order_id and strategy_id in o.client_order_id]

    # Example: Place buy order if price drops to a buy grid level and no open buy order exists
    # and if TI signals are favorable or not enabled
    if current_price < lower_price_limit + (upper_price_limit - lower_price_limit) / (number_of_grids * 2) and (buy_signal_ti or not technical_indicators_config):
        # Check if there's already an open buy order near this level
        buy_order_exists = any(o.side == OrderSide.BUY for o in strategy_open_orders)
        if not buy_order_exists:
            try:
                order_request = LimitOrderRequest(
                    symbol=symbol,
                    qty=quantity_per_grid,
                    side=OrderSide.BUY,
                    limit_price=round(current_price * 0.99, 2), # Place slightly below current price
                    time_in_force=TimeInForce.GTC,
                    client_order_id=f"grid-buy-{strategy_id}-{uuid4().hex[:8]}"
                )
                order = trading_client.submit_order(order_request)
                action = "buy"
                reason = "Price near lower grid boundary, placed buy order"
                order_details = {"order_id": str(order.id), "symbol": order.symbol, "quantity": float(order.qty), "price": float(order.limit_price)}
                logger.info(f"✅ Placed grid BUY order for {symbol} at {order.limit_price}")
            except AlpacaAPIError as e:
                logger.error(f"❌ Alpaca API error placing grid BUY order: {e}")
                action = "error"
                reason = f"Alpaca API error placing grid BUY order: {e}"
    
    # Example: Place sell order if price rises to a sell grid level and no open sell order exists
    # and if TI signals are favorable or not enabled
    elif current_price > upper_price_limit - (upper_price_limit - lower_price_limit) / (number_of_grids * 2) and (sell_signal_ti or not technical_indicators_config):
        # Check if there's already an open sell order near this level
        sell_order_exists = any(o.side == OrderSide.SELL for o in strategy_open_orders)
        if not sell_order_exists:
            try:
                order_request = LimitOrderRequest(
                    symbol=symbol,
                    qty=quantity_per_grid,
                    side=OrderSide.SELL,
                    limit_price=round(current_price * 1.01, 2), # Place slightly above current price
                    time_in_force=TimeInForce.GTC,
                    client_order_id=f"grid-sell-{strategy_id}-{uuid4().hex[:8]}"
                )
                order = trading_client.submit_order(order_request)
                action = "sell"
                reason = "Price near upper grid boundary, placed sell order"
                order_details = {"order_id": str(order.id), "symbol": order.symbol, "quantity": float(order.qty), "price": float(order.limit_price)}
                logger.info(f"✅ Placed grid SELL order for {symbol} at {order.limit_price}")
            except AlpacaAPIError as e:
                logger.error(f"❌ Alpaca API error placing grid SELL order: {e}")
                action = "error"
                reason = f"Alpaca API error placing grid SELL order: {e}"

    # --- 7. Update Telemetry Data ---
    # Calculate telemetry data
    telemetry_data = {
        "allocated_capital_usd": strategy.get("min_capital", 0),
        "allocated_capital_base": (strategy.get("min_capital", 0) / current_price) if current_price else 0,
        "active_grid_levels": len(strategy_open_orders),
        "upper_price_limit": upper_price_limit,
        "lower_price_limit": lower_price_limit,
        "current_profit_loss_usd": current_total_profit_loss_usd,
        "current_profit_loss_percent": current_profit_loss_percent,
        "grid_spacing_interval": (upper_price_limit - lower_price_limit) / number_of_grids,
        "stop_loss_price": current_price * (1 - stop_loss_percent / 100) if stop_loss_percent > 0 else None,
        "stop_loss_distance_percent": (current_price - (current_price * (1 - stop_loss_percent / 100))) / current_price * 100 if stop_loss_percent > 0 else None,
        "next_take_profit_price": current_price * (1 + take_profit_levels.get("percent", 0) / 100) if take_profit_levels else None,
        "take_profit_progress_percent": (current_profit_loss_percent / take_profit_levels.get("percent", 1)) * 100 if take_profit_levels and take_profit_levels.get("percent", 1) > 0 else None,
        "active_orders_count": len(strategy_open_orders),
        "fill_rate_percent": 0, # Placeholder
        "grid_utilization_percent": (len(strategy_open_orders) / number_of_grids) * 100 if number_of_grids > 0 else 0,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }
    
    # Update strategy in DB with new telemetry data and execution count
    supabase.table("trading_strategies").update({
        "telemetry_data": telemetry_data,
        "last_execution": datetime.now(timezone.utc).isoformat(),
        "execution_count": strategy.get("execution_count", 0) + 1,
        "total_profit_loss": current_total_profit_loss_usd, # Update total P/L
        "active_orders_count": len(strategy_open_orders),
        "grid_utilization_percent": telemetry_data["grid_utilization_percent"],
    }).eq("id", strategy_id).execute()

    return {"action": action, "symbol": symbol, "quantity": quantity_per_grid, "price": current_price, "reason": reason, "order_details": order_details}

async def execute_dca_strategy(
    strategy: Dict[str, Any],
    trading_client: TradingClient,
    stock_client: Any,
    crypto_client: Any,
    supabase: Client
) -> Dict[str, Any]:
    """Execute a single iteration of the DCA strategy"""
    logger.info(f"🤖 Executing DCA strategy: {strategy['name']}")
    # Implement DCA logic here
    return {"action": "hold", "reason": "DCA logic not fully implemented yet"}

async def execute_covered_calls_strategy(
    strategy: Dict[str, Any],
    trading_client: TradingClient,
    stock_client: Any,
    crypto_client: Any,
    supabase: Client
) -> Dict[str, Any]:
    """Execute a single iteration of the Covered Calls strategy"""
    logger.info(f"🤖 Executing Covered Calls strategy: {strategy['name']}")
    # Implement Covered Calls logic here
    return {"action": "hold", "reason": "Covered Calls logic not fully implemented yet"}

async def execute_wheel_strategy(
    strategy: Dict[str, Any],
    trading_client: TradingClient,
    stock_client: Any,
    crypto_client: Any,
    supabase: Client
) -> Dict[str, Any]:
    """Execute a single iteration of The Wheel strategy"""
    logger.info(f"🤖 Executing The Wheel strategy: {strategy['name']}")
    # Implement The Wheel logic here
    return {"action": "hold", "reason": "The Wheel logic not fully implemented yet"}

async def execute_smart_rebalance_strategy(
    strategy: Dict[str, Any],
    trading_client: TradingClient,
    stock_client: Any,
    crypto_client: Any,
    supabase: Client
) -> Dict[str, Any]:
    """Execute a single iteration of the Smart Rebalance strategy"""
    logger.info(f"🤖 Executing Smart Rebalance strategy: {strategy['name']}")
    # Implement Smart Rebalance logic here
    return {"action": "hold", "reason": "Smart Rebalance logic not fully implemented yet"}

async def update_strategy_performance(
    strategy_id: str,
    user_id: str,
    supabase: Client,
    trading_client: TradingClient
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
    total_return = total_profit_loss / 10000 # Assuming $10k initial capital for calculation
    max_drawdown = -0.05 # Mock 5% max drawdown
    
    performance_data = {
        "total_return": total_return,
        "win_rate": win_rate,
        "max_drawdown": max_drawdown,
        "sharpe_ratio": 1.2, # Mock
        "total_trades": executed_trades,
        "avg_trade_duration": 5, # Mock
    }
    
    supabase.table("trading_strategies").update({"performance": performance_data}).eq("id", strategy_id).execute()
    logger.info(f"✅ Performance updated for strategy {strategy_id}")