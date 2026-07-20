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
  · ``ritual.schedule`` (v1-033, spec §4.7) — creates a local MIRROR
    :class:`GroupRitual` (``organizer_id`` NULL, ``origin_did`` +
    ``origin_ritual_id`` set) plus participant rows + in-app
    notifications for every roster DID that resolves to a vault on
    this instance. Idempotent per origin ritual id — retried and
    per-participant duplicate envelopes converge on one mirror.
  · ``ritual.update`` (v1-033, spec §4.8) — start / fragment /
    completion / postmortem_entry / egregore_registration against the
    mirror (from the origin instance) or against a locally organized
    ritual (fragments + reflections from participant instances).
    ``update_kind=fragment`` on a COMPLETED ritual is refused with the
    verbatim ``ritual_frozen`` reason (H08 rule 22 / spec §10.5);
    post-mortem reflections stay accepted, exactly one per author.
    ``egregore_registration`` registers the EGREGORE entity in every
    local participating vault (plan/12 egregore creation flow).

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

from theourgia.core.config import get_settings
from theourgia.core.federation.ap_outbound import enqueue_accept_for_follow
from theourgia.core.federation.identity import (
    ActorKind,
    InvalidDIDError,
    parse_actor_id,
)
from theourgia.core.federation.ritual_outbound import RITUAL_UPDATE_KINDS
from theourgia.models.activitypub import (
    ActivityPubFollower,
    ActivityPubFollowRequest,
    ActivityPubSettings,
    FollowerApproval,
    FollowRequestState,
)
from theourgia.models.comment import Comment, CommentState, CommentTargetKind
from theourgia.models.entities import Entity, EntityKind
from theourgia.models.entries import Entry
from theourgia.models.federation_activity import (
    FederationActivity,
    FederationActivityKind,
    FederationActivityStatus,
)
from theourgia.models.group_ritual import (
    GroupRitual,
    GroupRitualFragment,
    GroupRitualLocation,
    GroupRitualParticipant,
    GroupRitualReflection,
    GroupRitualRemoteParticipant,
    GroupRitualStatus,
    ParticipantStatus,
)
from theourgia.models.identity import Vault
from theourgia.models.notifications import Notification

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


# ── Group rituals (v1-033, spec §4.7 / §4.8) ────────────────────────


_RITUAL_FROZEN_REASON = (
    "ritual_frozen: fragments are rejected once a ritual is COMPLETED "
    "(H08 rule 22 / spec §10.5)"
)


def _parse_wire_datetime(raw: object) -> datetime | None:
    """ISO-8601 with Z tolerance. None on any malformation — the
    caller decides between SKIPPED and a server-side fallback."""
    if not isinstance(raw, str) or not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed


def _wire_body(activity: FederationActivity) -> dict | None:
    body = (activity.body_json or {}).get("body")
    return body if isinstance(body, dict) else None


def _did_host(did: str) -> str | None:
    try:
        host, _, _ = parse_actor_id(did)
    except InvalidDIDError:
        return None
    return host


async def _local_owner_for_did(db: AsyncSession, did: str) -> UUID | None:
    """Resolve a wire participant DID to a local vault owner.

    Only vault DIDs whose host is THIS instance resolve; everything
    else (other hosts, hub DIDs, malformed strings) returns None.
    """
    try:
        host, kind, slug = parse_actor_id(did)
    except InvalidDIDError:
        return None
    if host != get_settings().instance_id or kind is not ActorKind.VAULT:
        return None
    vault = (
        await db.execute(select(Vault).where(Vault.slug == slug))
    ).scalars().first()
    return vault.owner_id if vault is not None else None


