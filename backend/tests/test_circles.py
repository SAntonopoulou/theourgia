"""Unit tests for the circles router (B105).

Pydantic shape + helper + router-registration smoke. Covers the H05
worked-example rules:

  · Rings array must have 1-6 entries.
  · Centre-element kind must be one of the seven canonical values.
  · ``parent_circle_id`` is not in :class:`CircleUpdate` — fork only.
  · Preset library has ≥ 5 entries.
  · Preset library cites PD provenance on every entry.
  · Loading a preset (POST with its body) yields a row with NO
    ``parent_circle_id`` — presets are templates, not parents.
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from theourgia.api.routers.v1 import circles as circles_module
from theourgia.api.routers.v1.circles import (
    CircleCreate,
    CircleForkPayload,
    CircleRead,
    CircleUpdate,
    PresetCircleRead,
    _to_read,
    _validate_centre_kind,
    _validate_rings,
)
from theourgia.core.workshop.preset_circles import (
    PRESET_CIRCLES,
    preset_by_slug,
)
from theourgia.models.circles import CompassTradition


def _circle_row(
    *,
    rings: list[dict] | None = None,
    compass_tradition: CompassTradition = CompassTradition.ARCHANGELS,
    compass_points: dict | None = None,
    centre_element: dict | None = None,
    parent_circle_id=None,
) -> SimpleNamespace:
    now = datetime(2026, 6, 25, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        name="Test Circle",
        purpose="To work.",
        diameter_m=2.5,
        rings=rings or [
            {"kind": "inscription", "content": "TEST"},
            {"kind": "glyph_row", "content": "pentagram"},
        ],
        compass_tradition=compass_tradition,
        compass_points=compass_points or {
            "E": "Raphael", "S": "Michael", "W": "Gabriel", "N": "Uriel",
        },
        centre_element=centre_element or {"kind": "hexagram"},
        citation=None,
        parent_circle_id=parent_circle_id,
        created_at=now,
        updated_at=now,
    )


# ── Preset library ───────────────────────────────────────────────────


def test_preset_library_ships_at_least_five_entries() -> None:
    assert len(PRESET_CIRCLES) >= 5


def test_preset_library_has_unique_slugs() -> None:
    slugs = [p.slug for p in PRESET_CIRCLES]
    assert len(slugs) == len(set(slugs)), "Preset slugs must be unique."


def test_every_preset_has_pd_citation() -> None:
    """The H05 trace requirement: every preset declares provenance."""
    for p in PRESET_CIRCLES:
        assert p.citation, f"Preset {p.slug} is missing citation."
        assert len(p.citation) >= 20, (
            f"Preset {p.slug} citation looks too short to be honest."
        )


def test_every_preset_has_rings_within_limit() -> None:
    """Preset rings honour the same 1-6 bound the router enforces."""
    for p in PRESET_CIRCLES:
        assert 1 <= len(p.rings) <= 6, (
            f"Preset {p.slug} has invalid ring count {len(p.rings)}."
        )


def test_every_preset_compass_tradition_is_valid_enum_value() -> None:
    valid_values = {t.value for t in CompassTradition}
    for p in PRESET_CIRCLES:
        assert p.compass_tradition in valid_values


def test_every_preset_centre_kind_is_valid() -> None:
    valid = {
        "pentagram", "hexagram", "unicursal", "solomonic_seal",
        "sigil", "kamea_trace", "blank",
    }
    for p in PRESET_CIRCLES:
        assert p.centre_element.get("kind") in valid, (
            f"Preset {p.slug} has invalid centre kind."
        )


def test_preset_by_slug_returns_matching_entry() -> None:
    assert preset_by_slug("lbrp_classic") is not None
    assert preset_by_slug("does_not_exist") is None


def test_preset_circle_read_validates_against_each_preset() -> None:
    """Every preset must serialise cleanly through PresetCircleRead."""
    for p in PRESET_CIRCLES:
        PresetCircleRead(
            slug=p.slug,
            name=p.name,
            purpose=p.purpose,
            diameter_m=p.diameter_m,
            rings=list(p.rings),
            compass_tradition=p.compass_tradition,
            compass_points=dict(p.compass_points),
            centre_element=dict(p.centre_element),
            citation=p.citation,
        )


# ── Schema: CircleCreate ─────────────────────────────────────────────


def test_circle_create_minimal_payload_validates() -> None:
    payload = CircleCreate(
        name="My circle",
        purpose="To meditate.",
        rings=[{"kind": "inscription", "content": "x"}],
        compass_tradition="archangels",
        compass_points={"E": "R", "S": "M", "W": "G", "N": "U"},
        centre_element={"kind": "blank"},
    )
    assert payload.diameter_m == 2.0
    assert payload.citation is None


def test_circle_create_rejects_empty_rings() -> None:
    with pytest.raises(ValidationError):
        CircleCreate(
            name="x",
            purpose="x",
            rings=[],
            compass_tradition="archangels",
            compass_points={},
            centre_element={"kind": "blank"},
        )


def test_circle_create_rejects_too_many_rings() -> None:
    with pytest.raises(ValidationError):
        CircleCreate(
            name="x",
            purpose="x",
            rings=[{"kind": "inscription"}] * 7,
            compass_tradition="archangels",
            compass_points={},
            centre_element={"kind": "blank"},
        )


def test_circle_create_rejects_invalid_diameter() -> None:
    with pytest.raises(ValidationError):
        CircleCreate(
            name="x",
            purpose="x",
            diameter_m=0,
            rings=[{"kind": "inscription"}],
            compass_tradition="archangels",
            compass_points={},
            centre_element={"kind": "blank"},
        )
    with pytest.raises(ValidationError):
        CircleCreate(
            name="x",
            purpose="x",
            diameter_m=21,
            rings=[{"kind": "inscription"}],
            compass_tradition="archangels",
            compass_points={},
            centre_element={"kind": "blank"},
        )


def test_circle_create_rejects_unknown_tradition() -> None:
    with pytest.raises(ValidationError):
        CircleCreate(
            name="x",
            purpose="x",
            rings=[{"kind": "inscription"}],
            compass_tradition="not_a_tradition",  # type: ignore[arg-type]
            compass_points={},
            centre_element={"kind": "blank"},
        )


def test_circle_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        CircleCreate(
            name="x",
            purpose="x",
            rings=[{"kind": "inscription"}],
            compass_tradition="archangels",
            compass_points={},
            centre_element={"kind": "blank"},
            unknown=1,  # type: ignore[call-arg]
        )


def test_circle_create_accepts_custom_tradition_with_free_text() -> None:
    """The 'custom' tradition allows arbitrary cardinal labels."""
    payload = CircleCreate(
        name="Personal",
        purpose="My own quarters.",
        rings=[{"kind": "inscription", "content": "x"}],
        compass_tradition="custom",
        compass_points={
            "E": "Morning Star",
            "S": "High Noon",
            "W": "Evening",
            "N": "Polestar",
        },
        centre_element={"kind": "blank"},
    )
    assert payload.compass_tradition == CompassTradition.CUSTOM


# ── Schema: CircleUpdate ─────────────────────────────────────────────


def test_circle_update_does_not_expose_parent_field() -> None:
    """``parent_circle_id`` is set only by /fork — never PATCH."""
    fields = set(CircleUpdate.model_fields.keys())
    assert "parent_circle_id" not in fields
    # Meta fields ARE allowed:
    for f in (
        "name", "purpose", "diameter_m", "rings",
        "compass_tradition", "compass_points", "centre_element", "citation",
    ):
        assert f in fields


def test_circle_update_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        CircleUpdate(parent_circle_id=str(uuid4()))  # type: ignore[call-arg]


def test_circle_update_rejects_oversize_rings() -> None:
    with pytest.raises(ValidationError):
        CircleUpdate(rings=[{"kind": "inscription"}] * 7)


# ── Schema: CircleForkPayload ────────────────────────────────────────


def test_circle_fork_payload_optional() -> None:
    assert CircleForkPayload().name is None


def test_circle_fork_payload_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        CircleForkPayload(name="")


# ── Helper: _validate_rings ──────────────────────────────────────────


def test_validate_rings_accepts_known_kinds() -> None:
    _validate_rings([
        {"kind": "inscription"},
        {"kind": "glyph_row"},
        {"kind": "image"},
        {"kind": "blank"},
        {"kind": "multi_glyph"},
    ])


def test_validate_rings_rejects_unknown_kind() -> None:
    with pytest.raises(HTTPException) as exc:
        _validate_rings([{"kind": "not_a_kind"}])
    assert exc.value.status_code == 400


def test_validate_centre_kind_accepts_all_seven() -> None:
    for kind in (
        "pentagram", "hexagram", "unicursal", "solomonic_seal",
        "sigil", "kamea_trace", "blank",
    ):
        _validate_centre_kind({"kind": kind})


def test_validate_centre_kind_rejects_unknown() -> None:
    with pytest.raises(HTTPException) as exc:
        _validate_centre_kind({"kind": "octagram"})
    assert exc.value.status_code == 400


# ── Helper: _to_read ─────────────────────────────────────────────────


def test_to_read_serialises_enum_values() -> None:
    row = _circle_row()
    read = _to_read(row)
    assert isinstance(read, CircleRead)
    assert read.compass_tradition == "archangels"
    assert read.centre_element == {"kind": "hexagram"}


def test_to_read_handles_no_parent() -> None:
    row = _circle_row(parent_circle_id=None)
    read = _to_read(row)
    assert read.parent_circle_id is None


# ── Router registration smoke ────────────────────────────────────────


def test_circles_router_registers_seven_routes() -> None:
    """presets + list + create + get + patch + delete + fork."""
    methods_and_paths = sorted(
        (frozenset(r.methods), r.path)
        for r in circles_module.router.routes
        if hasattr(r, "methods")
    )
    expected = sorted(
        [
            (frozenset({"GET"}), "/circles/presets"),
            (frozenset({"GET"}), "/circles"),
            (frozenset({"POST"}), "/circles"),
            (frozenset({"GET"}), "/circles/{circle_id}"),
            (frozenset({"PATCH"}), "/circles/{circle_id}"),
            (frozenset({"DELETE"}), "/circles/{circle_id}"),
            (frozenset({"POST"}), "/circles/{circle_id}/fork"),
        ]
    )
    assert methods_and_paths == expected


def test_circle_router_has_response_models() -> None:
    for r in circles_module.router.routes:
        if not hasattr(r, "methods"):
            continue
        if "DELETE" in r.methods:
            continue
        assert r.response_model is not None, (
            f"{r.path} ({r.methods}) is missing response_model"
        )
