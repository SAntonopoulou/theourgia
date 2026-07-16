"""Entry tagging + closed-tradition substrate — v1-001.

FEATURES §2 (flexible tagging + tradition tags) and §15 / Phase 15 §14
(respect-source rule). Follows the suite's DB-less style: pure unit
tests for the ``core.traditions`` helpers, schema-shape tests for the
new tag fields, and handler-level tests that drive the real endpoint
coroutines through a queue-backed fake ``AsyncSession``.
"""

from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from theourgia.api.routers.v1.entries import (
    EntryCreate,
    EntryRead,
    EntryUpdate,
    _normalize_tags,
    create_entry,
    publish_entry,
    update_entry,
)
from theourgia.api.routers.v1.publications import (
    _reject_closed_tradition_embeds,
)
from theourgia.api.routers.v1.traditions import get_closed_slugs
from theourgia.core.traditions import (
    CLOSED_TRADITION_SETTING_KEY,
    closed_tradition_conflicts,
    get_closed_tradition_slugs,
    normalize_tradition_slug,
    parse_closed_tradition_slugs,
)
from theourgia.models.entries import Entry, EntryVisibility
from theourgia.models.instancesettings import InstanceSetting


# ── Fakes ─────────────────────────────────────────────────────────


class _Result:
    """Stand-in for a SQLAlchemy ``Result``."""

    def __init__(
        self, *, scalar: Any = None, rows: list[Any] | None = None,
    ) -> None:
        self._scalar = scalar
        self._rows = rows if rows is not None else []

    def scalar_one_or_none(self) -> Any:
        return self._scalar

    def scalars(self) -> "_Result":
        return self

    def first(self) -> Any:
        return self._rows[0] if self._rows else None

    def all(self) -> list[Any]:
        return self._rows


class _FakeSession:
    """Queue-backed stand-in for ``AsyncSession`` — each ``execute``
    pops the next queued result, so tests assert the exact number of
    queries a path issues."""

    def __init__(self, results: list[_Result] | None = None) -> None:
        self.results = list(results or [])
        self.added: list[Any] = []
        self.commits = 0

    async def execute(self, stmt: Any) -> _Result:
        assert self.results, "handler issued an unexpected query"
        return self.results.pop(0)

    def add(self, row: Any) -> None:
        self.added.append(row)

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, row: Any) -> None:
        return None


def _setting_row(raw: str) -> InstanceSetting:
    return InstanceSetting(
        key=CLOSED_TRADITION_SETTING_KEY,
        value_json=json.dumps(raw),
    )


def _user() -> Any:
    return SimpleNamespace(id=uuid4())


def _entry(**over: Any) -> Entry:
    defaults: dict[str, Any] = {
        "title": "t",
        "excerpt": "",
        "glyph": "feather",
        "owner_id": uuid4(),
    }
    defaults.update(over)
    return Entry(**defaults)


# ── normalize_tradition_slug / parse_closed_tradition_slugs ──────


def test_normalize_slug_casefolds_and_strips() -> None:
    assert normalize_tradition_slug("  Hellenic ") == "hellenic"


def test_normalize_slug_collapses_internal_whitespace_to_hyphen() -> None:
    assert normalize_tradition_slug(" Golden   Dawn ") == "golden-dawn"


def test_parse_comma_separated() -> None:
    assert parse_closed_tradition_slugs("hopi,diné") == frozenset(
        {"hopi", "diné"},
    )


def test_parse_whitespace_separated() -> None:
    assert parse_closed_tradition_slugs("hopi diné") == frozenset(
        {"hopi", "diné"},
    )


def test_parse_mixed_separators_and_case() -> None:
    assert parse_closed_tradition_slugs(" Hopi,  DINÉ\nlakota , ") == frozenset(
        {"hopi", "diné", "lakota"},
    )


def test_parse_empty_string_is_empty() -> None:
    assert parse_closed_tradition_slugs("") == frozenset()
    assert parse_closed_tradition_slugs("  , ,, ") == frozenset()


# ── closed_tradition_conflicts ────────────────────────────────────


