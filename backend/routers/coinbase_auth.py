# backend/routers/coinbase_auth.py

from __future__ import annotations

import logging
import os
import secrets
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional
from urllib.parse import urlencode, quote

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials
from supabase import Client

load_dotenv()

from dependencies import (
    get_current_user,
    get_supabase_client,
    security,
)

router = APIRouter(prefix="/api/coinbase", tags=["coinbase-oauth"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "coinbase_auth"}

# Coinbase OAuth Constants
AUTHORIZE_URL = "https://www.coinbase.com/oauth/authorize"
TOKEN_URL = "https://api.coinbase.com/oauth/token"
API_BASE_URL = "https://api.coinbase.com"

# State store for OAuth CSRF protection
oauth_states: Dict[str, Dict[str, Any]] = {}
OAUTH_STATE_TTL_SECS = 10 * 60  # 10 minutes

# Get frontend URL from environment
FRONTEND_URL = os.getenv("FRONTEND_URL")
if not FRONTEND_URL:
    FRONTEND_URL = "http://localhost:5173"
    logger.info(f"[coinbase] Using default frontend URL for local development: {FRONTEND_URL}")
else:
    logger.info(f"[coinbase] Using configured frontend URL: {FRONTEND_URL}")


def _now_ts() -> int:
    return int(time.time())


def _cleanup_expired_states() -> None:
    now = _now_ts()
    expired = [k for k, v in oauth_states.items() if (now - int(v.get("created_at", 0))) > OAUTH_STATE_TTL_SECS]
    for k in expired:
        oauth_states.pop(k, None)


@router.get("/oauth/authorize")
async def get_coinbase_oauth_url(
    account_name: str = Query(..., description="Custom account nickname"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    """
    Generate Coinbase OAuth authorization URL.
    Requires a valid Supabase session (Bearer token).
    """
    try:
        client_id = os.getenv("COINBASE_CLIENT_ID")
        client_secret = os.getenv("COINBASE_CLIENT_SECRET")
        redirect_uri = os.getenv("COINBASE_OAUTH_REDIRECT_URI")

        logger.info(f"[coinbase] OAuth config check - Client ID present: {bool(client_id)}, Redirect URI: {redirect_uri}")

        if not client_id or not client_secret or not redirect_uri:
            logger.error("[coinbase] Missing OAuth configuration")
            raise HTTPException(
                status_code=500,
                detail="Coinbase OAuth configuration missing. Ensure COINBASE_CLIENT_ID, COINBASE_CLIENT_SECRET, and COINBASE_OAUTH_REDIRECT_URI are set.",
            )

        if not redirect_uri.startswith(("http://", "https://")):
            logger.error(f"[coinbase] Invalid redirect URI format: {redirect_uri}")
            raise HTTPException(
                status_code=500,
                detail="Invalid COINBASE_OAUTH_REDIRECT_URI format. Must start with http:// or https://"
            )

        # CSRF state
        _cleanup_expired_states()
        state = secrets.token_urlsafe(32)
        oauth_states[state] = {
            "user_id": current_user.id,
            "account_name": account_name,
            "created_at": _now_ts(),
        }

        # Build OAuth URL - Coinbase requires specific scopes
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "wallet:accounts:read,wallet:buys:create,wallet:sells:create,wallet:transactions:read,wallet:user:read",
        }
        oauth_url = f"{AUTHORIZE_URL}?{urlencode(params)}"

        logger.info(f"[coinbase] OAuth URL generated for user={current_user.id}")
        logger.info(f"[coinbase] Full OAuth URL: {oauth_url}")
        logger.info(f"[coinbase] Redirect URI being used: {redirect_uri}")
        logger.info(f"[coinbase] Client ID: {client_id[:8]}...")

        return {
            "oauth_url": oauth_url,
            "state": state,
            "debug_info": {
                "redirect_uri": redirect_uri,
                "client_id_preview": client_id[:8] + "..." if len(client_id) > 8 else client_id,
                "authorize_endpoint": AUTHORIZE_URL
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[coinbase] Error generating OAuth URL: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate OAuth URL: {str(e)}")


@router.get("/oauth/callback")
async def coinbase_oauth_callback(
    code: str = Query(..., description="Authorization code from Coinbase"),
    state: str = Query(..., description="State parameter for CSRF protection"),
    error: Optional[str] = Query(None, description="Error from Coinbase"),
    error_description: Optional[str] = Query(None, description="Error description from Coinbase"),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Handle Coinbase OAuth callback:
    1) Verify state
    2) Exchange code for access token
    3) Fetch account information
    4) Persist in Supabase
    5) Redirect to frontend with status
    """
    try:
        logger.info(f"[coinbase] OAuth callback received - code present: {bool(code)}, state: {state[:8]}..., error: {error}")

        if error:
            logger.error(f"[coinbase] OAuth error from provider: {error}")
            if error_description:
                logger.error(f"[coinbase] OAuth error description: {error_description}")
            msg = quote(f"OAuth authorization failed: {error}" + (f" - {error_description}" if error_description else ""))
            return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")

        # Verify & consume state
        _cleanup_expired_states()
        state_obj = oauth_states.get(state)
        if not state_obj:
            logger.error(f"[coinbase] Invalid or expired state: {state}")
            logger.error(f"[coinbase] Available states: {list(oauth_states.keys())}")
            msg = quote("Invalid or expired authorization state. Please try connecting again.")
            return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")

        # Prevent reuse
        try:
            del oauth_states[state]
        except KeyError:
            pass

        user_id: str = state_obj["user_id"]
        account_name: str = state_obj.get("account_name", "Coinbase Trading Account")

        client_id = os.getenv("COINBASE_CLIENT_ID")
        client_secret = os.getenv("COINBASE_CLIENT_SECRET")
        redirect_uri = os.getenv("COINBASE_OAUTH_REDIRECT_URI")

        if not all([client_id, client_secret, redirect_uri]):
            logger.error("[coinbase] OAuth configuration incomplete on server")
            raise HTTPException(status_code=500, detail="Coinbase OAuth configuration incomplete")

        # Exchange code for access token
        token_form = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
        }

        logger.info(f"[coinbase] Exchanging authorization code for token (user={user_id})")

        async with httpx.AsyncClient(timeout=20.0) as client:
            token_response = await client.post(
                TOKEN_URL,
                data=token_form,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

        if token_response.status_code != 200:
            logger.error(
                f"[coinbase] Token exchange failed: {token_response.status_code} {token_response.text}"
            )
            msg = quote(f"Token exchange failed ({token_response.status_code}).")
            return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")

        token_json = token_response.json()
        access_token = token_json.get("access_token")
        refresh_token = token_json.get("refresh_token")
        token_type = token_json.get("token_type", "bearer")
        expires_in = token_json.get("expires_in", 7200)  # Coinbase default is 2 hours
        scope = token_json.get("scope", "")

        if not access_token:
            logger.error("[coinbase] No access token in token response")
            msg = quote("No access token received")
            return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")

        logger.info(f"[coinbase] Token received for user={user_id}, scope='{scope}'")

        # Fetch user information from Coinbase
        hdrs = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient(timeout=20.0) as client:
            # Get user information
            user_response = await client.get(f"{API_BASE_URL}/v2/user", headers=hdrs)

            if user_response.status_code != 200:
                logger.error(
                    f"[coinbase] Failed to fetch user info: {user_response.status_code} {user_response.text}"
                )
                msg = quote(f"Failed to fetch user information: {user_response.status_code}")
                return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")

            user_data = user_response.json()
            coinbase_user_id = user_data.get("data", {}).get("id")
            coinbase_username = user_data.get("data", {}).get("name", "Coinbase User")

            # Get account balances
            accounts_response = await client.get(f"{API_BASE_URL}/v2/accounts", headers=hdrs)

            total_balance_usd = 0.0
            if accounts_response.status_code == 200:
                accounts_data = accounts_response.json()
                # Calculate total balance across all crypto accounts
                for account in accounts_data.get("data", []):
                    native_balance = account.get("native_balance", {})
                    amount = float(native_balance.get("amount", 0) or 0)
                    total_balance_usd += amount

        logger.info(f"[coinbase] Account fetched id={coinbase_user_id} user={coinbase_username} balance=${total_balance_usd}")

        # Calculate token expiration
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # Build DB payload
        account_record = {
            "user_id": user_id,
            "brokerage": "coinbase",
            "account_name": account_name,
            "account_type": "crypto",
            "balance": total_balance_usd,
            "is_connected": True,
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "access_token": access_token,
            "oauth_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at.isoformat(),
            "account_number": coinbase_user_id,
            "oauth_data": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": token_type,
                "scope": scope,
                "expires_in": expires_in,
                "coinbase_user_id": coinbase_user_id,
                "coinbase_username": coinbase_username,
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "api_base": API_BASE_URL,
            },
        }

        # Upsert into Supabase
        existing = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("user_id", user_id)
            .eq("account_number", coinbase_user_id)
            .eq("brokerage", "coinbase")
            .execute()
        )

        if existing.data:
            bid = existing.data[0]["id"]
            logger.info(f"[coinbase] Updating existing account record id={bid} for user={user_id}")
            supabase.table("brokerage_accounts").update(account_record).eq("id", bid).execute()
        else:
            logger.info(f"[coinbase] Inserting new account record for user={user_id}")
            supabase.table("brokerage_accounts").insert(account_record).execute()

        # Log token storage confirmation
        token_preview = access_token[:8] + "..." if len(access_token) > 8 else "***"
        logger.info(f"[coinbase] ✅ Tokens saved successfully for user={user_id}, token preview={token_preview}")
        logger.info(f"[coinbase] Token fields populated: access_token=✓, oauth_token=✓, refresh_token={'✓' if refresh_token else '✗'}, expires_at=✓")

        # Success
        ok = quote("Coinbase account connected successfully")
        return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=success&message={ok}")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[coinbase] OAuth callback error: {e}")
        msg = quote("Connection failed")
        return RedirectResponse(url=f"{FRONTEND_URL}/accounts?status=error&message={msg}")


@router.get("/accounts")
async def get_connected_accounts(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Return all connected Coinbase accounts for the current user."""
    try:
        resp = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("brokerage", "coinbase")
            .execute()
        )
        return {"accounts": resp.data}
    except Exception as e:
        logger.exception(f"[coinbase] Error fetching connected accounts: {e}")
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
        logger.info(f"[coinbase] Disconnected account id={account_id} user={current_user.id}")
        return {"message": "Account disconnected successfully"}
    except Exception as e:
        logger.exception(f"[coinbase] Error disconnecting account: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect account: {str(e)}")


