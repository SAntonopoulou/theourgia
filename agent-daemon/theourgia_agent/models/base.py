"""Shared mixins. Same shape as the registry/backend bases."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime
from sqlalchemy.sql import func
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(tz=UTC)


class IDMixin(SQLModel):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)


class TimestampMixin(SQLModel):
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
