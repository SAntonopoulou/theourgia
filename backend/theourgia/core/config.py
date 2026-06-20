"""Application settings, loaded from environment variables.

All configuration enters the app via this module. Environment variables are
read once at process start and frozen into a ``Settings`` instance accessed via
:func:`get_settings`.

See ``.env.example`` at the repository root for the canonical list of
variables, their meanings, and required-vs-optional status.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, PostgresDsn, RedisDsn, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "production", "test"]
LogLevel = Literal["debug", "info", "warning", "error"]


class Settings(BaseSettings):
    """Process-wide configuration.

    All settings are read from environment variables. Variables prefixed
    ``THEOURGIA_`` map to attributes with that prefix removed; widely-recognized
    env vars (``DATABASE_URL``, ``REDIS_URL``, …) are read directly.
    """

    model_config = SettingsConfigDict(
        env_file=None,  # rely on the shell environment; docker-compose / .devcontainer load .env
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────
    env: Environment = Field(default="development", alias="THEOURGIA_ENV")
    log_level: LogLevel = Field(default="info", alias="THEOURGIA_LOG_LEVEL")
    base_url: str = Field(default="https://theourgia.example.com", alias="THEOURGIA_BASE_URL")
    instance_id: str = Field(default="theourgia.example.com", alias="THEOURGIA_INSTANCE_ID")

    # ── Cryptography ──────────────────────────────────────────────────────
    # Required in non-test environments. Generate with: openssl rand -base64 64
    secret_key: SecretStr = Field(default=SecretStr(""), alias="THEOURGIA_SECRET_KEY")
    master_encryption_key: SecretStr = Field(
        default=SecretStr(""), alias="THEOURGIA_MASTER_ENCRYPTION_KEY"
    )

    # ── Database ──────────────────────────────────────────────────────────
    database_url: PostgresDsn = Field(
        default=PostgresDsn(  # type: ignore[arg-type]
            "postgresql+asyncpg://theourgia:theourgia@localhost:5432/theourgia"
        ),
        alias="DATABASE_URL",
    )
    migration_database_url: PostgresDsn | None = Field(
        default=None, alias="THEOURGIA_MIGRATION_DATABASE_URL"
    )

    # ── Redis ─────────────────────────────────────────────────────────────
    redis_url: RedisDsn = Field(
        default=RedisDsn("redis://localhost:6379/0"), alias="REDIS_URL"
    )

    # ── Astrology ─────────────────────────────────────────────────────────
    ephe_path: Path = Field(default=Path("backend/data/ephe"), alias="THEOURGIA_EPHE_PATH")

    # ── Federation ────────────────────────────────────────────────────────
    federation_private_key_path: Path = Field(
        default=Path("/var/lib/theourgia/federation.key"),
        alias="THEOURGIA_FEDERATION_PRIVATE_KEY_PATH",
    )
    federation_public_key_path: Path = Field(
        default=Path("/var/lib/theourgia/federation.pub"),
        alias="THEOURGIA_FEDERATION_PUBLIC_KEY_PATH",
    )

    # ── Validators ────────────────────────────────────────────────────────
    @field_validator("secret_key", "master_encryption_key")
    @classmethod
    def _require_secrets_in_non_test(cls, v: SecretStr, info: object) -> SecretStr:
        # Note: validating only that a non-empty value exists if/when we
        # know the environment. Pydantic processes fields in declared order,
        # so by the time these run the ``env`` field is already set in the
        # info.data dict on v2 — but we keep this permissive at parse-time
        # and enforce strictly via :meth:`require_secrets_or_raise` instead.
        return v

    def require_secrets_or_raise(self) -> None:
        """Enforce that required secrets are present in non-test environments.

        Called explicitly at process start. Raises :class:`RuntimeError` if
        secrets are missing.
        """
        if self.env == "test":
            return
        missing: list[str] = []
        if not self.secret_key.get_secret_value():
            missing.append("THEOURGIA_SECRET_KEY")
        if not self.master_encryption_key.get_secret_value():
            missing.append("THEOURGIA_MASTER_ENCRYPTION_KEY")
        if missing:
            msg = (
                "Theourgia refuses to start: missing required secret(s): "
                + ", ".join(missing)
                + ". Generate them with `openssl rand -base64 64` and set "
                "them in your environment."
            )
            raise RuntimeError(msg)

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @property
    def is_development(self) -> bool:
        return self.env == "development"

    @property
    def is_test(self) -> bool:
        return self.env == "test"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide settings instance.

    Cached: first call constructs from the environment; subsequent calls
    return the same instance. Test suites that need different configuration
    use :func:`reset_settings_cache` between tests.
    """
    return Settings()


def reset_settings_cache() -> None:
    """Clear the cached settings instance.

    Used by tests that mutate environment variables and need re-evaluation.
    Should not be called from application code.
    """
    get_settings.cache_clear()
