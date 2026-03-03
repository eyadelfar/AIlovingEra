import asyncio
import secrets

import structlog
from supabase import create_client, Client

logger = structlog.get_logger()


class SupabaseService:
    def __init__(self, url: str, service_key: str):
        self.client: Client = create_client(url, service_key) if url and service_key else None

    def _execute_sync(self, fn):
        """Run a synchronous Supabase call in a thread to avoid blocking the event loop."""
        return asyncio.to_thread(fn)

    async def get_profile(self, user_id: str) -> dict | None:
        if not self.client or not user_id:
            return None
        result = await self._execute_sync(
            lambda: self.client.table("profiles").select("*").eq("id", user_id).single().execute()
        )
        logger.debug("profile_fetched", user_id=user_id)
        return result.data

    async def add_credits(self, user_id: str, amount: int, reason: str):
        if not self.client or not user_id:
            return
        # Atomic increment via RPC
        await self._execute_sync(
            lambda: self.client.rpc("increment_credits", {
                "user_id_input": user_id,
                "amount_input": amount,
            }).execute()
        )
        # Record in ledger
        await self._execute_sync(
            lambda: self.client.table("credit_ledger").insert({
                "user_id": user_id,
                "delta": amount,
                "reason": reason,
            }).execute()
        )
        logger.info("credits_added", user_id=user_id, amount=amount, reason=reason)

    async def use_credit(self, user_id: str) -> bool:
        """Deduct 1 credit atomically. Returns True if successful, False if insufficient."""
        if not self.client:
            return True  # No auth = no gating
        if not user_id:
            return False
        profile = await self.get_profile(user_id)
        if not profile:
            return False
        plan = profile.get("plan", "free")
        if plan in ("monthly_pro", "annual_pro"):
            # Unlimited plan — just record the generation
            await self._execute_sync(
                lambda: self.client.table("credit_ledger").insert({
                    "user_id": user_id,
                    "delta": 0,
                    "reason": "book_generation_pro",
                }).execute()
            )
            return True

        # Atomic decrement: only if credits > 0 (handled in SQL RPC)
        result = await self._execute_sync(
            lambda: self.client.rpc("use_credit", {
                "user_id_input": user_id,
            }).execute()
        )
        success = result.data if result.data is not None else False

        if success:
            logger.info("credit_used", user_id=user_id)
            # Record in ledger
            await self._execute_sync(
                lambda: self.client.table("credit_ledger").insert({
                    "user_id": user_id,
                    "delta": -1,
                    "reason": "book_generation",
                }).execute()
            )
            # Atomic increment of books_created
            await self._execute_sync(
                lambda: self.client.rpc("increment_books_created", {
                    "user_id_input": user_id,
                }).execute()
            )
        else:
            logger.warning("credit_use_failed_insufficient", user_id=user_id)

        return success

    async def refund_credit(self, user_id: str, reason: str = "generation_failed"):
        """Refund 1 credit atomically (e.g., after a failed generation)."""
        if not self.client or not user_id:
            return
        await self._execute_sync(
            lambda: self.client.rpc("refund_credit", {
                "user_id_input": user_id,
            }).execute()
        )
        await self._execute_sync(
            lambda: self.client.table("credit_ledger").insert({
                "user_id": user_id,
                "delta": 1,
                "reason": reason,
            }).execute()
        )
        logger.info("credit_refunded", user_id=user_id, reason=reason)

    async def set_plan(self, user_id: str, plan: str):
        if not self.client:
            return
        await self._execute_sync(
            lambda: self.client.table("profiles").update({"plan": plan}).eq("id", user_id).execute()
        )

    async def set_stripe_customer(self, user_id: str, customer_id: str):
        if not self.client:
            return
        await self._execute_sync(
            lambda: self.client.table("profiles").update({"stripe_customer_id": customer_id}).eq("id", user_id).execute()
        )

    async def get_credits(self, user_id: str) -> int:
        if not self.client:
            return 999
        profile = await self.get_profile(user_id)
        if not profile:
            return 0
        plan = profile.get("plan", "free")
        if plan in ("monthly_pro", "annual_pro"):
            return -1  # Unlimited sentinel
        return profile.get("credits", 0)

    async def record_purchase(self, user_id: str, purchase_data: dict):
        if not self.client:
            return
        await self._execute_sync(
            lambda: self.client.table("purchases").insert({
                "user_id": user_id,
                **purchase_data,
            }).execute()
        )
        logger.info("purchase_recorded", user_id=user_id, plan_id=purchase_data.get("plan_id"))

    # ── Generation History ────────────────────────────────────────────────

    async def record_generation_start(
        self, user_id: str | None, generation_id: str, template_slug: str, num_photos: int,
        wizard_inputs: dict | None = None,
    ):
        """Record the start of a book generation for history/debugging."""
        if not self.client or not user_id:
            return
        try:
            await self._execute_sync(
                lambda: self.client.table("generation_history").insert({
                    "user_id": user_id,
                    "generation_id": generation_id,
                    "template_slug": template_slug,
                    "num_photos": num_photos,
                    "status": "started",
                    "wizard_inputs": wizard_inputs,
                }).execute()
            )
        except Exception:
            logger.warning("generation_history_insert_failed", exc_info=True)

    async def record_generation_complete(
        self, generation_id: str, num_pages: int, duration_ms: int,
        status: str = "completed",
    ):
        """Mark a generation as completed (or preview)."""
        if not self.client:
            return
        try:
            await self._execute_sync(
                lambda: self.client.table("generation_history")
                .update({
                    "status": status,
                    "num_pages": num_pages,
                    "duration_ms": duration_ms,
                    "completed_at": "now()",
                })
                .eq("generation_id", generation_id)
                .execute()
            )
        except Exception:
            logger.warning("generation_history_update_failed", exc_info=True)

    async def record_generation_failed(self, generation_id: str, error_message: str):
        """Mark a generation as failed."""
        if not self.client:
            return
        try:
            await self._execute_sync(
                lambda: self.client.table("generation_history")
                .update({
                    "status": "failed",
                    "error_message": error_message[:500],
                    "completed_at": "now()",
                })
                .eq("generation_id", generation_id)
                .execute()
            )
        except Exception:
            logger.warning("generation_history_update_failed", exc_info=True)

    # ── Payment Audit Log ─────────────────────────────────────────────────

    async def log_payment_event(self, user_id: str | None, event_type: str, payload: dict | None = None):
        """Record a payment-related event for auditing."""
        if not self.client:
            return
        try:
            await self._execute_sync(
                lambda: self.client.table("payment_audit_log").insert({
                    "user_id": user_id,
                    "event_type": event_type,
                    "payload": payload,
                }).execute()
            )
        except Exception:
            logger.warning("payment_audit_log_failed", exc_info=True)

    # ── Profile Management ─────────────────────────────────────────────────

    async def update_profile(self, user_id: str, data: dict):
        if not self.client or not user_id:
            return
        data["updated_at"] = "now()"
        await self._execute_sync(
            lambda: self.client.table("profiles").update(data).eq("id", user_id).execute()
        )
        logger.info("profile_updated", user_id=user_id, fields=list(data.keys()))

    async def upload_avatar(self, user_id: str, file_bytes: bytes, content_type: str) -> str:
        if not self.client:
            return ""
        ext = content_type.split("/")[-1] if "/" in content_type else "jpg"
        path = f"{user_id}/avatar.{ext}"
        await self._execute_sync(
            lambda: self.client.storage.from_("avatars").upload(
                path, file_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )
        )
        public_url = self.client.storage.from_("avatars").get_public_url(path)
        await self.update_profile(user_id, {"avatar_url": public_url})
        return public_url

    async def change_user_password(self, user_id: str, new_password: str):
        if not self.client:
            return
        await self._execute_sync(
            lambda: self.client.auth.admin.update_user_by_id(
                user_id, {"password": new_password}
            )
        )
        logger.info("password_changed", user_id=user_id)

    async def delete_user_account(self, user_id: str):
        if not self.client:
            return
        await self._execute_sync(
            lambda: self.client.auth.admin.delete_user(user_id)
        )
        logger.info("account_deleted", user_id=user_id)

    # ── Usage / History ────────────────────────────────────────────────────

    async def get_generation_history(self, user_id: str, limit: int = 50) -> list:
        if not self.client or not user_id:
            return []
        result = await self._execute_sync(
            lambda: self.client.table("generation_history")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []

    async def get_credit_history(self, user_id: str, limit: int = 100) -> list:
        if not self.client or not user_id:
            return []
        result = await self._execute_sync(
            lambda: self.client.table("credit_ledger")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []

    # ── Contact ────────────────────────────────────────────────────────────

    async def create_contact_submission(self, data: dict):
        if not self.client:
            return
        await self._execute_sync(
            lambda: self.client.table("contact_submissions").insert(data).execute()
        )
        logger.info("contact_submitted", email=data.get("email"))

    # ── Referral System ────────────────────────────────────────────────────

    async def get_or_create_referral_code(self, user_id: str) -> str:
        if not self.client:
            return ""
        profile = await self.get_profile(user_id)
        if profile and profile.get("referral_code"):
            return profile["referral_code"]

        code = secrets.token_urlsafe(6)
        await self._execute_sync(
            lambda: self.client.table("profiles")
            .update({"referral_code": code})
            .eq("id", user_id)
            .execute()
        )
        return code

    async def get_referral_stats(self, user_id: str) -> dict:
        if not self.client or not user_id:
            return {"total_referrals": 0, "credits_earned": 0, "referrals": []}
        result = await self._execute_sync(
            lambda: self.client.table("referrals")
            .select("*")
            .eq("referrer_id", user_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        referrals = result.data or []
        total = len(referrals)
        credits_earned = sum(r.get("credits_awarded", 0) for r in referrals)
        return {
            "total_referrals": total,
            "credits_earned": credits_earned,
            "referrals": referrals,
        }

    async def process_referral(self, referred_user_id: str, referral_code: str, credits: int = 1) -> bool:
        if not self.client:
            return False
        try:
            result = await self._execute_sync(
                lambda: self.client.rpc("process_referral", {
                    "referred_user_id_input": referred_user_id,
                    "referral_code_input": referral_code,
                    "credits_per_referral": credits,
                }).execute()
            )
            success = result.data if result.data is not None else False
            if success:
                logger.info("referral_processed", referred_user_id=referred_user_id, code=referral_code)
            return success
        except Exception:
            logger.warning("referral_processing_failed", exc_info=True)
            return False

    # ── Book Drafts ────────────────────────────────────────────────────────

    async def list_drafts(self, user_id: str, limit: int = 50) -> list:
        if not self.client or not user_id:
            return []
        result = await self._execute_sync(
            lambda: self.client.table("book_drafts")
            .select("id, title, template_slug, status, num_photos, num_pages, updated_at, created_at")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []

    async def get_draft(self, draft_id: str, user_id: str) -> dict | None:
        if not self.client:
            return None
        result = await self._execute_sync(
            lambda: self.client.table("book_drafts")
            .select("*")
            .eq("id", draft_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data

    async def create_draft(self, user_id: str, data: dict) -> dict:
        if not self.client:
            return {}
        data["user_id"] = user_id
        result = await self._execute_sync(
            lambda: self.client.table("book_drafts").insert(data).execute()
        )
        return result.data[0] if result.data else {}

    async def update_draft(self, draft_id: str, user_id: str, data: dict) -> dict:
        if not self.client:
            return {}
        data["updated_at"] = "now()"
        data["last_auto_saved_at"] = "now()"
        result = await self._execute_sync(
            lambda: self.client.table("book_drafts")
            .update(data)
            .eq("id", draft_id)
            .eq("user_id", user_id)
            .execute()
        )
        return result.data[0] if result.data else {}

    async def delete_draft(self, draft_id: str, user_id: str):
        if not self.client:
            return
        await self._execute_sync(
            lambda: self.client.table("book_drafts")
            .delete()
            .eq("id", draft_id)
            .eq("user_id", user_id)
            .execute()
        )
        # Also delete associated photos from storage
        try:
            await self._execute_sync(
                lambda: self.client.storage.from_("book-photos").remove(
                    [f"{user_id}/{draft_id}/"]
                )
            )
        except Exception:
            logger.warning("draft_photos_cleanup_failed", draft_id=draft_id, exc_info=True)

    async def upload_draft_photo(self, user_id: str, draft_id: str, photo_index: int,
                                  file_bytes: bytes, content_type: str, original_name: str = "") -> str:
        if not self.client:
            return ""
        ext = content_type.split("/")[-1] if "/" in content_type else "jpg"
        path = f"{user_id}/{draft_id}/{photo_index}.{ext}"
        await self._execute_sync(
            lambda: self.client.storage.from_("book-photos").upload(
                path, file_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )
        )
        # Record in book_draft_photos
        await self._execute_sync(
            lambda: self.client.table("book_draft_photos").upsert({
                "draft_id": draft_id,
                "user_id": user_id,
                "photo_index": photo_index,
                "original_name": original_name,
                "storage_path": path,
                "mime_type": content_type,
                "file_size_bytes": len(file_bytes),
            }, on_conflict="draft_id,photo_index").execute()
        )
        return path

    # ── PDF Download Tracking ──────────────────────────────────────────────

    async def record_pdf_download(self, user_id: str | None, data: dict):
        if not self.client:
            return
        try:
            await self._execute_sync(
                lambda: self.client.table("pdf_downloads").insert({
                    "user_id": user_id,
                    **data,
                }).execute()
            )
            logger.info("pdf_download_recorded", user_id=user_id)
        except Exception:
            logger.warning("pdf_download_record_failed", exc_info=True)

    # ── Event Tracking ─────────────────────────────────────────────────────

    async def batch_insert_events(self, events: list[dict]):
        if not self.client or not events:
            return
        try:
            await self._execute_sync(
                lambda: self.client.table("events").insert(events).execute()
            )
        except Exception:
            logger.warning("batch_event_insert_failed", count=len(events), exc_info=True)

    async def track_event(self, user_id: str | None, event_type: str, category: str, payload: dict = None):
        if not self.client:
            return
        try:
            await self._execute_sync(
                lambda: self.client.table("events").insert({
                    "user_id": user_id,
                    "event_type": event_type,
                    "event_category": category,
                    "payload": payload or {},
                }).execute()
            )
        except Exception:
            logger.warning("event_track_failed", exc_info=True)

    # ── Ban Check ──────────────────────────────────────────────────────────

    async def is_user_banned(self, user_id: str) -> tuple[bool, str | None]:
        if not self.client or not user_id:
            return False, None
        profile = await self.get_profile(user_id)
        if profile and profile.get("banned_at"):
            return True, profile.get("ban_reason")
        return False, None
