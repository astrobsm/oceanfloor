"""Sample Size Calculation Engine routes."""
from fastapi import APIRouter, HTTPException

from app.engines.sample_size import sample_size_engine
from app.schemas.engines import SampleSizeRequest, SampleSizeResponse

router = APIRouter(prefix="/sample-size", tags=["Sample Size"])


@router.post("/calculate", response_model=SampleSizeResponse)
def calculate_sample_size(req: SampleSizeRequest) -> SampleSizeResponse:
    """Compute the required sample size for the chosen study design."""
    try:
        return sample_size_engine.calculate(req)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
