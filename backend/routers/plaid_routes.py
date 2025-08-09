from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from typing import Dict, Any
import logging
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.country_code import CountryCode
from plaid.model.products import Products
from plaid.exceptions import ApiException
from supabase import Client
from dependencies import (
    get_current_user,
    get_supabase_client,
    get_plaid_client,
    security
)

router = APIRouter(prefix="/api/plaid", tags=["plaid"])
logger = logging.getLogger(__name__)

@router.post("/create-link-token")
async def create_link_token(
    request_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    plaid_client: plaid_api.PlaidApi = Depends(get_plaid_client)
):
    """Create a Plaid Link token"""
    try:
        user_id = request_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Create the link token request
        req = LinkTokenCreateRequest(
            products=[Products.TRANSACTIONS, Products.AUTH, Products.IDENTITY],
            client_name="brokernomex Trading Platform",
            country_codes=[CountryCode.US],
            language='en',
            user=LinkTokenCreateRequestUser(client_user_id=user_id)
        )
        
        resp = plaid_client.link_token_create(req)
        
        return {
            "link_token": resp.link_token,
            "expiration": resp.expiration
        }
        
    except ApiException as e:
        # Surface Plaid's response in the HTTP error so you can see it in the browser
        logger.exception("Plaid ApiException creating link token")
        raise HTTPException(
            status_code=e.status or 500,
            detail=f"Plaid error: {e.body}"
        )
    except Exception as e:
        logger.exception("Unexpected error creating link token")
        raise HTTPException(status_code=500, detail=f"Failed to create link token: {str(e)}")

@router.post("/exchange-public-token")
async def exchange_public_token(
    request_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    plaid_client: plaid_api.PlaidApi = Depends(get_plaid_client),
    supabase: Client = Depends(get_supabase_client)
):
    """Exchange a public token for an access token"""
    try:
        public_token = request_data.get("public_token")
        metadata = request_data.get("metadata", {})
        
        if not public_token:
            raise HTTPException(status_code=400, detail="public_token is required")
        
        # Exchange public token for access token
        req = ItemPublicTokenExchangeRequest(public_token=public_token)
        resp = plaid_client.item_public_token_exchange(req)
        
        access_token = resp.access_token
        item_id = resp.item_id
        
        # Store the access token securely in your database
        # This is a simplified example - in production, encrypt the access token
        bank_account_data = {
            "user_id": current_user.id,
            "plaid_access_token": access_token,
            "plaid_item_id": item_id,
            "institution_name": metadata.get("institution", {}).get("name", "Unknown"),
            "account_mask": metadata.get("accounts", [{}])[0].get("mask", "0000") if metadata.get("accounts") else "0000",
            "created_at": "now()"
        }
        
        # Insert into your bank_accounts table (you'll need to create this table)
        # supabase.table("bank_accounts").insert(bank_account_data).execute()
        
        return {
            "access_token": access_token,
            "item_id": item_id,
            "message": "Successfully linked bank account"
        }
        
    except ApiException as e:
        # Surface Plaid's response in the HTTP error so you can see it in the browser
        logger.exception("Plaid ApiException exchanging public token")
        raise HTTPException(
            status_code=e.status or 500,
            detail=f"Plaid error: {e.body}"
        )
    except Exception as e:
        logger.exception("Unexpected error exchanging public token")
        raise HTTPException(status_code=500, detail=f"Failed to exchange public token: {str(e)}")