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
from supabase import Client
from ..dependencies import (
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
        request = LinkTokenCreateRequest(
            products=[Products('transactions'), Products('auth'), Products('identity')],
            client_name="brokernomex Trading Platform",
            country_codes=[CountryCode('US')],
            language='en',
            user=LinkTokenCreateRequestUser(client_user_id=user_id)
        )
        
        response = plaid_client.link_token_create(request)
        
        return {
            "link_token": response['link_token'],
            "expiration": response['expiration']
        }
        
    except Exception as e:
        logger.error(f"Error creating Plaid link token: {e}")
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
        request = ItemPublicTokenExchangeRequest(public_token=public_token)
        response = plaid_client.item_public_token_exchange(request)
        
        access_token = response['access_token']
        item_id = response['item_id']
        
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
        
    except Exception as e:
        logger.error(f"Error exchanging Plaid public token: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to exchange public token: {str(e)}")