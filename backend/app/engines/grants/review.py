"""Grant review simulator.

Simulates four reviewer voices (scientific, methodology, statistical,
program officer) plus a funding-committee summary. Comments are
deterministic templates filled with content from the proposal — never
fabricated empirical claims.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class GrantReviewRequest:
    title: str
    aims: str
    background: str
    methodology: str
    budget_summary: str
    impact: str
    innovation: str
    moe: str
    sustainability: str
    funder_priorities: str | None = None


@dataclass
class ReviewerVoice:
    role: str
    score: float          # 1..9 (NIH-style)
    strengths: list[str]
    weaknesses: list[str]
    questions: list[str]
    recommendation: str   # Recommend / Recommend with revisions / Do not recommend


@dataclass
class GrantReviewReport:
    reviewers: list[ReviewerVoice]
    committee_summary: str
    overall_recommendation: str
    decision_probability: dict[str, float]  # e.g. {"fund":0.2,"revise":0.5,"reject":0.3}


def _missing(field_name: str, value: str) -> str:
    return (
        f"{field_name.title()} is too brief to evaluate."
        if not value or len(value.split()) < 25
        else ""
    )


def _scientific(req: GrantReviewRequest) -> ReviewerVoice:
    strengths: list[str] = []
    weaknesses: list[str] = []
    qs: list[str] = []
    if "novel" in (req.innovation or "").lower() or "first" in (req.innovation or "").lower():
        strengths.append("Innovation language is explicit.")
    else:
        weaknesses.append("Novelty claims are not crisp.")
    if (req.background or "").count("\n") < 2 and len((req.background or "").split()) < 80:
        weaknesses.append("Background lacks an evidence-anchored gap statement.")
    if not req.funder_priorities:
        qs.append("Map specific aims to the funder's published priorities.")
    score = 7.5 if not weaknesses else max(3.0, 7.5 - 0.7 * len(weaknesses))
    rec = (
        "Recommend" if score >= 7
        else "Recommend with revisions" if score >= 4
        else "Do not recommend"
    )
    return ReviewerVoice("Scientific Reviewer", round(score, 1),
                         strengths or ["Aims read coherently."],
                         weaknesses, qs, rec)


def _methodology(req: GrantReviewRequest) -> ReviewerVoice:
    strengths: list[str] = []
    weaknesses: list[str] = []
    qs: list[str] = []
    text = (req.methodology or "").lower()
    for needle, label in [
        ("randomi", "randomisation"),
        ("blind", "blinding"),
        ("sample size", "sample-size justification"),
        ("inclusion", "eligibility criteria"),
        ("analysis", "analysis plan"),
    ]:
        if needle in text:
            strengths.append(f"Includes {label}.")
        else:
            weaknesses.append(f"No mention of {label}.")
    if not text:
        weaknesses = ["Methodology section is empty."]
    score = 7.0 - 0.6 * len(weaknesses)
    score = max(2.0, min(9.0, score))
    rec = "Recommend" if score >= 7 else "Recommend with revisions" if score >= 4 else "Do not recommend"
    return ReviewerVoice("Methodology Reviewer", round(score, 1),
                         strengths or ["Methodology has structure."],
                         weaknesses, qs, rec)


def _statistical(req: GrantReviewRequest) -> ReviewerVoice:
    text = (req.methodology or "").lower()
    strengths: list[str] = []
    weaknesses: list[str] = []
    if "power" in text or "alpha" in text or "sample size" in text:
        strengths.append("Statistical justification mentioned.")
    else:
        weaknesses.append("No power calculation or alpha/beta specification.")
    if "regression" in text or "mixed model" in text or "survival" in text:
        strengths.append("Uses appropriate inferential models.")
    if "missing data" not in text:
        weaknesses.append("Missing-data strategy not described.")
    score = 6.0 + len(strengths) - len(weaknesses)
    score = max(2.0, min(9.0, score))
    rec = "Recommend" if score >= 7 else "Recommend with revisions" if score >= 4 else "Do not recommend"
    return ReviewerVoice("Statistical Reviewer", round(score, 1),
                         strengths, weaknesses, [], rec)


def _program_officer(req: GrantReviewRequest) -> ReviewerVoice:
    strengths: list[str] = []
    weaknesses: list[str] = []
    if not req.funder_priorities:
        weaknesses.append("Alignment with funder priorities is not explicit.")
    else:
        strengths.append("Funder priorities are referenced.")
    if not req.moe or len(req.moe.split()) < 25:
        weaknesses.append("Monitoring & evaluation is light.")
    if not req.sustainability or len(req.sustainability.split()) < 25:
        weaknesses.append("Sustainability beyond grant period is unclear.")
    if not req.budget_summary:
        weaknesses.append("Budget narrative is missing.")
    score = 6.5 - 0.7 * len(weaknesses) + 0.3 * len(strengths)
    score = max(2.0, min(9.0, score))
    rec = "Recommend" if score >= 7 else "Recommend with revisions" if score >= 4 else "Do not recommend"
    return ReviewerVoice("Program Officer", round(score, 1),
                         strengths, weaknesses, [], rec)


class GrantReviewEngine:
    def review(self, req: GrantReviewRequest) -> GrantReviewReport:
        reviewers = [_scientific(req), _methodology(req),
                     _statistical(req), _program_officer(req)]
        avg = sum(r.score for r in reviewers) / max(len(reviewers), 1)
        if avg >= 7.5:
            overall = "Recommend for funding"
            probs = {"fund": 0.65, "revise": 0.30, "reject": 0.05}
        elif avg >= 5.5:
            overall = "Major revisions before re-submission"
            probs = {"fund": 0.20, "revise": 0.55, "reject": 0.25}
        else:
            overall = "Do not recommend in current form"
            probs = {"fund": 0.05, "revise": 0.30, "reject": 0.65}

        committee = (
            f"Mean panel score {avg:.1f}/9. "
            "Reviewers converge on the following themes: "
            + "; ".join({w for r in reviewers for w in r.weaknesses[:1]}) or
            "Reviewers found no major blocking issues."
        )
        return GrantReviewReport(reviewers=reviewers,
                                 committee_summary=committee,
                                 overall_recommendation=overall,
                                 decision_probability=probs)


grant_review_engine = GrantReviewEngine()
