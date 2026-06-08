"""SQLAlchemy models for the PIN-protected collaboration feature.

Persisted across requests / serverless cold starts so a Vercel + Supabase
deployment retains share state. Mirrors the in-memory dataclasses that
previously lived in `app/engines/collaboration.py`.
"""
from __future__ import annotations

from sqlalchemy import JSON, BigInteger, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CollabShare(Base):
    __tablename__ = "collab_shares"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    project_title: Mapped[str] = mapped_column(String(512), nullable=False)
    supervisor_token_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allowed_steps: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    participants: Mapped[list["CollabParticipant"]] = relationship(
        back_populates="share",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    activity: Mapped[list["CollabActivity"]] = relationship(
        back_populates="share",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="CollabActivity.at.asc()",
    )


class CollabParticipant(Base):
    __tablename__ = "collab_participants"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    share_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("collab_shares.id", ondelete="CASCADE"), index=True, nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(128), nullable=False)
    duties: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    pin_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    deactivated_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    last_seen_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    last_session_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    entries_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    share: Mapped[CollabShare] = relationship(back_populates="participants")


class CollabActivity(Base):
    __tablename__ = "collab_activity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    share_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("collab_shares.id", ondelete="CASCADE"), index=True, nullable=False,
    )
    at: Mapped[int] = mapped_column(BigInteger, index=True, nullable=False)
    participant_id: Mapped[str] = mapped_column(String(64), nullable=False)
    participant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    share: Mapped[CollabShare] = relationship(back_populates="activity")
