"""Journal Intelligence & Submission Optimization Engine (JISOE).

A curated, transparent, AI-augmented sub-system for matching manuscripts to
target journals, checking reporting-guideline compliance, simulating peer
and editorial review, scoring publication readiness, and generating a
complete submission package.

No fabricated DOIs, no fabricated journals. All catalog data is locally
curated and indicative — researchers must verify metrics with the
publisher before submission.
"""
from app.engines.journal_intel.catalog import CATALOG, JournalRecord
from app.engines.journal_intel.editorial import editorial_engine
from app.engines.journal_intel.guidelines import guideline_engine
from app.engines.journal_intel.matching import matching_engine
from app.engines.journal_intel.peer_review import peer_review_engine
from app.engines.journal_intel.submission import submission_engine

__all__ = [
    "CATALOG",
    "JournalRecord",
    "matching_engine",
    "guideline_engine",
    "peer_review_engine",
    "editorial_engine",
    "submission_engine",
]
