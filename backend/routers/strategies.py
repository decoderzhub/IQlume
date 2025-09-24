from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging
import json
import asyncio
from uuid import uuid4

from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.data.historical import StockHistoricalDataClient, CryptoHistoricalDataClient
from alpaca.data.requests import StockLatestQuoteRequest, CryptoLatestQuoteRequest
from alpaca.data.enums import DataFeed
from alpaca.common.exceptions import APIError as AlpacaAPIError

from supabase import Client
from schemas import TradingStrategyCreate, TradingStrategyUpdate, TradingStrategyResponse, StrategiesListResponse
from dependencies import (
    get_current_user,
    get_supabase_client,
    get_alpaca_trading_client,
    get_alpaca_stock_data_client,
    get_alpaca_crypto_data_client,
    security,
)

router = APIRouter(prefix="/api/strategies", tags=["strategies"])
logger = logging.getLogger(__name__)

# Tradable assets with market cap data
TRADABLE_ASSETS = [
    # Large Cap Stocks
    {"symbol": "AAPL", "name": "Apple Inc.", "market_cap": 3000.0, "exchange": "NASDAQ", "asset_class": "equity"},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "market_cap": 2800.0, "exchange": "NASDAQ", "asset_class": "equity"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "market_cap": 1700.0, "exchange": "NASDAQ", "asset_class": "equity"},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "market_cap": 1500.0, "exchange": "NASDAQ", "asset_class": "equity"},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "market_cap": 1800.0, "exchange": "NASDAQ", "asset_class": "equity"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "market_cap": 800.0, "exchange": "NASDAQ", "asset_class": "equity"},
    {"symbol": "META", "name": "Meta Platforms Inc.", "market_cap": 900.0, "exchange": "NASDAQ", "asset_class": "equity"},
    {"symbol": "NFLX", "name": "Netflix Inc.", "market_cap": 200.0, "exchange": "NASDAQ", "asset_class": "equity"},
    
    # ETFs
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "market_cap": 450.0, "exchange": "NYSE", "asset_class": "equity"},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust", "market_cap": 200.0, "exchange": "NASDAQ", "asset_class": "equity"},
    {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "market_cap": 300.0, "exchange": "NYSE", "asset_class": "equity"},
    {"symbol": "IWM", "name": "iShares Russell 2000 ETF", "market_cap": 60.0, "exchange": "NYSE", "asset_class": "equity"},
    
    # Financial Stocks
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "market_cap": 500.0, "exchange": "NYSE", "asset_class": "equity"},
    {"symbol": "BAC", "name": "Bank of America Corp.", "market_cap": 300.0, "exchange": "NYSE", "asset_class": "equity"},
    {"symbol": "WFC", "name": "Wells Fargo & Company", "market_cap": 180.0, "exchange": "NYSE", "asset_class": "equity"},
    
    # Tech Stocks
    {"symbol": "ORCL", "name": "Oracle Corporation", "market_cap": 350.0, "exchange": "NYSE", "asset_class": "equity"},
    {"symbol": "CRM", "name": "Salesforce Inc.", "market_cap": 250.0, "exchange": "NYSE", "asset_class": "equity"},
    {"symbol": "ADBE", "name": "Adobe Inc.", "market_cap": 220.0, "exchange": "NASDAQ", "asset_class": "equity"},
    
    # Healthcare
    {"symbol": "JNJ", "name": "Johnson & Johnson", "market_cap": 450.0, "exchange": "NYSE", "asset_class": "equity"},
    {"symbol": "PFE", "name": "Pfizer Inc.", "market_cap": 160.0, "exchange": "NYSE", "asset_class": "equity"},
    
    # Consumer
    {"symbol": "KO", "name": "The Coca-Cola Company", "market_cap": 260.0, "exchange": "NYSE", "asset_class": "equity"},
    {"symbol": "PEP", "name": "PepsiCo Inc.", "market_cap": 240.0, "exchange": "NASDAQ", "asset_class": "equity"},
    {"symbol": "WMT", "name": "Walmart Inc.", "market_cap": 500.0, "exchange": "NYSE", "asset_class": "equity"},
    
    # Energy
    {"symbol": "XOM", "name": "Exxon Mobil Corporation", "market_cap": 400.0, "exchange": "NYSE", "asset_class": "equity"},
    {"symbol": "CVX", "name": "Chevron Corporation", "market_cap": 300.0, "exchange": "NYSE", "asset_class": "equity"},
    
    # Crypto (market cap in billions)
    {"symbol": "BTC/USD", "name": "Bitcoin", "market_cap": 1200.0, "exchange": "Crypto", "asset_class": "crypto"},
    {"symbol": "ETH/USD", "name": "Ethereum", "market_cap": 400.0, "exchange": "Crypto", "asset_class": "crypto"},
    {"symbol": "LTC/USD", "name": "Litecoin", "market_cap": 8.0, "exchange": "Crypto", "asset_class": "crypto"},
    {"symbol": "BCH/USD", "name": "Bitcoin Cash", "market_cap": 10.0, "exchange": "Crypto", "asset_class": "crypto"},
    {"symbol": "LINK/USD", "name": "Chainlink", "market_cap": 15.0, "exchange": "Crypto", "asset_class": "crypto"},
    {"symbol": "UNI/USD", "name": "Uniswap", "market_cap": 5.0, "exchange": "Crypto", "asset_class": "crypto"},
]

