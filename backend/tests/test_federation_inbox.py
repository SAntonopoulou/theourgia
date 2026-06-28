"""Phase 12.5 federation inbox route — schema + helper tests.

End-to-end signature verification + DB persistence runs at deploy time
against a live test DB. These tests cover the helpers + router
registration (project convention)."""

from __future__ import annotations

import pytest

from theourgia.api.routers.v1.federation_inbox import (
    _build_replay_nonce_key,
    _classify_kind,
    _extract_keyid,
)
from theourgia.models.federation_activity import (
    FederationActivityKind,
    FederationActivityStatus,
)


def test_extract_keyid_returns_quoted_value() -> None:
    sig = 'sig=(); created=1782638640; keyid="did:theourgia:peer.example.com"; alg="ed25519"'
    assert _extract_keyid(sig) == "did:theourgia:peer.example.com"


def test_extract_keyid_returns_none_when_missing() -> None:
    assert _extract_keyid(None) is None
    assert _extract_keyid("sig=(); created=1") is None


def test_classify_kind_known_value() -> None:
    body = {"type": "hub.invite"}
    assert _classify_kind(body) is FederationActivityKind.HUB_INVITE


def test_classify_kind_unknown_returns_unknown() -> None:
    assert _classify_kind({"type": "bogus.thing"}) is FederationActivityKind.UNKNOWN


def test_classify_kind_missing_type_returns_unknown() -> None:
    assert _classify_kind({}) is FederationActivityKind.UNKNOWN
    assert _classify_kind({"type": 123}) is FederationActivityKind.UNKNOWN


def test_classify_kind_handles_all_known_kinds() -> None:
    for kind in FederationActivityKind:
        if kind is FederationActivityKind.UNKNOWN:
            continue
        body = {"type": kind.value}
        assert _classify_kind(body) is kind


def test_build_replay_nonce_key_uses_keyid_and_created() -> None:
    sig = 'sig=(); created=1782638640; keyid="did:theourgia:peer.example.com"; alg="ed25519"'
    key = _build_replay_nonce_key(sig, b'{"type":"note.create"}')
    assert key == "did:theourgia:peer.example.com:1782638640"


def test_build_replay_nonce_key_falls_back_to_body_hash() -> None:
    """If `created` is missing, the key includes a stable body hash so
    we still refuse exact replays of buggy-sender envelopes."""
    sig = 'sig=(); keyid="did:theourgia:peer.example.com"; alg="ed25519"'
    body = b'{"type":"hub.post"}'
    key = _build_replay_nonce_key(sig, body)
    assert key.startswith("did:theourgia:peer.example.com:body:")
    # Same body → same key (deterministic).
    assert key == _build_replay_nonce_key(sig, body)


def test_federation_activity_status_enum_values() -> None:
    """Wire stability — these strings are persisted in the DB column."""
    expected = {"pending", "processed", "errored", "skipped"}
    assert {s.value for s in FederationActivityStatus} == expected


def test_federation_activity_kind_enum_includes_all_phase_12_kinds() -> None:
    """Phase 12 federation defines 16 activity types + UNKNOWN catchall."""
    values = {k.value for k in FederationActivityKind}
    for required in (
        "hub.invite",
        "hub.accept",
        "hub.decline",
        "hub.leave",
        "hub.post",
        "hub.update",
        "hub.delete",
        "follow.request",
        "follow.accept",
        "follow.decline",
        "follow.undo",
        "note.create",
        "note.update",
        "note.delete",
        "lineage.attest",
        "lineage.countersign",
        "unknown",
    ):
        assert required in values, f"missing kind: {required}"


def test_router_is_registered_under_v1() -> None:
    """Smoke: /api/v1/federation/inbox attaches to the FastAPI app."""
    from theourgia.api.app import create_app

    app = create_app()
    paths = list(app.openapi()["paths"].keys())
    assert "/api/v1/federation/inbox" in paths
