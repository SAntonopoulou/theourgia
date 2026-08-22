"""The journal-as-CMS surface (v1-044), pinned.

What is fixed here, before any UI exists: a slug is derived from a
title the way the publish path derives it; a custom slug is validated
with the rule spelled out; the Tiptap walk emits escaped HTML and never
swallows unknown nodes; the public page carries the whole SEO surface
(title, meta description, canonical, OG article, JSON-LD BlogPosting);
and the new routes are registered where the Caddy proxy expects them.
"""

from __future__ import annotations

import json

import pytest
from fastapi import HTTPException

from theourgia.api.routers.v1.entries import _normalize_slug, _slugify
from theourgia.core.publishing.post_html import render_post_html, tiptap_to_html

# ── slugs ──────────────────────────────────────────────────────────


def test_slugify_derives_url_words() -> None:
    assert _slugify("The Deipnon — Hekate's Supper") == "the-deipnon-hekate-s-supper"
    assert _slugify("  Twelve   Banishings!  ") == "twelve-banishings"


def test_slugify_survives_a_title_it_cannot_carry() -> None:
    # A wholly Greek title transliterates to nothing by machine; the
    # fallback stands and the editor's custom-slug field is the answer.
    assert _slugify("Ἀπόλυσις") != ""


def test_normalize_slug_accepts_the_documented_shape() -> None:
    assert _normalize_slug(" The-Deipnon-Kept-Properly ") == "the-deipnon-kept-properly"


@pytest.mark.parametrize("bad", ["two--hyphens", "-leading", "trailing-", "ümlaut", "a b", ""])
def test_normalize_slug_refuses_what_it_should(bad: str) -> None:
    with pytest.raises(HTTPException) as err:
        _normalize_slug(bad)
    assert err.value.status_code == 422


# ── the Tiptap walk ────────────────────────────────────────────────


def _doc(*content: dict) -> str:
    return json.dumps({"type": "doc", "content": list(content)})


def test_tiptap_walk_renders_the_editor_nodes() -> None:
    html = tiptap_to_html(
        _doc(
            {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "The rite"}]},
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "Say "},
                    {"type": "text", "text": "the words", "marks": [{"type": "bold"}]},
                    {"type": "text", "text": " aloud."},
                ],
            },
            {"type": "bulletList", "content": [
                {"type": "listItem", "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "khernips"}]},
                ]},
            ]},
        )
    )
    assert "<h2>The rite</h2>" in html
    assert "<p>Say <strong>the words</strong> aloud.</p>" in html
    assert "<ul><li><p>khernips</p></li></ul>" in html


def test_tiptap_walk_escapes_prose_and_link_hrefs() -> None:
    html = tiptap_to_html(
        _doc(
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "<script>alert(1)</script>",
                        "marks": [{"type": "link", "attrs": {"href": 'x" onmouseover="evil'}}],
                    }
                ],
            }
        )
    )
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert 'onmouseover="evil"' not in html


def test_tiptap_walk_never_swallows_an_unknown_node() -> None:
    html = tiptap_to_html(
        _doc(
            {
                "type": "someFutureNode",
                "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "kept words"}]}
                ],
            }
        )
    )
    assert "kept words" in html


def test_plain_prose_bodies_still_render() -> None:
    html = tiptap_to_html("First graf.\n\nSecond graf.")
    assert html == "<p>First graf.</p><p>Second graf.</p>"
    assert tiptap_to_html(None, "fallback words") == "<p>fallback words</p>"


# ── the public page ────────────────────────────────────────────────


def _page() -> str:
    from datetime import UTC, datetime

    return render_post_html(
        title="The Deipnon, kept properly",
        slug="the-deipnon-kept-properly",
        body_html="<p>The house is cleansed.</p>",
        description="How the dark-moon supper is carried to the crossroads.",
        base_url="https://theourgia.com",
        published_at=datetime(2026, 8, 1, tzinfo=UTC),
        updated_at=datetime(2026, 8, 20, tzinfo=UTC),
        categories=["Household practice"],
        tags=["hekate", "deipnon"],
    )


def test_page_carries_the_seo_surface() -> None:
    html = _page()
    assert "<title>The Deipnon, kept properly · Theourgia</title>" in html
    assert (
        '<link rel="canonical" href="https://theourgia.com/blog/the-deipnon-kept-properly"/>'
        in html
    )
    assert '<meta property="og:type" content="article"/>' in html
    assert '<meta name="description" content="How the dark-moon supper' in html
    assert '<meta property="article:tag" content="hekate"/>' in html


def test_page_structured_data_is_a_blog_posting() -> None:
    html = _page()
    start = html.index('<script type="application/ld+json">') + len(
        '<script type="application/ld+json">'
    )
    end = html.index("</script>", start)
    data = json.loads(html[start:end])
    assert data["@type"] == "BlogPosting"
    assert data["headline"] == "The Deipnon, kept properly"
    assert data["articleSection"] == ["Household practice"]
    assert data["keywords"] == "hekate, deipnon"
    assert data["datePublished"].startswith("2026-08-01")


def test_public_routes_registered() -> None:
    from theourgia.api.app import create_app

    paths = set(create_app().openapi()["paths"].keys())
    assert "/blog/{slug_or_id}" in paths
    assert "/sitemap.xml" in paths
    assert "/api/v1/entries/{entry_id}/unpublish" in paths
    assert "/api/v1/blog/posts/{slug_or_id}" in paths
