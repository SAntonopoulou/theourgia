"""Outbound cross-instance group-ritual envelopes — v1-033.

Builds the native ``ritual.schedule`` / ``ritual.update`` envelopes
(spec §4.7 / §4.8) and enqueues them on the existing signed delivery
queue. Producers are the group-rituals router:

  · invite with ``remote_dids``  → ``ritual.schedule`` to every remote
    participant's instance inbox.
  · start                        → ``ritual.update`` / ``start``.
  · fragment post                → ``ritual.update`` / ``fragment``.
  · close                        → ``ritual.update`` / ``completion``
    (+ ``egregore_registration`` first when the ritual declared one).
  · reflection on a mirror       → ``ritual.update`` /
    ``postmortem_entry`` back to the origin instance.

Honesty + safety rules wired (matching :mod:`ap_outbound`):

  · Everything is a no-op when ``settings.federation_transport_enabled``
    is False — no rows accumulate on instances that haven't opted in.
  · Enqueue failures NEVER propagate into the ritual lifecycle —
    per-recipient problems are logged and skipped; callers wrap the
    whole broadcast in try/except as well (defence in depth).
  · The wire ``ritual_id`` is ALWAYS the origin instance's id — the
    organizer sends its own id; a mirror instance echoes
    ``origin_ritual_id`` back.
  · Sealed content NEVER federates (spec §4.1): a schedule whose body
    carries anything shaped like ciphertext (``vault_crypto_envelope``
    field) is refused before enqueue, with a logged reason.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.config import get_settings
from theourgia.core.federation.ap_outbound import resolve_inbox_url
from theourgia.core.federation.delivery_queue import enqueue
from theourgia.core.federation.identity import (
    ActorKind,
    InvalidDIDError,
    make_actor_id,
)
from theourgia.models.group_ritual import (
    GroupRitual,
    GroupRitualRemoteParticipant,
)
from theourgia.models.identity import Vault

__all__ = [
    "RITUAL_UPDATE_KINDS",
    "broadcast_ritual_schedule",
    "broadcast_ritual_update",
    "build_ritual_schedule_envelope",
    "build_ritual_update_envelope",
    "local_vault_did",
    "send_ritual_update_to_origin",
]


_log = logging.getLogger(__name__)


# The wire vocabulary of §4.8. ``start`` is the v1-033 addition that
# lets a participant instance open its mirror for fragment posting.
RITUAL_UPDATE_KINDS = (
    "start",
    "fragment",
    "completion",
    "postmortem_entry",
    "egregore_registration",
)


async def local_vault_did(db: AsyncSession, owner_id: UUID) -> str | None:
    """The caller's vault DID on this instance, or None when the user
    has no vault / the instance host is malformed."""
    vault = (
        await db.execute(select(Vault).where(Vault.owner_id == owner_id))
    ).scalars().first()
    if vault is None:
        return None
    try:
        return make_actor_id(
            get_settings().instance_id, ActorKind.VAULT, vault.slug,
        )
    except InvalidDIDError:
        _log.warning(
            "ritual_outbound.local_vault_did.invalid",
            extra={"owner_id": str(owner_id), "slug": vault.slug},
        )
        return None


def build_ritual_schedule_envelope(
    ritual: GroupRitual,
    *,
    organizer_did: str,
    remote_participants: Iterable[GroupRitualRemoteParticipant],
) -> dict[str, Any]:
    """The ``ritual.schedule`` envelope (spec §4.7).

    The participants list carries the REMOTE roster only — each
    receiving instance matches its own host's vault DIDs against it.
    Local participants are never named on the wire.
    """
    return {
        "type": "ritual.schedule",
        "body": {
            "ritual_id": str(ritual.id),
            "organizer_did": organizer_did,
            "title": ritual.title,
            "description": ritual.description,
            "scheduled_for_utc": ritual.scheduled_for_utc.isoformat(),
            "location_kind": ritual.location.value,
            "location_detail": ritual.location_detail,
            "shared_script": ritual.shared_script,
            "correspondences": dict(ritual.correspondences_payload or {}),
            "egregore_name": ritual.egregore_name,
            "participants": [
                {"did": p.did, "role": p.role_in_ritual}
                for p in remote_participants
            ],
        },
    }


def build_ritual_update_envelope(
    wire_ritual_id: str,
    update_kind: str,
    *,
    author_did: str | None = None,
    fragment_body: str | None = None,
    reflection_body: str | None = None,
    egregore_name: str | None = None,
    posted_at_utc: str | None = None,
) -> dict[str, Any]:
    """The ``ritual.update`` envelope (spec §4.8). None fields are
    omitted so every envelope carries exactly its op's payload."""
    if update_kind not in RITUAL_UPDATE_KINDS:
        msg = f"unknown ritual update kind: {update_kind!r}"
        raise ValueError(msg)
    body: dict[str, Any] = {
        "ritual_id": wire_ritual_id,
        "update_kind": update_kind,
    }
    if author_did is not None:
        body["author_did"] = author_did
    if fragment_body is not None:
        body["fragment_body"] = fragment_body
    if reflection_body is not None:
        body["reflection_body"] = reflection_body
    if egregore_name is not None:
        body["egregore_name"] = egregore_name
    if posted_at_utc is not None:
        body["posted_at_utc"] = posted_at_utc
    return {"type": "ritual.update", "body": body}


