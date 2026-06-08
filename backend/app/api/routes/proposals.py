"""Research Proposal Engine routes."""
from fastapi import APIRouter

from app.engines.proposals import proposal_engine
from app.schemas.engines import ProposalRequest, ProposalResponse

router = APIRouter(prefix="/proposals", tags=["Proposal"])


@router.post("/generate", response_model=ProposalResponse)
def generate_proposal(req: ProposalRequest) -> ProposalResponse:
    """Generate a fully structured, section-complete research proposal."""
    return proposal_engine.generate(req)
