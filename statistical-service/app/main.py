"""Statistical microservice — FastAPI app exposing inferential analyses.

Kept separate from the main API so heavy numeric workloads (SciPy/statsmodels/
lifelines) scale independently and never block the gateway's event loop.
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException

from app import analysis
from app.schemas import (
    AnovaRequest,
    ContingencyRequest,
    CorrelationRequest,
    PairedRequest,
    StatResult,
    SurvivalRequest,
    TwoGroupRequest,
)

app = FastAPI(
    title="OceanFloor Statistical Service",
    version="0.1.0",
    description="Inferential and survival statistics for the Biostatistics Engine.",
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "oceanfloor-statistical-service"}


@app.post("/analyze/ttest", response_model=StatResult)
def ttest(req: TwoGroupRequest) -> StatResult:
    return analysis.independent_ttest(req)


@app.post("/analyze/paired-ttest", response_model=StatResult)
def paired_ttest(req: PairedRequest) -> StatResult:
    try:
        return analysis.paired_ttest(req)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/analyze/anova", response_model=StatResult)
def anova(req: AnovaRequest) -> StatResult:
    return analysis.one_way_anova(req)


@app.post("/analyze/chi-square", response_model=StatResult)
def chi_square(req: ContingencyRequest) -> StatResult:
    return analysis.chi_square(req)


@app.post("/analyze/correlation", response_model=StatResult)
def correlation(req: CorrelationRequest) -> StatResult:
    try:
        return analysis.correlation(req)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/analyze/survival", response_model=StatResult)
def survival(req: SurvivalRequest) -> StatResult:
    return analysis.survival(req)
