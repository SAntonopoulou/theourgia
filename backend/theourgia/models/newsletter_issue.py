"""Newsletter issue model (B129).

Per ``plan/10-batches-backend.md`` § B129.

Status lifecycle:

  DRAFT      → editable. PATCH and DELETE are allowed.
  SCHEDULED  → frozen body. Cancellable. Celery beat picks it up
               at ``scheduled_send_at``.
  SENDING    → delivery in flight. Counts update from provider
               webhooks. No mutations.
  SENT       → frozen forever. Recipient counts continue to
               update from late-arriving bounce webhooks; the
               body / subject / preview NEVER change.
  CANCELLED  → terminal. Clone to a fresh DRAFT to resume.

Honesty rules:
  * **Once SENT, the issue is frozen.** No PATCH, no DELETE.
  * **Preview never counts.** `/preview` does not touch status or
    recipient counts.
  * **Empty ``targeted_tier_ids`` = ALL active subscribers.**
    Non-empty = only those tiers' subscribers.
  * **Cancel only from SCHEDULED.** A CANCELLED row is terminal;
    cloning is an explicit copy-to-new-DRAFT affordance.
  * **Send-now is --warn-soft, never --danger.** Surface-side
    contract; the API response includes ``confirmation_required``
    so the surface knows to show the warn-tone confirm modal.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["NewsletterIssue", "NewsletterIssueStatus"]


class NewsletterIssueStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    CANCELLED = "cancelled"


class NewsletterIssue(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One newsletter issue, owned by one publisher."""

    __tablename__ = "newsletter_issue"
    __table_args__ = (
        Index("ix_newsletter_issue_owner", "owner_id"),
        Index(
            "ix_newsletter_issue_owner_status",
            "owner_id",
            "status",
        ),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    subject: str = Field(max_length=240, nullable=False)
    preview_text: Optional[str] = Field(default=None, max_length=480)
    # Tiptap JSON — same node set as Publication.body (H07 rule 13).
    body: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    status: NewsletterIssueStatus = Field(
        default=NewsletterIssueStatus.DRAFT,
        sa_column=Column(
            SQLEnum(
                NewsletterIssueStatus,
                name="newsletter_issue_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=NewsletterIssueStatus.DRAFT.value,
        ),
    )
    targeted_tier_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    reply_to: Optional[str] = Field(default=None, max_length=480)

    scheduled_send_at: Optional[datetime] = Field(default=None)
    sent_at: Optional[datetime] = Field(default=None)

    recipient_count: int = Field(default=0, nullable=False)
    delivered_count: int = Field(default=0, nullable=False)
    bounced_count: int = Field(default=0, nullable=False)
