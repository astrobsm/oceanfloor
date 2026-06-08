"""Sample Size Calculation Engine — deterministic statistics (no LLM).

Implements standard closed-form sample-size formulas for the common study designs.
All formulas use normal approximations with z-scores for the requested confidence
and power. Results are conservative and intended for planning; final protocols
should be reviewed by a statistician.
"""
from __future__ import annotations

import math

from app.schemas.engines import SampleSizeRequest, SampleSizeResponse, StudyDesign


def _z(p: float) -> float:
    """Inverse standard normal CDF (Acklam's algorithm), avoids SciPy dependency."""
    a = [-3.969683028665376e01, 2.209460984245205e02, -2.759285104469687e02,
         1.383577518672690e02, -3.066479806614716e01, 2.506628277459239e00]
    b = [-5.447609879822406e01, 1.615858368580409e02, -1.556989798598866e02,
         6.680131188771972e01, -1.328068155288572e01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e00,
         -2.549732539343734e00, 4.374664141464968e00, 2.938163982698783e00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e00,
         3.754408661907416e00]
    plow, phigh = 0.02425, 1 - 0.02425
    if p < plow:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / \
               ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    if p > phigh:
        q = math.sqrt(-2 * math.log(1 - p))
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / \
               ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / \
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)


def _adjust_dropout(n: int, dropout: float) -> int:
    if dropout <= 0:
        return n
    return math.ceil(n / (1 - dropout))


class SampleSizeEngine:
    """Closed-form sample-size calculators."""

    def calculate(self, req: SampleSizeRequest) -> SampleSizeResponse:
        z_alpha_2 = _z(1 - (1 - req.confidence_level) / 2)
        z_beta = _z(req.power)

        if req.design in (StudyDesign.cross_sectional, StudyDesign.single_proportion):
            return self._single_proportion(req, z_alpha_2)
        if req.design == StudyDesign.single_mean:
            return self._single_mean(req, z_alpha_2)
        if req.design == StudyDesign.rct_two_proportions or req.design == StudyDesign.case_control:
            return self._two_proportions(req, z_alpha_2, z_beta)
        if req.design in (StudyDesign.rct_two_means, StudyDesign.cohort):
            return self._two_means(req, z_alpha_2, z_beta)
        raise ValueError(f"Unsupported design: {req.design}")

    def _single_proportion(self, req: SampleSizeRequest, z: float) -> SampleSizeResponse:
        p = req.proportion if req.proportion is not None else 0.5
        e = req.margin_of_error if req.margin_of_error is not None else 0.05
        n = math.ceil((z**2 * p * (1 - p)) / (e**2))
        return SampleSizeResponse(
            required_sample_size=n,
            per_group=None,
            adjusted_for_dropout=_adjust_dropout(n, req.dropout_rate),
            formula="n = Z²·p·(1−p) / e²",
            assumptions={"Z": round(z, 4), "p": p, "margin_of_error": e},
        )

    def _single_mean(self, req: SampleSizeRequest, z: float) -> SampleSizeResponse:
        sd = req.std_dev or 1.0
        e = req.margin_of_error or 0.05
        n = math.ceil((z**2 * sd**2) / (e**2))
        return SampleSizeResponse(
            required_sample_size=n,
            per_group=None,
            adjusted_for_dropout=_adjust_dropout(n, req.dropout_rate),
            formula="n = Z²·σ² / e²",
            assumptions={"Z": round(z, 4), "std_dev": sd, "margin_of_error": e},
        )

    def _two_proportions(
        self, req: SampleSizeRequest, z_a: float, z_b: float
    ) -> SampleSizeResponse:
        p1 = req.p1 if req.p1 is not None else 0.5
        p2 = req.p2 if req.p2 is not None else 0.3
        pbar = (p1 + p2) / 2
        numerator = (
            z_a * math.sqrt(2 * pbar * (1 - pbar))
            + z_b * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))
        ) ** 2
        n_per_group = math.ceil(numerator / (p1 - p2) ** 2)
        total = self._with_allocation(n_per_group, req.allocation_ratio)
        return SampleSizeResponse(
            required_sample_size=total["total"],
            per_group={"group1": total["n1"], "group2": total["n2"]},
            adjusted_for_dropout=_adjust_dropout(total["total"], req.dropout_rate),
            formula="n = [Z_α·√(2·p̄·(1−p̄)) + Z_β·√(p₁(1−p₁)+p₂(1−p₂))]² / (p₁−p₂)²",
            assumptions={"Z_alpha": round(z_a, 4), "Z_beta": round(z_b, 4), "p1": p1, "p2": p2},
        )

    def _two_means(self, req: SampleSizeRequest, z_a: float, z_b: float) -> SampleSizeResponse:
        sd = req.std_dev or 1.0
        diff = req.mean_difference if req.mean_difference else sd  # default effect = 1 SD
        n_per_group = math.ceil((2 * (z_a + z_b) ** 2 * sd**2) / (diff**2))
        total = self._with_allocation(n_per_group, req.allocation_ratio)
        return SampleSizeResponse(
            required_sample_size=total["total"],
            per_group={"group1": total["n1"], "group2": total["n2"]},
            adjusted_for_dropout=_adjust_dropout(total["total"], req.dropout_rate),
            formula="n per group = 2·(Z_α + Z_β)²·σ² / Δ²",
            assumptions={
                "Z_alpha": round(z_a, 4),
                "Z_beta": round(z_b, 4),
                "std_dev": sd,
                "mean_difference": diff,
            },
        )

    @staticmethod
    def _with_allocation(n_per_group: int, ratio: float) -> dict[str, int]:
        n1 = n_per_group
        n2 = math.ceil(n_per_group * ratio)
        return {"n1": n1, "n2": n2, "total": n1 + n2}


sample_size_engine = SampleSizeEngine()