@router.post("/refresh-token")
async def refresh_access_token(
    request_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Refresh Coinbase OAuth access token using refresh token.
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

        account = resp.data[0]
        refresh_token = account.get("refresh_token")

        if not refresh_token:
            raise HTTPException(status_code=400, detail="No refresh token available")

        client_id = os.getenv("COINBASE_CLIENT_ID")
        client_secret = os.getenv("COINBASE_CLIENT_SECRET")

        if not client_id or not client_secret:
            raise HTTPException(status_code=500, detail="Coinbase OAuth configuration missing")

        # Refresh the token
        token_data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                TOKEN_URL,
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

        if response.status_code == 200:
            token_response = response.json()
            new_access_token = token_response.get("access_token")
            new_refresh_token = token_response.get("refresh_token", refresh_token)
            expires_in = token_response.get("expires_in", 7200)

            expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

            # Update database
            update_data = {
                "access_token": new_access_token,
                "oauth_token": new_access_token,
                "refresh_token": new_refresh_token,
                "expires_at": expires_at.isoformat()
            }

            supabase.table("brokerage_accounts").update(update_data).eq("id", account_id).execute()

            logger.info(f"[coinbase] ✅ Successfully refreshed token for account {account_id}")

            return {"message": "Token refreshed successfully"}
        else:
            logger.error(f"[coinbase] Token refresh failed: {response.status_code} {response.text}")
            raise HTTPException(status_code=500, detail="Token refresh failed")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[coinbase] Error refreshing token: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh token: {str(e)}")


@router.get("/config-check")
async def check_oauth_config(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
):
    """
    Check Coinbase OAuth configuration status (for debugging).
    """
    try:
        client_id = os.getenv("COINBASE_CLIENT_ID")
        client_secret = os.getenv("COINBASE_CLIENT_SECRET")
        redirect_uri = os.getenv("COINBASE_OAUTH_REDIRECT_URI")
        frontend_url = os.getenv("FRONTEND_URL")

        config_status = {
            "client_id_configured": bool(client_id),
            "client_id_preview": client_id[:8] + "..." if client_id and len(client_id) > 8 else None,
            "client_secret_configured": bool(client_secret),
            "redirect_uri": redirect_uri,
            "redirect_uri_valid": bool(redirect_uri and redirect_uri.startswith(("http://", "https://"))),
            "frontend_url": frontend_url,
            "authorize_endpoint": AUTHORIZE_URL,
            "token_endpoint": TOKEN_URL,
            "api_base": API_BASE_URL,
        }

        issues = []
        if not client_id:
            issues.append("COINBASE_CLIENT_ID is not set")
        if not client_secret:
            issues.append("COINBASE_CLIENT_SECRET is not set")
        if not redirect_uri:
            issues.append("COINBASE_OAUTH_REDIRECT_URI is not set")
        elif not redirect_uri.startswith(("http://", "https://")):
            issues.append("COINBASE_OAUTH_REDIRECT_URI must start with http:// or https://")
        if not frontend_url:
            issues.append("FRONTEND_URL is not set (using default)")

        config_status["issues"] = issues
        config_status["configuration_valid"] = len(issues) == 0

        logger.info(f"[coinbase] Config check for user={current_user.id}: {len(issues)} issues found")

        return config_status

    except Exception as e:
        logger.exception(f"[coinbase] Error checking config: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check configuration: {str(e)}")


@router.get("/connection-status")
async def get_connection_status(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Get detailed connection status for Coinbase account.
    """
    try:
        resp = (
            supabase.table("brokerage_accounts")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("brokerage", "coinbase")
            .eq("is_connected", True)
            .execute()
        )

        if not resp.data or len(resp.data) == 0:
            return {
                "connected": False,
                "message": "No Coinbase account connected"
            }

        account = resp.data[0]
        oauth_data = account.get("oauth_data", {})

        coinbase_user_id = oauth_data.get("coinbase_user_id", account.get("account_number"))
        coinbase_username = oauth_data.get("coinbase_username", "Coinbase User")

        logger.info(f"[coinbase] Connection status check - User: {current_user.id}")

        return {
            "connected": True,
            "account_id": account["id"],
            "account_name": account.get("account_name", "Coinbase Trading Account"),
            "coinbase_user_id": coinbase_user_id,
            "coinbase_username": coinbase_username,
            "balance": float(account.get("balance", 0)),
            "last_sync": account.get("last_sync"),
            "connected_at": oauth_data.get("connected_at")
        }

    except Exception as e:
        logger.exception(f"[coinbase] Error getting connection status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get connection status: {str(e)}")
