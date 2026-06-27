"""Registry settings — env-driven, isolated from the main app."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field, PostgresDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


__all__ = ["RegistrySettings", "get_settings"]


class RegistrySettings(BaseSettings):
    """Registry-side settings.

    All env vars prefixed ``THEOURGIA_REGISTRY_`` to avoid colliding
    with the main backend when both run on the same host.
    """

    model_config = SettingsConfigDict(
        env_prefix="THEOURGIA_REGISTRY_",
        env_file=None,
        extra="ignore",
    )

    # ── Identity ──────────────────────────────────────────────────────
    base_url: str = Field(default="https://plugins.theourgia.example.com")
    instance_id: str = Field(default="plugins.theourgia.example.com")

    # ── Data ──────────────────────────────────────────────────────────
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://theourgia:theourgia@localhost:5432/theourgia_registry",  # type: ignore[arg-type]
    )

    # ── Maintainer (multi-maintainer ready) ───────────────────────────
    # The DID of the initial maintainer who can appoint others. After
    # bootstrap, additional maintainers come through the
    # `/api/v1/maintainers` POST endpoint (gated on existing-maintainer
    # auth).
    bootstrap_maintainer_did: str = Field(
        default="did:theourgia:plugins.theourgia.example.com:bootstrap",
    )

    # ── Session ───────────────────────────────────────────────────────
    session_secret: SecretStr = Field(default=SecretStr("change-me-in-production"))


@lru_cache(maxsize=1)
def get_settings() -> RegistrySettings:
    """Cached settings accessor."""
    return RegistrySettings()
