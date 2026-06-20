"""Shared SQLModel base mixins.

Every domain model in Theourgia composes:

- :class:`IDMixin` — UUIDv7 primary key
- :class:`TimestampMixin` — ``created_at`` and ``updated_at`` columns with
  UTC defaults and automatic update tracking
- :class:`SoftDeleteMixin` — ``deleted_at`` column for soft-delete domains
  (most user-content tables; identity tables hard-delete)

The mixins are defined as abstract ``SQLModel`` classes; concrete tables
inherit them alongside the table=True bit.

Implementation note — **never pass ``sa_column=Column(...)`` in a
mixin**. A ``Column`` instance can only attach to one Table, and
SQLAlchemy raises ``ArgumentError: Column object already assigned`` the
moment a second subclass loads. Instead pass ``sa_type`` plus
``sa_column_kwargs`` so SQLModel constructs a fresh Column per
subclass.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime
from sqlalchemy.sql import func
from sqlmodel import Field, SQLModel

from theourgia.core.ids import uuid7

__all__ = ["IDMixin", "TimestampMixin", "SoftDeleteMixin"]


def _utcnow() -> datetime:
    """Default factory for timestamp fields. Defined at module scope so
    it can be referenced from multiple Field definitions without
    creating closure surprises."""
    return datetime.now(tz=UTC)


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
        default_factory=_utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={
            "server_default": func.now(),
            "nullable": False,
        },
    )
    updated_at: datetime = Field(
        default_factory=_utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={
            "server_default": func.now(),
            "onupdate": func.now(),
            "nullable": False,
        },
    )


class SoftDeleteMixin(SQLModel):
    """Optional ``deleted_at`` column for soft-delete semantics.

    Used by user-content tables where we want history retention. Identity
    tables (`user`, `session`) hard-delete; they do not use this mixin.
    """

    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True, "index": True},
    )
