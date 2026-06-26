"""Publication models (B126).

Per ``plan/10-batches-backend.md`` § B126.

``Publication`` is one published artefact — book / essay / post /
page. The lifecycle is DRAFT → SCHEDULED → LIVE → WITHDRAWN, with
an explicit republish path that flips WITHDRAWN → LIVE (the H07
"publish a new version" affordance).

``PublicationChapter`` is used only when ``kind == BOOK``. Linear
order via ``order_index`` (no nested chapters in v1).

Honesty rules:
  * Withdrawn rows STAY. ``withdrawn_at`` is an audit timestamp.
    Republishing flips the row back to LIVE with a fresh
    ``published_at``.
  * Slug + owner_id is unique (one publication per slug per vault).
  * State transitions are explicit — only the lifecycle endpoints
    change ``state``; the generic PATCH refuses to touch it.
  * Sealed entries cannot be embedded in a public publication —
    the publish endpoint rejects with 400 if the body references
    a sealed entry.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
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
    "Publication",
    "PublicationChapter",
    "PublicationKind",
    "PublicationLicense",
    "PublicationState",
]


class PublicationKind(str, enum.Enum):
    BOOK = "book"
    ESSAY = "essay"
    POST = "post"
    PAGE = "page"


class PublicationState(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    LIVE = "live"
    WITHDRAWN = "withdrawn"


class PublicationLicense(str, enum.Enum):
    """The nine licenses the H07 Editor surface picks from."""

    ALL_RIGHTS_RESERVED = "all_rights_reserved"
    CC_BY = "cc_by"
    CC_BY_SA = "cc_by_sa"
    CC_BY_NC = "cc_by_nc"
    CC_BY_NC_SA = "cc_by_nc_sa"
    CC_BY_NC_ND = "cc_by_nc_nd"
    CC_BY_ND = "cc_by_nd"
    CC0 = "cc0"
    PUBLIC_DOMAIN = "public_domain"


class Publication(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One published artefact (book / essay / post / page)."""

    __tablename__ = "publication"
    __table_args__ = (
        Index("ix_publication_owner", "owner_id"),
        Index("ix_publication_owner_state", "owner_id", "state"),
        UniqueConstraint(
            "owner_id", "slug", name="uq_publication_owner_slug",
        ),
        Index("ix_publication_published_at", "published_at"),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    kind: PublicationKind = Field(
        sa_column=Column(
            SQLEnum(
                PublicationKind,
                name="publication_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    state: PublicationState = Field(
        default=PublicationState.DRAFT,
        sa_column=Column(
            SQLEnum(
                PublicationState,
                name="publication_state",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=PublicationState.DRAFT.value,
        ),
    )
    title: str = Field(max_length=240, nullable=False)
    slug: str = Field(max_length=240, nullable=False)
    summary: Optional[str] = Field(default=None, sa_column=Column(Text))
    body: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    cover_url: Optional[str] = Field(default=None, max_length=480)
    language: str = Field(default="en", max_length=16)
    license: PublicationLicense = Field(
        default=PublicationLicense.ALL_RIGHTS_RESERVED,
        sa_column=Column(
            SQLEnum(
                PublicationLicense,
                name="publication_license",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=PublicationLicense.ALL_RIGHTS_RESERVED.value,
        ),
    )

    # Lifecycle timestamps.
    published_at: Optional[datetime] = Field(default=None)
    scheduled_publish_at: Optional[datetime] = Field(default=None)
    withdrawn_at: Optional[datetime] = Field(default=None)

    # Pricing. Stripe wiring lives in B127.
    pricing_model: str = Field(default="free", max_length=16)
    one_time_amount_cents: Optional[int] = Field(default=None, ge=0)
    currency: str = Field(default="usd", max_length=8)

    watermark_enabled: bool = Field(default=False, nullable=False)
    cited: bool = Field(default=False, nullable=False)


class PublicationChapter(IDMixin, TimestampMixin, table=True):
    """A chapter inside a book-kind publication."""

    __tablename__ = "publication_chapter"
    __table_args__ = (
        Index("ix_chapter_publication", "publication_id"),
        UniqueConstraint(
            "publication_id", "order_index", name="uq_chapter_order",
        ),
    )

    publication_id: UUID = Field(
        sa_column=Column(
            ForeignKey("publication.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    order_index: int = Field(nullable=False, default=0)
    title: str = Field(max_length=240, nullable=False)
    body: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
