"""Tests for the event-type registry."""

from __future__ import annotations

import pytest

from theourgia.core.events.registry import (
    EventType,
    EventTypeRegistry,
    register_event_type,
)


def test_registry_register_and_get() -> None:
    r = EventTypeRegistry()
    e = EventType(name="entry.created", description="An entry was created.")
    r.register(e)
    assert r.get("entry.created") is e
    assert r.has("entry.created")


def test_registry_get_missing_raises() -> None:
    r = EventTypeRegistry()
    with pytest.raises(KeyError, match="not registered"):
        r.get("nope")


def test_registry_duplicate_registration_rejected() -> None:
    r = EventTypeRegistry()
    r.register(EventType(name="entry.created"))
    with pytest.raises(ValueError, match="already registered"):
        r.register(EventType(name="entry.created"))


def test_registry_overwrite_flag_allows_replacement() -> None:
    r = EventTypeRegistry()
    r.register(EventType(name="entry.created", description="old"))
    r.register(EventType(name="entry.created", description="new"), overwrite=True)
    assert r.get("entry.created").description == "new"


def test_registry_all_returns_snapshot() -> None:
    r = EventTypeRegistry()
    r.register(EventType(name="a.b"))
    r.register(EventType(name="c.d"))
    names = sorted(t.name for t in r.all())
    assert names == ["a.b", "c.d"]


def test_registry_by_owner_groups_correctly() -> None:
    r = EventTypeRegistry()
    r.register(EventType(name="entry.created", owner="entries"))
    r.register(EventType(name="entry.updated", owner="entries"))
    r.register(EventType(name="auth.signed_in", owner="auth"))
    entries = sorted(t.name for t in r.by_owner("entries"))
    auth = sorted(t.name for t in r.by_owner("auth"))
    assert entries == ["entry.created", "entry.updated"]
    assert auth == ["auth.signed_in"]


def test_registry_clear() -> None:
    r = EventTypeRegistry()
    r.register(EventType(name="a.b"))
    r.clear()
    assert not r.has("a.b")


def test_register_event_type_helper_returns_event_type() -> None:
    r = EventTypeRegistry()
    et = register_event_type(
        "test.event",
        description="A test event",
        payload_keys=("x", "y"),
        owner="test",
        registry=r,
    )
    assert et.name == "test.event"
    assert et.description == "A test event"
    assert et.payload_keys == ("x", "y")
    assert et.owner == "test"
    assert r.has("test.event")


def test_event_type_is_frozen() -> None:
    et = EventType(name="entry.created")
    with pytest.raises(Exception):  # FrozenInstanceError
        et.name = "other"  # type: ignore[misc]