@router.get("/tradable-assets")
async def get_tradable_assets(
    search: Optional[str] = Query(None, description="Search term for filtering assets"),
    asset_class: Optional[str] = Query(None, description="Filter by asset class (equity, crypto)"),
    limit: Optional[int] = Query(50, description="Maximum number of assets to return"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
):
    """Get list of tradable assets with market cap data"""
    try:
        assets = TRADABLE_ASSETS.copy()
        
        # Apply search filter
        if search:
            search_lower = search.lower()
            assets = [
                asset for asset in assets
                if search_lower in asset["symbol"].lower() or search_lower in asset["name"].lower()
            ]
        
        # Apply asset class filter
        if asset_class:
            assets = [asset for asset in assets if asset["asset_class"] == asset_class.lower()]
        
        # Apply limit
        assets = assets[:limit]
        
        logger.info(f"📊 Returning {len(assets)} tradable assets (search: {search}, class: {asset_class})")
        return {"assets": assets}
        
    except Exception as e:
        logger.error(f"Error fetching tradable assets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch tradable assets: {str(e)}")

@router.get("/")
async def get_strategies(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get all trading strategies for the current user"""
    try:
        logger.info(f"📊 Fetching strategies for user {current_user.id}")
        
        resp = supabase.table("trading_strategies").select("*").eq("user_id", current_user.id).order("created_at", desc=True).execute()
        
        strategies = []
        for strategy_data in resp.data or []:
            strategy = TradingStrategyResponse(
                id=strategy_data["id"],
                user_id=strategy_data["user_id"],
                name=strategy_data["name"],
                type=strategy_data["type"],
                description=strategy_data.get("description", ""),
                risk_level=strategy_data["risk_level"],
                min_capital=float(strategy_data["min_capital"]),
                is_active=strategy_data["is_active"],
                configuration=strategy_data.get("configuration", {}),
                performance=strategy_data.get("performance"),
                created_at=datetime.fromisoformat(strategy_data["created_at"].replace('Z', '+00:00')),
                updated_at=datetime.fromisoformat(strategy_data["updated_at"].replace('Z', '+00:00')),
                
                # Universal bot fields
                account_id=strategy_data.get("account_id"),
                asset_class=strategy_data.get("asset_class"),
                base_symbol=strategy_data.get("base_symbol"),
                quote_currency=strategy_data.get("quote_currency"),
                time_horizon=strategy_data.get("time_horizon"),
                automation_level=strategy_data.get("automation_level"),
                capital_allocation=strategy_data.get("capital_allocation", {}),
                position_sizing=strategy_data.get("position_sizing", {}),
                trade_window=strategy_data.get("trade_window", {}),
                order_execution=strategy_data.get("order_execution", {}),
                risk_controls=strategy_data.get("risk_controls", {}),
                data_filters=strategy_data.get("data_filters", {}),
                notifications=strategy_data.get("notifications", {}),
                backtest_mode=strategy_data.get("backtest_mode"),
                backtest_params=strategy_data.get("backtest_params", {}),
                telemetry_id=strategy_data.get("telemetry_id"),
            )
            strategies.append(strategy)
        
        logger.info(f"✅ Found {len(strategies)} strategies for user {current_user.id}")
        return StrategiesListResponse(strategies=strategies)
        
    except Exception as e:
        logger.error(f"Error fetching strategies: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch strategies: {str(e)}")

@router.post("/")
async def create_strategy(
    strategy_data: TradingStrategyCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new trading strategy"""
    try:
        logger.info(f"📝 Creating strategy for user {current_user.id}: {strategy_data.name}")
        
        # Prepare strategy data for database
        strategy_dict = {
            "user_id": current_user.id,
            "name": strategy_data.name,
            "type": strategy_data.type,
            "description": strategy_data.description or "",
            "risk_level": strategy_data.risk_level,
            "min_capital": float(strategy_data.min_capital),
            "is_active": strategy_data.is_active,
            "configuration": strategy_data.configuration,
            "performance": strategy_data.performance,
            
            # Universal bot fields
            "account_id": strategy_data.account_id,
            "asset_class": strategy_data.asset_class,
            "base_symbol": strategy_data.base_symbol,
            "quote_currency": strategy_data.quote_currency,
            "time_horizon": strategy_data.time_horizon,
            "automation_level": strategy_data.automation_level,
            "capital_allocation": strategy_data.capital_allocation,
            "position_sizing": strategy_data.position_sizing,
            "trade_window": strategy_data.trade_window,
            "order_execution": strategy_data.order_execution,
            "risk_controls": strategy_data.risk_controls,
            "data_filters": strategy_data.data_filters,
            "notifications": strategy_data.notifications,
            "backtest_mode": strategy_data.backtest_mode,
            "backtest_params": strategy_data.backtest_params,
            "telemetry_id": strategy_data.telemetry_id,
        }
        
        resp = supabase.table("trading_strategies").insert(strategy_dict).execute()
        
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to create strategy")
        
        created_strategy = resp.data[0]
        logger.info(f"✅ Strategy created successfully: {created_strategy['id']}")
        
        return TradingStrategyResponse(
            id=created_strategy["id"],
            user_id=created_strategy["user_id"],
            name=created_strategy["name"],
            type=created_strategy["type"],
            description=created_strategy.get("description", ""),
            risk_level=created_strategy["risk_level"],
            min_capital=float(created_strategy["min_capital"]),
            is_active=created_strategy["is_active"],
            configuration=created_strategy.get("configuration", {}),
            performance=created_strategy.get("performance"),
            created_at=datetime.fromisoformat(created_strategy["created_at"].replace('Z', '+00:00')),
            updated_at=datetime.fromisoformat(created_strategy["updated_at"].replace('Z', '+00:00')),
            
            # Universal bot fields
            account_id=created_strategy.get("account_id"),
            asset_class=created_strategy.get("asset_class"),
            base_symbol=created_strategy.get("base_symbol"),
            quote_currency=created_strategy.get("quote_currency"),
            time_horizon=created_strategy.get("time_horizon"),
            automation_level=created_strategy.get("automation_level"),
            capital_allocation=created_strategy.get("capital_allocation", {}),
            position_sizing=created_strategy.get("position_sizing", {}),
            trade_window=created_strategy.get("trade_window", {}),
            order_execution=created_strategy.get("order_execution", {}),
            risk_controls=created_strategy.get("risk_controls", {}),
            data_filters=created_strategy.get("data_filters", {}),
            notifications=created_strategy.get("notifications", {}),
            backtest_mode=created_strategy.get("backtest_mode"),
            backtest_params=created_strategy.get("backtest_params", {}),
            telemetry_id=created_strategy.get("telemetry_id"),
        )
        
    except Exception as e:
        logger.error(f"Error creating strategy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create strategy: {str(e)}")

@router.get("/{strategy_id}")
async def get_strategy(
    strategy_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get a specific trading strategy"""
    try:
        resp = supabase.table("trading_strategies").select("*").eq("id", strategy_id).eq("user_id", current_user.id).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        strategy_data = resp.data[0]
        return TradingStrategyResponse(
            id=strategy_data["id"],
            user_id=strategy_data["user_id"],
            name=strategy_data["name"],
            type=strategy_data["type"],
            description=strategy_data.get("description", ""),
            risk_level=strategy_data["risk_level"],
            min_capital=float(strategy_data["min_capital"]),
            is_active=strategy_data["is_active"],
            configuration=strategy_data.get("configuration", {}),
            performance=strategy_data.get("performance"),
            created_at=datetime.fromisoformat(strategy_data["created_at"].replace('Z', '+00:00')),
            updated_at=datetime.fromisoformat(strategy_data["updated_at"].replace('Z', '+00:00')),
            
            # Universal bot fields
            account_id=strategy_data.get("account_id"),
            asset_class=strategy_data.get("asset_class"),
            base_symbol=strategy_data.get("base_symbol"),
            quote_currency=strategy_data.get("quote_currency"),
            time_horizon=strategy_data.get("time_horizon"),
            automation_level=strategy_data.get("automation_level"),
            capital_allocation=strategy_data.get("capital_allocation", {}),
            position_sizing=strategy_data.get("position_sizing", {}),
            trade_window=strategy_data.get("trade_window", {}),
            order_execution=strategy_data.get("order_execution", {}),
            risk_controls=strategy_data.get("risk_controls", {}),
            data_filters=strategy_data.get("data_filters", {}),
            notifications=strategy_data.get("notifications", {}),
            backtest_mode=strategy_data.get("backtest_mode"),
            backtest_params=strategy_data.get("backtest_params", {}),
            telemetry_id=strategy_data.get("telemetry_id"),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching strategy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch strategy: {str(e)}")

@router.put("/{strategy_id}")
async def update_strategy(
    strategy_id: str,
    strategy_update: TradingStrategyUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Update a trading strategy"""
    try:
        logger.info(f"📝 Updating strategy {strategy_id} for user {current_user.id}")
        
        # Build update dictionary with only non-None values
        update_data = {}
        for field, value in strategy_update.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        # Always update the timestamp
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        resp = supabase.table("trading_strategies").update(update_data).eq("id", strategy_id).eq("user_id", current_user.id).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        updated_strategy = resp.data[0]
        logger.info(f"✅ Strategy updated successfully: {strategy_id}")
        
        return TradingStrategyResponse(
            id=updated_strategy["id"],
            user_id=updated_strategy["user_id"],
            name=updated_strategy["name"],
            type=updated_strategy["type"],
            description=updated_strategy.get("description", ""),
            risk_level=updated_strategy["risk_level"],
            min_capital=float(updated_strategy["min_capital"]),
            is_active=updated_strategy["is_active"],
            configuration=updated_strategy.get("configuration", {}),
            performance=updated_strategy.get("performance"),
            created_at=datetime.fromisoformat(updated_strategy["created_at"].replace('Z', '+00:00')),
            updated_at=datetime.fromisoformat(updated_strategy["updated_at"].replace('Z', '+00:00')),
            
            # Universal bot fields
            account_id=updated_strategy.get("account_id"),
            asset_class=updated_strategy.get("asset_class"),
            base_symbol=updated_strategy.get("base_symbol"),
            quote_currency=updated_strategy.get("quote_currency"),
            time_horizon=updated_strategy.get("time_horizon"),
            automation_level=updated_strategy.get("automation_level"),
            capital_allocation=updated_strategy.get("capital_allocation", {}),
            position_sizing=updated_strategy.get("position_sizing", {}),
            trade_window=updated_strategy.get("trade_window", {}),
            order_execution=updated_strategy.get("order_execution", {}),
            risk_controls=updated_strategy.get("risk_controls", {}),
            data_filters=updated_strategy.get("data_filters", {}),
            notifications=updated_strategy.get("notifications", {}),
            backtest_mode=updated_strategy.get("backtest_mode"),
            backtest_params=updated_strategy.get("backtest_params", {}),
            telemetry_id=updated_strategy.get("telemetry_id"),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating strategy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update strategy: {str(e)}")

@router.delete("/{strategy_id}")
async def delete_strategy(
    strategy_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Delete a trading strategy"""
    try:
        logger.info(f"🗑️ Deleting strategy {strategy_id} for user {current_user.id}")
        
        resp = supabase.table("trading_strategies").delete().eq("id", strategy_id).eq("user_id", current_user.id).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        logger.info(f"✅ Strategy deleted successfully: {strategy_id}")
        return {"message": "Strategy deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting strategy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete strategy: {str(e)}")

@router.post("/{strategy_id}/execute")
async def execute_strategy(
    strategy_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Execute a single iteration of a trading strategy"""
    try:
        logger.info(f"🤖 Executing strategy {strategy_id} for user {current_user.id}")
        
        # Get strategy from database
        resp = supabase.table("trading_strategies").select("*").eq("id", strategy_id).eq("user_id", current_user.id).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        strategy = resp.data[0]
        
        if not strategy["is_active"]:
            raise HTTPException(status_code=400, detail="Strategy is not active")
        
        # Get trading clients
        trading_client = await get_alpaca_trading_client(current_user, supabase)
        stock_client = get_alpaca_stock_data_client()
        crypto_client = get_alpaca_crypto_data_client()
        
        # Execute strategy based on type
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
            result = {
                "action": "hold",
                "reason": f"Strategy type {strategy['type']} not implemented for manual execution"
            }
        
        logger.info(f"📊 Strategy execution result: {result}")
        return {
            "message": f"Strategy {strategy['name']} executed successfully",
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing strategy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute strategy: {str(e)}")

# Strategy execution functions
async def execute_spot_grid_strategy(strategy, trading_client, stock_client, crypto_client, supabase):
    """Execute spot grid trading strategy"""
    try:
        symbol = strategy["configuration"].get("symbol", "BTC/USD")
        allocated_capital = strategy["configuration"].get("allocated_capital", 1000)
        price_range_lower = strategy["configuration"].get("price_range_lower", 0)
        price_range_upper = strategy["configuration"].get("price_range_upper", 0)
        number_of_grids = strategy["configuration"].get("number_of_grids", 20)
        
        logger.info(f"🤖 [GRID] Executing spot grid for {symbol} with {number_of_grids} grids")
        
        # Get current price
        current_price = 50000  # Fallback price
        try:
            if "/" in symbol:  # Crypto
                from alpaca.data.requests import CryptoLatestQuoteRequest
                req = CryptoLatestQuoteRequest(symbol_or_symbols=[symbol])
                resp = crypto_client.get_crypto_latest_quote(req)
                quote = resp.get(symbol)
                if quote and hasattr(quote, 'ask_price') and quote.ask_price:
                    current_price = float(quote.ask_price)
            else:  # Stock
                from alpaca.data.requests import StockLatestQuoteRequest
                req = StockLatestQuoteRequest(symbol_or_symbols=[symbol], feed=DataFeed.IEX)
                resp = stock_client.get_stock_latest_quote(req)
                quote = resp.get(symbol)
                if quote and hasattr(quote, 'ask_price') and quote.ask_price:
                    current_price = float(quote.ask_price)
        except Exception as e:
            logger.warning(f"Could not fetch real price for {symbol}: {e}")
        
        # Auto-configure grid range if not set
        if price_range_lower == 0 or price_range_upper == 0:
            price_range_lower = current_price * 0.9  # 10% below
            price_range_upper = current_price * 1.1   # 10% above
            
            # Update strategy configuration
            updated_config = strategy["configuration"].copy()
            updated_config["price_range_lower"] = price_range_lower
            updated_config["price_range_upper"] = price_range_upper
            
            supabase.table("trading_strategies").update({
                "configuration": updated_config
            }).eq("id", strategy["id"]).execute()
        
        # Grid trading logic
        grid_spacing = (price_range_upper - price_range_lower) / number_of_grids
        
        if current_price < price_range_lower:
            # Price below range - BUY
            buy_quantity = allocated_capital * 0.05 / current_price  # 5% of capital
            
            # Submit order to Alpaca
            try:
                # Convert crypto symbol for Alpaca if needed
                alpaca_symbol = symbol.replace("/", "") if "/" in symbol else symbol
                
                order_request = MarketOrderRequest(
                    symbol=alpaca_symbol,
                    qty=buy_quantity,
                    side=OrderSide.BUY,
                    time_in_force=TimeInForce.GTC if "/" in symbol else TimeInForce.DAY,
                    client_order_id=f"{strategy['id']}-{uuid4().hex[:8]}"
                )
                
                order = trading_client.submit_order(order_request)
                alpaca_order_id = str(order.id)
                
                # Record trade in Supabase
                trade_record = {
                    "user_id": strategy["user_id"],
                    "strategy_id": strategy["id"],
                    "alpaca_order_id": alpaca_order_id,
                    "symbol": symbol,
                    "type": "buy",
                    "quantity": buy_quantity,
                    "price": current_price,
                    "status": "pending",
                    "order_type": "market",
                    "time_in_force": "day",
                    "filled_qty": 0,
                    "filled_avg_price": 0,
                    "commission": 0,
                    "fees": 0,
                }
                
                supabase.table("trades").insert(trade_record).execute()
                logger.info(f"✅ [GRID] BUY order submitted and recorded: {alpaca_order_id}")
                
                return {
                    "action": "buy",
                    "symbol": symbol,
                    "quantity": buy_quantity,
                    "price": current_price,
                    "alpaca_order_id": alpaca_order_id,
                    "reason": f"Price ${current_price:.2f} below grid range, buying"
                }
                
            except AlpacaAPIError as e:
                logger.error(f"❌ [GRID] Failed to submit BUY order: {e}")
                return {
                    "action": "error",
                    "reason": f"Failed to submit buy order: {str(e)}"
                }
                
        elif current_price > price_range_upper:
            # Price above range - SELL
            sell_quantity = allocated_capital * 0.05 / current_price  # 5% of capital
            
            # Submit order to Alpaca
            try:
                # Convert crypto symbol for Alpaca if needed
                alpaca_symbol = symbol.replace("/", "") if "/" in symbol else symbol
                
                order_request = MarketOrderRequest(
                    symbol=alpaca_symbol,
                    qty=sell_quantity,
                    side=OrderSide.SELL,
                    time_in_force=TimeInForce.GTC if "/" in symbol else TimeInForce.DAY,
                    client_order_id=f"{strategy['id']}-{uuid4().hex[:8]}"
                )
                
                order = trading_client.submit_order(order_request)
                alpaca_order_id = str(order.id)
                
                # Record trade in Supabase
                trade_record = {
                    "user_id": strategy["user_id"],
                    "strategy_id": strategy["id"],
                    "alpaca_order_id": alpaca_order_id,
                    "symbol": symbol,
                    "type": "sell",
                    "quantity": sell_quantity,
                    "price": current_price,
                    "status": "pending",
                    "order_type": "market",
                    "time_in_force": "day",
                    "filled_qty": 0,
                    "filled_avg_price": 0,
                    "commission": 0,
                    "fees": 0,
                }
                
                supabase.table("trades").insert(trade_record).execute()
                logger.info(f"✅ [GRID] SELL order submitted and recorded: {alpaca_order_id}")
                
                return {
                    "action": "sell",
                    "symbol": symbol,
                    "quantity": sell_quantity,
                    "price": current_price,
                    "alpaca_order_id": alpaca_order_id,
                    "reason": f"Price ${current_price:.2f} above grid range, selling"
                }
                
            except AlpacaAPIError as e:
                logger.error(f"❌ [GRID] Failed to submit SELL order: {e}")
                return {
                    "action": "error",
                    "reason": f"Failed to submit sell order: {str(e)}"
                }
                
        else:
            # Price in range - HOLD
            return {
                "action": "hold",
                "symbol": symbol,
                "price": current_price,
                "reason": f"Price ${current_price:.2f} within grid range ${price_range_lower:.2f}-${price_range_upper:.2f}"
            }
            
    except Exception as e:
        logger.error(f"Error in spot grid strategy: {e}")
        return {
            "action": "error",
            "reason": f"Strategy execution error: {str(e)}"
        }

async def execute_dca_strategy(strategy, trading_client, stock_client, crypto_client, supabase):
    """Execute DCA (Dollar Cost Averaging) strategy"""
    try:
        symbol = strategy["configuration"].get("symbol", "BTC/USD")
        investment_amount = strategy["configuration"].get("investment_amount_per_interval", 100)
        
        logger.info(f"🤖 [DCA] Executing DCA for {symbol} with ${investment_amount}")
        
        # Get current price
        current_price = 50000  # Fallback
        try:
            if "/" in symbol:  # Crypto
                from alpaca.data.requests import CryptoLatestQuoteRequest
                req = CryptoLatestQuoteRequest(symbol_or_symbols=[symbol])
                resp = crypto_client.get_crypto_latest_quote(req)
                quote = resp.get(symbol)
                if quote and hasattr(quote, 'ask_price') and quote.ask_price:
                    current_price = float(quote.ask_price)
        except Exception as e:
            logger.warning(f"Could not fetch real price for {symbol}: {e}")
        
        # DCA always buys
        buy_quantity = investment_amount / current_price
        
        # Submit order to Alpaca
        try:
            # Convert crypto symbol for Alpaca if needed
            alpaca_symbol = symbol.replace("/", "") if "/" in symbol else symbol
            
            order_request = MarketOrderRequest(
                symbol=alpaca_symbol,
                qty=buy_quantity,
                side=OrderSide.BUY,
                time_in_force=TimeInForce.GTC if "/" in symbol else TimeInForce.DAY,
                client_order_id=f"{strategy['id']}-{uuid4().hex[:8]}"
            )
            
            order = trading_client.submit_order(order_request)
            alpaca_order_id = str(order.id)
            
            # Record trade in Supabase
            trade_record = {
                "user_id": strategy["user_id"],
                "strategy_id": strategy["id"],
                "alpaca_order_id": alpaca_order_id,
                "symbol": symbol,
                "type": "buy",
                "quantity": buy_quantity,
                "price": current_price,
                "status": "pending",
                "order_type": "market",
                "time_in_force": "day",
                "filled_qty": 0,
                "filled_avg_price": 0,
                "commission": 0,
                "fees": 0,
            }
            
            supabase.table("trades").insert(trade_record).execute()
            logger.info(f"✅ [DCA] BUY order submitted and recorded: {alpaca_order_id}")
            
            return {
                "action": "buy",
                "symbol": symbol,
                "quantity": buy_quantity,
                "price": current_price,
                "alpaca_order_id": alpaca_order_id,
                "reason": f"DCA purchase of ${investment_amount}"
            }
            
        except AlpacaAPIError as e:
            logger.error(f"❌ [DCA] Failed to submit BUY order: {e}")
            return {
                "action": "error",
                "reason": f"Failed to submit buy order: {str(e)}"
            }
        
    except Exception as e:
        logger.error(f"Error in DCA strategy: {e}")
        return {
            "action": "error",
            "reason": f"Strategy execution error: {str(e)}"
        }

async def execute_covered_calls_strategy(strategy, trading_client, stock_client, crypto_client, supabase):
    """Execute covered calls strategy"""
    try:
        symbol = strategy["configuration"].get("symbol", "AAPL")
        position_size = strategy["configuration"].get("position_size", 100)
        
        logger.info(f"🤖 [COVERED_CALLS] Executing covered calls for {symbol}")
        
        # For demo purposes, simulate selling a call option (no actual Alpaca order)
        mock_alpaca_order_id = f"mock_cc_{uuid4().hex[:8]}"
        premium_received = 250  # Mock premium
        
        # Record trade in Supabase
        trade_record = {
            "user_id": strategy["user_id"],
            "strategy_id": strategy["id"],
            "alpaca_order_id": mock_alpaca_order_id,
            "symbol": f"{symbol}_CALL",
            "type": "sell",
            "quantity": 1,  # 1 contract = 100 shares
            "price": premium_received,
            "status": "executed",  # Mock as executed for demo
            "order_type": "market",
            "time_in_force": "day",
            "filled_qty": 1,
            "filled_avg_price": premium_received,
            "commission": 0.65,  # Typical options commission
            "fees": 0,
        }
        
        supabase.table("trades").insert(trade_record).execute()
        logger.info(f"✅ [COVERED_CALLS] Mock option trade recorded: {mock_alpaca_order_id}")
        
        return {
            "action": "sell",
            "symbol": f"{symbol}_CALL",
            "quantity": 1,
            "price": premium_received,
            "alpaca_order_id": mock_alpaca_order_id,
            "reason": f"Sold covered call on {position_size} shares of {symbol}"
        }
        
    except Exception as e:
        logger.error(f"Error in covered calls strategy: {e}")
        return {
            "action": "error",
            "reason": f"Strategy execution error: {str(e)}"
        }

async def execute_wheel_strategy(strategy, trading_client, stock_client, crypto_client, supabase):
    """Execute wheel strategy"""
    try:
        symbol = strategy["configuration"].get("symbol", "AAPL")
        
        logger.info(f"🤖 [WHEEL] Executing wheel strategy for {symbol}")
        
        # For demo purposes, simulate selling a cash-secured put (no actual Alpaca order)
        mock_alpaca_order_id = f"mock_wheel_{uuid4().hex[:8]}"
        premium_received = 180  # Mock premium
        
        # Record trade in Supabase
        trade_record = {
            "user_id": strategy["user_id"],
            "strategy_id": strategy["id"],
            "alpaca_order_id": mock_alpaca_order_id,
            "symbol": f"{symbol}_PUT",
            "type": "sell",
            "quantity": 1,  # 1 contract = 100 shares
            "price": premium_received,
            "status": "executed",  # Mock as executed for demo
            "order_type": "market",
            "time_in_force": "day",
            "filled_qty": 1,
            "filled_avg_price": premium_received,
            "commission": 0.65,  # Typical options commission
            "fees": 0,
        }
        
        supabase.table("trades").insert(trade_record).execute()
        logger.info(f"✅ [WHEEL] Mock option trade recorded: {mock_alpaca_order_id}")
        
        return {
            "action": "sell",
            "symbol": f"{symbol}_PUT",
            "quantity": 1,
            "price": premium_received,
            "alpaca_order_id": mock_alpaca_order_id,
            "reason": f"Sold cash-secured put for {symbol} wheel strategy"
        }
        
    except Exception as e:
        logger.error(f"Error in wheel strategy: {e}")
        return {
            "action": "error",
            "reason": f"Strategy execution error: {str(e)}"
        }

async def execute_smart_rebalance_strategy(strategy, trading_client, stock_client, crypto_client, supabase):
    """Execute smart rebalance strategy"""
    try:
        assets = strategy["configuration"].get("assets", [])
        allocated_capital = strategy["configuration"].get("allocated_capital", 10000)
        
        logger.info(f"🤖 [REBALANCE] Executing smart rebalance with ${allocated_capital}")
        
        if not assets:
            return {
                "action": "hold",
                "reason": "No assets configured for rebalancing"
            }
        
        # For demo purposes, simulate rebalancing the first asset
        first_asset = assets[0]
        target_allocation = first_asset.get("allocation", 0) / 100
        target_value = allocated_capital * target_allocation
        
        rebalance_symbol = first_asset.get("symbol", "AAPL")
        assumed_price = 150  # Assume $150 per share for demo
        rebalance_quantity = target_value / assumed_price
        
        # Submit order to Alpaca
        try:
            order_request = MarketOrderRequest(
                symbol=rebalance_symbol,
                qty=rebalance_quantity,
                side=OrderSide.BUY,
                time_in_force=TimeInForce.GTC if "/" in rebalance_symbol else TimeInForce.DAY,
                client_order_id=f"{strategy['id']}-{uuid4().hex[:8]}"
            )
            
            order = trading_client.submit_order(order_request)
            alpaca_order_id = str(order.id)
            
            # Record trade in Supabase
            trade_record = {
                "user_id": strategy["user_id"],
                "strategy_id": strategy["id"],
                "alpaca_order_id": alpaca_order_id,
                "symbol": rebalance_symbol,
                "type": "buy",
                "quantity": rebalance_quantity,
                "price": assumed_price,
                "status": "pending",
                "order_type": "market",
                "time_in_force": "day",
                "filled_qty": 0,
                "filled_avg_price": 0,
                "commission": 0,
                "fees": 0,
            }
            
            supabase.table("trades").insert(trade_record).execute()
            logger.info(f"✅ [REBALANCE] BUY order submitted and recorded: {alpaca_order_id}")
            
            return {
                "action": "buy",
                "symbol": rebalance_symbol,
                "quantity": rebalance_quantity,
                "price": assumed_price,
                "alpaca_order_id": alpaca_order_id,
                "reason": f"Rebalancing to {first_asset.get('allocation', 0)}% allocation"
            }
            
        except AlpacaAPIError as e:
            logger.error(f"❌ [REBALANCE] Failed to submit BUY order: {e}")
            return {
                "action": "error",
                "reason": f"Failed to submit buy order: {str(e)}"
            }
        
    except Exception as e:
        logger.error(f"Error in smart rebalance strategy: {e}")
        return {
            "action": "error",
            "reason": f"Strategy execution error: {str(e)}"
        }

async def update_strategy_performance(strategy_id: str, user_id: str, supabase: Client, trading_client: TradingClient):
    """Update strategy performance metrics after trade execution"""
    try:
        # This would calculate actual performance metrics
        # For now, we'll just log that performance would be updated
        logger.info(f"📊 Would update performance for strategy {strategy_id}")
        
    except Exception as e:
        logger.error(f"Error updating strategy performance: {e}")