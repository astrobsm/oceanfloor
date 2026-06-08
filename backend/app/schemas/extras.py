"""Schemas for the remaining (questionnaire/SPSS/discussion/manuscript/...) engines."""
from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


# ---------- Questionnaire ----------
class QuestionType(str, Enum):
    multiple_choice = "multiple_choice"
    likert = "likert"
    vas = "vas"
    numeric = "numeric"
    date = "date"
    free_text = "free_text"
    matrix = "matrix"


class QuestionItem(BaseModel):
    code: str = Field(..., description="Short variable code, e.g. AGE, PAIN_VAS")
    text: str
    type: QuestionType
    options: list[str] = Field(default_factory=list)
    required: bool = True


class QuestionnaireRequest(BaseModel):
    title: str
    items: list[QuestionItem]


class QuestionnaireExportFormat(str, Enum):
    csv = "csv"
    redcap = "redcap"
    kobotoolbox = "kobotoolbox"
    odk = "odk"


class QuestionnaireExportResponse(BaseModel):
    title: str
    format: QuestionnaireExportFormat
    content: str  # text payload (CSV / XML / TSV)


# ---------- SPSS ----------
class SpssVariable(BaseModel):
    name: str
    label: str
    measure: Literal["nominal", "ordinal", "scale"] = "scale"
    type: Literal["numeric", "string", "date"] = "numeric"
    width: int = 8
    decimals: int = 2
    values: dict[str, str] = Field(default_factory=dict)  # code -> label
    missing: list[str] = Field(default_factory=list)


class SpssDataDictRequest(BaseModel):
    variables: list[SpssVariable]


class SpssDataDictResponse(BaseModel):
    dictionary_csv: str
    syntax_sps: str


# ---------- Discussion / Interpretation ----------
class DiscussionRequest(BaseModel):
    research_question: str
    key_findings: list[str]
    discipline: str | None = None
    audience: Literal["clinical", "nursing", "surgical", "public_health"] = "clinical"


class DiscussionResponse(BaseModel):
    interpretation: str
    comparison_with_literature: str
    implications: str
    limitations: str
    future_directions: str


# ---------- Manuscript ----------
class ManuscriptRequest(BaseModel):
    title: str
    target_journal: str | None = None
    citation_style: str = "vancouver"
    background: str | None = None
    methods: str | None = None
    results: str | None = None


class ManuscriptResponse(BaseModel):
    title: str
    target_journal: str | None
    citation_style: str
    sections: dict[str, str]  # IMRAD


# ---------- Presentation ----------
class Slide(BaseModel):
    title: str
    bullets: list[str] = Field(default_factory=list)
    speaker_notes: str = ""


class PresentationRequest(BaseModel):
    title: str
    audience: str = "academic defense"
    sections: list[str] = Field(default_factory=list)


class PresentationResponse(BaseModel):
    title: str
    slides: list[Slide]


# ---------- Integrity ----------
class IntegrityRequest(BaseModel):
    text: str
    references: list[str] = Field(default_factory=list)  # e.g. DOIs / PMIDs / titles


class IntegrityResponse(BaseModel):
    similarity_assessment: str
    attribution_coverage: float = Field(..., ge=0, le=1)
    missing_citations_flagged: int
    notes: str
    disclaimer: str


# ---------- Quality Assurance ----------
class QualityRequest(BaseModel):
    methodology_score: float = Field(..., ge=0, le=10)
    statistics_score: float = Field(..., ge=0, le=10)
    citation_score: float = Field(..., ge=0, le=10)
    ethics_score: float = Field(..., ge=0, le=10)
    reporting_score: float = Field(..., ge=0, le=10)
    writing_score: float = Field(..., ge=0, le=10)


class QualityResponse(BaseModel):
    overall_score: float
    grade: str
    breakdown: dict[str, float]
    recommendations: list[str]


# ---------- Journal Matching ----------
class JournalMatchRequest(BaseModel):
    title: str
    abstract: str
    discipline: str | None = None
    open_access_preferred: bool = False


class JournalSuggestion(BaseModel):
    name: str
    scope: str
    indicative_impact_factor: float | None
    open_access: bool
    fit_score: float
    submission_url: str | None = None


class JournalMatchResponse(BaseModel):
    suggestions: list[JournalSuggestion]
    note: str


# ---------- Export ----------
class ExportFormat(str, Enum):
    docx = "docx"
    pptx = "pptx"
    xlsx = "xlsx"
    csv = "csv"
    json = "json"
    md = "md"
    html = "html"
    latex = "latex"


class ExportManuscriptRequest(BaseModel):
    format: ExportFormat
    title: str
    sections: dict[str, str]  # section name -> markdown/text
