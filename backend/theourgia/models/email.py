"""Email audit log.

One row per send attempt. The :class:`EmailService` persists into this
table whenever a database session is passed in — successful and failed
sends both land here, distinguished by :class:`EmailLogStatus`.

RLS: rows are admin-only by default. Per-user visibility (a user
seeing the emails *they* sent / received) requires a future policy
layered on top.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Index, String, Text
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["EmailLog", "EmailLogStatus"]


class EmailLogStatus(str, enum.Enum):
    """Outcome of an email send attempt."""

    SENT = "sent"
    FAILED = "failed"
    QUEUED = "queued"
    """Set when an async dispatch path is used; final outcome lands in
    a follow-up row update once the Celery task finishes."""


class EmailLog(IDMixin, TimestampMixin, table=True):
    """A record of one outbound email."""

    __tablename__ = "email_log"
    __table_args__ = (
        Index("ix_email_log_template", "template_name"),
        Index("ix_email_log_status_created", "status", "created_at"),
    )

    template_name: Optional[str] = Field(
        default=None,
        sa_column=Column(String(128), nullable=True),
        description=(
            "Registered template name (e.g. 'auth.password_reset'). "
            "Null for ad-hoc messages."
        ),
    )

    sender_email: str = Field(
        sa_column=Column(String(320), nullable=False),
    )

    recipient_csv: str = Field(
        sa_column=Column(String(2000), nullable=False),
        description="Comma-separated To: recipients. Cc/Bcc not recorded here.",
    )

    subject: str = Field(
        sa_column=Column(String(998), nullable=False),
        description="RFC 5322 limits subject to 998 chars",
    )

    provider: str = Field(
        sa_column=Column(String(64), nullable=False),
        description="Which backend handled the send (resend, smtp, console, …).",
    )

    provider_message_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String(255), nullable=True),
    )

    status: EmailLogStatus = Field(
        sa_column=Column(
            SQLEnum(EmailLogStatus, name="email_log_status"),
            nullable=False,
        ),
    )

    error_message: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="On failure, the provider's error (truncated).",
    )

    tags_csv: str = Field(
        default="",
        sa_column=Column(String(500), nullable=False, server_default=""),
    )
