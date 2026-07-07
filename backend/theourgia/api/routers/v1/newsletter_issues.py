"""Newsletter issue HTTP endpoints (B129).

Per ``plan/10-batches-backend.md`` § B129.

``GET    /api/v1/newsletter-issues``                  — list
``POST   /api/v1/newsletter-issues``                  — create draft
``GET    /api/v1/newsletter-issues/{id}``             — read
``PATCH  /api/v1/newsletter-issues/{id}``             — draft-only
``DELETE /api/v1/newsletter-issues/{id}``             — draft-only soft
``POST   /api/v1/newsletter-issues/{id}/preview``     — single recipient
``POST   /api/v1/newsletter-issues/{id}/send-now``    — DRAFT → SENDING
``POST   /api/v1/newsletter-issues/{id}/schedule``    — DRAFT/SCHEDULED → SCHEDULED
``POST   /api/v1/newsletter-issues/{id}/cancel``      — SCHEDULED → CANCELLED

Honesty rules wired here:
  * Once SENT, no PATCH / DELETE.
  * Preview never touches status or counts.
  * Cancel only from SCHEDULED.
  * Send-now response carries ``confirmation_required: true`` so
    the H07 surface knows to show the --warn-soft confirm modal.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.publishing.delivery import (
    RenderedIssue,
    begin_delivery,
    render_issue,
    resolve_recipients,
)
from theourgia.models.newsletter_issue import (
    NewsletterIssue,
    NewsletterIssueStatus,
)
from theourgia.models.subscriber import Subscriber, SubscriberStatus

__all__ = ["router"]

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────


class NewsletterIssueRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str
    subject: str
    preview_text: str | None
    body: dict
    status: str
    targeted_tier_ids: list[str]
    reply_to: str | None
    scheduled_send_at: datetime | None
    sent_at: datetime | None
    recipient_count: int
    delivered_count: int
    bounced_count: int
    created_at: datetime
    updated_at: datetime


class NewsletterIssueCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1, max_length=240)
    preview_text: str | None = Field(default=None, max_length=480)
    body: dict = Field(default_factory=dict)
    reply_to: str | None = Field(default=None, max_length=480)
    targeted_tier_ids: list[UUID] = Field(default_factory=list)


class NewsletterIssueUpdate(BaseModel):
    """``status`` intentionally absent — the lifecycle endpoints
    own that. ``recipient_count`` / ``delivered_count`` /
    ``bounced_count`` / ``sent_at`` are server-only."""

    model_config = ConfigDict(extra="forbid")

    subject: str | None = Field(default=None, min_length=1, max_length=240)
    preview_text: str | None = Field(default=None, max_length=480)
    body: dict | None = None
    reply_to: str | None = Field(default=None, max_length=480)
    targeted_tier_ids: list[UUID] | None = None


class SchedulePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scheduled_send_at: datetime


class PreviewPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    preview_email: EmailStr


class PreviewResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: str
    preview_text: str | None
    html_body: str
    plaintext_body: str


class SendNowResult(BaseModel):
    """The H07 Newsletter Editor surface reads
    ``confirmation_required=true`` and shows the --warn-soft
    confirm modal. The route never spawns delivery without the
    confirm step on the surface side; backend trusts the surface
    contract here."""

    model_config = ConfigDict(extra="forbid")

    issue_id: str
    status: str
    recipient_count: int
    confirmation_required: bool


# ── Helpers ────────────────────────────────────────────────────


def _to_issue_read(row: NewsletterIssue) -> NewsletterIssueRead:
    return NewsletterIssueRead(
        id=str(row.id),
        owner_id=str(row.owner_id),
        subject=row.subject,
        preview_text=row.preview_text,
        body=dict(row.body or {}),
        status=row.status.value,
        targeted_tier_ids=[str(x) for x in (row.targeted_tier_ids or [])],
        reply_to=row.reply_to,
        scheduled_send_at=row.scheduled_send_at,
        sent_at=row.sent_at,
        recipient_count=row.recipient_count,
        delivered_count=row.delivered_count,
        bounced_count=row.bounced_count,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _load_owned(
    db: AsyncSession, issue_id: UUID, owner_id: UUID,
) -> NewsletterIssue:
    row = await db.get(NewsletterIssue, issue_id)
    if (
        row is None
        or row.deleted_at is not None
        or row.owner_id != owner_id
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Issue not found.",
        )
    return row


# ── CRUD ──────────────────────────────────────────────────────


@router.get(
    "/newsletter-issues",
    response_model=list[NewsletterIssueRead],
    tags=["newsletter-issues"],
)
async def list_issues(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    status_filter: NewsletterIssueStatus | None = None,
    limit: int = 100,
) -> list[NewsletterIssueRead]:
    stmt = (
        select(NewsletterIssue)
        .where(NewsletterIssue.owner_id == current_user.id)
        .where(NewsletterIssue.deleted_at.is_(None))
    )
    if status_filter is not None:
        stmt = stmt.where(NewsletterIssue.status == status_filter)
    stmt = (
        stmt.order_by(NewsletterIssue.created_at.desc())
        .limit(min(max(1, limit), 500))
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_issue_read(r) for r in rows]


@router.post(
    "/newsletter-issues",
    response_model=NewsletterIssueRead,
    status_code=status.HTTP_201_CREATED,
    tags=["newsletter-issues"],
)
async def create_issue(
    payload: NewsletterIssueCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> NewsletterIssueRead:
    row = NewsletterIssue(
        owner_id=current_user.id,
        subject=payload.subject,
        preview_text=payload.preview_text,
        body=dict(payload.body),
        reply_to=payload.reply_to,
        targeted_tier_ids=[str(x) for x in payload.targeted_tier_ids],
        status=NewsletterIssueStatus.DRAFT,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_issue_read(row)


@router.get(
    "/newsletter-issues/{issue_id}",
    response_model=NewsletterIssueRead,
    tags=["newsletter-issues"],
)
async def get_issue(
    issue_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> NewsletterIssueRead:
    row = await _load_owned(db, issue_id, current_user.id)
    return _to_issue_read(row)


@router.patch(
    "/newsletter-issues/{issue_id}",
    response_model=NewsletterIssueRead,
    tags=["newsletter-issues"],
)
async def update_issue(
    issue_id: UUID,
    payload: NewsletterIssueUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> NewsletterIssueRead:
    row = await _load_owned(db, issue_id, current_user.id)
    if row.status != NewsletterIssueStatus.DRAFT:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot edit from status {row.status.value!r}. "
            "Only drafts are editable.",
        )
    data = payload.model_dump(exclude_unset=True)
    if "targeted_tier_ids" in data and data["targeted_tier_ids"] is not None:
        data["targeted_tier_ids"] = [
            str(x) for x in data["targeted_tier_ids"]
        ]
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_issue_read(row)


@router.delete(
    "/newsletter-issues/{issue_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["newsletter-issues"],
)
async def delete_issue(
    issue_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await _load_owned(db, issue_id, current_user.id)
    if row.status != NewsletterIssueStatus.DRAFT:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot delete from status {row.status.value!r}. "
            "Only drafts are deletable.",
        )
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


    # ── Lifecycle ──────────────────────────────────────────────────


@router.post(
    "/newsletter-issues/{issue_id}/preview",
    response_model=PreviewResult,
    tags=["newsletter-issues"],
)
async def preview_issue(
    issue_id: UUID,
    payload: PreviewPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> PreviewResult:
    """Render the issue to a single recipient. NEVER touches the
    issue's status, recipient_count, or sent_at."""
    row = await _load_owned(db, issue_id, current_user.id)
    # Build a synthetic Subscriber so the render path stays
    # identical to the real send. The token is a stand-in marker.
    fake = Subscriber(
        owner_id=current_user.id,
        email=str(payload.preview_email),
        status=SubscriberStatus.ACTIVE,
        confirmation_token="preview",
        unsubscribe_token="preview",
    )
    rendered = render_issue(row, fake)
    return PreviewResult(
        subject=rendered.subject,
        preview_text=rendered.preview_text,
        html_body=rendered.html_body,
        plaintext_body=rendered.plaintext_body,
    )


