import structlog
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel

from app.dependencies import get_settings, get_supabase_service
from app.middleware.auth import require_auth
from app.services.stripe_service import StripeService, PLAN_CREDITS, SUBSCRIPTION_PLANS
from app.services.supabase_service import SupabaseService
from app.config import Settings

logger = structlog.get_logger()

router = APIRouter(prefix="/api/payments", tags=["payments"])


def get_stripe_service(settings: Settings = Depends(get_settings)) -> StripeService:
    return StripeService(settings)


class CheckoutRequest(BaseModel):
    plan_id: str


@router.post("/create-checkout-session")
async def create_checkout_session(
    body: CheckoutRequest,
    user: dict = Depends(require_auth),
    stripe_svc: StripeService = Depends(get_stripe_service),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    user_email = user.get("email", "")
    logger.info("create_checkout_session", user_id=user_id, plan_id=body.plan_id)
    url = stripe_svc.create_checkout_session(body.plan_id, user_id, user_email)
    await supa.log_payment_event(user_id, "checkout_created", {"plan_id": body.plan_id})
    logger.info("create_checkout_session_done", user_id=user_id, plan_id=body.plan_id)
    return {"url": url}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_svc: StripeService = Depends(get_stripe_service),
    supa: SupabaseService = Depends(get_supabase_service),
):
    logger.info("stripe_webhook_received")
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe_svc.verify_webhook(payload, sig)
    except Exception:
        logger.error("webhook_verification_failed", exc_info=True)
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id") or session["metadata"].get("user_id")
        plan_id = session["metadata"].get("plan_id", "")

        if not user_id:
            logger.warning("webhook_session_missing_user_id")
            return {"status": "ignored"}

        # Record purchase
        await supa.record_purchase(user_id, {
            "type": "subscription" if plan_id in SUBSCRIPTION_PLANS else "credits_pack",
            "plan_id": plan_id,
            "stripe_session_id": session["id"],
            "stripe_subscription_id": session.get("subscription"),
            "amount_cents": session.get("amount_total", 0),
            "credits_granted": PLAN_CREDITS.get(plan_id, 0),
            "status": "completed",
        })

        # Grant credits or set subscription
        if plan_id in SUBSCRIPTION_PLANS:
            await supa.set_plan(user_id, plan_id)
        elif plan_id in PLAN_CREDITS:
            await supa.add_credits(user_id, PLAN_CREDITS[plan_id], f"purchase_{plan_id}")
            await supa.set_plan(user_id, "credits")

        # Store Stripe customer ID
        customer_id = session.get("customer")
        if customer_id:
            await supa.set_stripe_customer(user_id, customer_id)

        await supa.log_payment_event(user_id, "payment_completed", {
            "plan_id": plan_id,
            "session_id": session["id"],
            "amount_cents": session.get("amount_total", 0),
        })
        logger.info("payment_processed", user_id=user_id, plan_id=plan_id)

    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        customer_id = sub.get("customer")
        await supa.log_payment_event(None, "subscription_cancelled", {"customer_id": customer_id})
        logger.info("subscription_cancelled", customer_id=customer_id)

    return {"status": "ok"}


@router.get("/credits")
async def get_credits(
    user: dict = Depends(require_auth),
    supa: SupabaseService = Depends(get_supabase_service),
):
    user_id = user.get("sub")
    logger.info("get_credits", user_id=user_id)
    credits = await supa.get_credits(user_id)
    logger.info("get_credits_done", user_id=user_id, credits=credits)
    return {"credits": credits}


class PayPalOrderRequest(BaseModel):
    plan_id: str
    amount_cents: int


@router.post("/paypal/create-order")
async def paypal_create_order(
    body: PayPalOrderRequest,
    user: dict = Depends(require_auth),
    settings: Settings = Depends(get_settings),
):
    """Create a PayPal order. Frontend uses @paypal/react-paypal-js to render buttons."""
    logger.info("paypal_create_order", user_id=user.get("sub"), plan_id=body.plan_id, amount_cents=body.amount_cents)
    if not settings.paypal_client_id or not settings.paypal_client_secret:
        raise HTTPException(status_code=501, detail="PayPal not configured")

    import httpx

    paypal_base = "https://api-m.sandbox.paypal.com" if settings.paypal_sandbox else "https://api-m.paypal.com"
    auth = (settings.paypal_client_id, settings.paypal_client_secret)
    async with httpx.AsyncClient() as client:
        # Get access token
        token_resp = await client.post(
            f"{paypal_base}/v1/oauth2/token",
            auth=auth,
            data={"grant_type": "client_credentials"},
        )
        access_token = token_resp.json()["access_token"]

        logger.info("paypal_token_obtained")
        # Create order
        amount = f"{body.amount_cents / 100:.2f}"
        order_resp = await client.post(
            f"{paypal_base}/v2/checkout/orders",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {"currency_code": "USD", "value": amount},
                    "custom_id": user.get("sub"),
                }],
            },
        )
        result = order_resp.json()
        logger.info("paypal_create_order_done", order_id=result.get("id"))
        return result


@router.post("/paypal/capture-order")
async def paypal_capture_order(
    request: Request,
    user: dict = Depends(require_auth),
    settings: Settings = Depends(get_settings),
    supa: SupabaseService = Depends(get_supabase_service),
):
    """Capture an approved PayPal order."""
    logger.info("paypal_capture_order", user_id=user.get("sub"))
    if not settings.paypal_client_id or not settings.paypal_client_secret:
        raise HTTPException(status_code=501, detail="PayPal not configured")

    body = await request.json()
    order_id = body.get("order_id")
    plan_id = body.get("plan_id", "")

    import httpx

    paypal_base = "https://api-m.sandbox.paypal.com" if settings.paypal_sandbox else "https://api-m.paypal.com"
    auth = (settings.paypal_client_id, settings.paypal_client_secret)
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            f"{paypal_base}/v1/oauth2/token",
            auth=auth,
            data={"grant_type": "client_credentials"},
        )
        access_token = token_resp.json()["access_token"]

        capture_resp = await client.post(
            f"{paypal_base}/v2/checkout/orders/{order_id}/capture",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        result = capture_resp.json()

    if result.get("status") == "COMPLETED":
        user_id = user.get("sub")
        logger.info("paypal_capture_completed", user_id=user_id, order_id=order_id, plan_id=plan_id)
        credits = PLAN_CREDITS.get(plan_id, 0)
        if credits > 0:
            await supa.add_credits(user_id, credits, f"paypal_{plan_id}")
            await supa.set_plan(user_id, "credits")
        await supa.record_purchase(user_id, {
            "type": "credits_pack",
            "plan_id": plan_id,
            "paypal_order_id": order_id,
            "amount_cents": int(float(result["purchase_units"][0]["payments"]["captures"][0]["amount"]["value"]) * 100),
            "credits_granted": credits,
            "status": "completed",
        })

    logger.info("paypal_capture_order_done", status=result.get("status"))
    return result
