"""Schemas for the collaboration engine (shareable project links + PIN access)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ParticipantPublic(BaseModel):
    id: str
    name: str
    role: str
    duties: list[str]
    active: bool
    created_at: int
    deactivated_at: int | None = None
    last_seen_at: int | None = None
    entries_count: int = 0


class ActivityPublic(BaseModel):
    at: int
    participant_id: str
    participant_name: str
    kind: str
    summary: str
    payload: dict | None = None


class SharePublic(BaseModel):
    id: str
    project_id: str
    project_title: str
    created_at: int
    active: bool
    allowed_steps: list[str]
    participants: list[ParticipantPublic]
    activity: list[ActivityPublic]


# ---------- supervisor requests ----------
class CreateShareRequest(BaseModel):
    project_id: str
    project_title: str
    allowed_steps: list[str] = Field(
        default_factory=lambda: ["data", "questionnaire", "literature"]
    )


class CreateShareResponse(BaseModel):
    share: SharePublic
    supervisor_token: str = Field(
        ..., description="Show this once to the supervisor; cannot be recovered."
    )


class AddParticipantRequest(BaseModel):
    name: str
    role: Literal[
        "data_collector",
        "data_entry_clerk",
        "analyst",
        "reviewer",
        "co_investigator",
    ] = "data_entry_clerk"
    duties: list[str] = Field(default_factory=list)


class AddParticipantResponse(BaseModel):
    participant: ParticipantPublic
    pin: str = Field(..., description="6-digit PIN; show once to the supervisor.")


class SetActiveRequest(BaseModel):
    active: bool


# ---------- participant requests ----------
class JoinShareRequest(BaseModel):
    name: str
    pin: str = Field(..., min_length=6, max_length=6)


class JoinShareResponse(BaseModel):
    session_token: str
    participant_id: str
    participant_name: str
    project_id: str
    project_title: str
    role: str
    duties: list[str]
    allowed_steps: list[str]


class ActivityRequest(BaseModel):
    kind: Literal[
        "data_entry", "upload", "edit", "note",
        "session_start", "session_end",
    ]
    summary: str
    payload: dict | None = None


class ActivityResponse(BaseModel):
    at: int
    kind: str
    summary: str
