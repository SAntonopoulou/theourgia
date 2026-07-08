"""Obsidian markdown exporter tests — b108-2hh part 2.

Covers the pure-conversion helpers + router surface. End-to-end
ZIP streaming is exercised via the router shape + sealed-entry
regression guard.
"""

from __future__ import annotations

import json

import pytest
from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import exports_obsidian as exports_module
from theourgia.core.exports.obsidian import (
    ObsidianExportEntry,
    render_entry_markdown,
    safe_filename,
)


def _entry(**overrides) -> ObsidianExportEntry:
    defaults = {
        "id": "00000000-0000-0000-0000-000000000001",
        "title": "My first entry",
        "entry_type": "note",
        "excerpt": "Short summary",
        "body_text": None,
        "body_json": None,
        "glyph": "feather",
        "visibility": "personal",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-02T00:00:00Z",
        "occurred_at": None,
        "tags": (),
        "sealed": False,
    }
    defaults.update(overrides)
    return ObsidianExportEntry(**defaults)


# ── Router surface ────────────────────────────────────────────────


def test_router_registered() -> None:
    paths_methods = {
        (r.path, m)
        for r in exports_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/exports/obsidian", "GET") in paths_methods


def test_endpoint_requires_auth() -> None:
    from theourgia.api.deps import get_current_user

    for route in exports_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        deps = route.dependant.dependencies
        calls = [d.call for d in deps]
        sub_names: list[str] = []
        for d in deps:
            for sub in d.dependencies:
                if hasattr(sub.call, "__name__"):
                    sub_names.append(sub.call.__name__)
        assert (
            get_current_user in calls or "get_current_user" in sub_names
        ), "obsidian export must be auth-required"


def test_endpoint_filters_sealed_entries_in_sql() -> None:
    """Regression guard: the export SQL query MUST filter out sealed
    entries. If a future refactor drops this WHERE clause, sealed
    plaintext could leak into a bulk export."""
    from inspect import getsource

    src = getsource(exports_module.export_obsidian)
    assert "encryption_mode == EncryptionMode.NONE" in src


# ── Filename sanitisation ─────────────────────────────────────────


def test_safe_filename_appends_md_extension() -> None:
    e = _entry(title="Winter Solstice Rite")
    assert safe_filename(e).endswith(".md")


def test_safe_filename_strips_special_characters() -> None:
    e = _entry(title="Working: /var/tmp cleanup?")
    name = safe_filename(e)
    # No slashes, colons, or question marks in the filename.
    for ch in "/:?":
        assert ch not in name


def test_safe_filename_falls_back_to_id_on_empty_title() -> None:
    e = _entry(title="!!!")
    name = safe_filename(e)
    assert name.startswith("entry-00000000")


# ── Frontmatter ───────────────────────────────────────────────────


def test_frontmatter_contains_required_keys() -> None:
    md = render_entry_markdown(_entry())
    assert md.startswith("---\n")
    assert 'id: "00000000-0000-0000-0000-000000000001"' in md
    assert 'title: "My first entry"' in md
    assert 'type: "note"' in md
    assert 'visibility: "personal"' in md
    assert 'glyph: "feather"' in md


def test_frontmatter_quotes_scalars_to_avoid_yaml_edge_cases() -> None:
    """A title like `false` or a colon-containing string would break
    unquoted YAML. Everything is quoted so that never bites us."""
    e = _entry(title="false")
    md = render_entry_markdown(e)
    assert 'title: "false"' in md


def test_frontmatter_includes_tags_when_present() -> None:
    e = _entry(tags=("hermetic", "solar"))
    md = render_entry_markdown(e)
    assert 'tags: ["hermetic", "solar"]' in md


def test_frontmatter_omits_occurred_at_when_missing() -> None:
    md = render_entry_markdown(_entry(occurred_at=None))
    assert "occurred_at" not in md.split("---")[1]


# ── Body rendering ────────────────────────────────────────────────


def test_body_falls_back_to_body_text_when_no_json() -> None:
    md = render_entry_markdown(_entry(body_text="Just some plain notes."))
    assert "Just some plain notes." in md


def test_body_falls_back_to_excerpt_when_body_and_body_text_absent() -> None:
    md = render_entry_markdown(_entry(excerpt="Short summary here"))
    assert "Short summary here" in md


def test_tiptap_paragraph_renders_as_plain_text() -> None:
    doc = json.dumps(
        {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "Hello world"}],
                }
            ],
        }
    )
    md = render_entry_markdown(_entry(body_json=doc))
    assert "Hello world" in md


def test_tiptap_heading_renders_with_hashes() -> None:
    doc = json.dumps(
        {
            "type": "doc",
            "content": [
                {
                    "type": "heading",
                    "attrs": {"level": 3},
                    "content": [{"type": "text", "text": "Section"}],
                }
            ],
        }
    )
    md = render_entry_markdown(_entry(body_json=doc))
    assert "### Section" in md


def test_tiptap_bold_and_italic_marks_survive() -> None:
    doc = json.dumps(
        {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "bold",
                            "marks": [{"type": "bold"}],
                        },
                        {"type": "text", "text": " "},
                        {
                            "type": "text",
                            "text": "italic",
                            "marks": [{"type": "italic"}],
                        },
                    ],
                }
            ],
        }
    )
    md = render_entry_markdown(_entry(body_json=doc))
    assert "**bold**" in md
    assert "*italic*" in md


def test_tiptap_link_becomes_markdown_link() -> None:
    doc = json.dumps(
        {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "click",
                            "marks": [
                                {
                                    "type": "link",
                                    "attrs": {
                                        "href": "https://example.com",
                                    },
                                },
                            ],
                        }
                    ],
                }
            ],
        }
    )
    md = render_entry_markdown(_entry(body_json=doc))
    assert "[click](https://example.com)" in md


def test_tiptap_bullet_list_renders_as_dashes() -> None:
    doc = json.dumps(
        {
            "type": "doc",
            "content": [
                {
                    "type": "bulletList",
                    "content": [
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        {"type": "text", "text": "one"},
                                    ],
                                }
                            ],
                        },
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        {"type": "text", "text": "two"},
                                    ],
                                }
                            ],
                        },
                    ],
                }
            ],
        }
    )
    md = render_entry_markdown(_entry(body_json=doc))
    assert "- one" in md
    assert "- two" in md


def test_tiptap_custom_block_preserved_as_yaml_fallback() -> None:
    """Custom node kinds (calendar-stamp, correspondence table, etc.)
    render as a YAML code fence so semantics survive."""
    doc = json.dumps(
        {
            "type": "doc",
            "content": [
                {
                    "type": "calendarStamp",
                    "attrs": {"date": "2026-03-21", "calendar": "gregorian"},
                }
            ],
        }
    )
    md = render_entry_markdown(_entry(body_json=doc))
    assert "```yaml" in md
    assert "calendarStamp" in md
    assert "2026-03-21" in md


def test_tiptap_falls_back_to_body_text_on_invalid_json() -> None:
    md = render_entry_markdown(
        _entry(body_json="not-json-at-all", body_text="Fallback body"),
    )
    assert "Fallback body" in md


# ── Sealed-entry hard rejection ───────────────────────────────────


def test_sealed_entry_raises_valueerror() -> None:
    """Regression guard: if a sealed row somehow reaches the encoder,
    we RAISE rather than emit plaintext."""
    with pytest.raises(ValueError):
        render_entry_markdown(_entry(sealed=True))
