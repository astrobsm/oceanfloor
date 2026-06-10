"""Application configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings object. Values come from environment / `.env`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        populate_by_name=True,
    )

    environment: str = "development"
    project_name: str = "OceanFloor — Medical Research Assistant"
    api_v1_prefix: str = "/api/v1"

    # Security
    secret_key: str = "dev-insecure-change-me"
    access_token_expire_minutes: int = 60
    algorithm: str = "HS256"

    # Bootstrap superadmin (seeded by `python -m app.core.bootstrap`).
    # The initial password equals the username; the account is flagged to
    # require a password change on first login.
    superadmin_username: str = "superadmin"
    superadmin_email: str = "superadmin@oceanfloor.local"
    superadmin_phone: str | None = None
    superadmin_full_name: str = "Platform Owner"

    # CORS (comma separated). Also accepts a regex via cors_origin_regex
    # for Vercel preview URLs (e.g. ^https://.*\.vercel\.app$).
    cors_origins: str = "http://localhost:5173"
    cors_origin_regex: str | None = None

    # Database
    # Prefer a single DATABASE_URL (Supabase / Vercel Postgres / Neon style).
    # If unset, falls back to the individual postgres_* fields below.
    database_url_override: str | None = Field(default=None, alias="DATABASE_URL")
    postgres_user: str = "oceanfloor"
    postgres_password: str = "oceanfloor"
    postgres_db: str = "oceanfloor"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    # Services
    statistical_service_url: str = "http://localhost:8001"

    # AI provider
    llm_provider: str = "mock"
    llm_model: str = "gpt-4o"
    openai_api_key: str | None = None
    azure_openai_endpoint: str | None = None
    azure_openai_api_key: str | None = None
    anthropic_api_key: str | None = None

    # Literature providers
    literature_contact_email: str = "research@example.org"
    ncbi_api_key: str | None = None

    @property
    def database_url(self) -> str:
        # Single env var wins. Supabase gives `postgres://...`; SQLAlchemy 2
        # requires the `postgresql+psycopg2://` driver prefix - normalise it.
        if self.database_url_override:
            url = self.database_url_override
            if url.startswith("postgres://"):
                url = "postgresql+psycopg2://" + url[len("postgres://"):]
            elif url.startswith("postgresql://"):
                url = "postgresql+psycopg2://" + url[len("postgresql://"):]
            return url
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
