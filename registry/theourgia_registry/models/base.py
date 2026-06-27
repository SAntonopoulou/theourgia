"""Shared model mixins for the registry.

Mirrors `backend/theourgia/models/base.py` shape — uses `sa_type` +
`sa_column_kwargs` so SQLModel constructs a fresh Column per subclass
(passing `sa_column=Column(...)` in a mixin reuses the same instance
across tables, which SQLAlchemy refuses).
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime
from sqlalchemy.sql import func
from sqlmodel import Field, SQLModel


class IDMixin(SQLModel):
    """UUID primary key. Server default `gen_random_uuid()` so explicit IDs
    (for fixtures) are still accepted; default_factory provides one when
    the row is created in-app."""

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)


def _utcnow() -> datetime:
    return datetime.now(tz=UTC)


class TimestampMixin(SQLModel):
    """Created + updated timestamps with timezone."""

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
