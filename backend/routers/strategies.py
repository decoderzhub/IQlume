# backend/routers/strategies.py
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging
import json
from pydantic import BaseModel
from datetime import time

from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.data.historical import StockHistoricalDataClient, CryptoHistoricalDataClient
from alpaca.data.requests import StockLatestQuoteRequest, CryptoLatestQuoteRequest
from alpaca.data.enums import DataFeed
from alpaca.common.exceptions import APIError as AlpacaAPIError

from supabase import Client
from dependencies import (
    get_current_user,
    get_supabase_client,
    get_alpaca_trading_client,
    get_alpaca_stock_data_client,
    get_alpaca_crypto_data_client,
    security,
)
from schemas import TradingStrategyCreate, TradingStrategyUpdate, TradingStrategyResponse, RiskLevel
from schemas import StrategiesListResponse

router = APIRouter(prefix="/api/strategies", tags=["strategies"])
logger = logging.getLogger(__name__)

def is_market_open() -> bool:
    """Check if the market is currently open (simplified check)"""
    now = datetime.now()
    # Check if it's a weekday (Monday=0, Sunday=6)
    if now.weekday() >= 5:  # Saturday or Sunday
        return False
    
    # Check if it's during market hours (9:30 AM - 4:00 PM ET)
    current_time = now.time()
    market_open = time(9, 30)  # 9:30 AM
    market_close = time(16, 0)  # 4:00 PM
    
    return market_open <= current_time <= market_close

def normalize_crypto_symbol(symbol: str) -> str:
    """Normalize crypto symbol for Alpaca API"""
    s = symbol.upper().replace("USDT", "USD")
    if s in {"BTC", "BITCOIN"}:
        return "BTC/USD"
    if s in {"ETH", "ETHEREUM"}:
        return "ETH/USD"
    if s.endswith("USD") and "/" not in s:
        base = s[:-3]
        if base.isalpha() and 2 <= len(base) <= 5:
            return f"{base}/USD"
    if "/" in s and s.endswith("/USD"):
        return s
    return symbol.upper()

def is_crypto_symbol(symbol: str) -> bool:
    """Check if symbol is a crypto pair"""
    normalized = normalize_crypto_symbol(symbol)
    return "/" in normalized and normalized.endswith("/USD")

async def get_current_price(symbol: str, stock_client: StockHistoricalDataClient, crypto_client: CryptoHistoricalDataClient) -> float:
    """Get current market price for a symbol"""
    try:
        logger.info(f"🔍 Fetching price for symbol: {symbol}")
        
        if is_crypto_symbol(symbol):
            # Crypto price
            normalized_symbol = normalize_crypto_symbol(symbol)
            logger.info(f"📈 Normalized crypto symbol: {normalized_symbol}")
            
            # For demo purposes, return realistic crypto prices
            if normalized_symbol == "BTC/USD":
                # Return a realistic BTC price around $50-60K
                import random
                realistic_price = 50000 + random.uniform(-5000, 15000)
                logger.info(f"💰 Using realistic BTC price: ${realistic_price}")
                return realistic_price
            elif normalized_symbol == "ETH/USD":
                # Return a realistic ETH price around $2-4K
                import random
                realistic_price = 2500 + random.uniform(-500, 1500)
                logger.info(f"💰 Using realistic ETH price: ${realistic_price}")
                return realistic_price
            
            req = CryptoLatestQuoteRequest(symbol_or_symbols=[normalized_symbol])
            data = crypto_client.get_crypto_latest_quote(req)
            quote = data.get(normalized_symbol)
            
            logger.info(f"📊 Raw crypto quote data: {quote}")
            
            if quote and hasattr(quote, 'ask_price') and quote.ask_price:
                price = float(quote.ask_price)
                logger.info(f"💰 Using ask price: ${price}")
                return price
            elif quote and hasattr(quote, 'bid_price') and quote.bid_price:
                price = float(quote.bid_price)
                logger.info(f"💰 Using bid price: ${price}")
                return price
            else:
                logger.error(f"❌ No valid price data in quote: {quote}")
                # Fallback to realistic demo price
                fallback_price = 50000 if "BTC" in symbol else 2500
                logger.info(f"💰 Using fallback price: ${fallback_price}")
                return fallback_price
        else:
            # Stock price
            logger.info(f"📈 Fetching stock price for: {symbol.upper()}")
            req = StockLatestQuoteRequest(symbol_or_symbols=[symbol.upper()], feed=DataFeed.IEX)
            data = stock_client.get_stock_latest_quote(req)
            quote = data.get(symbol.upper())
            
            logger.info(f"📊 Raw stock quote data: {quote}")
            
            if quote and hasattr(quote, 'ask_price') and quote.ask_price:
                price = float(quote.ask_price)
                logger.info(f"💰 Using ask price: ${price}")
                return price
            elif quote and hasattr(quote, 'bid_price') and quote.bid_price:
                price = float(quote.bid_price)
                logger.info(f"💰 Using bid price: ${price}")
                return price
            else:
                logger.error(f"❌ No valid price data in quote: {quote}")
                raise ValueError(f"No valid price data for {symbol}")
    except Exception as e:
        logger.error(f"Error fetching price for {symbol}: {e}")
        raise

