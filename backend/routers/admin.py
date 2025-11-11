"""
Admin API router for system administration and health monitoring
"""
import logging
import httpx
from typing import Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dependencies import get_current_user, get_supabase_client
from supabase import Client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])
security = HTTPBearer()

# List of API routers to check (will test basic endpoint access)
API_ROUTERS = [
    {"name": "Backend - Main", "url": "http://localhost:8000/health"},
    {"name": "Backend - Bots", "url": "http://localhost:8000/api/bots/health"},
    {"name": "Backend - Brokerage Auth", "url": "http://localhost:8000/api/alpaca/health"},
    {"name": "Backend - Chat", "url": "http://localhost:8000/api/chat/health"},
    {"name": "Backend - Grid Diagnostics", "url": "http://localhost:8000/api/grid-diagnostics/health"},
    {"name": "Backend - Grid Status", "url": "http://localhost:8000/api/grid-status/health"},
    {"name": "Backend - Market Data", "url": "http://localhost:8000/api/market-data/health"},
    {"name": "Backend - Payments", "url": "http://localhost:8000/api/payments/health"},
    {"name": "Backend - Plaid", "url": "http://localhost:8000/api/plaid/health"},
    {"name": "Backend - Positions", "url": "http://localhost:8000/api/positions/health"},
    {"name": "Backend - SSE", "url": "http://localhost:8000/api/sse/health"},
    {"name": "Backend - Strategies", "url": "http://localhost:8000/api/strategies/health"},
    {"name": "Backend - Trades", "url": "http://localhost:8000/api/health"},
]


def is_admin(email: str, supabase: Client) -> bool:
    """Check if user is an admin"""
    try:
        # Query user_profiles to check is_admin flag
        result = supabase.table("user_profiles").select("is_admin").eq("email", email).execute()

        if result.data and len(result.data) > 0:
            return result.data[0].get("is_admin", False)

        return False
    except Exception as e:
        logger.error(f"Error checking admin status: {e}")
        return False


@router.get("/check-health")
async def check_endpoint_health(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Check health of all backend endpoints and update database.
    Admin only.
    """
    # Check if user is admin
    user_email = current_user.email
    if not is_admin(user_email, supabase):
        raise HTTPException(status_code=403, detail="Admin access required")

    logger.info(f"[admin] Starting health check for {len(API_ROUTERS)} endpoints")

    results = []

    async with httpx.AsyncClient(timeout=5.0) as client:
        for endpoint_config in API_ROUTERS:
            endpoint_name = endpoint_config["name"]
            endpoint_url = endpoint_config["url"]

            try:
                start_time = datetime.now()
                response = await client.get(endpoint_url)
                end_time = datetime.now()

                response_time_ms = int((end_time - start_time).total_seconds() * 1000)
                http_status = response.status_code

                # Determine status
                if http_status == 200:
                    status = "healthy"
                    last_error = None
                elif http_status >= 500:
                    status = "down"
                    last_error = f"HTTP {http_status}"
                else:
                    status = "degraded"
                    last_error = f"HTTP {http_status}"

                logger.info(f"[admin] ✅ {endpoint_name}: {status} ({response_time_ms}ms)")

            except httpx.TimeoutException:
                status = "down"
                response_time_ms = 5000
                http_status = None
                last_error = "Request timeout"
                logger.warning(f"[admin] ⏱️ {endpoint_name}: timeout")

            except httpx.ConnectError:
                status = "down"
                response_time_ms = None
                http_status = None
                last_error = "Connection refused"
                logger.warning(f"[admin] ❌ {endpoint_name}: connection refused")

            except Exception as e:
                status = "down"
                response_time_ms = None
                http_status = None
                last_error = str(e)
                logger.error(f"[admin] ❌ {endpoint_name}: {e}")

            # Update database
            try:
                now = datetime.now(timezone.utc).isoformat()

                # Check if endpoint exists
                existing = supabase.table("endpoint_health").select("id").eq(
                    "endpoint_name", endpoint_name
                ).execute()

                health_data = {
                    "endpoint_name": endpoint_name,
                    "endpoint_url": endpoint_url,
                    "status": status,
                    "response_time_ms": response_time_ms,
                    "http_status": http_status,
                    "last_checked_at": now,
                    "last_error": last_error,
                    "updated_at": now,
                }

                if existing.data:
                    # Update existing
                    supabase.table("endpoint_health").update(health_data).eq(
                        "endpoint_name", endpoint_name
                    ).execute()
                else:
                    # Insert new
                    supabase.table("endpoint_health").insert(health_data).execute()

                results.append({
                    "endpoint_name": endpoint_name,
                    "status": status,
                    "response_time_ms": response_time_ms,
                })

            except Exception as db_error:
                logger.error(f"[admin] Database error for {endpoint_name}: {db_error}")

    # Check Supabase database connection
    try:
        supabase.table("endpoint_health").select("id").limit(1).execute()

        supabase_health = {
            "endpoint_name": "Supabase Database",
            "endpoint_url": "Database Connection",
            "status": "healthy",
            "response_time_ms": 0,
            "http_status": 200,
            "last_checked_at": datetime.now(timezone.utc).isoformat(),
            "last_error": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Check if exists
        existing = supabase.table("endpoint_health").select("id").eq(
            "endpoint_name", "Supabase Database"
        ).execute()

        if existing.data:
            supabase.table("endpoint_health").update(supabase_health).eq(
                "endpoint_name", "Supabase Database"
            ).execute()
        else:
            supabase.table("endpoint_health").insert(supabase_health).execute()

        results.append({
            "endpoint_name": "Supabase Database",
            "status": "healthy",
            "response_time_ms": 0,
        })

        logger.info("[admin] ✅ Supabase Database: healthy")

    except Exception as e:
        logger.error(f"[admin] ❌ Supabase Database: {e}")
        results.append({
            "endpoint_name": "Supabase Database",
            "status": "down",
            "response_time_ms": None,
        })

    logger.info(f"[admin] Health check complete: {len(results)} endpoints checked")

    return {
        "message": "Health check completed",
        "checked_count": len(results),
        "results": results,
    }


@router.get("/stats")
async def get_admin_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Get admin dashboard statistics.
    Admin only.
    """
    # Check if user is admin
    user_email = current_user.email
    if not is_admin(user_email, supabase):
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        # Get user counts
        users = supabase.table("user_profiles").select("id", count="exact").execute()
        total_users = users.count if users.count else 0

        # Get active strategies
        strategies = supabase.table("trading_strategies").select("id", count="exact").eq(
            "is_active", True
        ).execute()
        active_strategies = strategies.count if strategies.count else 0

        # Get total trades
        trades = supabase.table("trades").select("id", count="exact").execute()
        total_trades = trades.count if trades.count else 0

        # Get connected accounts
        accounts = supabase.table("brokerage_accounts").select("id", count="exact").eq(
            "is_connected", True
        ).execute()
        connected_accounts = accounts.count if accounts.count else 0

        return {
            "total_users": total_users,
            "active_strategies": active_strategies,
            "total_trades": total_trades,
            "connected_accounts": connected_accounts,
        }

    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
