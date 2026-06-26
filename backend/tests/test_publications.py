"""Unit tests for the publications router (B126).

Covers:
  * Slug helper (slugify + unique-slug collision suffix) — pure
  * Body-walker that collects entry-id refs from Tiptap JSON
  * Schemas (Create / Update / Schedule / ChapterCreate / ChapterUpdate /
    ReorderPayload)
  * Helper round-trips (_to_publication_read, _to_chapter_read)
  * Router registration smoke
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1 import publications as publications_module
from theourgia.api.routers.v1.publications import (
    ChapterCreate,
    ChapterRead,
    ChapterUpdate,
    PublicationCreate,
    PublicationRead,
    PublicationUpdate,
    ReorderPayload,
    SchedulePayload,
    _collect_entry_id_refs,
    _to_chapter_read,
    _to_publication_read,
    slugify,
)
from theourgia.models.publications import (
    PublicationKind,
    PublicationLicense,
    PublicationState,
)


def _publication_row(
    *,
    kind: PublicationKind = PublicationKind.ESSAY,
    state: PublicationState = PublicationState.DRAFT,
    license: PublicationLicense = PublicationLicense.ALL_RIGHTS_RESERVED,
    slug: str = "test-essay",
) -> SimpleNamespace:
    now = datetime(2026, 6, 26, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        kind=kind,
        state=state,
        title="Test essay",
        slug=slug,
        summary="A test summary.",
        body={"type": "doc", "content": []},
        cover_url=None,
        language="en",
        license=license,
        published_at=None,
        scheduled_publish_at=None,
        withdrawn_at=None,
        pricing_model="free",
        one_time_amount_cents=None,
        currency="usd",
        watermark_enabled=False,
        cited=False,
        created_at=now,
        updated_at=now,
    )


def _chapter_row(*, order_index: int = 0) -> SimpleNamespace:
    now = datetime(2026, 6, 26, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        publication_id=uuid4(),
        order_index=order_index,
        title=f"Chapter {order_index + 1}",
        body={},
        created_at=now,
        updated_at=now,
    )


# ── slugify ─────────────────────────────────────────────────────


def test_slugify_lowercases_and_dashes() -> None:
    assert slugify("Walking the Crossroads") == "walking-the-crossroads"


def test_slugify_collapses_non_alnum_to_dash() -> None:
    assert (
        slugify("On the Sealed Oath: A Working")
        == "on-the-sealed-oath-a-working"
    )


def test_slugify_strips_leading_trailing_dashes() -> None:
    assert slugify("!Hello!") == "hello"


def test_slugify_empty_falls_back_to_untitled() -> None:
    assert slugify("") == "untitled"
    assert slugify("!!!") == "untitled"


def test_slugify_handles_unicode_letters() -> None:
    # Unicode letters that aren't ASCII collapse to dashes.
    assert slugify("Σοφία") == "untitled"


# ── _collect_entry_id_refs ─────────────────────────────────────


def test_collect_entry_id_refs_empty_body() -> None:
    assert _collect_entry_id_refs({}) == []


def test_collect_entry_id_refs_single_entry_link() -> None:
    eid = uuid4()
    body = {
        "type": "doc",
        "content": [
            {
                "type": "entryLink",
                "attrs": {"entry_id": str(eid)},
            }
        ],
    }
    refs = _collect_entry_id_refs(body)
    assert refs == [eid]


def test_collect_entry_id_refs_nested() -> None:
    eid1, eid2 = uuid4(), uuid4()
    body = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "entryLink",
                        "attrs": {"entry_id": str(eid1)},
                    },
                    {
                        "type": "chartLink",
                        "attrs": {"entry_id": str(eid2), "chart_id": "x"},
                    },
                ],
            }
        ],
    }
    refs = _collect_entry_id_refs(body)
    assert eid1 in refs and eid2 in refs


def test_collect_entry_id_refs_ignores_bad_uuid_strings() -> None:
    body = {
        "type": "doc",
        "content": [
            {
                "type": "entryLink",
                "attrs": {"entry_id": "not-a-uuid"},
            }
        ],
    }
    assert _collect_entry_id_refs(body) == []


def test_collect_entry_id_refs_ignores_non_string_entry_id() -> None:
    body = {
        "type": "doc",
        "content": [
            {"type": "entryLink", "attrs": {"entry_id": 42}},
        ],
    }
    assert _collect_entry_id_refs(body) == []


# ── Schema validation ──────────────────────────────────────────


def test_publication_create_minimal_validates() -> None:
    p = PublicationCreate(kind=PublicationKind.ESSAY, title="x")
    assert p.kind == PublicationKind.ESSAY
    assert p.pricing_model == "free"
    assert p.license == PublicationLicense.ALL_RIGHTS_RESERVED


def test_publication_create_accepts_all_kinds() -> None:
    for k in PublicationKind:
        p = PublicationCreate(kind=k, title="x")
        assert p.kind == k


def test_publication_create_accepts_all_licenses() -> None:
    for l in PublicationLicense:
        p = PublicationCreate(
            kind=PublicationKind.ESSAY, title="x", license=l,
        )
        assert p.license == l


def test_publication_create_rejects_empty_title() -> None:
    with pytest.raises(ValidationError):
        PublicationCreate(kind=PublicationKind.ESSAY, title="")


def test_publication_create_rejects_invalid_pricing_model() -> None:
    with pytest.raises(ValidationError):
        PublicationCreate(
            kind=PublicationKind.ESSAY, title="x", pricing_model="lifetime",
        )


def test_publication_create_rejects_negative_price() -> None:
    with pytest.raises(ValidationError):
        PublicationCreate(
            kind=PublicationKind.ESSAY,
            title="x",
            pricing_model="one_time",
            one_time_amount_cents=-100,
        )


def test_publication_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        PublicationCreate(
            kind=PublicationKind.ESSAY,
            title="x",
            owner_id=uuid4(),  # type: ignore[call-arg]
        )


def test_publication_update_does_NOT_accept_state() -> None:
    """The lifecycle endpoints own state. Generic PATCH MUST reject."""
    with pytest.raises(ValidationError):
        PublicationUpdate(state=PublicationState.LIVE)  # type: ignore[call-arg]


def test_publication_update_does_NOT_accept_kind() -> None:
    """Kind is structural; immutable."""
    with pytest.raises(ValidationError):
        PublicationUpdate(kind=PublicationKind.BOOK)  # type: ignore[call-arg]


def test_publication_update_does_NOT_accept_owner_id() -> None:
    with pytest.raises(ValidationError):
        PublicationUpdate(owner_id=uuid4())  # type: ignore[call-arg]


def test_publication_update_does_NOT_accept_published_at() -> None:
    """Published_at is managed by /publish, not PATCH."""
    with pytest.raises(ValidationError):
        PublicationUpdate(published_at=datetime.now(tz=timezone.utc))  # type: ignore[call-arg]


def test_publication_update_is_fully_optional() -> None:
    p = PublicationUpdate()
    assert p.model_dump(exclude_unset=True) == {}


def test_schedule_payload_requires_datetime() -> None:
    p = SchedulePayload(scheduled_publish_at=datetime.now(tz=timezone.utc))
    assert isinstance(p.scheduled_publish_at, datetime)


def test_schedule_payload_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        SchedulePayload(
            scheduled_publish_at=datetime.now(tz=timezone.utc),
            extra="bad",  # type: ignore[call-arg]
        )


def test_chapter_create_minimal() -> None:
    p = ChapterCreate(title="Chapter 1")
    assert p.title == "Chapter 1"
    assert p.body == {}


def test_chapter_create_rejects_empty_title() -> None:
    with pytest.raises(ValidationError):
        ChapterCreate(title="")


def test_chapter_update_is_fully_optional() -> None:
    p = ChapterUpdate()
    assert p.model_dump(exclude_unset=True) == {}


def test_chapter_update_does_NOT_accept_order_index() -> None:
    """Order is managed via /chapters/reorder, not PATCH."""
    with pytest.raises(ValidationError):
        ChapterUpdate(order_index=5)  # type: ignore[call-arg]


def test_reorder_payload_requires_list_of_uuids() -> None:
    p = ReorderPayload(ordered_ids=[uuid4(), uuid4()])
    assert len(p.ordered_ids) == 2


# ── Helpers ────────────────────────────────────────────────────


def test_to_publication_read_serialises_enums_and_uuid() -> None:
    row = _publication_row(
        kind=PublicationKind.BOOK,
        state=PublicationState.LIVE,
        license=PublicationLicense.CC_BY_NC,
    )
    chapters = [_chapter_row(order_index=0), _chapter_row(order_index=1)]
    read = _to_publication_read(row, chapters)
    assert read.id == str(row.id)
    assert read.kind == "book"
    assert read.state == "live"
    assert read.license == "cc_by_nc"
    assert len(read.chapters) == 2


def test_to_publication_read_with_no_chapters() -> None:
    row = _publication_row()
    read = _to_publication_read(row, [])
    assert read.chapters == []


def test_to_chapter_read_round_trip() -> None:
    row = _chapter_row(order_index=3)
    read = _to_chapter_read(row)
    assert read.id == str(row.id)
    assert read.publication_id == str(row.publication_id)
    assert read.order_index == 3
    assert read.title == "Chapter 4"


# ── Router smoke ──────────────────────────────────────────────


def test_publications_router_registers_thirteen_routes() -> None:
    """5 CRUD + 4 lifecycle + 4 chapter sub-resources = 13 routes."""
    paths_methods = {
        (r.path, m)
        for r in publications_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    expected = {
        ("/publications", "GET"),
        ("/publications", "POST"),
        ("/publications/{publication_id}", "GET"),
        ("/publications/{publication_id}", "PATCH"),
        ("/publications/{publication_id}", "DELETE"),
        ("/publications/{publication_id}/publish", "POST"),
        ("/publications/{publication_id}/schedule", "POST"),
        ("/publications/{publication_id}/withdraw", "POST"),
        ("/publications/{publication_id}/republish", "POST"),
        ("/publications/{publication_id}/chapters", "POST"),
        ("/publications/{publication_id}/chapters/{chapter_id}", "PATCH"),
        ("/publications/{publication_id}/chapters/{chapter_id}", "DELETE"),
        ("/publications/{publication_id}/chapters/reorder", "POST"),
    }
    assert expected.issubset(paths_methods)


def test_publications_router_response_models() -> None:
    from fastapi.routing import APIRoute

    by_key: dict[tuple[str, str], object] = {}
    for r in publications_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        for m in r.methods or ():
            by_key[(r.path, m)] = r.response_model
    assert by_key[("/publications", "GET")] == list[PublicationRead]
    assert by_key[("/publications", "POST")] == PublicationRead
    assert (
        by_key[("/publications/{publication_id}/publish", "POST")]
        == PublicationRead
    )
    assert (
        by_key[
            ("/publications/{publication_id}/chapters", "POST")
        ]
        == ChapterRead
    )


def test_publication_kind_enum_has_four_values() -> None:
    assert {k.value for k in PublicationKind} == {
        "book", "essay", "post", "page",
    }


def test_publication_state_enum_has_four_values() -> None:
    assert {s.value for s in PublicationState} == {
        "draft", "scheduled", "live", "withdrawn",
    }


def test_publication_license_enum_has_nine_values() -> None:
    """Per the H07 Editor surface — nine license picker options."""
    assert len(PublicationLicense) == 9
