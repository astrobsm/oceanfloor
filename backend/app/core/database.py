"""Database engine, session factory and declarative base.

Uses SQLAlchemy 2.0 style. A SQLite fallback keeps local dev frictionless when
PostgreSQL is not yet running; production always uses PostgreSQL via DATABASE_URL.
"""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""


# `pool_pre_ping` avoids stale connections after DB restarts.
engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

# Set once per process after the schema has been verified/created so we don't
# pay the catalog round-trip on every request (only the first one after a
# serverless cold start).
_schema_ready = False


def ensure_schema() -> None:
    """Idempotently create all tables on first use.

    Vercel's ASGI adapter does not reliably run FastAPI lifespan events, so we
    cannot depend on startup hooks to create the schema in production. This is a
    best-effort, run-once guard invoked from :func:`get_db` so the very first
    request after a cold start provisions the tables (and seeds the superadmin)
    if a fresh database has not been bootstrapped yet.
    """
    global _schema_ready
    if _schema_ready:
        return
    # Import models so they register on Base.metadata before create_all.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _schema_ready = True
    _seed_superadmin()


def _seed_superadmin() -> None:
    """Create the initial superadmin if no superadmin exists yet (idempotent)."""
    from sqlalchemy import select

    from app.core.security import hash_password
    from app.models.user import ROLE_SUPERADMIN, User

    db = SessionLocal()
    try:
        exists = db.scalar(select(User).where(User.role == ROLE_SUPERADMIN))
        if exists is not None:
            return
        clash = db.scalar(
            select(User).where(
                (User.username == settings.superadmin_username)
                | (User.email == settings.superadmin_email.lower())
            )
        )
        if clash is not None:
            return
        db.add(
            User(
                username=settings.superadmin_username,
                email=settings.superadmin_email.lower(),
                phone=settings.superadmin_phone,
                full_name=settings.superadmin_full_name,
                role=ROLE_SUPERADMIN,
                hashed_password=hash_password(settings.superadmin_username),
                is_active=True,
                must_change_password=True,
            )
        )
        db.commit()
    except Exception:  # pragma: no cover - seeding must never break a request
        db.rollback()
    finally:
        db.close()


def get_db() -> Generator:
    """FastAPI dependency that yields a scoped DB session."""
    ensure_schema()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables for all imported models (dev convenience; use Alembic in prod)."""
    # Import models so they register on Base.metadata before create_all.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