def test_conflicts_normalized_and_order_preserving() -> None:
    closed = frozenset({"hopi", "diné"})
    tags = ["Hellenic", "Diné", "HOPI", "diné"]
    assert closed_tradition_conflicts(tags, closed) == ["diné", "hopi"]


def test_conflicts_empty_closed_set_short_circuits() -> None:
    assert closed_tradition_conflicts(["Diné"], frozenset()) == []


# ── get_closed_tradition_slugs ────────────────────────────────────


async def test_closed_slugs_missing_row_is_empty() -> None:
    session = _FakeSession([_Result(scalar=None)])
    assert await get_closed_tradition_slugs(session) == frozenset()


async def test_closed_slugs_reads_and_parses_setting() -> None:
    session = _FakeSession([_Result(scalar=_setting_row("hopi, diné"))])
    assert await get_closed_tradition_slugs(session) == frozenset(
        {"hopi", "diné"},
    )


async def test_closed_slugs_empty_value_is_empty() -> None:
    session = _FakeSession([_Result(scalar=_setting_row(""))])
    assert await get_closed_tradition_slugs(session) == frozenset()


async def test_closed_slugs_malformed_json_is_empty() -> None:
    row = InstanceSetting(
        key=CLOSED_TRADITION_SETTING_KEY, value_json="{not json",
    )
    session = _FakeSession([_Result(scalar=row)])
    assert await get_closed_tradition_slugs(session) == frozenset()


# ── Instance-setting registration ─────────────────────────────────


def test_closed_tradition_setting_registered() -> None:
    from theourgia.core.instancesettings.defaults import (
        register_default_instance_settings,
    )
    from theourgia.core.instancesettings.registry import (
        InstanceSettingsRegistry,
    )

    registry = InstanceSettingsRegistry()
    register_default_instance_settings(registry)
    definition = registry.get(CLOSED_TRADITION_SETTING_KEY)
    assert definition.value_type is str
    assert definition.default == ""
    assert definition.public is False


# ── Schema shapes ─────────────────────────────────────────────────


def test_entry_create_defaults_empty_tag_lists() -> None:
    payload = EntryCreate(title="A note")
    assert payload.tags == []
    assert payload.tradition_tags == []


def test_entry_create_accepts_tag_lists() -> None:
    payload = EntryCreate(
        title="x", tags=["moon"], tradition_tags=["Hellenic"],
    )
    assert payload.tags == ["moon"]
    assert payload.tradition_tags == ["Hellenic"]


def test_entry_update_tags_default_none_means_unchanged() -> None:
    payload = EntryUpdate()
    assert payload.tags is None
    assert payload.tradition_tags is None
    assert payload.visibility is None


def test_entry_update_rejects_non_list_tags() -> None:
    with pytest.raises(ValidationError):
        EntryUpdate(tags="moon")  # type: ignore[arg-type]


def test_entry_read_carries_tag_lists() -> None:
    from datetime import UTC, datetime

    when = datetime(2026, 7, 16, 12, 0, 0, tzinfo=UTC)
    read = EntryRead(
        id=str(uuid4()),
        title="x",
        type="ritual",
        excerpt="",
        glyph="ritual",
        created_at=when,
        updated_at=when,
        tags=["moon"],
        tradition_tags=["Hellenic"],
    )
    assert read.model_dump()["tags"] == ["moon"]
    assert read.model_dump()["tradition_tags"] == ["Hellenic"]


# ── _normalize_tags ───────────────────────────────────────────────


def test_normalize_tags_strips_and_drops_empties() -> None:
    assert _normalize_tags(["  moon ", "", "   "], "tags") == ["moon"]


def test_normalize_tags_dedupes_preserving_order() -> None:
    assert _normalize_tags(
        ["moon", "sun", "moon ", "sun"], "tags",
    ) == ["moon", "sun"]


def test_normalize_tags_rejects_item_over_64_chars() -> None:
    with pytest.raises(HTTPException) as excinfo:
        _normalize_tags(["x" * 65], "tags")
    assert excinfo.value.status_code == 422


