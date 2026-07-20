"""Agent daemon settings.

All env vars prefixed `THEOURGIA_AGENT_` to keep them distinct from
the main backend's `THEOURGIA_` and the registry's
`THEOURGIA_REGISTRY_`. Three services, three namespaces.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, PostgresDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


__all__ = ["AgentDaemonSettings", "get_settings"]


class AgentDaemonSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="THEOURGIA_AGENT_",
        env_file=None,
        extra="ignore",
    )

    # ── Identity ──────────────────────────────────────────────────────
    listen_host: str = Field(default="127.0.0.1")
    listen_port: int = Field(default=8002)

    # Deployment environment. "test" (set by the test suite via
    # THEOURGIA_AGENT_ENV) keeps the default persistence + audit sinks
    # in-memory; anything else wires the Postgres-backed defaults.
    env: str = Field(default="production")

    # ── Data ──────────────────────────────────────────────────────────
    # Distinct DB from the vault. The daemon does NOT touch
    # vault content directly — only via MCP calls served by the vault.
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://theourgia:theourgia@localhost:5432/theourgia_agent",  # type: ignore[arg-type]
    )

    # ── Memory directory root ─────────────────────────────────────────
    # Per Phase 16 plan: `/srv/theourgia/agents/<vault>/<agent-id>/`.
    # The full path under each agent dir is human-editable markdown.
    memory_root: Path = Field(default=Path("/srv/theourgia/agents"))

    # ── Vault-side MCP endpoint ───────────────────────────────────────
    # The daemon dials this URL for vault-scoped MCP calls (read.entries
    # etc.). Local single-host: `http://127.0.0.1:8000/mcp`.
    vault_mcp_url: str = Field(default="http://127.0.0.1:8000/mcp")

    # ── Key crypto (Mode B — passphrase) ──────────────────────────────
    # Argon2id parameters for deriving an unlock key from the user's
    # passphrase. Single set — operator-tunable if the host is slow.
    # Defaults align with OWASP 2024 recommendations.
    argon2_memory_cost_kib: int = Field(default=64 * 1024)  # 64 MiB
    argon2_time_cost: int = Field(default=3)
    argon2_parallelism: int = Field(default=4)

    # Salt for HKDF that derives the per-agent encryption key from the
    # passphrase-derived master. Operators can rotate; rotation requires
    # re-encrypting every stored agent key (handled by a CLI command,
    # not surfaced to users).
    hkdf_salt: SecretStr = Field(default=SecretStr("change-me-in-production"))

    # ── Cost cap timing ───────────────────────────────────────────────
    # At-wake budget reservation (the daemon estimates the run's
    # max-spend, holds it back from the cap, refunds the unused). The
    # estimate margin is conservative: 1.4× the average of the last 10
    # runs for this (agent, kind) tuple.
    cost_cap_estimate_multiplier: float = Field(default=1.4)


@lru_cache(maxsize=1)
def get_settings() -> AgentDaemonSettings:
    return AgentDaemonSettings()
