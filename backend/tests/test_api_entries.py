"""Unit tests for the entries router.

Pydantic shape + router-registration smoke. Full HTTP integration is
exercised by the deploy round-trip (``curl https://dev.theourgia.com/api/v1/entries``).
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.entries import EntryCreate, EntryRead


def test_entry_create_minimal_payload_validates() -> None:
    payload = EntryCreate(title="A note")
    assert payload.title == "A note"
    assert payload.type == "observation"
    assert payload.excerpt == ""
    assert payload.glyph == "feather"
    assert payload.body is None


def test_entry_create_full_payload() -> None:
    payload = EntryCreate(
        title="Geomancy reading",
        type="divination",
        excerpt="Acquisitio → Populus",
        glyph="divination",
        body="Full reading body here…",
    )
    assert payload.type == "divination"
    assert payload.body == "Full reading body here…"


def test_entry_create_rejects_unknown_type() -> None:
    with pytest.raises(ValidationError):
        EntryCreate(title="x", type="something_else")  # type: ignore[arg-type]


def test_entry_create_rejects_empty_title() -> None:
    with pytest.raises(ValidationError):
        EntryCreate(title="")


def test_entry_create_rejects_title_over_limit() -> None:
    with pytest.raises(ValidationError):
        EntryCreate(title="x" * 257)


def test_entry_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        EntryCreate(title="x", unknown_field="ignored")  # type: ignore[call-arg]


def test_entry_read_round_trip() -> None:
    from datetime import UTC, datetime
    from uuid import uuid4

    when = datetime(2026, 6, 21, 12, 0, 0, tzinfo=UTC)
    read = EntryRead(
        id=str(uuid4()),
        title="x",
        type="ritual",
        excerpt="",
        glyph="ritual",
        created_at=when,
        updated_at=when,
    )
    payload = read.model_dump()
    assert payload["type"] == "ritual"
    assert payload["created_at"] == when


def test_router_is_registered_on_v1() -> None:
    """Smoke: the entries router attaches under /api/v1."""
    from theourgia.api.app import create_app

    app = create_app()
    schema = app.openapi()
    paths = set(schema["paths"].keys())
    assert "/api/v1/entries" in paths
    assert "/api/v1/entries/{entry_id}" in paths
