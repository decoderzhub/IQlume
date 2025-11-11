"""
Payment and Subscription Management Routes

Handles Stripe payment integration for subscription management.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials
from typing import Dict, Any
import logging
import os
import stripe

from dependencies import get_current_user, get_supabase_client, security
from supabase import Client

router = APIRouter(prefix="/api/payments", tags=["payments"])
logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Subscription tier price IDs (should match Stripe dashboard)
TIER_PRICE_IDS = {
    "pro": os.getenv("STRIPE_PRO_PRICE_ID", "price_pro_monthly"),
    "elite": os.getenv("STRIPE_ELITE_PRICE_ID", "price_elite_monthly"),
}



@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "payments"}

@router.post("/create-checkout-session")
async def create_checkout_session(
    request_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Create a Stripe checkout session for subscription purchase"""
    try:
        tier = request_data.get("tier", "pro")

        if tier not in TIER_PRICE_IDS:
            raise HTTPException(status_code=400, detail="Invalid subscription tier")

        price_id = TIER_PRICE_IDS[tier]

        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/settings?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/settings",
            client_reference_id=current_user.id,
            metadata={
                "user_id": current_user.id,
                "tier": tier,
            }
        )

        logger.info(f"✅ Created checkout session for user {current_user.id}, tier: {tier}")

        return {
            "session_id": checkout_session.id,
            "url": checkout_session.url
        }

    except stripe.error.StripeError as e:
        logger.error(f"❌ Stripe error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail=f"Payment processing error: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Error creating checkout session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    supabase: Client = Depends(get_supabase_client),
):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

        if not webhook_secret:
            logger.warning("⚠️ STRIPE_WEBHOOK_SECRET not configured, skipping signature verification")
            event = stripe.Event.construct_from(
                await request.json(), stripe.api_key
            )
        else:
            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, webhook_secret
                )
            except stripe.error.SignatureVerificationError as e:
                logger.error(f"❌ Stripe webhook signature verification failed: {e}")
                raise HTTPException(status_code=400, detail="Invalid signature")

        # Handle the event
        if event.type == "checkout.session.completed":
            session = event.data.object
            await handle_checkout_completed(session, supabase)
        elif event.type == "customer.subscription.updated":
            subscription = event.data.object
            await handle_subscription_updated(subscription, supabase)
        elif event.type == "customer.subscription.deleted":
            subscription = event.data.object
            await handle_subscription_deleted(subscription, supabase)
        elif event.type == "invoice.payment_failed":
            invoice = event.data.object
            await handle_payment_failed(invoice, supabase)
        else:
            logger.info(f"📨 Unhandled webhook event type: {event.type}")

        return {"status": "success"}

    except Exception as e:
        logger.error(f"❌ Error processing webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Webhook processing failed")


async def handle_checkout_completed(session: Dict[str, Any], supabase: Client):
    """Handle successful checkout completion"""
    try:
        user_id = session.get("client_reference_id") or session.get("metadata", {}).get("user_id")
        tier = session.get("metadata", {}).get("tier", "pro")
        subscription_id = session.get("subscription")

        if not user_id:
            logger.error("❌ No user_id found in checkout session")
            return

        # Update user subscription in database
        update_data = {
            "subscription_tier": tier,
            "subscription_status": "active",
            "subscription_started_at": "now()",
            "stripe_customer_id": session.get("customer"),
            "stripe_subscription_id": subscription_id,
        }

        # Try to update user_profiles first
        try:
            resp = supabase.table("user_profiles").update(update_data).eq(
                "user_id", user_id
            ).execute()

            if not resp.data:
                # If no profile exists, create one
                profile_data = {
                    "user_id": user_id,
                    **update_data
                }
                supabase.table("user_profiles").insert(profile_data).execute()

        except Exception as profile_error:
            logger.warning(f"⚠️ Could not update user_profiles, trying direct user update: {profile_error}")

        logger.info(f"✅ Subscription activated for user {user_id}, tier: {tier}")

    except Exception as e:
        logger.error(f"❌ Error handling checkout completion: {e}", exc_info=True)


