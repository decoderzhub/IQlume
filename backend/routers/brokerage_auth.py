# alpaca_oauth.py

from __future__ import annotations

import logging
import os
import secrets
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode, quote

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials
from supabase import Client

# Load environment vars BEFORE importing dependencies that may read them.
load_dotenv()

from dependencies import (  # noqa: E402
    get_current_user,
    get_supabase_client,
    security,
)

router = APIRouter(prefix="/api/alpaca", tags=["alpaca-oauth"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "brokerage_auth"}

# --- Constants ---
AUTHORIZE_URL = "https://app.alpaca.markets/oauth/authorize"
TOKEN_URL = "https://api.alpaca.markets/oauth/token"
BASE_LIVE = "https://api.alpaca.markets"
BASE_PAPER = "https://paper-api.alpaca.markets"

# State store: state -> { user_id, env, created_at }
# In production, use Redis/DB. TTL prevents reuse.
oauth_states: Dict[str, Dict[str, Any]] = {}
OAUTH_STATE_TTL_SECS = 10 * 60  # 10 min

# Get frontend URL from environment, with proper fallback for local development
FRONTEND_URL = os.getenv("FRONTEND_URL")
if not FRONTEND_URL:
    # Auto-detect local development URL
    FRONTEND_URL = "http://localhost:5173"
    logger.info(f"[alpaca] Using default frontend URL for local development: {FRONTEND_URL}")
else:
    logger.info(f"[alpaca] Using configured frontend URL: {FRONTEND_URL}")


def _now_ts() -> int:
    return int(time.time())


def _cleanup_expired_states() -> None:
    now = _now_ts()
    expired = [k for k, v in oauth_states.items() if (now - int(v.get("created_at", 0))) > OAUTH_STATE_TTL_SECS]
    for k in expired:
        oauth_states.pop(k, None)


def _get_env_value() -> str:
    """Return 'paper' or 'live' from env, defaulting to 'paper' for safer dev."""
    val = (os.getenv("ALPACA_ENV") or "paper").strip().lower()
    return "live" if val == "live" else "paper"


def _base_for_env(env: str) -> str:
    return BASE_PAPER if env == "paper" else BASE_LIVE


@router.get("/oauth/authorize")
async def get_alpaca_oauth_url(
    account_name: str = Query(..., description="Custom account nickname"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    """
    Generate Alpaca OAuth authorization URL.
    Requires a valid Supabase session (Bearer token handled by `security` / `get_current_user`).
    """
    try:
        client_id = os.getenv("ALPACA_CLIENT_ID")
        redirect_uri = os.getenv("ALPACA_OAUTH_REDIRECT_URI")

        logger.info(f"[alpaca] OAuth config check - Client ID present: {bool(client_id)}, Redirect URI: {redirect_uri}")

        if not client_id or not redirect_uri:
            logger.error("[alpaca] Missing OAuth configuration")
            raise HTTPException(
                status_code=500,
                detail="Alpaca OAuth configuration missing. Ensure ALPACA_CLIENT_ID and ALPACA_OAUTH_REDIRECT_URI are set.",
            )

        # Validate redirect URI format
        if not redirect_uri.startswith(("http://", "https://")):
            logger.error(f"[alpaca] Invalid redirect URI format: {redirect_uri}")
            raise HTTPException(
                status_code=500,
                detail="Invalid ALPACA_OAUTH_REDIRECT_URI format. Must start with http:// or https://"
            )

        # Choose env (paper|live). You can expose a query param if you want to switch per-request.
        env = _get_env_value()

        # CSRF state
        _cleanup_expired_states()
        state = secrets.token_urlsafe(32)
        oauth_states[state] = {
            "user_id": current_user.id,
            "account_name": account_name,
            "env": env,
            "created_at": _now_ts(),
        }

        # Build OAuth URL (per docs)
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": "account:write trading",
            "state": state,
        }
        oauth_url = f"{AUTHORIZE_URL}?{urlencode(params)}"

        logger.info(f"[alpaca] OAuth URL generated for user={current_user.id} env={env}")
        logger.info(f"[alpaca] Full OAuth URL: {oauth_url}")
        logger.info(f"[alpaca] Redirect URI being used: {redirect_uri}")
        logger.info(f"[alpaca] Client ID: {client_id[:8]}...")

        return {
            "oauth_url": oauth_url,
            "state": state,
            "debug_info": {
                "redirect_uri": redirect_uri,
                "client_id_preview": client_id[:8] + "..." if len(client_id) > 8 else client_id,
                "env": env,
                "authorize_endpoint": AUTHORIZE_URL
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[alpaca] Error generating OAuth URL: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate OAuth URL: {str(e)}")


@router.get("/oauth/callback")
async def alpaca_oauth_callback(
    code: str = Query(..., description="Authorization code from Alpaca"),
    state: str = Query(..., description="State parameter for CSRF protection"),
    error: Optional[str] = Query(None, description="Error from Alpaca"),
    error_description: Optional[str] = Query(None, description="Error description from Alpaca"),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Handle Alpaca OAuth callback:
    1) Verify state
    2) Exchange code for access token
    3) Fetch account (paper or live endpoint, based on env)
    4) Persist in Supabase
    5) Redirect to frontend with status
    """
    try:
        logger.info(f"[alpaca] OAuth callback received - code present: {bool(code)}, state: {state[:8]}..., error: {error}")

        if error:
            logger.error(f"[alpaca] OAuth error from provider: {error}")
            if error_description:
                logger.error(f"[alpaca] OAuth error description: {error_description}")
            msg = quote(f"OAuth authorization failed: {error}" + (f" - {error_description}" if error_description else ""))
            return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")

        # Verify & consume state
        _cleanup_expired_states()
        state_obj = oauth_states.get(state)
        if not state_obj:
            logger.error(f"[alpaca] Invalid or expired state: {state}")
            logger.error(f"[alpaca] Available states: {list(oauth_states.keys())}")
            msg = quote("Invalid or expired authorization state. Please try connecting again.")
            return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")

        # Prevent reuse
        try:
            del oauth_states[state]
        except KeyError:
            pass

        user_id: str = state_obj["user_id"]
        account_name: str = state_obj.get("account_name", "Alpaca Trading Account")
        env: str = state_obj.get("env", "paper")
        base_url = _base_for_env(env)

        client_id = os.getenv("ALPACA_CLIENT_ID")
        client_secret = os.getenv("ALPACA_CLIENT_SECRET")
        redirect_uri = os.getenv("ALPACA_OAUTH_REDIRECT_URI")
        if not all([client_id, client_secret, redirect_uri]):
            logger.error("[alpaca] OAuth configuration incomplete on server")
            raise HTTPException(status_code=500, detail="Alpaca OAuth configuration incomplete")

        # Exchange code for access token (form-encoded)
        token_form = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
        }

        logger.info(f"[alpaca] Exchanging authorization code for token (user={user_id}, env={env})")

        async with httpx.AsyncClient(timeout=20.0) as client:
            token_response = await client.post(
                TOKEN_URL,
                data=token_form,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

        if token_response.status_code != 200:
            logger.error(
                f"[alpaca] Token exchange failed: {token_response.status_code} {token_response.text}"
            )
            msg = quote(
                f"Token exchange failed ({token_response.status_code})."
            )
            return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")

        token_json = token_response.json()
        access_token = token_json.get("access_token")
        refresh_token = token_json.get("refresh_token")
        token_type = token_json.get("token_type", "bearer")
        scope = token_json.get("scope", "")
        expires_in = token_json.get("expires_in", 31536000)

        if not access_token:
            logger.error("[alpaca] No access token in token response")
            msg = quote("No access token received")
            return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")

        logger.info(f"[alpaca] Token received for user={user_id}, scope='{scope}', env={env}")

        # Fetch account info from correct environment
        hdrs = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient(timeout=20.0) as client:
            account_response = await client.get(f"{base_url}/v2/account", headers=hdrs)

            # If the chosen env was wrong for the token (rare), try the other base once.
            if account_response.status_code != 200:
                other_base = BASE_LIVE if base_url == BASE_PAPER else BASE_PAPER
                logger.warning(
                    f"[alpaca] /v2/account failed on {base_url} ({account_response.status_code}); trying {other_base}"
                )
                account_response = await client.get(f"{other_base}/v2/account", headers=hdrs)
                if account_response.status_code == 200:
                    base_url = other_base

        if account_response.status_code != 200:
            logger.error(
                f"[alpaca] Failed to fetch account info: {account_response.status_code} {account_response.text}"
            )
            msg = quote(
                f"Failed to fetch account information: {account_response.status_code}"
            )
            return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")

        account = account_response.json()
        alpaca_account_id = account.get("id")
        account_status = account.get("status")
        portfolio_value = float(account.get("portfolio_value", 0) or 0)
        buying_power = float(account.get("buying_power", 0) or 0)

        logger.info(
            f"[alpaca] Account fetched id={alpaca_account_id} status={account_status} env_base={base_url}"
        )

        # Calculate token expiration
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # Build DB payload with tokens in all required fields for consistency
        account_record = {
            "user_id": user_id,
            "brokerage": "alpaca",
            "account_name": account_name,
            "account_type": "stocks",
            "balance": portfolio_value,
            "is_connected": True,
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "access_token": access_token,
            "oauth_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at.isoformat(),
            "account_number": alpaca_account_id,
            "oauth_data": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": token_type,
                "scope": scope,
                "expires_in": expires_in,
                "alpaca_account_id": alpaca_account_id,
                "account_status": account_status,
                "buying_power": buying_power,
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "env": "paper" if base_url == BASE_PAPER else "live",
                "api_base": base_url,
            },
        }

        # Upsert into Supabase
        existing = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("user_id", user_id)
            .eq("account_number", alpaca_account_id)
            .eq("brokerage", "alpaca")
            .execute()
        )

        if existing.data:
            bid = existing.data[0]["id"]
            logger.info(f"[alpaca] Updating existing account record id={bid} for user={user_id}")
            supabase.table("brokerage_accounts").update(account_record).eq("id", bid).execute()
        else:
            logger.info(f"[alpaca] Inserting new account record for user={user_id}")
            supabase.table("brokerage_accounts").insert(account_record).execute()

        # Log token storage confirmation with masked preview
        token_preview = access_token[:8] + "..." if len(access_token) > 8 else "***"
        logger.info(f"[alpaca] ✅ Tokens saved successfully for user={user_id}, token preview={token_preview}")
        logger.info(f"[alpaca] Token fields populated: access_token=✓, oauth_token=✓, refresh_token={'✓' if refresh_token else '✗'}, expires_at=✓")

        # Success
        ok = quote("Alpaca account connected successfully")
        return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=success&message={ok}")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[alpaca] OAuth callback error: {e}")
        msg = quote("Connection failed")
        return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")


@router.get("/accounts")
async def get_connected_accounts(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Return all connected Alpaca accounts for the current user."""
    try:
        resp = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("brokerage", "alpaca")
            .execute()
        )
        return {"accounts": resp.data}
    except Exception as e:
        logger.exception(f"[alpaca] Error fetching connected accounts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")


