"""Cross-instance group rituals + egregore creation flow — v1-031.

Covers the batch that carried FEATURES §14 group work across
instances (federation-protocol spec §4.7/§4.8):

  · ``declare-egregore`` creates the EGREGORE entity, links it via
    ``egregore_entity_id``, registers a copy in every local
    non-declined participant's vault, and is idempotent (409 once
    declared; organizer-only; during/after the working only).
  · The two federation kinds process / skip correctly:
    ``ritual.schedule`` mirrors the ritual for local roster DIDs;
    ``ritual.update`` dispatches on update_kind (start / fragment /
    completion / postmortem_entry / egregore_registration).
  · Fragment merge: a remote participant's fragment appends to the
    local collective log with ``author_did`` attribution; fragments
    on a COMPLETED ritual are refused (ritual_frozen, H08 rule 22).
  · Egregore cross-vault announce enqueues when the transport is on,
    no-ops when off.
  · Sealed ritual content never enqueued (spec §4.1 regression) —
    anything shaped like ciphertext refuses the schedule broadcast.

DB-less fake-session style per ``test_federation_wiring_v1.py``:
queue-backed sessions assert the exact number of queries a path
issues.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import pytest
from fastapi import HTTPException

from theourgia.api.routers.v1 import group_rituals as gr_router
from theourgia.core.federation import inbox_processor, ritual_outbound
from theourgia.core.federation.inbox_processor import process_activity
from theourgia.models.entities import Entity, EntityKind
from theourgia.models.federation_activity import (
    FederationActivity,
    FederationActivityKind,
    FederationActivityStatus,
)
from theourgia.models.federation_delivery import FederationDelivery
from theourgia.models.group_ritual import (
    GroupRitual,
    GroupRitualFragment,
    GroupRitualParticipant,
    GroupRitualReflection,
    GroupRitualRemoteParticipant,
    GroupRitualStatus,
    ParticipantStatus,
)
from theourgia.models.notifications import Notification

# ── Fakes (queue-backed session per the suite's DB-less style) ──────


class _Result:
    def __init__(self, *, scalar: Any = None, rows: list[Any] | None = None) -> None:
        self._scalar = scalar
        self._rows = rows if rows is not None else []

    def scalar_one_or_none(self) -> Any:
        return self._scalar

    def scalars(self) -> _Result:
        return self

    def first(self) -> Any:
        if self._scalar is not None:
            return self._scalar
        return self._rows[0] if self._rows else None

    def all(self) -> list[Any]:
        return self._rows


class _FakeSession:
    """Each ``execute`` pops the next queued result, so tests assert
    the exact number of queries a path issues."""

    def __init__(self, results: list[_Result] | None = None) -> None:
        self.results = list(results or [])
        self.added: list[Any] = []
        self.deleted: list[Any] = []
        self.commits = 0
        self.flushes = 0
        self.rollbacks = 0

    async def execute(self, stmt: Any) -> _Result:
        assert self.results, "handler issued an unexpected query"
        return self.results.pop(0)

    def add(self, row: Any) -> None:
        self.added.append(row)

    async def delete(self, row: Any) -> None:
        self.deleted.append(row)

    async def commit(self) -> None:
        self.commits += 1

    async def flush(self) -> None:
        self.flushes += 1

    async def rollback(self) -> None:
        self.rollbacks += 1

    async def refresh(self, row: Any) -> None:
        return None


LOCAL_HOST = "hearth.sophia.example"
PEER_HOST = "aurora.example"
PEER_INSTANCE_DID = f"did:theourgia:{PEER_HOST}"
PEER_VAULT_DID = f"did:theourgia:{PEER_HOST}:vault:soror-stella"
LOCAL_VAULT_DID = f"did:theourgia:{LOCAL_HOST}:vault:aspasia"


def _ritual(
    organizer_id: Any = None,
    *,
    status: GroupRitualStatus = GroupRitualStatus.IN_PROGRESS,
    egregore_name: str | None = None,
    egregore_entity_id: Any = None,
    origin_ritual_id: Any = None,
    origin_did: str | None = None,
    correspondences: dict | None = None,
    shared_script: str | None = None,
) -> GroupRitual:
    return GroupRitual(
        organizer_id=organizer_id,
        title="Dark Moon Working",
        scheduled_for_utc=datetime(2026, 8, 1, 20, 0, tzinfo=UTC),
        status=status,
        egregore_name=egregore_name,
        egregore_entity_id=egregore_entity_id,
        origin_ritual_id=origin_ritual_id,
        origin_did=origin_did,
        correspondences_payload=correspondences or {},
        shared_script=shared_script,
    )


def _remote_participant(ritual_id: Any, did: str = PEER_VAULT_DID):
    return GroupRitualRemoteParticipant(
        ritual_id=ritual_id,
        did=did,
        invited_at=datetime.now(tz=UTC),
    )


def _vault(owner_id: Any, slug: str = "aspasia") -> SimpleNamespace:
    return SimpleNamespace(owner_id=owner_id, slug=slug)


def _activity(
    kind: FederationActivityKind,
    body: dict[str, Any],
    *,
    sender: str = PEER_INSTANCE_DID,
) -> FederationActivity:
    return FederationActivity(
        sender_did=sender,
        kind=kind,
        body_json=body,
        received_at=datetime.now(tz=UTC),
    )


def _transport(
    monkeypatch: pytest.MonkeyPatch, *, enabled: bool,
) -> None:
    settings = SimpleNamespace(
        federation_transport_enabled=enabled,
        instance_id=LOCAL_HOST,
    )
    monkeypatch.setattr(ritual_outbound, "get_settings", lambda: settings)
    monkeypatch.setattr(gr_router, "get_settings", lambda: settings)


def _local_instance(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        inbox_processor,
        "get_settings",
        lambda: SimpleNamespace(instance_id=LOCAL_HOST),
    )


# ── declare-egregore ────────────────────────────────────────────────


async def test_declare_egregore_creates_links_and_registers(
    monkeypatch,
) -> None:
    _transport(monkeypatch, enabled=False)
    organizer = uuid4()
    friend = uuid4()
    ritual = _ritual(
        organizer,
        correspondences={"tradition_tags": ["chaos", "hermetic"]},
    )
    db = _FakeSession([
        _Result(rows=[ritual]),                     # load ritual
        _Result(rows=[                              # local participants
            GroupRitualParticipant(
                ritual_id=ritual.id,
                user_id=friend,
                status=ParticipantStatus.ACCEPTED,
            ),
        ]),
        _Result(rows=[]),                           # no organizer copy yet
        _Result(rows=[]),                           # no friend copy yet
    ])
    user = SimpleNamespace(id=organizer)

    read = await gr_router.declare_egregore(
        ritual.id,
        gr_router.EgregoreDeclare(name="Lux Collectiva", summary="Ours."),
        user,
        db,
    )

    entities = [r for r in db.added if isinstance(r, Entity)]
    assert len(entities) == 2  # organizer + accepted local participant
    for entity in entities:
        assert entity.kind is EntityKind.EGREGORE
        assert entity.name == "Lux Collectiva"
        assert entity.origin == f"group-ritual:{ritual.id}"
        assert entity.tradition == "chaos"
        assert entity.tradition_tags == ["chaos", "hermetic"]
    owners = {e.owner_id for e in entities}
    assert owners == {organizer, friend}

    # Linked to the ORGANIZER's copy; the entity is a normal entity
    # thereafter (offerings, contracts attach to it).
    organizer_entity = next(e for e in entities if e.owner_id == organizer)
    assert ritual.egregore_entity_id == organizer_entity.id
    assert ritual.egregore_name == "Lux Collectiva"
    assert read.egregore_entity_id == str(organizer_entity.id)
    # Transport off — the local registration never enqueues anything.
    assert not any(isinstance(r, FederationDelivery) for r in db.added)


async def test_declare_egregore_409_when_already_declared() -> None:
    organizer = uuid4()
    ritual = _ritual(
        organizer,
        egregore_name="Lux",
        egregore_entity_id=uuid4(),
    )
    db = _FakeSession([_Result(rows=[ritual])])
    with pytest.raises(HTTPException) as exc:
        await gr_router.declare_egregore(
            ritual.id,
            gr_router.EgregoreDeclare(name="Lux"),
            SimpleNamespace(id=organizer),
            db,
        )
    assert exc.value.status_code == 409
    assert "already declared" in exc.value.detail
    assert db.added == []


@pytest.mark.parametrize(
    "ritual_status",
    [GroupRitualStatus.DRAFT, GroupRitualStatus.INVITED],
)
async def test_declare_egregore_409_before_the_working(
    ritual_status: GroupRitualStatus,
) -> None:
    organizer = uuid4()
    ritual = _ritual(organizer, status=ritual_status)
    db = _FakeSession([_Result(rows=[ritual])])
    with pytest.raises(HTTPException) as exc:
        await gr_router.declare_egregore(
            ritual.id,
            gr_router.EgregoreDeclare(name="Lux"),
            SimpleNamespace(id=organizer),
            db,
        )
    assert exc.value.status_code == 409
    assert db.added == []


async def test_declare_egregore_organizer_only() -> None:
    ritual = _ritual(uuid4())
    db = _FakeSession([_Result(rows=[ritual])])
    with pytest.raises(HTTPException) as exc:
        await gr_router.declare_egregore(
            ritual.id,
            gr_router.EgregoreDeclare(name="Lux"),
            SimpleNamespace(id=uuid4()),
            db,
        )
    assert exc.value.status_code == 403


async def test_declare_egregore_announces_to_remote_roster(
    monkeypatch,
) -> None:
    _transport(monkeypatch, enabled=True)
    organizer = uuid4()
    ritual = _ritual(organizer)
    db = _FakeSession([
        _Result(rows=[ritual]),                          # load ritual
        _Result(rows=[]),                                # no local participants
        _Result(rows=[]),                                # no organizer copy yet
        _Result(rows=[_remote_participant(ritual.id)]),  # remote roster
    ])
    await gr_router.declare_egregore(
        ritual.id,
        gr_router.EgregoreDeclare(name="Lux Collectiva"),
        SimpleNamespace(id=organizer),
        db,
    )

    deliveries = [r for r in db.added if isinstance(r, FederationDelivery)]
    assert len(deliveries) == 1
    assert deliveries[0].recipient_did == PEER_VAULT_DID
    assert deliveries[0].url == (
        f"https://{PEER_HOST}/api/v1/federation/inbox"
    )
    assert deliveries[0].body_json["type"] == "ritual.update"
    body = deliveries[0].body_json["body"]
    assert body["update_kind"] == "egregore_registration"
    assert body["egregore_name"] == "Lux Collectiva"
    assert body["ritual_id"] == str(ritual.id)


# ── Invite with remote DIDs ─────────────────────────────────────────


async def test_invite_remote_did_records_roster_and_enqueues_schedule(
    monkeypatch,
) -> None:
    _transport(monkeypatch, enabled=True)
    organizer = uuid4()
    ritual = _ritual(organizer, status=GroupRitualStatus.DRAFT)
    remote_row = _remote_participant(ritual.id)
    db = _FakeSession([
        _Result(rows=[ritual]),        # load ritual
        _Result(rows=[]),              # existing local participants
        _Result(rows=[]),              # existing remote roster
        _Result(rows=[_vault(organizer)]),  # organizer vault → DID
        _Result(rows=[remote_row]),    # roster for the broadcast
    ])
    read = await gr_router.invite_participants(
        ritual.id,
        gr_router.InvitePayload(remote_dids=[PEER_VAULT_DID]),
        SimpleNamespace(id=organizer),
        db,
    )
    assert read.status is GroupRitualStatus.INVITED

    roster = [
        r for r in db.added
        if isinstance(r, GroupRitualRemoteParticipant)
    ]
    assert len(roster) == 1
    assert roster[0].did == PEER_VAULT_DID

    deliveries = [r for r in db.added if isinstance(r, FederationDelivery)]
    assert len(deliveries) == 1
    envelope = deliveries[0].body_json
    assert envelope["type"] == "ritual.schedule"
    assert envelope["body"]["ritual_id"] == str(ritual.id)
    assert envelope["body"]["organizer_did"] == LOCAL_VAULT_DID
    assert envelope["body"]["participants"] == [
        {"did": PEER_VAULT_DID, "role": None},
    ]


async def test_invite_remote_did_transport_off_records_roster_only(
    monkeypatch,
) -> None:
    """Degrades cleanly: the invitation intent is recorded locally;
    nothing is queued while the transport is off."""
    _transport(monkeypatch, enabled=False)
    organizer = uuid4()
    ritual = _ritual(organizer, status=GroupRitualStatus.DRAFT)
    db = _FakeSession([
        _Result(rows=[ritual]),
        _Result(rows=[]),                   # existing local participants
        _Result(rows=[]),                   # existing remote roster
        _Result(rows=[_vault(organizer)]),  # organizer vault lookup
    ])
    await gr_router.invite_participants(
        ritual.id,
        gr_router.InvitePayload(remote_dids=[PEER_VAULT_DID]),
        SimpleNamespace(id=organizer),
        db,
    )
    assert any(
        isinstance(r, GroupRitualRemoteParticipant) for r in db.added
    )
    assert not any(isinstance(r, FederationDelivery) for r in db.added)


async def test_invite_rejects_malformed_and_local_dids(monkeypatch) -> None:
    _transport(monkeypatch, enabled=True)
    organizer = uuid4()
    for bad in ("not-a-did", f"did:theourgia:{PEER_HOST}", LOCAL_VAULT_DID):
        ritual = _ritual(organizer, status=GroupRitualStatus.DRAFT)
        db = _FakeSession([_Result(rows=[ritual])])
        with pytest.raises(HTTPException) as exc:
            await gr_router.invite_participants(
                ritual.id,
                gr_router.InvitePayload(remote_dids=[bad]),
                SimpleNamespace(id=organizer),
                db,
            )
        assert exc.value.status_code == 400
        assert db.added == []


# ── Sealed content regression (spec §4.1) ───────────────────────────


async def test_sealed_ritual_content_never_enqueued(monkeypatch) -> None:
    """Anything shaped like ciphertext refuses the schedule broadcast
    — the roster row exists but NO delivery is queued."""
    _transport(monkeypatch, enabled=True)
    organizer = uuid4()
    ritual = _ritual(
        organizer,
        status=GroupRitualStatus.INVITED,
        correspondences={
            "items": ["myrrh"],
            "sealed_note": {"vault_crypto_envelope": "AAAA"},
        },
    )
    db = _FakeSession([_Result(rows=[_remote_participant(ritual.id)])])
    enqueued = await ritual_outbound.broadcast_ritual_schedule(
        db, ritual, organizer_did=LOCAL_VAULT_DID,
    )
    assert enqueued == 0
    assert db.added == []


def test_contains_ciphertext_walks_nested_structures() -> None:
    assert ritual_outbound._contains_ciphertext(
        {"a": [{"b": {"vault_crypto_envelope": "x"}}]}
    )
    assert not ritual_outbound._contains_ciphertext(
        {"a": [{"b": {"plain": "x"}}], "c": "vault_crypto_envelope"}
    )


# ── Inbox: ritual.schedule ──────────────────────────────────────────


def _schedule_body(
    wire_id: Any,
    participants: list[dict[str, Any]],
    **overrides: Any,
) -> dict[str, Any]:
    body = {
        "ritual_id": str(wire_id),
        "organizer_did": PEER_VAULT_DID,
        "title": "Dark Moon Working",
        "scheduled_for_utc": "2026-08-01T20:00:00+00:00",
        "location_kind": "dispersed",
        "shared_script": "First the banishing.",
        "participants": participants,
    }
    body.update(overrides)
    return {"type": "ritual.schedule", "body": body}


async def test_ritual_schedule_creates_mirror_for_local_roster(
    monkeypatch,
) -> None:
    _local_instance(monkeypatch)
    owner = uuid4()
    wire_id = uuid4()
    activity = _activity(
        FederationActivityKind.RITUAL_SCHEDULE,
        _schedule_body(
            wire_id,
            [
                {"did": LOCAL_VAULT_DID, "role": "officiant"},
                {"did": "did:theourgia:elsewhere.example:vault:x"},
            ],
        ),
    )
    db = _FakeSession([
        _Result(rows=[_vault(owner)]),  # LOCAL_VAULT_DID → vault
        _Result(rows=[]),               # no existing mirror
        _Result(rows=[]),               # no existing participants
    ])
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED, reason

    mirrors = [r for r in db.added if isinstance(r, GroupRitual)]
    assert len(mirrors) == 1
    mirror = mirrors[0]
    assert mirror.organizer_id is None
    assert mirror.origin_ritual_id == wire_id
    assert mirror.origin_did == PEER_VAULT_DID
    assert mirror.status is GroupRitualStatus.INVITED
    assert mirror.shared_script == "First the banishing."

    participants = [
        r for r in db.added if isinstance(r, GroupRitualParticipant)
    ]
    assert len(participants) == 1
    assert participants[0].user_id == owner
    assert participants[0].role_in_ritual == "officiant"
    # The invited practitioner is notified.
    assert any(isinstance(r, Notification) for r in db.added)


async def test_ritual_schedule_is_idempotent(monkeypatch) -> None:
    _local_instance(monkeypatch)
    owner = uuid4()
    wire_id = uuid4()
    mirror = _ritual(
        None,
        status=GroupRitualStatus.INVITED,
        origin_ritual_id=wire_id,
        origin_did=PEER_VAULT_DID,
    )
    activity = _activity(
        FederationActivityKind.RITUAL_SCHEDULE,
        _schedule_body(wire_id, [{"did": LOCAL_VAULT_DID}]),
    )
    db = _FakeSession([
        _Result(rows=[_vault(owner)]),
        _Result(rows=[mirror]),         # mirror already exists
        _Result(rows=[owner]),          # participant already exists
    ])
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    assert db.added == []


async def test_ritual_schedule_without_local_participant_skips(
    monkeypatch,
) -> None:
    _local_instance(monkeypatch)
    activity = _activity(
        FederationActivityKind.RITUAL_SCHEDULE,
        _schedule_body(
            uuid4(), [{"did": "did:theourgia:elsewhere.example:vault:x"}],
        ),
    )
    db = _FakeSession()  # foreign-host DIDs resolve without queries
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "no participant on this instance" in (reason or "")


# ── Inbox: ritual.update ────────────────────────────────────────────


def _update_body(wire_id: Any, update_kind: str, **fields: Any) -> dict:
    body = {"ritual_id": str(wire_id), "update_kind": update_kind}
    body.update(fields)
    return {"type": "ritual.update", "body": body}


async def test_remote_fragment_merges_into_local_log() -> None:
    """The post-ritual collective log: a remote participant's fragment
    appends with author_did attribution."""
    ritual = _ritual(uuid4(), status=GroupRitualStatus.IN_PROGRESS)
    activity = _activity(
        FederationActivityKind.RITUAL_UPDATE,
        _update_body(
            ritual.id,
            "fragment",
            author_did=PEER_VAULT_DID,
            fragment_body="The candle guttered at the third name.",
            posted_at_utc="2026-08-01T20:15:00+00:00",
        ),
    )
    db = _FakeSession([
        _Result(rows=[]),                 # not a mirror id
        _Result(rows=[ritual]),           # locally organized ritual
        _Result(rows=[PEER_VAULT_DID]),   # remote roster DIDs
    ])
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED, reason

    fragments = [
        r for r in db.added if isinstance(r, GroupRitualFragment)
    ]
    assert len(fragments) == 1
    assert fragments[0].author_id is None
    assert fragments[0].author_did == PEER_VAULT_DID
    assert fragments[0].body == "The candle guttered at the third name."
    assert fragments[0].posted_at_utc == datetime(
        2026, 8, 1, 20, 15, tzinfo=UTC,
    )


async def test_remote_fragment_refused_once_completed() -> None:
    """H08 rule 22 / spec §10.5: COMPLETED freezes the log."""
    ritual = _ritual(uuid4(), status=GroupRitualStatus.COMPLETED)
    activity = _activity(
        FederationActivityKind.RITUAL_UPDATE,
        _update_body(
            ritual.id, "fragment",
            author_did=PEER_VAULT_DID, fragment_body="late",
        ),
    )
    db = _FakeSession([
        _Result(rows=[]),
        _Result(rows=[ritual]),
        _Result(rows=[PEER_VAULT_DID]),
    ])
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "ritual_frozen" in (reason or "")
    assert db.added == []


async def test_update_from_non_participant_instance_skips() -> None:
    ritual = _ritual(uuid4())
    activity = _activity(
        FederationActivityKind.RITUAL_UPDATE,
        _update_body(
            ritual.id, "fragment",
            author_did="did:theourgia:mallory.example:vault:eve",
            fragment_body="spoof",
        ),
        sender="did:theourgia:mallory.example",
    )
    db = _FakeSession([
        _Result(rows=[]),
        _Result(rows=[ritual]),
        _Result(rows=[PEER_VAULT_DID]),  # roster excludes mallory
    ])
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "not a participant instance" in (reason or "")
    assert db.added == []


async def test_mirror_start_comes_only_from_origin() -> None:
    wire_id = uuid4()
    mirror = _ritual(
        None,
        status=GroupRitualStatus.INVITED,
        origin_ritual_id=wire_id,
        origin_did=PEER_VAULT_DID,
    )
    ok = _activity(
        FederationActivityKind.RITUAL_UPDATE,
        _update_body(wire_id, "start"),
    )
    db = _FakeSession([_Result(rows=[mirror])])
    status, _ = await process_activity(db, ok)
    assert status is FederationActivityStatus.PROCESSED
    assert mirror.status is GroupRitualStatus.IN_PROGRESS

    mirror.status = GroupRitualStatus.INVITED
    impostor = _activity(
        FederationActivityKind.RITUAL_UPDATE,
        _update_body(wire_id, "start"),
        sender="did:theourgia:mallory.example",
    )
    db = _FakeSession([_Result(rows=[mirror])])
    status, reason = await process_activity(db, impostor)
    assert status is FederationActivityStatus.SKIPPED
    assert "origin instance" in (reason or "")
    assert mirror.status is GroupRitualStatus.INVITED


async def test_egregore_registration_mirrors_entity_per_vault() -> None:
    """Cross-vault registration: every local non-declined participant
    vault gains the EGREGORE entity; declined vaults do not."""
    wire_id = uuid4()
    mirror = _ritual(
        None,
        status=GroupRitualStatus.COMPLETED,
        origin_ritual_id=wire_id,
        origin_did=PEER_VAULT_DID,
    )
    accepted = GroupRitualParticipant(
        ritual_id=mirror.id,
        user_id=uuid4(),
        status=ParticipantStatus.ACCEPTED,
    )
    declined = GroupRitualParticipant(
        ritual_id=mirror.id,
        user_id=uuid4(),
        status=ParticipantStatus.DECLINED,
    )
    activity = _activity(
        FederationActivityKind.RITUAL_UPDATE,
        _update_body(
            wire_id, "egregore_registration",
            egregore_name="Lux Collectiva",
        ),
    )
    db = _FakeSession([
        _Result(rows=[mirror]),
        _Result(rows=[accepted, declined]),
        _Result(rows=[]),  # accepted vault has no copy yet
    ])
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED, reason

    entities = [r for r in db.added if isinstance(r, Entity)]
    assert len(entities) == 1
    assert entities[0].owner_id == accepted.user_id
    assert entities[0].kind is EntityKind.EGREGORE
    assert entities[0].name == "Lux Collectiva"
    assert entities[0].origin == f"group-ritual:{wire_id}"
    assert mirror.egregore_entity_id == entities[0].id


async def test_postmortem_entry_is_write_once_per_author() -> None:
    ritual = _ritual(uuid4(), status=GroupRitualStatus.COMPLETED)
    activity = _activity(
        FederationActivityKind.RITUAL_UPDATE,
        _update_body(
            ritual.id, "postmortem_entry",
            author_did=PEER_VAULT_DID,
            reflection_body="A shared silence at the end.",
        ),
    )
    db = _FakeSession([
        _Result(rows=[]),
        _Result(rows=[ritual]),
        _Result(rows=[PEER_VAULT_DID]),
        _Result(rows=[]),  # no reflection from this author yet
    ])
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    reflections = [
        r for r in db.added if isinstance(r, GroupRitualReflection)
    ]
    assert len(reflections) == 1
    assert reflections[0].author_did == PEER_VAULT_DID

    # Redelivery converges instead of duplicating.
    db = _FakeSession([
        _Result(rows=[]),
        _Result(rows=[ritual]),
        _Result(rows=[PEER_VAULT_DID]),
        _Result(rows=[reflections[0]]),
    ])
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    assert db.added == []


async def test_unknown_update_kind_skips_without_queries() -> None:
    activity = _activity(
        FederationActivityKind.RITUAL_UPDATE,
        _update_body(uuid4(), "reschedule"),
    )
    db = _FakeSession()  # empty queue — a query would raise
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "reschedule" in (reason or "")


async def test_update_without_local_ritual_skips() -> None:
    activity = _activity(
        FederationActivityKind.RITUAL_UPDATE,
        _update_body(uuid4(), "start"),
    )
    db = _FakeSession([_Result(rows=[]), _Result(rows=[])])
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "no local ritual" in (reason or "")


def test_ritual_kinds_have_handlers() -> None:
    assert (
        FederationActivityKind.RITUAL_SCHEDULE in inbox_processor._HANDLERS
    )
    assert (
        FederationActivityKind.RITUAL_UPDATE in inbox_processor._HANDLERS
    )


# ── Merged collective log read ──────────────────────────────────────


async def test_list_fragments_returns_merged_log() -> None:
    organizer = uuid4()
    ritual = _ritual(organizer)
    local = GroupRitualFragment(
        ritual_id=ritual.id,
        author_id=organizer,
        body="I lit the censer.",
        posted_at_utc=datetime(2026, 8, 1, 20, 5, tzinfo=UTC),
    )
    remote = GroupRitualFragment(
        ritual_id=ritual.id,
        author_did=PEER_VAULT_DID,
        body="The candle guttered.",
        posted_at_utc=datetime(2026, 8, 1, 20, 15, tzinfo=UTC),
    )
    db = _FakeSession([
        _Result(rows=[ritual]),
        _Result(rows=[local, remote]),
    ])
    rows = await gr_router.list_fragments(
        ritual.id, SimpleNamespace(id=organizer), db,
    )
    assert [r.author_id for r in rows] == [str(organizer), None]
    assert [r.author_did for r in rows] == [None, PEER_VAULT_DID]


# ── Wire hygiene ────────────────────────────────────────────────────


def test_update_envelope_carries_only_its_ops_payload() -> None:
    envelope = ritual_outbound.build_ritual_update_envelope(
        "abc", "egregore_registration", egregore_name="Lux",
    )
    text = json.dumps(envelope)
    assert "shared_script" not in text
    assert "correspondences" not in text
    assert envelope["body"] == {
        "ritual_id": "abc",
        "update_kind": "egregore_registration",
        "egregore_name": "Lux",
    }
    with pytest.raises(ValueError, match="unknown ritual update kind"):
        ritual_outbound.build_ritual_update_envelope("abc", "reschedule")
