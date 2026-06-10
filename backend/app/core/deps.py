"""Authentication & authorization FastAPI dependencies."""
from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import ROLE_ADMIN, ROLE_SUPERADMIN, User

# tokenUrl is informational for the OpenAPI docs "Authorize" button.
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.api_v1_prefix}/auth/login/oauth", auto_error=False
)

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise _CREDENTIALS_EXC
    try:
        payload = decode_access_token(token)
    except JWTError as exc:  # invalid signature / expired
        raise _CREDENTIALS_EXC from exc

    subject = payload.get("sub")
    if subject is None:
        raise _CREDENTIALS_EXC
    try:
        user_id = int(subject)
    except (TypeError, ValueError) as exc:
        raise _CREDENTIALS_EXC from exc

    user = db.get(User, user_id)
    if user is None:
        raise _CREDENTIALS_EXC
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact an administrator.",
        )
    return user


def require_roles(*roles: str) -> Callable[[User], User]:
    """Dependency factory that allows only the given roles (superadmin always passes)."""

    allowed = set(roles) | {ROLE_SUPERADMIN}

    def _guard(current: User = Depends(get_current_user)) -> User:
        if current.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current

    return _guard


# Convenience guards.
require_admin = require_roles(ROLE_ADMIN, ROLE_SUPERADMIN)
require_superadmin = require_roles(ROLE_SUPERADMIN)
