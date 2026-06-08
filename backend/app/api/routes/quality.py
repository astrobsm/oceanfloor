"""Quality Assurance Engine routes."""
from fastapi import APIRouter

from app.engines.quality import quality_engine
from app.schemas.extras import QualityRequest, QualityResponse

router = APIRouter(prefix="/quality", tags=["Quality Assurance"])


@router.post("/score", response_model=QualityResponse)
def score_quality(req: QualityRequest) -> QualityResponse:
    return quality_engine.score(req)