def test_normalize_tags_rejects_more_than_32_items() -> None:
    with pytest.raises(HTTPException) as excinfo:
        _normalize_tags([f"tag-{i}" for i in range(33)], "tags")
    assert excinfo.value.status_code == 422


def test_normalize_tags_caps_apply_after_dedupe() -> None:
    raw = [f"tag-{i}" for i in range(32)] + ["tag-0"]
    assert len(_normalize_tags(raw, "tags")) == 32


# ── Round-trip: create → read → patch (handler level) ─────────────


async def test_create_round_trips_tags() -> None:
    session = _FakeSession()
    read = await create_entry(
        EntryCreate(
            title="Full moon rite",
            tags=[" moon ", "rite", "moon"],
            tradition_tags=["Hellenic"],
            location_lat=51.4769,
            location_lon=0.0,
        ),
        session,  # type: ignore[arg-type]
        _user(),
    )
    assert read.tags == ["moon", "rite"]
    assert read.tradition_tags == ["Hellenic"]
    assert session.added[0].tags == ["moon", "rite"]
    assert session.commits == 1


async def test_patch_replaces_tag_lists() -> None:
    row = _entry(tags=["old"], tradition_tags=[])
    session = _FakeSession([_Result(scalar=row)])
    read = await update_entry(
        row.id,
        EntryUpdate(tags=["new", " new "], tradition_tags=["Thelemic"]),
        session,  # type: ignore[arg-type]
        _user(),
    )
    assert row.tags == ["new"]
    assert row.tradition_tags == ["Thelemic"]
    assert read.tags == ["new"]
    assert read.tradition_tags == ["Thelemic"]


async def test_patch_omitting_tags_leaves_them_unchanged() -> None:
    row = _entry(tags=["keep"], tradition_tags=["Hellenic"])
    session = _FakeSession([_Result(scalar=row)])
    read = await update_entry(
        row.id,
        EntryUpdate(title="Renamed"),
        session,  # type: ignore[arg-type]
        _user(),
    )
    assert read.tags == ["keep"]
    assert read.tradition_tags == ["Hellenic"]


# ── Respect-source enforcement ────────────────────────────────────


async def test_create_public_with_closed_tag_is_403() -> None:
    session = _FakeSession([_Result(scalar=_setting_row("hopi, diné"))])
    with pytest.raises(HTTPException) as excinfo:
        await create_entry(
            EntryCreate(
                title="x",
                visibility="public",
                tradition_tags=["Diné"],
            ),
            session,  # type: ignore[arg-type]
            _user(),
        )
    assert excinfo.value.status_code == 403
    assert "closed-tradition" in excinfo.value.detail
    assert "diné" in excinfo.value.detail
    assert session.added == []


async def test_create_personal_with_closed_tag_is_allowed() -> None:
    # Journaling closed-tradition material privately is fine — only
    # the public paths refuse.
    session = _FakeSession()
    read = await create_entry(
        EntryCreate(
            title="x",
            tradition_tags=["Diné"],
            location_lat=0.0,
            location_lon=0.0,
        ),
        session,  # type: ignore[arg-type]
        _user(),
    )
    assert read.tradition_tags == ["Diné"]


async def test_patch_to_public_with_closed_tag_is_403() -> None:
    row = _entry(tradition_tags=["Diné"])
    session = _FakeSession([
        _Result(scalar=row),
        _Result(scalar=_setting_row("hopi, diné")),
    ])
    with pytest.raises(HTTPException) as excinfo:
        await update_entry(
            row.id,
            EntryUpdate(visibility="public"),
            session,  # type: ignore[arg-type]
            _user(),
        )
    assert excinfo.value.status_code == 403
    assert row.visibility == EntryVisibility.PERSONAL


async def test_patch_retagging_public_entry_with_closed_tag_is_403() -> None:
    row = _entry(visibility=EntryVisibility.PUBLIC)
    session = _FakeSession([
        _Result(scalar=row),
        _Result(scalar=_setting_row("hopi, diné")),
    ])
    with pytest.raises(HTTPException) as excinfo:
        await update_entry(
            row.id,
            EntryUpdate(tradition_tags=["Diné"]),
            session,  # type: ignore[arg-type]
            _user(),
        )
    assert excinfo.value.status_code == 403
    assert row.tradition_tags == []


