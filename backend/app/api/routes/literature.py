"""Literature Review Engine routes."""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.engines.literature import literature_engine
from app.engines.literature_uploads import parse_article
from app.schemas.engines import (
    CitationStyle,
    LiteratureReviewRequest,
    LiteratureReviewResponse,
    LiteratureSearchRequest,
    LiteratureSearchResponse,
)

router = APIRouter(prefix="/literature", tags=["Literature Review"])


@router.post("/search", response_model=LiteratureSearchResponse)
async def search_literature(req: LiteratureSearchRequest) -> LiteratureSearchResponse:
    """Search verifiable providers (Crossref, Europe PMC) and return cited-safe records."""
    return await literature_engine.search(req)


@router.post("/review", response_model=LiteratureReviewResponse)
async def review_literature(req: LiteratureReviewRequest) -> LiteratureReviewResponse:
    """Deep review: search, fetch abstracts, summarise, and assemble an editable,
    submission-grade narrative with references rendered in the requested style."""
    return await literature_engine.review(req)


MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB per file
MAX_FILES = 50


@router.post("/review-uploads", response_model=LiteratureReviewResponse)
async def review_uploads(
    files: list[UploadFile] = File(..., description="PDF/DOCX/TXT articles"),
    style: CitationStyle = Form(CitationStyle.vancouver),
    focus: str | None = Form(None),
) -> LiteratureReviewResponse:
    """Parse the uploaded articles and produce a submission-grade literature review."""
    if not files:
        raise HTTPException(status_code=422, detail="No files supplied.")
    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=413, detail=f"At most {MAX_FILES} files per request."
        )

    parsed = []
    for f in files:
        data = await f.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"{f.filename}: exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit.",
            )
        parsed.append(parse_article(f.filename or "upload", data))

    return literature_engine.review_uploads(parsed, style=style, focus=focus)
