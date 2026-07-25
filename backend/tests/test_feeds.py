"""Unit tests for the RSS/Atom/JSON Feed serialisers (B130).

THE critical honesty rule: every feed item carries the per-
publication license AND the AGPLv3 site-wide credit.
"""

from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import pytest

from theourgia.core.publishing.rss import (
    AGPL_CREDIT,
    FeedItem,
    FeedMeta,
    build_atom,
    build_json_feed,
    build_rss,
)


def _meta() -> FeedMeta:
    return FeedMeta(
        vault_slug="aspasia",
        title="Aspasia's vault",
        description="Recent letters and essays.",
        public_base_url="https://theourgia.app",
    )


def _items() -> list[FeedItem]:
    now = datetime(2026, 6, 26, 12, 0, tzinfo=timezone.utc)
    return [
        FeedItem(
            id="00000000-0000-0000-0000-000000000001",
            slug="walking-the-crossroads",
            title="Walking the Crossroads",
            summary="A short essay on dedication.",
            published_at=now,
            updated_at=now,
            author_label="Aspasia",
            license_slug="cc_by_nc",
            license_label="CC-BY-NC 4.0",
        ),
        FeedItem(
            id="00000000-0000-0000-0000-000000000002",
            slug="on-the-sealed-oath",
            title="On the Sealed Oath",
            summary=None,
            published_at=now,
            updated_at=now,
            author_label="Aspasia",
            license_slug="cc_by_sa",
            license_label="CC-BY-SA 4.0",
        ),
    ]


# ── AGPLv3 credit invariant ────────────────────────────────


def test_agpl_credit_constant_mentions_agplv3() -> None:
    assert "AGPLv3" in AGPL_CREDIT
    assert "theourgia.app" in AGPL_CREDIT


def test_rss_includes_agpl_credit_in_copyright() -> None:
    body = build_rss(_meta(), _items())
    assert "AGPLv3" in body
    assert "theourgia.app" in body


def test_atom_includes_agpl_credit_in_rights() -> None:
    body = build_atom(_meta(), _items())
    assert "<rights>" in body
    assert "AGPLv3" in body


def test_json_feed_includes_agpl_credit_per_item() -> None:
    body = build_json_feed(_meta(), _items())
    doc = json.loads(body)
    for item in doc["items"]:
        assert "_theourgia" in item
        assert "AGPLv3" in item["_theourgia"]["rights"]


# ── Per-publication license invariant ──────────────────────


def test_rss_includes_per_item_license_label() -> None:
    body = build_rss(_meta(), _items())
    assert "CC-BY-NC 4.0" in body
    assert "CC-BY-SA 4.0" in body


def test_atom_includes_per_item_license_label() -> None:
    body = build_atom(_meta(), _items())
    assert "CC-BY-NC 4.0" in body
    assert "CC-BY-SA 4.0" in body


def test_json_feed_includes_per_item_license_slug_and_label() -> None:
    body = build_json_feed(_meta(), _items())
    doc = json.loads(body)
    for item in doc["items"]:
        assert item["_theourgia"]["license_slug"] in (
            "cc_by_nc", "cc_by_sa",
        )
        assert item["_theourgia"]["license_label"] in (
            "CC-BY-NC 4.0", "CC-BY-SA 4.0",
        )


# ── Spec validity ─────────────────────────────────────────


def test_rss_parses_as_xml() -> None:
    body = build_rss(_meta(), _items())
    root = ET.fromstring(body)
    assert root.tag == "rss"
    assert root.attrib.get("version") == "2.0"


def test_atom_parses_as_xml_with_atom_namespace() -> None:
    body = build_atom(_meta(), _items())
    root = ET.fromstring(body)
    assert root.tag == "{http://www.w3.org/2005/Atom}feed"


def test_json_feed_validates_against_spec_version_1_1() -> None:
    body = build_json_feed(_meta(), _items())
    doc = json.loads(body)
    assert doc["version"] == "https://jsonfeed.org/version/1.1"
    assert "items" in doc
    assert isinstance(doc["items"], list)


def test_rss_includes_atom_self_link() -> None:
    """RSS 2.0 best practice: include the atom:link self reference."""
    body = build_rss(_meta(), _items())
    assert 'rel="self"' in body
    assert "feed.rss" in body


def test_atom_includes_self_and_alternate_links() -> None:
    body = build_atom(_meta(), _items())
    assert 'rel="self"' in body
    assert 'rel="alternate"' in body


# ── Item URL shape ────────────────────────────────────────


def test_rss_item_link_uses_reader_url() -> None:
    body = build_rss(_meta(), _items())
    assert (
        "https://theourgia.app/reader/aspasia/walking-the-crossroads"
        in body
    )


