"""Universal Referencing Engine routes."""
from fastapi import APIRouter, HTTPException

from app.engines.references import reference_engine
from app.schemas.engines import FormatCitationRequest, FormatCitationResponse

router = APIRouter(prefix="/references", tags=["Reference Management"])


@router.post("/format", response_model=FormatCitationResponse)
def format_citation(req: FormatCitationRequest) -> FormatCitationResponse:
    """Render a verifiable reference into the requested citation style."""
    try:
        return reference_engine.format(req)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
