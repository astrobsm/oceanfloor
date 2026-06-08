"""Collaboration API routes: PIN-protected share links + duty tracking."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.engines.collaboration import collaboration_engine
from app.schemas.collaboration import (
    ActivityPublic,
    ActivityRequest,
    ActivityResponse,
    AddParticipantRequest,
    AddParticipantResponse,
    CreateShareRequest,
    CreateShareResponse,
    JoinShareRequest,
    JoinShareResponse,
    ParticipantPublic,
    SetActiveRequest,
    SharePublic,
)

router = APIRouter(prefix="/collab", tags=["Collaboration"])


def _share_to_public(share) -> SharePublic:
    return SharePublic(
        id=share.id,
        project_id=share.project_id,
        project_title=share.project_title,
        created_at=share.created_at,
        active=share.active,
        allowed_steps=share.allowed_steps,
        participants=[
            ParticipantPublic(
                id=p.id, name=p.name, role=p.role, duties=p.duties,
                active=p.active, created_at=p.created_at,
                deactivated_at=p.deactivated_at, last_seen_at=p.last_seen_at,
                entries_count=p.entries_count,
            )
            for p in share.participants
        ],
        activity=[
            ActivityPublic(
                at=e.at, participant_id=e.participant_id,
                participant_name=e.participant_name, kind=e.kind,
                summary=e.summary, payload=e.payload,
            )
            for e in share.activity
        ],
    )


# ---------- supervisor ----------
@router.post("/shares", response_model=CreateShareResponse)
def create_share(
    req: CreateShareRequest,
    db: Session = Depends(get_db),
) -> CreateShareResponse:
    share, supervisor_token = collaboration_engine.create_share(
        db,
        project_id=req.project_id,
        project_title=req.project_title,
        allowed_steps=req.allowed_steps,
    )
    return CreateShareResponse(
        share=_share_to_public(share),
        supervisor_token=supervisor_token,
    )


@router.get("/shares/{share_id}/public", response_model=dict)
def public_share_info(
    share_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Lightweight info for a participant landing page (project title only)."""
    share = collaboration_engine.get_share(db, share_id)
    if not share:
        raise HTTPException(404, "Share link not found")
    return {
        "share_id": share.id,
        "project_title": share.project_title,
        "active": share.active,
        "allowed_steps": share.allowed_steps,
    }


@router.get("/shares/{share_id}", response_model=SharePublic)
def supervisor_view(
    share_id: str,
    x_supervisor_token: str = Header(..., alias="X-Supervisor-Token"),
    db: Session = Depends(get_db),
) -> SharePublic:
    share = collaboration_engine.supervisor_view(db, share_id, x_supervisor_token)
    if not share:
        raise HTTPException(403, "Invalid supervisor token or share id")
    return _share_to_public(share)


@router.post("/shares/{share_id}/participants", response_model=AddParticipantResponse)
def add_participant(
    share_id: str,
    req: AddParticipantRequest,
    x_supervisor_token: str = Header(..., alias="X-Supervisor-Token"),
    db: Session = Depends(get_db),
) -> AddParticipantResponse:
    result = collaboration_engine.add_participant(
        db, share_id, x_supervisor_token, req.name, req.role, req.duties,
    )
    if not result:
        raise HTTPException(403, "Invalid supervisor token or share id")
    participant, pin = result
    return AddParticipantResponse(
        participant=ParticipantPublic(
            id=participant.id, name=participant.name, role=participant.role,
            duties=participant.duties, active=participant.active,
            created_at=participant.created_at,
            deactivated_at=participant.deactivated_at,
            last_seen_at=participant.last_seen_at,
            entries_count=participant.entries_count,
        ),
        pin=pin,
    )


@router.post(
    "/shares/{share_id}/participants/{participant_id}/active",
    response_model=ParticipantPublic,
)
def set_participant_active(
    share_id: str,
    participant_id: str,
    req: SetActiveRequest,
    x_supervisor_token: str = Header(..., alias="X-Supervisor-Token"),
    db: Session = Depends(get_db),
) -> ParticipantPublic:
    p = collaboration_engine.set_active(
        db, share_id, x_supervisor_token, participant_id, req.active,
    )
    if not p:
        raise HTTPException(403, "Invalid supervisor token / share / participant")
    return ParticipantPublic(
        id=p.id, name=p.name, role=p.role, duties=p.duties,
        active=p.active, created_at=p.created_at,
        deactivated_at=p.deactivated_at, last_seen_at=p.last_seen_at,
        entries_count=p.entries_count,
    )


@router.post("/shares/{share_id}/deactivate", response_model=SharePublic)
def deactivate_share(
    share_id: str,
    x_supervisor_token: str = Header(..., alias="X-Supervisor-Token"),
    db: Session = Depends(get_db),
) -> SharePublic:
    share = collaboration_engine.deactivate_share(db, share_id, x_supervisor_token)
    if not share:
        raise HTTPException(403, "Invalid supervisor token or share id")
    return _share_to_public(share)


# ---------- participant ----------
@router.post("/shares/{share_id}/join", response_model=JoinShareResponse)
def join_share(
    share_id: str,
    req: JoinShareRequest,
    db: Session = Depends(get_db),
) -> JoinShareResponse:
    info = collaboration_engine.join(db, share_id, req.name, req.pin)
    if not info:
        raise HTTPException(403, "Invalid PIN, deactivated participant, or closed link.")
    return JoinShareResponse(**info)


@router.post("/shares/{share_id}/activity", response_model=ActivityResponse)
def log_activity(
    share_id: str,
    req: ActivityRequest,
    x_session_token: str = Header(..., alias="X-Session-Token"),
    db: Session = Depends(get_db),
) -> ActivityResponse:
    entry = collaboration_engine.record_activity(
        db, share_id, x_session_token, req.kind, req.summary, req.payload,
    )
    if not entry:
        raise HTTPException(403, "Invalid session token or link is inactive.")
    return ActivityResponse(at=entry.at, kind=entry.kind, summary=entry.summary)
