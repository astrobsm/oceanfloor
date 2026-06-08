"""Smoke tests for the questionnaire / SPSS / integrity / quality / journals / export engines.

These all run offline (no LLM, no network).
"""
import pytest

from app.engines.export import export_engine
from app.engines.integrity import integrity_engine
from app.engines.journals import journal_engine
from app.engines.quality import quality_engine
from app.engines.questionnaires import questionnaire_engine
from app.engines.spss import spss_engine
from app.schemas.extras import (
    ExportFormat,
    ExportManuscriptRequest,
    IntegrityRequest,
    JournalMatchRequest,
    QualityRequest,
    QuestionItem,
    QuestionType,
    QuestionnaireExportFormat,
    QuestionnaireRequest,
    SpssDataDictRequest,
    SpssVariable,
)


def _sample_questionnaire() -> QuestionnaireRequest:
    return QuestionnaireRequest(
        title="Wound Healing Outcomes",
        items=[
            QuestionItem(code="AGE", text="Age in years", type=QuestionType.numeric),
            QuestionItem(
                code="DRESSING",
                text="Dressing type used",
                type=QuestionType.multiple_choice,
                options=["Foam", "Hydrocolloid", "NPWT"],
            ),
        ],
    )


def test_questionnaire_csv_export_contains_codes():
    res = questionnaire_engine.export(_sample_questionnaire(), QuestionnaireExportFormat.csv)
    assert "AGE" in res.content and "DRESSING" in res.content


def test_questionnaire_duplicate_codes_rejected():
    bad = QuestionnaireRequest(
        title="Bad",
        items=[
            QuestionItem(code="X", text="a", type=QuestionType.numeric),
            QuestionItem(code="X", text="b", type=QuestionType.numeric),
        ],
    )
    with pytest.raises(ValueError):
        questionnaire_engine.export(bad, QuestionnaireExportFormat.csv)


def test_spss_syntax_includes_variable_labels():
    req = SpssDataDictRequest(
        variables=[
            SpssVariable(
                name="PAIN", label="Pain score (0-10)", measure="scale",
                values={"0": "None", "10": "Worst"}, missing=["-99"],
            ),
        ]
    )
    res = spss_engine.build(req)
    assert "VARIABLE LABELS" in res.syntax_sps
    assert "MISSING VALUES PAIN" in res.syntax_sps
    assert "PAIN" in res.dictionary_csv


def test_integrity_never_claims_zero_plagiarism():
    text = "Wound healing improved by 25%. NPWT reduced infection rates [1]."
    res = integrity_engine.assess(IntegrityRequest(text=text, references=["10.1000/x"]))
    assert "never" in res.disclaimer.lower() or "guaranteed zero" in res.disclaimer.lower()
    assert 0 <= res.attribution_coverage <= 1


def test_quality_score_in_range_and_recommends():
    req = QualityRequest(
        methodology_score=6, statistics_score=5, citation_score=8,
        ethics_score=9, reporting_score=7, writing_score=8,
    )
    res = quality_engine.score(req)
    assert 0 <= res.overall_score <= 10
    assert res.grade in {"Excellent", "Good", "Adequate", "Needs major revision"}


def test_journal_match_returns_relevant_suggestion():
    req = JournalMatchRequest(
        title="Negative pressure wound therapy for diabetic foot ulcers",
        abstract="A randomized trial of NPWT for chronic wound healing in diabetes.",
        discipline="Wound Care",
    )
    res = journal_engine.match(req)
    names = [s.name for s in res.suggestions]
    assert any("Wound" in n for n in names)


def test_export_markdown_roundtrip():
    req = ExportManuscriptRequest(
        format=ExportFormat.md,
        title="Sample Manuscript",
        sections={"Introduction": "Hello world.", "Methods": "Methods text."},
    )
    art = export_engine.export(req)
    assert art.filename.endswith(".md")
    assert b"# Sample Manuscript" in art.content
    assert b"## Methods" in art.content


def test_export_json_has_sections():
    req = ExportManuscriptRequest(
        format=ExportFormat.json, title="T", sections={"A": "1"},
    )
    art = export_engine.export(req)
    assert b'"sections"' in art.content