@router.delete("/accounts/{account_id}")
async def disconnect_account(
    account_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Delete a connected brokerage account record for the current user."""
    try:
        supabase.table("brokerage_accounts").delete().eq("id", account_id).eq("user_id", current_user.id).execute()
        logger.info(f"[alpaca] Disconnected account id={account_id} user={current_user.id}")
        return {"message": "Account disconnected successfully"}
    except Exception as e:
        logger.exception(f"[alpaca] Error disconnecting account: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect account: {str(e)}")


@router.post("/refresh-token")
async def refresh_access_token(
    request_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Placeholder for token refresh (Alpaca OAuth may not issue refresh tokens).
    """
    try:
        account_id = request_data.get("account_id")
        if not account_id:
            raise HTTPException(status_code=400, detail="account_id is required")

        resp = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("id", account_id)
            .eq("user_id", current_user.id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Account not found")

        return {"message": "Token refresh not currently supported by Alpaca OAuth"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[alpaca] Error refreshing token: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh token: {str(e)}")


@router.get("/config-check")
async def check_oauth_config(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    """
    Check Alpaca OAuth configuration status (for debugging).
    """
    try:
        client_id = os.getenv("ALPACA_CLIENT_ID")
        client_secret = os.getenv("ALPACA_CLIENT_SECRET")
        redirect_uri = os.getenv("ALPACA_OAUTH_REDIRECT_URI")
        frontend_url = os.getenv("FRONTEND_URL")
        env = _get_env_value()

        config_status = {
            "client_id_configured": bool(client_id),
            "client_id_preview": client_id[:8] + "..." if client_id and len(client_id) > 8 else None,
            "client_secret_configured": bool(client_secret),
            "redirect_uri": redirect_uri,
            "redirect_uri_valid": bool(redirect_uri and redirect_uri.startswith(("http://", "https://"))),
            "frontend_url": frontend_url,
            "environment": env,
            "authorize_endpoint": AUTHORIZE_URL,
            "token_endpoint": TOKEN_URL,
            "api_base": _base_for_env(env),
        }

        issues = []
        if not client_id:
            issues.append("ALPACA_CLIENT_ID is not set")
        if not client_secret:
            issues.append("ALPACA_CLIENT_SECRET is not set")
        if not redirect_uri:
            issues.append("ALPACA_OAUTH_REDIRECT_URI is not set")
        elif not redirect_uri.startswith(("http://", "https://")):
            issues.append("ALPACA_OAUTH_REDIRECT_URI must start with http:// or https://")
        if not frontend_url:
            issues.append("FRONTEND_URL is not set (using default)")

        config_status["issues"] = issues
        config_status["configuration_valid"] = len(issues) == 0

        logger.info(f"[alpaca] Config check for user={current_user.id}: {len(issues)} issues found")

        return config_status

    except Exception as e:
        logger.exception(f"[alpaca] Error checking config: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check configuration: {str(e)}")


@router.get("/connection-status")
async def get_connection_status(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Get detailed connection status for Alpaca account including paper/live mode.
    """
    try:
        resp = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("brokerage", "alpaca")
            .eq("is_connected", True)
            .execute()
        )

        if not resp.data or len(resp.data) == 0:
            return {
                "connected": False,
                "message": "No Alpaca account connected"
            }

        account = resp.data[0]
        oauth_data = account.get("oauth_data", {})

        # Determine environment
        env = oauth_data.get("env", "paper")
        is_paper = env == "paper"
        api_base = oauth_data.get("api_base", "https://paper-api.alpaca.markets")
        alpaca_account_id = oauth_data.get("alpaca_account_id", account.get("account_number"))
        account_status = oauth_data.get("account_status", "unknown")

        logger.info(f"[alpaca] Connection status check - User: {current_user.id}, Mode: {env.upper()}")

        return {
            "connected": True,
            "account_id": account["id"],
            "account_name": account.get("account_name", "Alpaca Trading Account"),
            "alpaca_account_id": alpaca_account_id,
            "environment": env,
            "is_paper": is_paper,
            "api_base": api_base,
            "account_status": account_status,
            "balance": float(account.get("balance", 0)),
            "last_sync": account.get("last_sync"),
            "connected_at": oauth_data.get("connected_at")
        }

    except Exception as e:
        logger.exception(f"[alpaca] Error getting connection status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get connection status: {str(e)}")
