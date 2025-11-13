import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from supabase import Client

from dependencies import get_current_user, get_supabase_client, security
from services.coinbase_advanced_connector import CoinbaseAdvancedConnector
from services.coinbase_websocket_manager import CoinbaseWebSocketManager, CoinbaseWebSocketManagerPool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/coinbase-advanced", tags=["coinbase-advanced"])

ws_manager_pool: Optional[CoinbaseWebSocketManagerPool] = None


def get_ws_manager_pool(supabase: Client = Depends(get_supabase_client)) -> CoinbaseWebSocketManagerPool:
    """Get or create the WebSocket manager pool."""
    global ws_manager_pool
    if ws_manager_pool is None:
        ws_manager_pool = CoinbaseWebSocketManagerPool(supabase)
    return ws_manager_pool


class CDPKeysRequest(BaseModel):
    api_key: str
    private_key: str
    account_name: str


class OrderRequest(BaseModel):
    product_id: str
    side: str
    order_type: str
    size: Optional[str] = None
    quote_size: Optional[str] = None
    limit_price: Optional[str] = None
    post_only: bool = False


class WebSocketSubscribeRequest(BaseModel):
    channel: str
    product_ids: List[str]


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "coinbase_advanced"}


@router.post("/connect")
async def connect_cdp_keys(
    request: CDPKeysRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Connect a Coinbase Advanced Trade account using CDP API keys.
    """
    try:
        connector = CoinbaseAdvancedConnector(
            api_key=request.api_key,
            private_key=request.private_key
        )

        if not connector.test_connection():
            raise HTTPException(status_code=400, detail="Invalid CDP API keys or connection failed")

        accounts_data = connector.get_accounts()
        if not accounts_data:
            raise HTTPException(status_code=500, detail="Failed to fetch account data")

        total_balance_usd = 0.0
        if 'accounts' in accounts_data:
            for account in accounts_data['accounts']:
                available_balance = account.get('available_balance', {})
                value = float(available_balance.get('value', 0) or 0)
                total_balance_usd += value

        account_record = {
            "user_id": current_user.id,
            "brokerage": "coinbase_advanced",
            "account_name": request.account_name,
            "account_type": "crypto",
            "balance": total_balance_usd,
            "is_connected": True,
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "cdp_api_key": request.api_key,
            "cdp_private_key": request.private_key,
            "api_key_name": request.api_key.split('/')[-1],
            "websocket_enabled": False,
            "coinbase_advanced_metadata": {
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "api_key_format": "CDP",
                "total_accounts": len(accounts_data.get('accounts', [])) if accounts_data else 0
            }
        }

        existing = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("brokerage", "coinbase_advanced")
            .eq("api_key_name", request.api_key.split('/')[-1])
            .execute()
        )

        if existing.data:
            account_id = existing.data[0]["id"]
            logger.info(f"[coinbase_advanced] Updating existing account {account_id} for user={current_user.id}")
            supabase.table("brokerage_accounts").update(account_record).eq("id", account_id).execute()
        else:
            logger.info(f"[coinbase_advanced] Creating new account for user={current_user.id}")
            result = supabase.table("brokerage_accounts").insert(account_record).execute()
            account_id = result.data[0]["id"] if result.data else None

        return {
            "message": "Coinbase Advanced Trade account connected successfully",
            "account_id": account_id,
            "balance": total_balance_usd
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[coinbase_advanced] Error connecting account: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to connect account: {str(e)}")


@router.get("/accounts")
async def list_connected_accounts(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """List all connected Coinbase Advanced Trade accounts."""
    try:
        resp = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("brokerage", "coinbase_advanced")
            .execute()
        )
        return {"accounts": resp.data}
    except Exception as e:
        logger.exception(f"[coinbase_advanced] Error fetching accounts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")


@router.delete("/accounts/{account_id}")
async def disconnect_account(
    account_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    ws_pool: CoinbaseWebSocketManagerPool = Depends(get_ws_manager_pool),
):
    """Disconnect a Coinbase Advanced Trade account."""
    try:
        await ws_pool.remove_manager(current_user.id, account_id)

        supabase.table("brokerage_accounts").delete().eq(
            "id", account_id
        ).eq("user_id", current_user.id).execute()

        logger.info(f"[coinbase_advanced] Disconnected account {account_id} for user={current_user.id}")
        return {"message": "Account disconnected successfully"}
    except Exception as e:
        logger.exception(f"[coinbase_advanced] Error disconnecting account: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect account: {str(e)}")


@router.get("/products")
async def list_products(
    limit: int = Query(100, le=1000),
    product_type: str = Query("SPOT"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """List available trading products."""
    try:
        accounts = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("brokerage", "coinbase_advanced")
            .eq("is_connected", True)
            .limit(1)
            .execute()
        )

        if not accounts.data:
            raise HTTPException(status_code=404, detail="No connected Coinbase Advanced Trade account found")

        account = accounts.data[0]
        connector = CoinbaseAdvancedConnector(
            api_key=account["cdp_api_key"],
            private_key=account["cdp_private_key"]
        )

        products = connector.list_products(limit=limit, product_type=product_type)
        return {"products": products}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[coinbase_advanced] Error listing products: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list products: {str(e)}")


@router.get("/products/{product_id}")
async def get_product(
    product_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get details for a specific product."""
    try:
        accounts = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("brokerage", "coinbase_advanced")
            .eq("is_connected", True)
            .limit(1)
            .execute()
        )

        if not accounts.data:
            raise HTTPException(status_code=404, detail="No connected account found")

        account = accounts.data[0]
        connector = CoinbaseAdvancedConnector(
            api_key=account["cdp_api_key"],
            private_key=account["cdp_private_key"]
        )

        product = connector.get_product(product_id)
        return {"product": product}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[coinbase_advanced] Error fetching product: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch product: {str(e)}")


