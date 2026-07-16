"""Installed bundles — the permanent record of MBF imports (ADR-0011).

One row per bundle import into a vault. The row is the attribution +
provenance anchor:

- ``attribution`` is NOT NULL — required attribution cannot be
  stripped (FEATURES §11); it is derived from required manifest
  fields at import time.
- ``provenance`` copies the manifest chain verbatim — append-only;
  no API writes a shortened chain.
- ``closed_tradition`` mirrors the manifest declaration so the
  respect-source handling survives the import.
- ``manifest`` stores the full envelope for later inspection and the
  Phase-12+ "update available" diff previews.

``type`` and ``signature_verdict`` are plain strings, not Postgres
enums: the type catalog is open (unknown types import as
opaque-but-listed) and verdicts may grow vocabulary across MBF
versions.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["InstalledBundle"]


class InstalledBundle(IDMixin, TimestampMixin, table=True):
    """One MBF bundle imported into a magician's vault."""

    __tablename__ = "installed_bundle"
    __table_args__ = (
        Index("ix_installed_bundle_owner", "owner_id"),
        Index("ix_installed_bundle_slug", "slug"),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    slug: str = Field(sa_column=Column(String(64), nullable=False))
    version: str = Field(sa_column=Column(String(64), nullable=False))
    name: str = Field(sa_column=Column(String(256), nullable=False))

    # FEATURES §11 catalog value — plain string, catalog is open.
    type: str = Field(sa_column=Column(String(64), nullable=False))

    # The full manifest envelope, verbatim.
    manifest: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False),
    )

    # "verified" | "unsigned" | "failed" at import time.
    signature_verdict: str = Field(
        sa_column=Column(String(16), nullable=False),
    )

    imported_item_count: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default="0"),
    )

    # Append-only provenance chain, copied verbatim from the manifest.
    provenance: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )

    closed_tradition: bool = Field(default=False, nullable=False)

    # Required attribution — cannot be stripped. Always non-empty.
    attribution: str = Field(sa_column=Column(Text, nullable=False))

    # Storage key of the retained .mbf bytes (sandbox promotes keep
    # theirs); NULL for direct imports.
    source_file_key: Optional[str] = Field(
        default=None,
        sa_column=Column(String(500), nullable=True),
    )