async def handle_subscription_updated(subscription: Dict[str, Any], supabase: Client):
    """Handle subscription updates"""
    try:
        subscription_id = subscription.get("id")
        status = subscription.get("status")

        # Find user by subscription_id
        resp = supabase.table("user_profiles").select("user_id").eq(
            "stripe_subscription_id", subscription_id
        ).execute()

        if not resp.data:
            logger.warning(f"⚠️ No user found for subscription {subscription_id}")
            return

        user_id = resp.data[0]["user_id"]

        # Update subscription status
        supabase.table("user_profiles").update({
            "subscription_status": status,
        }).eq("user_id", user_id).execute()

        logger.info(f"✅ Updated subscription status for user {user_id}: {status}")

    except Exception as e:
        logger.error(f"❌ Error handling subscription update: {e}", exc_info=True)


async def handle_subscription_deleted(subscription: Dict[str, Any], supabase: Client):
    """Handle subscription cancellation"""
    try:
        subscription_id = subscription.get("id")

        # Find user by subscription_id
        resp = supabase.table("user_profiles").select("user_id").eq(
            "stripe_subscription_id", subscription_id
        ).execute()

        if not resp.data:
            logger.warning(f"⚠️ No user found for subscription {subscription_id}")
            return

        user_id = resp.data[0]["user_id"]

        # Downgrade to starter tier
        supabase.table("user_profiles").update({
            "subscription_tier": "starter",
            "subscription_status": "canceled",
            "subscription_ends_at": "now()",
        }).eq("user_id", user_id).execute()

        # Deactivate all active strategies (enforce tier limits)
        supabase.table("trading_strategies").update({
            "is_active": False
        }).eq("user_id", user_id).execute()

        logger.info(f"✅ Subscription canceled for user {user_id}, deactivated strategies")

    except Exception as e:
        logger.error(f"❌ Error handling subscription deletion: {e}", exc_info=True)


async def handle_payment_failed(invoice: Dict[str, Any], supabase: Client):
    """Handle failed payment"""
    try:
        subscription_id = invoice.get("subscription")

        if not subscription_id:
            return

        # Find user by subscription_id
        resp = supabase.table("user_profiles").select("user_id").eq(
            "stripe_subscription_id", subscription_id
        ).execute()

        if not resp.data:
            logger.warning(f"⚠️ No user found for subscription {subscription_id}")
            return

        user_id = resp.data[0]["user_id"]

        # Update status to past_due
        supabase.table("user_profiles").update({
            "subscription_status": "past_due",
        }).eq("user_id", user_id).execute()

        # Optionally: Send notification to user about failed payment
        # TODO: Integrate with notification service

        logger.warning(f"⚠️ Payment failed for user {user_id}, marked as past_due")

    except Exception as e:
        logger.error(f"❌ Error handling payment failure: {e}", exc_info=True)


@router.get("/subscription-status")
async def get_subscription_status(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Get current user's subscription status"""
    try:
        # Try to get from user_profiles first
        resp = supabase.table("user_profiles").select("*").eq(
            "user_id", current_user.id
        ).execute()

        if resp.data and len(resp.data) > 0:
            profile = resp.data[0]
            return {
                "tier": profile.get("subscription_tier", "starter"),
                "status": profile.get("subscription_status", "active"),
                "trial_ends_at": profile.get("trial_ends_at"),
                "subscription_ends_at": profile.get("subscription_ends_at"),
            }

        # Default to starter tier if no profile exists
        return {
            "tier": "starter",
            "status": "trialing",
            "trial_ends_at": None,
            "subscription_ends_at": None,
        }

    except Exception as e:
        logger.error(f"❌ Error getting subscription status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get subscription status")


@router.post("/cancel-subscription")
async def cancel_subscription(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Cancel user's subscription"""
    try:
        # Get user's subscription ID
        resp = supabase.table("user_profiles").select("stripe_subscription_id").eq(
            "user_id", current_user.id
        ).execute()

        if not resp.data or not resp.data[0].get("stripe_subscription_id"):
            raise HTTPException(status_code=404, detail="No active subscription found")

        subscription_id = resp.data[0]["stripe_subscription_id"]

        # Cancel subscription in Stripe
        stripe.Subscription.delete(subscription_id)

        logger.info(f"✅ Canceled subscription for user {current_user.id}")

        return {"message": "Subscription canceled successfully"}

    except stripe.error.StripeError as e:
        logger.error(f"❌ Stripe error canceling subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel subscription: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Error canceling subscription: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")
