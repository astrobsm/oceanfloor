"""Authentication & user-management API routes.

Endpoints
---------
POST   /auth/register          self-service profile creation (initial password = username)
POST   /auth/login             username + password -> JWT
POST   /auth/login/oauth       OAuth2 password form (powers Swagger "Authorize")
GET    /auth/me                current authenticated user
POST   /auth/change-password   change own password (clears must_change flag)
POST   /auth/forgot-username   recover username via registered email or phone
POST   /auth/forgot-password   reset password back to username (forces change on next login)
GET    /auth/users             list users (admin / superadmin)
PATCH  /auth/users/{id}/role   change a user's role (superadmin)
PATCH  /auth/users/{id}/active activate / deactivate a user (admin / superadmin)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin, require_superadmin
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import (
    ALL_ROLES,
    ROLE_SUPERADMIN,
    User,
)
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ForgotUsernameRequest,
    ForgotUsernameResponse,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    SimpleMessage,
    TokenResponse,
    UpdateActiveRequest,
    UpdateRoleRequest,
    UserPublic,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _issue_token(user: User) -> str:
    return create_access_token(
        subject=str(user.id),
        extra_claims={"role": user.role, "username": user.username},
    )


def _authenticate(db: Session, username: str, password: str) -> User:
    user = db.scalar(select(User).where(User.username == username))
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact an administrator.",
        )
    return user


# --------------------------------------------------------------------------- #
# Registration                                                                #
# --------------------------------------------------------------------------- #
@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    # Uniqueness checks for friendly errors (DB constraints are the backstop).
    existing = db.scalar(
        select(User).where(
            or_(
                User.username == req.username,
                User.email == str(req.email).lower(),
                (User.phone == req.phone) if req.phone else False,
            )
        )
    )
    if existing is not None:
        if existing.username == req.username:
            field = "username"
        elif existing.email == str(req.email).lower():
            field = "email"
        else:
            field = "phone number"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with this {field} already exists.",
        )

    user = User(
        username=req.username,
        email=str(req.email).lower(),
        phone=req.phone,
        full_name=req.full_name,
        role=req.role,
        # First credential equals the username; user must change it on first login.
        hashed_password=hash_password(req.username),
        is_active=True,
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return RegisterResponse(
        user=UserPublic.model_validate(user),
        initial_password_hint=req.username,
        detail=(
            "Profile created. Sign in with your username as both your username "
            "and password — you'll be prompted to set a new password right after."
        ),
    )


# --------------------------------------------------------------------------- #
# Login                                                                        #
# --------------------------------------------------------------------------- #
@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = _authenticate(db, req.username, req.password)
    return TokenResponse(
        access_token=_issue_token(user),
        must_change_password=user.must_change_password,
        user=UserPublic.model_validate(user),
    )


@router.post("/login/oauth", response_model=TokenResponse, include_in_schema=False)
def login_oauth(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> TokenResponse:
    user = _authenticate(db, form.username.strip().lower(), form.password)
    return TokenResponse(
        access_token=_issue_token(user),
        must_change_password=user.must_change_password,
        user=UserPublic.model_validate(user),
    )


# --------------------------------------------------------------------------- #
# Current user                                                                 #
# --------------------------------------------------------------------------- #
@router.get("/me", response_model=UserPublic)
def me(current: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(current)


@router.post("/change-password", response_model=TokenResponse)
def change_password(
    req: ChangePasswordRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TokenResponse:
    if not verify_password(req.current_password, current.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    if verify_password(req.new_password, current.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password.",
        )
    if req.new_password.strip().lower() == current.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as your username.",
        )

    current.hashed_password = hash_password(req.new_password)
    current.must_change_password = False
    db.add(current)
    db.commit()
    db.refresh(current)

    # Re-issue a token so the client gets fresh claims.
    return TokenResponse(
        access_token=_issue_token(current),
        must_change_password=current.must_change_password,
        user=UserPublic.model_validate(current),
    )


# --------------------------------------------------------------------------- #
# Credential recovery                                                          #
# --------------------------------------------------------------------------- #
@router.post("/forgot-username", response_model=ForgotUsernameResponse)
def forgot_username(
    req: ForgotUsernameRequest, db: Session = Depends(get_db)
) -> ForgotUsernameResponse:
    if not req.email and not req.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide the email or phone number used at registration.",
        )
    conditions = []
    if req.email:
        conditions.append(User.email == str(req.email).lower())
    if req.phone:
        conditions.append(User.phone == req.phone.strip())

    user = db.scalar(select(User).where(or_(*conditions)))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account matches the details provided.",
        )
    return ForgotUsernameResponse(
        username=user.username,
        detail="Account found. Use the username below to sign in.",
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    req: ForgotPasswordRequest, db: Session = Depends(get_db)
) -> ForgotPasswordResponse:
    if not req.email and not req.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide the email or phone number on file to confirm your identity.",
        )
    user = db.scalar(select(User).where(User.username == req.username))
    # Verify the supplied contact detail matches the account on file.
    identity_ok = user is not None and (
        (req.email is not None and user.email == str(req.email).lower())
        or (req.phone is not None and user.phone == req.phone.strip())
    )
    if not identity_ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="We couldn't verify those details. Check and try again.",
        )

    # Reset to the username and force a change on next login (no email service wired).
    assert user is not None
    user.hashed_password = hash_password(user.username)
    user.must_change_password = True
    db.add(user)
    db.commit()

    return ForgotPasswordResponse(
        detail=(
            "Password reset. Sign in using your username as the password — "
            "you'll be asked to set a new one immediately."
        ),
    )


# --------------------------------------------------------------------------- #
# Admin: user management                                                       #
# --------------------------------------------------------------------------- #
@router.get("/users", response_model=list[UserPublic])
def list_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[UserPublic]:
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return [UserPublic.model_validate(u) for u in users]


@router.patch("/users/{user_id}/role", response_model=UserPublic)
def update_role(
    user_id: int,
    req: UpdateRoleRequest,
    actor: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> UserPublic:
    role = req.role.strip().lower()
    if role not in ALL_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown role '{req.role}'.",
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == actor.id and role != ROLE_SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own superadmin role.",
        )
    user.role = role
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserPublic.model_validate(user)


@router.patch("/users/{user_id}/active", response_model=UserPublic)
def update_active(
    user_id: int,
    req: UpdateActiveRequest,
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserPublic:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == actor.id and not req.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account.",
        )
    if user.role == ROLE_SUPERADMIN and actor.role != ROLE_SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a superadmin can modify a superadmin account.",
        )
    user.is_active = req.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserPublic.model_validate(user)


@router.delete("/users/{user_id}", response_model=SimpleMessage)
def delete_user(
    user_id: int,
    actor: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> SimpleMessage:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == actor.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )
    db.delete(user)
    db.commit()
    return SimpleMessage(detail="User deleted.")
