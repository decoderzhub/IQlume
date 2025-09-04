# routers/trades.py
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging

from alpaca.trading.client import TradingClient
from alpaca.trading.requests import GetOrdersRequest, MarketOrderRequest, LimitOrderRequest
from alpaca.trading.enums import (
    OrderSide,
    QueryOrderStatus,
    TimeInForce,
    OrderStatus,
)
from alpaca.common.exceptions import APIError as AlpacaAPIError

from supabase import Client
from dependencies import (
    get_current_user,
    get_supabase_client,
    get_alpaca_trading_client,
    security,
)

router = APIRouter(prefix="/api", tags=["trading"])
logger = logging.getLogger(__name__)


@router.get("/portfolio")
async def get_portfolio(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get portfolio information"""
    try:
        trading_client = await get_alpaca_trading_client(current_user, supabase)
        account = trading_client.get_account()
        positions = trading_client.get_all_positions()

        total_value = float(account.portfolio_value or 0)
        day_change = float(account.unrealized_pl or 0)
        day_change_percent = (day_change / total_value * 100) if total_value > 0 else 0

        formatted_positions = []
        for p in positions or []:
            formatted_positions.append(
                {
                    "symbol": p.symbol,
                    "quantity": float(p.qty or 0),
                    "market_value": float(p.market_value or 0),
                    "cost_basis": float(p.cost_basis or 0),
                    "unrealized_pl": float(p.unrealized_pl or 0),
                    "unrealized_plpc": float(p.unrealized_plpc or 0),
                    "side": str(p.side),
                }
            )

        return {
            "total_value": total_value,
            "day_change": day_change,
            "day_change_percent": day_change_percent,
            "buying_power": float(account.buying_power or 0),
            "cash": float(account.cash or 0),
            "positions": formatted_positions,
            "account_status": str(account.status),
        }

    except AlpacaAPIError as e:
        if "403" in str(e):
            raise HTTPException(
                status_code=403,
                detail="Alpaca Trading API denied. Check your API key permissions.",
            )
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except Exception as e:
        logger.error("Error fetching portfolio", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio: {str(e)}")


@router.get("/strategies")
async def get_strategies(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get user's trading strategies"""
    try:
        resp = (
            supabase.table("trading_strategies")
            .select("*")
            .eq("user_id", current_user.id)
            .execute()
        )
        return {"strategies": resp.data}
    except Exception as e:
        logger.error("Error fetching strategies", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch strategies: {str(e)}")


@router.get("/trades")
async def get_trades(
    limit: Optional[int] = Query(50, description="Maximum number of trades to return"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get user's trade history"""
    try:
        trading_client = await get_alpaca_trading_client(current_user, supabase)
        # Convert YYYY-MM-DD to UTC-aware datetimes (RFC3339)
        start_dt = None
        end_dt = None

        if start_date:
            # start of day UTC
            start_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
        if end_date:
            # end of day UTC (23:59:59.999999)
            end_dt = (
                datetime.fromisoformat(end_date)
                .replace(tzinfo=timezone.utc, hour=23, minute=59, second=59, microsecond=999999)
            )

        req_kwargs: Dict[str, Any] = {"status": QueryOrderStatus.ALL, "limit": limit}
        if start_dt:
            req_kwargs["after"] = start_dt
        if end_dt:
            req_kwargs["until"] = end_dt

        orders_request = GetOrdersRequest(**req_kwargs)
        orders = trading_client.get_orders(orders_request)

        trades: List[Dict[str, Any]] = []
        total_profit_loss = 0.0
        executed_trades = 0
        winning_trades = 0

        for order in orders or []:
            # toy P&L: +2% of notional on SELL fills
            profit_loss = 0.0
            if getattr(order, "filled_qty", None) and getattr(order, "filled_avg_price", None):
                if order.side == OrderSide.SELL:
                    profit_loss = float(order.filled_qty) * float(order.filled_avg_price) * 0.02

            if order.status == OrderStatus.FILLED:
                executed_trades += 1
                total_profit_loss += profit_loss
                if profit_loss > 0:
                    winning_trades += 1

            trades.append(
                {
                    "id": str(order.id),
                    "strategy_id": "manual",
                    "symbol": order.symbol,
                    "type": (order.side.value.lower() if hasattr(order.side, "value") else str(order.side).lower()),
                    "quantity": float(getattr(order, "qty", 0) or 0),
                    "price": float(getattr(order, "filled_avg_price", 0) or getattr(order, "limit_price", 0) or 0),
                    "timestamp": (
                        order.created_at.isoformat()
                        if getattr(order, "created_at", None)
                        else datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()
                    ),
                    "profit_loss": profit_loss,
                    "status": (
                        "executed"
                        if order.status == OrderStatus.FILLED
                        else "pending"
                        if order.status in {OrderStatus.NEW, OrderStatus.PARTIALLY_FILLED, OrderStatus.ACCEPTED}
                        else "failed"
                    ),
                }
            )

        win_rate = (winning_trades / executed_trades) if executed_trades > 0 else 0.0
        stats = {
            "total_trades": len(trades),
            "total_profit_loss": total_profit_loss,
            "win_rate": win_rate,
            "avg_trade_duration": 1.0,  # placeholder
        }

        return {"trades": trades, "stats": stats}

    except AlpacaAPIError as e:
        if "403" in str(e):
            raise HTTPException(
                status_code=403,
                detail="Alpaca Trading API denied. Check your API key permissions.",
            )
        logger.error("Alpaca API error for trades", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch trades: {str(e)}")
    except Exception as e:
        logger.error("Error fetching trades", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch trades: {str(e)}")


@router.post("/execute-trade")
async def execute_trade(
    trade_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Execute a trade"""
    try:
        trading_client = await get_alpaca_trading_client(current_user, supabase)
        symbol = trade_data.get("symbol")
        side = trade_data.get("side")  # "buy" | "sell"
        quantity = trade_data.get("quantity")
        order_type = (trade_data.get("type") or "market").lower()  # "market" | "limit"
        limit_price = trade_data.get("limit_price")

        if not all([symbol, side, quantity]):
            raise HTTPException(status_code=400, detail="Missing required fields: symbol, side, quantity")

        order_side = OrderSide.BUY if str(side).lower() == "buy" else OrderSide.SELL

        if order_type == "limit" and limit_price is not None:
            order_request = LimitOrderRequest(
                symbol=symbol.upper(),
                qty=float(quantity),
                side=order_side,
                time_in_force=TimeInForce.Day,
                limit_price=float(limit_price),
            )
        else:
            order_request = MarketOrderRequest(
                symbol=symbol.upper(),
                qty=float(quantity),
                side=order_side,
                time_in_force=TimeInForce.Day,
            )

        order = trading_client.submit_order(order_request)

        return {
            "order_id": str(order.id),
            "symbol": order.symbol,
            "side": (order.side.value if hasattr(order.side, "value") else str(order.side)).lower(),
            "quantity": float(getattr(order, "qty", 0) or 0),
            "status": str(order.status),
            "created_at": (
                order.created_at.isoformat()
                if getattr(order, "created_at", None)
                else datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()
            ),
        }

    except AlpacaAPIError as e:
        if "403" in str(e):
            raise HTTPException(
                status_code=403,
                detail="Alpaca Trading API denied. Check your API key permissions.",
            )
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except Exception as e:
        logger.error("Error executing trade", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute trade: {str(e)}")