@router.post("/orders")
async def place_order(
    request: OrderRequest,
    account_id: str = Query(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Place a trading order."""
    try:
        account_resp = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("id", account_id)
            .eq("user_id", current_user.id)
            .execute()
        )

        if not account_resp.data:
            raise HTTPException(status_code=404, detail="Account not found")

        account = account_resp.data[0]
        connector = CoinbaseAdvancedConnector(
            api_key=account["cdp_api_key"],
            private_key=account["cdp_private_key"]
        )

        order_result = None

        if request.order_type == "market":
            if request.side == "buy":
                if not request.quote_size:
                    raise HTTPException(status_code=400, detail="quote_size required for market buy")
                order_result = connector.market_order_buy(
                    product_id=request.product_id,
                    quote_size=request.quote_size
                )
            elif request.side == "sell":
                if not request.size:
                    raise HTTPException(status_code=400, detail="size required for market sell")
                order_result = connector.market_order_sell(
                    product_id=request.product_id,
                    base_size=request.size
                )
        elif request.order_type == "limit":
            if not request.size or not request.limit_price:
                raise HTTPException(status_code=400, detail="size and limit_price required for limit orders")

            if request.side == "buy":
                order_result = connector.limit_order_buy(
                    product_id=request.product_id,
                    base_size=request.size,
                    limit_price=request.limit_price,
                    post_only=request.post_only
                )
            elif request.side == "sell":
                order_result = connector.limit_order_sell(
                    product_id=request.product_id,
                    base_size=request.size,
                    limit_price=request.limit_price,
                    post_only=request.post_only
                )

        if not order_result:
            raise HTTPException(status_code=500, detail="Order placement failed")

        order_id = order_result.get("success_response", {}).get("order_id")
        if order_id:
            supabase.table("trades").insert({
                "user_id": current_user.id,
                "account_id": account_id,
                "symbol": request.product_id,
                "side": request.side,
                "quantity": float(request.size) if request.size else 0,
                "price": float(request.limit_price) if request.limit_price else None,
                "order_type": request.order_type,
                "status": "pending",
                "coinbase_order_id": order_id,
                "executed_at": datetime.now(timezone.utc).isoformat(),
                "crypto_metadata": order_result
            }).execute()

        return {"order": order_result}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[coinbase_advanced] Error placing order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to place order: {str(e)}")


@router.get("/orders")
async def list_orders(
    account_id: str = Query(...),
    product_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """List orders."""
    try:
        account_resp = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("id", account_id)
            .eq("user_id", current_user.id)
            .execute()
        )

        if not account_resp.data:
            raise HTTPException(status_code=404, detail="Account not found")

        account = account_resp.data[0]
        connector = CoinbaseAdvancedConnector(
            api_key=account["cdp_api_key"],
            private_key=account["cdp_private_key"]
        )

        order_status = [status] if status else None
        orders = connector.list_orders(
            product_id=product_id,
            order_status=order_status,
            limit=limit
        )

        return {"orders": orders}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[coinbase_advanced] Error listing orders: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list orders: {str(e)}")


@router.post("/websocket/connect")
async def connect_websocket(
    account_id: str = Query(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    ws_pool: CoinbaseWebSocketManagerPool = Depends(get_ws_manager_pool),
):
    """Establish WebSocket connection for real-time data."""
    try:
        account_resp = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("id", account_id)
            .eq("user_id", current_user.id)
            .execute()
        )

        if not account_resp.data:
            raise HTTPException(status_code=404, detail="Account not found")

        account = account_resp.data[0]

        manager = await ws_pool.create_manager(
            user_id=current_user.id,
            account_id=account_id,
            api_key=account["cdp_api_key"],
            private_key=account["cdp_private_key"]
        )

        if not manager:
            raise HTTPException(status_code=500, detail="Failed to create WebSocket connection")

        return {"message": "WebSocket connected successfully", "account_id": account_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[coinbase_advanced] Error connecting WebSocket: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to connect WebSocket: {str(e)}")


@router.post("/websocket/subscribe")
async def subscribe_websocket(
    account_id: str,
    request: WebSocketSubscribeRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    ws_pool: CoinbaseWebSocketManagerPool = Depends(get_ws_manager_pool),
):
    """Subscribe to a WebSocket channel."""
    try:
        manager = ws_pool.get_manager(current_user.id, account_id)
        if not manager:
            raise HTTPException(status_code=404, detail="WebSocket connection not found. Connect first.")

        await manager.subscribe(request.channel, request.product_ids)

        return {
            "message": f"Subscribed to {request.channel}",
            "channel": request.channel,
            "product_ids": request.product_ids
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[coinbase_advanced] Error subscribing to WebSocket: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to subscribe: {str(e)}")


@router.get("/connection-status")
async def get_connection_status(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get connection status for Coinbase Advanced Trade accounts."""
    try:
        accounts = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("brokerage", "coinbase_advanced")
            .eq("is_connected", True)
            .execute()
        )

        return {
            "connected": len(accounts.data) > 0,
            "account_count": len(accounts.data),
            "accounts": accounts.data
        }

    except Exception as e:
        logger.exception(f"[coinbase_advanced] Error getting connection status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get connection status: {str(e)}")
