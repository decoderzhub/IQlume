"""
Grid Bot Diagnostics Router

This module provides comprehensive diagnostic endpoints for troubleshooting
grid bot auto-trading issues.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from dependencies import get_current_user, get_supabase_client, get_alpaca_trading_client
from alpaca.trading.requests import GetOrdersRequest
from alpaca.trading.enums import QueryOrderStatus

logger = logging.getLogger(__name__)
security = HTTPBearer()
router = APIRouter(prefix="/api/grid-diagnostics", tags=["grid-diagnostics"])

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "grid_diagnostics"}

@router.get("/strategy/{strategy_id}")
async def diagnose_strategy(
    strategy_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Comprehensive diagnostic for a grid trading strategy

    Returns detailed information about strategy state, orders, execution history,
    and potential issues preventing auto-trading.
    """
    try:
        diagnostic_result = {
            "strategy_id": strategy_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": {},
            "issues": [],
            "recommendations": [],
            "status": "healthy"
        }

        # 1. Check if strategy exists and is owned by user
        strategy_resp = supabase.table("trading_strategies").select("*").eq(
            "id", strategy_id
        ).eq("user_id", current_user.id).execute()

        if not strategy_resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found or not owned by user")

        strategy = strategy_resp.data[0]
        diagnostic_result["strategy"] = {
            "name": strategy.get("name"),
            "type": strategy.get("type"),
            "is_active": strategy.get("is_active"),
            "auto_start": strategy.get("auto_start"),
            "created_at": strategy.get("created_at"),
            "configuration": strategy.get("configuration"),
        }

        # 2. Check is_active flag
        is_active = strategy.get("is_active", False)
        diagnostic_result["checks"]["is_active"] = {
            "status": "pass" if is_active else "fail",
            "value": is_active,
            "message": "Strategy is active and should be trading" if is_active else "Strategy is NOT ACTIVE - this is why it's not trading"
        }

        if not is_active:
            diagnostic_result["issues"].append({
                "severity": "critical",
                "issue": "Strategy is not active",
                "description": "The is_active flag is set to false in the database",
                "impact": "Strategy will not execute any trades until activated",
                "fix": "Activate the strategy by clicking the 'Activate' or 'Resume' button"
            })
            diagnostic_result["status"] = "critical"

        # 3. Check auto_start flag
        auto_start = strategy.get("auto_start", False)
        diagnostic_result["checks"]["auto_start"] = {
            "status": "pass" if auto_start else "warning",
            "value": auto_start,
            "message": "Auto-start is enabled" if auto_start else "Auto-start is disabled (expected for manually created strategies)"
        }

        # 4. Check telemetry data
        telemetry = strategy.get("telemetry_data", {})
        if not isinstance(telemetry, dict):
            telemetry = {}

        initial_buy_submitted = telemetry.get("initial_buy_order_submitted", False)
        initial_buy_filled = telemetry.get("initial_buy_filled", False)
        initial_buy_order_id = telemetry.get("initial_buy_alpaca_order_id")

        diagnostic_result["checks"]["initial_buy_submitted"] = {
            "status": "pass" if initial_buy_submitted else "fail",
            "value": initial_buy_submitted,
            "order_id": initial_buy_order_id,
            "message": "Initial buy order was submitted" if initial_buy_submitted else "Initial buy order has NOT been submitted yet"
        }

        diagnostic_result["checks"]["initial_buy_filled"] = {
            "status": "pass" if initial_buy_filled else ("warning" if initial_buy_submitted else "fail"),
            "value": initial_buy_filled,
            "message": "Initial buy order has filled" if initial_buy_filled else (
                "Initial buy order submitted but not yet filled - waiting..." if initial_buy_submitted else "Initial buy order not yet submitted"
            )
        }

        if not initial_buy_submitted:
            diagnostic_result["issues"].append({
                "severity": "critical",
                "issue": "Initial buy order not submitted",
                "description": "The initial market buy order has not been placed with Alpaca",
                "impact": "Grid trading cannot start until initial position is established",
                "fix": "The strategy should automatically place this order when activated. If active, check scheduler logs for errors."
            })
            if diagnostic_result["status"] != "critical":
                diagnostic_result["status"] = "error"
        elif not initial_buy_filled:
            diagnostic_result["issues"].append({
                "severity": "warning",
                "issue": "Initial buy order not filled",
                "description": f"Order {initial_buy_order_id} was submitted but hasn't filled yet",
                "impact": "Grid limit orders cannot be placed until initial buy fills",
                "fix": "Wait for market order to fill. Check Alpaca dashboard to verify order status."
            })
            if diagnostic_result["status"] == "healthy":
                diagnostic_result["status"] = "warning"

        # 5. Check grid orders in database
        grid_orders_resp = supabase.table("grid_orders").select(
            "id, alpaca_order_id, symbol, side, status, grid_level, limit_price, quantity, created_at, is_stale"
        ).eq("strategy_id", strategy_id).execute()

        grid_orders = grid_orders_resp.data or []
        active_grid_orders = [o for o in grid_orders if o["status"] in ["pending", "partially_filled"] and not o.get("is_stale", False)]
        filled_grid_orders = [o for o in grid_orders if o["status"] == "filled"]
        stale_grid_orders = [o for o in grid_orders if o.get("is_stale", False)]

        diagnostic_result["checks"]["grid_orders"] = {
            "status": "pass" if len(active_grid_orders) > 0 else ("warning" if initial_buy_filled else "fail"),
            "total_orders": len(grid_orders),
            "active_orders": len(active_grid_orders),
            "filled_orders": len(filled_grid_orders),
            "stale_orders": len(stale_grid_orders),
            "message": f"{len(active_grid_orders)} active grid orders found" if len(active_grid_orders) > 0 else "No active grid orders found"
        }

        if initial_buy_filled and len(active_grid_orders) == 0:
            diagnostic_result["issues"].append({
                "severity": "critical",
                "issue": "No grid orders after initial buy filled",
                "description": "Initial buy order filled but no grid limit orders were placed",
                "impact": "Grid trading cannot occur without limit orders at grid levels",
                "fix": "Check scheduler logs for errors during grid initialization. May need to manually trigger strategy execution."
            })
            if diagnostic_result["status"] != "critical":
                diagnostic_result["status"] = "error"

        # 6. Check trades in database
        trades_resp = supabase.table("trades").select(
            "id, symbol, type, status, quantity, price, alpaca_order_id, created_at"
        ).eq("strategy_id", strategy_id).order("created_at", desc=True).limit(10).execute()

        trades = trades_resp.data or []
        diagnostic_result["checks"]["trades"] = {
            "status": "pass" if len(trades) > 0 else "warning",
            "total_trades": len(trades),
            "recent_trades": len(trades),
            "message": f"Found {len(trades)} trade records" if len(trades) > 0 else "No trades recorded yet"
        }

        # 7. Check Alpaca account orders (if possible)
        try:
            trading_client = await get_alpaca_trading_client(current_user, supabase)

            if trading_client:
                # Get recent orders from Alpaca
                orders_request = GetOrdersRequest(
                    status=QueryOrderStatus.ALL,
                    limit=50
                )
                alpaca_orders = trading_client.get_orders(filter=orders_request)

                # Filter to this strategy's symbol
                symbol = strategy.get("configuration", {}).get("symbol", "")
                symbol_orders = [o for o in alpaca_orders if o.symbol == symbol.replace("/", "")]

                diagnostic_result["checks"]["alpaca_orders"] = {
                    "status": "pass",
                    "total_orders": len(alpaca_orders),
                    "symbol_orders": len(symbol_orders),
                    "message": f"Found {len(symbol_orders)} orders for {symbol} in Alpaca account"
                }

                # Check if initial buy order exists in Alpaca
                if initial_buy_order_id:
                    try:
                        initial_order = trading_client.get_order_by_id(initial_buy_order_id)
                        diagnostic_result["checks"]["initial_buy_alpaca_status"] = {
                            "status": "pass",
                            "order_id": initial_buy_order_id,
                            "alpaca_status": str(initial_order.status),
                            "filled_qty": float(initial_order.filled_qty or 0),
                            "message": f"Initial buy order found in Alpaca with status: {initial_order.status}"
                        }
                    except Exception as e:
                        diagnostic_result["checks"]["initial_buy_alpaca_status"] = {
                            "status": "fail",
                            "order_id": initial_buy_order_id,
                            "error": str(e),
                            "message": "Initial buy order not found in Alpaca - may have expired or been cancelled"
                        }
                        diagnostic_result["issues"].append({
                            "severity": "error",
                            "issue": "Initial buy order not found in Alpaca",
                            "description": f"Order {initial_buy_order_id} is recorded in database but not found in Alpaca",
                            "impact": "Grid cannot initialize properly",
                            "fix": "Reset strategy telemetry to allow re-submission of initial buy order"
                        })
        except Exception as alpaca_error:
            diagnostic_result["checks"]["alpaca_connection"] = {
                "status": "fail",
                "error": str(alpaca_error),
                "message": "Could not connect to Alpaca API - check account credentials"
            }
            diagnostic_result["issues"].append({
                "severity": "critical",
                "issue": "Cannot connect to Alpaca",
                "description": str(alpaca_error),
                "impact": "Cannot execute any trades or check order status",
                "fix": "Verify Alpaca account is connected and credentials are valid"
            })
            if diagnostic_result["status"] != "critical":
                diagnostic_result["status"] = "critical"

        # 8. Check configuration validity
        config = strategy.get("configuration", {})
        required_fields = ["symbol", "allocated_capital", "price_range_lower", "price_range_upper", "number_of_grids"]
        missing_fields = [f for f in required_fields if not config.get(f)]

        diagnostic_result["checks"]["configuration"] = {
            "status": "pass" if len(missing_fields) == 0 else "fail",
            "missing_fields": missing_fields,
            "message": "Configuration is valid" if len(missing_fields) == 0 else f"Missing required fields: {', '.join(missing_fields)}"
        }

        if missing_fields:
            diagnostic_result["issues"].append({
                "severity": "error",
                "issue": "Invalid configuration",
                "description": f"Missing required configuration fields: {', '.join(missing_fields)}",
                "impact": "Strategy cannot execute properly",
                "fix": "Edit strategy and provide all required configuration values"
            })

        # 9. Generate recommendations
        if is_active and not initial_buy_submitted:
            diagnostic_result["recommendations"].append({
                "priority": "high",
                "recommendation": "Trigger manual execution",
                "description": "Strategy is active but initial buy hasn't been submitted. Manually trigger strategy execution through the scheduler."
            })

        if initial_buy_filled and len(active_grid_orders) == 0:
            diagnostic_result["recommendations"].append({
                "priority": "high",
                "recommendation": "Re-initialize grid orders",
                "description": "Initial buy has filled but no grid orders were placed. Trigger a manual execution to place grid limit orders."
            })

        if len(stale_grid_orders) > 0:
            diagnostic_result["recommendations"].append({
                "priority": "medium",
                "recommendation": "Clean up stale orders",
                "description": f"Found {len(stale_grid_orders)} stale orders that are no longer being monitored. Consider removing them from the database."
            })

        # Add detailed grid order breakdown
        diagnostic_result["grid_orders_detail"] = {
            "active": [
                {
                    "id": o["id"],
                    "side": o["side"],
                    "level": o["grid_level"],
                    "price": o["limit_price"],
                    "quantity": o["quantity"],
                    "status": o["status"]
                }
                for o in active_grid_orders[:20]  # Limit to first 20 for readability
            ],
            "filled": [
                {
                    "id": o["id"],
                    "side": o["side"],
                    "level": o["grid_level"],
                    "price": o["limit_price"],
                    "quantity": o["quantity"]
                }
                for o in filled_grid_orders[-10:]  # Last 10 filled orders
            ]
        }

        # Add trade history
        diagnostic_result["trades_detail"] = [
            {
                "id": t["id"],
                "type": t["type"],
                "symbol": t["symbol"],
                "quantity": t["quantity"],
                "price": t["price"],
                "status": t["status"],
                "created_at": t["created_at"]
            }
            for t in trades
        ]

        return diagnostic_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error diagnosing strategy {strategy_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Diagnostic failed: {str(e)}")


@router.post("/strategy/{strategy_id}/fix-activation")
async def fix_strategy_activation(
    strategy_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Fix strategy activation issues by setting is_active to true
    """
    try:
        # Verify strategy ownership
        strategy_resp = supabase.table("trading_strategies").select("id, name, is_active").eq(
            "id", strategy_id
        ).eq("user_id", current_user.id).execute()

        if not strategy_resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")

        strategy = strategy_resp.data[0]

        if strategy["is_active"]:
            return {
                "message": "Strategy is already active",
                "strategy_id": strategy_id,
                "is_active": True
            }

        # Activate strategy
        update_resp = supabase.table("trading_strategies").update({
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", strategy_id).eq("user_id", current_user.id).execute()

        logger.info(f"✅ Activated strategy {strategy_id}: {strategy['name']}")

        return {
            "message": f"Strategy '{strategy['name']}' has been activated",
            "strategy_id": strategy_id,
            "is_active": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating strategy {strategy_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/strategy/{strategy_id}/reset-telemetry")
async def reset_strategy_telemetry(
    strategy_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Reset strategy telemetry to allow re-initialization
    Use with caution - this will cause the strategy to re-execute from the beginning
    """
    try:
        # Verify strategy ownership
        strategy_resp = supabase.table("trading_strategies").select("id, name").eq(
            "id", strategy_id
        ).eq("user_id", current_user.id).execute()

        if not strategy_resp.data:
            raise HTTPException(status_code=404, detail="Strategy not found")

        # Reset telemetry data
        update_resp = supabase.table("trading_strategies").update({
            "telemetry_data": {},
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", strategy_id).eq("user_id", current_user.id).execute()

        logger.warning(f"⚠️ Reset telemetry for strategy {strategy_id}")

        return {
            "message": "Telemetry reset successfully. Strategy will re-initialize on next execution.",
            "strategy_id": strategy_id,
            "warning": "This will cause the strategy to place a new initial buy order. Make sure this is what you want."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting telemetry for strategy {strategy_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scheduler-status")
async def get_scheduler_status(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    """
    Get current status of the trading scheduler
    """
    try:
        from scheduler import trading_scheduler

        status = await trading_scheduler.get_scheduler_status()

        return {
            "scheduler": status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"Error getting scheduler status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/order-fill-monitor-status")
async def get_order_fill_monitor_status(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    """
    Get current status of the order fill monitor
    """
    try:
        from order_fill_monitor import order_fill_monitor

        return {
            "is_running": order_fill_monitor.is_running,
            "check_interval": order_fill_monitor.check_interval,
            "error_count": order_fill_monitor.error_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"Error getting order fill monitor status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
