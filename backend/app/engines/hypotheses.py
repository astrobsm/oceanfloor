"""Hypothesis Engine — deterministic hypothesis drafting and test recommendation."""
from __future__ import annotations

from app.schemas.engines import (
    HypothesisRequest,
    HypothesisResponse,
    TestRecommendationRequest,
    TestRecommendationResponse,
)


class HypothesisEngine:
    def generate(self, req: HypothesisRequest) -> HypothesisResponse:
        iv, dv = req.independent_variable.strip(), req.dependent_variable.strip()
        direction = (req.direction or "two-sided").lower()

        null_h = f"There is no association between {iv} and {dv}."
        if direction == "greater":
            alt_h = f"Higher {iv} is associated with higher {dv}."
        elif direction == "less":
            alt_h = f"Higher {iv} is associated with lower {dv}."
        else:
            alt_h = f"There is an association between {iv} and {dv}."

        return HypothesisResponse(
            null_hypothesis=null_h,
            alternative_hypothesis=alt_h,
            recommended_tests=[
                "Independent t-test or ANOVA (continuous outcome, group comparison)",
                "Chi-square or Fisher exact (categorical outcome)",
                "Pearson/Spearman correlation (two continuous variables)",
                "Logistic regression (binary outcome with covariates)",
            ],
            assumption_checks=[
                "Normality (Shapiro–Wilk / Q–Q plot)",
                "Homogeneity of variance (Levene's test)",
                "Independence of observations",
                "Adequate expected cell counts for chi-square",
            ],
        )

    def recommend_test(self, req: TestRecommendationRequest) -> TestRecommendationResponse:
        ot = req.outcome_type.lower()
        if ot == "time-to-event":
            return TestRecommendationResponse(
                recommended_test="Kaplan–Meier with log-rank test; Cox proportional hazards",
                alternatives=["Accelerated failure time model"],
                rationale="Censored time-to-event data require survival methods.",
            )
        if ot == "binary":
            test = "Chi-square test" if not req.paired else "McNemar's test"
            return TestRecommendationResponse(
                recommended_test=test,
                alternatives=["Fisher exact test (small expected counts)", "Logistic regression"],
                rationale="Binary outcome compared across groups.",
            )
        if ot == "categorical":
            return TestRecommendationResponse(
                recommended_test="Chi-square test of independence",
                alternatives=["Fisher exact test", "Multinomial logistic regression"],
                rationale="Nominal categorical outcome across groups.",
            )
        # continuous
        if req.groups <= 1:
            test = "One-sample t-test" if req.normal_distribution else "Wilcoxon signed-rank test"
        elif req.groups == 2:
            if req.paired:
                test = "Paired t-test" if req.normal_distribution else "Wilcoxon signed-rank test"
            else:
                test = "Independent t-test" if req.normal_distribution else "Mann–Whitney U test"
        else:
            test = "One-way ANOVA" if req.normal_distribution else "Kruskal–Wallis test"
        return TestRecommendationResponse(
            recommended_test=test,
            alternatives=["Linear/mixed-effects regression for covariate adjustment"],
            rationale=(
                f"Continuous outcome, {req.groups} group(s), "
                f"{'paired' if req.paired else 'independent'}, "
                f"{'normal' if req.normal_distribution else 'non-normal'} distribution."
            ),
        )


hypothesis_engine = HypothesisEngine()
