"""Unit tests for the tools router (B106).

Pydantic shape + helper + router-registration smoke. Covers the H05
worked-example honesty rules:

  · ``consecration_date`` and ``consecration_working_entry_id`` are
    not in :class:`ToolUpdate` — set only by /consecrate sub-resource.
  · /consecrate requires a real working entry.
  · /consecrate refuses to overwrite an existing consecration —
    must /unconsecrate first to keep the audit trail honest.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1 import tools as tools_module
from theourgia.api.routers.v1.tools import (
    ToolConsecratePayload,
    ToolCreate,
    ToolPhotoPayload,
    ToolRead,
    ToolUpdate,
    _to_read,
)
from theourgia.models.tools import ToolKind


def _tool_row(
    *,
    kind: ToolKind = ToolKind.WAND,
    consecration_working_entry_id=None,
    consecration_date: date | None = None,
    photo_upload_ids: list[str] | None = None,
) -> SimpleNamespace:
    now = datetime(2026, 6, 25, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        name="Hazel wand",
        kind=kind,
        description="Cut at midsummer.",
        materials=["hazel"],
        dimensions={"length_cm": 40},
        photo_upload_ids=photo_upload_ids or [],
        provenance="Cut from the hedge behind the cottage.",
        acquisition_date=date(2026, 6, 21),
        consecration_date=consecration_date,
        consecration_working_entry_id=consecration_working_entry_id,
        current_location="On the altar.",
        created_at=now,
        updated_at=now,
    )


# ── Schema: ToolCreate ───────────────────────────────────────────────


def test_tool_create_minimal_payload_validates() -> None:
    payload = ToolCreate(name="Athame", kind="athame")
    assert payload.kind == ToolKind.ATHAME
    assert payload.materials == []


def test_tool_create_rejects_invalid_kind() -> None:
    with pytest.raises(ValidationError):
        ToolCreate(name="x", kind="not_a_tool")  # type: ignore[arg-type]


def test_tool_create_accepts_all_fourteen_kinds() -> None:
    for kind in ToolKind:
        payload = ToolCreate(name="x", kind=kind.value)  # type: ignore[arg-type]
        assert payload.kind == kind


def test_tool_create_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        ToolCreate(name="", kind="wand")


def test_tool_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        ToolCreate(
            name="x", kind="wand", consecration_date=date(2026, 1, 1),  # type: ignore[call-arg]
        )


# ── Schema: ToolUpdate ───────────────────────────────────────────────


def test_tool_update_omits_consecration_fields() -> None:
    """The H05 honesty rule: consecration is sub-resource only."""
    fields = set(ToolUpdate.model_fields.keys())
    assert "consecration_date" not in fields
    assert "consecration_working_entry_id" not in fields
    # Meta fields ARE allowed:
    for f in (
        "name", "kind", "description", "materials",
        "dimensions", "provenance", "acquisition_date", "current_location",
    ):
        assert f in fields


def test_tool_update_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        ToolUpdate(consecration_date=date(2026, 1, 1))  # type: ignore[call-arg]


# ── Schema: ToolConsecratePayload ────────────────────────────────────


def test_tool_consecrate_payload_validates() -> None:
    payload = ToolConsecratePayload(
        consecration_working_entry_id=uuid4(),
        consecration_date=date(2026, 6, 21),
    )
    assert payload.consecration_date.year == 2026


def test_tool_consecrate_payload_requires_both_fields() -> None:
    with pytest.raises(ValidationError):
        ToolConsecratePayload(  # type: ignore[call-arg]
            consecration_working_entry_id=uuid4(),
        )
    with pytest.raises(ValidationError):
        ToolConsecratePayload(  # type: ignore[call-arg]
            consecration_date=date(2026, 6, 21),
        )


def test_tool_consecrate_payload_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        ToolConsecratePayload(
            consecration_working_entry_id=uuid4(),
            consecration_date=date(2026, 6, 21),
            unknown=1,  # type: ignore[call-arg]
        )


# ── Schema: ToolPhotoPayload ─────────────────────────────────────────


def test_tool_photo_payload_validates() -> None:
    upload = uuid4()
    payload = ToolPhotoPayload(upload_id=upload)
    assert payload.upload_id == upload


def test_tool_photo_payload_rejects_non_uuid() -> None:
    with pytest.raises(ValidationError):
        ToolPhotoPayload(upload_id="not-a-uuid")  # type: ignore[arg-type]


# ── Helper: _to_read ─────────────────────────────────────────────────


def test_to_read_marks_consecrated_when_linked() -> None:
    row = _tool_row(
        consecration_working_entry_id=uuid4(),
        consecration_date=date(2026, 6, 21),
    )
    read = _to_read(row)
    assert isinstance(read, ToolRead)
    assert read.is_consecrated is True
    assert read.consecration_date == date(2026, 6, 21)


def test_to_read_marks_unconsecrated_when_unlinked() -> None:
    row = _tool_row(consecration_working_entry_id=None)
    read = _to_read(row)
    assert read.is_consecrated is False
    assert read.consecration_working_entry_id is None
    assert read.consecration_date is None


def test_to_read_serialises_photo_ids_as_strings() -> None:
    photo = uuid4()
    row = _tool_row(photo_upload_ids=[str(photo)])
    read = _to_read(row)
    assert read.photo_upload_ids == [str(photo)]


def test_to_read_serialises_enum_value() -> None:
    row = _tool_row(kind=ToolKind.CHALICE)
    read = _to_read(row)
    assert read.kind == "chalice"


# ── Router registration smoke ────────────────────────────────────────


def test_tool_router_registers_nine_routes() -> None:
    """list + create + get + patch + delete + consecrate + unconsecrate
    + photo-add + photo-remove = 9 routes."""
    methods_and_paths = sorted(
        (frozenset(r.methods), r.path)
        for r in tools_module.router.routes
        if hasattr(r, "methods")
    )
    expected = sorted(
        [
            (frozenset({"GET"}), "/tools"),
            (frozenset({"POST"}), "/tools"),
            (frozenset({"GET"}), "/tools/{tool_id}"),
            (frozenset({"PATCH"}), "/tools/{tool_id}"),
            (frozenset({"DELETE"}), "/tools/{tool_id}"),
            (frozenset({"POST"}), "/tools/{tool_id}/consecrate"),
            (frozenset({"POST"}), "/tools/{tool_id}/unconsecrate"),
            (frozenset({"POST"}), "/tools/{tool_id}/photos"),
            (frozenset({"DELETE"}), "/tools/{tool_id}/photos/{upload_id}"),
        ]
    )
    assert methods_and_paths == expected


def test_tool_router_response_models() -> None:
    for r in tools_module.router.routes:
        if not hasattr(r, "methods"):
            continue
        if "DELETE" in r.methods:
            continue
        assert r.response_model is not None, (
            f"{r.path} ({r.methods}) is missing response_model"
        )
