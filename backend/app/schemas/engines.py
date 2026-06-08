"""Schemas for the research engines."""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


# ---------- Idea Generation ----------
class IdeaRequest(BaseModel):
    context: str = Field(..., description="Clinical observation, disease, procedure, or interest")
    discipline: str | None = Field(None, examples=["Wound Care", "Plastic Surgery", "Nursing"])
    count: int = Field(5, ge=1, le=25)


class ScoredIdea(BaseModel):
    title: str
    rationale: str
    research_gap: str
    novelty_score: float
    feasibility_score: float
    impact_score: float
    publication_potential: float
    overall_score: float


class IdeaResponse(BaseModel):
    ideas: list[ScoredIdea]
    disclaimer: str


# ---------- Proposal ----------
class ProposalRequest(BaseModel):
    topic: str
    discipline: str | None = None
    study_design: str | None = None


class ProposalResponse(BaseModel):
    title: str
    sections: dict[str, str]


# ---------- Sample Size ----------
class StudyDesign(str, Enum):
    cross_sectional = "cross_sectional"
    cohort = "cohort"
    case_control = "case_control"
    rct_two_means = "rct_two_means"
    rct_two_proportions = "rct_two_proportions"
    single_proportion = "single_proportion"
    single_mean = "single_mean"


class SampleSizeRequest(BaseModel):
    design: StudyDesign
    confidence_level: float = Field(0.95, gt=0, lt=1)
    power: float = Field(0.80, gt=0, lt=1)
    # Design-specific (only the relevant ones are used)
    proportion: float | None = Field(None, ge=0, le=1)
    margin_of_error: float | None = Field(None, gt=0, lt=1)
    p1: float | None = Field(None, ge=0, le=1)
    p2: float | None = Field(None, ge=0, le=1)
    mean_difference: float | None = None
    std_dev: float | None = Field(None, gt=0)
    allocation_ratio: float = Field(1.0, gt=0)
    dropout_rate: float = Field(0.0, ge=0, lt=1)


class SampleSizeResponse(BaseModel):
    required_sample_size: int
    per_group: dict[str, int] | None = None
    adjusted_for_dropout: int
    formula: str
    assumptions: dict[str, float | str]


# ---------- Hypotheses ----------
class HypothesisRequest(BaseModel):
    independent_variable: str
    dependent_variable: str
    direction: str | None = Field(None, examples=["two-sided", "greater", "less"])


class HypothesisResponse(BaseModel):
    null_hypothesis: str
    alternative_hypothesis: str
    recommended_tests: list[str]
    assumption_checks: list[str]


# ---------- Statistics ----------
class DescriptiveRequest(BaseModel):
    data: list[float]


class TestRecommendationRequest(BaseModel):
    outcome_type: str = Field(..., examples=["continuous", "binary", "categorical", "time-to-event"])
    groups: int = Field(2, ge=1)
    paired: bool = False
    normal_distribution: bool = True


class TestRecommendationResponse(BaseModel):
    recommended_test: str
    alternatives: list[str]
    rationale: str


# ---------- References ----------
class CitationStyle(str, Enum):
    vancouver = "vancouver"
    apa7 = "apa7"
    ama = "ama"
    harvard = "harvard"
    nature = "nature"


class ReferenceInput(BaseModel):
    title: str
    authors: list[dict[str, str]] = Field(default_factory=list)  # {"family","given"}
    journal: str | None = None
    year: int | None = None
    volume: str | None = None
    issue: str | None = None
    pages: str | None = None
    doi: str | None = None
    pmid: str | None = None


class FormatCitationRequest(BaseModel):
    reference: ReferenceInput
    style: CitationStyle = CitationStyle.vancouver


class FormatCitationResponse(BaseModel):
    style: CitationStyle
    rendered: str


# ---------- Literature ----------
class LiteratureSearchRequest(BaseModel):
    query: str
    max_results: int = Field(10, ge=1, le=50)


class LiteratureRecord(BaseModel):
    title: str
    authors: list[str]
    journal: str | None
    year: int | None
    doi: str | None
    pmid: str | None
    url: str | None
    source: str
    abstract: str | None = None


class LiteratureSearchResponse(BaseModel):
    query: str
    records: list[LiteratureRecord]
    note: str


# ---------- Literature Review (deep synthesis) ----------
class LiteratureReviewRequest(BaseModel):
    query: str
    max_results: int = Field(15, ge=3, le=30)
    style: CitationStyle = CitationStyle.vancouver
    focus: str | None = Field(None, description="Optional narrower focus / sub-question")


class ReviewedArticle(BaseModel):
    number: int
    title: str
    authors: list[str]
    year: int | None
    journal: str | None
    doi: str | None
    pmid: str | None
    url: str | None
    design: str
    summary: str
    inline_citation: str


class LiteratureReviewResponse(BaseModel):
    query: str
    style: CitationStyle
    sections: dict[str, str]
    articles: list[ReviewedArticle]
    rendered_references: list[str]
    note: str
