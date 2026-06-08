"""Fundability scoring engine.

Six-dimensional 0..10 model that combines into a single 0..100 fundability
score plus prioritised recommendations.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class FundabilityRequest:
    significance: float = 5.0     # problem importance, evidence base
    innovation: float = 5.0       # novelty, scientific/technological edge
    feasibility: float = 5.0      # design, team, environment
    impact: float = 5.0           # clinical / policy / social impact
    budget: float = 5.0           # justified, realistic, value-for-money
    sustainability: float = 5.0   # post-grant continuity
    funder_alignment: float = 5.0 # alignment with donor priorities
    methodology: float = 5.0      # rigour of design + analysis
    team: float = 5.0             # PI track record + complementarity
    moe: float = 5.0              # monitoring & evaluation depth


@dataclass
class FundabilityResult:
    overall_score: float          # 0..100
    grade: str
    breakdown: dict[str, float]   # 0..10 inputs
    weighted: dict[str, float]    # contribution to total
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str] = field(default_factory=list)


_WEIGHTS: dict[str, float] = {
    "significance": 0.12,
    "innovation": 0.12,
    "feasibility": 0.10,
    "impact": 0.12,
    "budget": 0.08,
    "sustainability": 0.08,
    "funder_alignment": 0.13,
    "methodology": 0.13,
    "team": 0.07,
    "moe": 0.05,
}


def _grade(score: float) -> str:
    if score >= 85:
        return "A — Highly fundable"
    if score >= 70:
        return "B — Competitive with revisions"
    if score >= 55:
        return "C — Substantial revisions required"
    if score >= 40:
        return "D — Major rework needed"
    return "E — Not yet fundable"


_RECS: dict[str, str] = {
    "significance": "Strengthen the burden / gap statement with current epidemiology and 3–5 high-impact references.",
    "innovation": "Add an explicit Innovation paragraph that contrasts your approach with existing literature.",
    "feasibility": "Add a milestones table and risk mitigation plan; show preliminary data or pilot results.",
    "impact": "Articulate clinical, policy, and economic impact pathways; quantify expected effect sizes.",
    "budget": "Itemise each line, link to activities, and include a clear budget narrative.",
    "sustainability": "Describe post-grant funding strategy and institutional commitments.",
    "funder_alignment": "Reference the funder's strategic priorities verbatim and map your aims to them.",
    "methodology": "Add CONSORT/STROBE/PRISMA-style detail; specify analysis plan and sample size.",
    "team": "Show complementary expertise and named co-investigators; include short bios.",
    "moe": "Include a logical framework, KPIs, and a Theory of Change diagram.",
}


class GrantScoringEngine:
    def score(self, req: FundabilityRequest) -> FundabilityResult:
        breakdown = {
            k: max(0.0, min(10.0, getattr(req, k))) for k in _WEIGHTS
        }
        weighted = {k: round(breakdown[k] * _WEIGHTS[k] * 10, 2) for k in _WEIGHTS}
        overall = round(sum(weighted.values()), 1)
        strengths = [k for k, v in breakdown.items() if v >= 7.5]
        weaknesses = [k for k, v in breakdown.items() if v < 6.0]
        recs = [
            _RECS[k] for k in sorted(weaknesses, key=lambda k: breakdown[k])
        ]
        return FundabilityResult(
            overall_score=overall,
            grade=_grade(overall),
            breakdown=breakdown,
            weighted=weighted,
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recs,
        )


grant_scoring_engine = GrantScoringEngine()
