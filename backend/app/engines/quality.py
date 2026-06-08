"""Research Quality Assurance Engine — composite quality score."""
from __future__ import annotations

from app.schemas.extras import QualityRequest, QualityResponse

WEIGHTS = {
    "methodology": 0.25,
    "statistics": 0.20,
    "citation": 0.15,
    "ethics": 0.15,
    "reporting": 0.15,
    "writing": 0.10,
}


class QualityEngine:
    def score(self, req: QualityRequest) -> QualityResponse:
        breakdown = {
            "methodology": req.methodology_score,
            "statistics": req.statistics_score,
            "citation": req.citation_score,
            "ethics": req.ethics_score,
            "reporting": req.reporting_score,
            "writing": req.writing_score,
        }
        overall = round(sum(breakdown[k] * w for k, w in WEIGHTS.items()), 2)
        grade = self._grade(overall)
        recommendations = self._recommendations(breakdown)
        return QualityResponse(
            overall_score=overall,
            grade=grade,
            breakdown=breakdown,
            recommendations=recommendations,
        )

    @staticmethod
    def _grade(score: float) -> str:
        if score >= 8.5:
            return "Excellent"
        if score >= 7:
            return "Good"
        if score >= 5.5:
            return "Adequate"
        return "Needs major revision"

    @staticmethod
    def _recommendations(breakdown: dict[str, float]) -> list[str]:
        recs: list[str] = []
        if breakdown["methodology"] < 7:
            recs.append("Strengthen study design rationale and address bias controls explicitly.")
        if breakdown["statistics"] < 7:
            recs.append("Re-examine test selection, assumption checks, and effect sizes with CIs.")
        if breakdown["citation"] < 7:
            recs.append("Increase citation coverage of claim-bearing sentences and verify DOIs.")
        if breakdown["ethics"] < 7:
            recs.append("Document IRB approval, consent procedure, and data-protection measures.")
        if breakdown["reporting"] < 7:
            recs.append("Follow the relevant reporting checklist (CONSORT/STROBE/PRISMA/CARE).")
        if breakdown["writing"] < 7:
            recs.append("Tighten prose; ensure each paragraph has a single claim and evidence.")
        return recs or ["Strong submission — focus on minor polish before submission."]


quality_engine = QualityEngine()
