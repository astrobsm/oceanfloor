"""SPSS Compatibility Engine routes."""
from fastapi import APIRouter

from app.engines.spss import spss_engine
from app.schemas.extras import SpssDataDictRequest, SpssDataDictResponse

router = APIRouter(prefix="/spss", tags=["SPSS"])


@router.post("/data-dictionary", response_model=SpssDataDictResponse)
def data_dictionary(req: SpssDataDictRequest) -> SpssDataDictResponse:
    """Generate an SPSS data dictionary (CSV) and a syntax file (.sps)."""
    return spss_engine.build(req)
