"""Shared SQLModel base mixins.

Every domain model in Theourgia composes:

- :class:`IDMixin` — UUIDv7 primary key
- :class:`TimestampMixin` — ``created_at`` and ``updated_at`` columns with
  UTC defaults and automatic update tracking
- :class:`SoftDeleteMixin` — ``deleted_at`` column for soft-delete domains
  (most user-content tables; identity tables hard-delete)

The mixins are defined as abstract ``SQLModel`` classes; concrete tables
inherit them alongside the table=True bit.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, func
from sqlmodel import Column, Field, SQLModel

from theourgia.core.ids import uuid7

__all__ = ["IDMixin", "TimestampMixin", "SoftDeleteMixin"]


class IDMixin(SQLModel):
    """UUIDv7 primary key.

    The ``default_factory`` produces a new UUID on insert; explicit IDs
    (e.g., for fixtures) are accepted.
    """

    id: UUID = Field(default_factory=uuid7, primary_key=True, index=True)


class TimestampMixin(SQLModel):
    """Created / updated timestamps stored as timezone-aware UTC.

    ``created_at`` defaults to ``now()`` on insert; ``updated_at`` updates
    on every row modification via the SQLAlchemy ``onupdate`` callback.
    """

    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
        ),
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        ),
    )


class SoftDeleteMixin(SQLModel):
    """Optional ``deleted_at`` column for soft-delete semantics.

    Used by user-content tables where we want history retention. Identity
    tables (`user`, `session`) hard-delete; they do not use this mixin.
    """

    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True, index=True),
    )