@router.post(
    "/newsletter-issues/{issue_id}/send-now",
    response_model=SendNowResult,
    tags=["newsletter-issues"],
)
async def send_now(
    issue_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> SendNowResult:
    """Flip DRAFT → SENDING + dispatch the delivery task.

    The H07 surface contract: the response always carries
    ``confirmation_required=true`` so the surface displays the
    --warn-soft confirm modal before the practitioner reaches
    this endpoint. The route itself is matter-of-fact; the
    confirmation is enforced surface-side."""
    row = await _load_owned(db, issue_id, current_user.id)
    if row.status != NewsletterIssueStatus.DRAFT:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot send-now from status {row.status.value!r}.",
        )
    recipient_count = await begin_delivery(db=db, issue=row)
    # The Celery task that actually sends the emails dispatches
    # here. Tests stub this out by patching the dispatch hook.
    # The status flip + recipient count are already committed.
    return SendNowResult(
        issue_id=str(row.id),
        status=row.status.value,
        recipient_count=recipient_count,
        confirmation_required=True,
    )


@router.post(
    "/newsletter-issues/{issue_id}/schedule",
    response_model=NewsletterIssueRead,
    tags=["newsletter-issues"],
)
async def schedule_issue(
    issue_id: UUID,
    payload: SchedulePayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> NewsletterIssueRead:
    row = await _load_owned(db, issue_id, current_user.id)
    if row.status not in (
        NewsletterIssueStatus.DRAFT, NewsletterIssueStatus.SCHEDULED,
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot schedule from status {row.status.value!r}.",
        )
    row.status = NewsletterIssueStatus.SCHEDULED
    row.scheduled_send_at = payload.scheduled_send_at
    await db.commit()
    await db.refresh(row)
    return _to_issue_read(row)


@router.post(
    "/newsletter-issues/{issue_id}/cancel",
    response_model=NewsletterIssueRead,
    tags=["newsletter-issues"],
)
async def cancel_issue(
    issue_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> NewsletterIssueRead:
    """Cancel a SCHEDULED issue. CANCELLED is terminal; cloning is
    the affordance for re-using the body."""
    row = await _load_owned(db, issue_id, current_user.id)
    if row.status != NewsletterIssueStatus.SCHEDULED:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot cancel from status {row.status.value!r}. "
            "Only SCHEDULED issues are cancellable.",
        )
    row.status = NewsletterIssueStatus.CANCELLED
    row.scheduled_send_at = None
    await db.commit()
    await db.refresh(row)
    return _to_issue_read(row)
