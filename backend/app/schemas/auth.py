"""Pydantic schemas for authentication & user management."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import SELF_SIGNUP_ROLES


class UserPublic(BaseModel):
    """User representation safe to return to clients (no password hash)."""

    id: int
    username: str
    email: EmailStr
    phone: str | None = None
    full_name: str | None = None
    role: str
    is_active: bool
    must_change_password: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    full_name: str | None = Field(default=None, max_length=255)
    role: str = "researcher"

    @field_validator("username")
    @classmethod
    def _normalise_username(cls, v: str) -> str:
        v = v.strip().lower()
        if not v.replace("_", "").replace(".", "").replace("-", "").isalnum():
            raise ValueError(
                "Username may only contain letters, numbers, '.', '-' and '_'."
            )
        return v

    @field_validator("role")
    @classmethod
    def _validate_role(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in SELF_SIGNUP_ROLES:
            raise ValueError(
                "Role must be 'researcher' or 'research_assistant'."
            )
        return v

    @field_validator("phone")
    @classmethod
    def _clean_phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None


class RegisterResponse(BaseModel):
    user: UserPublic
    # The initial password equals the username; surfaced so the UI can remind
    # the new user how to sign in for the first time.
    initial_password_hint: str
    detail: str


class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.strip().lower()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool
    user: UserPublic


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _strength(cls, v: str) -> str:
        if v.isalnum() and v.lower() == v:
            # Encourage at least some complexity without being draconian.
            if not any(c.isdigit() for c in v):
                raise ValueError(
                    "New password must include at least one number."
                )
        return v


class ForgotUsernameRequest(BaseModel):
    # User supplies the email OR phone they registered with.
    email: EmailStr | None = None
    phone: str | None = None

    @field_validator("phone")
    @classmethod
    def _clean(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None


class ForgotUsernameResponse(BaseModel):
    username: str
    detail: str


class ForgotPasswordRequest(BaseModel):
    username: str
    # Identity confirmation: must match the email or phone on file.
    email: EmailStr | None = None
    phone: str | None = None

    @field_validator("username")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.strip().lower()


class ForgotPasswordResponse(BaseModel):
    detail: str


class UpdateRoleRequest(BaseModel):
    role: str


class UpdateActiveRequest(BaseModel):
    is_active: bool


class SimpleMessage(BaseModel):
    detail: str
