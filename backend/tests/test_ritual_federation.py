"""Cross-instance group rituals — v1-033 (Tier 2 #15).

Covers the batch that federated the group-ritual lifecycle:

  · The two new wire kinds classify (``ritual.schedule`` /
    ``ritual.update``) and route to handlers.
  · Envelope builders: remote-only roster on the wire, exact op
    payloads, unknown-update-kind refusal.
  · Inbound ``ritual.schedule``: mirror creation (organizer_id NULL),
    participant + notification rows for local vault DIDs only,
    idempotency per origin ritual id, no-local-participant skip that
    issues ZERO queries.
  · Inbound ``ritual.update``: the ritual_frozen honesty rule
    (fragments refused on COMPLETED, verbatim reason), postmortem
    write-once idempotency, start/completion transitions, sender-host
    authorization in both directions, and the egregore registration
    flow (EGREGORE entities in every local non-declined participant
    vault).

DB-less fake-session style per ``test_federation_wiring_v1.py`` —
queue-backed sessions assert the exact number of queries a path
issues.
"""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import pytest

from theourgia.api.routers.v1.federation_inbox import _classify_kind
from theourgia.core.config import get_settings
from theourgia.core.federation import inbox_processor, ritual_outbound
from theourgia.core.federation.inbox_processor import process_activity
from theourgia.core.federation.ritual_outbound import (
    RITUAL_UPDATE_KINDS,
    build_ritual_schedule_envelope,
    build_ritual_update_envelope,
)
from theourgia.models.entities import Entity, EntityKind
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
from theourgia.models.notifications import Notification

LOCAL_HOST = get_settings().instance_id
REMOTE_HOST = "aurora.example"
ORIGIN_VAULT_DID = f"did:theourgia:{REMOTE_HOST}:vault:hierophant"
ORIGIN_INSTANCE_DID = f"did:theourgia:{REMOTE_HOST}"
LOCAL_VAULT_DID = f"did:theourgia:{LOCAL_HOST}:vault:aspasia"


# ── Fakes (queue-backed session) ────────────────────────────────────


class _Result:
    def __init__(self, *, rows: list[Any] | None = None) -> None:
        self._rows = rows if rows is not None else []

    def scalars(self) -> _Result:
        return self

    def first(self) -> Any:
        return self._rows[0] if self._rows else None

    def all(self) -> list[Any]:
        return self._rows


class _FakeSession:
    """Each ``execute`` pops the next queued result, so tests assert
    the exact number of queries a path issues."""

    def __init__(self, results: list[_Result] | None = None) -> None:
        self.results = list(results or [])
        self.added: list[Any] = []
        self.commits = 0

    async def execute(self, stmt: Any) -> _Result:
        assert self.results, "handler issued an unexpected query"
        return self.results.pop(0)

    def add(self, row: Any) -> None:
        self.added.append(row)

    async def commit(self) -> None:
        self.commits += 1

    async def flush(self) -> None:
        return None


def _activity(
    kind: FederationActivityKind,
    body: dict[str, Any],
    *,
    sender: str = ORIGIN_INSTANCE_DID,
) -> FederationActivity:
    return FederationActivity(
        sender_did=sender,
        kind=kind,
        body_json=body,
        received_at=datetime.now(tz=UTC),
    )


def _schedule_body(**overrides: Any) -> dict[str, Any]:
    body = {
        "ritual_id": str(uuid4()),
        "organizer_did": ORIGIN_VAULT_DID,
        "title": "Hekate's Deipnon",
        "description": "Dark-moon supper",
        "scheduled_for_utc": "2026-07-30T19:00:00Z",
        "location_kind": "dispersed",
        "participants": [
            {"did": LOCAL_VAULT_DID, "role": "officiant"},
            {"did": f"did:theourgia:{REMOTE_HOST}:vault:other", "role": None},
        ],
        "egregore_name": None,
    }
    body.update(overrides)
    return {"type": "ritual.schedule", "body": body}


