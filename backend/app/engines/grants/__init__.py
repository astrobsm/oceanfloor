"""Grant Writing Intelligence and Funding Optimization Engine (GWIFOE).

A locally curated funder catalog plus matching, fundability scoring,
reviewer simulation, theory-of-change / logframe scaffolding, and
budget assembly. All numbers (success rates, ceilings, deadlines) are
indicative; users must verify them on the funder's website before
submission.
"""
from app.engines.grants.catalog import FUNDERS, FunderRecord
from app.engines.grants.matching import grant_matching_engine
from app.engines.grants.review import grant_review_engine
from app.engines.grants.scoring import grant_scoring_engine
from app.engines.grants.frameworks import frameworks_engine
from app.engines.grants.budget import budget_engine

__all__ = [
    "FUNDERS",
    "FunderRecord",
    "grant_matching_engine",
    "grant_review_engine",
    "grant_scoring_engine",
    "frameworks_engine",
    "budget_engine",
]
