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
from uuid import uuid4
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
        logger.info(f"📊 Fetching portfolio for user {current_user.id}")
        trading_client = await get_alpaca_trading_client(current_user, supabase)
        account = trading_client.get_account()
        positions = trading_client.get_all_positions()

        logger.info(f"💼 Account status: {account.status}")
        logger.info(f"💰 Portfolio value: ${account.portfolio_value}")
        logger.info(f"💵 Buying power: ${account.buying_power}")
        logger.info(f"📈 Found {len(positions or [])} positions")

        total_value = float(account.portfolio_value or 0)
        day_change = float(account.equity or 0) - float(account.last_equity or 0)
        day_change_percent = (day_change / total_value * 100) if total_value > 0 else 0

        formatted_positions = []
        for p in positions or []:
            position_data = {
                "symbol": p.symbol,
                "quantity": float(p.qty or 0),
                "market_value": float(p.market_value or 0),
                "cost_basis": float(p.cost_basis or 0),
                "unrealized_pl": float(p.unrealized_pl or 0),
                "unrealized_plpc": float(p.unrealized_plpc or 0),
                "side": str(p.side),
                "current_price": float(p.current_price or 0) if hasattr(p, 'current_price') else 0,
            }
            formatted_positions.append(position_data)
            logger.info(f"📊 Position: {p.symbol} - {float(p.qty or 0)} shares @ ${float(p.current_price or 0):.2f}")

        portfolio_data = {
            "total_value": total_value,
            "day_change": day_change,
            "day_change_percent": day_change_percent,
            "buying_power": float(account.buying_power or 0),
            "cash": float(account.cash or 0),
            "positions": formatted_positions,
            "account_status": str(account.status),
            "equity": float(account.equity or 0),
            "last_equity": float(account.last_equity or 0),
            "multiplier": int(account.multiplier or 1),
            "portfolio_value": total_value,
        }
        
        logger.info(f"✅ Portfolio data compiled successfully")
        return portfolio_data

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


@router.get("/trades")
async def get_trades(
    limit: Optional[int] = Query(50, description="Maximum number of trades to return"),
    account_id: Optional[str] = Query(None, description="Filter trades by brokerage account ID"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get user's trade history"""
    try:
        logger.info(f"📋 Fetching trades from Supabase for user {current_user.id}")
        
        # If account_id is provided, filter trades by strategies associated with that account
        if account_id:
            logger.info(f"🔍 Filtering trades by account_id: {account_id}")
            
            # First, get strategy IDs associated with this account
            strategy_resp = supabase.table("trading_strategies").select("id").eq("user_id", current_user.id).eq("account_id", account_id).execute()
            
            strategy_ids = [s["id"] for s in (strategy_resp.data or [])]
            logger.info(f"📊 Found {len(strategy_ids)} strategies for account {account_id}")
            
            if not strategy_ids:
                # No strategies found for this account, return empty results
                logger.info(f"📭 No strategies found for account {account_id}, returning empty results")
                return {
                    "trades": [],
                    "stats": {
                        "total_trades": 0,
                        "executed_trades": 0,
                        "pending_trades": 0,
                        "failed_trades": 0,
                        "total_profit_loss": 0,
                        "win_rate": 0,
                        "avg_trade_duration": 0,
                    }
                }
            
            # Build query filtered by strategy IDs
            query = supabase.table("trades").select("*").eq("user_id", current_user.id).in_("strategy_id", strategy_ids)
        else:
            # Build Supabase query for all user trades (no account filter)
            query = supabase.table("trades").select("*").eq("user_id", current_user.id)
        
        # Apply date filters
        if start_date:
            start_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
            query = query.gte("created_at", start_dt.isoformat())
        if end_date:
            end_dt = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc, hour=23, minute=59, second=59)
            query = query.lte("created_at", end_dt.isoformat())
        
        # Apply limit and order
        query = query.order("created_at", desc=True).limit(limit)
        
        resp = query.execute()
        trades_data = resp.data or []
        
        logger.info(f"📋 Found {len(trades_data)} trades in Supabase for user {current_user.id}")
        
        # Transform Supabase data to API format
        trades: List[Dict[str, Any]] = []
        total_profit_loss = 0.0
        executed_trades = 0
        winning_trades = 0
        
        for trade_data in trades_data:
            trade = {
                "id": trade_data["id"],
                "strategy_id": trade_data.get("strategy_id", "manual"),
                "symbol": trade_data["symbol"],
                "type": trade_data["type"],
                "quantity": float(trade_data["quantity"]),
                "price": float(trade_data["price"]),
                "timestamp": trade_data["created_at"],
                "profit_loss": float(trade_data.get("profit_loss", 0)),
                "status": trade_data["status"],
                "order_type": trade_data.get("order_type", "market"),
                "time_in_force": trade_data.get("time_in_force", "day"),
                "filled_qty": float(trade_data.get("filled_qty", 0)),
                "filled_avg_price": float(trade_data.get("filled_avg_price", 0)),
                "commission": float(trade_data.get("commission", 0)),
                "fees": float(trade_data.get("fees", 0)),
                "alpaca_order_id": trade_data.get("alpaca_order_id"),
            }
            
            trades.append(trade)
            
            # Calculate stats
            if trade["status"] == "executed":
                executed_trades += 1
                total_profit_loss += trade["profit_loss"]
                if trade["profit_loss"] > 0:
                    winning_trades += 1
        
        win_rate = (winning_trades / executed_trades) if executed_trades > 0 else 0.0
        
        stats = {
            "total_trades": len(trades),
            "executed_trades": executed_trades,
            "pending_trades": len([t for t in trades if t["status"] == "pending"]),
            "failed_trades": len([t for t in trades if t["status"] == "failed"]),
            "total_profit_loss": total_profit_loss,
            "win_rate": win_rate,
            "avg_trade_duration": 1.0,  # Would calculate from actual trade data
        }
        
        logger.info(f"📊 Trade stats from Supabase: {executed_trades} executed, {win_rate:.1%} win rate, ${total_profit_loss:.2f} P&L")
        return {"trades": trades, "stats": stats}

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
                client_order_id=f"manual-{uuid4().hex[:8]}"
            )
        else:
            order_request = MarketOrderRequest(
                symbol=symbol.upper(),
                qty=float(quantity),
                side=order_side,
                time_in_force=TimeInForce.Day,
                client_order_id=f"manual-{uuid4().hex[:8]}"
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