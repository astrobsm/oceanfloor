"""Project — the container that ties together all research artifacts."""
from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    discipline: Mapped[str | None] = mapped_column(String(120))  # e.g. "Wound Care", "Nursing"
    study_design: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(50), default="draft")

    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    owner: Mapped["User | None"] = relationship(back_populates="projects")  # noqa: F821

    ideas: Mapped[list["ResearchIdea"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan"
    )
    proposals: Mapped[list["Proposal"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan"
    )
    references: Mapped[list["Reference"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan"
    )
