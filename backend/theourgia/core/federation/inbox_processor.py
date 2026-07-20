"""Inbound federation activity processing — v1-026.

The inbox routes (native + AP) verify, persist a
:class:`FederationActivity` row, and return 202 fast. This module is
the out-of-band worker that drains PENDING rows and applies effects.

Kinds that PROCESS in v1:

  · ``follow.request`` — records an :class:`ActivityPubFollowRequest`
    for the target vault owner (both AP-origin actor URLs and native
    DIDs land in the same follow substrate — the follower_did column
    holds either reference). When the owner's approval mode is AUTO,
    the request resolves immediately: a confirmed follower row is
    created and a signed ``Accept`` is queued to the follower's inbox.
  · ``follow.undo`` — removes the matching confirmed follower.
  · ``note.create`` with ``inReplyTo`` → a PENDING comment in the
    moderation queue (the b108-2gw comment substrate; per spec §6.4 /
    H08 rule 27 federated comments default to MANUAL approval and are
    invisible until the vault owner approves).

Everything else is marked SKIPPED with a persisted reason:

  · AP ``Like`` / ``Announce`` — no acknowledgement model exists, and
    the honesty rules ban engagement metrics; we deliberately store
    NOTHING beyond the verbatim activity row already kept for audit.
  · ``hub.*`` / ``lineage.*`` / ``note.update`` / ``note.delete`` /
    ``follow.accept`` / ``follow.decline`` — no v1 handler.
  · Unknown kinds — flagged for operator review, never crash.

Every transition PENDING → PROCESSED / SKIPPED / ERRORED is persisted
(``status`` + ``processed_at`` + reason in ``error_detail``). Per-row
errors are isolated — one bad activity never aborts the sweep.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from urllib.parse import urlparse
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.federation.ap_outbound import enqueue_accept_for_follow
from theourgia.models.activitypub import (
    ActivityPubFollower,
    ActivityPubFollowRequest,
    ActivityPubSettings,
    FollowerApproval,
    FollowRequestState,
)
from theourgia.models.comment import Comment, CommentState, CommentTargetKind
from theourgia.models.entries import Entry
from theourgia.models.federation_activity import (
    FederationActivity,
    FederationActivityKind,
    FederationActivityStatus,
)

__all__ = [
    "process_activity",
    "process_pending",
]


_log = logging.getLogger(__name__)


# AP activity types that arrive as kind=UNKNOWN but deserve a specific
# honesty-rule skip reason rather than the generic one.
_ENGAGEMENT_AP_TYPES = frozenset({"Like", "Announce"})

_ENGAGEMENT_SKIP_REASON = (
    "no acknowledgement model — engagement is not recorded (honesty "
    "rules ban engagement metrics; the verbatim activity row is the "
    "only record kept)"
)


def _owner_id_of(activity: FederationActivity) -> UUID | None:
    """Parse the addressed local owner from ``target_user_id``."""
    if not activity.target_user_id:
        return None
    try:
        return UUID(activity.target_user_id)
    except ValueError:
        return None


def _actor_of(activity: FederationActivity) -> str:
    """The remote actor reference — AP actor URL or native DID."""
    body = activity.body_json or {}
    actor = body.get("actor")
    if isinstance(actor, str) and actor:
        return actor
    return activity.sender_did


def _handle_of(actor: str) -> str | None:
    """Best-effort ``@user@host`` handle from an AP actor URL."""
    if not actor.startswith("https://"):
        return None
    parsed = urlparse(actor)
    name = parsed.path.rstrip("/").rsplit("/", 1)[-1]
    if not name or not parsed.hostname:
        return None
    return f"@{name.lstrip('@')}@{parsed.hostname}"


# ── Per-kind handlers ────────────────────────────────────────────────
#
# Each returns ``(status, reason_or_None)``. Soft refusals return
# SKIPPED with a reason; exceptions bubble to process_pending which
# marks the row ERRORED without aborting the sweep.


async def _handle_follow_request(
    db: AsyncSession, activity: FederationActivity, now: datetime,
) -> tuple[FederationActivityStatus, str | None]:
    owner_id = _owner_id_of(activity)
    if owner_id is None:
        return (
            FederationActivityStatus.SKIPPED,
            "follow.request has no resolvable local target actor",
        )
    actor = _actor_of(activity)

    ap_settings = (
        await db.execute(
            select(ActivityPubSettings).where(
                ActivityPubSettings.owner_id == owner_id,
            )
        )
    ).scalars().first()
    if ap_settings is None or not ap_settings.enabled:
        return (
            FederationActivityStatus.SKIPPED,
            "ActivityPub is not enabled for the target vault",
        )

    existing_follower = (
        await db.execute(
            select(ActivityPubFollower).where(
                ActivityPubFollower.owner_id == owner_id,
                ActivityPubFollower.follower_did == actor,
            )
        )
    ).scalars().first()
    if existing_follower is not None:
        # Idempotent — already following; peers retry Follow freely.
        return (FederationActivityStatus.PROCESSED, None)

    pending = (
        await db.execute(
            select(ActivityPubFollowRequest).where(
                ActivityPubFollowRequest.owner_id == owner_id,
                ActivityPubFollowRequest.follower_did == actor,
                ActivityPubFollowRequest.state == FollowRequestState.PENDING,
            )
        )
    ).scalars().first()
    if pending is not None:
        # Duplicate request while one is pending — nothing new to do.
        return (FederationActivityStatus.PROCESSED, None)

    request = ActivityPubFollowRequest(
        owner_id=owner_id,
        follower_did=actor,
        follower_handle=_handle_of(actor),
    )
    db.add(request)

    if ap_settings.follower_approval == FollowerApproval.AUTO:
        request.state = FollowRequestState.ACCEPTED
        request.resolved_at = now
        db.add(
            ActivityPubFollower(
                owner_id=owner_id,
                follower_did=actor,
                follower_handle=request.follower_handle,
            )
        )
        await enqueue_accept_for_follow(
            db,
            owner_id=owner_id,
            follower_did=actor,
            follow_activity=activity.body_json,
        )

    return (FederationActivityStatus.PROCESSED, None)


async def _handle_follow_undo(
    db: AsyncSession, activity: FederationActivity, now: datetime,
) -> tuple[FederationActivityStatus, str | None]:
    owner_id = _owner_id_of(activity)
    if owner_id is None:
        return (
            FederationActivityStatus.SKIPPED,
            "follow.undo has no resolvable local target actor",
        )

    # AP maps every Undo here; only Undo(Follow) removes a follower.
    inner = (activity.body_json or {}).get("object")
    if isinstance(inner, dict) and inner.get("type") not in (None, "Follow"):
        return (
            FederationActivityStatus.SKIPPED,
            f"undo of {inner.get('type')!r} has no v1 handler",
        )

    actor = _actor_of(activity)
    follower = (
        await db.execute(
            select(ActivityPubFollower).where(
                ActivityPubFollower.owner_id == owner_id,
                ActivityPubFollower.follower_did == actor,
            )
        )
    ).scalars().first()
    if follower is None:
        return (
            FederationActivityStatus.SKIPPED,
            "no matching follower to remove",
        )
    await db.delete(follower)
    return (FederationActivityStatus.PROCESSED, None)


async def _handle_note_create(
    db: AsyncSession, activity: FederationActivity, now: datetime,
) -> tuple[FederationActivityStatus, str | None]:
    body = activity.body_json or {}
    obj = body.get("object")
    if not isinstance(obj, dict):
        return (
            FederationActivityStatus.SKIPPED,
            "note.create carries no object",
        )
    in_reply_to = obj.get("inReplyTo")
    if not isinstance(in_reply_to, str) or not in_reply_to:
        return (
            FederationActivityStatus.SKIPPED,
            "note is not a reply — only replies to local content enter "
            "the comment moderation queue",
        )

    # Local object URLs end in the entry UUID (…/@handle/{entry_id}).
    tail = urlparse(in_reply_to).path.rstrip("/").rsplit("/", 1)[-1]
    try:
        entry_id = UUID(tail)
    except ValueError:
        return (
            FederationActivityStatus.SKIPPED,
            "inReplyTo does not resolve to a local entry",
        )

    entry = (
        await db.execute(
            select(Entry).where(
                Entry.id == entry_id,
                Entry.deleted_at.is_(None),
            )
        )
    ).scalars().first()
    if entry is None:
        return (
            FederationActivityStatus.SKIPPED,
            "inReplyTo target entry not found",
        )
    if not entry.comments_enabled:
        return (
            FederationActivityStatus.SKIPPED,
            "comments are disabled on the target entry",
        )

    content = obj.get("content")
    if not isinstance(content, str) or not content.strip():
        return (
            FederationActivityStatus.SKIPPED,
            "note has no textual content",
        )

    actor = _actor_of(activity)
    handle = _handle_of(actor)
    db.add(
        Comment(
            target_kind=CommentTargetKind.ENTRY,
            target_id=entry.id,
            owner_id=entry.owner_id,
            author_name=(handle or actor)[:120],
            author_url=actor[:480] if actor.startswith("https://") else None,
            body=content,
            state=CommentState.PENDING,
        )
    )
    return (FederationActivityStatus.PROCESSED, None)


_HANDLERS = {
    FederationActivityKind.FOLLOW_REQUEST: _handle_follow_request,
    FederationActivityKind.FOLLOW_UNDO: _handle_follow_undo,
    FederationActivityKind.NOTE_CREATE: _handle_note_create,
}


async def process_activity(
    db: AsyncSession, activity: FederationActivity, *, now: datetime | None = None,
) -> tuple[FederationActivityStatus, str | None]:
    """Apply one activity's effect. Returns ``(status, reason)``.

    Does NOT mutate the activity row or commit — :func:`process_pending`
    owns the status transition so the persistence contract lives in one
    place. Raises only on genuine handler bugs / infrastructure errors;
    every policy refusal is a SKIPPED return.
    """
    now = now or datetime.now(tz=UTC)

    handler = _HANDLERS.get(activity.kind)
    if handler is not None:
        return await handler(db, activity, now)

    ap_type = (activity.body_json or {}).get("type")
    if (
        activity.kind == FederationActivityKind.UNKNOWN
        and isinstance(ap_type, str)
        and ap_type in _ENGAGEMENT_AP_TYPES
    ):
        return (FederationActivityStatus.SKIPPED, _ENGAGEMENT_SKIP_REASON)

    return (
        FederationActivityStatus.SKIPPED,
        f"no v1 handler for kind {activity.kind.value!r}",
    )


async def process_pending(
    db: AsyncSession,
    *,
    batch_size: int = 50,
    now: datetime | None = None,
) -> dict[str, int]:
    """Drain up to ``batch_size`` PENDING activities, oldest first.

    Every row leaves PENDING: PROCESSED / SKIPPED per the handler, or
    ERRORED with the truncated exception when one blows up. Commits
    after each row so a crash mid-sweep keeps completed work; per-row
    errors never abort the sweep.
    """
    now = now or datetime.now(tz=UTC)
    counts = {"processed": 0, "skipped": 0, "errored": 0}

    stmt = (
        select(FederationActivity)
        .where(FederationActivity.status == FederationActivityStatus.PENDING)
        .order_by(FederationActivity.received_at)
        .limit(batch_size)
    )
    rows = (await db.execute(stmt)).scalars().all()

    for activity in rows:
        try:
            status, reason = await process_activity(db, activity, now=now)
        except Exception as exc:  # noqa: BLE001 — per-row isolation
            # Discard the handler's partial writes; the status flip
            # below is the only thing this row commits.
            await db.rollback()
            status = FederationActivityStatus.ERRORED
            reason = str(exc)[:2000]
            _log.warning(
                "federation_inbox.activity_failed",
                extra={
                    "activity_id": str(activity.id),
                    "kind": activity.kind.value,
                    "error": reason,
                },
            )
        activity.status = status
        activity.processed_at = now
        activity.error_detail = reason[:2000] if reason else None
        db.add(activity)
        await db.commit()

        if status == FederationActivityStatus.PROCESSED:
            counts["processed"] += 1
        elif status == FederationActivityStatus.SKIPPED:
            counts["skipped"] += 1
        else:
            counts["errored"] += 1

    return counts
