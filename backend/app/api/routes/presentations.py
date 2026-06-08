"""Presentation Engine routes."""
from fastapi import APIRouter

from app.engines.presentations import presentation_engine
from app.schemas.extras import PresentationRequest, PresentationResponse

router = APIRouter(prefix="/presentations", tags=["Presentations"])


@router.post("/build", response_model=PresentationResponse)
def build_presentation(req: PresentationRequest) -> PresentationResponse:
    return presentation_engine.build(req)
