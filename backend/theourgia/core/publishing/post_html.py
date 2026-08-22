"""Server-rendered public post pages — the journal's face to the crawlers.

The Astro public site is static and the old reader fetched content
client-side from ``/blog-read?id={uuid}`` — a page whose title, whose
description and whose very words were invisible to anything that does
not run JavaScript. A journal that is the heart of the self-hosted
edition deserves a real address and a real page: ``/blog/{slug}``,
rendered here with the whole SEO surface — title, meta description,
canonical, Open Graph, Twitter card, JSON-LD BlogPosting — and the
article body itself as plain HTML.

Bodies are Tiptap JSON serialised to a string (older rows may carry
plain prose); :func:`tiptap_to_html` walks the node tree and emits
escaped HTML for the node types the editor produces. Unknown node
types render their children rather than vanishing — a new mark must
never silently swallow a paragraph of somebody's writing.
"""

from __future__ import annotations

import json
from datetime import datetime
from html import escape
from typing import Any

__all__ = ["render_post_html", "tiptap_to_html"]


# ── Tiptap JSON → HTML ─────────────────────────────────────────────


def _mark_wrap(text_html: str, marks: list[dict[str, Any]]) -> str:
    """Apply Tiptap marks inside-out. Link hrefs are escaped and get
    rel=noopener — the body is the practitioner's, the attributes are
    ours."""
    out = text_html
    for mark in marks:
        kind = mark.get("type")
        if kind == "bold":
            out = f"<strong>{out}</strong>"
        elif kind == "italic":
            out = f"<em>{out}</em>"
        elif kind == "strike":
            out = f"<s>{out}</s>"
        elif kind == "underline":
            out = f"<u>{out}</u>"
        elif kind == "code":
            out = f"<code>{out}</code>"
        elif kind == "link":
            href = escape(str(mark.get("attrs", {}).get("href", "")), quote=True)
            out = f'<a href="{href}" rel="noopener">{out}</a>'
    return out


def _node_html(node: dict[str, Any]) -> str:
    kind = node.get("type")
    content = node.get("content") or []
    inner = "".join(_node_html(child) for child in content if isinstance(child, dict))

    if kind == "text":
        text_html = escape(str(node.get("text", "")))
        marks = [m for m in (node.get("marks") or []) if isinstance(m, dict)]
        return _mark_wrap(text_html, marks)
    if kind == "paragraph":
        return f"<p>{inner}</p>" if inner else ""
    if kind == "heading":
        level = node.get("attrs", {}).get("level", 2)
        level = level if isinstance(level, int) and 1 <= level <= 6 else 2
        # h1 belongs to the page title; body headings start at h2.
        level = max(level, 2)
        return f"<h{level}>{inner}</h{level}>"
    if kind == "bulletList":
        return f"<ul>{inner}</ul>"
    if kind == "orderedList":
        return f"<ol>{inner}</ol>"
    if kind == "listItem":
        return f"<li>{inner}</li>"
    if kind == "blockquote":
        return f"<blockquote>{inner}</blockquote>"
    if kind == "codeBlock":
        return f"<pre><code>{inner}</code></pre>"
    if kind == "horizontalRule":
        return "<hr/>"
    if kind == "hardBreak":
        return "<br/>"
    if kind == "image":
        attrs = node.get("attrs", {})
        src = escape(str(attrs.get("src", "")), quote=True)
        alt = escape(str(attrs.get("alt", "") or ""), quote=True)
        return f'<img src="{src}" alt="{alt}" loading="lazy"/>' if src else ""
    # Unknown node: render its children rather than swallowing them.
    return inner


def _plain_to_html(text: str) -> str:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return "".join(
        "<p>" + escape(p).replace("\n", "<br/>") + "</p>" for p in paragraphs
    )


def tiptap_to_html(body: str | None, fallback_text: str | None = None) -> str:
    """The article body as HTML — Tiptap JSON walked, prose escaped.

    A body that is not JSON is treated as plain prose (older rows);
    an absent body falls back to the denormalised plaintext.
    """
    if body:
        try:
            doc = json.loads(body)
        except (ValueError, TypeError):
            return _plain_to_html(body)
        if isinstance(doc, dict) and doc.get("type") == "doc":
            return "".join(
                _node_html(child)
                for child in (doc.get("content") or [])
                if isinstance(child, dict)
            )
        return _plain_to_html(body)
    if fallback_text:
        return _plain_to_html(fallback_text)
    return ""


# ── The page ───────────────────────────────────────────────────────

