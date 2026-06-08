"""Hypothesis Engine routes."""
from fastapi import APIRouter

from app.engines.hypotheses import hypothesis_engine
from app.schemas.engines import HypothesisRequest, HypothesisResponse

router = APIRouter(prefix="/hypotheses", tags=["Hypothesis"])


@router.post("/generate", response_model=HypothesisResponse)
def generate_hypotheses(req: HypothesisRequest) -> HypothesisResponse:
    """Draft null/alternative hypotheses and recommend tests + assumption checks."""
    return hypothesis_engine.generate(req)