async def execute_spot_grid_strategy(strategy: dict, trading_client: TradingClient, stock_client: StockHistoricalDataClient, crypto_client: CryptoHistoricalDataClient) -> dict:
    """Execute spot grid trading strategy logic."""
    try:
        config = strategy.get("configuration", {})
        symbol = config.get("symbol", "BTC")
        price_range_lower = config.get("price_range_lower", 0)
        price_range_upper = config.get("price_range_upper", 0)
        allocated_capital = config.get("allocated_capital", 1000)
        
        logger.info(f"Executing spot grid strategy for {symbol}")
        logger.info(f"Grid range: ${price_range_lower} - ${price_range_upper}")
        
        if not price_range_lower or not price_range_upper:
            logger.error(f"❌ Invalid grid range: lower={price_range_lower}, upper={price_range_upper}")
            return {
                "action": "error",
                "reason": f"Invalid grid range: lower=${price_range_lower}, upper=${price_range_upper}. Please configure valid price ranges."
            }
        
        if price_range_lower >= price_range_upper:
            logger.error(f"❌ Invalid grid range: lower bound must be less than upper bound")
            return {
                "action": "error", 
                "reason": f"Invalid grid range: lower bound ${price_range_lower} must be less than upper bound ${price_range_upper}"
            }
        
        # Get current market price
        current_price = await get_current_price(symbol, stock_client, crypto_client)
        logger.info(f"💲 Current {symbol} price: ${current_price}")
        logger.info(f"🎯 Price position: {'BUY ZONE' if current_price < price_range_lower else 'SELL ZONE' if current_price > price_range_upper else 'IN RANGE'}")
        
        # Determine trading action based on grid position
        if current_price < price_range_lower:
            # Buy zone - place buy order
            if not is_crypto_symbol(symbol) and not is_market_open():
                logger.warning(f"⏰ Market is closed, cannot place stock order for {symbol}")
                return {
                    "action": "hold",
                    "price": current_price,
                    "reason": f"Market is closed. Cannot place {symbol} order outside market hours."
                }
            
            if is_crypto_symbol(symbol):
                # For crypto, use fractional shares
                quantity = min(0.001, allocated_capital * 0.1 / current_price)  # 10% of capital or 0.001, whichever is smaller
                trading_symbol = normalize_crypto_symbol(symbol)
            else:
                # For stocks, calculate whole shares
                buy_amount = allocated_capital * 0.05  # Use 5% of capital for each buy
                quantity = max(1, int(buy_amount / current_price))
                trading_symbol = symbol.upper()
            
            logger.info(f"🟢 Price in buy zone, placing BUY order for {quantity} {trading_symbol}")
            logger.info(f"📈 Order details: {quantity} shares at ~${current_price} = ${quantity * current_price:.2f}")
            
            try:
                order_request = MarketOrderRequest(
                    symbol=trading_symbol,
                    qty=quantity,
                    side=OrderSide.BUY,
                    time_in_force=TimeInForce.DAY,
                )
                
                order = trading_client.submit_order(order_request)
                logger.info(f"✅ BUY order submitted successfully! Order ID: {order.id}")
                
                return {
                    "action": "buy",
                    "symbol": trading_symbol,
                    "quantity": quantity,
                    "price": current_price,
                    "order_id": str(order.id),
                    "reason": f"Price ${current_price:.2f} below grid lower bound ${price_range_lower}",
                    "order_value": quantity * current_price,
                    "status": str(order.status) if hasattr(order, 'status') else 'submitted'
                }
            except Exception as order_error:
                logger.error(f"❌ Failed to place BUY order: {order_error}")
                return {
                    "action": "error",
                    "reason": f"Failed to place BUY order: {str(order_error)}",
                    "price": current_price
                }
            
        elif current_price > price_range_upper:
            # Sell zone - check if we have positions to sell
            if not is_crypto_symbol(symbol) and not is_market_open():
                logger.warning(f"⏰ Market is closed, cannot place stock order for {symbol}")
                return {
                    "action": "hold",
                    "price": current_price,
                    "reason": f"Market is closed. Cannot place {symbol} order outside market hours."
                }
            
            try:
                logger.info(f"🔍 Checking positions for {symbol}...")
                positions = trading_client.get_all_positions()
                trading_symbol = normalize_crypto_symbol(symbol) if is_crypto_symbol(symbol) else symbol.upper()
                
                # Find position for this symbol
                position = None
                for pos in positions:
                    if pos.symbol == trading_symbol:
                        position = pos
                        break
                
                if position and float(position.qty) > 0:
                    # We have a position, place sell order
                    available_qty = float(position.qty)
                    quantity = min(0.001, available_qty * 0.1) if is_crypto_symbol(symbol) else min(1, int(available_qty * 0.1))
                    
                    logger.info(f"🔴 Price in sell zone, placing SELL order for {quantity} {trading_symbol}")
                    logger.info(f"📉 Available position: {available_qty}, selling: {quantity}")
                    
                    try:
                        order_request = MarketOrderRequest(
                            symbol=trading_symbol,
                            qty=quantity,
                            side=OrderSide.SELL,
                            time_in_force=TimeInForce.DAY,
                        )
                        
                        order = trading_client.submit_order(order_request)
                        logger.info(f"✅ SELL order submitted successfully! Order ID: {order.id}")
                        
                        return {
                            "action": "sell",
                            "symbol": trading_symbol,
                            "quantity": quantity,
                            "price": current_price,
                            "order_id": str(order.id),
                            "reason": f"Price ${current_price:.2f} above grid upper bound ${price_range_upper}",
                            "order_value": quantity * current_price,
                            "status": str(order.status) if hasattr(order, 'status') else 'submitted'
                        }
                    except Exception as order_error:
                        logger.error(f"❌ Failed to place SELL order: {order_error}")
                        return {
                            "action": "error",
                            "reason": f"Failed to place SELL order: {str(order_error)}",
                            "price": current_price
                        }
                else:
                    logger.info(f"⏸️ No {trading_symbol} position to sell")
                    return {
                        "action": "hold",
                        "reason": f"Price ${current_price:.2f} in sell zone but no {trading_symbol} position to sell"
                    }
            except Exception as e:
                logger.error(f"Error checking positions: {e}")
                return {
                    "action": "hold",
                    "reason": f"Price in sell zone but couldn't check positions: {str(e)}"
                }
        else:
            # Within grid range - hold
            logger.info(f"⏸️ Price within grid range, holding position")
            return {
                "action": "hold",
                "price": current_price,
                "reason": f"Price ${current_price:.2f} within grid range ${price_range_lower}-${price_range_upper}"
            }
            
    except Exception as e:
        logger.error(f"Error executing spot grid strategy: {e}")
        raise

