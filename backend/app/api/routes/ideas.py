"""Idea Generation Engine routes."""
from fastapi import APIRouter

from app.engines.ideas import idea_engine
from app.schemas.engines import IdeaRequest, IdeaResponse

router = APIRouter(prefix="/ideas", tags=["Idea Generation"])


@router.post("/generate", response_model=IdeaResponse)
def generate_ideas(req: IdeaRequest) -> IdeaResponse:
    """Generate, score, and rank novel research ideas from a clinical context."""
    return idea_engine.generate(req)
