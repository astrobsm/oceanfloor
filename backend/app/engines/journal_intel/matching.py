"""Multi-dimensional journal matching.

Produces, per candidate journal, a transparent breakdown:
  - topic_fit            (specialty / subspecialty / keyword match)
  - methodology_fit      (study design accepted)
  - statistical_fit      (does the journal welcome the kind of analysis used)
  - citation_fit         (rough recency / count vs. journal expectation)
  - innovation_fit       (novelty signals in title/abstract)

The dimensions combine into a single 0..1 suitability_score, plus an
acceptance_potential heuristic (lower for selective top-tier journals).
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from app.engines.journal_intel.catalog import CATALOG, JournalRecord


_NOVELTY_HINTS = (
    "novel", "first", "new", "innovative", "emerging", "pilot",
    "prospective", "randomized", "multicentre", "multicenter", "large-scale",
    "machine learning", "ai", "deep learning",
)


@dataclass
class MatchRequest:
    title: str
    abstract: str
    discipline: str | None = None
    study_design: str | None = None  # uses our StudyDesign vocabulary
    keywords: list[str] | None = None
    references_count: int | None = None
    references_recent_share: float | None = None  # share of refs <5y old
    statistical_methods: list[str] | None = None
    open_access_preferred: bool = False
    max_apc_usd: int | None = None
    target_specialty: str | None = None  # e.g. "wound_care"


@dataclass
class DimensionScore:
    name: str
    score: float        # 0..1
    rationale: str


@dataclass
class JournalMatch:
    name: str
    specialty: str
    publisher: str
    impact_factor: float | None
    citescore: float | None
    quartile: str | None
    acceptance_rate: float | None
    open_access: bool
    apc_usd: int | None
    reference_style: str
    word_limit: int | None
    reporting_guidelines: list[str]
    submission_url: str | None
    suitability_score: float
    acceptance_potential: float
    dimensions: list[DimensionScore]
    fit_notes: list[str]


def _tokenize(s: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", s.lower()) if len(t) > 2}


def _topic_fit(req: MatchRequest, j: JournalRecord) -> DimensionScore:
    text = " ".join([req.title or "", req.abstract or "", req.discipline or "",
                     " ".join(req.keywords or [])]).lower()
    tokens = _tokenize(text)
    hits = sum(1 for kw in j.keywords if kw.lower() in text)
    kw_score = hits / max(len(j.keywords), 1)
    # Specialty alignment.
    spec_score = 0.0
    if req.target_specialty:
        if req.target_specialty == j.specialty:
            spec_score = 1.0
        elif req.target_specialty in j.subspecialties:
            spec_score = 0.7
    else:
        # Heuristic: discipline matches specialty word.
        d = (req.discipline or "").lower()
        if d and (d in j.specialty or any(d in s for s in j.subspecialties)):
            spec_score = 0.6
    # Subspecialty token overlap.
    sub_overlap = len({s.replace("_", " ") for s in j.subspecialties} & {" ".join(tokens)}) > 0
    sub_token_score = 0.2 if sub_overlap else 0.0
    score = min(1.0, 0.55 * kw_score + 0.35 * spec_score + sub_token_score)
    rationale = (
        f"{hits}/{len(j.keywords)} keyword hits; "
        f"specialty alignment={spec_score:.2f}"
    )
    return DimensionScore("topic_fit", round(score, 3), rationale)


def _methodology_fit(req: MatchRequest, j: JournalRecord) -> DimensionScore:
    if not req.study_design:
        return DimensionScore("methodology_fit", 0.5,
                              "Study design not specified — assumed compatible.")
    if req.study_design in j.accepted_designs:
        return DimensionScore("methodology_fit", 1.0,
                              f"{req.study_design.replace('_',' ')} explicitly accepted.")
    return DimensionScore("methodology_fit", 0.2,
                          f"{req.study_design.replace('_',' ')} not in journal's typical design list.")


_TEST_HEAVY = {"regression", "mixed model", "survival", "cox", "kaplan", "meta-analysis",
               "structural equation", "bayesian", "machine learning"}


def _statistical_fit(req: MatchRequest, j: JournalRecord) -> DimensionScore:
    methods = {m.lower() for m in (req.statistical_methods or [])}
    heavy = any(t in m for m in methods for t in _TEST_HEAVY)
    # Higher-tier journals expect rigorous statistics.
    tier = j.impact_factor or 0
    if tier >= 10 and not methods:
        return DimensionScore("statistical_fit", 0.4,
                              "High-impact journal but no statistical methods declared.")
    if tier >= 10 and heavy:
        return DimensionScore("statistical_fit", 1.0,
                              "Advanced statistics align with high-impact expectations.")
    if methods:
        return DimensionScore("statistical_fit", 0.8,
                              "Declared statistical methods are appropriate for journal tier.")
    return DimensionScore("statistical_fit", 0.6,
                          "No statistical methods declared; assume basic descriptive/inferential.")


def _citation_fit(req: MatchRequest, j: JournalRecord) -> DimensionScore:
    refs = req.references_count or 0
    recent = req.references_recent_share if req.references_recent_share is not None else 0.0
    lim = j.reference_limit or 60
    cap_ok = refs == 0 or refs <= lim
    if refs == 0:
        return DimensionScore("citation_fit", 0.5, "No reference count provided.")
    overflow_pen = 0.0 if cap_ok else min(0.4, (refs - lim) / max(lim, 1))
    recency_score = min(1.0, recent / 0.6)  # 60% recent → full marks
    score = max(0.0, min(1.0, 0.5 * (refs / max(lim, 1)) + 0.5 * recency_score - overflow_pen))
    rationale = (
        f"{refs} refs vs. journal limit {lim}; "
        f"recent (<5y) share={recent:.0%}"
    )
    return DimensionScore("citation_fit", round(min(score, 1.0), 3), rationale)


def _innovation_fit(req: MatchRequest, j: JournalRecord) -> DimensionScore:
    text = f"{req.title} {req.abstract}".lower()
    hits = sum(1 for h in _NOVELTY_HINTS if h in text)
    base = min(1.0, hits / 4)
    # Top-tier journals demand novelty; megajournals don't.
    if j.notes and "methodology-only" in j.notes.lower():
        return DimensionScore("innovation_fit", 0.9,
                              "Megajournal: novelty not required, methodology is.")
    if (j.impact_factor or 0) >= 15 and base < 0.5:
        return DimensionScore("innovation_fit", max(0.2, base),
                              "Top-tier journal expects strong novelty signals.")
    return DimensionScore("innovation_fit", round(base, 3),
                          f"{hits} novelty cue(s) detected.")


def _aggregate(scores: list[DimensionScore]) -> float:
    weights = {
        "topic_fit": 0.40,
        "methodology_fit": 0.20,
        "statistical_fit": 0.15,
        "citation_fit": 0.10,
        "innovation_fit": 0.15,
    }
    s = sum(weights[d.name] * d.score for d in scores)
    return round(s, 3)


def _acceptance_potential(j: JournalRecord, suitability: float) -> float:
    base_ar = j.acceptance_rate if j.acceptance_rate is not None else 0.3
    # Higher suitability nudges acceptance potential upward but never above base+0.25.
    return round(min(1.0, base_ar + suitability * 0.25), 3)


def _fit_notes(req: MatchRequest, j: JournalRecord, suitability: float) -> list[str]:
    notes: list[str] = []
    if req.open_access_preferred and not j.open_access:
        notes.append("Not open access (you prefer open access).")
    if req.max_apc_usd is not None and j.apc_usd and j.apc_usd > req.max_apc_usd:
        notes.append(f"APC USD {j.apc_usd} exceeds your cap of USD {req.max_apc_usd}.")
    if suitability < 0.35:
        notes.append("Low overall fit — consider a more aligned outlet.")
    if (j.impact_factor or 0) >= 20:
        notes.append("Very high-impact: expect 4–5% acceptance and demanding peer review.")
    if j.reference_style:
        notes.append(f"References must be formatted in {j.reference_style.upper()} style.")
    return notes


class MatchingEngine:
    def match(self, req: MatchRequest, *, top_k: int = 8) -> list[JournalMatch]:
        results: list[JournalMatch] = []
        for j in CATALOG:
            dims = [
                _topic_fit(req, j),
                _methodology_fit(req, j),
                _statistical_fit(req, j),
                _citation_fit(req, j),
                _innovation_fit(req, j),
            ]
            score = _aggregate(dims)
            if score < 0.15:
                continue
            ap = _acceptance_potential(j, score)
            results.append(JournalMatch(
                name=j.name,
                specialty=j.specialty,
                publisher=j.publisher,
                impact_factor=j.impact_factor,
                citescore=j.citescore,
                quartile=j.quartile,
                acceptance_rate=j.acceptance_rate,
                open_access=j.open_access,
                apc_usd=j.apc_usd,
                reference_style=j.reference_style,
                word_limit=j.word_limit,
                reporting_guidelines=list(j.reporting_guidelines),
                submission_url=j.submission_url,
                suitability_score=score,
                acceptance_potential=ap,
                dimensions=dims,
                fit_notes=_fit_notes(req, j, score),
            ))
        results.sort(key=lambda m: m.suitability_score, reverse=True)
        return results[:top_k]


matching_engine = MatchingEngine()
