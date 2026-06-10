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

    _seed_superadmin()


def _seed_superadmin() -> None:
    """Create the initial superadmin account if no superadmin exists yet.

    Idempotent: running bootstrap repeatedly will not create duplicates.
    The initial password equals the username and must be changed on first login.
    """
    from sqlalchemy import select

    from app.core.config import settings
    from app.core.database import SessionLocal
    from app.core.security import hash_password
    from app.models.user import ROLE_SUPERADMIN, User

    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.role == ROLE_SUPERADMIN))
        if existing is not None:
            print(f"[bootstrap] superadmin already exists: {existing.username}")
            return
        # Avoid colliding with a non-superadmin using the same username/email.
        clash = db.scalar(
            select(User).where(
                (User.username == settings.superadmin_username)
                | (User.email == settings.superadmin_email.lower())
            )
        )
        if clash is not None:
            print(
                "[bootstrap] cannot seed superadmin: username/email already taken "
                f"by user id={clash.id}. Set SUPERADMIN_USERNAME/SUPERADMIN_EMAIL."
            )
            return
        admin = User(
            username=settings.superadmin_username,
            email=settings.superadmin_email.lower(),
            phone=settings.superadmin_phone,
            full_name=settings.superadmin_full_name,
            role=ROLE_SUPERADMIN,
            hashed_password=hash_password(settings.superadmin_username),
            is_active=True,
            must_change_password=True,
        )
        db.add(admin)
        db.commit()
        print(
            f"[bootstrap] seeded superadmin '{admin.username}'. "
            f"Initial password = '{admin.username}' (change it on first login)."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
