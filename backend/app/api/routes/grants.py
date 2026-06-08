"""Grant Writing Intelligence and Funding Optimization Engine (GWIFOE) routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.engines.grants import (
    FUNDERS,
    budget_engine,
    frameworks_engine,
    grant_matching_engine,
    grant_review_engine,
    grant_scoring_engine,
)
from app.engines.grants.budget import BudgetLine, BudgetRequest as BudgetReqDC
from app.engines.grants.frameworks import TocRequest as TocReqDC
from app.engines.grants.matching import FundingMatchRequest
from app.engines.grants.review import GrantReviewRequest as ReviewReqDC
from app.engines.grants.scoring import FundabilityRequest
from app.schemas.grants import (
    BudgetRequest,
    BudgetResponse,
    BudgetRowOut,
    FunderListResponse,
    FunderSummary,
    FundabilityResponse,
    FundabilityScoresRequest,
    GrantMatchDimension,
    GrantMatchItem,
    GrantMatchRequest,
    GrantMatchResponse,
    GrantReviewRequest,
    GrantReviewResponse,
    LogframeRequest,
    LogframeResponse,
    LogframeRowOut,
    ReviewerVoiceOut,
    SmartCheckRequest,
    SmartCheckResponse,
    TocRequest,
    TocResponse,
)

router = APIRouter(prefix="/grants", tags=["Grants"])


def _funder_to_summary(f) -> FunderSummary:
    return FunderSummary(
        name=f.name,
        acronym=f.acronym,
        funder_type=f.funder_type,
        country_focus=list(f.country_focus),
        research_areas=list(f.research_areas),
        career_stages=list(f.career_stages),
        typical_award_min_usd=f.typical_award_min_usd,
        typical_award_max_usd=f.typical_award_max_usd,
        typical_duration_months=f.typical_duration_months,
        success_rate=f.success_rate,
        review_weeks=f.review_weeks,
        next_deadline_hint=f.next_deadline_hint,
        open_to_lmic=f.open_to_lmic,
        requires_collaboration=f.requires_collaboration,
        website=f.website,
        portal=f.portal,
        proposal_format=list(f.proposal_format),
        notes=f.notes,
    )


@router.get("/funders", response_model=FunderListResponse)
def list_funders() -> FunderListResponse:
    return FunderListResponse(funders=[_funder_to_summary(f) for f in FUNDERS])


@router.post("/match", response_model=GrantMatchResponse)
def match_funders(req: GrantMatchRequest) -> GrantMatchResponse:
    matches = grant_matching_engine.match(
        FundingMatchRequest(
            title=req.title,
            abstract=req.abstract,
            research_areas=req.research_areas,
            keywords=req.keywords,
            career_stage=req.career_stage,
            institution_country=req.institution_country,
            is_lmic=req.is_lmic,
            has_institution=req.has_institution,
            welcomes_collaboration=req.welcomes_collaboration,
            target_budget_usd=req.target_budget_usd,
            target_duration_months=req.target_duration_months,
            open_to_phases=req.open_to_phases,
            months_until_deadline=req.months_until_deadline,
            funder_types=[t.value for t in (req.funder_types or [])] or None,
        ),
        limit=req.limit,
    )
    items = [
        GrantMatchItem(
            funder=_funder_to_summary(m.funder),
            overall_score=m.overall_score,
            dimensions=[
                GrantMatchDimension(name=d.name, score=d.score, rationale=d.rationale)
                for d in m.dimensions
            ],
            notes=m.notes,
        )
        for m in matches
    ]
    return GrantMatchResponse(matches=items)


@router.post("/score", response_model=FundabilityResponse)
def score_fundability(req: FundabilityScoresRequest) -> FundabilityResponse:
    result = grant_scoring_engine.score(FundabilityRequest(**req.model_dump()))
    return FundabilityResponse(**result.__dict__)


@router.post("/review", response_model=GrantReviewResponse)
def simulate_review(req: GrantReviewRequest) -> GrantReviewResponse:
    report = grant_review_engine.review(ReviewReqDC(**req.model_dump()))
    return GrantReviewResponse(
        reviewers=[ReviewerVoiceOut(**r.__dict__) for r in report.reviewers],
        committee_summary=report.committee_summary,
        overall_recommendation=report.overall_recommendation,
        decision_probability=report.decision_probability,
    )


@router.post("/theory-of-change", response_model=TocResponse)
def theory_of_change(req: TocRequest) -> TocResponse:
    out = frameworks_engine.theory_of_change(TocReqDC(**req.model_dump()))
    return TocResponse(**out.__dict__)


@router.post("/logframe", response_model=LogframeResponse)
def logframe(req: LogframeRequest) -> LogframeResponse:
    out = frameworks_engine.logframe(
        goal=req.goal,
        purpose=req.purpose,
        outputs=req.outputs,
        activities=req.activities,
        indicators=req.indicators,
        verification=req.verification,
        assumptions=req.assumptions,
    )
    return LogframeResponse(
        rows=[LogframeRowOut(**r.__dict__) for r in out.rows],
        notes=out.notes,
    )


@router.post("/smart-check", response_model=SmartCheckResponse)
def smart_check(req: SmartCheckRequest) -> SmartCheckResponse:
    out = frameworks_engine.smart_check(req.objective)
    return SmartCheckResponse(**out.__dict__)


@router.post("/budget", response_model=BudgetResponse)
def assemble_budget(req: BudgetRequest) -> BudgetResponse:
    out = budget_engine.assemble(
        BudgetReqDC(
            currency=req.currency,
            lines=[BudgetLine(**ln.model_dump()) for ln in req.lines],
            contingency_rate=req.contingency_rate,
            indirects_rate=req.indirects_rate,
        )
    )
    return BudgetResponse(
        currency=out.currency,
        by_category=out.by_category,
        subtotal=out.subtotal,
        contingency=out.contingency,
        indirects=out.indirects,
        total=out.total,
        rows=[BudgetRowOut(**r) for r in out.rows],
        narrative=out.narrative,
    )
