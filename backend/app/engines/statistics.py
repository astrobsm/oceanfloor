"""Biostatistics & Data Analysis Engine.

Lightweight descriptive statistics are computed locally. Heavy inferential and
survival analyses are delegated to the statistical microservice over HTTP so the
API event loop is never blocked by numeric workloads.
"""
from __future__ import annotations

import math
import statistics as st

import httpx

from app.core.config import settings
from app.engines.hypotheses import hypothesis_engine
from app.schemas.engines import (
    DescriptiveRequest,
    TestRecommendationRequest,
    TestRecommendationResponse,
)


class StatisticsEngine:
    def descriptive(self, req: DescriptiveRequest) -> dict:
        data = req.data
        if not data:
            raise ValueError("data must not be empty")
        n = len(data)
        mean = st.fmean(data)
        sd = st.stdev(data) if n > 1 else 0.0
        se = sd / math.sqrt(n) if n > 1 else 0.0
        ci_half = 1.96 * se
        ordered = sorted(data)
        return {
            "n": n,
            "mean": round(mean, 4),
            "median": round(st.median(data), 4),
            "mode": round(st.multimode(data)[0], 4),
            "std_dev": round(sd, 4),
            "variance": round(st.variance(data), 4) if n > 1 else 0.0,
            "min": min(data),
            "max": max(data),
            "range": max(data) - min(data),
            "q1": round(ordered[int(0.25 * (n - 1))], 4),
            "q3": round(ordered[int(0.75 * (n - 1))], 4),
            "ci95_lower": round(mean - ci_half, 4),
            "ci95_upper": round(mean + ci_half, 4),
        }

    def recommend_test(self, req: TestRecommendationRequest) -> TestRecommendationResponse:
        # Test recommendation is a methodology concern shared with the hypothesis engine.
        return hypothesis_engine.recommend_test(req)

    async def run_inferential(self, method: str, payload: dict) -> dict:
        """Delegate an inferential/survival analysis to the statistical microservice."""
        url = f"{settings.statistical_service_url}/analyze/{method}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()


statistics_engine = StatisticsEngine()
