"""Upload audit log.

One row per stored object, tracked by its storage key. Used for:

- Audit (who uploaded what, when, where).
- Quota tracking (sum of per-owner size_bytes).
- Orphan detection (rows marked ``deleted`` whose backend object still
  exists, or active rows whose backend object went missing).

RLS: owner can read their own uploads; admin can read all.
"""

from __future__ import annotations

import enum
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Column,
    ForeignKey,
    Index,
    String,
)
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["Upload", "UploadStatus"]


class UploadStatus(str, enum.Enum):
    """Lifecycle of an upload record."""

    ACTIVE = "active"
    """The object exists in the backend and the row is the source of
    truth for it."""

    DELETED = "deleted"
    """The object has been removed from the backend; the row is kept
    for audit."""

    FAILED = "failed"
    """The upload was attempted but the backend rejected it. The row
    records the attempt for diagnostics."""


class Upload(IDMixin, TimestampMixin, table=True):
    """One audit row per stored object."""

    __tablename__ = "upload"
    __table_args__ = (
        Index("ix_upload_owner", "owner_id"),
        Index("ix_upload_storage_key", "storage_key", unique=True),
        Index("ix_upload_status", "status"),
    )

    storage_key: str = Field(
        sa_column=Column(String(1000), nullable=False),
        description="Backend-specific key (path / object name).",
    )

    content_type: str = Field(
        sa_column=Column(String(127), nullable=False),
    )

    size_bytes: int = Field(
        default=0,
        sa_column=Column(BigInteger, nullable=False, server_default="0"),
    )

    etag: str = Field(
        default="",
        sa_column=Column(String(255), nullable=False, server_default=""),
        description="Backend-reported entity tag / hash.",
    )

    backend: str = Field(
        sa_column=Column(String(32), nullable=False),
        description="Backend that stored the object (local, s3, …).",
    )

    status: UploadStatus = Field(
        default=UploadStatus.ACTIVE,
        sa_column=Column(
            SQLEnum(
                UploadStatus,
                name="upload_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="active",
        ),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        description=(
            "User who uploaded. Nullable so system uploads (backups, "
            "imports) can also be tracked."
        ),
    )
