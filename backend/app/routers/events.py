import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.dependencies import get_supabase_service
from app.services.supabase_service import SupabaseService

logger = structlog.get_logger()

router = APIRouter(prefix="/api/events", tags=["events"])


class EventItem(BaseModel):
    event_type: str
    event_category: str
    payload: dict = {}
    page_path: str | None = None
    device_type: str | None = None
    session_id: str | None = None


class TrackEventsRequest(BaseModel):
    events: list[EventItem]


@router.post("/track")
async def track_events(
    body: TrackEventsRequest,
    user: dict | None = Depends(get_current_user),
    supa: SupabaseService = Depends(get_supabase_service),
):
    logger.info("track_events", event_count=len(body.events), user_id=user.get("sub") if user else None)
    if len(body.events) > 50:
        raise HTTPException(422, "Maximum 50 events per batch")

    user_id = user.get("sub") if user else None
    rows = []
    for evt in body.events:
        rows.append({
            "user_id": user_id,
            "event_type": evt.event_type,
            "event_category": evt.event_category,
            "payload": evt.payload,
            "page_path": evt.page_path,
            "device_type": evt.device_type,
            "session_id": evt.session_id,
        })

    await supa.batch_insert_events(rows)
    logger.info("track_events_done", inserted=len(rows))
    return {"ok": True, "count": len(rows)}
