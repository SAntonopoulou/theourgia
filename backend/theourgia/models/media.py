"""Media asset models (B132).

Per ``plan/11-batches-backend.md`` § B132.

``MediaAsset`` is one file the practitioner has uploaded (image /
audio / video / document). The actual byte stream lives in R2; this
table stores the metadata + the R2 object key.

``MediaLink`` is a polymorphic table linking a media asset to a
non-media row (entry, voce, pilgrimage_site, publication, etc.).
Polymorphic rather than per-target columns so adding a new linkable
kind doesn't need a migration.

Honesty rules:
  * Sealed assets are count-only in list endpoints. The body is
    encrypted client-side via the B108 vaultCrypto pipeline; the
    server only sees ciphertext + the R2 key.
  * No play-counts anywhere — anti-gamification (H07 Audio Library).
  * Link counts are exact, never inflated; the cached ``link_count``
    is recomputed deterministically from ``media_link`` rows.
  * EXIF metadata storage is opt-in. ``exif_policy=STRIPPED`` means
    ``exif_metadata = {}``; ``RETAINED`` is the explicit choice.
"""

from __future__ import annotations

import enum
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = [
    "MediaAsset",
    "MediaKind",
    "MediaLink",
    "ExifPolicy",
]


class MediaKind(str, enum.Enum):
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"


class ExifPolicy(str, enum.Enum):
    RETAINED = "retained"
    STRIPPED = "stripped"


class MediaAsset(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One uploaded file. R2 holds the bytes; this holds metadata."""

    __tablename__ = "media_asset"
    __table_args__ = (
        Index("ix_media_owner", "owner_id"),
        Index("ix_media_owner_kind", "owner_id", "kind"),
        Index("ix_media_owner_sealed", "owner_id", "sealed"),
        UniqueConstraint(
            "r2_object_key", name="uq_media_r2_key",
        ),
        CheckConstraint(
            "size_bytes >= 0",
            name="ck_media_size_nonneg",
        ),
        CheckConstraint(
            "link_count >= 0",
            name="ck_media_link_count_nonneg",
        ),
        CheckConstraint(
            "(width_px IS NULL OR width_px >= 0) "
            "AND (height_px IS NULL OR height_px >= 0)",
            name="ck_media_dims_nonneg",
        ),
        CheckConstraint(
            "duration_seconds IS NULL OR duration_seconds >= 0",
            name="ck_media_duration_nonneg",
        ),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    kind: MediaKind = Field(
        sa_column=Column(
            SQLEnum(
                MediaKind,
                name="media_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    filename: str = Field(max_length=240, nullable=False)
    r2_object_key: str = Field(max_length=480, nullable=False)
    mime_type: str = Field(max_length=120, nullable=False)
    size_bytes: int = Field(ge=0, nullable=False)
    width_px: Optional[int] = Field(default=None, ge=0)
    height_px: Optional[int] = Field(default=None, ge=0)
    duration_seconds: Optional[int] = Field(default=None, ge=0)

    alt_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    caption: Optional[str] = Field(default=None, sa_column=Column(Text))
    tags: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )

    sealed: bool = Field(default=False, nullable=False)

    exif_policy: Optional[ExifPolicy] = Field(
        default=None,
        sa_column=Column(
            SQLEnum(
                ExifPolicy,
                name="exif_policy",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=True,
        ),
    )
    exif_metadata: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )

    link_count: int = Field(default=0, nullable=False, ge=0)


class MediaLink(IDMixin, TimestampMixin, table=True):
    """Polymorphic link from a non-media row to a media asset.

    ``ref_kind`` tells the route which table to look up: ``entry``,
    ``voce``, ``pilgrimage_site``, ``publication``, etc.
    """

    __tablename__ = "media_link"
    __table_args__ = (
        UniqueConstraint(
            "media_id", "ref_kind", "ref_id", name="uq_media_link",
        ),
        Index("ix_media_link_media", "media_id"),
        Index("ix_media_link_ref", "ref_kind", "ref_id"),
    )

    media_id: UUID = Field(
        sa_column=Column(
            ForeignKey("media_asset.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    ref_kind: str = Field(max_length=32, nullable=False)
    ref_id: UUID = Field(nullable=False)
