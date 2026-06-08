"""Smoke tests for deterministic engines (no network/LLM required)."""
from app.engines.hypotheses import hypothesis_engine
from app.engines.references import reference_engine
from app.engines.sample_size import sample_size_engine
from app.engines.statistics import statistics_engine
from app.schemas.engines import (
    CitationStyle,
    DescriptiveRequest,
    FormatCitationRequest,
    HypothesisRequest,
    ReferenceInput,
    SampleSizeRequest,
    StudyDesign,
    TestRecommendationRequest,
)


def test_single_proportion_sample_size():
    req = SampleSizeRequest(
        design=StudyDesign.cross_sectional, proportion=0.5, margin_of_error=0.05
    )
    res = sample_size_engine.calculate(req)
    # Classic n = 384 for p=0.5, e=0.05, 95% CI
    assert res.required_sample_size == 385 or res.required_sample_size == 384


def test_two_means_has_per_group():
    req = SampleSizeRequest(
        design=StudyDesign.rct_two_means, mean_difference=5, std_dev=10, power=0.8
    )
    res = sample_size_engine.calculate(req)
    assert res.per_group is not None
    assert res.required_sample_size > 0


def test_descriptive_statistics():
    res = statistics_engine.descriptive(DescriptiveRequest(data=[1, 2, 3, 4, 5]))
    assert res["mean"] == 3.0
    assert res["median"] == 3.0
    assert res["n"] == 5


def test_test_recommendation_continuous_two_groups():
    res = statistics_engine.recommend_test(
        TestRecommendationRequest(outcome_type="continuous", groups=2, paired=False)
    )
    assert "t-test" in res.recommended_test.lower()


def test_hypothesis_generation():
    res = hypothesis_engine.generate(
        HypothesisRequest(independent_variable="dressing type", dependent_variable="healing time")
    )
    assert "no association" in res.null_hypothesis.lower()


def test_vancouver_citation_requires_verifiable():
    ref = ReferenceInput(
        title="Negative pressure wound therapy outcomes",
        authors=[{"family": "Smith", "given": "John A"}],
        journal="J Wound Care",
        year=2023,
        volume="32",
        pages="100-110",
        doi="10.1000/example",
    )
    res = reference_engine.format(
        FormatCitationRequest(reference=ref, style=CitationStyle.vancouver)
    )
    assert "Smith JA" in res.rendered
    assert "doi:10.1000/example" in res.rendered
