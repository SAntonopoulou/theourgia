"""Audit log model.

Every security-relevant event (auth, visibility downgrade, sealed-content
read, federation operation, admin action) writes a row to ``audit_event``.
Audit rows are append-only — never updated, never deleted — and are
visible to the affected vault owner and (in network context) to hub
admins through scope-controlled queries.

The schema is deliberately broad: ``actor_id``, ``vault_id``, and
``hub_id`` are nullable to cover system events, anonymous flows (cert
renewal), and cross-tenant operations.
"""

from __future__ import annotations

import enum
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field, SQLModel

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["AuditEvent", "AuditEventKind", "AuditOutcome"]


class AuditEventKind(str, enum.Enum):
    """Category of audit event.

    Kept intentionally coarse-grained; finer detail lives in the ``action``
    string and ``detail`` JSONB payload. New kinds may be added; old kinds
    are never reused for different meanings.
    """

    AUTH = "auth"
    """Login, logout, 2FA enrollment / removal, password change, session revocation."""

    VISIBILITY = "visibility"
    """Per-content visibility change (e.g., personal → public)."""

    SEALED_READ = "sealed_read"
    """Read of a zero-knowledge-encrypted content item (decryption attempt)."""

    FEDERATION = "federation"
    """Federation message sent / received, capability token issued / revoked."""

    PLUGIN = "plugin"
    """Plugin install / uninstall / activate / deactivate / config change."""

    ADMIN = "admin"
    """Hub admin action: role change, member action, content moderation."""

    BACKUP = "backup"
    """Backup run, restore initiated, snapshot pruned."""

    SECURITY = "security"
    """Account lockout, suspicious activity, key rotation."""

    SYSTEM = "system"
    """System lifecycle events (startup, shutdown, migration applied)."""


class AuditOutcome(str, enum.Enum):
    """Whether the audited action succeeded."""

    SUCCESS = "success"
    FAILURE = "failure"
    DENIED = "denied"  # action was blocked by authorization


class AuditEvent(IDMixin, TimestampMixin, table=True):
    """An immutable record of a security- or governance-relevant event.

    Audit events are append-only. The application code that records an
    event also enforces — at the database role level — that this table
    does not accept UPDATE or DELETE from the application role.
    """

    __tablename__ = "audit_event"
    __table_args__ = (
        Index("ix_audit_actor_created", "actor_id", "created_at"),
        Index("ix_audit_vault_created", "vault_id", "created_at"),
        Index("ix_audit_hub_created", "hub_id", "created_at"),
        Index("ix_audit_kind_created", "kind", "created_at"),
    )

    # Who did the thing (may be null for system events)
    actor_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
    )

    # On whose vault / hub it happened (one or both, or neither for system)
    vault_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(ForeignKey("vault.id", ondelete="SET NULL"), nullable=True),
    )
    hub_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(ForeignKey("hub.id", ondelete="SET NULL"), nullable=True),
    )

    kind: AuditEventKind = Field(
        sa_column=Column(
            SQLEnum(AuditEventKind, name="audit_event_kind"),
            nullable=False,
        ),
    )

    # Free-form action label, e.g., 'login', 'session.revoke', 'entry.seal',
    # 'federation.push'. Kept stable across versions; documented in
    # docs/developer/audit-events.md as that file is authored.
    action: str = Field(sa_column=Column(String(128), nullable=False))

    outcome: AuditOutcome = Field(
        sa_column=Column(
            SQLEnum(AuditOutcome, name="audit_outcome"),
            nullable=False,
        ),
    )

    # Source IP (may be null for in-process events)
    ip_address: Optional[str] = Field(
        default=None, sa_column=Column(String(45), nullable=True)
    )

    # User-Agent of the request (for HTTP-triggered events)
    user_agent: str = Field(default="", sa_column=Column(String(512), nullable=False))

    # Structured detail. Per-action conventions documented in
    # docs/developer/audit-events.md.
    detail: dict[str, object] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