def _mirror(**overrides: Any) -> GroupRitual:
    row = GroupRitual(
        organizer_id=None,
        title="Hekate's Deipnon",
        scheduled_for_utc=datetime(2026, 7, 30, 19, tzinfo=UTC),
        location=GroupRitualLocation.DISPERSED,
        origin_did=ORIGIN_VAULT_DID,
        origin_ritual_id=uuid4(),
        status=GroupRitualStatus.INVITED,
    )
    for key, value in overrides.items():
        setattr(row, key, value)
    return row


def _local_ritual(**overrides: Any) -> GroupRitual:
    row = GroupRitual(
        organizer_id=uuid4(),
        title="Rite of the Cross-Quarter",
        scheduled_for_utc=datetime(2026, 8, 1, 20, tzinfo=UTC),
        location=GroupRitualLocation.DISPERSED,
        status=GroupRitualStatus.IN_PROGRESS,
    )
    for key, value in overrides.items():
        setattr(row, key, value)
    return row


# ── Kind classification ────────────────────────────────────────────


def test_classify_kind_maps_ritual_schedule() -> None:
    body = {"type": "ritual.schedule"}
    assert _classify_kind(body) is FederationActivityKind.RITUAL_SCHEDULE


def test_classify_kind_maps_ritual_update() -> None:
    body = {"type": "ritual.update"}
    assert _classify_kind(body) is FederationActivityKind.RITUAL_UPDATE


def test_ritual_kinds_have_handlers() -> None:
    assert (
        FederationActivityKind.RITUAL_SCHEDULE in inbox_processor._HANDLERS
    )
    assert (
        FederationActivityKind.RITUAL_UPDATE in inbox_processor._HANDLERS
    )


# ── Envelope builders ──────────────────────────────────────────────


def test_schedule_envelope_carries_remote_roster_only() -> None:
    ritual = _local_ritual(egregore_name="Phosphoros")
    remote = [
        GroupRitualRemoteParticipant(
            ritual_id=ritual.id,
            did=ORIGIN_VAULT_DID,
            role_in_ritual="officiant",
            invited_at=datetime.now(tz=UTC),
        ),
    ]
    envelope = build_ritual_schedule_envelope(
        ritual,
        organizer_did=LOCAL_VAULT_DID,
        remote_participants=remote,
    )
    assert envelope["type"] == "ritual.schedule"
    body = envelope["body"]
    assert body["ritual_id"] == str(ritual.id)
    assert body["organizer_did"] == LOCAL_VAULT_DID
    assert body["egregore_name"] == "Phosphoros"
    assert body["participants"] == [
        {"did": ORIGIN_VAULT_DID, "role": "officiant"},
    ]


def test_update_envelope_omits_none_fields() -> None:
    envelope = build_ritual_update_envelope(
        "abc", "fragment", author_did=LOCAL_VAULT_DID,
        fragment_body="The candle guttered.",
    )
    assert envelope["type"] == "ritual.update"
    assert envelope["body"] == {
        "ritual_id": "abc",
        "update_kind": "fragment",
        "author_did": LOCAL_VAULT_DID,
        "fragment_body": "The candle guttered.",
    }


def test_update_envelope_rejects_unknown_kind() -> None:
    with pytest.raises(ValueError, match="unknown ritual update kind"):
        build_ritual_update_envelope("abc", "relight")


def test_update_kind_vocabulary_matches_spec() -> None:
    assert RITUAL_UPDATE_KINDS == (
        "start",
        "fragment",
        "completion",
        "postmortem_entry",
        "egregore_registration",
    )


# ── Inbound ritual.schedule ────────────────────────────────────────


