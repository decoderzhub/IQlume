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


@router.post("/orders")
async def place_order(
    order_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Place a new order via Alpaca"""
    try:
        # Verify account context before placing order
        from dependencies import verify_alpaca_account_context
        account_context = await verify_alpaca_account_context(current_user, supabase)
        logger.info(f"📋 Placing order - Account Context: {account_context}")
        logger.info(f"📝 Placing order for user {current_user.id}: {order_data}")

        # Get the connected brokerage account for tracking
        account_resp = supabase.table("brokerage_accounts").select("id, account_name, account_number, oauth_data").eq("user_id", current_user.id).eq("brokerage", "alpaca").eq("is_connected", True).execute()

        if not account_resp.data or len(account_resp.data) == 0:
            raise HTTPException(status_code=403, detail="No Alpaca account connected. Please connect your account before trading.")

        brokerage_account = account_resp.data[0]
        brokerage_account_id = brokerage_account["id"]
        account_name = brokerage_account.get("account_name", "Unknown")
        alpaca_account_id = brokerage_account.get("oauth_data", {}).get("alpaca_account_id", brokerage_account.get("account_number", "Unknown"))

        logger.info(f"🎯 Order will be placed through: {account_name} (Alpaca ID: {alpaca_account_id}, DB ID: {brokerage_account_id})")

        # Extract order parameters
        symbol = order_data.get("symbol")
        side = order_data.get("side")  # 'buy' or 'sell'
        order_type = order_data.get("type")  # 'market', 'limit', 'stop', 'stop_limit'
        quantity = float(order_data.get("quantity", 0))
        time_in_force = order_data.get("time_in_force", "day")
        limit_price = order_data.get("limit_price")
        stop_price = order_data.get("stop_price")

        # Validation
        if not symbol or not side or not order_type or quantity <= 0:
            raise HTTPException(status_code=400, detail="Missing required order parameters")

        # Get Alpaca trading client
        trading_client = await get_alpaca_trading_client(current_user, supabase)

        # Log API mode for debugging
        is_paper = getattr(trading_client, '_paper', True)
        logger.info(f"🔌 Trading client mode: {'PAPER' if is_paper else 'LIVE'} (All Alpaca accounts are paper trading accounts)")

        # Map order side
        alpaca_side = OrderSide.BUY if side == "buy" else OrderSide.SELL

        # Map time in force
        tif_map = {
            "day": TimeInForce.DAY,
            "gtc": TimeInForce.GTC,
            "ioc": TimeInForce.IOC,
            "fok": TimeInForce.FOK,
        }
        alpaca_tif = tif_map.get(time_in_force, TimeInForce.DAY)

        # Build order request based on type
        order_request = None

        if order_type == "market":
            order_request = MarketOrderRequest(
                symbol=symbol,
                qty=quantity,
                side=alpaca_side,
                time_in_force=alpaca_tif,
            )
        elif order_type == "limit":
            if not limit_price:
                raise HTTPException(status_code=400, detail="Limit price required for limit orders")
            order_request = LimitOrderRequest(
                symbol=symbol,
                qty=quantity,
                side=alpaca_side,
                time_in_force=alpaca_tif,
                limit_price=float(limit_price),
            )
        elif order_type == "stop":
            if not stop_price:
                raise HTTPException(status_code=400, detail="Stop price required for stop orders")
            from alpaca.trading.requests import StopOrderRequest
            order_request = StopOrderRequest(
                symbol=symbol,
                qty=quantity,
                side=alpaca_side,
                time_in_force=alpaca_tif,
                stop_price=float(stop_price),
            )
        elif order_type == "stop_limit":
            if not limit_price or not stop_price:
                raise HTTPException(status_code=400, detail="Both limit and stop prices required for stop-limit orders")
            from alpaca.trading.requests import StopLimitOrderRequest
            order_request = StopLimitOrderRequest(
                symbol=symbol,
                qty=quantity,
                side=alpaca_side,
                time_in_force=alpaca_tif,
                limit_price=float(limit_price),
                stop_price=float(stop_price),
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported order type: {order_type}")

        # Submit order to Alpaca
        logger.info(f"📤 Submitting {order_type} {side} order for {quantity} {symbol} to Alpaca")
        alpaca_order = trading_client.submit_order(order_request)

        logger.info(f"✅ Order submitted successfully. Alpaca Order ID: {alpaca_order.id}")
        logger.info(f"📊 Initial order status: {alpaca_order.status}")

        # For market orders, wait briefly and check if it filled immediately
        if order_type.lower() == "market":
            import time
            time.sleep(1.5)  # Wait 1.5 seconds for market order to fill
            try:
                # Fetch updated order status
                updated_order = trading_client.get_order_by_id(alpaca_order.id)
                if updated_order.status != alpaca_order.status:
                    logger.info(f"📊 Order status updated: {alpaca_order.status} → {updated_order.status}")
                    alpaca_order = updated_order
            except Exception as status_check_error:
                logger.warning(f"⚠️ Could not check updated order status: {status_check_error}")

        # Determine appropriate price for database record
        # For limit/stop orders, use those prices; for market orders use filled price or placeholder
        if alpaca_order.filled_avg_price and float(alpaca_order.filled_avg_price) > 0:
            db_price = float(alpaca_order.filled_avg_price)
        else:
            db_price = float(limit_price or stop_price or 0.01)  # Use 0.01 as minimum to satisfy price > 0 constraint

        # Determine order status based on Alpaca response and market conditions
        # Map Alpaca status to our database status
        alpaca_status_str = str(alpaca_order.status).lower()

        if alpaca_status_str in ['new', 'accepted', 'pending_new']:
            db_status = "pending"
        elif alpaca_status_str in ['filled', 'partially_filled']:
            db_status = "executed" if alpaca_status_str == 'filled' else "pending"
        elif alpaca_status_str in ['canceled', 'expired', 'rejected']:
            db_status = "canceled"
        else:
            db_status = "pending"  # Default to pending for unknown statuses

        logger.info(f"💾 Storing order with status '{db_status}' (Alpaca status: {alpaca_status_str})")

        # Store order in database with account tracking
        trade_record = {
            "id": str(uuid4()),
            "user_id": current_user.id,
            "account_id": brokerage_account_id,  # Track which account was used
            "strategy_id": None,  # Manual order
            "symbol": symbol,
            "type": side,
            "quantity": quantity,
            "price": db_price,
            "status": db_status,
            "order_type": order_type,
            "time_in_force": time_in_force,
            "alpaca_order_id": str(alpaca_order.id),
            "filled_qty": float(alpaca_order.filled_qty or 0),
            "filled_avg_price": float(alpaca_order.filled_avg_price or 0),
        }

        supabase.table("trades").insert(trade_record).execute()
        logger.info(f"💾 Stored order in database with ID: {trade_record['id']} for account {account_name} (Alpaca: {alpaca_account_id})")
        logger.info(f"🔗 Order linkage: DB Trade ID {trade_record['id']} -> Alpaca Order ID {alpaca_order.id} -> Account {alpaca_account_id})")

        # Return order details with account info
        return {
            "success": True,
            "order_id": str(alpaca_order.id),
            "trade_id": trade_record["id"],
            "status": str(alpaca_order.status),
            "symbol": symbol,
            "side": side,
            "quantity": quantity,
            "order_type": order_type,
            "account_name": account_name,
            "alpaca_account_id": alpaca_account_id,
            "message": f"Order placed successfully in {account_name} (Alpaca: {alpaca_account_id})",
        }

    except AlpacaAPIError as e:
        logger.error(f"❌ Alpaca API error: {e}")
        raise HTTPException(status_code=500, detail=f"Alpaca API error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error placing order: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to place order: {str(e)}")


@router.get("/positions")
async def get_positions(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get all open positions from Alpaca and bot positions table"""
    try:
        logger.info(f"📊 Fetching positions for user {current_user.id}")

        # Get Alpaca positions
        alpaca_positions = []
        try:
            trading_client = await get_alpaca_trading_client(current_user, supabase)
            positions = trading_client.get_all_positions()

            for p in positions or []:
                # Calculate entry price from cost basis and quantity
                entry_price = (float(p.cost_basis or 0) / float(p.qty or 1)) if float(p.qty or 0) > 0 else 0

                position_data = {
                    "id": f"alpaca_{p.symbol}",
                    "source": "alpaca",
                    "symbol": p.symbol,
                    "quantity": float(p.qty or 0),
                    "side": str(p.side).lower(),
                    "entry_price": entry_price,
                    "current_price": float(p.current_price or 0) if hasattr(p, 'current_price') else 0,
                    "market_value": float(p.market_value or 0),
                    "cost_basis": float(p.cost_basis or 0),
                    "unrealized_pnl": float(p.unrealized_pl or 0),
                    "unrealized_pnl_percent": float(p.unrealized_plpc or 0) * 100,
                    "asset_class": str(p.asset_class) if hasattr(p, 'asset_class') else "equity",
                    "strategy_id": None,
                    "is_closed": False,
                }
                alpaca_positions.append(position_data)
                logger.info(f"📈 Alpaca position: {p.symbol} - {float(p.qty or 0)} @ ${float(p.current_price or 0):.2f}")
        except Exception as alpaca_error:
            logger.warning(f"⚠️ Could not fetch Alpaca positions: {alpaca_error}")

        # Get bot positions from database
        bot_positions = []
        try:
            resp = supabase.table("bot_positions").select("*").eq("user_id", current_user.id).eq("is_closed", False).execute()

            for bp in resp.data or []:
                position_data = {
                    "id": bp["id"],
                    "source": "bot",
                    "symbol": bp["symbol"],
                    "quantity": float(bp["quantity"]),
                    "side": bp["side"],
                    "entry_price": float(bp["entry_price"]),
                    "current_price": float(bp.get("current_price", 0)),
                    "market_value": float(bp["quantity"]) * float(bp.get("current_price", 0)),
                    "cost_basis": float(bp["quantity"]) * float(bp["entry_price"]),
                    "unrealized_pnl": float(bp.get("unrealized_pnl", 0)),
                    "unrealized_pnl_percent": float(bp.get("unrealized_pnl_percent", 0)),
                    "asset_class": bp.get("position_type", "equity"),
                    "strategy_id": bp.get("strategy_id"),
                    "is_closed": False,
                    "grid_level": bp.get("grid_level"),
                    "is_grid_position": bp.get("is_grid_position", False),
                }
                bot_positions.append(position_data)
                logger.info(f"🤖 Bot position: {bp['symbol']} - {float(bp['quantity'])} @ ${float(bp.get('current_price', 0)):.2f}")
        except Exception as bot_error:
            logger.warning(f"⚠️ Could not fetch bot positions: {bot_error}")

        # Combine positions (deduplicate by symbol if needed)
        all_positions = alpaca_positions + bot_positions

        # Calculate aggregate statistics
        total_market_value = sum(p["market_value"] for p in all_positions)
        total_unrealized_pnl = sum(p["unrealized_pnl"] for p in all_positions)
        total_cost_basis = sum(p["cost_basis"] for p in all_positions)
        avg_unrealized_pnl_percent = (total_unrealized_pnl / total_cost_basis * 100) if total_cost_basis > 0 else 0

        logger.info(f"✅ Found {len(all_positions)} total positions ({len(alpaca_positions)} Alpaca, {len(bot_positions)} bot)")

        return {
            "positions": all_positions,
            "summary": {
                "total_positions": len(all_positions),
                "total_market_value": total_market_value,
                "total_cost_basis": total_cost_basis,
                "total_unrealized_pnl": total_unrealized_pnl,
                "avg_unrealized_pnl_percent": avg_unrealized_pnl_percent,
                "alpaca_positions_count": len(alpaca_positions),
                "bot_positions_count": len(bot_positions),
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching positions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch positions: {str(e)}")


@router.get("/portfolio")
async def get_portfolio(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get portfolio information"""
    try:
        # Verify account context
        from dependencies import verify_alpaca_account_context
        account_context = await verify_alpaca_account_context(current_user, supabase)
        logger.info(f"📋 Fetching portfolio - Account Context: {account_context}")
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
        cash = float(account.cash or 0)

        formatted_positions = []
        total_positions_value = 0.0

        for p in positions or []:
            position_market_value = float(p.market_value or 0)
            total_positions_value += position_market_value

            position_data = {
                "symbol": p.symbol,
                "quantity": float(p.qty or 0),
                "market_value": position_market_value,
                "cost_basis": float(p.cost_basis or 0),
                "unrealized_pl": float(p.unrealized_pl or 0),
                "unrealized_plpc": float(p.unrealized_plpc or 0),
                "side": str(p.side),
                "current_price": float(p.current_price or 0) if hasattr(p, 'current_price') else 0,
            }
            formatted_positions.append(position_data)
            logger.info(f"📊 Position: {p.symbol} - {float(p.qty or 0)} shares @ ${float(p.current_price or 0):.2f}")

        # Calculate corrected buying power: cash minus positions value
        # This represents actual available capital for new investments without margin
        corrected_buying_power = cash - total_positions_value
        margin_buying_power = float(account.buying_power or 0)

        logger.info(f"💰 Cash: ${cash:.2f}")
        logger.info(f"📊 Total Positions Value: ${total_positions_value:.2f}")
        logger.info(f"💵 Corrected Buying Power (Cash - Positions): ${corrected_buying_power:.2f}")
        logger.info(f"🔢 Margin Buying Power (from Alpaca): ${margin_buying_power:.2f}")

        portfolio_data = {
            "total_value": total_value,
            "day_change": day_change,
            "day_change_percent": day_change_percent,
            "buying_power": corrected_buying_power,  # Use corrected calculation
            "margin_buying_power": margin_buying_power,  # Keep original for reference
            "available_cash": cash,  # Actual liquid cash
            "total_positions_value": total_positions_value,  # Total market value of positions
            "cash": cash,
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


@router.post("/positions/{position_id}/close")
async def close_position(
    position_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Close a specific position"""
    try:
        logger.info(f"📊 Closing position {position_id} for user {current_user.id}")

        # Fetch position details
        resp = supabase.table("bot_positions").select("*").eq("id", position_id).eq("user_id", current_user.id).execute()

        if not resp.data or len(resp.data) == 0:
            raise HTTPException(status_code=404, detail="Position not found")

        position = resp.data[0]

        # Get trading client
        trading_client = await get_alpaca_trading_client(current_user, supabase)

        # Create market order to close position
        side = OrderSide.SELL if position["side"] == "long" else OrderSide.BUY

        order_request = MarketOrderRequest(
            symbol=position["symbol"],
            qty=float(position["quantity"]),
            side=side,
            time_in_force=TimeInForce.DAY,
        )

        # Submit order
        alpaca_order = trading_client.submit_order(order_request)
        logger.info(f"✅ Close order submitted for position {position_id}: Alpaca Order ID {alpaca_order.id}")

        # Mark position as closed in database
        supabase.table("bot_positions").update({
            "is_closed": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", position_id).execute()

        # Record the trade
        trade_record = {
            "id": str(uuid4()),
            "user_id": current_user.id,
            "strategy_id": position.get("strategy_id"),
            "symbol": position["symbol"],
            "type": "sell" if side == OrderSide.SELL else "buy",
            "quantity": float(position["quantity"]),
            "price": float(position.get("current_price", 0)),
            "status": "pending",
            "order_type": "market",
            "time_in_force": "day",
            "alpaca_order_id": str(alpaca_order.id),
        }

        supabase.table("trades").insert(trade_record).execute()

        return {
            "success": True,
            "message": "Position close order submitted",
            "order_id": str(alpaca_order.id),
            "position_id": position_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error closing position: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to close position: {str(e)}")


@router.post("/execute-trade")
async def execute_trade(
    trade_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Execute a trade"""
    try:
        # Verify account context before executing trade
        from dependencies import verify_alpaca_account_context
        account_context = await verify_alpaca_account_context(current_user, supabase)
        logger.info(f"📋 Executing trade - Account Context: {account_context}")

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