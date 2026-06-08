"""Questionnaire & Data Collection Engine routes."""
from fastapi import APIRouter, HTTPException

from app.engines.questionnaires import questionnaire_engine
from app.schemas.extras import (
    QuestionnaireExportFormat,
    QuestionnaireExportResponse,
    QuestionnaireRequest,
)

router = APIRouter(prefix="/questionnaires", tags=["Questionnaires"])


@router.post("/export/{fmt}", response_model=QuestionnaireExportResponse)
def export_questionnaire(
    fmt: QuestionnaireExportFormat, req: QuestionnaireRequest
) -> QuestionnaireExportResponse:
    try:
        return questionnaire_engine.export(req, fmt)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