async def test_schedule_creates_mirror_and_notifies_local() -> None:
    owner = uuid4()
    db = _FakeSession([
        _Result(rows=[SimpleNamespace(owner_id=owner, slug="aspasia")]),
        _Result(rows=[]),  # no existing mirror
        _Result(rows=[]),  # no existing participants
    ])
    activity = _activity(
        FederationActivityKind.RITUAL_SCHEDULE, _schedule_body(),
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    assert reason is None

    mirrors = [r for r in db.added if isinstance(r, GroupRitual)]
    assert len(mirrors) == 1
    assert mirrors[0].organizer_id is None
    assert mirrors[0].origin_did == ORIGIN_VAULT_DID
    assert mirrors[0].status is GroupRitualStatus.INVITED

    participants = [
        r for r in db.added if isinstance(r, GroupRitualParticipant)
    ]
    assert [p.user_id for p in participants] == [owner]
    assert participants[0].role_in_ritual == "officiant"

    notifications = [r for r in db.added if isinstance(r, Notification)]
    assert len(notifications) == 1
    assert notifications[0].user_id == owner
    assert notifications[0].kind == "group_ritual"


async def test_schedule_is_idempotent_per_origin_id() -> None:
    owner = uuid4()
    mirror = _mirror()
    db = _FakeSession([
        _Result(rows=[SimpleNamespace(owner_id=owner, slug="aspasia")]),
        _Result(rows=[mirror]),   # mirror already exists
        _Result(rows=[owner]),    # participant row already exists
    ])
    activity = _activity(
        FederationActivityKind.RITUAL_SCHEDULE,
        _schedule_body(ritual_id=str(mirror.origin_ritual_id)),
    )
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    assert db.added == []  # nothing new — retries converge


async def test_schedule_without_local_participants_skips_without_queries() -> None:
    db = _FakeSession([])  # foreign-host DIDs never touch the database
    activity = _activity(
        FederationActivityKind.RITUAL_SCHEDULE,
        _schedule_body(
            participants=[
                {"did": f"did:theourgia:{REMOTE_HOST}:vault:x", "role": None},
            ],
        ),
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "no participant on this instance" in (reason or "")
    assert db.added == []


async def test_schedule_without_valid_ritual_id_is_skipped() -> None:
    db = _FakeSession([])
    activity = _activity(
        FederationActivityKind.RITUAL_SCHEDULE,
        _schedule_body(ritual_id="not-a-uuid"),
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "ritual_id" in (reason or "")


# ── Inbound ritual.update: frozen rule + fragments ─────────────────


def _update_activity(
    body: dict[str, Any], *, sender: str = ORIGIN_INSTANCE_DID,
) -> FederationActivity:
    return _activity(
        FederationActivityKind.RITUAL_UPDATE,
        {"type": "ritual.update", "body": body},
        sender=sender,
    )


async def test_fragment_on_completed_ritual_is_frozen() -> None:
    mirror = _mirror(status=GroupRitualStatus.COMPLETED)
    db = _FakeSession([_Result(rows=[mirror])])
    activity = _update_activity({
        "ritual_id": str(mirror.origin_ritual_id),
        "update_kind": "fragment",
        "fragment_body": "Too late.",
    })
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert (reason or "").startswith("ritual_frozen")
    assert db.added == []


async def test_fragment_appends_and_promotes_invited_mirror() -> None:
    mirror = _mirror(status=GroupRitualStatus.INVITED)
    db = _FakeSession([_Result(rows=[mirror])])
    activity = _update_activity({
        "ritual_id": str(mirror.origin_ritual_id),
        "update_kind": "fragment",
        "author_did": ORIGIN_VAULT_DID,
        "fragment_body": "The temperature dropped.",
        "posted_at_utc": "2026-07-30T19:12:00Z",
    })
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    assert mirror.status is GroupRitualStatus.IN_PROGRESS
    fragments = [
        r for r in db.added if isinstance(r, GroupRitualFragment)
    ]
    assert len(fragments) == 1
    assert fragments[0].author_id is None
    assert fragments[0].author_did == ORIGIN_VAULT_DID
    assert fragments[0].body == "The temperature dropped."


async def test_mirror_update_from_non_origin_host_is_refused() -> None:
    mirror = _mirror()
    db = _FakeSession([_Result(rows=[mirror])])
    activity = _update_activity(
        {
            "ritual_id": str(mirror.origin_ritual_id),
            "update_kind": "fragment",
            "fragment_body": "Impostor fragment.",
        },
        sender="did:theourgia:mallory.example",
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "origin instance" in (reason or "")
    assert db.added == []


# ── Inbound ritual.update: start / completion ──────────────────────


async def test_start_promotes_mirror() -> None:
    mirror = _mirror(status=GroupRitualStatus.INVITED)
    db = _FakeSession([_Result(rows=[mirror])])
    activity = _update_activity({
        "ritual_id": str(mirror.origin_ritual_id),
        "update_kind": "start",
    })
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    assert mirror.status is GroupRitualStatus.IN_PROGRESS


async def test_completion_freezes_mirror() -> None:
    mirror = _mirror(status=GroupRitualStatus.IN_PROGRESS)
    db = _FakeSession([_Result(rows=[mirror])])
    activity = _update_activity({
        "ritual_id": str(mirror.origin_ritual_id),
        "update_kind": "completion",
    })
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    assert mirror.status is GroupRitualStatus.COMPLETED


async def test_participant_instance_cannot_send_completion() -> None:
    ritual = _local_ritual()
    db = _FakeSession([
        _Result(rows=[]),          # no mirror match
        _Result(rows=[ritual]),    # locally organized ritual
        _Result(rows=[ORIGIN_VAULT_DID]),  # remote roster
    ])
    activity = _update_activity(
        {
            "ritual_id": str(ritual.id),
            "update_kind": "completion",
        },
        sender=ORIGIN_INSTANCE_DID,
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "only the origin instance may send completion" in (reason or "")
    assert ritual.status is GroupRitualStatus.IN_PROGRESS


async def test_origin_accepts_fragment_from_participant_instance() -> None:
    ritual = _local_ritual()
    db = _FakeSession([
        _Result(rows=[]),          # no mirror match
        _Result(rows=[ritual]),    # locally organized ritual
        _Result(rows=[ORIGIN_VAULT_DID]),  # remote roster
    ])
    activity = _update_activity(
        {
            "ritual_id": str(ritual.id),
            "update_kind": "fragment",
            "author_did": ORIGIN_VAULT_DID,
            "fragment_body": "From the far shore.",
        },
        sender=ORIGIN_INSTANCE_DID,
    )
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    fragments = [
        r for r in db.added if isinstance(r, GroupRitualFragment)
    ]
    assert len(fragments) == 1
    assert fragments[0].author_did == ORIGIN_VAULT_DID


async def test_update_from_non_participant_instance_is_refused() -> None:
    ritual = _local_ritual()
    db = _FakeSession([
        _Result(rows=[]),
        _Result(rows=[ritual]),
        _Result(rows=[ORIGIN_VAULT_DID]),
    ])
    activity = _update_activity(
        {
            "ritual_id": str(ritual.id),
            "update_kind": "fragment",
            "fragment_body": "Uninvited.",
        },
        sender="did:theourgia:mallory.example",
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "not a participant instance" in (reason or "")


# ── Inbound ritual.update: postmortem write-once ───────────────────


async def test_postmortem_appends_once() -> None:
    mirror = _mirror(status=GroupRitualStatus.COMPLETED)
    db = _FakeSession([
        _Result(rows=[mirror]),
        _Result(rows=[]),  # no existing reflection by this author
    ])
    activity = _update_activity({
        "ritual_id": str(mirror.origin_ritual_id),
        "update_kind": "postmortem_entry",
        "author_did": ORIGIN_VAULT_DID,
        "reflection_body": "The working held.",
    })
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    reflections = [
        r for r in db.added if isinstance(r, GroupRitualReflection)
    ]
    assert len(reflections) == 1
    assert reflections[0].author_id is None
    assert reflections[0].author_did == ORIGIN_VAULT_DID


async def test_postmortem_duplicate_is_idempotent() -> None:
    mirror = _mirror(status=GroupRitualStatus.COMPLETED)
    existing = GroupRitualReflection(
        ritual_id=mirror.id,
        author_id=None,
        author_did=ORIGIN_VAULT_DID,
        body="The working held.",
    )
    db = _FakeSession([
        _Result(rows=[mirror]),
        _Result(rows=[existing]),
    ])
    activity = _update_activity({
        "ritual_id": str(mirror.origin_ritual_id),
        "update_kind": "postmortem_entry",
        "author_did": ORIGIN_VAULT_DID,
        "reflection_body": "The working held.",
    })
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    assert db.added == []  # write-once — retries never duplicate


# ── Inbound ritual.update: egregore registration ───────────────────


async def test_egregore_registers_in_local_non_declined_vaults() -> None:
    mirror = _mirror(status=GroupRitualStatus.COMPLETED)
    accepted = GroupRitualParticipant(
        ritual_id=mirror.id,
        user_id=uuid4(),
        status=ParticipantStatus.COMPLETED,
    )
    declined = GroupRitualParticipant(
        ritual_id=mirror.id,
        user_id=uuid4(),
        status=ParticipantStatus.DECLINED,
    )
    db = _FakeSession([
        _Result(rows=[mirror]),
        _Result(rows=[accepted, declined]),
        _Result(rows=[]),  # no existing entity for the accepted vault
    ])
    activity = _update_activity({
        "ritual_id": str(mirror.origin_ritual_id),
        "update_kind": "egregore_registration",
        "egregore_name": "Phosphoros",
    })
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED

    entities = [r for r in db.added if isinstance(r, Entity)]
    assert len(entities) == 1  # the declined vault gets NOTHING
    assert entities[0].kind is EntityKind.EGREGORE
    assert entities[0].name == "Phosphoros"
    assert entities[0].owner_id == accepted.user_id
    assert entities[0].origin == f"group-ritual:{mirror.origin_ritual_id}"
    assert mirror.egregore_entity_id == entities[0].id
    assert mirror.egregore_name == "Phosphoros"


async def test_egregore_registration_is_idempotent() -> None:
    mirror = _mirror(status=GroupRitualStatus.COMPLETED)
    participant = GroupRitualParticipant(
        ritual_id=mirror.id,
        user_id=uuid4(),
        status=ParticipantStatus.COMPLETED,
    )
    existing = Entity(
        name="Phosphoros",
        kind=EntityKind.EGREGORE,
        owner_id=participant.user_id,
        origin=f"group-ritual:{mirror.origin_ritual_id}",
    )
    mirror.egregore_entity_id = existing.id
    db = _FakeSession([
        _Result(rows=[mirror]),
        _Result(rows=[participant]),
        _Result(rows=[existing]),
    ])
    activity = _update_activity({
        "ritual_id": str(mirror.origin_ritual_id),
        "update_kind": "egregore_registration",
        "egregore_name": "Phosphoros",
    })
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    assert not any(isinstance(r, Entity) for r in db.added)


async def test_unknown_update_kind_is_skipped() -> None:
    db = _FakeSession([])
    activity = _update_activity({
        "ritual_id": str(uuid4()),
        "update_kind": "transmute",
    })
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "unknown update_kind" in (reason or "")


# ── Outbound gating ────────────────────────────────────────────────


async def test_broadcast_is_noop_when_transport_disabled(monkeypatch) -> None:
    monkeypatch.setattr(
        ritual_outbound,
        "get_settings",
        lambda: SimpleNamespace(federation_transport_enabled=False),
    )
    db = _FakeSession([])  # must not even query the roster
    ritual = _local_ritual()
    sent = await ritual_outbound.broadcast_ritual_update(
        db, ritual, build_ritual_update_envelope(str(ritual.id), "start"),
    )
    assert sent == 0
    assert db.added == []
