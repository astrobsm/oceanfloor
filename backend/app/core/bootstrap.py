"""One-shot database bootstrap: create all tables on the configured DB.

Run this once after pointing the backend at a fresh Supabase project:

    cd backend
    $env:DATABASE_URL = "postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres"
    ..\.venv\Scripts\python.exe -m app.core.bootstrap

This avoids relying on serverless cold-start DB initialisation on Vercel.
"""
from __future__ import annotations


def main() -> None:
    from app.core.config import settings
    from app.core.database import Base, engine

    # Importing the models package registers every table on Base.metadata.
    from app import models  # noqa: F401

    print(f"[bootstrap] target = {engine.url.render_as_string(hide_password=True)}")
    print(f"[bootstrap] env    = {settings.environment}")
    Base.metadata.create_all(bind=engine)
    print("[bootstrap] done. Tables:")
    for table in sorted(Base.metadata.tables):
        print(f"  - {table}")


if __name__ == "__main__":
    main()
