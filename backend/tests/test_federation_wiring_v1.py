"""Federation transport wiring — v1-026 (Phase 12.5/13 completion).

Covers the batch that made the transport actually DO things:

  · Inbox processor per-kind transitions, including the SKIPPED
    honesty path (Like/Announce leave no engagement record).
  · AP inbox HTTP-signature verification (401 unsigned / 202 signed,
    built with the project's own ``sign_request``).
  · Inbound Follow → outbound Accept enqueue, on AUTO approval and on
    the manual approve endpoint.
  · Publish → Create(Note) enqueue for ACCEPTED followers only, and
    the guarantee that publish NEVER fails on an enqueue error.
  · NodeInfo 2.0 shape + the no-engagement-counts regression.
  · Peer directory CRUD with an injected verification transport.
  · Capability token verification on the native inbox.

DB-less fake-session style per ``mbf_fixtures.py`` / the
closed-tradition suite: queue-backed sessions assert the exact number
of queries a path issues.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from time import time
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from theourgia.core.federation import ap_outbound
from theourgia.core.federation.http_signatures import (
    DEFAULT_COMPONENTS,
    SignedRequestComponents,
    sign_request,
)
from theourgia.core.federation.inbox_processor import (
    process_activity,
    process_pending,
)
from theourgia.core.federation.keys import generate_keypair
from theourgia.core.federation.peer_keys import PeerPublicKey
from theourgia.models.activitypub import (
    ActivityPubFollower,
    ActivityPubFollowRequest,
    ActivityPubSettings,
    FollowerApproval,
    FollowRequestState,
)
from theourgia.models.comment import Comment, CommentState
from theourgia.models.federation_activity import (
    FederationActivity,
    FederationActivityKind,
    FederationActivityStatus,
)
from theourgia.models.federation_delivery import FederationDelivery
from theourgia.models.federation_peer import FederationPeer

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


def _activity(
    kind: FederationActivityKind,
    body: dict[str, Any],
    *,
    sender: str = "https://thelema.example/users/frater-lux",
    target_user_id: str | None = None,
) -> FederationActivity:
    return FederationActivity(
        sender_did=sender,
        kind=kind,
        body_json=body,
        received_at=datetime.now(tz=UTC),
        target_user_id=target_user_id,
    )


def _ap_settings(
    owner_id: Any,
    *,
    enabled: bool = True,
    approval: FollowerApproval = FollowerApproval.MANUAL,
) -> ActivityPubSettings:
    return ActivityPubSettings(
        owner_id=owner_id,
        enabled=enabled,
        follower_approval=approval,
    )


def _vault(owner_id: Any) -> SimpleNamespace:
    return SimpleNamespace(owner_id=owner_id, slug="aspasia", display_name="Aspasia")


def _transport_on(monkeypatch: pytest.MonkeyPatch) -> None:
    """Point ap_outbound at an enabled-transport settings stub."""
    monkeypatch.setattr(
        ap_outbound,
        "get_settings",
        lambda: SimpleNamespace(
            federation_transport_enabled=True,
            base_url="https://hearth.sophia.example",
        ),
    )


# ── Inbox processor: follow.request ─────────────────────────────────


async def test_follow_request_manual_creates_pending_request(monkeypatch) -> None:
    owner = uuid4()
    db = _FakeSession([
        _Result(rows=[_ap_settings(owner)]),  # settings (MANUAL)
        _Result(rows=[]),                      # no existing follower
        _Result(rows=[]),                      # no pending request
    ])
    activity = _activity(
        FederationActivityKind.FOLLOW_REQUEST,
        {"type": "Follow", "actor": "https://thelema.example/users/frater-lux"},
        target_user_id=str(owner),
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    assert reason is None

    requests = [r for r in db.added if isinstance(r, ActivityPubFollowRequest)]
    assert len(requests) == 1
    assert requests[0].state is FollowRequestState.PENDING
    assert requests[0].follower_handle == "@frater-lux@thelema.example"
    # MANUAL approval: no follower row, no Accept delivery.
    assert not any(isinstance(r, ActivityPubFollower) for r in db.added)
    assert not any(isinstance(r, FederationDelivery) for r in db.added)


async def test_follow_request_auto_accepts_and_enqueues_accept(monkeypatch) -> None:
    _transport_on(monkeypatch)
    owner = uuid4()
    db = _FakeSession([
        _Result(rows=[_ap_settings(owner, approval=FollowerApproval.AUTO)]),
        _Result(rows=[]),                # no existing follower
        _Result(rows=[]),                # no pending request
        _Result(rows=[_vault(owner)]),   # vault for the Accept actor URL
    ])
    follow_body = {
        "type": "Follow",
        "actor": "https://thelema.example/users/frater-lux",
    }
    activity = _activity(
        FederationActivityKind.FOLLOW_REQUEST,
        follow_body,
        target_user_id=str(owner),
    )
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED

    requests = [r for r in db.added if isinstance(r, ActivityPubFollowRequest)]
    assert requests[0].state is FollowRequestState.ACCEPTED
    assert requests[0].resolved_at is not None
    followers = [r for r in db.added if isinstance(r, ActivityPubFollower)]
    assert len(followers) == 1

    deliveries = [r for r in db.added if isinstance(r, FederationDelivery)]
    assert len(deliveries) == 1
    assert deliveries[0].body_json["type"] == "Accept"
    # Mastodon-compat: the original Follow rides along as the object.
    assert deliveries[0].body_json["object"] == follow_body
    assert deliveries[0].url == "https://thelema.example/users/frater-lux/inbox"


async def test_follow_request_skipped_when_ap_disabled() -> None:
    owner = uuid4()
    db = _FakeSession([
        _Result(rows=[_ap_settings(owner, enabled=False)]),
    ])
    activity = _activity(
        FederationActivityKind.FOLLOW_REQUEST,
        {"type": "Follow", "actor": "https://thelema.example/users/x"},
        target_user_id=str(owner),
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "not enabled" in (reason or "")
    assert db.added == []


async def test_follow_request_without_target_is_skipped() -> None:
    db = _FakeSession()
    activity = _activity(
        FederationActivityKind.FOLLOW_REQUEST,
        {"type": "Follow", "actor": "https://thelema.example/users/x"},
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "target" in (reason or "")


async def test_duplicate_follow_request_is_idempotent() -> None:
    owner = uuid4()
    existing = ActivityPubFollower(
        owner_id=owner,
        follower_did="https://thelema.example/users/frater-lux",
    )
    db = _FakeSession([
        _Result(rows=[_ap_settings(owner)]),
        _Result(rows=[existing]),  # already a follower
    ])
    activity = _activity(
        FederationActivityKind.FOLLOW_REQUEST,
        {"type": "Follow", "actor": "https://thelema.example/users/frater-lux"},
        target_user_id=str(owner),
    )
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    assert db.added == []


# ── Inbox processor: follow.undo ────────────────────────────────────


async def test_follow_undo_removes_follower() -> None:
    owner = uuid4()
    follower = ActivityPubFollower(
        owner_id=owner,
        follower_did="https://thelema.example/users/frater-lux",
    )
    db = _FakeSession([_Result(rows=[follower])])
    activity = _activity(
        FederationActivityKind.FOLLOW_UNDO,
        {
            "type": "Undo",
            "actor": "https://thelema.example/users/frater-lux",
            "object": {"type": "Follow"},
        },
        target_user_id=str(owner),
    )
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED
    assert db.deleted == [follower]


async def test_follow_undo_without_matching_follower_is_skipped() -> None:
    owner = uuid4()
    db = _FakeSession([_Result(rows=[])])
    activity = _activity(
        FederationActivityKind.FOLLOW_UNDO,
        {"type": "Undo", "actor": "https://thelema.example/users/nobody"},
        target_user_id=str(owner),
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "no matching follower" in (reason or "")
    assert db.deleted == []


async def test_undo_of_non_follow_is_skipped_without_queries() -> None:
    owner = uuid4()
    db = _FakeSession()  # empty queue — a query would raise
    activity = _activity(
        FederationActivityKind.FOLLOW_UNDO,
        {
            "type": "Undo",
            "actor": "https://thelema.example/users/x",
            "object": {"type": "Like"},
        },
        target_user_id=str(owner),
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "Like" in (reason or "")


# ── Inbox processor: note.create → moderation queue ─────────────────


async def test_note_create_reply_lands_in_comment_moderation_queue() -> None:
    owner = uuid4()
    entry_id = uuid4()
    entry = SimpleNamespace(
        id=entry_id, owner_id=owner, comments_enabled=True,
    )
    db = _FakeSession([_Result(rows=[entry])])
    activity = _activity(
        FederationActivityKind.NOTE_CREATE,
        {
            "type": "Create",
            "actor": "https://thelema.example/users/frater-lux",
            "object": {
                "type": "Note",
                "inReplyTo": f"https://hearth.sophia.example/@aspasia/{entry_id}",
                "content": "A thoughtful reply.",
            },
        },
        target_user_id=str(owner),
    )
    status, _ = await process_activity(db, activity)
    assert status is FederationActivityStatus.PROCESSED

    comments = [r for r in db.added if isinstance(r, Comment)]
    assert len(comments) == 1
    # H08 rule 27 / spec §6.4 — federated comments start PENDING,
    # invisible until the vault owner approves.
    assert comments[0].state is CommentState.PENDING
    assert comments[0].target_id == entry_id
    assert comments[0].owner_id == owner
    assert comments[0].author_name == "@frater-lux@thelema.example"


async def test_note_create_without_in_reply_to_is_skipped() -> None:
    db = _FakeSession()  # no queries expected
    activity = _activity(
        FederationActivityKind.NOTE_CREATE,
        {
            "type": "Create",
            "actor": "https://thelema.example/users/x",
            "object": {"type": "Note", "content": "hello"},
        },
        target_user_id=str(uuid4()),
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "not a reply" in (reason or "")
    assert db.added == []


async def test_note_create_respects_comments_disabled() -> None:
    owner = uuid4()
    entry_id = uuid4()
    entry = SimpleNamespace(
        id=entry_id, owner_id=owner, comments_enabled=False,
    )
    db = _FakeSession([_Result(rows=[entry])])
    activity = _activity(
        FederationActivityKind.NOTE_CREATE,
        {
            "type": "Create",
            "actor": "https://thelema.example/users/x",
            "object": {
                "type": "Note",
                "inReplyTo": f"https://x.example/@a/{entry_id}",
                "content": "hi",
            },
        },
        target_user_id=str(owner),
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "disabled" in (reason or "")
    assert db.added == []


# ── Inbox processor: honesty skips ──────────────────────────────────


@pytest.mark.parametrize("ap_type", ["Like", "Announce"])
async def test_like_and_announce_record_nothing(ap_type: str) -> None:
    """No acknowledgement model exists → SKIPPED with the honesty
    reason, and NOTHING is written (no invented engagement rows)."""
    db = _FakeSession()  # zero queries, zero writes
    activity = _activity(
        FederationActivityKind.UNKNOWN,
        {"type": ap_type, "actor": "https://thelema.example/users/x"},
        target_user_id=str(uuid4()),
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "engagement is not recorded" in (reason or "")
    assert db.added == []
    assert db.deleted == []


async def test_unknown_kind_is_skipped_with_reason() -> None:
    db = _FakeSession()
    activity = _activity(
        FederationActivityKind.UNKNOWN,
        {"type": "TotallyNovel"},
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "no v1 handler" in (reason or "")


async def test_hub_kinds_are_skipped_not_errored() -> None:
    db = _FakeSession()
    activity = _activity(
        FederationActivityKind.HUB_POST,
        {"type": "hub.post"},
    )
    status, reason = await process_activity(db, activity)
    assert status is FederationActivityStatus.SKIPPED
    assert "hub.post" in (reason or "")


# ── Inbox processor: sweep transitions + isolation ──────────────────


async def test_process_pending_persists_transitions_and_isolates_errors(
    monkeypatch,
) -> None:
    bad = _activity(FederationActivityKind.NOTE_CREATE, {"type": "Create"})
    good = _activity(FederationActivityKind.UNKNOWN, {"type": "Like"})
    db = _FakeSession([_Result(rows=[bad, good])])

    from theourgia.core.federation import inbox_processor

    original = inbox_processor.process_activity

    async def _explode_on_first(session, activity, *, now=None):
        if activity is bad:
            raise RuntimeError("handler blew up")
        return await original(session, activity, now=now)

    monkeypatch.setattr(inbox_processor, "process_activity", _explode_on_first)

    counts = await process_pending(db)
    assert counts == {"processed": 0, "skipped": 1, "errored": 1}
    # The error never aborted the sweep; both rows left PENDING.
    assert bad.status is FederationActivityStatus.ERRORED
    assert "handler blew up" in (bad.error_detail or "")
    assert bad.processed_at is not None
    assert good.status is FederationActivityStatus.SKIPPED
    assert good.processed_at is not None
    # One commit per row; the failed handler's partial work rolled back.
    assert db.commits == 2
    assert db.rollbacks == 1


def test_inbox_processor_beat_entry_registered() -> None:
    import theourgia.core.tasks  # noqa: F401 — side-effect registration
    from theourgia.core.tasks.app import celery_app

    schedule = celery_app.conf.beat_schedule
    assert "theourgia.federation.process_inbox" in schedule
    entry = schedule["theourgia.federation.process_inbox"]
    assert entry["task"].endswith("run_process_federation_inbox")
    assert entry["task"] in set(celery_app.tasks.keys())


# ── AP inbox signature verification ─────────────────────────────────


class _StubResolver:
    def __init__(self, did: str, public_key: Any) -> None:
        self._key = PeerPublicKey(did=did, public_key=public_key, fetched_at=0.0)

    async def resolve(self, did: str) -> PeerPublicKey:
        return self._key


@pytest.fixture
def fed_env(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    """Enabled-transport environment with test-local key paths."""
    from theourgia.core.config import reset_settings_cache

    monkeypatch.setenv("THEOURGIA_ENV", "test")
    monkeypatch.setenv("THEOURGIA_FEDERATION_TRANSPORT_ENABLED", "1")
    monkeypatch.setenv(
        "THEOURGIA_FEDERATION_PRIVATE_KEY_PATH", str(tmp_path / "fed.key"),
    )
    monkeypatch.setenv(
        "THEOURGIA_FEDERATION_PUBLIC_KEY_PATH", str(tmp_path / "fed.pub"),
    )
    reset_settings_cache()
    yield
    reset_settings_cache()


def _ap_inbox_app(db: _FakeSession, resolver: Any):
    from theourgia.api.app import create_app
    from theourgia.api.deps import get_db_session
    from theourgia.api.routers.v1.federation_inbox import get_peer_key_resolver

    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db
    app.dependency_overrides[get_peer_key_resolver] = lambda: resolver
    return app


def _ap_inbox_db(owner: Any) -> _FakeSession:
    """Queue for post_inbox: vault → ap settings → escape-hatch row."""
    return _FakeSession([
        _Result(rows=[_vault(owner)]),
        _Result(rows=[_ap_settings(owner)]),
        _Result(scalar=None),  # federation.accept_anonymous_inbound unset
    ])


PEER_DID = "did:theourgia:thelema.example"


async def test_ap_inbox_rejects_unsigned_with_401(fed_env) -> None:
    keypair = generate_keypair()
    db = _ap_inbox_db(uuid4())
    app = _ap_inbox_app(db, _StubResolver(PEER_DID, keypair.public_key))
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.post(
            "/users/aspasia/inbox",
            json={"type": "Follow", "actor": "https://thelema.example/users/x"},
        )
    assert response.status_code == 401
    assert "signature" in response.text.lower()
    assert db.commits == 0


async def test_ap_inbox_accepts_signed_request_with_202(fed_env) -> None:
    keypair = generate_keypair()
    db = _ap_inbox_db(uuid4())
    app = _ap_inbox_app(db, _StubResolver(PEER_DID, keypair.public_key))

    body = json.dumps(
        {"type": "Follow", "actor": "https://thelema.example/users/frater-lux"},
    ).encode("utf-8")
    components = SignedRequestComponents(
        method="POST",
        path="/users/aspasia/inbox",
        headers={"Host": "testserver"},
        components=DEFAULT_COMPONENTS,
    )
    headers = sign_request(
        private_key=keypair.private_key,
        keyid=PEER_DID,
        components=components,
        created=int(time()),
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.post(
            "/users/aspasia/inbox",
            content=body,
            headers={**headers, "Content-Type": "application/activity+json"},
        )
    assert response.status_code == 202, response.text
    # Nonce recorded + activity persisted.
    assert any(isinstance(r, FederationActivity) for r in db.added)
    stored = next(r for r in db.added if isinstance(r, FederationActivity))
    assert stored.kind is FederationActivityKind.FOLLOW_REQUEST
    assert db.commits == 1


async def test_ap_inbox_rejects_bad_signature_with_401(fed_env) -> None:
    keypair = generate_keypair()
    other = generate_keypair()  # signs with a key the resolver doesn't vouch
    db = _ap_inbox_db(uuid4())
    app = _ap_inbox_app(db, _StubResolver(PEER_DID, keypair.public_key))

    components = SignedRequestComponents(
        method="POST",
        path="/users/aspasia/inbox",
        headers={"Host": "testserver"},
        components=DEFAULT_COMPONENTS,
    )
    headers = sign_request(
        private_key=other.private_key,
        keyid=PEER_DID,
        components=components,
        created=int(time()),
    )
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.post(
            "/users/aspasia/inbox",
            content=b'{"type":"Follow"}',
            headers=headers,
        )
    assert response.status_code == 401


# ── Manual approve → Accept enqueue ─────────────────────────────────


async def test_approve_endpoint_enqueues_accept(monkeypatch) -> None:
    _transport_on(monkeypatch)
    from theourgia.api.routers.v1.activitypub import approve_request

    owner = uuid4()
    request_row = ActivityPubFollowRequest(
        owner_id=owner,
        follower_did="https://thelema.example/users/frater-lux",
        follower_handle="@frater-lux@thelema.example",
    )
    db = _FakeSession([
        _Result(rows=[request_row]),   # the pending request
        _Result(rows=[_vault(owner)]),  # vault for the Accept actor URL
    ])
    user = SimpleNamespace(id=owner)

    read = await approve_request(request_row.id, user, db)
    assert read.state is FollowRequestState.ACCEPTED

    deliveries = [r for r in db.added if isinstance(r, FederationDelivery)]
    assert len(deliveries) == 1
    assert deliveries[0].body_json["type"] == "Accept"
    assert deliveries[0].recipient_did == request_row.follower_did


async def test_approve_endpoint_survives_enqueue_failure(monkeypatch) -> None:
    from theourgia.api.routers.v1 import activitypub as ap_router

    async def _explode(*args: Any, **kwargs: Any) -> None:
        raise RuntimeError("queue offline")

    monkeypatch.setattr(ap_router, "enqueue_accept_for_follow", _explode)

    owner = uuid4()
    request_row = ActivityPubFollowRequest(
        owner_id=owner,
        follower_did="https://thelema.example/users/frater-lux",
    )
    db = _FakeSession([_Result(rows=[request_row])])
    user = SimpleNamespace(id=owner)

    read = await ap_router.approve_request(request_row.id, user, db)
    # The local approval landed despite the enqueue failure.
    assert read.state is FollowRequestState.ACCEPTED
    assert any(isinstance(r, ActivityPubFollower) for r in db.added)


# ── Publish → Create broadcast ──────────────────────────────────────


def _entry_stub(owner: Any) -> SimpleNamespace:
    now = datetime.now(tz=UTC)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=owner,
        title="Wednesday banishing",
        excerpt="Notes on the working.",
        published_at=now,
        created_at=now,
    )


async def test_publish_broadcast_enqueues_for_accepted_followers_only(
    monkeypatch,
) -> None:
    _transport_on(monkeypatch)
    owner = uuid4()
    followers = [
        ActivityPubFollower(
            owner_id=owner,
            follower_did="https://thelema.example/users/frater-lux",
        ),
        ActivityPubFollower(
            owner_id=owner,
            follower_did="https://aurora.example/users/soror-stella",
            follower_inbox_url="https://aurora.example/inbox/soror-stella",
        ),
    ]
    ap_settings = _ap_settings(owner)
    ap_settings.broadcast_creates = True
    db = _FakeSession([
        _Result(rows=[ap_settings]),
        _Result(rows=[_vault(owner)]),
        _Result(rows=followers),
    ])
    count = await ap_outbound.enqueue_create_for_entry(db, _entry_stub(owner))
    assert count == 2

    deliveries = [r for r in db.added if isinstance(r, FederationDelivery)]
    assert len(deliveries) == 2
    for d in deliveries:
        assert d.body_json["type"] == "Create"
        assert d.body_json["object"]["type"] == "Note"
    # The stored inbox URL wins over the /inbox convention.
    assert deliveries[1].url == "https://aurora.example/inbox/soror-stella"


async def test_publish_broadcast_noop_when_ap_disabled(monkeypatch) -> None:
    _transport_on(monkeypatch)
    owner = uuid4()
    db = _FakeSession([
        _Result(rows=[_ap_settings(owner, enabled=False)]),
    ])
    count = await ap_outbound.enqueue_create_for_entry(db, _entry_stub(owner))
    assert count == 0
    assert db.added == []


async def test_publish_broadcast_noop_when_transport_disabled(monkeypatch) -> None:
    monkeypatch.setattr(
        ap_outbound,
        "get_settings",
        lambda: SimpleNamespace(federation_transport_enabled=False),
    )
    db = _FakeSession()  # zero queries — the gate short-circuits
    count = await ap_outbound.enqueue_create_for_entry(db, _entry_stub(uuid4()))
    assert count == 0


async def test_apply_publish_never_fails_on_enqueue_error(monkeypatch) -> None:
    """The publish transition must land even when the broadcast path
    explodes — enqueue errors are logged, never raised."""
    from theourgia.api.routers.v1.entries import apply_publish
    from theourgia.models.entries import EncryptionMode, EntryVisibility

    async def _explode(session: Any, entry: Any) -> int:
        raise RuntimeError("broker down")

    monkeypatch.setattr(ap_outbound, "enqueue_create_for_entry", _explode)

    row = SimpleNamespace(
        id=uuid4(),
        encryption_mode=EncryptionMode.NONE,
        tradition_tags=[],
        published_at=None,
        visibility=EntryVisibility.PERSONAL,
    )
    db = _FakeSession([
        _Result(scalar=None),  # closed-tradition instance setting read
    ])
    changed = await apply_publish(db, row)
    assert changed is True
    assert row.published_at is not None
    assert row.visibility is EntryVisibility.PUBLIC


async def test_apply_publish_idempotent_republish_skips_broadcast(
    monkeypatch,
) -> None:
    from theourgia.api.routers.v1.entries import apply_publish
    from theourgia.models.entries import EncryptionMode, EntryVisibility

    calls: list[Any] = []

    async def _record(session: Any, entry: Any) -> int:
        calls.append(entry)
        return 0

    monkeypatch.setattr(ap_outbound, "enqueue_create_for_entry", _record)

    row = SimpleNamespace(
        id=uuid4(),
        encryption_mode=EncryptionMode.NONE,
        tradition_tags=[],
        published_at=datetime.now(tz=UTC),
        visibility=EntryVisibility.PUBLIC,
    )
    db = _FakeSession([_Result(scalar=None)])
    changed = await apply_publish(db, row)
    assert changed is False
    assert calls == []


# ── NodeInfo 2.0 ────────────────────────────────────────────────────


async def test_nodeinfo_discovery_and_schema_shape(fed_env) -> None:
    from theourgia.__about__ import __version__
    from theourgia.api.app import create_app
    from theourgia.api.deps import get_db_session

    db = _FakeSession([_Result(scalar=None)])  # registration.open unset
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        discovery = await ac.get("/.well-known/nodeinfo")
        schema = await ac.get("/nodeinfo/2.0")

    assert discovery.status_code == 200
    links = discovery.json()["links"]
    assert links[0]["rel"] == "http://nodeinfo.diaspora.software/ns/schema/2.0"
    assert links[0]["href"].endswith("/nodeinfo/2.0")

    assert schema.status_code == 200
    body = schema.json()
    assert body["version"] == "2.0"
    assert body["software"] == {"name": "theourgia", "version": __version__}
    assert body["protocols"] == ["activitypub"]
    assert body["services"] == {"inbound": [], "outbound": []}
    # registration.open defaults True.
    assert body["openRegistrations"] is True


async def test_nodeinfo_emits_no_engagement_counts(fed_env) -> None:
    """Regression: the response body carries NO user / post / comment
    counts — usage is the minimum schema-valid empty-users shape."""
    from theourgia.api.app import create_app
    from theourgia.api.deps import get_db_session

    db = _FakeSession([_Result(scalar=None)])
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.get("/nodeinfo/2.0")

    body = response.json()
    assert body["usage"] == {"users": {}}
    text = response.text
    for banned in ("localPosts", "localComments", "activeMonth", "activeHalfyear", '"total"'):
        assert banned not in text, f"engagement count leaked: {banned}"


async def test_nodeinfo_503_when_transport_disabled(monkeypatch) -> None:
    from theourgia.core.config import reset_settings_cache

    monkeypatch.delenv("THEOURGIA_FEDERATION_TRANSPORT_ENABLED", raising=False)
    reset_settings_cache()
    try:
        from theourgia.api.app import create_app

        app = create_app()
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://testserver",
        ) as ac:
            assert (await ac.get("/.well-known/nodeinfo")).status_code == 503
            assert (await ac.get("/nodeinfo/2.0")).status_code == 503
    finally:
        reset_settings_cache()


# ── Peer directory CRUD ─────────────────────────────────────────────


def _peer_actor_client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def _actor_doc_response(request: httpx.Request) -> httpx.Response:
    assert request.url.path == "/.well-known/theourgia/actor"
    keypair = generate_keypair()
    from theourgia.core.federation.keys import serialize_public_key

    return httpx.Response(
        200,
        json={
            "did": "did:theourgia:aurora.example",
            "public_key": serialize_public_key(keypair.public_key),
            "public_key_algorithm": "ed25519",
            "api_base": "https://aurora.example",
            "software": "theourgia",
        },
    )


async def test_add_peer_verifies_and_stores(fed_env) -> None:
    from theourgia.api.routers.v1.federation_peers import PeerCreate, add_peer

    db = _FakeSession([_Result(rows=[])])  # no duplicate
    user = SimpleNamespace(id=uuid4())
    async with _peer_actor_client(_actor_doc_response) as client:
        created = await add_peer(
            PeerCreate(base_url="https://aurora.example/", label="Hermetic"),
            user,
            db,
            client,
        )

    rows = [r for r in db.added if isinstance(r, FederationPeer)]
    assert len(rows) == 1
    assert rows[0].base_url == "https://aurora.example"  # normalized
    assert rows[0].instance_did == "did:theourgia:aurora.example"
    assert rows[0].status == "successful"
    assert rows[0].last_seen_at is not None
    # The capability token is issued at add time and returned ONCE.
    assert created.capability_token
    assert created.capability_token == rows[0].capability_token


async def test_add_peer_rejects_unreachable_peer(fed_env) -> None:
    from theourgia.api.routers.v1.federation_peers import PeerCreate, add_peer

    def _not_theourgia(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)

    db = _FakeSession([_Result(rows=[])])
    user = SimpleNamespace(id=uuid4())
    async with _peer_actor_client(_not_theourgia) as client:
        with pytest.raises(HTTPException) as exc:
            await add_peer(
                PeerCreate(base_url="https://not-a-peer.example"),
                user,
                db,
                client,
            )
    assert exc.value.status_code == 502
    assert not any(isinstance(r, FederationPeer) for r in db.added)


async def test_add_peer_rejects_plain_http(fed_env) -> None:
    from theourgia.api.routers.v1.federation_peers import PeerCreate, add_peer

    db = _FakeSession()
    user = SimpleNamespace(id=uuid4())
    with pytest.raises(HTTPException) as exc:
        await add_peer(
            PeerCreate(base_url="http://plaintext.example"), user, db, None,
        )
    assert exc.value.status_code == 400


async def test_add_peer_409_on_duplicate(fed_env) -> None:
    from theourgia.api.routers.v1.federation_peers import PeerCreate, add_peer

    existing = FederationPeer(
        base_url="https://aurora.example",
        instance_did="did:theourgia:aurora.example",
        added_at=datetime.now(tz=UTC),
    )
    db = _FakeSession([_Result(rows=[existing])])
    user = SimpleNamespace(id=uuid4())
    with pytest.raises(HTTPException) as exc:
        await add_peer(
            PeerCreate(base_url="https://aurora.example"), user, db, None,
        )
    assert exc.value.status_code == 409


async def test_list_and_remove_peer(fed_env) -> None:
    from theourgia.api.routers.v1.federation_peers import list_peers, remove_peer

    row = FederationPeer(
        base_url="https://aurora.example",
        instance_did="did:theourgia:aurora.example",
        added_at=datetime.now(tz=UTC),
        capability_token="secret-token",
    )
    user = SimpleNamespace(id=uuid4())

    db = _FakeSession([_Result(rows=[row])])
    listed = await list_peers(user, db)
    assert len(listed) == 1
    assert listed[0].base_url == "https://aurora.example"
    # The token never appears in list reads.
    assert "capability_token" not in listed[0].model_dump()

    db = _FakeSession([_Result(rows=[row])])
    response = await remove_peer(row.id, user, db)
    assert response.status_code == 204
    assert db.deleted == [row]


async def test_peers_endpoints_503_when_transport_disabled(monkeypatch) -> None:
    from theourgia.api.routers.v1.federation_peers import (
        PeerCreate,
        add_peer,
        list_peers,
        remove_peer,
    )
    from theourgia.core.config import reset_settings_cache

    monkeypatch.delenv("THEOURGIA_FEDERATION_TRANSPORT_ENABLED", raising=False)
    reset_settings_cache()
    try:
        user = SimpleNamespace(id=uuid4())
        with pytest.raises(HTTPException) as exc:
            await list_peers(user, _FakeSession())
        assert exc.value.status_code == 503
        with pytest.raises(HTTPException) as exc:
            await add_peer(
                PeerCreate(base_url="https://x.example"), user, _FakeSession(), None,
            )
        assert exc.value.status_code == 503
        with pytest.raises(HTTPException) as exc:
            await remove_peer(uuid4(), user, _FakeSession())
        assert exc.value.status_code == 503
    finally:
        reset_settings_cache()


# ── Capability tokens on the native inbox ───────────────────────────


def _instance_keypair_and_did():
    from theourgia.core.config import get_settings
    from theourgia.core.federation.identity import make_instance_id
    from theourgia.core.federation.keys import load_or_create_keypair

    settings = get_settings()
    keypair = load_or_create_keypair(
        private_path=settings.federation_private_key_path,
        public_path=settings.federation_public_key_path,
    )
    return keypair, make_instance_id(settings.instance_id)


def test_require_capability_verify_roundtrip(fed_env) -> None:
    from theourgia.api.routers.v1.federation_inbox import _require_capability
    from theourgia.core.federation.capability_tokens import issue_capability_token

    keypair, instance_did = _instance_keypair_and_did()
    token = issue_capability_token(
        private_key=keypair.private_key,
        issuer=instance_did,
        subject=PEER_DID,
        audience=instance_did,
        capabilities=["federation:inbox"],
    )
    # Valid token for the right sender: no raise.
    _require_capability(token, PEER_DID)

    # Missing token → 403 capability_required.
    with pytest.raises(HTTPException) as exc:
        _require_capability(None, PEER_DID)
    assert exc.value.status_code == 403
    assert "capability_required" in exc.value.detail

    # Right token, wrong sender → 403 capability_invalid.
    with pytest.raises(HTTPException) as exc:
        _require_capability(token, "did:theourgia:impostor.example")
    assert exc.value.status_code == 403
    assert "capability_invalid" in exc.value.detail

    # Token lacking the scope → 403 capability_invalid.
    scopeless = issue_capability_token(
        private_key=keypair.private_key,
        issuer=instance_did,
        subject=PEER_DID,
        audience=instance_did,
        capabilities=["pull:entry:something"],
    )
    with pytest.raises(HTTPException) as exc:
        _require_capability(scopeless, PEER_DID)
    assert exc.value.status_code == 403


async def test_native_inbox_hub_post_requires_capability(fed_env) -> None:
    from theourgia.api.app import create_app
    from theourgia.api.deps import get_db_session
    from theourgia.api.routers.v1.federation_inbox import get_peer_key_resolver
    from theourgia.core.federation.capability_tokens import issue_capability_token

    peer_keypair = generate_keypair()
    instance_keypair, instance_did = _instance_keypair_and_did()

    def _signed_headers() -> dict[str, str]:
        components = SignedRequestComponents(
            method="POST",
            path="/api/v1/federation/inbox",
            headers={"Host": "testserver"},
            components=DEFAULT_COMPONENTS,
        )
        return sign_request(
            private_key=peer_keypair.private_key,
            keyid=PEER_DID,
            components=components,
            created=int(time()),
        )

    body = json.dumps({"type": "hub.post", "payload": {}}).encode("utf-8")

    # 1. Signed but capability-less → 403.
    db = _FakeSession()
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db
    app.dependency_overrides[get_peer_key_resolver] = lambda: _StubResolver(
        PEER_DID, peer_keypair.public_key,
    )
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.post(
            "/api/v1/federation/inbox", content=body,
            headers=_signed_headers(),
        )
    assert response.status_code == 403
    assert "capability_required" in response.text
    # The refused operation left no activity row.
    assert not any(isinstance(r, FederationActivity) for r in db.added)

    # 2. Same request with the issued token → 202.
    token = issue_capability_token(
        private_key=instance_keypair.private_key,
        issuer=instance_did,
        subject=PEER_DID,
        audience=instance_did,
        capabilities=["federation:inbox"],
    )
    db = _FakeSession()
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db
    app.dependency_overrides[get_peer_key_resolver] = lambda: _StubResolver(
        PEER_DID, peer_keypair.public_key,
    )
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.post(
            "/api/v1/federation/inbox", content=body,
            headers={**_signed_headers(), "X-Theourgia-Capability": token},
        )
    assert response.status_code == 202, response.text
    assert any(isinstance(r, FederationActivity) for r in db.added)


async def test_native_inbox_follow_needs_no_capability(fed_env) -> None:
    """Follow-shaped and comment-shaped activities are exempt from the
    capability requirement (spec §6.4)."""
    from theourgia.api.app import create_app
    from theourgia.api.deps import get_db_session
    from theourgia.api.routers.v1.federation_inbox import get_peer_key_resolver

    peer_keypair = generate_keypair()
    body = json.dumps(
        {"type": "follow.request", "target_user_id": str(uuid4())},
    ).encode("utf-8")
    components = SignedRequestComponents(
        method="POST",
        path="/api/v1/federation/inbox",
        headers={"Host": "testserver"},
        components=DEFAULT_COMPONENTS,
    )
    headers = sign_request(
        private_key=peer_keypair.private_key,
        keyid=PEER_DID,
        components=components,
        created=int(time()),
    )

    db = _FakeSession()
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db
    app.dependency_overrides[get_peer_key_resolver] = lambda: _StubResolver(
        PEER_DID, peer_keypair.public_key,
    )
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.post(
            "/api/v1/federation/inbox", content=body, headers=headers,
        )
    assert response.status_code == 202, response.text


# ── v1-029: registered peers resolve keys via their stored base_url ──


def test_peer_key_resolver_prefers_registered_base_url():
    """A DID with a registered peer row fetches the actor document from
    the operator-trusted base_url (any scheme/port); unknown DIDs keep
    the strict https-by-DID path. Found by the twin-instance test —
    without this, signature verification between registered peers on
    nonstandard ports is impossible."""
    import asyncio

    import httpx

    from theourgia.core.federation.keys import (
        load_or_create_keypair,
        serialize_public_key,
    )
    from theourgia.core.federation.peer_keys import PeerKeyResolver

    seen_urls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_urls.append(str(request.url))
        did = (
            "did:theourgia:known.example"
            if "127.0.0.1:9999" in str(request.url)
            else "did:theourgia:unknown.example"
        )
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as td:
            keypair = load_or_create_keypair(
                private_path=Path(td) / "k",
                public_path=Path(td) / "k.pub",
            )
            return httpx.Response(
                200,
                json={
                    "did": did,
                    "public_key": serialize_public_key(
                        keypair.public_key
                    ),
                },
            )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    async def lookup(did: str) -> str | None:
        return (
            "http://127.0.0.1:9999"
            if did == "did:theourgia:known.example"
            else None
        )

    resolver = PeerKeyResolver(
        http_client=client, peer_base_url_lookup=lookup
    )

    async def run() -> None:
        await resolver.resolve("did:theourgia:known.example")
        await resolver.resolve("did:theourgia:unknown.example")

    asyncio.run(run())
    assert seen_urls[0] == (
        "http://127.0.0.1:9999/.well-known/theourgia/actor"
    )
    assert seen_urls[1] == (
        "https://unknown.example/.well-known/theourgia/actor"
    )


def test_deliver_refuses_http_unless_lab_flag(monkeypatch):
    """https-only stands by default; the LAB-ONLY flag admits http."""
    import asyncio

    from theourgia.core import config
    from theourgia.core.federation import outbound
    from theourgia.core.federation.keys import load_or_create_keypair

    monkeypatch.setenv("THEOURGIA_FEDERATION_TRANSPORT_ENABLED", "1")
    monkeypatch.delenv(
        "THEOURGIA_FEDERATION_ALLOW_INSECURE_HTTP", raising=False
    )
    config.get_settings.cache_clear()
    result = asyncio.run(
        outbound.deliver(
            url="http://127.0.0.1:1/inbox",
            body_json={},
            sender_keyid="did:theourgia:x",
            sender_private_key=None,  # scheme check precedes signing
        )
    )
    assert result.error == "non-HTTPS URL"

    monkeypatch.setenv("THEOURGIA_FEDERATION_ALLOW_INSECURE_HTTP", "1")
    config.get_settings.cache_clear()
    import tempfile
    from pathlib import Path

    with tempfile.TemporaryDirectory() as td:
        keypair = load_or_create_keypair(
            private_path=Path(td) / "k", public_path=Path(td) / "k.pub"
        )
        result = asyncio.run(
            outbound.deliver(
                url="http://127.0.0.1:1/inbox",
                body_json={},
                sender_keyid="did:theourgia:x",
                sender_private_key=keypair.private_key,
                timeout_seconds=0.2,
            )
        )
    # Scheme admitted; failure (if any) is the unreachable port, never
    # the scheme gate.
    assert result.error != "non-HTTPS URL"
    config.get_settings.cache_clear()