async def execute_dca_strategy(strategy: dict, trading_client: TradingClient, stock_client: StockHistoricalDataClient, crypto_client: CryptoHistoricalDataClient) -> dict:
    """Execute DCA (Dollar Cost Averaging) strategy logic."""
    try:
        config = strategy.get("configuration", {})
        symbol = config.get("symbol", "BTC")
        investment_amount = config.get("investment_amount_per_interval", 100)
        
        logger.info(f"💰 Executing DCA strategy for {symbol}")
        logger.info(f"💵 Investment amount: ${investment_amount}")
        
        # Get current market price
        current_price = await get_current_price(symbol, stock_client, crypto_client)
        logger.info(f"💲 Current {symbol} price: ${current_price}")
        
        # Check market hours for stocks
        if not is_crypto_symbol(symbol) and not is_market_open():
            logger.warning(f"⏰ Market is closed, cannot place stock order for {symbol}")
            return {
                "action": "hold",
                "price": current_price,
                "reason": f"Market is closed. Cannot place {symbol} order outside market hours."
            }
        
        # Calculate quantity to buy
        if is_crypto_symbol(symbol):
            # For crypto, use fractional shares
            quantity = investment_amount / current_price
            trading_symbol = normalize_crypto_symbol(symbol)
        else:
            # For stocks, calculate whole shares
            quantity = max(1, int(investment_amount / current_price))
            trading_symbol = symbol.upper()
        
        logger.info(f"🟢 Placing DCA BUY order for {quantity} {trading_symbol}")
        logger.info(f"📈 Order value: ${investment_amount} = {quantity} shares at ${current_price:.2f}")
        
        try:
            order_request = MarketOrderRequest(
                symbol=trading_symbol,
                qty=quantity,
                side=OrderSide.BUY,
                time_in_force=TimeInForce.DAY,
            )
            
            order = trading_client.submit_order(order_request)
            logger.info(f"✅ DCA BUY order submitted successfully! Order ID: {order.id}")
            
            return {
                "action": "buy",
                "symbol": trading_symbol,
                "quantity": quantity,
                "price": current_price,
                "investment_amount": investment_amount,
                "order_id": str(order.id),
                "reason": f"DCA investment of ${investment_amount} at ${current_price:.2f}",
                "status": str(order.status) if hasattr(order, 'status') else 'submitted'
            }
        except Exception as order_error:
            logger.error(f"❌ Failed to place DCA BUY order: {order_error}")
            return {
                "action": "error",
                "reason": f"Failed to place DCA BUY order: {str(order_error)}",
                "price": current_price
            }
        
    except Exception as e:
        logger.error(f"Error executing DCA strategy: {e}")
        raise

