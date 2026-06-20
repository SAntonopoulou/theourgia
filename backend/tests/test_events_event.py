"""Tests for the DomainEvent value type."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from theourgia.core.events.event import DomainEvent


def test_domain_event_minimal() -> None:
    e = DomainEvent(type="entry.created")
    assert e.type == "entry.created"
    assert e.payload == {}
    assert isinstance(e.id, UUID)
    assert isinstance(e.occurred_at, datetime)
    assert e.actor_id is None
    assert e.request_id is None


def test_domain_event_with_payload_and_actor() -> None:
    actor = uuid4()
    e = DomainEvent(
        type="entry.created",
        payload={"entry_id": "x", "vault_id": "y"},
        actor_id=actor,
        request_id="req-123",
    )
    assert e.payload["entry_id"] == "x"
    assert e.actor_id == actor
    assert e.request_id == "req-123"


def test_domain_event_rejects_empty_type() -> None:
    with pytest.raises(ValueError, match="type"):
        DomainEvent(type="")


def test_domain_event_rejects_non_dotted_type() -> None:
    with pytest.raises(ValueError, match="dotted"):
        DomainEvent(type="undotted")


def test_domain_event_is_frozen() -> None:
    e = DomainEvent(type="entry.created")
    with pytest.raises(Exception):  # FrozenInstanceError
        e.type = "other.event"  # type: ignore[misc]


def test_to_dict_round_trip() -> None:
    actor = uuid4()
    original = DomainEvent(
        type="entry.created",
        payload={"k": "v"},
        actor_id=actor,
        request_id="req-xyz",
        metadata={"vault_id": "abc"},
    )
    restored = DomainEvent.from_dict(original.to_dict())
    assert restored.type == original.type
    assert restored.payload == original.payload
    assert restored.id == original.id
    assert restored.actor_id == original.actor_id
    assert restored.request_id == original.request_id
    assert restored.metadata == original.metadata
    # Timestamps round-trip (microsecond precision)
    assert restored.occurred_at == original.occurred_at


def test_to_dict_emits_actor_id_as_string() -> None:
    actor = uuid4()
    e = DomainEvent(type="entry.created", actor_id=actor)
    d = e.to_dict()
    assert d["actor_id"] == str(actor)


def test_to_dict_emits_none_actor_as_null() -> None:
    e = DomainEvent(type="entry.created")
    d = e.to_dict()
    assert d["actor_id"] is None


def test_from_dict_accepts_z_suffix_timestamp() -> None:
    """Some serializers emit "Z" instead of "+00:00" — accept both."""
    data = {
        "type": "entry.created",
        "payload": {},
        "id": str(uuid4()),
        "occurred_at": "2026-06-20T12:00:00Z",
        "actor_id": None,
        "request_id": None,
        "metadata": {},
    }
    e = DomainEvent.from_dict(data)
    assert e.occurred_at == datetime(2026, 6, 20, 12, 0, 0, tzinfo=UTC)
