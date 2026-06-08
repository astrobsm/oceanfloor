"""Funder/opportunity matcher.

Given a project's research idea and institutional context, return ranked
funder candidates with a transparent score breakdown:
  - topic_fit
  - geographic_fit
  - career_stage_fit
  - budget_fit
  - mechanism_fit (proposal format / collaboration requirements)
  - timeliness (deadline / review duration vs. user's window)
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.engines.grants.catalog import FUNDERS, FunderRecord


@dataclass
class FundingMatchRequest:
    title: str = ""
    abstract: str = ""
    research_areas: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    career_stage: str | None = None  # student | early_career | mid_career | senior | institutional
    institution_country: str | None = None  # ISO code or "global"
    is_lmic: bool = False
    has_institution: bool = True
    welcomes_collaboration: bool = True
    target_budget_usd: int | None = None
    target_duration_months: int | None = None
    open_to_phases: list[str] | None = None  # e.g. ["concept_note","full_proposal"]
    months_until_deadline: int | None = None
    funder_types: list[str] | None = None  # filter, e.g. ["philanthropy","government"]


@dataclass
class FunderDimension:
    name: str
    score: float
    rationale: str


@dataclass
class FundingMatch:
    funder: FunderRecord
    overall_score: float
    dimensions: list[FunderDimension]
    notes: list[str]


def _tok(s: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", (s or "").lower()) if len(t) > 2}


def _topic_fit(req: FundingMatchRequest, f: FunderRecord) -> FunderDimension:
    text = " ".join([
        req.title or "", req.abstract or "",
        " ".join(req.research_areas or []), " ".join(req.keywords or []),
    ]).lower()
    if not text.strip():
        return FunderDimension("topic_fit", 0.4, "No topic text provided.")
    kw_hits = sum(1 for kw in f.keywords if kw.lower() in text)
    area_hits = sum(1 for area in (req.research_areas or [])
                    if any(area.lower() in r for r in f.research_areas))
    score = min(1.0, 0.6 * (kw_hits / max(len(f.keywords), 1)) + 0.4 * min(1.0, area_hits / 3))
    return FunderDimension(
        "topic_fit", round(score, 3),
        f"{kw_hits} keyword hit(s); {area_hits} research-area overlap.",
    )


def _geo_fit(req: FundingMatchRequest, f: FunderRecord) -> FunderDimension:
    if "global" in f.country_focus:
        return FunderDimension("geographic_fit", 0.9, "Funder open globally.")
    if req.institution_country and req.institution_country in f.country_focus:
        return FunderDimension("geographic_fit", 1.0,
                               f"Direct geographic match: {req.institution_country}.")
    if req.is_lmic and "lmic" in f.country_focus:
        return FunderDimension("geographic_fit", 0.85, "LMIC-eligible programme.")
    return FunderDimension("geographic_fit", 0.2,
                           "Geographic eligibility may not match this funder.")


def _career_fit(req: FundingMatchRequest, f: FunderRecord) -> FunderDimension:
    if not req.career_stage:
        return FunderDimension("career_stage_fit", 0.6, "Career stage not specified.")
    if req.career_stage in f.career_stages:
        return FunderDimension("career_stage_fit", 1.0,
                               f"Stage '{req.career_stage}' explicitly supported.")
    return FunderDimension("career_stage_fit", 0.3,
                           f"Stage '{req.career_stage}' not in funder's typical pool.")


def _budget_fit(req: FundingMatchRequest, f: FunderRecord) -> FunderDimension:
    if not req.target_budget_usd:
        return FunderDimension("budget_fit", 0.6, "No target budget provided.")
    lo = f.typical_award_min_usd or 0
    hi = f.typical_award_max_usd or 10**9
    if lo <= req.target_budget_usd <= hi:
        return FunderDimension("budget_fit", 1.0,
                               f"USD {req.target_budget_usd:,} fits the typical range.")
    if req.target_budget_usd < lo:
        return FunderDimension(
            "budget_fit", 0.4,
            f"Below typical floor (USD {lo:,}); funder may decline as too small.",
        )
    return FunderDimension(
        "budget_fit", 0.3,
        f"Above typical ceiling (USD {hi:,}); consider phased asks.",
    )


def _mechanism_fit(req: FundingMatchRequest, f: FunderRecord) -> FunderDimension:
    notes: list[str] = []
    score = 0.8
    if f.requires_institution and not req.has_institution:
        score -= 0.4
        notes.append("Funder requires an institutional host.")
    if f.requires_collaboration and not req.welcomes_collaboration:
        score -= 0.2
        notes.append("Funder expects multi-partner collaboration.")
    if req.open_to_phases:
        if any(p in f.proposal_format for p in req.open_to_phases):
            score += 0.1
        else:
            score -= 0.2
            notes.append(f"Proposal formats {f.proposal_format} not in your preferred set.")
    return FunderDimension("mechanism_fit", round(max(0.0, min(1.0, score)), 3),
                           "; ".join(notes) or "Mechanism alignment looks workable.")


def _timeliness(req: FundingMatchRequest, f: FunderRecord) -> FunderDimension:
    if req.months_until_deadline is None:
        return FunderDimension("timeliness", 0.6, "No timeline provided.")
    review = f.review_weeks or 16
    needed_months = max(2, review // 4 + 2)
    if req.months_until_deadline >= needed_months:
        return FunderDimension(
            "timeliness", 1.0,
            f"~{needed_months} months recommended; you have {req.months_until_deadline}.",
        )
    if req.months_until_deadline >= needed_months // 2:
        return FunderDimension(
            "timeliness", 0.5,
            f"Tight: ~{needed_months} months recommended; you have {req.months_until_deadline}.",
        )
    return FunderDimension(
        "timeliness", 0.2,
        f"Deadline likely too close ({req.months_until_deadline} months).",
    )


def _aggregate(dims: list[FunderDimension]) -> float:
    weights = {
        "topic_fit": 0.30,
        "geographic_fit": 0.20,
        "career_stage_fit": 0.10,
        "budget_fit": 0.15,
        "mechanism_fit": 0.15,
        "timeliness": 0.10,
    }
    return round(sum(weights[d.name] * d.score for d in dims), 3)


def _notes(req: FundingMatchRequest, f: FunderRecord) -> list[str]:
    n: list[str] = []
    if f.success_rate is not None:
        n.append(f"Indicative success rate ~{int(round(f.success_rate * 100))}%.")
    if f.next_deadline_hint:
        n.append(f"Deadline pattern: {f.next_deadline_hint}.")
    if not f.apc_or_indirects_allowed:
        n.append("Indirect costs / APCs typically not covered.")
    if f.notes:
        n.append(f.notes)
    return n


class GrantMatchingEngine:
    def match(
        self,
        req: FundingMatchRequest,
        limit: int = 10,
    ) -> list[FundingMatch]:
        wanted_types = {t.lower() for t in (req.funder_types or [])}
        out: list[FundingMatch] = []
        for f in FUNDERS:
            if wanted_types and f.funder_type not in wanted_types:
                continue
            dims = [
                _topic_fit(req, f),
                _geo_fit(req, f),
                _career_fit(req, f),
                _budget_fit(req, f),
                _mechanism_fit(req, f),
                _timeliness(req, f),
            ]
            score = _aggregate(dims)
            out.append(FundingMatch(funder=f, overall_score=score,
                                    dimensions=dims, notes=_notes(req, f)))
        out.sort(key=lambda m: m.overall_score, reverse=True)
        return out[:limit]


grant_matching_engine = GrantMatchingEngine()
