"""Memorial mode / digital inheritance model.

b108-2hg · FEATURES §18 (Digital inheritance / memorial mode).

One row per user. Captures the check-in cadence, executor contact,
the public "in memoriam" message, and — after a trigger — the
timestamp the memorial mode came on. The state (active / warning
/ pending / memorialized) is computed on the fly by the router;
storing it would drift.

v1 covers **manual triggers only**. Automatic time-based triggers
via a Celery beat task + cryptographic executor key-share land
in a follow-up batch.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["MemorialConfig"]


class MemorialConfig(IDMixin, TimestampMixin, table=True):
    """Per-user memorial mode configuration."""

    __tablename__ = "memorial_config"
    __table_args__ = (Index("ix_memorial_config_owner", "owner_id", unique=True),)

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    # How many days can pass without a check-in before we transition
    # from "active" → "warning". 0 = disabled (never expire).
    check_in_cadence_days: int = Field(
        default=180,
        sa_column=Column(Integer, nullable=False, server_default="180"),
        description=(
            "Days between required check-ins. If more than this passes "
            "without a check-in, the vault enters warning state."
        ),
    )

    # After warning starts, how many more days until pending trigger.
    warning_window_days: int = Field(
        default=30,
        sa_column=Column(Integer, nullable=False, server_default="30"),
        description=(
            "Once warning is active, how many days before the vault "
            "enters memorial-pending state. During this window the "
            "designated executor could initiate memorial mode."
        ),
    )

    last_check_in_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
    )

    # Contact for the designated digital executor. Cryptographic
    # key-share lands in a follow-up batch; for v1 this is just an
    # informational field.
    executor_name: Optional[str] = Field(
        default=None,
        sa_column=Column(String(240), nullable=True),
    )

    executor_email: Optional[str] = Field(
        default=None,
        sa_column=Column(String(480), nullable=True),
    )

    # The public message displayed on the vault after memorialization.
    memorial_message: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "Text shown at the top of the vault's public surfaces "
            "after memorial mode activates. Kept blank in life."
        ),
    )

    # Whether entries marked "publish on death" should auto-publish
    # when memorial mode activates. Off by default.
    posthumous_publications_enabled: bool = Field(
        default=False,
        sa_column=Column(
            Boolean,
            nullable=False,
            server_default="false",
        ),
    )

    # Timestamp of the memorial trigger. NULL means the vault is still
    # active. Once set, the vault enters read-only memorial mode.
    memorialized_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
    )
