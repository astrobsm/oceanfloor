"""Biostatistics & Data Analysis Engine routes."""
from fastapi import APIRouter, HTTPException

from app.engines.statistics import statistics_engine
from app.schemas.engines import (
    DescriptiveRequest,
    TestRecommendationRequest,
    TestRecommendationResponse,
)

router = APIRouter(prefix="/statistics", tags=["Biostatistics"])


@router.post("/descriptive")
def descriptive(req: DescriptiveRequest) -> dict:
    """Compute descriptive statistics for a numeric series."""
    try:
        return statistics_engine.descriptive(req)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/recommend-test", response_model=TestRecommendationResponse)
def recommend_test(req: TestRecommendationRequest) -> TestRecommendationResponse:
    """Recommend the most appropriate statistical test for a study setup."""
    return statistics_engine.recommend_test(req)
