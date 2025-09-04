from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse
from typing import Dict, Any, Optional
import logging
import os
import secrets
import httpx
from urllib.parse import urlencode
from datetime import datetime, timezone, timedelta
from supabase import Client
from dependencies import (
    get_current_user,
    get_supabase_client,
    security
)

router = APIRouter(prefix="/api/alpaca", tags=["alpaca-oauth"])
logger = logging.getLogger(__name__)

# OAuth state storage (in production, use Redis or database)
oauth_states: Dict[str, str] = {}

@router.get("/oauth/authorize")
async def get_alpaca_oauth_url(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
):
    """Generate Alpaca OAuth authorization URL"""
    try:
        client_id = os.getenv("ALPACA_CLIENT_ID")
        redirect_uri = os.getenv("ALPACA_OAUTH_REDIRECT_URI")
        
        if not client_id or not redirect_uri:
            raise HTTPException(
                status_code=500, 
                detail="Alpaca OAuth configuration missing. Please check ALPACA_CLIENT_ID and ALPACA_OAUTH_REDIRECT_URI environment variables."
            )
        
        # Generate secure state parameter
        state = secrets.token_urlsafe(32)
        oauth_states[state] = current_user.id
        
        # Build OAuth URL according to Alpaca documentation
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": "account:write data",
            "state": state
        }
        
        oauth_url = f"https://app.alpaca.markets/oauth/authorize?{urlencode(params)}"
        
        logger.info(f"Generated OAuth URL for user {current_user.id}")
        
        return {
            "oauth_url": oauth_url,
            "state": state
        }
        
    except Exception as e:
        logger.error(f"Error generating OAuth URL: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate OAuth URL: {str(e)}")

