# Vercel serverless entry point for the OceanFloor FastAPI backend.
#
# Vercel's @vercel/python runtime detects an exported ASGI `app` and
# forwards the incoming HTTP request to it. The repo root is the cwd
# for the function, so we make `backend/` importable and re-export
# the FastAPI app from `app.main`.
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

# Force production semantics on Vercel (no dev DB auto-init on cold start).
os.environ.setdefault("ENVIRONMENT", "production")

from app.main import app  # noqa: E402,F401  (re-exported for Vercel)
