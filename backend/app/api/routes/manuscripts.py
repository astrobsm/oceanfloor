"""Manuscript Writing Engine routes."""
from fastapi import APIRouter

from app.engines.manuscripts import manuscript_engine
from app.schemas.extras import ManuscriptRequest, ManuscriptResponse

router = APIRouter(prefix="/manuscripts", tags=["Manuscript"])


@router.post("/assemble", response_model=ManuscriptResponse)
def assemble_manuscript(req: ManuscriptRequest) -> ManuscriptResponse:
    """Produce an IMRAD manuscript skeleton with section drafts."""
    return manuscript_engine.assemble(req)