@router.get("/oauth/callback")
async def alpaca_oauth_callback(
    code: str = Query(..., description="Authorization code from Alpaca"),
    state: str = Query(..., description="State parameter for CSRF protection"),
    error: Optional[str] = Query(None, description="Error from Alpaca"),
    supabase: Client = Depends(get_supabase_client)
):
    """Handle Alpaca OAuth callback according to Alpaca documentation"""
    try:
        # Check for OAuth errors from Alpaca
        if error:
            logger.error(f"OAuth error from Alpaca: {error}")
            return RedirectResponse(
                url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/accounts?status=error&message=OAuth authorization failed: {error}"
            )
        
        # Verify state parameter to prevent CSRF attacks
        user_id = oauth_states.get(state)
        if not user_id:
            logger.error(f"Invalid or expired state parameter: {state}")
            return RedirectResponse(
                url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/accounts?status=error&message=Invalid authorization state"
            )
        
        # Clean up state to prevent reuse
        del oauth_states[state]
        
        # Get OAuth configuration
        client_id = os.getenv("ALPACA_CLIENT_ID")
        client_secret = os.getenv("ALPACA_CLIENT_SECRET")
        redirect_uri = os.getenv("ALPACA_OAUTH_REDIRECT_URI")
        
        if not all([client_id, client_secret, redirect_uri]):
            logger.error("Alpaca OAuth configuration incomplete")
            raise HTTPException(status_code=500, detail="Alpaca OAuth configuration incomplete")
        
        # Exchange authorization code for access token
        # Using application/x-www-form-urlencoded as required by Alpaca
        token_data = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri
        }
        
        logger.info(f"Exchanging authorization code for access token for user {user_id}")
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://api.alpaca.markets/oauth/token",
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
        
        if token_response.status_code != 200:
            logger.error(f"Token exchange failed: {token_response.status_code} {token_response.text}")
            return RedirectResponse(
                url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/accounts?status=error&message=Token exchange failed"
            )
        
        token_data_response = token_response.json()
        access_token = token_data_response.get("access_token")
        token_type = token_data_response.get("token_type", "bearer")
        scope = token_data_response.get("scope", "")
        
        if not access_token:
            logger.error("No access token received from Alpaca")
            return RedirectResponse(
                url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/accounts?status=error&message=No access token received"
            )
        
        logger.info(f"Successfully received access token for user {user_id}")
        
        # Get account information from Alpaca using the access token
        async with httpx.AsyncClient() as client:
            account_response = await client.get(
                "https://api.alpaca.markets/v2/account",
                headers={"Authorization": f"Bearer {access_token}"}
            )
        
        if account_response.status_code != 200:
            logger.error(f"Failed to fetch account info: {account_response.status_code} {account_response.text}")
            return RedirectResponse(
                url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/accounts?status=error&message=Failed to fetch account information"
            )
        
        account_info = account_response.json()
        alpaca_account_id = account_info.get("id")
        account_status = account_info.get("status")
        portfolio_value = float(account_info.get("portfolio_value", 0))
        buying_power = float(account_info.get("buying_power", 0))
        
        logger.info(f"Retrieved account info for Alpaca account {alpaca_account_id}")
        
        # Store account information in database
        account_data = {
            "user_id": user_id,
            "brokerage": "alpaca",
            "account_name": f"Alpaca {account_status.title()} Account",
            "account_type": "stocks",
            "balance": portfolio_value,
            "is_connected": True,
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "oauth_token": access_token,
            "account_number": alpaca_account_id,
            # Store additional OAuth info for future use
            "oauth_data": {
                "access_token": access_token,
                "token_type": token_type,
                "scope": scope,
                "alpaca_account_id": alpaca_account_id,
                "account_status": account_status,
                "buying_power": buying_power,
                "connected_at": datetime.now(timezone.utc).isoformat()
            }
        }
        
        # Check if account already exists for this user and Alpaca account
        existing_account = supabase.table("brokerage_accounts").select("*").eq("user_id", user_id).eq("account_number", alpaca_account_id).execute()
        
        if existing_account.data:
            # Update existing account
            logger.info(f"Updating existing Alpaca account for user {user_id}")
            supabase.table("brokerage_accounts").update(account_data).eq("id", existing_account.data[0]["id"]).execute()
        else:
            # Insert new account
            logger.info(f"Creating new Alpaca account record for user {user_id}")
            supabase.table("brokerage_accounts").insert(account_data).execute()
        
        logger.info(f"Successfully connected Alpaca account {alpaca_account_id} for user {user_id}")
        
        # Redirect back to frontend with success message
        return RedirectResponse(
            url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/accounts?status=success&message=Alpaca account connected successfully"
        )
        
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        return RedirectResponse(
            url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/accounts?status=error&message=Connection failed"
        )

@router.get("/accounts")
async def get_connected_accounts(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get user's connected Alpaca accounts"""
    try:
        resp = supabase.table("brokerage_accounts").select("*").eq("user_id", current_user.id).eq("brokerage", "alpaca").execute()
        return {"accounts": resp.data}
    except Exception as e:
        logger.error(f"Error fetching connected accounts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")

@router.delete("/accounts/{account_id}")
async def disconnect_account(
    account_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Disconnect a brokerage account"""
    try:
        # Delete the account record
        resp = supabase.table("brokerage_accounts").delete().eq("id", account_id).eq("user_id", current_user.id).execute()
        
        logger.info(f"Disconnected account {account_id} for user {current_user.id}")
        return {"message": "Account disconnected successfully"}
    except Exception as e:
        logger.error(f"Error disconnecting account: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect account: {str(e)}")

@router.post("/refresh-token")
async def refresh_access_token(
    request_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Refresh an expired Alpaca access token (if refresh tokens are supported)"""
    try:
        account_id = request_data.get("account_id")
        if not account_id:
            raise HTTPException(status_code=400, detail="account_id is required")
        
        # Get account from database
        resp = supabase.table("brokerage_accounts").select("*").eq("id", account_id).eq("user_id", current_user.id).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Account not found")
        
        account = resp.data[0]
        oauth_data = account.get("oauth_data", {})
        
        # Note: Alpaca may not provide refresh tokens in all cases
        # This endpoint is prepared for future use if refresh tokens become available
        
        return {"message": "Token refresh not currently supported by Alpaca OAuth"}
        
    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh token: {str(e)}")