async def _handle_ritual_schedule(
    db: AsyncSession, activity: FederationActivity, now: datetime,
) -> tuple[FederationActivityStatus, str | None]:
    body = _wire_body(activity)
    if body is None:
        return (
            FederationActivityStatus.SKIPPED,
            "ritual.schedule carries no body",
        )
    try:
        origin_ritual_id = UUID(str(body.get("ritual_id")))
    except ValueError:
        return (
            FederationActivityStatus.SKIPPED,
            "ritual.schedule has no valid ritual_id",
        )
    title = body.get("title")
    if not isinstance(title, str) or not title.strip():
        return (
            FederationActivityStatus.SKIPPED,
            "ritual.schedule has no title",
        )
    scheduled_for = _parse_wire_datetime(body.get("scheduled_for_utc"))
    if scheduled_for is None:
        return (
            FederationActivityStatus.SKIPPED,
            "ritual.schedule has no valid scheduled_for_utc",
        )

    raw_participants = body.get("participants")
    roster: list[tuple[str, str | None]] = []
    if isinstance(raw_participants, list):
        for entry in raw_participants:
            if not isinstance(entry, dict):
                continue
            did = entry.get("did")
            if not isinstance(did, str) or not did:
                continue
            role = entry.get("role")
            roster.append((did, role if isinstance(role, str) else None))

    local: list[tuple[UUID, str | None]] = []
    seen_owner_ids: set[UUID] = set()
    for did, role in roster:
        owner_id = await _local_owner_for_did(db, did)
        if owner_id is None or owner_id in seen_owner_ids:
            continue
        seen_owner_ids.add(owner_id)
        local.append((owner_id, role))
    if not local:
        return (
            FederationActivityStatus.SKIPPED,
            "ritual.schedule names no participant on this instance",
        )

    mirror = (
        await db.execute(
            select(GroupRitual).where(
                GroupRitual.origin_ritual_id == origin_ritual_id,
                GroupRitual.deleted_at.is_(None),
            )
        )
    ).scalars().first()
    if mirror is None:
        organizer_did = body.get("organizer_did")
        if not isinstance(organizer_did, str) or not organizer_did:
            organizer_did = activity.sender_did
        try:
            location = GroupRitualLocation(body.get("location_kind"))
        except ValueError:
            location = GroupRitualLocation.DISPERSED
        description = body.get("description")
        location_detail = body.get("location_detail")
        shared_script = body.get("shared_script")
        correspondences = body.get("correspondences")
        egregore_name = body.get("egregore_name")
        mirror = GroupRitual(
            organizer_id=None,
            hub_id=None,
            title=title.strip()[:300],
            description=(
                description if isinstance(description, str) else None
            ),
            scheduled_for_utc=scheduled_for,
            location=location,
            location_detail=(
                location_detail[:500]
                if isinstance(location_detail, str)
                else None
            ),
            shared_script=(
                shared_script if isinstance(shared_script, str) else None
            ),
            correspondences_payload=(
                dict(correspondences)
                if isinstance(correspondences, dict)
                else {}
            ),
            egregore_name=(
                egregore_name[:256]
                if isinstance(egregore_name, str) and egregore_name
                else None
            ),
            origin_did=organizer_did[:255],
            origin_ritual_id=origin_ritual_id,
            status=GroupRitualStatus.INVITED,
        )
        db.add(mirror)

    existing_user_ids = set(
        (
            await db.execute(
                select(GroupRitualParticipant.user_id).where(
                    GroupRitualParticipant.ritual_id == mirror.id,
                )
            )
        ).scalars().all()
    )
    for owner_id, role in local:
        if owner_id in existing_user_ids:
            continue
        db.add(
            GroupRitualParticipant(
                ritual_id=mirror.id,
                user_id=owner_id,
                role_in_ritual=role[:120] if role else None,
            )
        )
        db.add(
            Notification(
                user_id=owner_id,
                template_name="group_ritual_schedule",
                kind="group_ritual",
                subject=f"Group ritual invitation: {title.strip()}"[:500],
                body_text=(
                    f"You are invited to the group ritual "
                    f"“{title.strip()}”, scheduled for "
                    f"{scheduled_for.isoformat()} (UTC), organized from "
                    f"another instance ({mirror.origin_did}). Respond "
                    f"from your group rituals list."
                ),
                action_url="/group-rituals",
                action_label="View group rituals",
            )
        )
    return (FederationActivityStatus.PROCESSED, None)


