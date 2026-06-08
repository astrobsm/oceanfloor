"""Reference and rendered Citation models.

A Reference stores verifiable bibliographic metadata (always anchored to a DOI or
PMID). A Citation is a Reference rendered into a specific style (Vancouver, APA…).
"""
from __future__ import annotations

from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Reference(Base, TimestampMixin):
    __tablename__ = "references"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))

    title: Mapped[str] = mapped_column(Text, nullable=False)
    authors: Mapped[list] = mapped_column(JSON, default=list)  # [{"family","given"}]
    journal: Mapped[str | None] = mapped_column(String(500))
    year: Mapped[int | None] = mapped_column()
    volume: Mapped[str | None] = mapped_column(String(50))
    issue: Mapped[str | None] = mapped_column(String(50))
    pages: Mapped[str | None] = mapped_column(String(50))

    # Verifiable identifiers — at least one must be present.
    doi: Mapped[str | None] = mapped_column(String(255), index=True)
    pmid: Mapped[str | None] = mapped_column(String(50), index=True)
    url: Mapped[str | None] = mapped_column(String(1024))

    source: Mapped[str | None] = mapped_column(String(120))  # provider it came from

    project: Mapped["Project"] = relationship(back_populates="references")  # noqa: F821
    citations: Mapped[list["Citation"]] = relationship(
        back_populates="reference", cascade="all, delete-orphan"
    )


class Citation(Base, TimestampMixin):
    __tablename__ = "citations"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference_id: Mapped[int] = mapped_column(ForeignKey("references.id"))
    style: Mapped[str] = mapped_column(String(50), nullable=False)
    rendered: Mapped[str] = mapped_column(Text, nullable=False)

    reference: Mapped["Reference"] = relationship(back_populates="citations")
