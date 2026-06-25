"""Unit tests for the altars router (B106).

Pydantic shape + helper + router-registration smoke.
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1 import altars as altars_module
from theourgia.api.routers.v1.altars import (
    AltarCreate,
    AltarPhotoPayload,
    AltarRead,
    AltarUpdate,
    _to_read,
)


def _altar_row(
    *,
    tool_ids: list[str] | None = None,
    linked_working_entry_ids: list[str] | None = None,
    is_permanent: bool = False,
) -> SimpleNamespace:
    now = datetime(2026, 6, 25, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        name="Hearth altar",
        description="Permanent altar by the south window.",
        tool_ids=tool_ids or [],
        arrangement_diagram_svg=None,
        photo_upload_ids=[],
        is_permanent=is_permanent,
        linked_working_entry_ids=linked_working_entry_ids or [],
        created_at=now,
        updated_at=now,
    )


# ── Schema: AltarCreate ──────────────────────────────────────────────


def test_altar_create_minimal_payload_validates() -> None:
    payload = AltarCreate(name="Saturday altar")
    assert payload.is_permanent is False
    assert payload.tool_ids == []


def test_altar_create_full_payload_validates() -> None:
    tool_a, tool_b = uuid4(), uuid4()
    payload = AltarCreate(
        name="Working altar",
        description="For tonight's evocation.",
        tool_ids=[tool_a, tool_b],
        arrangement_diagram_svg="<svg/>",
        is_permanent=True,
        linked_working_entry_ids=[uuid4()],
    )
    assert payload.is_permanent is True
    assert len(payload.tool_ids) == 2


def test_altar_create_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        AltarCreate(name="")


def test_altar_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        AltarCreate(name="x", unknown=1)  # type: ignore[call-arg]


def test_altar_create_rejects_non_uuid_tool_ids() -> None:
    with pytest.raises(ValidationError):
        AltarCreate(name="x", tool_ids=["not-a-uuid"])  # type: ignore[list-item]


# ── Schema: AltarUpdate ──────────────────────────────────────────────


def test_altar_update_is_fully_optional() -> None:
    payload = AltarUpdate()
    assert all(v is None for v in payload.model_dump().values())


def test_altar_update_can_change_each_field() -> None:
    payload = AltarUpdate(
        name="New name",
        description="New description.",
        tool_ids=[uuid4()],
        arrangement_diagram_svg="<svg>different</svg>",
        is_permanent=True,
        linked_working_entry_ids=[uuid4()],
    )
    assert payload.name == "New name"
    assert payload.is_permanent is True


def test_altar_update_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        AltarUpdate(owner_id=uuid4())  # type: ignore[call-arg]


# ── Schema: AltarPhotoPayload ────────────────────────────────────────


def test_altar_photo_payload_validates() -> None:
    upload = uuid4()
    payload = AltarPhotoPayload(upload_id=upload)
    assert payload.upload_id == upload


def test_altar_photo_payload_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        AltarPhotoPayload(upload_id=uuid4(), foo="bar")  # type: ignore[call-arg]


# ── Helper: _to_read ─────────────────────────────────────────────────


def test_to_read_serialises_uuid_lists_as_strings() -> None:
    tool_a, tool_b = uuid4(), uuid4()
    entry_a = uuid4()
    row = _altar_row(
        tool_ids=[str(tool_a), str(tool_b)],
        linked_working_entry_ids=[str(entry_a)],
    )
    read = _to_read(row)
    assert isinstance(read, AltarRead)
    assert read.tool_ids == [str(tool_a), str(tool_b)]
    assert read.linked_working_entry_ids == [str(entry_a)]


def test_to_read_reflects_permanent_flag() -> None:
    row = _altar_row(is_permanent=True)
    read = _to_read(row)
    assert read.is_permanent is True


# ── Router registration smoke ────────────────────────────────────────


def test_altar_router_registers_six_routes() -> None:
    """list + create + get + patch + delete + photo-add = 6 routes."""
    methods_and_paths = sorted(
        (frozenset(r.methods), r.path)
        for r in altars_module.router.routes
        if hasattr(r, "methods")
    )
    expected = sorted(
        [
            (frozenset({"GET"}), "/altars"),
            (frozenset({"POST"}), "/altars"),
            (frozenset({"GET"}), "/altars/{altar_id}"),
            (frozenset({"PATCH"}), "/altars/{altar_id}"),
            (frozenset({"DELETE"}), "/altars/{altar_id}"),
            (frozenset({"POST"}), "/altars/{altar_id}/photos"),
        ]
    )
    assert methods_and_paths == expected


def test_altar_router_response_models() -> None:
    for r in altars_module.router.routes:
        if not hasattr(r, "methods"):
            continue
        if "DELETE" in r.methods:
            continue
        assert r.response_model is not None, (
            f"{r.path} ({r.methods}) is missing response_model"
        )
