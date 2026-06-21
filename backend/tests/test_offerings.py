"""Offerings ledger tests."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from theourgia.models.offerings import (
    Offering,
    OfferingReception,
    RecurringOffering,
)


# ───── Offering ────────────────────────────────────────────────────────


def test_offering_construct_minimal() -> None:
    """entity_id + offered_at are the only required fields."""
    o = Offering(
        entity_id=uuid4(),
        offered_at=datetime(2026, 6, 21, 18, tzinfo=UTC),
    )
    assert o.items == []
    assert o.reception_perceived is None
    assert o.location is None


def test_offering_carries_structured_items() -> None:
    o = Offering(
        entity_id=uuid4(),
        offered_at=datetime(2026, 6, 21, 18, tzinfo=UTC),
        items=[
            {"kind": "wine", "quantity": 1, "unit": "cup", "notes": "Red, unmixed."},
            {"kind": "honey", "quantity": 1, "unit": "tablespoon"},
            {"kind": "incense", "notes": "Myrrh, hand-rolled."},
        ],
        intention="Offering to Hekate at the dark of the moon.",
        reception_perceived=OfferingReception.CLEAR,
    )
    assert len(o.items) == 3
    assert o.items[0]["kind"] == "wine"
    assert o.reception_perceived == OfferingReception.CLEAR


def test_offering_reception_enum_values() -> None:
    assert {r.value for r in OfferingReception} == {
        "none", "faint", "clear", "strong", "overwhelming",
    }


def test_offering_auto_stamps_are_optional() -> None:
    """astro_snapshot / calendar_snapshot are nullable — the
    auto-stamping is opt-in and degrades when the Phase 03 engine
    isn't reachable.
    """
    o = Offering(
        entity_id=uuid4(),
        offered_at=datetime(2026, 6, 21, 18, tzinfo=UTC),
    )
    assert o.astro_snapshot is None
    assert o.calendar_snapshot is None


def test_offering_links_to_optional_working_entry() -> None:
    """Some offerings stand alone; others are embedded in a working."""
    working_id = uuid4()
    o = Offering(
        entity_id=uuid4(),
        offered_at=datetime(2026, 6, 21, 18, tzinfo=UTC),
        working_id=working_id,
    )
    assert o.working_id == working_id


# ───── RecurringOffering ───────────────────────────────────────────────


def test_recurring_offering_carries_cadence_string() -> None:
    """Cadence is a free-form string with vocabulary documented in the
    module docstring. The scheduler parses it.
    """
    r = RecurringOffering(
        entity_id=uuid4(),
        label="Hekate Deipnon",
        cadence="lunar:deipnon",
        items_template=[
            {"kind": "wine", "quantity": 1, "unit": "cup"},
            {"kind": "honey"},
            {"kind": "incense", "notes": "Myrrh + dittany"},
        ],
    )
    assert r.cadence == "lunar:deipnon"
    assert r.is_active is True
    assert len(r.items_template) == 3


def test_recurring_offering_cron_cadence() -> None:
    """Power-user cron cadence is supported."""
    r = RecurringOffering(
        entity_id=uuid4(),
        label="Daily candle",
        cadence="cron:0 6 * * *",
    )
    assert r.cadence.startswith("cron:")


def test_recurring_offering_pause() -> None:
    """is_active = False pauses without deleting the schedule."""
    r = RecurringOffering(
        entity_id=uuid4(),
        label="x",
        cadence="weekly",
        is_active=False,
    )
    assert r.is_active is False


def test_recurring_offering_documented_cadence_vocabulary() -> None:
    """Lock the vocabulary documented in the module docstring."""
    accepted_prefixes = {
        "daily", "weekly", "monthly",
        "lunar:deipnon", "lunar:noumenia",
        "festival:samhain", "festival:beltane",
        "cron:",
    }
    # Just type-checking the strings — the scheduler does the parsing.
    for prefix in accepted_prefixes:
        r = RecurringOffering(entity_id=uuid4(), label="x", cadence=prefix)
        assert r.cadence == prefix
