"""Academic Integrity Engine routes."""
from fastapi import APIRouter, HTTPException

from app.engines.integrity import integrity_engine
from app.schemas.extras import IntegrityRequest, IntegrityResponse

router = APIRouter(prefix="/integrity", tags=["Integrity"])


@router.post("/assess", response_model=IntegrityResponse)
def assess_integrity(req: IntegrityRequest) -> IntegrityResponse:
    """Return a similarity/attribution assessment. Never claims zero plagiarism."""
    try:
        return integrity_engine.assess(req)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
