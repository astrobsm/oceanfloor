r"""Seed (or update) a single user account directly in the database.

Useful for creating privileged accounts (admin / superadmin) that cannot be
created through the self-service `/auth/register` endpoint.

The initial password equals the username and the account is flagged to require
a password change on first login.

Usage (PowerShell)::

    cd backend
    $env:DATABASE_URL = "postgresql://postgres:<pw>@db.<ref>.supabase.co:6543/postgres"
    ..\.venv\Scripts\python.exe -m app.core.seed_user `
        --username emma.nnadi `
        --email sylvia4douglas@gmail.com `
        --phone 08033328385 `
        --full-name "NNADI EMMANUEL CHIBUIKE" `
        --role admin

Re-running with the same username updates the existing record (email/phone/
full name/role) without changing an already-customised password.
"""
from __future__ import annotations

import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed or update a user account.")
    parser.add_argument("--username", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--full-name", default=None)
    parser.add_argument("--phone", default=None)
    parser.add_argument(
        "--role",
        default="researcher",
        choices=["superadmin", "admin", "researcher", "research_assistant"],
    )
    args = parser.parse_args()

    # Import after arg parsing so --help works without a configured DB.
    from sqlalchemy import select

    from app.core.database import Base, SessionLocal, engine
    from app.core.security import hash_password
    from app import models  # noqa: F401  (registers all tables)
    from app.models.user import User

    # Make sure the schema exists (safe/idempotent on an existing DB).
    Base.metadata.create_all(bind=engine)

    username = args.username.strip().lower()
    email = args.email.strip().lower()
    phone = args.phone.strip() if args.phone else None
    full_name = args.full_name.strip() if args.full_name else None

    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.username == username))
        if existing is not None:
            existing.email = email
            existing.phone = phone
            existing.full_name = full_name
            existing.role = args.role
            existing.is_active = True
            db.add(existing)
            db.commit()
            print(
                f"[seed_user] updated existing user '{username}' -> role={args.role}. "
                "Password left unchanged."
            )
            return

        # Guard against email collisions with a different username.
        clash = db.scalar(select(User).where(User.email == email))
        if clash is not None:
            print(
                f"[seed_user] ERROR: email '{email}' already belongs to user "
                f"'{clash.username}'. Choose a different email or update that user."
            )
            return

        user = User(
            username=username,
            email=email,
            phone=phone,
            full_name=full_name,
            role=args.role,
            hashed_password=hash_password(username),
            is_active=True,
            must_change_password=True,
        )
        db.add(user)
        db.commit()
        print(
            f"[seed_user] created '{username}' (role={args.role}). "
            f"Initial password = '{username}'. You'll be asked to change it on first login."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
