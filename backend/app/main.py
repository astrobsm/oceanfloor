"""OceanFloor backend — FastAPI application entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.schemas.common import HealthResponse

__version__ = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup ONLY in dev. In production use Alembic
    # migrations (or the one-shot `python -m app.core.bootstrap` helper) so
    # serverless cold starts don't block on a DB round trip.
    if settings.environment == "development":
        try:
            from app.core.database import init_db

            init_db()
        except Exception:  # pragma: no cover - DB may be unavailable in pure-API demos
            pass
    yield


app = FastAPI(
    title=settings.project_name,
    version=__version__,
    description=(
        "AI-powered medical research ecosystem. Modular engines for ideation, proposals, "
        "literature, statistics, references, and manuscripts. Not a clinical decision tool."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", response_model=HealthResponse, tags=["System"])
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="oceanfloor-backend", version=__version__)
