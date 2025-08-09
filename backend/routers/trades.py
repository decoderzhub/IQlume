from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import GetOrdersRequest, MarketOrderRequest, LimitOrderRequest
from alpaca.trading.enums import OrderSide, QueryOrderStatus, TimeInForce
from alpaca.common.exceptions import AlpacaAPIError
from supabase import Client
from ..dependencies import (
    get_current_user,
    get_supabase_client,
    get_alpaca_trading_client,
    security
)

router = APIRouter(prefix="/api", tags=["trading"])
logger = logging.getLogger(__name__)

@router.get("/portfolio")
async def get_portfolio(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    trading_client: TradingClient = Depends(get_alpaca_trading_client)
):
    """Get portfolio information"""
    try:
        # Get account info
        account = trading_client.get_account()
        
        # Get positions
        positions = trading_client.get_all_positions()
        
        # Calculate portfolio metrics
        total_value = float(account.portfolio_value)
        day_change = float(account.unrealized_pl)
        day_change_percent = (day_change / total_value * 100) if total_value > 0 else 0
        
        # Format positions
        formatted_positions = []
        for position in positions:
            formatted_positions.append({
                "symbol": position.symbol,
                "quantity": float(position.qty),
                "market_value": float(position.market_value),
                "cost_basis": float(position.cost_basis),
                "unrealized_pl": float(position.unrealized_pl),
                "unrealized_plpc": float(position.unrealized_plpc),
                "side": position.side
            })
        
        return {
            "total_value": total_value,
            "day_change": day_change,
            "day_change_percent": day_change_percent,
            "buying_power": float(account.buying_power),
            "cash": float(account.cash),
            "positions": formatted_positions,
            "account_status": account.status
        }
        
    except AlpacaAPIError as e:
        if "403" in str(e):
            raise HTTPException(
                status_code=403,
                detail="Alpaca Trading API denied. Check your API key permissions."
            )
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching portfolio: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio: {str(e)}")

@router.get("/strategies")
async def get_strategies(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get user's trading strategies"""
    try:
        response = supabase.table("trading_strategies").select("*").eq("user_id", current_user.id).execute()
        return {"strategies": response.data}
    except Exception as e:
        logger.error(f"Error fetching strategies: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch strategies: {str(e)}")

@router.get("/trades")
async def get_trades(
    limit: Optional[int] = Query(50, description="Maximum number of trades to return"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    trading_client: TradingClient = Depends(get_alpaca_trading_client)
):
    """Get user's trade history"""
    try:
        # Parse dates
        start_dt = None
        end_dt = None
        
        if start_date:
            start_dt = datetime.fromisoformat(start_date)
        if end_date:
            end_dt = datetime.fromisoformat(end_date)
        
        # Get orders from Alpaca
        orders_request = GetOrdersRequest(
            status=QueryOrderStatus.ALL,
            limit=limit,
            after=start_dt,
            until=end_dt
        )
        
        orders = trading_client.get_orders(orders_request)
        
        # Format trades
        trades = []
        total_profit_loss = 0
        executed_trades = 0
        winning_trades = 0
        
        for order in orders:
            # Calculate P&L for filled orders
            profit_loss = 0
            if order.filled_qty and order.filled_avg_price:
                # This is a simplified P&L calculation
                # In reality, you'd need to match buy/sell orders
                if order.side == OrderSide.SELL:
                    # Assume profit for sells (simplified)
                    profit_loss = float(order.filled_qty) * float(order.filled_avg_price) * 0.02  # 2% profit assumption
                
            if order.status == "filled":
                executed_trades += 1
                total_profit_loss += profit_loss
                if profit_loss > 0:
                    winning_trades += 1
            
            trades.append({
                "id": order.id,
                "strategy_id": "manual",  # Default for manual trades
                "symbol": order.symbol,
                "type": order.side.value.lower(),
                "quantity": float(order.qty),
                "price": float(order.filled_avg_price) if order.filled_avg_price else float(order.limit_price or 0),
                "timestamp": order.created_at.isoformat(),
                "profit_loss": profit_loss,
                "status": "executed" if order.status == "filled" else "pending" if order.status in ["new", "partially_filled"] else "failed"
            })
        
        # Calculate stats
        win_rate = (winning_trades / executed_trades) if executed_trades > 0 else 0
        avg_trade_duration = 1.0  # Simplified - would need more complex calculation
        
        stats = {
            "total_trades": len(trades),
            "total_profit_loss": total_profit_loss,
            "win_rate": win_rate,
            "avg_trade_duration": avg_trade_duration
        }
        
        return {
            "trades": trades,
            "stats": stats
        }
        
    except AlpacaAPIError as e:
        if "403" in str(e):
            raise HTTPException(
                status_code=403,
                detail="Alpaca Trading API denied. Check your API key permissions."
            )
        logger.error(f"Alpaca API error for trades: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch trades: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching trades: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch trades: {str(e)}")

@router.post("/execute-trade")
async def execute_trade(
    trade_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    trading_client: TradingClient = Depends(get_alpaca_trading_client)
):
    """Execute a trade"""
    try:
        symbol = trade_data.get("symbol")
        side = trade_data.get("side")  # "buy" or "sell"
        quantity = trade_data.get("quantity")
        order_type = trade_data.get("type", "market")  # "market" or "limit"
        limit_price = trade_data.get("limit_price")
        
        if not all([symbol, side, quantity]):
            raise HTTPException(status_code=400, detail="Missing required fields: symbol, side, quantity")
        
        # Convert side to OrderSide enum
        order_side = OrderSide.BUY if side.lower() == "buy" else OrderSide.SELL
        
        # Create order request
        if order_type.lower() == "limit" and limit_price:
            order_request = LimitOrderRequest(
                symbol=symbol.upper(),
                qty=float(quantity),
                side=order_side,
                time_in_force=TimeInForce.DAY,
                limit_price=float(limit_price)
            )
        else:
            order_request = MarketOrderRequest(
                symbol=symbol.upper(),
                qty=float(quantity),
                side=order_side,
                time_in_force=TimeInForce.DAY
            )
        
        # Submit order
        order = trading_client.submit_order(order_request)
        
        return {
            "order_id": order.id,
            "symbol": order.symbol,
            "side": order.side.value,
            "quantity": float(order.qty),
            "status": order.status,
            "created_at": order.created_at.isoformat()
        }
        
    except AlpacaAPIError as e:
        if "403" in str(e):
            raise HTTPException(
                status_code=403,
                detail="Alpaca Trading API denied. Check your API key permissions."
            )
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except Exception as e:
        logger.error(f"Error executing trade: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute trade: {str(e)}")