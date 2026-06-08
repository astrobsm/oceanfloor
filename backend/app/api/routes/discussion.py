"""Discussion & Interpretation Engine routes."""
from fastapi import APIRouter

from app.engines.discussion import discussion_engine
from app.schemas.extras import DiscussionRequest, DiscussionResponse

router = APIRouter(prefix="/discussion", tags=["Discussion"])


@router.post("/generate", response_model=DiscussionResponse)
def generate_discussion(req: DiscussionRequest) -> DiscussionResponse:
    return discussion_engine.generate(req)
