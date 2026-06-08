"""Request/response schemas for the statistical microservice."""
from __future__ import annotations

from pydantic import BaseModel, Field


class TwoGroupRequest(BaseModel):
    group1: list[float] = Field(..., min_length=2)
    group2: list[float] = Field(..., min_length=2)
    equal_variance: bool = True


class PairedRequest(BaseModel):
    before: list[float] = Field(..., min_length=2)
    after: list[float] = Field(..., min_length=2)


class AnovaRequest(BaseModel):
    groups: list[list[float]] = Field(..., min_length=2)


class ContingencyRequest(BaseModel):
    table: list[list[int]] = Field(..., description="2D contingency table")


class CorrelationRequest(BaseModel):
    x: list[float] = Field(..., min_length=3)
    y: list[float] = Field(..., min_length=3)
    method: str = Field("pearson", pattern="^(pearson|spearman)$")


class SurvivalRequest(BaseModel):
    durations: list[float] = Field(..., min_length=2)
    event_observed: list[int] = Field(..., min_length=2)  # 1 = event, 0 = censored
    groups: list[str] | None = None  # optional group labels for log-rank


class StatResult(BaseModel):
    test: str
    statistic: float | None = None
    p_value: float | None = None
    details: dict = {}
    interpretation: str
