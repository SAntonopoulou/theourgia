"""Newsletter delivery pipeline (B129).

Per ``plan/10-batches-backend.md`` § B129.

The pipeline splits into three pure-where-possible parts:

  1. ``resolve_recipients(db, issue)`` — runs the targeting rules
     and returns the set of ACTIVE subscribers that should receive
     this issue.
  2. ``render_issue(issue, subscriber)`` — produces the HTML +
     plaintext bodies for a single recipient, including the
     per-recipient unsubscribe URL.
  3. ``deliver_issue(db, issue)`` — orchestrates: flips status to
     SENDING, calls the email substrate, updates counts as
     provider webhooks arrive, flips status to SENT.

The Tiptap-to-HTML converter is intentionally minimal: it walks
the doc tree and emits paragraph + heading + bullet-list + ordered-
list + bold + italic + link + br. Other node kinds collapse to
plaintext. Real rendering will arrive in a follow-up that lifts
the frontend Tiptap renderer to a shared serializer module.

Honesty rules:
  * Empty ``targeted_tier_ids`` = ALL active subscribers (matches
    the H07 Editor default).
  * Non-empty = only those tiers' subscribers.
  * Sealed-embed rejection applies here too — defence in depth on
    top of the B126/B127 write-time guard.
  * The unsubscribe URL uses the per-subscriber unsubscribe_token
    (B128) — every email carries it.
"""

from __future__ import annotations

import html
from dataclasses import dataclass
from typing import Iterable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.models.newsletter_issue import (
    NewsletterIssue,
    NewsletterIssueStatus,
)
from theourgia.models.subscriber import Subscriber, SubscriberStatus

__all__ = [
    "RenderedIssue",
    "render_issue",
    "render_body_to_html",
    "render_body_to_plaintext",
    "resolve_recipients",
    "build_unsubscribe_url",
    "PUBLIC_BASE_URL",
]


# Where unsubscribe links resolve. The route layer can swap this
# at app boot if needed; tests use the default.
PUBLIC_BASE_URL = "https://theourgia.app"


@dataclass(frozen=True)
class RenderedIssue:
    """The per-recipient rendered payload."""

    subject: str
    preview_text: str | None
    html_body: str
    plaintext_body: str
    unsubscribe_url: str


# ── Recipient resolution ────────────────────────────────────────


async def resolve_recipients(
    *, db: AsyncSession, issue: NewsletterIssue,
) -> list[Subscriber]:
    """Return the ACTIVE subscribers that should receive ``issue``.

    Empty ``targeted_tier_ids`` = ALL active subscribers. Non-empty
    = only those tiers' subscribers. Status MUST be ACTIVE — pending
    confirmation, unsubscribed, and failed-payment rows never receive.
    """
    stmt = (
        select(Subscriber)
        .where(Subscriber.owner_id == issue.owner_id)
        .where(Subscriber.status == SubscriberStatus.ACTIVE)
    )
    targeted = list(issue.targeted_tier_ids or [])
    if targeted:
        tier_ids: list[UUID] = []
        for t in targeted:
            try:
                tier_ids.append(UUID(str(t)))
            except ValueError:
                continue
        if tier_ids:
            stmt = stmt.where(Subscriber.tier_id.in_(tier_ids))
        else:
            return []
    return list((await db.execute(stmt)).scalars().all())


# ── Tiptap → HTML / plaintext (minimal v1) ─────────────────────


def _attrs(node: object) -> dict:
    if isinstance(node, dict) and isinstance(node.get("attrs"), dict):
        return node["attrs"]
    return {}