_PAGE_CSS = """
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body {
  margin: 0; background: #100f0d; color: #d8d2c5;
  font-family: Cardo, 'Iowan Old Style', Georgia, serif;
  line-height: 1.7; font-size: 17px;
}
.wrap { max-width: 680px; margin: 0 auto; padding: 40px 20px 80px; }
.site { display: flex; gap: 14px; align-items: baseline; margin-bottom: 44px; }
.site a { color: #bfa15b; text-decoration: none; font-size: 14px; letter-spacing: 0.04em; }
.site .name { font-size: 18px; color: #efe9dc; }
.eyebrow {
  font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px;
  letter-spacing: 0.16em; text-transform: uppercase; color: #8f887a;
  margin: 0 0 10px;
}
h1 { font-weight: 400; font-size: 34px; line-height: 1.25; margin: 0 0 10px; color: #efe9dc; text-wrap: balance; }
.meta { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; color: #8f887a; margin: 0 0 34px; }
.meta a { color: #bfa15b; text-decoration: none; }
article h2, article h3, article h4 { font-weight: 400; color: #efe9dc; margin: 1.6em 0 0.5em; }
article h2 { font-size: 25px; } article h3 { font-size: 21px; }
article p { margin: 0 0 1.1em; }
article a { color: #bfa15b; }
article blockquote { margin: 1.4em 0; padding: 2px 0 2px 18px; border-left: 2px solid #bfa15b; color: #b8b1a2; }
article code { font-family: ui-monospace, monospace; font-size: 0.9em; background: #1b1915; padding: 1px 5px; border-radius: 4px; }
article pre { background: #1b1915; padding: 14px 16px; border-radius: 8px; overflow-x: auto; }
article pre code { background: none; padding: 0; }
article img { max-width: 100%; height: auto; border-radius: 8px; }
article hr { border: 0; border-top: 1px solid #2a2620; margin: 2em auto; width: 120px; }
.terms { margin-top: 44px; padding-top: 18px; border-top: 1px solid #2a2620;
  font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12.5px; color: #8f887a; }
.terms .chip { display: inline-block; border: 1px solid #2a2620; border-radius: 999px; padding: 2px 10px; margin: 0 6px 6px 0; }
"""


def _fmt_date(value: datetime | None) -> str:
    return value.strftime("%-d %B %Y") if value else ""


def render_post_html(
    *,
    title: str,
    slug: str,
    body_html: str,
    description: str,
    base_url: str,
    published_at: datetime | None,
    updated_at: datetime | None,
    categories: list[str],
    tags: list[str],
    site_name: str = "Theourgia",
) -> str:
    """The whole public page for one post, SEO surface included."""
    base = base_url.rstrip("/")
    canonical = f"{base}/blog/{slug}"
    desc = escape(description, quote=True)
    title_esc = escape(title)

    article_ld: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title,
        "description": description,
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "url": canonical,
        "publisher": {"@type": "Organization", "name": site_name, "url": base},
    }
    if published_at:
        article_ld["datePublished"] = published_at.isoformat()
    if updated_at:
        article_ld["dateModified"] = updated_at.isoformat()
    if tags:
        article_ld["keywords"] = ", ".join(tags)
    if categories:
        article_ld["articleSection"] = categories

    og_article_bits = "".join(
        [
            (
                f'<meta property="article:published_time" content="{published_at.isoformat()}"/>'
                if published_at
                else ""
            ),
            (
                f'<meta property="article:modified_time" content="{updated_at.isoformat()}"/>'
                if updated_at
                else ""
            ),
            *(
                f'<meta property="article:section" content="{escape(c, quote=True)}"/>'
                for c in categories
            ),
            *(
                f'<meta property="article:tag" content="{escape(t, quote=True)}"/>'
                for t in tags
            ),
        ]
    )

    terms_html = ""
    if categories or tags:
        chips = "".join(
            f'<span class="chip">{escape(term)}</span>' for term in [*categories, *tags]
        )
        terms_html = f'<div class="terms">{chips}</div>'

    date_line = ""
    if published_at:
        date_line = (
            f'<p class="meta"><time datetime="{published_at.date().isoformat()}">'
            f"{_fmt_date(published_at)}</time> · <a href=\"{base}/blog\">the journal</a></p>"
        )

    return (
        "<!doctype html>\n"
        '<html lang="en">\n<head>\n'
        '<meta charset="utf-8"/>\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1"/>\n'
        f"<title>{title_esc} · {escape(site_name)}</title>\n"
        f'<meta name="description" content="{desc}"/>\n'
        f'<link rel="canonical" href="{canonical}"/>\n'
        f'<meta property="og:type" content="article"/>\n'
        f'<meta property="og:site_name" content="{escape(site_name, quote=True)}"/>\n'
        f'<meta property="og:title" content="{escape(title, quote=True)}"/>\n'
        f'<meta property="og:description" content="{desc}"/>\n'
        f'<meta property="og:url" content="{canonical}"/>\n'
        f"{og_article_bits}\n"
        f'<meta name="twitter:card" content="summary"/>\n'
        f'<meta name="twitter:title" content="{escape(title, quote=True)}"/>\n'
        f'<meta name="twitter:description" content="{desc}"/>\n'
        f'<link rel="alternate" type="application/rss+xml" title="{escape(site_name, quote=True)} · Blog" href="{base}/api/v1/blog/feed.rss"/>\n'
        f'<script type="application/ld+json">{json.dumps(article_ld, ensure_ascii=False)}</script>\n'
        f"<style>{_PAGE_CSS}</style>\n"
        "</head>\n<body>\n"
        '<div class="wrap">\n'
        f'<header class="site"><a class="name" href="{base}/">{escape(site_name)}</a>'
        f'<a href="{base}/blog">Journal</a></header>\n'
        "<main>\n<article>\n"
        '<p class="eyebrow">From the journal</p>\n'
        f"<h1>{title_esc}</h1>\n"
        f"{date_line}\n"
        f"{body_html}\n"
        f"{terms_html}\n"
        "</article>\n</main>\n"
        "</div>\n</body>\n</html>\n"
    )
