"""Statistical computations using SciPy / statsmodels / lifelines."""
from __future__ import annotations

import numpy as np
from scipy import stats

from app.schemas import (
    AnovaRequest,
    ContingencyRequest,
    CorrelationRequest,
    PairedRequest,
    StatResult,
    SurvivalRequest,
    TwoGroupRequest,
)

ALPHA = 0.05


def _sig(p: float) -> str:
    return "statistically significant" if p < ALPHA else "not statistically significant"


def independent_ttest(req: TwoGroupRequest) -> StatResult:
    t, p = stats.ttest_ind(req.group1, req.group2, equal_var=req.equal_variance)
    name = "Independent t-test" if req.equal_variance else "Welch's t-test"
    return StatResult(
        test=name,
        statistic=float(t),
        p_value=float(p),
        details={
            "mean_group1": float(np.mean(req.group1)),
            "mean_group2": float(np.mean(req.group2)),
        },
        interpretation=f"Difference in means is {_sig(p)} (p={p:.4f}).",
    )


def paired_ttest(req: PairedRequest) -> StatResult:
    if len(req.before) != len(req.after):
        raise ValueError("before and after must have equal length")
    t, p = stats.ttest_rel(req.before, req.after)
    return StatResult(
        test="Paired t-test",
        statistic=float(t),
        p_value=float(p),
        details={"mean_difference": float(np.mean(np.array(req.after) - np.array(req.before)))},
        interpretation=f"Within-subject change is {_sig(p)} (p={p:.4f}).",
    )


def one_way_anova(req: AnovaRequest) -> StatResult:
    f, p = stats.f_oneway(*req.groups)
    return StatResult(
        test="One-way ANOVA",
        statistic=float(f),
        p_value=float(p),
        details={"group_means": [float(np.mean(g)) for g in req.groups]},
        interpretation=f"Differences across groups are {_sig(p)} (p={p:.4f}).",
    )


def chi_square(req: ContingencyRequest) -> StatResult:
    table = np.array(req.table)
    chi2, p, dof, expected = stats.chi2_contingency(table)
    use_fisher = table.shape == (2, 2) and (expected < 5).any()
    if use_fisher:
        _, p = stats.fisher_exact(table)
        return StatResult(
            test="Fisher exact test",
            p_value=float(p),
            details={"reason": "expected cell count < 5"},
            interpretation=f"Association is {_sig(p)} (p={p:.4f}).",
        )
    return StatResult(
        test="Chi-square test of independence",
        statistic=float(chi2),
        p_value=float(p),
        details={"dof": int(dof)},
        interpretation=f"Association is {_sig(p)} (p={p:.4f}).",
    )


def correlation(req: CorrelationRequest) -> StatResult:
    if len(req.x) != len(req.y):
        raise ValueError("x and y must have equal length")
    if req.method == "spearman":
        r, p = stats.spearmanr(req.x, req.y)
        name = "Spearman correlation"
    else:
        r, p = stats.pearsonr(req.x, req.y)
        name = "Pearson correlation"
    return StatResult(
        test=name,
        statistic=float(r),
        p_value=float(p),
        details={"coefficient": float(r)},
        interpretation=f"Correlation (r={r:.3f}) is {_sig(p)} (p={p:.4f}).",
    )


def survival(req: SurvivalRequest) -> StatResult:
    """Kaplan–Meier median survival, plus log-rank when two groups are provided."""
    from lifelines import KaplanMeierFitter
    from lifelines.statistics import logrank_test

    kmf = KaplanMeierFitter()
    kmf.fit(req.durations, event_observed=req.event_observed)
    median = kmf.median_survival_time_

    if req.groups and len(set(req.groups)) == 2:
        labels = list(set(req.groups))
        d = np.array(req.durations)
        e = np.array(req.event_observed)
        g = np.array(req.groups)
        mask = g == labels[0]
        res = logrank_test(d[mask], d[~mask], e[mask], e[~mask])
        p = float(res.p_value)
        return StatResult(
            test="Kaplan–Meier + log-rank test",
            statistic=float(res.test_statistic),
            p_value=p,
            details={"median_survival": float(median), "groups": labels},
            interpretation=f"Survival difference between groups is {_sig(p)} (p={p:.4f}).",
        )

    return StatResult(
        test="Kaplan–Meier estimate",
        statistic=None,
        p_value=None,
        details={"median_survival": float(median)},
        interpretation=f"Estimated median survival time is {median:.2f}.",
    )
