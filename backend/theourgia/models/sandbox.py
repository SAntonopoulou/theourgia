"""Plugin / bundle sandbox isolation — Phase 14 § 11.

A sandbox is a holding area where a magician can install a plugin or
import a bundle in **preview-mode** without committing to the main
vault. Sandbox content:

- never federates
- never appears in main vault searches
- never affects main vault content
- is visible only through the sandbox-specific UI surfaces

A sandbox is bound to a specific user + vault. Sandboxes auto-expire
after 30 days unless explicitly preserved by the magician; explicit
discard is always available. Promotion to the main vault is
irrevocable (existing references to bundle data persist after the
sandbox row is gone).

Sandbox **content** (the actual bundle rows or plugin install) lives
in separate, namespaced tables that already carry a ``sandbox_id``
column when applicable. This model only persists the lifecycle
container.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
)
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin


__all__ = ["Sandbox", "SandboxKind"]


import enum


class SandboxKind(str, enum.Enum):
    """What the sandbox holds. Drives the UI affordances."""

    BUNDLE = "bundle"
    PLUGIN = "plugin"


DEFAULT_LIFETIME = timedelta(days=30)


class Sandbox(IDMixin, TimestampMixin, table=True):
    """A bundle/plugin preview area scoped to one (user, vault)."""

    __tablename__ = "sandbox"
    __table_args__ = (
        Index("ix_sandbox_owner", "owner_id"),
        Index("ix_sandbox_vault", "vault_id"),
        Index("ix_sandbox_expires", "expires_at"),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    vault_id: UUID = Field(
        sa_column=Column(
            ForeignKey("vault.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    kind: SandboxKind = Field(
        sa_column=Column(
            SQLEnum(
                SandboxKind,
                name="sandbox_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    # User-supplied label, shown in the sandbox browser
    label: str = Field(sa_column=Column(String(200), nullable=False))

    # What was imported. Free-form: "Decanic Faces v1.5.0" or
    # "did:theourgia:terra.example:agrippa-tools/geomancy-workbench@v2.1.0".
    source: str = Field(sa_column=Column(String(500), nullable=False))

    notes: str = Field(
        default="",
        sa_column=Column(String(2000), nullable=False),
    )

    # Auto-expiry. Set explicitly at create time so the contract is
    # visible in the row itself (rather than computed from created_at +
    # a setting). Promotion / discard updates this field too.
    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    promoted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
        description="Set when the sandbox is promoted to the main vault.",
    )

    discarded_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
        description="Set when the sandbox is explicitly discarded.",
    )
