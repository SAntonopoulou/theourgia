"""Blog feeds — RSS / Atom / JSON Feed for entries of kind=blog_post.

Per ``plan/04-journaling.md`` §13 (Blog platform): blog posts are
entries with ``kind = blog_post``, ``visibility = public``. The
public-facing render lives on the Astro public site; this module
ships the standard feed formats.

``GET /api/v1/blog/feed.xml``   — Atom 1.0
``GET /api/v1/blog/feed.rss``   — RSS 2.0
``GET /api/v1/blog/feed.json``  — JSON Feed 1.1
``GET /api/v1/blog/posts``      — list the blog post entries (paginated)

Per-vault feeds (``/v/{handle}/blog/feed.xml``) land when the
multi-tenant routing is settled.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from xml.sax.saxutils import escape

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.api.routers.v1.entries import EntryRead, _to_read
from theourgia.models.entries import EncryptionMode, Entry, EntryType, EntryVisibility

__all__ = ["router"]

router = APIRouter()


class BlogPostsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    posts: list[EntryRead]
    total: int
    limit: int
    offset: int


async def _fetch_published_posts(
    session: AsyncSession, *, limit: int = 100, offset: int = 0,
) -> tuple[list[Entry], int]:
    """Every public, non-encrypted, non-soft-deleted entry.

    b108-2ht: removed the ``type == BLOG_POST`` filter. The user
    mental model of "public means public" wins: any entry the user
    has explicitly made public shows on the blog, regardless of
    its entry type (observation, ritual log, dream, etc.). Before
    this fix, only entries whose type was specifically ``blog_post``
    surfaced, but the Editor UI has no type picker so users had no
    way to actually create a blog_post.

    Excludes posts whose ``scheduled_publish_at`` is in the future
    (the Batch 33 scheduler hasn't promoted them yet).
    """
    now = datetime.now(tz=UTC)
    base = (
        select(Entry)
        .where(Entry.deleted_at.is_(None))
        .where(Entry.visibility == EntryVisibility.PUBLIC)
        .where(Entry.encryption_mode == EncryptionMode.NONE)
        .where(
            (Entry.scheduled_publish_at.is_(None))
            | (Entry.scheduled_publish_at <= now)
        )
        .order_by(Entry.created_at.desc())
    )

    from sqlalchemy import func

    count_stmt = select(func.count()).select_from(base.subquery())
    total = int((await session.execute(count_stmt)).scalar_one())
    paged = base.limit(limit).offset(offset)
    rows = (await session.execute(paged)).scalars().all()
    return list(rows), total


@router.get(
    "/blog/posts",
    response_model=BlogPostsResponse,
    tags=["blog"],
)
async def list_blog_posts(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> BlogPostsResponse:
    rows, total = await _fetch_published_posts(session, limit=limit, offset=offset)
    return BlogPostsResponse(
        posts=[_to_read(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


# ── b108-2ht: single-post detail endpoint ─────────────────────────
#
# The blog surface at theourgia.com/blog needs to click through to a
# reader view. This endpoint returns a single public post (same
# public-visibility filter as the list) plus the full body — the
# list endpoint returns only excerpts.


@router.get(
    "/blog/posts/{post_id}",
    response_model=EntryRead,
    tags=["blog"],
)
async def get_blog_post(
    post_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> EntryRead:
    """One public post + its full body.

    Same filters as the list endpoint (visibility=public,
    non-encrypted, not deleted, scheduled window elapsed).
    Non-matching IDs 404 rather than 403 so we don't disclose
    the existence of a private entry.
    """
    now = datetime.now(tz=UTC)
    stmt = (
        select(Entry)
        .where(Entry.id == post_id)
        .where(Entry.deleted_at.is_(None))
        .where(Entry.visibility == EntryVisibility.PUBLIC)
        .where(Entry.encryption_mode == EncryptionMode.NONE)
        .where(
            (Entry.scheduled_publish_at.is_(None))
            | (Entry.scheduled_publish_at <= now)
        )
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Post not found.",
        )
    return _to_read(row)


@router.get(
    "/blog/feed.xml",
    response_class=Response,
    tags=["blog"],
)
async def atom_feed(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    """Atom 1.0 feed of the most recent 50 public blog posts."""
    rows, _ = await _fetch_published_posts(session, limit=50)
    now_iso = datetime.now(tz=UTC).isoformat()

    entries_xml: list[str] = []
    for row in rows:
        updated = (row.updated_at or row.created_at).isoformat()
        published = (row.scheduled_publish_at or row.created_at).isoformat()
        entries_xml.append(
            f"  <entry>\n"
            f"    <id>urn:theourgia:entry:{row.id}</id>\n"
            f"    <title>{escape(row.title)}</title>\n"
            f"    <updated>{updated}</updated>\n"
            f"    <published>{published}</published>\n"
            f"    <summary>{escape(row.excerpt)}</summary>\n"
            f"  </entry>"
        )

    body = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<feed xmlns="http://www.w3.org/2005/Atom">\n'
        '  <id>urn:theourgia:blog</id>\n'
        '  <title>Theourgia · Blog</title>\n'
        f'  <updated>{now_iso}</updated>\n'
        + "\n".join(entries_xml)
        + "\n</feed>\n"
    )
    return Response(content=body, media_type="application/atom+xml")


@router.get(
    "/blog/feed.rss",
    response_class=Response,
    tags=["blog"],
)
async def rss_feed(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    """RSS 2.0 feed of the most recent 50 public blog posts."""
    rows, _ = await _fetch_published_posts(session, limit=50)

    items_xml: list[str] = []
    for row in rows:
        pub = (row.scheduled_publish_at or row.created_at).strftime(
            "%a, %d %b %Y %H:%M:%S %z"
        )
        items_xml.append(
            f"  <item>\n"
            f"    <guid isPermaLink=\"false\">urn:theourgia:entry:{row.id}</guid>\n"
            f"    <title>{escape(row.title)}</title>\n"
            f"    <pubDate>{pub}</pubDate>\n"
            f"    <description>{escape(row.excerpt)}</description>\n"
            f"  </item>"
        )

    body = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<rss version="2.0">\n'
        '  <channel>\n'
        '    <title>Theourgia · Blog</title>\n'
        '    <description>Recent posts from Theourgia practitioners.</description>\n'
        '    <link>https://theourgia.com/blog</link>\n'
        + "\n".join(items_xml)
        + "\n  </channel>\n</rss>\n"
    )
    return Response(content=body, media_type="application/rss+xml")


@router.get(
    "/blog/feed.json",
    tags=["blog"],
)
async def json_feed(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict[str, object]:
    """JSON Feed 1.1 representation."""
    rows, _ = await _fetch_published_posts(session, limit=50)
    items: list[dict[str, object]] = []
    for row in rows:
        items.append({
            "id": f"urn:theourgia:entry:{row.id}",
            "title": row.title,
            "summary": row.excerpt,
            "date_published": (row.scheduled_publish_at or row.created_at).isoformat(),
            "date_modified": (row.updated_at or row.created_at).isoformat(),
        })
    return {
        "version": "https://jsonfeed.org/version/1.1",
        "title": "Theourgia · Blog",
        "home_page_url": "https://theourgia.com/blog",
        "feed_url": "https://theourgia.com/api/v1/blog/feed.json",
        "items": items,
    }
