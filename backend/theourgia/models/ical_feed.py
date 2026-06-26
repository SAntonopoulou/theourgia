"""iCal feed configuration model (B135).

Per ``plan/11-batches-backend.md`` § B135.

One row per vault. The H07 iCal Feed surface drives every field on
this model.

The token is the unguessable URL segment subscribers receive:
``GET /ical/v1/{token}.ics``. Regenerate rotates the token and
records the timestamp; the OLD URL stops working immediately.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import CheckConstraint, Column, ForeignKey
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["ICalFeed"]


class ICalFeed(IDMixin, TimestampMixin, table=True):
    """Per-vault iCal feed settings + URL token."""

    __tablename__ = "ical_feed"
    __table_args__ = (
        CheckConstraint(
            "visibility IN ('private', 'public')",
            name="ck_ical_feed_visibility",
        ),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
            index=True,
        ),
    )

    name: str = Field(
        default="My practice calendar", max_length=240, nullable=False,
    )

    # The six toggles wired through the H07 settings panel.
    include_resh: bool = Field(default=True, nullable=False)
    include_workings: bool = Field(default=True, nullable=False)
    include_pilgrimage_anniversaries: bool = Field(
        default=False, nullable=False,
    )
    include_lunar_events: bool = Field(default=True, nullable=False)
    include_planetary_hours: bool = Field(default=False, nullable=False)
    include_custom: bool = Field(default=False, nullable=False)
    custom_cron: Optional[str] = Field(default=None, max_length=120)

    visibility: str = Field(default="private", max_length=16, nullable=False)

    # The unique token in the feed URL. Rotating it via /regenerate
    # invalidates existing subscribers without taking the feed offline.
    url_token: str = Field(max_length=64, nullable=False, unique=True)
    last_regenerated_at: Optional[datetime] = Field(default=None)
