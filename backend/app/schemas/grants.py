"""Pydantic schemas for the Grant Writing Intelligence Engine (GWIFOE)."""
from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


# ---------- Funding discovery ----------
class FunderType(str, Enum):
    international = "international"
    research_council = "research_council"
    philanthropy = "philanthropy"
    government = "government"
    industry = "industry"
    ngo = "ngo"


class FunderSummary(BaseModel):
    name: str
    acronym: str | None = None
    funder_type: str
    country_focus: list[str]
    research_areas: list[str]
    career_stages: list[str]
    typical_award_min_usd: int | None = None
    typical_award_max_usd: int | None = None
    typical_duration_months: int | None = None
    success_rate: float | None = None
    review_weeks: int | None = None
    next_deadline_hint: str | None = None
    open_to_lmic: bool
    requires_collaboration: bool
    website: str | None = None
    portal: str | None = None
    proposal_format: list[str]
    notes: str = ""


class FunderListResponse(BaseModel):
    funders: list[FunderSummary]


# ---------- Matching ----------
class GrantMatchRequest(BaseModel):
    title: str = ""
    abstract: str = ""
    research_areas: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    career_stage: Literal[
        "student", "early_career", "mid_career", "senior", "institutional"
    ] | None = None
    institution_country: str | None = None
    is_lmic: bool = False
    has_institution: bool = True
    welcomes_collaboration: bool = True
    target_budget_usd: int | None = None
    target_duration_months: int | None = None
    open_to_phases: list[str] | None = None
    months_until_deadline: int | None = None
    funder_types: list[FunderType] | None = None
    limit: int = Field(10, ge=1, le=25)


class GrantMatchDimension(BaseModel):
    name: str
    score: float
    rationale: str


class GrantMatchItem(BaseModel):
    funder: FunderSummary
    overall_score: float
    dimensions: list[GrantMatchDimension]
    notes: list[str]


class GrantMatchResponse(BaseModel):
    matches: list[GrantMatchItem]
    disclaimer: str = (
        "Indicative match scores. Verify eligibility and current deadlines on "
        "each funder's official portal before submission."
    )


# ---------- Fundability scoring ----------
class FundabilityScoresRequest(BaseModel):
    significance: float = Field(5.0, ge=0, le=10)
    innovation: float = Field(5.0, ge=0, le=10)
    feasibility: float = Field(5.0, ge=0, le=10)
    impact: float = Field(5.0, ge=0, le=10)
    budget: float = Field(5.0, ge=0, le=10)
    sustainability: float = Field(5.0, ge=0, le=10)
    funder_alignment: float = Field(5.0, ge=0, le=10)
    methodology: float = Field(5.0, ge=0, le=10)
    team: float = Field(5.0, ge=0, le=10)
    moe: float = Field(5.0, ge=0, le=10)


class FundabilityResponse(BaseModel):
    overall_score: float
    grade: str
    breakdown: dict[str, float]
    weighted: dict[str, float]
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]


# ---------- Review simulator ----------
class GrantReviewRequest(BaseModel):
    title: str
    aims: str = ""
    background: str = ""
    methodology: str = ""
    budget_summary: str = ""
    impact: str = ""
    innovation: str = ""
    moe: str = ""
    sustainability: str = ""
    funder_priorities: str | None = None


class ReviewerVoiceOut(BaseModel):
    role: str
    score: float
    strengths: list[str]
    weaknesses: list[str]
    questions: list[str]
    recommendation: str


class GrantReviewResponse(BaseModel):
    reviewers: list[ReviewerVoiceOut]
    committee_summary: str
    overall_recommendation: str
    decision_probability: dict[str, float]
    disclaimer: str = (
        "Simulated panel feedback for self-assessment. Final funding decisions "
        "rest with the funder's review committee."
    )


# ---------- Theory of Change + Logframe + SMART ----------
class TocRequest(BaseModel):
    problem: str
    population: str
    inputs: list[str] = Field(default_factory=list)
    activities: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    short_outcomes: list[str] = Field(default_factory=list)
    intermediate_outcomes: list[str] = Field(default_factory=list)
    long_term_impact: str = ""
    assumptions: list[str] = Field(default_factory=list)


class TocResponse(BaseModel):
    inputs: list[str]
    activities: list[str]
    outputs: list[str]
    short_outcomes: list[str]
    intermediate_outcomes: list[str]
    long_term_impact: str
    assumptions: list[str]
    diagram_mermaid: str
    narrative: str


class LogframeRequest(BaseModel):
    goal: str
    purpose: str
    outputs: list[str]
    activities: list[str]
    indicators: dict[str, list[str]] | None = None
    verification: dict[str, list[str]] | None = None
    assumptions: dict[str, list[str]] | None = None


class LogframeRowOut(BaseModel):
    level: str
    summary: str
    indicators: list[str]
    means_of_verification: list[str]
    assumptions: list[str]


class LogframeResponse(BaseModel):
    rows: list[LogframeRowOut]
    notes: list[str]


class SmartCheckRequest(BaseModel):
    objective: str


class SmartCheckResponse(BaseModel):
    raw: str
    specific: str
    measurable: str
    achievable: str
    relevant: str
    time_bound: str
    is_smart: bool
    issues: list[str]


# ---------- Budget ----------
class BudgetLineIn(BaseModel):
    category: str
    description: str
    quantity: float = 1.0
    unit_cost: float = 0.0
    months: float = 1.0
    notes: str = ""


class BudgetRequest(BaseModel):
    currency: str = "USD"
    lines: list[BudgetLineIn] = Field(default_factory=list)
    contingency_rate: float = Field(0.05, ge=0, le=0.15)
    indirects_rate: float = Field(0.0, ge=0, le=0.40)


class BudgetRowOut(BaseModel):
    category: str
    description: str
    quantity: float
    unit_cost: float
    months: float
    total: float
    notes: str


class BudgetResponse(BaseModel):
    currency: str
    by_category: dict[str, float]
    subtotal: float
    contingency: float
    indirects: float
    total: float
    rows: list[BudgetRowOut]
    narrative: str
