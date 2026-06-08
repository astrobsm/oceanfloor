"""SQLAlchemy ORM models for OceanFloor.

Importing this package registers every model on `Base.metadata`.
"""
from app.models.base import TimestampMixin
from app.models.user import User
from app.models.project import Project
from app.models.research import (
    ResearchIdea,
    Proposal,
    Questionnaire,
    Dataset,
    Analysis,
    Manuscript,
)
from app.models.reference import Reference, Citation
from app.models.collaboration import CollabShare, CollabParticipant, CollabActivity

__all__ = [
    "TimestampMixin",
    "User",
    "Project",
    "ResearchIdea",
    "Proposal",
    "Questionnaire",
    "Dataset",
    "Analysis",
    "Manuscript",
    "Reference",
    "Citation",
    "CollabShare",
    "CollabParticipant",
    "CollabActivity",
]