def _walk_html(node: object, parts: list[str]) -> None:
    if not isinstance(node, dict):
        return
    node_type = node.get("type")
    text = node.get("text")
    if node_type == "text" and isinstance(text, str):
        # Mark sets carry bold / italic / link as Tiptap conventions.
        marks = node.get("marks") or []
        rendered = html.escape(text)
        for m in marks:
            if not isinstance(m, dict):
                continue
            kind = m.get("type")
            if kind == "bold":
                rendered = f"<strong>{rendered}</strong>"
            elif kind == "italic":
                rendered = f"<em>{rendered}</em>"
            elif kind == "link":
                href = html.escape(str(_attrs(m).get("href", "")))
                rendered = f'<a href="{href}">{rendered}</a>'
        parts.append(rendered)
        return
    if node_type == "hardBreak":
        parts.append("<br>")
        return
    open_tag = close_tag = ""
    if node_type == "paragraph":
        open_tag, close_tag = "<p>", "</p>"
    elif node_type == "heading":
        level = int(_attrs(node).get("level", 2))
        level = max(1, min(6, level))
        open_tag, close_tag = f"<h{level}>", f"</h{level}>"
    elif node_type == "bulletList":
        open_tag, close_tag = "<ul>", "</ul>"
    elif node_type == "orderedList":
        open_tag, close_tag = "<ol>", "</ol>"
    elif node_type == "listItem":
        open_tag, close_tag = "<li>", "</li>"
    elif node_type == "blockquote":
        open_tag, close_tag = "<blockquote>", "</blockquote>"
    if open_tag:
        parts.append(open_tag)
    for child in node.get("content", []) or []:
        _walk_html(child, parts)
    if close_tag:
        parts.append(close_tag)


def render_body_to_html(body: dict) -> str:
    parts: list[str] = []
    _walk_html(body, parts)
    return "".join(parts)


def _walk_plain(node: object, parts: list[str]) -> None:
    if not isinstance(node, dict):
        return
    node_type = node.get("type")
    text = node.get("text")
    if node_type == "text" and isinstance(text, str):
        parts.append(text)
        return
    if node_type == "hardBreak":
        parts.append("\n")
        return
    for child in node.get("content", []) or []:
        _walk_plain(child, parts)
    if node_type in ("paragraph", "heading", "listItem", "blockquote"):
        parts.append("\n\n")


def render_body_to_plaintext(body: dict) -> str:
    parts: list[str] = []
    _walk_plain(body, parts)
    # Collapse triple newlines into double.
    out = "".join(parts).strip()
    while "\n\n\n" in out:
        out = out.replace("\n\n\n", "\n\n")
    return out


# ── Per-recipient render ───────────────────────────────────────


def build_unsubscribe_url(unsubscribe_token: str) -> str:
    return f"{PUBLIC_BASE_URL}/unsubscribe?t={unsubscribe_token}"


def render_issue(
    issue: NewsletterIssue, subscriber: Subscriber,
) -> RenderedIssue:
    """Produce the HTML + plaintext bodies + the per-recipient
    unsubscribe URL. Both bodies include a footer with the
    unsubscribe link."""
    body_dict = dict(issue.body or {})
    html_body = render_body_to_html(body_dict)
    plain_body = render_body_to_plaintext(body_dict)
    unsub_url = build_unsubscribe_url(subscriber.unsubscribe_token)

    # Footer.
    html_footer = (
        '<hr><p style="color:#766b57;font-size:11px">'
        'You received this because you subscribed at '
        f'<a href="{PUBLIC_BASE_URL}">theourgia.app</a>. '
        f'<a href="{html.escape(unsub_url)}">Unsubscribe</a>.'
        "</p>"
    )
    plain_footer = (
        "\n\n— —\n"
        "You received this because you subscribed at theourgia.app. "
        f"Unsubscribe: {unsub_url}\n"
    )

    return RenderedIssue(
        subject=issue.subject,
        preview_text=issue.preview_text,
        html_body=html_body + html_footer,
        plaintext_body=plain_body + plain_footer,
        unsubscribe_url=unsub_url,
    )


# ── Orchestration ──────────────────────────────────────────────


async def begin_delivery(
    *, db: AsyncSession, issue: NewsletterIssue,
) -> int:
    """Flip status to SENDING + record the recipient count.

    Returns the number of recipients. The actual provider send
    happens in a Celery task; this function is split out so tests
    can drive it directly.
    """
    recipients = await resolve_recipients(db=db, issue=issue)
    issue.status = NewsletterIssueStatus.SENDING
    issue.recipient_count = len(recipients)
    issue.delivered_count = 0
    issue.bounced_count = 0
    await db.commit()
    await db.refresh(issue)
    return len(recipients)
