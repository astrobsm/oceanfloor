"""Academic Integrity Engine.

Provides a *similarity assessment* and *attribution coverage* — the system never
claims guaranteed zero plagiarism (a hard rule from the master specification).

This baseline uses lexical signals (citation marker density relative to claim
sentences). A production deployment can plug a real similarity backend behind the
same interface without changing the contract.
"""
from __future__ import annotations

import re

from app.schemas.extras import IntegrityRequest, IntegrityResponse

# Detects bracketed numeric citations [1], [1,2], [1-3] and (Author, YYYY).
_CITATION_PATTERN = re.compile(r"\[[\d,\s\-]+\]|\([A-Z][A-Za-z\-]+\s+et\s+al\.?,?\s*\d{4}\)|\([A-Z][A-Za-z\-]+,\s*\d{4}\)")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")

DISCLAIMER = (
    "OceanFloor reports similarity and attribution signals only. It never claims "
    "guaranteed zero plagiarism. Submit final manuscripts to an institutional "
    "plagiarism-detection service before publication."
)


class IntegrityEngine:
    def assess(self, req: IntegrityRequest) -> IntegrityResponse:
        sentences = [s for s in _SENTENCE_SPLIT.split(req.text.strip()) if s]
        if not sentences:
            raise ValueError("text must contain at least one sentence")

        cited = sum(1 for s in sentences if _CITATION_PATTERN.search(s))
        coverage = round(cited / len(sentences), 3)

        # Sentences asserting claims (numbers / "%") but lacking a citation marker.
        claim_pattern = re.compile(r"\d+(\.\d+)?%|p\s*<\s*0\.\d+|increased|decreased|associated")
        flagged = sum(
            1
            for s in sentences
            if claim_pattern.search(s) and not _CITATION_PATTERN.search(s)
        )

        if coverage > 0.7:
            grade = "High attribution"
        elif coverage > 0.4:
            grade = "Moderate attribution"
        else:
            grade = "Low attribution"

        return IntegrityResponse(
            similarity_assessment=(
                f"Lexical similarity check is a heuristic baseline only. "
                f"Cited sentences: {cited}/{len(sentences)}."
            ),
            attribution_coverage=coverage,
            missing_citations_flagged=flagged,
            notes=f"{grade}. Provided {len(req.references)} reference identifiers for cross-check.",
            disclaimer=DISCLAIMER,
        )


integrity_engine = IntegrityEngine()
