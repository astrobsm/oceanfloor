"""User account model."""
from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

# Canonical role identifiers used across the platform.
ROLE_SUPERADMIN = "superadmin"
ROLE_ADMIN = "admin"
ROLE_RESEARCHER = "researcher"
ROLE_RESEARCH_ASSISTANT = "research_assistant"

ALL_ROLES = (
    ROLE_SUPERADMIN,
    ROLE_ADMIN,
    ROLE_RESEARCHER,
    ROLE_RESEARCH_ASSISTANT,
)

# Roles a user may pick during self-service registration. Elevated roles
# (admin / superadmin) can only be granted by an existing superadmin.
SELF_SIGNUP_ROLES = (ROLE_RESEARCHER, ROLE_RESEARCH_ASSISTANT)

ROLE_LABELS = {
    ROLE_SUPERADMIN: "Super Admin",
    ROLE_ADMIN: "Admin",
    ROLE_RESEARCHER: "Researcher",
    ROLE_RESEARCH_ASSISTANT: "Research Assistant",
}


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default=ROLE_RESEARCHER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # True until the user changes the initial (username-equals-password) credential.
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True)

    projects: Mapped[list["Project"]] = relationship(  # noqa: F821
        back_populates="owner", cascade="all, delete-orphan"
    )
