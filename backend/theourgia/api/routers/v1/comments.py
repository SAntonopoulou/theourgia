"""Comments — visitor commentary on publications + blog entries.

b108-2gw · FEATURES §2 + §12 · "Comments with moderation".

Routes
------

Public (no auth):
- POST   /api/v1/comments                 create PENDING comment
- GET    /api/v1/comments/target/{kind}/{id}  list APPROVED comments

Owner (auth required):
- GET    /api/v1/comments/queue           list PENDING comments
- PATCH  /api/v1/comments/{id}            state / moderator_note
- DELETE /api/v1/comments/{id}            hard delete

Honesty rules:
- The target's comments_enabled MUST be true — otherwise POST returns
  409 CONFLICT.
- Every comment starts PENDING; only APPROVED renders publicly.
- The honeypot field is captured on the model; requests where it is
  filled arrive with state=SPAM automatically.
- Sealed / private targets never accept comments even if
  comments_enabled=True (defence in depth against schema drift).
"""

from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.comment import Comment, CommentState, CommentTargetKind
from theourgia.models.entries import Entry, EntryVisibility, EncryptionMode
from theourgia.models.publications import Publication, PublicationState

__all__ = ["router"]

router = APIRouter()


class CommentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_kind: Literal["entry", "publication"]
    target_id: UUID
    author_name: str = Field(min_length=1, max_length=120)
    author_email: EmailStr | None = None
    author_url: str | None = Field(default=None, max_length=480)
    body: str = Field(min_length=1, max_length=8000)
    # Honeypot — the frontend renders this hidden. Any non-empty value
    # is a bot; we store the row as SPAM and hide it from the queue by
    # default. Named deliberately unassuming.
    website_ref: str | None = Field(default=None, max_length=480)


class CommentModerate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: Literal["pending", "approved", "rejected", "spam"] | None = None
    moderator_note: str | None = Field(default=None, max_length=2000)


class CommentPublicRead(BaseModel):
    """Public projection — safe for the anonymous reader."""

    model_config = ConfigDict(extra="forbid")

    id: str
    target_kind: str
    target_id: str
    author_name: str
    author_url: str | None
    body: str
    created_at: str


class CommentModeratorRead(BaseModel):
    """Full projection — auth-required moderation queue."""

    model_config = ConfigDict(extra="forbid")

    id: str
    target_kind: str
    target_id: str
    author_name: str
    author_email: str | None
    author_url: str | None
    body: str
    state: str
    moderator_note: str | None
    ip_address: str | None
    created_at: str


def _to_public(row: Comment) -> CommentPublicRead:
    return CommentPublicRead(
        id=str(row.id),
        target_kind=row.target_kind.value,
        target_id=str(row.target_id),
        author_name=row.author_name,
        author_url=row.author_url,
        body=row.body,
        created_at=row.created_at.isoformat(),
    )


def _to_moderator(row: Comment) -> CommentModeratorRead:
    return CommentModeratorRead(
        id=str(row.id),
        target_kind=row.target_kind.value,
        target_id=str(row.target_id),
        author_name=row.author_name,
        author_email=row.author_email,
        author_url=row.author_url,
        body=row.body,
        state=row.state.value,
        moderator_note=row.moderator_note,
        ip_address=row.ip_address,
        created_at=row.created_at.isoformat(),
    )


async def _load_target_owner(
    db: AsyncSession, kind: CommentTargetKind, tid: UUID
) -> UUID:
    """Return the owner_id of the target row, raising 409 when the
    target either doesn't exist, isn't publicly commentable, or has
    comments_enabled=False."""
    if kind == CommentTargetKind.PUBLICATION:
        pub = (
            await db.execute(
                select(Publication).where(Publication.id == tid)
            )
        ).scalar_one_or_none()
        if pub is None or pub.deleted_at is not None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Target not found.")
        if pub.state != PublicationState.LIVE:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Comments not accepted on this target.",
            )
        if not pub.comments_enabled:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Comments not accepted on this target.",
            )
        return pub.owner_id
    # kind == ENTRY
    entry = (
        await db.execute(select(Entry).where(Entry.id == tid))
    ).scalar_one_or_none()
    if entry is None or entry.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Target not found.")
    if entry.visibility != EntryVisibility.PUBLIC:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Comments not accepted on this target.",
        )
    if entry.encryption_mode == EncryptionMode.SEALED:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Comments not accepted on this target.",
        )
    if not entry.comments_enabled:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Comments not accepted on this target.",
        )
    return entry.owner_id


@router.post(
    "/comments",
    status_code=status.HTTP_201_CREATED,
    response_model=CommentPublicRead,
    summary="Submit a comment for moderation",
)
async def create_comment(
    payload: CommentCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> CommentPublicRead:
    kind = CommentTargetKind(payload.target_kind)
    owner_id = await _load_target_owner(db, kind, payload.target_id)

    honey_tripped = bool((payload.website_ref or "").strip())
    initial_state = CommentState.SPAM if honey_tripped else CommentState.PENDING

    client_ip = request.client.host if request.client else None
    row = Comment(
        target_kind=kind,
        target_id=payload.target_id,
        owner_id=owner_id,
        author_name=payload.author_name.strip(),
        author_email=payload.author_email,
        author_url=payload.author_url,
        body=payload.body,
        state=initial_state,
        ip_address=client_ip,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_public(row)


@router.get(
    "/comments/target/{target_kind}/{target_id}",
    response_model=list[CommentPublicRead],
    summary="List APPROVED comments for a target",
)
async def list_target_comments(
    target_kind: Literal["entry", "publication"],
    target_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    limit: int = 200,
) -> list[CommentPublicRead]:
    stmt = (
        select(Comment)
        .where(Comment.target_kind == CommentTargetKind(target_kind))
        .where(Comment.target_id == target_id)
        .where(Comment.state == CommentState.APPROVED)
        .where(Comment.deleted_at.is_(None))
        .order_by(Comment.created_at.asc())
        .limit(min(limit, 500))
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_public(r) for r in rows]


@router.get(
    "/comments/queue",
    response_model=list[CommentModeratorRead],
    summary="Owner moderation queue (pending + spam)",
)
async def list_moderation_queue(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    state_filter: Literal["pending", "approved", "rejected", "spam"] | None = None,
    limit: int = 200,
) -> list[CommentModeratorRead]:
    stmt = (
        select(Comment)
        .where(Comment.owner_id == current_user.id)
        .where(Comment.deleted_at.is_(None))
        .order_by(Comment.created_at.desc())
        .limit(min(limit, 500))
    )
    if state_filter is not None:
        stmt = stmt.where(Comment.state == CommentState(state_filter))
    else:
        stmt = stmt.where(Comment.state == CommentState.PENDING)
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_moderator(r) for r in rows]


@router.patch(
    "/comments/{comment_id}",
    response_model=CommentModeratorRead,
    summary="Moderate a comment",
)
async def moderate_comment(
    comment_id: UUID,
    payload: CommentModerate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> CommentModeratorRead:
    row = (
        await db.execute(select(Comment).where(Comment.id == comment_id))
    ).scalar_one_or_none()
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found.")
    if payload.state is not None:
        row.state = CommentState(payload.state)
    if payload.moderator_note is not None:
        row.moderator_note = payload.moderator_note
    await db.commit()
    await db.refresh(row)
    return _to_moderator(row)


@router.delete(
    "/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a comment (hard)",
)
async def delete_comment(
    comment_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    row = (
        await db.execute(select(Comment).where(Comment.id == comment_id))
    ).scalar_one_or_none()
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found.")
    await db.delete(row)
    await db.commit()
    return None
