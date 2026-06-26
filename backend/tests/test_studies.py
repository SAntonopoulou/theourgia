"""Unit tests for the studies router (B112).

Covers:
  * Schema validation — StudyCreate/Update + SnapshotUpdate
  * Honesty rule: ``query`` is NOT a field on StudyUpdate (immutable)
  * Honesty rule: SnapshotUpdate only accepts ``notes`` (results frozen)
  * Helper round-trips: _to_study_read, _to_snapshot_read
  * Router registration smoke
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1 import studies as studies_module
from theourgia.api.routers.v1.studies import (
    StudyCreate,
    StudyRead,
    StudySnapshotRead,
    StudySnapshotUpdate,
    StudyUpdate,
    _to_snapshot_read,
    _to_study_read,
)
from theourgia.models.studies import StudyKind, StudyVisibility


def _study_row(
    *,
    kind: StudyKind = StudyKind.GEMATRIA_SEARCH,
    visibility: StudyVisibility = StudyVisibility.PERSONAL,
) -> SimpleNamespace:
    now = datetime(2026, 6, 26, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        name="Daily logos",
        kind=kind,
        query={"value": 418, "cipher_ids": [], "match_mode": "exact"},
        description=None,
        visibility=visibility,
        created_at=now,
        updated_at=now,
    )


def _snapshot_row() -> SimpleNamespace:
    now = datetime(2026, 6, 26, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        study_id=uuid4(),
        results={"total_matches": 5, "results": []},
        notes=None,
        created_at=now,
        updated_at=now,
    )


# ── Schema validation ─────────────────────────────────────────────


def test_study_create_minimal_validates() -> None:
    p = StudyCreate(
        name="My study",
        kind=StudyKind.GEMATRIA_SEARCH,
    )
    assert p.name == "My study"
    assert p.kind == StudyKind.GEMATRIA_SEARCH
    assert p.query == {}
    assert p.visibility == StudyVisibility.PERSONAL


def test_study_create_full_validates() -> None:
    p = StudyCreate(
        name="Wide net",
        kind=StudyKind.GEMATRIA_SEARCH,
        query={"value": 418, "cipher_ids": [], "match_mode": "exact"},
        description="A study of 418",
        visibility=StudyVisibility.HUB,
    )
    assert p.description == "A study of 418"
    assert p.visibility == StudyVisibility.HUB


def test_study_create_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        StudyCreate(name="", kind=StudyKind.GEMATRIA_SEARCH)


def test_study_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        StudyCreate(
            name="X",
            kind=StudyKind.GEMATRIA_SEARCH,
            owner_id=uuid4(),  # type: ignore[call-arg]
        )


# ── Honesty rules ────────────────────────────────────────────────


def test_study_update_does_NOT_accept_query() -> None:
    """The H06 §8 ritual rule: query is immutable after first save.
    The schema enforces this by not declaring the field."""
    with pytest.raises(ValidationError):
        StudyUpdate(query={"value": 999})  # type: ignore[call-arg]


def test_study_update_does_NOT_accept_kind() -> None:
    """Kind is structural — also immutable."""
    with pytest.raises(ValidationError):
        StudyUpdate(kind=StudyKind.GEMATRIA_CALCULATION)  # type: ignore[call-arg]


def test_study_update_accepts_only_name_description_visibility() -> None:
    p = StudyUpdate(
        name="renamed",
        description="new desc",
        visibility=StudyVisibility.VIEWER,
    )
    data = p.model_dump(exclude_unset=True)
    assert set(data.keys()) == {"name", "description", "visibility"}


def test_study_update_is_fully_optional() -> None:
    p = StudyUpdate()
    assert p.model_dump(exclude_unset=True) == {}


def test_snapshot_update_only_accepts_notes() -> None:
    """Snapshots are frozen: results read-only, only notes editable."""
    p = StudySnapshotUpdate(notes="re-read at the dark moon")
    assert p.notes == "re-read at the dark moon"


def test_snapshot_update_rejects_results() -> None:
    with pytest.raises(ValidationError):
        StudySnapshotUpdate(results={"hacked": True})  # type: ignore[call-arg]


def test_snapshot_update_rejects_other_fields() -> None:
    with pytest.raises(ValidationError):
        StudySnapshotUpdate(study_id=uuid4())  # type: ignore[call-arg]


# ── Helpers ──────────────────────────────────────────────────────────


def test_to_study_read_serialises_enums_and_uuid() -> None:
    row = _study_row(
        kind=StudyKind.GEMATRIA_CALCULATION,
        visibility=StudyVisibility.HUB,
    )
    read = _to_study_read(row)
    assert read.id == str(row.id)
    assert read.kind == "gematria_calculation"
    assert read.visibility == "hub"
    assert read.query == row.query


def test_to_study_read_handles_null_owner() -> None:
    row = _study_row()
    row.owner_id = None
    read = _to_study_read(row)
    assert read.owner_id is None


def test_to_snapshot_read_round_trips() -> None:
    row = _snapshot_row()
    read = _to_snapshot_read(row)
    assert read.id == str(row.id)
    assert read.study_id == str(row.study_id)
    assert read.results == row.results


def test_to_snapshot_read_preserves_notes() -> None:
    row = _snapshot_row()
    row.notes = "Annotated"
    read = _to_snapshot_read(row)
    assert read.notes == "Annotated"


# ── Router smoke ──────────────────────────────────────────────────


def test_studies_router_registers_nine_routes() -> None:
    paths_methods = {
        (r.path, m)
        for r in studies_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    expected = {
        ("/studies", "GET"),
        ("/studies", "POST"),
        ("/studies/{study_id}", "GET"),
        ("/studies/{study_id}", "PATCH"),
        ("/studies/{study_id}", "DELETE"),
        ("/studies/{study_id}/run", "POST"),
        ("/studies/{study_id}/snapshots", "GET"),
        ("/studies/{study_id}/snapshots/{snapshot_id}", "GET"),
        ("/studies/{study_id}/snapshots/{snapshot_id}", "PATCH"),
    }
    assert expected.issubset(paths_methods)


def test_studies_router_response_models() -> None:
    from fastapi.routing import APIRoute

    by_path: dict[tuple[str, str], object] = {}
    for r in studies_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        for m in r.methods or ():
            by_path[(r.path, m)] = r.response_model
    assert by_path[("/studies", "GET")] == list[StudyRead]
    assert by_path[("/studies", "POST")] == StudyRead
    assert by_path[("/studies/{study_id}/run", "POST")] == StudySnapshotRead
    assert by_path[("/studies/{study_id}/snapshots", "GET")] == list[StudySnapshotRead]


def test_study_kind_enum_has_two_values_in_phase08() -> None:
    """Phase 08 ships two kinds; Phase 09 will extend."""
    assert {k.value for k in StudyKind} == {
        "gematria_search",
        "gematria_calculation",
    }


def test_study_visibility_enum_mirrors_entry_visibility() -> None:
    assert {v.value for v in StudyVisibility} == {
        "personal", "viewer", "hub", "public",
    }
