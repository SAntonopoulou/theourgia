"""Media upload session model (B133).

Per ``plan/11-batches-backend.md`` § B133.

An ``UploadSession`` is a short-lived handle (24h TTL) tying a
presigned R2 PUT URL to the eventual ``MediaAsset`` row that the
``/complete`` endpoint will create. Sessions are reaped by a
periodic task (Phase 11 follow-up); the route also lazily expires
old sessions on access.

States: PENDING → COMPLETED | CANCELLED | EXPIRED.

The session row is the audit trail — even completed/cancelled rows
stay (so a caller can debug an upload that "didn't go through").
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import CheckConstraint, Column, ForeignKey, Index
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = [
    "MediaUploadSession",
    "MediaUploadSessionStatus",
]


class MediaUploadSessionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class MediaUploadSession(IDMixin, TimestampMixin, table=True):
    """A presigned-PUT handshake handle."""

    __tablename__ = "media_upload_session"
    __table_args__ = (
        Index("ix_upload_session_owner", "owner_id"),
        Index("ix_upload_session_status", "status"),
        Index("ix_upload_session_expires", "expires_at"),
        CheckConstraint(
            "size_bytes >= 0",
            name="ck_upload_session_size_nonneg",
        ),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    status: MediaUploadSessionStatus = Field(
        default=MediaUploadSessionStatus.PENDING,
        sa_column=Column(
            SQLEnum(
                MediaUploadSessionStatus,
                name="media_upload_session_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=MediaUploadSessionStatus.PENDING.value,
        ),
    )

    # Pre-allocated R2 object key the client PUTs to.
    r2_object_key: str = Field(max_length=480, nullable=False, unique=True)

    # Echoed back from the begin payload so the complete endpoint can
    # cross-check the caller didn't change kind/mime mid-flight.
    kind: str = Field(max_length=16, nullable=False)
    filename: str = Field(max_length=240, nullable=False)
    mime_type: str = Field(max_length=120, nullable=False)
    size_bytes: int = Field(ge=0, nullable=False)

    sealed: bool = Field(default=False, nullable=False)
    exif_policy: Optional[str] = Field(default=None, max_length=16)

    expires_at: datetime = Field(nullable=False)

    # Set on /complete — id of the MediaAsset row created. Nullable
    # until then.
    media_asset_id: Optional[UUID] = Field(default=None)