def test_atom_entry_id_uses_reader_url() -> None:
    body = build_atom(_meta(), _items())
    assert (
        "<id>https://theourgia.app/reader/aspasia/walking-the-crossroads</id>"
        in body
    )


# ── Empty feed ────────────────────────────────────────────


def test_rss_with_no_items_still_valid() -> None:
    body = build_rss(_meta(), [])
    root = ET.fromstring(body)
    channel = root.find("channel")
    assert channel is not None
    assert channel.findall("item") == []


def test_atom_with_no_items_still_valid() -> None:
    body = build_atom(_meta(), [])
    root = ET.fromstring(body)
    entries = root.findall("{http://www.w3.org/2005/Atom}entry")
    assert entries == []


def test_json_feed_with_no_items_still_valid() -> None:
    body = build_json_feed(_meta(), [])
    doc = json.loads(body)
    assert doc["items"] == []


# ── XSS safety ───────────────────────────────────────────


def test_rss_escapes_html_in_titles_and_summaries() -> None:
    items = [
        FeedItem(
            id="x",
            slug="x",
            title="<script>alert('xss')</script>",
            summary="<img src=x onerror='alert(1)'>",
            published_at=datetime.now(tz=timezone.utc),
            updated_at=datetime.now(tz=timezone.utc),
            author_label="x",
            license_slug="cc_by",
            license_label="CC-BY 4.0",
        ),
    ]
    body = build_rss(_meta(), items)
    assert "<script>alert" not in body
    assert "&lt;script&gt;" in body


def test_atom_escapes_html_in_titles_and_summaries() -> None:
    items = [
        FeedItem(
            id="x",
            slug="x",
            title="<b>bold</b>",
            summary=None,
            published_at=datetime.now(tz=timezone.utc),
            updated_at=datetime.now(tz=timezone.utc),
            author_label="x",
            license_slug="cc0",
            license_label="CC0",
        ),
    ]
    body = build_atom(_meta(), items)
    # The text content should be escaped, not the structural Atom
    # tags.
    assert "<title>&lt;b&gt;bold&lt;/b&gt;</title>" in body


# ── Author label resolution (Day-1 honesty batch) ──────────


class _ScalarFirst:
    def __init__(self, value) -> None:
        self._value = value

    def scalars(self):
        return self

    def first(self):
        return self._value


class _FakeDb:
    """Serves a single Vault row (or None) to any query."""

    def __init__(self, vault) -> None:
        self.vault = vault

    async def execute(self, stmt):
        return _ScalarFirst(self.vault)


async def test_author_label_comes_from_owner_vault() -> None:
    from types import SimpleNamespace
    from uuid import uuid4

    from theourgia.api.routers.feeds import _resolve_author_label

    vault = SimpleNamespace(display_name="Aspasia of Miletus")
    label = await _resolve_author_label(_FakeDb(vault), uuid4())
    assert label == "Aspasia of Miletus"


async def test_author_label_fallback_is_settings_backed() -> None:
    """No vault row → the operator-configurable settings fallback
    (THEOURGIA_PROFILE_DISPLAY_NAME_FALLBACK), never an inline
    literal in the router."""
    from uuid import uuid4

    from theourgia.api.routers.feeds import _resolve_author_label
    from theourgia.core.config import get_settings

    label = await _resolve_author_label(_FakeDb(None), uuid4())
    assert label == get_settings().profile_display_name_fallback


async def test_author_label_empty_display_name_falls_back() -> None:
    from types import SimpleNamespace
    from uuid import uuid4

    from theourgia.api.routers.feeds import _resolve_author_label
    from theourgia.core.config import get_settings

    vault = SimpleNamespace(display_name="")
    label = await _resolve_author_label(_FakeDb(vault), uuid4())
    assert label == get_settings().profile_display_name_fallback


def test_no_hardcoded_operator_name_in_feed_routers() -> None:
    """The pre-Day-1 bug: 'Soror Ευ. Α.' was inlined in the feed and
    public-vault routers. The literal must only live in app settings
    (documented fallback)."""
    import inspect

    from theourgia.api.routers import feeds as feeds_module
    from theourgia.api.routers.v1 import public_vault as pv_module

    assert "Soror" not in inspect.getsource(feeds_module)
    assert "Soror" not in inspect.getsource(pv_module)
    assert "AGPL-3.0" not in inspect.getsource(pv_module)


def test_profile_fallback_settings_are_env_configurable() -> None:
    from theourgia.core.config import Settings

    s = Settings(
        THEOURGIA_PROFILE_DISPLAY_NAME_FALLBACK="Frater X",
        THEOURGIA_PUBLIC_LICENSE_LABEL="AGPL-3.0-or-later",
    )
    assert s.profile_display_name_fallback == "Frater X"
    assert s.public_license_label == "AGPL-3.0-or-later"