async def test_publish_with_closed_tag_is_403() -> None:
    row = _entry(tradition_tags=["diné"])
    session = _FakeSession([
        _Result(scalar=row),
        _Result(scalar=_setting_row("hopi, diné")),
    ])
    with pytest.raises(HTTPException) as excinfo:
        await publish_entry(row.id, session, _user())  # type: ignore[arg-type]
    assert excinfo.value.status_code == 403
    assert row.published_at is None


async def test_publish_with_open_tradition_tag_succeeds() -> None:
    row = _entry(tradition_tags=["Hellenic"])
    session = _FakeSession([
        _Result(scalar=row),
        _Result(scalar=_setting_row("hopi, diné")),
    ])
    read = await publish_entry(row.id, session, _user())  # type: ignore[arg-type]
    assert read.published_at is not None
    assert row.visibility == EntryVisibility.PUBLIC


async def test_empty_setting_allows_everything() -> None:
    row = _entry(tradition_tags=["Diné"])
    session = _FakeSession([
        _Result(scalar=row),
        _Result(scalar=None),  # no instance_setting row
    ])
    read = await publish_entry(row.id, session, _user())  # type: ignore[arg-type]
    assert read.published_at is not None


# ── Publication embeds ────────────────────────────────────────────


def _body_with_entry_ref(entry_id: Any) -> dict:
    return {
        "type": "doc",
        "content": [
            {"type": "entry-link", "attrs": {"entry_id": str(entry_id)}},
        ],
    }


async def test_publication_embed_of_closed_tradition_entry_is_400() -> None:
    ref = uuid4()
    db = _FakeSession([
        _Result(scalar=_setting_row("hopi, diné")),
        _Result(rows=[(ref, ["Diné"])]),
    ])
    with pytest.raises(HTTPException) as excinfo:
        await _reject_closed_tradition_embeds(
            db,  # type: ignore[arg-type]
            _body_with_entry_ref(ref),
            uuid4(),
        )
    assert excinfo.value.status_code == 400
    assert "closed-tradition" in excinfo.value.detail


async def test_publication_embed_of_open_tradition_entry_passes() -> None:
    ref = uuid4()
    db = _FakeSession([
        _Result(scalar=_setting_row("hopi, diné")),
        _Result(rows=[(ref, ["Hellenic"])]),
    ])
    await _reject_closed_tradition_embeds(
        db,  # type: ignore[arg-type]
        _body_with_entry_ref(ref),
        uuid4(),
    )


async def test_publication_embed_check_skips_without_refs() -> None:
    db = _FakeSession()  # any query would assert
    await _reject_closed_tradition_embeds(
        db,  # type: ignore[arg-type]
        {"type": "doc", "content": []},
        uuid4(),
    )


def test_publication_lifecycle_calls_closed_tradition_guard() -> None:
    """Regression guard: both publish paths run the embed check."""
    from inspect import getsource

    from theourgia.api.routers.v1 import publications as publications_module

    for handler in (
        publications_module.publish_publication,
        publications_module.republish_publication,
    ):
        src = getsource(handler)
        assert "_reject_sealed_embeds" in src
        assert "_reject_closed_tradition_embeds" in src


# ── GET /traditions/closed-slugs ──────────────────────────────────


async def test_closed_slugs_endpoint_returns_sorted_list() -> None:
    session = _FakeSession([_Result(scalar=_setting_row("hopi, diné, ainu"))])
    read = await get_closed_slugs(session, _user())  # type: ignore[arg-type]
    assert read.slugs == sorted(["ainu", "diné", "hopi"])


def test_closed_slugs_route_registered_on_v1() -> None:
    from theourgia.api.app import create_app

    app = create_app()
    assert "/api/v1/traditions/closed-slugs" in set(
        app.openapi()["paths"].keys(),
    )


async def test_closed_slugs_requires_auth(app: Any) -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.get("/api/v1/traditions/closed-slugs")
    assert response.status_code == 401
