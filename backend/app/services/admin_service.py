import time
from datetime import datetime, timezone

import structlog
from app.middleware.auth import clear_ban_cache
from app.services.supabase_service import SupabaseService

logger = structlog.get_logger()


class AdminService:
    def __init__(self, supa: SupabaseService):
        self.supa = supa
        self._start_time = time.time()

    # ── Dashboard ────────────────────────────────────────────────────────

    async def get_dashboard_stats(self) -> dict:
        logger.info("get_dashboard_stats")
        result = await self.supa._execute_sync(
            lambda: self.supa.client.rpc("admin_get_dashboard_stats").execute()
        )
        logger.info("get_dashboard_stats_done")
        return result.data or {}

    async def get_revenue_timeseries(self, days: int = 30) -> list:
        logger.info("get_revenue_timeseries", days=days)
        result = await self.supa._execute_sync(
            lambda: self.supa.client.rpc("admin_revenue_timeseries", {"days_input": days}).execute()
        )
        logger.info("get_revenue_timeseries_done", count=len(result.data or []))
        return result.data or []

    async def get_user_growth_timeseries(self, days: int = 30) -> list:
        logger.info("get_user_growth_timeseries", days=days)
        result = await self.supa._execute_sync(
            lambda: self.supa.client.rpc("admin_user_growth_timeseries", {"days_input": days}).execute()
        )
        return result.data or []

    async def get_generation_timeseries(self, days: int = 30) -> list:
        logger.info("get_generation_timeseries", days=days)
        result = await self.supa._execute_sync(
            lambda: self.supa.client.rpc("admin_generation_timeseries", {"days_input": days}).execute()
        )
        return result.data or []

    async def get_template_popularity(self, limit: int = 10) -> list:
        logger.info("get_template_popularity", limit=limit)
        result = await self.supa._execute_sync(
            lambda: self.supa.client.rpc("admin_template_popularity", {"limit_input": limit}).execute()
        )
        return result.data or []

    # ── Users ────────────────────────────────────────────────────────────

    async def list_users(self, page: int = 1, per_page: int = 20, search: str = "",
                         plan: str = "", role: str = "", sort: str = "created_at") -> dict:
        logger.info("list_users", page=page, search=search, plan=plan, role=role, sort=sort)
        query = self.supa.client.table("profiles").select("*", count="exact")

        if search:
            query = query.or_(f"display_name.ilike.%{search}%,id.eq.{search}" if len(search) == 36 else f"display_name.ilike.%{search}%")
        if plan:
            query = query.eq("plan", plan)
        if role:
            query = query.eq("role", role)

        desc = sort.startswith("-")
        sort_col = sort.lstrip("-") if desc else sort
        query = query.order(sort_col, desc=desc)
        offset = (page - 1) * per_page
        query = query.range(offset, offset + per_page - 1)

        result = await self.supa._execute_sync(lambda: query.execute())
        logger.info("list_users_done", total=result.count or 0, page=page)
        return {"users": result.data or [], "total": result.count or 0, "page": page}

    async def get_user_detail(self, user_id: str) -> dict:
        logger.info("get_user_detail", user_id=user_id)
        profile = await self.supa.get_profile(user_id)
        if not profile:
            logger.warning("get_user_detail_not_found", user_id=user_id)
            return None

        purchases_result = await self.supa._execute_sync(
            lambda: self.supa.client.table("purchases").select("*")
            .eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
        )
        generations_result = await self.supa._execute_sync(
            lambda: self.supa.client.table("generation_history").select("*")
            .eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
        )
        credits_result = await self.supa._execute_sync(
            lambda: self.supa.client.table("credit_ledger").select("*")
            .eq("user_id", user_id).order("created_at", desc=True).limit(100).execute()
        )

        return {
            "profile": profile,
            "purchases": purchases_result.data or [],
            "generations": generations_result.data or [],
            "credit_history": credits_result.data or [],
        }

    async def update_user(self, user_id: str, data: dict):
        allowed = {k: v for k, v in data.items() if k in ("plan", "display_name")}
        logger.info("update_user", user_id=user_id, fields=list(allowed.keys()))
        if allowed:
            await self.supa.update_profile(user_id, allowed)
            logger.info("update_user_done", user_id=user_id)

    async def adjust_credits(self, user_id: str, amount: int, reason: str):
        logger.info("adjust_credits", user_id=user_id, amount=amount, reason=reason)
        await self.supa.add_credits(user_id, amount, f"admin_adjustment: {reason}")
        logger.info("adjust_credits_done", user_id=user_id, amount=amount)

    async def ban_user(self, user_id: str, reason: str):
        logger.info("ban_user", user_id=user_id, reason=reason)
        await self.supa._execute_sync(
            lambda: self.supa.client.table("profiles").update({
                "banned_at": datetime.now(timezone.utc).isoformat(),
                "ban_reason": reason,
            }).eq("id", user_id).execute()
        )
        clear_ban_cache(user_id)
        logger.info("ban_user_done", user_id=user_id)

    async def unban_user(self, user_id: str):
        logger.info("unban_user", user_id=user_id)
        await self.supa._execute_sync(
            lambda: self.supa.client.table("profiles").update({
                "banned_at": None,
                "ban_reason": None,
            }).eq("id", user_id).execute()
        )
        clear_ban_cache(user_id)
        logger.info("unban_user_done", user_id=user_id)

    async def change_user_role(self, user_id: str, role: str):
        logger.info("change_user_role", user_id=user_id, role=role)
        if role not in ("user", "admin", "moderator"):
            raise ValueError(f"Invalid role: {role}")
        await self.supa._execute_sync(
            lambda: self.supa.client.table("profiles").update({"role": role}).eq("id", user_id).execute()
        )
        logger.info("change_user_role_done", user_id=user_id, role=role)

    # ── Revenue ──────────────────────────────────────────────────────────

    async def list_purchases(self, page: int = 1, per_page: int = 20,
                             user_id: str = "", status: str = "", plan_id: str = "") -> dict:
        logger.info("list_purchases", page=page, user_id=user_id, status=status, plan_id=plan_id)
        query = self.supa.client.table("purchases").select("*", count="exact")
        if user_id:
            query = query.eq("user_id", user_id)
        if status:
            query = query.eq("status", status)
        if plan_id:
            query = query.eq("plan_id", plan_id)
        query = query.order("created_at", desc=True)
        offset = (page - 1) * per_page
        query = query.range(offset, offset + per_page - 1)

        result = await self.supa._execute_sync(lambda: query.execute())
        return {"purchases": result.data or [], "total": result.count or 0}

    async def refund_purchase(self, purchase_id: str, reason: str, admin_id: str):
        logger.info("refund_purchase", purchase_id=purchase_id, admin_id=admin_id)
        await self.supa._execute_sync(
            lambda: self.supa.client.table("purchases").update({
                "status": "refunded",
                "refunded_at": datetime.now(timezone.utc).isoformat(),
                "refund_reason": reason,
                "refunded_by": admin_id,
            }).eq("id", purchase_id).execute()
        )
        logger.info("refund_purchase_done", purchase_id=purchase_id)

    async def get_payment_audit_log(self, page: int = 1, per_page: int = 20, event_type: str = "") -> dict:
        logger.info("get_payment_audit_log", page=page, event_type=event_type)
        query = self.supa.client.table("payment_audit_log").select("*", count="exact")
        if event_type:
            query = query.eq("event_type", event_type)
        query = query.order("created_at", desc=True)
        offset = (page - 1) * per_page
        query = query.range(offset, offset + per_page - 1)

        result = await self.supa._execute_sync(lambda: query.execute())
        return {"entries": result.data or [], "total": result.count or 0}

    # ── Content ──────────────────────────────────────────────────────────

    async def list_design_submissions(self, page: int = 1, per_page: int = 20, status: str = "") -> dict:
        logger.info("list_design_submissions", page=page, status=status)
        query = self.supa.client.table("design_submissions").select("*", count="exact")
        if status:
            query = query.eq("status", status)
        query = query.order("submitted_at", desc=True)
        offset = (page - 1) * per_page
        query = query.range(offset, offset + per_page - 1)

        result = await self.supa._execute_sync(lambda: query.execute())
        return {"submissions": result.data or [], "total": result.count or 0}

    async def review_design_submission(self, submission_id: str, action: str, admin_notes: str = ""):
        logger.info("review_design_submission", submission_id=submission_id, action=action)
        if action not in ("approved", "rejected"):
            raise ValueError(f"Invalid action: {action}")
        await self.supa._execute_sync(
            lambda: self.supa.client.table("design_submissions").update({
                "status": action,
                "admin_notes": admin_notes,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", submission_id).execute()
        )

    async def list_contacts(self, page: int = 1, per_page: int = 20, status: str = "") -> dict:
        logger.info("list_contacts", page=page, status=status)
        query = self.supa.client.table("contact_submissions").select("*", count="exact")
        if status:
            query = query.eq("status", status)
        query = query.order("created_at", desc=True)
        offset = (page - 1) * per_page
        query = query.range(offset, offset + per_page - 1)

        result = await self.supa._execute_sync(lambda: query.execute())
        return {"contacts": result.data or [], "total": result.count or 0}

    async def update_contact(self, contact_id: str, status: str, admin_response: str = "", admin_id: str = ""):
        logger.info("update_contact", contact_id=contact_id, status=status, admin_id=admin_id)
        update = {"status": status}
        if admin_response:
            update["admin_response"] = admin_response
            update["responded_at"] = datetime.now(timezone.utc).isoformat()
            update["responded_by"] = admin_id
        await self.supa._execute_sync(
            lambda: self.supa.client.table("contact_submissions").update(update).eq("id", contact_id).execute()
        )

    # ── System ───────────────────────────────────────────────────────────

    async def get_generation_error_summary(self, limit: int = 20) -> list:
        logger.info("get_generation_error_summary", limit=limit)
        result = await self.supa._execute_sync(
            lambda: self.supa.client.table("generation_history").select("id, error_message, template_slug, created_at")
            .eq("status", "failed").order("created_at", desc=True).limit(limit).execute()
        )
        return result.data or []

    async def log_action(self, admin_id: str, action: str, target_type: str = "",
                         target_id: str = "", details: dict = None, ip_address: str = ""):
        logger.info("log_action", admin_id=admin_id, action=action, target_type=target_type, target_id=target_id)
        await self.supa._execute_sync(
            lambda: self.supa.client.table("admin_audit_log").insert({
                "admin_id": admin_id,
                "action": action,
                "target_type": target_type,
                "target_id": target_id,
                "details": details,
                "ip_address": ip_address,
            }).execute()
        )

    async def list_audit_log(self, page: int = 1, per_page: int = 20, action: str = "") -> dict:
        logger.info("list_audit_log", page=page, action=action)
        query = self.supa.client.table("admin_audit_log").select("*", count="exact")
        if action:
            query = query.eq("action", action)
        query = query.order("created_at", desc=True)
        offset = (page - 1) * per_page
        query = query.range(offset, offset + per_page - 1)

        result = await self.supa._execute_sync(lambda: query.execute())
        return {"entries": result.data or [], "total": result.count or 0}

    # ── Analytics ─────────────────────────────────────────────────────────

    async def get_funnel_stats(self, days: int = 30) -> dict:
        logger.info("get_funnel_stats", days=days)
        result = await self.supa._execute_sync(
            lambda: self.supa.client.rpc("admin_funnel_stats", {"days_input": days}).execute()
        )
        return result.data or {}

    async def get_event_stats(self, days: int = 30) -> list:
        logger.info("get_event_stats", days=days)
        result = await self.supa._execute_sync(
            lambda: self.supa.client.rpc("admin_event_stats", {"days_input": days}).execute()
        )
        return result.data or []

    async def get_wizard_funnel(self, days: int = 30) -> list:
        logger.info("get_wizard_funnel", days=days)
        result = await self.supa._execute_sync(
            lambda: self.supa.client.rpc("admin_wizard_funnel", {"days_input": days}).execute()
        )
        return result.data or []

    async def get_pdf_stats(self, days: int = 30) -> dict:
        logger.info("get_pdf_stats", days=days)
        result = await self.supa._execute_sync(
            lambda: self.supa.client.rpc("admin_pdf_stats", {"days_input": days}).execute()
        )
        return result.data or {}
