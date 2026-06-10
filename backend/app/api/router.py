"""Aggregates all engine routers under the versioned API prefix."""
from fastapi import APIRouter

from app.api.routes import (
    auth,
    collaboration,
    discussion,
    export,
    grants,
    hypotheses,
    ideas,
    integrity,
    journals,
    literature,
    manuscripts,
    presentations,
    proposals,
    quality,
    questionnaires,
    references,
    sample_size,
    spss,
    statistics,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(ideas.router)
api_router.include_router(proposals.router)
api_router.include_router(literature.router)
api_router.include_router(references.router)
api_router.include_router(sample_size.router)
api_router.include_router(statistics.router)
api_router.include_router(hypotheses.router)
api_router.include_router(questionnaires.router)
api_router.include_router(spss.router)
api_router.include_router(discussion.router)
api_router.include_router(manuscripts.router)
api_router.include_router(presentations.router)
api_router.include_router(integrity.router)
api_router.include_router(quality.router)
api_router.include_router(journals.router)
api_router.include_router(grants.router)
api_router.include_router(collaboration.router)
api_router.include_router(export.router)
