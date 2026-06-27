"""Registered plugins + versions + review notes.

The schema reflects the H10 Cluster A surfaces:

- ``Plugin``           : canonical entry per author + plugin name. Carries
                         the current tier + tombstone state.
- ``PluginVersion``    : one row per submitted version. Status enum drives
                         the author's submission list (A3) and the
                         maintainer's review queue (A5).
- ``ReviewNote``       : per-version feedback from maintainer to author.
- ``TierPromotion``    : audit log of Community → Official promotions.
"""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia_registry.models.base import IDMixin, TimestampMixin


class PluginTier(str, enum.Enum):
    """Tier-1/2/3 trust. Rule 29: badges render neutral chrome."""

    OFFICIAL = "official"
    COMMUTITY = "community"  # legacy typo guard
    COMMUNITY = "community"
    UNVERIFIED = "unverified"


class VersionStatus(str, enum.Enum):
    """Submission lifecycle (rules 41 + 44)."""

    PENDING_REVIEW = "pending_review"
    UNDER_REVIEW = "under_review"
    CHANGES_REQUESTED = "changes_requested"
    ACCEPTED_COMMUNITY = "accepted_community"
    ACCEPTED_OFFICIAL = "accepted_official"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class Plugin(IDMixin, TimestampMixin, table=True):
    __tablename__ = "plugin"
    __table_args__ = (
        UniqueConstraint("author_id", "name", name="uq_plugin_author_name"),
    )

    author_id: UUID = Field(
        sa_column=Column(
            ForeignKey("author.id", ondelete="RESTRICT"), nullable=False,
        ),
    )
    name: str = Field(sa_column=Column(String(64), nullable=False))
    description: str = Field(default="", sa_column=Column(String(2000), nullable=False))
    homepage: str | None = Field(default=None, sa_column=Column(String(500), nullable=True))
    tier: PluginTier = Field(
        sa_column=Column(
            SQLEnum(
                PluginTier,
                name="plugin_tier",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    tombstoned_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
        description="Rule 40 — withdrawn plugins are tombstoned, never deleted. Existing installs keep working.",
    )
    tombstone_reason: str | None = Field(
        default=None, sa_column=Column(String(1000), nullable=True),
    )


class PluginVersion(IDMixin, TimestampMixin, table=True):
    __tablename__ = "plugin_version"
    __table_args__ = (
        UniqueConstraint(
            "plugin_id", "version", name="uq_plugin_version_plugin_version",
        ),
    )

    plugin_id: UUID = Field(
        sa_column=Column(
            ForeignKey("plugin.id", ondelete="CASCADE"), nullable=False,
        ),
    )
    version: str = Field(sa_column=Column(String(64), nullable=False))
    license_spdx: str = Field(
        sa_column=Column(String(64), nullable=False),
        description="SPDX license identifier (rule 42 — must be AGPL-compatible).",
    )
    source_url: str = Field(
        sa_column=Column(String(500), nullable=False),
        description="GitHub release URL or PyPI package coordinate.",
    )
    signature_base64: str = Field(
        sa_column=Column(String(255), nullable=False),
        description="Ed25519 signature of the manifest, base64-encoded.",
    )
    manifest_json: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    capabilities: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description="Wire-form capability strings declared in the manifest.",
    )
    status: VersionStatus = Field(
        sa_column=Column(
            SQLEnum(
                VersionStatus,
                name="version_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    submitted_by_author_id: UUID = Field(
        sa_column=Column(
            ForeignKey("author.id", ondelete="RESTRICT"), nullable=False,
        ),
    )
    decided_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    decided_by_maintainer_id: UUID | None = Field(
        default=None,
        sa_column=Column(
            ForeignKey("maintainer.id", ondelete="SET NULL"), nullable=True,
        ),
    )


class ReviewNote(IDMixin, TimestampMixin, table=True):
    __tablename__ = "review_note"

    plugin_version_id: UUID = Field(
        sa_column=Column(
            ForeignKey("plugin_version.id", ondelete="CASCADE"), nullable=False,
        ),
    )
    maintainer_id: UUID = Field(
        sa_column=Column(
            ForeignKey("maintainer.id", ondelete="RESTRICT"), nullable=False,
        ),
    )
    body: str = Field(
        sa_column=Column(String(8000), nullable=False),
        description="The note rendered verbatim to the author (no auto-formatting beyond minimal Markdown).",
    )


class TierPromotion(IDMixin, TimestampMixin, table=True):
    __tablename__ = "tier_promotion"

    plugin_id: UUID = Field(
        sa_column=Column(
            ForeignKey("plugin.id", ondelete="CASCADE"), nullable=False,
        ),
    )
    promoted_by_maintainer_id: UUID = Field(
        sa_column=Column(
            ForeignKey("maintainer.id", ondelete="RESTRICT"), nullable=False,
        ),
    )
    from_tier: PluginTier = Field(
        sa_column=Column(
            SQLEnum(
                PluginTier,
                name="plugin_tier_from",
                values_callable=lambda obj: [m.value for m in obj],
                create_type=False,
            ),
            nullable=False,
        ),
    )
    to_tier: PluginTier = Field(
        sa_column=Column(
            SQLEnum(
                PluginTier,
                name="plugin_tier_to",
                values_callable=lambda obj: [m.value for m in obj],
                create_type=False,
            ),
            nullable=False,
        ),
    )
    justification: str = Field(
        sa_column=Column(String(4000), nullable=False),
        description="Public-facing rationale for the promotion (A7). Renders on the plugin's registry detail page.",
    )
