"""Collaboration engine: PIN-protected shareable links + duty/activity tracking.

A project supervisor can:
  - mint a share link for a project with a 6-digit PIN
  - issue named participant slots with their own role and duty scope
  - manually activate / deactivate any participant
  - see a live activity log (entries written via the participant API)

State is persisted to Postgres so the feature survives serverless cold
starts and works across instances (Supabase / Vercel deploy).

Security model:
  - supervisor token: only known to the supervisor (used in headers as
    `X-Supervisor-Token`); minted when the share link is created.
  - participant PIN: 6 digits, exchanged for a short-lived participant
    session token via POST /collab/{share_id}/join. PINs are stored
    hashed.
  - PINs and tokens give *write access scoped to a single project and
    role*. They do not authorise reading any other project.

No raw PINs are ever sent back over the API after creation.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.collaboration import (
    CollabActivity,
    CollabParticipant,
    CollabShare,
)


# Maximum activity entries retained per share (trimmed on each insert).
MAX_ACTIVITY_PER_SHARE = 500


def _now() -> int:
    return int(datetime.now(tz=timezone.utc).timestamp() * 1000)


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class CollaborationEngine:
    """Stateless facade over the collab_* tables. All methods take a DB session."""

    # ---------- supervisor surface ----------
    def create_share(
        self,
        db: Session,
        project_id: str,
        project_title: str,
        allowed_steps: list[str] | None = None,
    ) -> tuple[CollabShare, str]:
        """Mint a share link. Returns (share, supervisor_token) - the token
        is shown ONCE to the supervisor and must be stored client-side.
        """
        share_id = secrets.token_urlsafe(9)
        supervisor_token = secrets.token_urlsafe(24)
        share = CollabShare(
            id=share_id,
            project_id=project_id,
            project_title=project_title,
            supervisor_token_hash=_hash(supervisor_token),
            created_at=_now(),
            active=True,
            allowed_steps=allowed_steps or ["data", "questionnaire", "literature"],
        )
        db.add(share)
        db.commit()
        db.refresh(share)
        return share, supervisor_token

    def get_share(self, db: Session, share_id: str) -> CollabShare | None:
        return db.get(CollabShare, share_id)

    def supervisor_view(
        self, db: Session, share_id: str, supervisor_token: str,
    ) -> CollabShare | None:
        share = db.get(CollabShare, share_id)
        if not share or share.supervisor_token_hash != _hash(supervisor_token):
            return None
        return share

    def add_participant(
        self,
        db: Session,
        share_id: str,
        supervisor_token: str,
        name: str,
        role: str,
        duties: list[str] | None = None,
    ) -> tuple[CollabParticipant, str] | None:
        """Add a participant. Returns (participant, pin) - PIN shown once."""
        share = self.supervisor_view(db, share_id, supervisor_token)
        if not share:
            return None
        pid = secrets.token_urlsafe(6)
        pin = f"{secrets.randbelow(900_000) + 100_000}"  # 6-digit numeric
        p = CollabParticipant(
            id=pid,
            share_id=share.id,
            name=name.strip() or "Participant",
            role=role.strip() or "data_entry_clerk",
            duties=duties or [],
            pin_hash=_hash(pin),
            active=True,
            created_at=_now(),
        )
        db.add(p)
        self._log(
            db, share, p, "session_start",
            f"Participant added with role '{p.role}'.",
            payload={"by": "supervisor"},
        )
        db.commit()
        db.refresh(p)
        return p, pin

    def set_active(
        self,
        db: Session,
        share_id: str,
        supervisor_token: str,
        participant_id: str,
        active: bool,
    ) -> CollabParticipant | None:
        share = self.supervisor_view(db, share_id, supervisor_token)
        if not share:
            return None
        p = db.get(CollabParticipant, participant_id)
        if not p or p.share_id != share.id:
            return None
        p.active = active
        p.deactivated_at = _now() if not active else None
        self._log(
            db, share, p,
            "session_end" if not active else "session_start",
            "Manually deactivated by supervisor." if not active
            else "Reactivated by supervisor.",
            payload={"by": "supervisor"},
        )
        db.commit()
        db.refresh(p)
        return p

    def deactivate_share(
        self, db: Session, share_id: str, supervisor_token: str,
    ) -> CollabShare | None:
        share = self.supervisor_view(db, share_id, supervisor_token)
        if not share:
            return None
        share.active = False
        db.commit()
        db.refresh(share)
        return share

    # ---------- participant surface ----------
    def join(
        self, db: Session, share_id: str, name: str, pin: str,
    ) -> dict | None:
        share = db.get(CollabShare, share_id)
        if not share or not share.active:
            return None
        wanted = _hash(pin)
        target = next(
            (p for p in share.participants if p.pin_hash == wanted and p.active),
            None,
        )
        if not target:
            return None
        session_token = secrets.token_urlsafe(24)
        target.last_session_token_hash = _hash(session_token)
        target.last_seen_at = _now()
        self._log(
            db, share, target, "session_start",
            f"{target.name} joined as {target.role}.",
            payload={"name": name},
        )
        db.commit()
        return {
            "session_token": session_token,
            "participant_id": target.id,
            "participant_name": target.name,
            "project_id": share.project_id,
            "project_title": share.project_title,
            "role": target.role,
            "duties": target.duties,
            "allowed_steps": share.allowed_steps,
        }

    def record_activity(
        self,
        db: Session,
        share_id: str,
        session_token: str,
        kind: str,
        summary: str,
        payload: dict | None = None,
    ) -> CollabActivity | None:
        share = db.get(CollabShare, share_id)
        if not share or not share.active:
            return None
        wanted = _hash(session_token)
        target = db.execute(
            select(CollabParticipant).where(
                CollabParticipant.share_id == share.id,
                CollabParticipant.last_session_token_hash == wanted,
                CollabParticipant.active.is_(True),
            )
        ).scalar_one_or_none()
        if not target:
            return None
        target.last_seen_at = _now()
        if kind in ("data_entry", "upload", "edit"):
            target.entries_count += 1
        entry = self._log(db, share, target, kind, summary, payload)
        db.commit()
        db.refresh(entry)
        return entry

    def _log(
        self,
        db: Session,
        share: CollabShare,
        participant: CollabParticipant,
        kind: str,
        summary: str,
        payload: dict | None = None,
    ) -> CollabActivity:
        entry = CollabActivity(
            share_id=share.id,
            at=_now(),
            participant_id=participant.id,
            participant_name=participant.name,
            kind=kind,
            summary=summary,
            payload=payload,
        )
        db.add(entry)
        # Trim oldest if we exceed the cap. share.activity is loaded via
        # `selectin` so it's a list of already-loaded rows.
        overflow = len(share.activity) + 1 - MAX_ACTIVITY_PER_SHARE
        if overflow > 0:
            for stale in share.activity[:overflow]:
                db.delete(stale)
        return entry


collaboration_engine = CollaborationEngine()
