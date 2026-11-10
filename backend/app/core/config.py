from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration comes from environment variables / backend/.env.

    Nothing secret has a usable default: the app refuses to start in
    production without JWT_SECRET, and features whose credentials are missing
    report themselves as "not configured" instead of failing silently.
    """

    # .env.local overrides .env when both exist (later files win).
    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    app_name: str = "LEARN AI API"
    api_prefix: str = "/api"

    database_url: str = Field(
        default="sqlite:///./dev.db",
        description="SQLAlchemy URL, e.g. postgresql+psycopg://user:pass@host/db?sslmode=require",
    )

    # Auth
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    cookie_secure: bool = False  # set true behind HTTPS

    # CORS: the web app normally calls through its own /api rewrite (same origin);
    # this list is for direct callers such as Expo web during development.
    cors_origins: list[str] = ["http://localhost:3000"]

    # Firebase (Google Sign-In). Only the project id is needed to verify ID tokens.
    firebase_project_id: str = ""

    # Rate limiting (requests per window per client IP, per route group)
    rate_limit_auth_per_minute: int = 10

    # AI (Gemini). Key stays server-side only.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    # Comma-separated models tried in order when the primary is overloaded (429/503) or retired (404).
    gemini_fallback_models: str = "gemini-flash-latest,gemini-3.1-flash-lite"
    gemini_embedding_model: str = "gemini-embedding-001"
    embedding_dim: int = 768
    ai_timeout_seconds: float = 45.0
    ai_messages_per_minute: int = 12   # per user
    ai_messages_per_day: int = 200     # per user
    ai_history_messages: int = 12      # prior turns sent as context
    rag_top_k: int = 4

    # Google Workspace (Drive, Docs, Calendar): a separate server-side OAuth 2.0 web client, not Firebase.
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    # Must be registered on the OAuth client. Goes through the web app's /api proxy so cookies are same-origin.
    google_oauth_redirect_uri: str = "http://localhost:3000/api/google/callback"
    # Fernet key that encrypts Google tokens at rest. Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    google_token_key: str = ""
    # Where the browser lands after the OAuth callback.
    web_app_url: str = "http://localhost:3000"

    # Fernet key for sensitive student text at rest (MindCare journal notes, support requests).
    # Required in production. Changing it makes existing journal notes unreadable.
    data_encryption_key: str = ""

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_oauth_client_id and self.google_oauth_client_secret and self.google_token_key)

    @property
    def ai_enabled(self) -> bool:
        return bool(self.gemini_api_key)

    @field_validator("database_url")
    @classmethod
    def _normalise_pg_url(cls, v: str) -> str:
        # Hosted providers hand out postgres:// or postgresql:// URLs; use the psycopg 3 driver.
        if v.startswith("postgres://"):
            v = "postgresql://" + v[len("postgres://"):]
        if v.startswith("postgresql://"):
            v = "postgresql+psycopg://" + v[len("postgresql://"):]
        if not v.startswith(("postgresql+psycopg://", "sqlite:")):
            raise ValueError(
                "DATABASE_URL must be a Postgres connection string (postgresql://user:password@host:port/db). "
                "For Supabase: Project Settings -> Database -> Connection string -> URI (Session pooler). "
                "The https://<project>.supabase.co project URL will not work."
            )
        return v

    @property
    def firebase_enabled(self) -> bool:
        return bool(self.firebase_project_id)

    def validate_runtime(self) -> None:
        if self.environment == "production":
            if len(self.jwt_secret) < 32:
                raise RuntimeError("JWT_SECRET must be set (>=32 chars) in production")
            if self.database_url.startswith("sqlite"):
                raise RuntimeError("Production requires PostgreSQL (DATABASE_URL)")
            if not self.cookie_secure:
                raise RuntimeError("Production requires COOKIE_SECURE=true (HTTPS-only auth cookies)")
            if not self.data_encryption_key:
                raise RuntimeError("Production requires DATA_ENCRYPTION_KEY (encrypts MindCare notes)")
        if self.data_encryption_key:
            from cryptography.fernet import Fernet

            try:
                Fernet(self.data_encryption_key.encode())
            except ValueError as e:
                raise RuntimeError("DATA_ENCRYPTION_KEY is not a valid Fernet key (see the command in .env.example)") from e
        if not self.jwt_secret:
            if self.environment == "production":
                raise RuntimeError("JWT_SECRET missing")
            # Development/test only: an ephemeral secret, so sessions reset on restart.
            import secrets

            self.jwt_secret = secrets.token_urlsafe(48)


@lru_cache
def get_settings() -> Settings:
    from pydantic import ValidationError

    try:
        s = Settings()
    except ValidationError as e:
        # Re-raise without input values so connection strings / secrets never reach logs.
        msgs = "; ".join(f"{'.'.join(map(str, err['loc'])).upper()}: {err['msg']}" for err in e.errors())
        raise RuntimeError(f"Invalid configuration: {msgs}") from None
    s.validate_runtime()
    return s
