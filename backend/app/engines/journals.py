"""Journal Matching Engine.

Scores a curated catalog of medical/surgical/nursing/public-health journals
against the manuscript scope. Catalog entries are stored locally — extend by
adding rows; impact factors are indicative and must be verified against the
publisher's current data before submission.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.schemas.extras import (
    JournalMatchRequest,
    JournalMatchResponse,
    JournalSuggestion,
)


@dataclass(frozen=True)
class JournalEntry:
    name: str
    scope: str
    keywords: tuple[str, ...]
    impact_factor: float | None
    open_access: bool
    submission_url: str | None


CATALOG: tuple[JournalEntry, ...] = (
    JournalEntry(
        "Journal of Wound Care", "Wound care, tissue repair, advanced dressings",
        ("wound", "ulcer", "dressing", "tissue", "healing"), 1.9, False,
        "https://www.magonlinelibrary.com/journal/jowc",
    ),
    JournalEntry(
        "Plastic and Reconstructive Surgery", "Plastic, reconstructive and aesthetic surgery",
        ("plastic", "reconstructive", "aesthetic", "flap", "graft"), 5.2, False,
        "https://journals.lww.com/plasreconsurg/",
    ),
    JournalEntry(
        "Burns", "Burn care, rehabilitation, scarring",
        ("burn", "scald", "scar", "rehabilitation"), 3.2, False,
        "https://www.journals.elsevier.com/burns",
    ),
    JournalEntry(
        "International Wound Journal", "Wound healing research, open access",
        ("wound", "diabetic foot", "pressure injury", "chronic"), 3.0, True,
        "https://onlinelibrary.wiley.com/journal/1742481x",
    ),
    JournalEntry(
        "Journal of Advanced Nursing", "Nursing research, education, policy",
        ("nursing", "education", "competency", "patient safety"), 3.5, False,
        "https://onlinelibrary.wiley.com/journal/13652648",
    ),
    JournalEntry(
        "BMC Public Health", "Population and global health, open access",
        ("public health", "epidemiology", "surveillance", "global"), 4.0, True,
        "https://bmcpublichealth.biomedcentral.com/",
    ),
    JournalEntry(
        "The Lancet", "General medicine, high-impact clinical research",
        ("clinical trial", "general medicine", "global health"), 98.4, False,
        "https://www.thelancet.com/",
    ),
)


class JournalEngine:
    def match(self, req: JournalMatchRequest) -> JournalMatchResponse:
        text = f"{req.title} {req.abstract} {req.discipline or ''}".lower()
        scored: list[tuple[float, JournalEntry]] = []
        for entry in CATALOG:
            hits = sum(1 for kw in entry.keywords if kw in text)
            if hits == 0:
                continue
            score = hits / len(entry.keywords)
            if req.open_access_preferred and entry.open_access:
                score += 0.15
            scored.append((round(min(score, 1.0), 2), entry))
        scored.sort(key=lambda t: t[0], reverse=True)

        suggestions = [
            JournalSuggestion(
                name=entry.name,
                scope=entry.scope,
                indicative_impact_factor=entry.impact_factor,
                open_access=entry.open_access,
                fit_score=score,
                submission_url=entry.submission_url,
            )
            for score, entry in scored[:5]
        ]
        return JournalMatchResponse(
            suggestions=suggestions,
            note=(
                "Impact factors are indicative; verify on the publisher's site before "
                "submission. OceanFloor does not endorse predatory journals."
            ),
        )


journal_engine = JournalEngine()
