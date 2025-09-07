# alpaca_oauth.py

from __future__ import annotations

import logging
import os
import secrets
import time
from datetime import datetime, timezone
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

# --- Constants ---
AUTHORIZE_URL = "https://app.alpaca.markets/oauth/authorize"
TOKEN_URL = "https://api.alpaca.markets/oauth/token"
BASE_LIVE = "https://api.alpaca.markets"
BASE_PAPER = "https://paper-api.alpaca.markets"

# State store: state -> { user_id, env, created_at }
# In production, use Redis/DB. TTL prevents reuse.
oauth_states: Dict[str, Dict[str, Any]] = {}
OAUTH_STATE_TTL_SECS = 10 * 60  # 10 min

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


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
        if not client_id or not redirect_uri:
            raise HTTPException(
                status_code=500,
                detail="Alpaca OAuth configuration missing. Ensure ALPACA_CLIENT_ID and ALPACA_OAUTH_REDIRECT_URI are set.",
            )

        # Choose env (paper|live). You can expose a query param if you want to switch per-request.
        env = _get_env_value()

        # CSRF state
        _cleanup_expired_states()
        state = secrets.token_urlsafe(32)
        oauth_states[state] = {
            "user_id": current_user.id,
            "env": env,
            "created_at": _now_ts(),
        }

        # Build OAuth URL (per docs)
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": "account:write trading",  # IMPORTANT: 'trading' scope; do NOT request 'data' via OAuth
            "env": env,
            "state": state,
        }
        oauth_url = f"{AUTHORIZE_URL}?{urlencode(params)}"
        logger.info(f"[alpaca] authorize URL generated for user={current_user.id} env={env}")

        return {"oauth_url": oauth_url, "state": state}

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
        if error:
            logger.error(f"[alpaca] OAuth error from provider: {error}")
            msg = quote(f"OAuth authorization failed: {error}")
            return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")

        # Verify & consume state
        _cleanup_expired_states()
        state_obj = oauth_states.get(state)
        if not state_obj:
            logger.error(f"[alpaca] Invalid or expired state: {state}")
            msg = quote("Invalid authorization state")
            return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")

        # Prevent reuse
        try:
            del oauth_states[state]
        except KeyError:
            pass

        user_id: str = state_obj["user_id"]
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
        token_type = token_json.get("token_type", "bearer")
        scope = token_json.get("scope", "")

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

        # Build DB payload
        account_record = {
            "user_id": user_id,
            "brokerage": "alpaca",
            "account_name": f"Alpaca {account_status.title() if account_status else 'Trading'} Account",
            "account_type": "stocks",
            "balance": portfolio_value,
            "is_connected": True,
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "oauth_token": access_token,
            "account_number": alpaca_account_id,
            "oauth_data": {
                "access_token": access_token,
                "token_type": token_type,
                "scope": scope,
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