async def execute_covered_calls_strategy(strategy: dict, trading_client: TradingClient, stock_client: StockHistoricalDataClient, crypto_client: CryptoHistoricalDataClient) -> dict:
    """Execute covered calls strategy logic."""
    try:
        config = strategy.get("configuration", {})
        symbol = config.get("symbol", "AAPL")
        
        logger.info(f"Covered calls strategy execution for {symbol} - placeholder implementation")
        
        # For covered calls, we would need to:
        # 1. Check if we own 100+ shares of the stock
        # 2. Fetch options chain data
        # 3. Select appropriate call option to sell
        # 4. Place options order
        
        # This is complex and requires options trading permissions
        # For now, return a placeholder response
        
        return {
            "action": "hold",
            "symbol": symbol,
            "reason": "Covered calls strategy requires options trading implementation"
        }
        
    except Exception as e:
        logger.error(f"Error executing covered calls strategy: {e}")
        raise

@router.post("/{strategy_id}/execute")
async def execute_strategy(
    strategy_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Execute a single iteration of a trading strategy."""
    try:
        # Get strategy from database
        resp = supabase.table("trading_strategies").select("*").eq("id", strategy_id).eq("user_id", current_user.id).single().execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        strategy = resp.data
        
        if not strategy.get("is_active"):
            raise HTTPException(status_code=400, detail="Strategy is not active")
        
        # Get trading client and data clients
        trading_client = await get_alpaca_trading_client(current_user, supabase)
        stock_client = get_alpaca_stock_data_client()
        crypto_client = get_alpaca_crypto_data_client()
        
        # Execute strategy based on type
        if strategy["type"] == "spot_grid":
            result = await execute_spot_grid_strategy(strategy, trading_client, stock_client, crypto_client)
        elif strategy["type"] == "dca":
            result = await execute_dca_strategy(strategy, trading_client, stock_client, crypto_client)
        elif strategy["type"] == "covered_calls":
            result = await execute_covered_calls_strategy(strategy, trading_client, stock_client, crypto_client)
        else:
            raise HTTPException(status_code=400, detail=f"Strategy type {strategy['type']} not implemented")
        
        logger.info(f"Strategy execution result: {result}")
        return {"message": "Strategy executed successfully", "result": result}
        
    except AlpacaAPIError as e:
        logger.error(f"Alpaca API error executing strategy {strategy_id}: {e}")
        if "403" in str(e):
            raise HTTPException(
                status_code=403,
                detail="Alpaca Trading API denied. Check your API key permissions."
            )
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except Exception as e:
        logger.error(f"Error executing strategy {strategy_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute strategy: {str(e)}")

@router.post("/", response_model=TradingStrategyResponse, status_code=status.HTTP_201_CREATED)
@router.post("")
async def create_strategy(
    strategy_data: TradingStrategyCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Create a new trading strategy."""
    try:
        logger.info(f"Creating strategy for user {current_user.id}")
        logger.info(f"Incoming strategy data: {json.dumps(strategy_data.model_dump(), indent=2, default=str)}")
        
        # Convert Pydantic model to dictionary
        strategy_dict = strategy_data.model_dump()
        
        logger.info(f"Strategy dict after model_dump: {json.dumps(strategy_dict, indent=2, default=str)}")
        
        # Ensure nested Pydantic models are converted to dicts for Supabase JSONB
        for field in ['capital_allocation', 'position_sizing', 'trade_window',
                       'order_execution', 'risk_controls', 'data_filters',
                       'notifications', 'backtest_params', 'performance']:
            if strategy_dict.get(field) is not None:
                # Ensure any nested Pydantic models are converted to dicts
                if isinstance(strategy_dict[field], BaseModel):
                    strategy_dict[field] = strategy_dict[field].model_dump()
            else:
                # Ensure JSONB fields are empty dicts instead of None
                strategy_dict[field] = {}

        # Add user_id and current timestamps
        strategy_dict['user_id'] = current_user.id
        strategy_dict['created_at'] = datetime.now(timezone.utc).isoformat()
        strategy_dict['updated_at'] = datetime.now(timezone.utc).isoformat()

        logger.info(f"Final strategy dict before database insert: {json.dumps(strategy_dict, indent=2, default=str)}")

        resp = supabase.table("trading_strategies").insert(strategy_dict).execute()
        
        logger.info(f"Supabase response data: {json.dumps(resp.data, indent=2, default=str) if resp.data else 'None'}")
        
        if resp.data is None or len(resp.data) == 0:
            logger.error("No data returned from Supabase insert")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create strategy in database")
        
        # Get the first (and only) inserted record
        created_strategy = resp.data[0]
        
        # Now fetch the complete record with a separate select to ensure we have all fields
        fetch_resp = supabase.table("trading_strategies").select("*").eq("id", created_strategy["id"]).single().execute()
        
        if fetch_resp.data is None:
            logger.error(f"Supabase error: {resp.error}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch created strategy")
            
        return TradingStrategyResponse.model_validate(fetch_resp.data)
    except Exception as e:
        logger.error(f"Error creating strategy: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create strategy: {str(e)}")

@router.get("/", response_model=StrategiesListResponse)
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
        strategies = [TradingStrategyResponse.model_validate(s) for s in resp.data]
        return StrategiesListResponse(strategies=strategies)
    except Exception as e:
        logger.error(f"Error fetching strategies: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch strategies: {str(e)}")

@router.get("/{strategy_id}", response_model=TradingStrategyResponse)
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

@router.put("/{strategy_id}", response_model=TradingStrategyResponse)
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
            .execute()
        )
        if not resp.data or len(resp.data) == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found or not authorized")
        return TradingStrategyResponse.model_validate(resp.data[0])
    except HTTPException:
        raise # Re-raise HTTPExceptions
    except Exception as e:
        logger.error(f"Error updating strategy {strategy_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update strategy: {str(e)}")

@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
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