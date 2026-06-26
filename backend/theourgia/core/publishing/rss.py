"""RSS 2.0 + Atom + JSON Feed serialisers (B130).

Per ``plan/10-batches-backend.md`` § B130.

Pure functions — take a list of feed-item dicts and emit the
serialised feed. Tests drive them directly.

Honesty rules:
  * Every feed item carries the publication's per-publication
    license slug AND the AGPLv3 site-wide credit in the rights /
    copyright field.
  * Sealed publications NEVER reach a feed (the caller filters
    them out before passing items here; this module trusts that
    contract).
  * Withdrawn publications NEVER reach a feed either.
"""

from __future__ import annotations

import html
import json
from dataclasses import dataclass
from datetime import datetime, timezone

__all__ = [
    "FeedItem",
    "FeedMeta",
    "AGPL_CREDIT",
    "build_rss",
    "build_atom",
    "build_json_feed",
]


AGPL_CREDIT = (
    "Powered by Theourgia (AGPLv3). https://theourgia.app"
)


@dataclass(frozen=True)
class FeedMeta:
    """Per-vault metadata for the feed envelope."""

    vault_slug: str
    title: str
    description: str
    public_base_url: str  # "https://theourgia.app"
    language: str = "en"


@dataclass(frozen=True)
class FeedItem:
    """One feed entry. The route translates each LIVE publication
    into one of these before calling the serialiser."""

    id: str  # UUID string
    slug: str
    title: str
    summary: str | None
    published_at: datetime
    updated_at: datetime
    author_label: str
    # Per-publication license slug (e.g. "cc_by", "cc_by_nc").
    license_slug: str
    license_label: str  # human readable, e.g. "CC-BY 4.0"


# ── Helpers ─────────────────────────────────────────────────────


def _publication_url(meta: FeedMeta, slug: str) -> str:
    return f"{meta.public_base_url}/reader/{meta.vault_slug}/{slug}"


def _rfc2822(dt: datetime) -> str:
    """RFC 2822 datetime — required by RSS 2.0 spec."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%a, %d %b %Y %H:%M:%S %z")


def _iso8601(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _rights_line(item: FeedItem) -> str:
    """The H07 honesty rule: every feed item carries BOTH the
    AGPLv3 site credit AND the per-publication license."""
    return f"{item.license_label}. {AGPL_CREDIT}"


# ── RSS 2.0 ─────────────────────────────────────────────────────


def build_rss(meta: FeedMeta, items: list[FeedItem]) -> str:
    """Render an RSS 2.0 channel."""
    parts: list[str] = []
    parts.append('<?xml version="1.0" encoding="UTF-8"?>')
    parts.append(
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/">'
    )
    parts.append("<channel>")
    parts.append(f"<title>{html.escape(meta.title)}</title>")
    parts.append(
        f"<link>{html.escape(meta.public_base_url)}/v/{meta.vault_slug}</link>"
    )
    parts.append(f"<description>{html.escape(meta.description)}</description>")
    parts.append(f"<language>{html.escape(meta.language)}</language>")
    parts.append(
        '<atom:link href="'
        f"{html.escape(meta.public_base_url)}/vaults/{meta.vault_slug}/feed.rss"
        '" rel="self" type="application/rss+xml" />'
    )
    parts.append(f"<copyright>{html.escape(AGPL_CREDIT)}</copyright>")
    for it in items:
        item_url = _publication_url(meta, it.slug)
        parts.append("<item>")
        parts.append(f"<title>{html.escape(it.title)}</title>")
        parts.append(f"<link>{html.escape(item_url)}</link>")
        parts.append(
            f'<guid isPermaLink="true">{html.escape(item_url)}</guid>'
        )
        parts.append(
            f"<pubDate>{_rfc2822(it.published_at)}</pubDate>"
        )
        if it.summary:
            parts.append(
                f"<description>{html.escape(it.summary)}</description>"
            )
        parts.append(f"<dc:creator>{html.escape(it.author_label)}</dc:creator>")
        parts.append(
            f"<dc:rights>{html.escape(_rights_line(it))}</dc:rights>"
        )
        parts.append("</item>")
    parts.append("</channel></rss>")
    return "".join(parts)


# ── Atom ────────────────────────────────────────────────────────


def build_atom(meta: FeedMeta, items: list[FeedItem]) -> str:
    """Render an Atom 1.0 feed."""
    parts: list[str] = []
    parts.append('<?xml version="1.0" encoding="UTF-8"?>')
    parts.append('<feed xmlns="http://www.w3.org/2005/Atom">')
    parts.append(f"<title>{html.escape(meta.title)}</title>")
    parts.append(f"<subtitle>{html.escape(meta.description)}</subtitle>")
    self_url = (
        f"{meta.public_base_url}/vaults/{meta.vault_slug}/feed.atom"
    )
    parts.append(
        f'<link rel="self" href="{html.escape(self_url)}"/>'
    )
    parts.append(
        f'<link rel="alternate" type="text/html" '
        f'href="{html.escape(meta.public_base_url)}/v/'
        f'{meta.vault_slug}"/>'
    )
    parts.append(f"<id>{html.escape(self_url)}</id>")
    if items:
        last_updated = max(items, key=lambda i: i.updated_at).updated_at
    else:
        last_updated = datetime.now(tz=timezone.utc)
    parts.append(f"<updated>{_iso8601(last_updated)}</updated>")
    parts.append(f"<rights>{html.escape(AGPL_CREDIT)}</rights>")
    for it in items:
        item_url = _publication_url(meta, it.slug)
        parts.append("<entry>")
        parts.append(f"<title>{html.escape(it.title)}</title>")
        parts.append(
            f'<link rel="alternate" type="text/html" '
            f'href="{html.escape(item_url)}"/>'
        )
        parts.append(f"<id>{html.escape(item_url)}</id>")
        parts.append(f"<published>{_iso8601(it.published_at)}</published>")
        parts.append(f"<updated>{_iso8601(it.updated_at)}</updated>")
        parts.append(
            f"<author><name>{html.escape(it.author_label)}</name></author>"
        )
        if it.summary:
            parts.append(
                f"<summary>{html.escape(it.summary)}</summary>"
            )
        parts.append(f"<rights>{html.escape(_rights_line(it))}</rights>")
        parts.append("</entry>")
    parts.append("</feed>")
    return "".join(parts)


# ── JSON Feed ───────────────────────────────────────────────────


def build_json_feed(meta: FeedMeta, items: list[FeedItem]) -> str:
    """Render a JSON Feed 1.1 document.

    https://www.jsonfeed.org/version/1.1/
    """
    doc = {
        "version": "https://jsonfeed.org/version/1.1",
        "title": meta.title,
        "description": meta.description,
        "language": meta.language,
        "home_page_url": f"{meta.public_base_url}/v/{meta.vault_slug}",
        "feed_url": (
            f"{meta.public_base_url}/vaults/{meta.vault_slug}/feed.json"
        ),
        "items": [
            {
                "id": _publication_url(meta, it.slug),
                "url": _publication_url(meta, it.slug),
                "title": it.title,
                "summary": it.summary or "",
                "date_published": _iso8601(it.published_at),
                "date_modified": _iso8601(it.updated_at),
                "authors": [{"name": it.author_label}],
                # Custom extension fields prefixed with _ per the
                # JSON Feed spec — these surface the H07 honesty
                # rule on every item.
                "_theourgia": {
                    "license_slug": it.license_slug,
                    "license_label": it.license_label,
                    "rights": _rights_line(it),
                },
            }
            for it in items
        ],
    }
    return json.dumps(doc, ensure_ascii=False, indent=2)