async def _handle_ritual_update(  # noqa: PLR0911, PLR0912 — op dispatch
    db: AsyncSession, activity: FederationActivity, now: datetime,
) -> tuple[FederationActivityStatus, str | None]:
    body = _wire_body(activity)
    if body is None:
        return (
            FederationActivityStatus.SKIPPED,
            "ritual.update carries no body",
        )
    try:
        wire_ritual_id = UUID(str(body.get("ritual_id")))
    except ValueError:
        return (
            FederationActivityStatus.SKIPPED,
            "ritual.update has no valid ritual_id",
        )
    update_kind = body.get("update_kind")
    if update_kind not in RITUAL_UPDATE_KINDS:
        return (
            FederationActivityStatus.SKIPPED,
            f"unknown update_kind {update_kind!r}",
        )

    # Mirror rows match on the origin's id; locally organized rituals
    # match on our own id (remote participants echo it back).
    row = (
        await db.execute(
            select(GroupRitual).where(
                GroupRitual.origin_ritual_id == wire_ritual_id,
                GroupRitual.deleted_at.is_(None),
            )
        )
    ).scalars().first()
    if row is None:
        row = (
            await db.execute(
                select(GroupRitual).where(
                    GroupRitual.id == wire_ritual_id,
                    GroupRitual.origin_ritual_id.is_(None),
                    GroupRitual.deleted_at.is_(None),
                )
            )
        ).scalars().first()
    if row is None:
        return (
            FederationActivityStatus.SKIPPED,
            "no local ritual for this update",
        )
    is_mirror = row.origin_ritual_id is not None

    sender_host = _did_host(activity.sender_did)
    if sender_host is None:
        return (
            FederationActivityStatus.SKIPPED,
            "ritual.update sender is not a native peer DID",
        )
    if is_mirror:
        origin_host = _did_host(row.origin_did or "")
        if origin_host is None or sender_host != origin_host:
            return (
                FederationActivityStatus.SKIPPED,
                "only the origin instance may update a mirrored ritual",
            )
    else:
        roster = (
            await db.execute(
                select(GroupRitualRemoteParticipant.did).where(
                    GroupRitualRemoteParticipant.ritual_id == row.id,
                )
            )
        ).scalars().all()
        participant_hosts = {
            host for host in (_did_host(did) for did in roster) if host
        }
        if sender_host not in participant_hosts:
            return (
                FederationActivityStatus.SKIPPED,
                "sender is not a participant instance of this ritual",
            )
        if update_kind in ("start", "completion", "egregore_registration"):
            return (
                FederationActivityStatus.SKIPPED,
                f"only the origin instance may send {update_kind}",
            )

    if update_kind == "start":
        if row.status in (
            GroupRitualStatus.IN_PROGRESS,
            GroupRitualStatus.COMPLETED,
        ):
            return (FederationActivityStatus.PROCESSED, None)
        row.status = GroupRitualStatus.IN_PROGRESS
        db.add(row)
        return (FederationActivityStatus.PROCESSED, None)

    if update_kind == "completion":
        row.status = GroupRitualStatus.COMPLETED
        db.add(row)
        return (FederationActivityStatus.PROCESSED, None)

    if update_kind == "fragment":
        if row.status == GroupRitualStatus.COMPLETED:
            return (FederationActivityStatus.SKIPPED, _RITUAL_FROZEN_REASON)
        fragment_body = body.get("fragment_body")
        if not isinstance(fragment_body, str) or not fragment_body.strip():
            return (
                FederationActivityStatus.SKIPPED,
                "fragment carries no body text",
            )
        author_did = body.get("author_did")
        if not isinstance(author_did, str) or not author_did:
            author_did = activity.sender_did
        if is_mirror and row.status == GroupRitualStatus.INVITED:
            # At-least-once delivery can reorder start + first fragment.
            row.status = GroupRitualStatus.IN_PROGRESS
            db.add(row)
        posted_at = _parse_wire_datetime(body.get("posted_at_utc")) or now
        db.add(
            GroupRitualFragment(
                ritual_id=row.id,
                author_id=None,
                author_did=author_did[:255],
                body=fragment_body[:4000],
                posted_at_utc=posted_at,
            )
        )
        return (FederationActivityStatus.PROCESSED, None)

    if update_kind == "postmortem_entry":
        reflection_body = body.get("reflection_body")
        if (
            not isinstance(reflection_body, str)
            or not reflection_body.strip()
        ):
            return (
                FederationActivityStatus.SKIPPED,
                "postmortem_entry carries no body text",
            )
        author_did = body.get("author_did")
        if not isinstance(author_did, str) or not author_did:
            author_did = activity.sender_did
        existing = (
            await db.execute(
                select(GroupRitualReflection).where(
                    GroupRitualReflection.ritual_id == row.id,
                    GroupRitualReflection.author_did == author_did[:255],
                )
            )
        ).scalars().first()
        if existing is not None:
            # Write-once per author — retries converge, never duplicate.
            return (FederationActivityStatus.PROCESSED, None)
        db.add(
            GroupRitualReflection(
                ritual_id=row.id,
                author_id=None,
                author_did=author_did[:255],
                body=reflection_body[:4000],
            )
        )
        return (FederationActivityStatus.PROCESSED, None)

    # egregore_registration (mirror only — origin sends it at close).
    name = body.get("egregore_name")
    if not isinstance(name, str) or not name.strip():
        name = row.egregore_name
    if not name:
        return (
            FederationActivityStatus.SKIPPED,
            "egregore_registration carries no egregore name",
        )
    participants = (
        await db.execute(
            select(GroupRitualParticipant).where(
                GroupRitualParticipant.ritual_id == row.id,
            )
        )
    ).scalars().all()
    origin_tag = f"group-ritual:{wire_ritual_id}"
    first_entity: Entity | None = None
    for participant in participants:
        if participant.status == ParticipantStatus.DECLINED:
            continue
        entity = (
            await db.execute(
                select(Entity).where(
                    Entity.owner_id == participant.user_id,
                    Entity.origin == origin_tag,
                    Entity.deleted_at.is_(None),
                )
            )
        ).scalars().first()
        if entity is None:
            entity = Entity(
                name=name.strip()[:256],
                kind=EntityKind.EGREGORE,
                owner_id=participant.user_id,
                origin=origin_tag,
            )
            db.add(entity)
        if first_entity is None:
            first_entity = entity
    if first_entity is not None and row.egregore_entity_id is None:
        row.egregore_entity_id = first_entity.id
        if not row.egregore_name:
            row.egregore_name = name.strip()[:256]
        db.add(row)
    return (FederationActivityStatus.PROCESSED, None)


_HANDLERS = {
    FederationActivityKind.FOLLOW_REQUEST: _handle_follow_request,
    FederationActivityKind.FOLLOW_UNDO: _handle_follow_undo,
    FederationActivityKind.NOTE_CREATE: _handle_note_create,
    FederationActivityKind.RITUAL_SCHEDULE: _handle_ritual_schedule,
    FederationActivityKind.RITUAL_UPDATE: _handle_ritual_update,
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
