"""Export Engine routes — stream rendered documents to the client."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.engines.export import export_engine
from app.schemas.extras import ExportManuscriptRequest

router = APIRouter(prefix="/export", tags=["Export"])


@router.post("/manuscript")
def export_manuscript(req: ExportManuscriptRequest) -> Response:
    """Render a manuscript in the requested format and stream it back."""
    try:
        artifact = export_engine.export(req)
    except RuntimeError as exc:
        # Missing optional dependency (e.g. python-docx in slim images)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return Response(
        content=artifact.content,
        media_type=artifact.media_type,
        headers={"Content-Disposition": f'attachment; filename="{artifact.filename}"'},
    )
