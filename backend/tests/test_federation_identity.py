"""Tests for federation identifiers (DIDs)."""

from __future__ import annotations

import pytest

from theourgia.core.federation.identity import (
    ActorKind,
    InvalidDIDError,
    make_actor_id,
    make_instance_id,
    parse_actor_id,
)


def test_make_instance_id() -> None:
    assert make_instance_id("theourgia.com") == "did:theourgia:theourgia.com"


def test_make_instance_id_with_port() -> None:
    assert make_instance_id("localhost:8000") == "did:theourgia:localhost:8000"


def test_make_instance_id_lowercases_host() -> None:
    assert make_instance_id("Theourgia.COM") == "did:theourgia:theourgia.com"


@pytest.mark.parametrize("bad", ["", "not a host", "host.com/path", "Theourgia.com:abc"])
def test_make_instance_id_rejects_invalid(bad: str) -> None:
    with pytest.raises(InvalidDIDError):
        make_instance_id(bad)


def test_make_actor_id_vault() -> None:
    did = make_actor_id("theourgia.com", ActorKind.VAULT, "soror-eu-a")
    assert did == "did:theourgia:theourgia.com:vault:soror-eu-a"


def test_make_actor_id_hub() -> None:
    did = make_actor_id("lodge.example.org", ActorKind.HUB, "local-body-93")
    assert did == "did:theourgia:lodge.example.org:hub:local-body-93"


def test_make_actor_id_rejects_instance_kind() -> None:
    with pytest.raises(InvalidDIDError, match="use make_instance_id"):
        make_actor_id("theourgia.com", ActorKind.INSTANCE, "anything")


@pytest.mark.parametrize(
    "bad_slug", ["", "-leading-hyphen", "trailing-hyphen-", "Has Spaces", "UPPER"]
)
def test_make_actor_id_rejects_bad_slug(bad_slug: str) -> None:
    with pytest.raises(InvalidDIDError):
        make_actor_id("theourgia.com", ActorKind.VAULT, bad_slug)


def test_parse_actor_id_instance() -> None:
    host, kind, slug = parse_actor_id("did:theourgia:theourgia.com")
    assert host == "theourgia.com"
    assert kind == ActorKind.INSTANCE
    assert slug is None


def test_parse_actor_id_vault() -> None:
    host, kind, slug = parse_actor_id("did:theourgia:theourgia.com:vault:soror-eu-a")
    assert host == "theourgia.com"
    assert kind == ActorKind.VAULT
    assert slug == "soror-eu-a"


def test_parse_actor_id_hub() -> None:
    host, kind, slug = parse_actor_id("did:theourgia:lodge.example.org:hub:body-93")
    assert host == "lodge.example.org"
    assert kind == ActorKind.HUB
    assert slug == "body-93"


@pytest.mark.parametrize(
    "bad",
    [
        "",
        "did:other:theourgia.com",
        "did:theourgia",
        "did:theourgia:theourgia.com:unknown:slug",
        "did:theourgia:theourgia.com:vault:",
        "did:theourgia:bad host:vault:x",
    ],
)
def test_parse_actor_id_rejects_invalid(bad: str) -> None:
    with pytest.raises(InvalidDIDError):
        parse_actor_id(bad)


def test_round_trip_instance() -> None:
    did = make_instance_id("theourgia.com")
    host, kind, slug = parse_actor_id(did)
    assert kind == ActorKind.INSTANCE
    assert host == "theourgia.com"
    assert slug is None


def test_round_trip_actor() -> None:
    did = make_actor_id("theourgia.com", ActorKind.HUB, "test-hub")
    host, kind, slug = parse_actor_id(did)
    assert host == "theourgia.com"
    assert kind == ActorKind.HUB
    assert slug == "test-hub"
