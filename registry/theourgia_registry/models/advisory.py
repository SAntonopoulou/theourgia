"""Vulnerability advisories (rule 43 — severity neutral chrome)."""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia_registry.models.base import IDMixin, TimestampMixin


class AdvisorySeverity(str, enum.Enum):
    """Three tiers — rule 43, NO ``critical``."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class VulnerabilityAdvisory(IDMixin, TimestampMixin, table=True):
    __tablename__ = "vulnerability_advisory"

    plugin_id: UUID = Field(
        sa_column=Column(
            ForeignKey("plugin.id", ondelete="CASCADE"), nullable=False,
        ),
    )
    filed_by_author_id: UUID = Field(
        sa_column=Column(
            ForeignKey("author.id", ondelete="RESTRICT"), nullable=False,
        ),
        description="Author who filed the advisory (may be the plugin author or a maintainer).",
    )
    severity: AdvisorySeverity = Field(
        sa_column=Column(
            SQLEnum(
                AdvisorySeverity,
                name="advisory_severity",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    affected_version_range: str = Field(
        sa_column=Column(String(255), nullable=False),
        description='Free-form range, e.g., ">=1.0.0,<1.2.1" or "all versions".',
    )
    body: str = Field(
        sa_column=Column(String(8000), nullable=False),
        description="Advisory text — renders verbatim in the H09 banner (rule 32).",
    )
    remediation_version: str | None = Field(
        default=None, sa_column=Column(String(64), nullable=True),
    )
    published_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
        description="When the advisory becomes visible. NULL while scheduled in the future.",
    )
