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
LogFormat = Literal["json", "pretty", "auto"]


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
    log_format: LogFormat = Field(default="auto", alias="THEOURGIA_LOG_FORMAT")
    """Output format for logs. ``"auto"`` picks JSON in production / test,
    pretty in development."""
    base_url: str = Field(default="https://theourgia.example.com", alias="THEOURGIA_BASE_URL")
    instance_id: str = Field(default="theourgia.example.com", alias="THEOURGIA_INSTANCE_ID")

    # ── Single-operator vault gating (b108-2gs) ─────────────────────────────
    # Comma-separated list of magickal names permitted to CREATE a new
    # account on this instance. Empty list = open enrollment (dev default).
    # Non-empty = only these names may sign up; any other name is refused
    # with a 403 pointing the visitor at the self-hosting guide.
    #
    # Existing users can still sign in regardless of this list — the gate
    # only applies at find-or-create time. This is what makes theourgia.com
    # a "single-operator personal vault" instead of a SaaS.
    allowed_magickal_names: str = Field(
        default="", alias="THEOURGIA_ALLOWED_MAGICKAL_NAMES"
    )

    @property
    def allowed_magickal_names_set(self) -> frozenset[str]:
        """Normalise the comma-separated allowlist to a frozenset of
        case-folded names. Empty string → empty set (= open enrollment)."""
        if not self.allowed_magickal_names.strip():
            return frozenset()
        return frozenset(
            n.strip().casefold()
            for n in self.allowed_magickal_names.split(",")
            if n.strip()
        )

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
    db_pool_size: int = Field(default=10, alias="THEOURGIA_DB_POOL_SIZE", ge=1)
    """SQLAlchemy connection-pool size. Bump for high-concurrency
    deployments; defaults to 10."""
    db_max_overflow: int = Field(
        default=20, alias="THEOURGIA_DB_MAX_OVERFLOW", ge=0
    )
    """Extra connections beyond pool_size to allow under burst load."""
    db_pool_recycle_seconds: int = Field(
        default=1800, alias="THEOURGIA_DB_POOL_RECYCLE_SECONDS", ge=60
    )
    """Recycle pooled connections after this many seconds. 1800 (30 min)
    avoids server-side keepalive disconnects from most Postgres tunings."""

    # ── Redis ─────────────────────────────────────────────────────────────
    redis_url: RedisDsn = Field(
        default=RedisDsn("redis://localhost:6379/0"), alias="REDIS_URL"
    )

    # ── Cache ─────────────────────────────────────────────────────────────
    cache_backend: str = Field(default="memory", alias="THEOURGIA_CACHE_BACKEND")
    """Selected cache backend: memory or redis. Default ``memory`` is
    safe for tests + single-process dev; production should use ``redis``."""

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
    federation_transport_enabled: bool = Field(
        default=False,
        alias="THEOURGIA_FEDERATION_TRANSPORT_ENABLED",
    )
    """Whether cross-instance federation transport is enabled.

    When false (the default), outbound delivery is a no-op and inbox
    endpoints reject with 503. This is the v1.0 default — the gate flips
    to true only after a second test instance + an external threat-model
    review have been completed. See ``docs/architecture/federation-
    transport-threat-model.md``."""
    federation_allow_insecure_http: bool = Field(
        default=False,
        alias="THEOURGIA_FEDERATION_ALLOW_INSECURE_HTTP",
    )
    """LAB-ONLY. Permits plaintext http:// federation delivery URLs.
    Never enable on an internet-facing instance — signatures
    authenticate peers but plaintext transport leaks content and
    invites replay capture. Exists for twin-instance tests and LAN
    self-host labs (v1-029)."""
    federation_replay_window_seconds: int = Field(
        default=300,
        alias="THEOURGIA_FEDERATION_REPLAY_WINDOW_SECONDS",
    )
    """Sliding window for replay-nonce uniqueness. Five minutes by default
    — matches the RFC 9421 recommended skew + a small buffer."""

    # ── Backups ───────────────────────────────────────────────────────────
    restic_repository: str = Field(default="", alias="RESTIC_REPOSITORY")
    """Restic repository URL. Empty disables scheduled backups."""
    restic_password: SecretStr = Field(
        default=SecretStr(""), alias="RESTIC_PASSWORD"
    )
    aws_access_key_id: SecretStr | None = Field(
        default=None, alias="AWS_ACCESS_KEY_ID"
    )
    aws_secret_access_key: SecretStr | None = Field(
        default=None, alias="AWS_SECRET_ACCESS_KEY"
    )
    aws_default_region: str = Field(default="auto", alias="AWS_DEFAULT_REGION")
    backup_include_paths: list[Path] = Field(
        default_factory=lambda: [Path("/srv/theourgia")],
        alias="THEOURGIA_BACKUP_INCLUDE_PATHS",
    )
    """Filesystem paths included in each backup snapshot."""
    backup_exclude_patterns: list[str] = Field(
        default_factory=lambda: ["*.tmp", "*.log", "__pycache__"],
        alias="THEOURGIA_BACKUP_EXCLUDE_PATTERNS",
    )
    backup_spool_dir: Path = Field(
        default=Path("/var/spool/theourgia-backup"),
        alias="THEOURGIA_BACKUP_SPOOL_DIR",
    )
    """Writable directory where the pre-backup pg_dump lands; appended
    to the restic include paths automatically."""

    # ── Email ─────────────────────────────────────────────────────────────
    email_backend: str = Field(default="console", alias="THEOURGIA_EMAIL_BACKEND")
    """Selected delivery backend. One of: console, null, smtp, resend,
    postmark, ses, mailgun."""
    email_default_from: str = Field(default="", alias="THEOURGIA_EMAIL_DEFAULT_FROM")
    email_default_from_name: str = Field(
        default="", alias="THEOURGIA_EMAIL_DEFAULT_FROM_NAME"
    )
    email_dry_run: bool = Field(default=False, alias="THEOURGIA_EMAIL_DRY_RUN")
    """When True, behave as if sending but skip the actual delivery."""

    # Resend
    resend_api_key: SecretStr | None = Field(
        default=None, alias="THEOURGIA_RESEND_API_KEY"
    )

    # Postmark
    postmark_server_token: SecretStr | None = Field(
        default=None, alias="THEOURGIA_POSTMARK_SERVER_TOKEN"
    )
    postmark_message_stream: str = Field(
        default="outbound", alias="THEOURGIA_POSTMARK_MESSAGE_STREAM"
    )

    # SES (key/secret optional — factory falls back to the instance-wide
    # AWS credentials used by the S3 storage extra)
    ses_region: str = Field(default="", alias="THEOURGIA_SES_REGION")
    ses_access_key_id: SecretStr | None = Field(
        default=None, alias="THEOURGIA_SES_ACCESS_KEY_ID"
    )
    ses_secret_access_key: SecretStr | None = Field(
        default=None, alias="THEOURGIA_SES_SECRET_ACCESS_KEY"
    )
    ses_session_token: SecretStr | None = Field(
        default=None, alias="THEOURGIA_SES_SESSION_TOKEN"
    )

    # Mailgun
    mailgun_api_key: SecretStr | None = Field(
        default=None, alias="THEOURGIA_MAILGUN_API_KEY"
    )
    mailgun_domain: str = Field(default="", alias="THEOURGIA_MAILGUN_DOMAIN")
    mailgun_eu_region: bool = Field(
        default=False, alias="THEOURGIA_MAILGUN_EU_REGION"
    )

    # SMTP
    smtp_host: str = Field(default="", alias="THEOURGIA_SMTP_HOST")
    smtp_port: int = Field(default=587, alias="THEOURGIA_SMTP_PORT")
    smtp_username: str = Field(default="", alias="THEOURGIA_SMTP_USERNAME")
    smtp_password: SecretStr | None = Field(
        default=None, alias="THEOURGIA_SMTP_PASSWORD"
    )
    smtp_use_starttls: bool = Field(default=True, alias="THEOURGIA_SMTP_USE_STARTTLS")
    smtp_use_ssl: bool = Field(default=False, alias="THEOURGIA_SMTP_USE_SSL")

    # ── i18n ──────────────────────────────────────────────────────────────
    default_locale: str = Field(default="en", alias="THEOURGIA_DEFAULT_LOCALE")
    """Locale used when no Accept-Language match is found."""
    supported_locales: list[str] = Field(
        default_factory=lambda: ["en"],
        alias="THEOURGIA_SUPPORTED_LOCALES",
    )
    """Locales the instance has translations for. Comma-separated env
    var (e.g. ``en,es,fr,pt-BR``). Each must have a matching catalog
    under :attr:`locales_path` for translations to take effect."""
    locales_path: Path = Field(
        default=Path("backend/locales"), alias="THEOURGIA_LOCALES_PATH"
    )
    """Directory containing per-locale ``LC_MESSAGES/messages.mo``
    catalogs, in the Babel layout."""

    # ── Storage ───────────────────────────────────────────────────────────
    storage_backend: str = Field(default="local", alias="THEOURGIA_STORAGE_BACKEND")
    """Selected storage backend: local, s3, or null."""
    storage_local_path: Path = Field(
        default=Path("/var/lib/theourgia/storage"),
        alias="THEOURGIA_STORAGE_LOCAL_PATH",
    )
    storage_max_upload_size: int = Field(
        default=50 * 1024 * 1024, alias="THEOURGIA_STORAGE_MAX_UPLOAD_SIZE"
    )
    """Per-upload cap in bytes; default 50 MiB."""

    storage_s3_bucket: str = Field(default="", alias="THEOURGIA_STORAGE_S3_BUCKET")
    storage_s3_endpoint: str = Field(default="", alias="THEOURGIA_STORAGE_S3_ENDPOINT")
    storage_s3_region: str = Field(default="auto", alias="THEOURGIA_STORAGE_S3_REGION")
    storage_s3_access_key: SecretStr | None = Field(
        default=None, alias="THEOURGIA_STORAGE_S3_ACCESS_KEY"
    )
    storage_s3_secret_key: SecretStr | None = Field(
        default=None, alias="THEOURGIA_STORAGE_S3_SECRET_KEY"
    )
    storage_s3_use_ssl: bool = Field(
        default=True, alias="THEOURGIA_STORAGE_S3_USE_SSL"
    )

    # ── Transcription (Tier 2 audio — local Whisper) ──────────────────────
    transcription_enabled: bool = Field(
        default=False, alias="THEOURGIA_TRANSCRIPTION_ENABLED"
    )
    """Whether local audio transcription is available on this instance.

    **Off by default** — audio never leaves the machine either way;
    this gates whether the worker will run the (CPU-heavy) local
    Whisper model at all. Requires the ``[transcription]`` extra
    (``uv sync --extra transcription``). Users must ALSO opt in via
    the ``audio.transcription_opt_in`` user setting."""
    transcription_model: str = Field(
        default="small", alias="THEOURGIA_TRANSCRIPTION_MODEL"
    )
    """faster-whisper model size: tiny, base, small, medium, or
    large-v3. Bigger models transcribe better but need more RAM —
    see ``docs/dev/transcription.md`` for the sizing table."""

    # ── Agent daemon (Phase 16) ───────────────────────────────────────────
    # Localhost HTTP URL of the agent daemon's control plane. The vault
    # proxies the H10 C-cluster surfaces through here; when unset, agent
    # routes return 503 with a 'daemon not configured' message.
    agent_daemon_url: str | None = Field(
        default=None, alias="THEOURGIA_AGENT_DAEMON_URL",
    )
    # Shared secret presented as `X-Daemon-Auth` on every daemon call.
    # Must match the daemon's `THEOURGIA_AGENT_CONTROL_TOKEN`. Required
    # whenever agent_daemon_url is set.
    agent_daemon_control_token: SecretStr = Field(
        default=SecretStr(""),
        alias="THEOURGIA_AGENT_DAEMON_CONTROL_TOKEN",
    )

    # ── Registry (Phase 14) ───────────────────────────────────────────────
    # Base URL of the plugin registry (https://plugins.theourgia.com).
    # When unset, the H10 A-cluster marketplace browse routes return 503.
    registry_url: str | None = Field(
        default=None, alias="THEOURGIA_REGISTRY_URL",
    )
    # Operator's author DID at the registry — used to sign A-cluster
    # author-protected calls (submit / list-submissions / advisory).
    # When unset, A2-A4 + A8 routes return 503.
    author_did: str | None = Field(
        default=None, alias="THEOURGIA_AUTHOR_DID",
    )
    # Path to the Ed25519 private key (PEM) used to sign registry
    # requests. The matching public key must be registered at the
    # registry as the author's public_key.
    author_private_key_path: Path | None = Field(
        default=None, alias="THEOURGIA_AUTHOR_PRIVATE_KEY_PATH",
    )
    # Maintainer DID at the registry — used to sign A5/A6/A7 maintainer
    # endpoints (review queue, decide, tier-promote). When unset, those
    # routes return 503.
    maintainer_did: str | None = Field(
        default=None, alias="THEOURGIA_MAINTAINER_DID",
    )
    maintainer_private_key_path: Path | None = Field(
        default=None, alias="THEOURGIA_MAINTAINER_PRIVATE_KEY_PATH",
    )

    # ── WebAuthn (Phase 15) ───────────────────────────────────────────────
    # RP identifier — the registrable domain the authenticator scopes
    # credentials to. Must match the hostname the SPA is served from.
    # When unset, WebAuthn endpoints return 503.
    webauthn_rp_id: str | None = Field(
        default=None, alias="THEOURGIA_WEBAUTHN_RP_ID",
    )
    # Human-readable name shown by some authenticators during ceremony.
    webauthn_rp_name: str = Field(
        default="Theourgia", alias="THEOURGIA_WEBAUTHN_RP_NAME",
    )
    # Expected `Origin` header for verification. Usually
    # `https://<rp_id>` but distinct so localhost dev works.
    webauthn_origin: str | None = Field(
        default=None, alias="THEOURGIA_WEBAUTHN_ORIGIN",
    )

    # ── Observability ─────────────────────────────────────────────────────
    sentry_dsn: SecretStr | None = Field(default=None, alias="THEOURGIA_SENTRY_DSN")
    """Crash reporting DSN. **Off by default** — Theourgia ships with
    zero telemetry. Set this to opt-in for your own instance."""
    sentry_traces_sample_rate: float = Field(
        default=0.0, alias="THEOURGIA_SENTRY_TRACES_SAMPLE_RATE", ge=0.0, le=1.0
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

    @property
    def resolved_log_format(self) -> Literal["json", "pretty"]:
        """Concrete log format after resolving ``"auto"``.

        ``"auto"`` chooses pretty in development (terminal-friendly) and
        JSON everywhere else (log aggregators expect JSON)."""
        if self.log_format == "auto":
            return "pretty" if self.is_development else "json"
        return self.log_format


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