def _contains_ciphertext(value: Any) -> bool:
    """Spec §4.1 honesty rule: sealed content NEVER federates. The
    sending side refuses any body shaped like ciphertext — heuristic:
    presence of a ``vault_crypto_envelope`` field anywhere."""
    if isinstance(value, dict):
        if "vault_crypto_envelope" in value:
            return True
        return any(_contains_ciphertext(v) for v in value.values())
    if isinstance(value, (list, tuple)):
        return any(_contains_ciphertext(v) for v in value)
    return False


async def _enqueue_to_did(
    db: AsyncSession, did: str, envelope: dict[str, Any],
) -> bool:
    """Queue one delivery. Returns False (logged) when no inbox URL
    can be derived — never raises for that."""
    inbox_url = resolve_inbox_url(did)
    if inbox_url is None:
        _log.warning(
            "ritual_outbound.no_inbox", extra={"did": did},
        )
        return False
    await enqueue(db, recipient_did=did, url=inbox_url, body_json=envelope)
    return True


async def _remote_roster(
    db: AsyncSession, ritual_id: UUID,
) -> list[GroupRitualRemoteParticipant]:
    return list(
        (
            await db.execute(
                select(GroupRitualRemoteParticipant).where(
                    GroupRitualRemoteParticipant.ritual_id == ritual_id,
                )
            )
        ).scalars().all()
    )


async def broadcast_ritual_schedule(
    db: AsyncSession, ritual: GroupRitual, *, organizer_did: str,
) -> int:
    """Queue ``ritual.schedule`` to every remote participant.

    Returns the number of deliveries enqueued. No-op (0) when the
    transport is disabled or the roster is empty.
    """
    if not get_settings().federation_transport_enabled:
        return 0
    roster = await _remote_roster(db, ritual.id)
    if not roster:
        return 0
    envelope = build_ritual_schedule_envelope(
        ritual, organizer_did=organizer_did, remote_participants=roster,
    )
    if _contains_ciphertext(envelope):
        _log.warning(
            "ritual_outbound.sealed_content_refused",
            extra={"ritual_id": str(ritual.id)},
        )
        return 0
    enqueued = 0
    for participant in roster:
        if await _enqueue_to_did(db, participant.did, envelope):
            enqueued += 1
    return enqueued


async def broadcast_ritual_update(
    db: AsyncSession, ritual: GroupRitual, envelope: dict[str, Any],
) -> int:
    """Queue a ``ritual.update`` to every remote participant of a
    locally organized ritual. Returns the number enqueued."""
    if not get_settings().federation_transport_enabled:
        return 0
    roster = await _remote_roster(db, ritual.id)
    enqueued = 0
    for participant in roster:
        if await _enqueue_to_did(db, participant.did, envelope):
            enqueued += 1
    return enqueued


async def send_ritual_update_to_origin(
    db: AsyncSession, ritual: GroupRitual, envelope: dict[str, Any],
) -> bool:
    """Queue a ``ritual.update`` from a mirror back to its origin
    instance. Returns True when a delivery was enqueued."""
    if not get_settings().federation_transport_enabled:
        return False
    if not ritual.origin_did:
        return False
    return await _enqueue_to_did(db, ritual.origin_did, envelope)
