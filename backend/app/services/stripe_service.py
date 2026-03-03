import time

import structlog
import stripe
from app.config import Settings

logger = structlog.get_logger()

# Plan ID → credits granted on purchase
PLAN_CREDITS = {
    "single_book": 1,
    "starter_3": 3,
    "creator_10": 10,
}

SUBSCRIPTION_PLANS = {"monthly_pro", "annual_pro"}


class StripeService:
    def __init__(self, settings: Settings):
        self.api_key = settings.stripe_api_key
        self.webhook_secret = settings.stripe_webhook_secret
        self.frontend_url = settings.frontend_url

        # Map plan_id → Stripe price ID
        self.price_map = {
            "single_book": settings.stripe_price_single,
            "starter_3": settings.stripe_price_starter,
            "creator_10": settings.stripe_price_creator,
            "monthly_pro": settings.stripe_price_monthly,
            "annual_pro": settings.stripe_price_annual,
        }

        if self.api_key:
            stripe.api_key = self.api_key

    def create_checkout_session(
        self, plan_id: str, user_id: str, user_email: str
    ) -> str:
        """Create a Stripe Checkout Session and return the URL."""
        if not self.api_key:
            raise ValueError("Stripe not configured")

        price_id = self.price_map.get(plan_id)
        if not price_id:
            raise ValueError(f"Unknown plan: {plan_id}")

        is_subscription = plan_id in SUBSCRIPTION_PLANS
        mode = "subscription" if is_subscription else "payment"

        # Idempotency key prevents duplicate charges on network retries (1-minute window)
        idempotency_key = f"{user_id}_{plan_id}_{int(time.time() // 60)}"

        session = stripe.checkout.Session.create(
            mode=mode,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{self.frontend_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{self.frontend_url}/checkout/cancel",
            client_reference_id=user_id,
            customer_email=user_email,
            metadata={"plan_id": plan_id, "user_id": user_id},
            allow_promotion_codes=True,
            idempotency_key=idempotency_key,
        )
        return session.url

    def verify_webhook(self, payload: bytes, sig_header: str) -> dict:
        """Verify and parse a Stripe webhook event."""
        if not self.webhook_secret:
            raise ValueError("Webhook secret not configured")
        event = stripe.Webhook.construct_event(payload, sig_header, self.webhook_secret)
        return event

    def get_session(self, session_id: str) -> dict:
        """Retrieve a checkout session by ID."""
        return stripe.checkout.Session.retrieve(session_id)
