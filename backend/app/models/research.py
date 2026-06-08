"""Core research artifact models attached to a project."""
from __future__ import annotations

from sqlalchemy import Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class ResearchIdea(Base, TimestampMixin):
    __tablename__ = "research_ideas"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text)
    novelty_score: Mapped[float | None] = mapped_column(Float)
    feasibility_score: Mapped[float | None] = mapped_column(Float)
    impact_score: Mapped[float | None] = mapped_column(Float)
    overall_score: Mapped[float | None] = mapped_column(Float)

    project: Mapped["Project"] = relationship(back_populates="ideas")  # noqa: F821


class Proposal(Base, TimestampMixin):
    __tablename__ = "proposals"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    # Section name -> markdown content
    sections: Mapped[dict] = mapped_column(JSON, default=dict)

    project: Mapped["Project"] = relationship(back_populates="proposals")  # noqa: F821


class Questionnaire(Base, TimestampMixin):
    __tablename__ = "questionnaires"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    # List of item dicts: {code, text, type, options, ...}
    items: Mapped[list] = mapped_column(JSON, default=list)


class Dataset(Base, TimestampMixin):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Variable definitions (data dictionary)
    variables: Mapped[list] = mapped_column(JSON, default=list)
    storage_uri: Mapped[str | None] = mapped_column(String(1024))


class Analysis(Base, TimestampMixin):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    dataset_id: Mapped[int | None] = mapped_column(ForeignKey("datasets.id"))
    method: Mapped[str] = mapped_column(String(120), nullable=False)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    results: Mapped[dict] = mapped_column(JSON, default=dict)


class Manuscript(Base, TimestampMixin):
    __tablename__ = "manuscripts"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    target_journal: Mapped[str | None] = mapped_column(String(255))
    citation_style: Mapped[str] = mapped_column(String(50), default="vancouver")
    sections: Mapped[dict] = mapped_column(JSON, default=dict)  # IMRAD sections
