"""Public, server-rendered pages — /blog/{slug} and /sitemap.xml.

The journal is the main feature of the self-hosted edition, and its
public posts need pages a crawler can read: server-rendered HTML with
the full SEO surface (see :mod:`theourgia.core.publishing.post_html`).
The static Astro site keeps the listing at /blog; these routes serve
the posts themselves and the sitemap. The frontend Caddy proxies
``/blog/*`` and ``/sitemap.xml`` here.

Old ``/blog-read?id={uuid}`` links keep working client-side; a UUID
arriving HERE redirects permanently to the slug address, so the two
never compete for rank.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.core.config import get_settings
from theourgia.core.publishing.post_html import render_post_html, tiptap_to_html
from theourgia.models.entries import EncryptionMode, Entry, EntryVisibility

__all__ = ["router"]

router = APIRouter()


def _public_post_filters(stmt):  # noqa: ANN001, ANN202 — sqlalchemy Select
    """The one public-visibility rule, same as the blog API."""
    now = datetime.now(tz=UTC)
    return (
        stmt.where(Entry.deleted_at.is_(None))
        .where(Entry.visibility == EntryVisibility.PUBLIC)
        .where(Entry.encryption_mode == EncryptionMode.NONE)
        .where(
            (Entry.scheduled_publish_at.is_(None))
            | (Entry.scheduled_publish_at <= now)
        )
    )


_NOT_FOUND_HTML = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Not found · Theourgia</title><meta name="robots" content="noindex"/>
<style>body{{margin:0;background:#100f0d;color:#d8d2c5;font-family:Cardo,Georgia,serif;
display:flex;min-height:100vh;align-items:center;justify-content:center}}
main{{text-align:center;padding:20px}}h1{{font-weight:400;color:#efe9dc}}
a{{color:#bfa15b}}</style></head>
<body><main><h1>Nothing is written here.</h1>
<p>The page may have been set aside, or the address mistyped.</p>
<p><a href="{base}/blog">Back to the journal</a></p></main></body></html>
"""


@router.get("/blog/{slug_or_id}", response_class=HTMLResponse, tags=["blog"])
async def public_post_page(
    slug_or_id: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    """One public post as a full server-rendered page."""
    settings = get_settings()
    base = (settings.base_url or "https://theourgia.com").rstrip("/")

    row: Entry | None = None
    stmt = _public_post_filters(select(Entry).where(Entry.slug == slug_or_id))
    row = (await session.execute(stmt)).scalar_one_or_none()

    if row is None:
        # A UUID from an old link: send it, permanently, to the slug.
        try:
            as_uuid = UUID(slug_or_id)
        except ValueError:
            as_uuid = None
        if as_uuid is not None:
            stmt = _public_post_filters(select(Entry).where(Entry.id == as_uuid))
            row = (await session.execute(stmt)).scalar_one_or_none()
            if row is not None and row.slug and row.slug != slug_or_id:
                return RedirectResponse(
                    url=f"{base}/blog/{row.slug}", status_code=301,
                )

    if row is None:
        return HTMLResponse(
            _NOT_FOUND_HTML.format(base=base), status_code=404,
        )

    description = (row.meta_description or row.excerpt or row.title)[:320]
    html = render_post_html(
        title=row.title,
        slug=row.slug or str(row.id),
        body_html=tiptap_to_html(row.body, row.body_text),
        description=description,
        base_url=base,
        published_at=row.published_at or row.created_at,
        updated_at=row.updated_at,
        categories=list(row.categories),
        tags=list(row.tags),
    )
    return HTMLResponse(html)


@router.get("/sitemap.xml", response_class=Response, tags=["blog"])
async def sitemap(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    """The site's map for crawlers: the fixed pages and every post."""
    settings = get_settings()
    base = (settings.base_url or "https://theourgia.com").rstrip("/")

    stmt = _public_post_filters(select(Entry)).order_by(Entry.created_at.desc())
    rows = (await session.execute(stmt.limit(5000))).scalars().all()

    urls: list[str] = [
        f"  <url><loc>{base}/</loc></url>",
        f"  <url><loc>{base}/blog</loc></url>",
    ]
    for row in rows:
        loc = f"{base}/blog/{row.slug or row.id}"
        lastmod = (row.updated_at or row.created_at).date().isoformat()
        urls.append(
            f"  <url><loc>{loc}</loc><lastmod>{lastmod}</lastmod></url>"
        )

    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )
    return Response(content=body, media_type="application/xml")
