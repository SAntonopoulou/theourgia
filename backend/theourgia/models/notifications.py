"""In-app notification persistence + per-user preferences.

One :class:`Notification` row per delivery to a user via the in-app
channel. The dashboard reads from this table; users mark items read /
dismissed.

:class:`NotificationPreferenceRow` is the persisted form of
:class:`PreferenceSet` — one row per (user, kind) combination plus an
optional global ``fully_muted`` flag.

Both tables are user-scoped: RLS limits a row to its owner.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = [
    "Notification",
    "NotificationPreferenceRow",
    "NotificationReadState",
]


class NotificationReadState(str, enum.Enum):
    """Lifecycle of an in-app notification."""

    UNREAD = "unread"
    READ = "read"
    DISMISSED = "dismissed"


class Notification(IDMixin, TimestampMixin, table=True):
    """An in-app notification row."""

    __tablename__ = "notification"
    __table_args__ = (
        Index("ix_notification_user_state", "user_id", "read_state"),
        Index("ix_notification_user_created", "user_id", "created_at"),
        Index("ix_notification_template", "template_name"),
    )

    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    template_name: str = Field(
        sa_column=Column(String(128), nullable=False),
    )

    kind: str = Field(
        sa_column=Column(String(64), nullable=False),
    )

    subject: str = Field(
        sa_column=Column(String(500), nullable=False),
    )

    body_text: str = Field(
        sa_column=Column(Text, nullable=False),
    )

    body_html: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    action_url: Optional[str] = Field(
        default=None,
        sa_column=Column(String(1000), nullable=True),
    )

    action_label: Optional[str] = Field(
        default=None,
        sa_column=Column(String(128), nullable=True),
    )

    read_state: NotificationReadState = Field(
        default=NotificationReadState.UNREAD,
        sa_column=Column(
            SQLEnum(
                NotificationReadState,
                name="notification_read_state",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="unread",
        ),
    )

    read_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )


class NotificationPreferenceRow(IDMixin, TimestampMixin, table=True):
    """Per-(user, kind) channel preferences.

    A row stores the channels the user has explicitly chosen for a
    given notification kind. ``channels_csv`` is a comma-separated list
    of :class:`DeliveryChannel` values.

    A separate row with ``kind=__global__`` and ``fully_muted=true``
    represents the do-not-disturb toggle.
    """

    __tablename__ = "notification_preference"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "kind", name="uq_notification_preference_user_kind"
        ),
    )

    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    kind: str = Field(
        sa_column=Column(String(64), nullable=False),
        description="Notification kind, or '__global__' for the DND toggle.",
    )

    channels_csv: str = Field(
        default="",
        sa_column=Column(String(200), nullable=False, server_default=""),
        description="Comma-separated DeliveryChannel values, e.g. 'in_app,email'",
    )

    fully_muted: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false"),
    )
