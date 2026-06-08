"""Journal Matching Engine routes."""
from fastapi import APIRouter

from app.engines.journals import journal_engine
from app.schemas.extras import JournalMatchRequest, JournalMatchResponse

router = APIRouter(prefix="/journals", tags=["Journal Matching"])


@router.post("/match", response_model=JournalMatchResponse)
def match_journals(req: JournalMatchRequest) -> JournalMatchResponse:
    return journal_engine.match(req)
