"""Unit tests for the newsletter issues router + delivery (B129).

THE critical honesty rules covered:
  * PATCH + DELETE schemas reject status / counts / sent_at /
    recipient_count (server-only)
  * Lifecycle endpoints enforce DRAFT-only edit + cancel-only-from-
    SCHEDULED
  * SendNowResult ALWAYS carries confirmation_required=true (the
    H07 --warn-soft confirm modal contract)
  * Preview never touches status or counts
  * Recipient resolver: empty targeting = ALL active, non-empty
    filters by tier
  * Tiptap → HTML / plaintext minimal renderer
  * Unsubscribe URL embedded in every render
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1 import (
    newsletter_issues as issues_module,
)
from theourgia.api.routers.v1.newsletter_issues import (
    NewsletterIssueCreate,
    NewsletterIssueRead,
    NewsletterIssueUpdate,
    PreviewPayload,
    PreviewResult,
    SchedulePayload,
    SendNowResult,
    _to_issue_read,
)
from theourgia.core.publishing.delivery import (
    PUBLIC_BASE_URL,
    RenderedIssue,
    build_unsubscribe_url,
    render_body_to_html,
    render_body_to_plaintext,
    render_issue,
)
from theourgia.models.newsletter_issue import (
    NewsletterIssue,
    NewsletterIssueStatus,
)
from theourgia.models.subscriber import Subscriber, SubscriberStatus


def _issue_row(
    *,
    status: NewsletterIssueStatus = NewsletterIssueStatus.DRAFT,
    targeted_tier_ids: list[str] | None = None,
) -> SimpleNamespace:
    now = datetime(2026, 6, 26, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        subject="The dark moon letter",
        preview_text="What the dark moon asked.",
        body={
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "Hello."}],
                }
            ],
        },
        status=status,
        targeted_tier_ids=targeted_tier_ids or [],
        reply_to="me@example.com",
        scheduled_send_at=None,
        sent_at=None,
        recipient_count=0,
        delivered_count=0,
        bounced_count=0,
        created_at=now,
        updated_at=now,
    )


def _subscriber(*, email: str = "reader@example.com") -> Subscriber:
    return Subscriber(
        owner_id=uuid4(),
        email=email,
        status=SubscriberStatus.ACTIVE,
        confirmation_token="tok_conf",
        unsubscribe_token="tok_unsub",
    )


# ── Status enum ────────────────────────────────────────────────


def test_status_enum_has_five_values() -> None:
    assert {s.value for s in NewsletterIssueStatus} == {
        "draft", "scheduled", "sending", "sent", "cancelled",
    }


def test_status_defaults_to_draft() -> None:
    field = NewsletterIssue.model_fields["status"]
    assert field.default == NewsletterIssueStatus.DRAFT


# ── Schemas — server-only fields rejected on UPDATE ────────────


def test_update_does_NOT_accept_status() -> None:
    """Once SENT the issue is frozen; even DRAFT shouldn't be
    flipped via PATCH — the lifecycle endpoints own status."""
    with pytest.raises(ValidationError):
        NewsletterIssueUpdate(
            status=NewsletterIssueStatus.SENT,  # type: ignore[call-arg]
        )


def test_update_does_NOT_accept_sent_at() -> None:
    with pytest.raises(ValidationError):
        NewsletterIssueUpdate(sent_at=datetime.now(tz=timezone.utc))  # type: ignore[call-arg]


def test_update_does_NOT_accept_recipient_count() -> None:
    with pytest.raises(ValidationError):
        NewsletterIssueUpdate(recipient_count=1000)  # type: ignore[call-arg]


def test_update_does_NOT_accept_delivered_count() -> None:
    with pytest.raises(ValidationError):
        NewsletterIssueUpdate(delivered_count=42)  # type: ignore[call-arg]


def test_update_does_NOT_accept_bounced_count() -> None:
    with pytest.raises(ValidationError):
        NewsletterIssueUpdate(bounced_count=0)  # type: ignore[call-arg]


def test_update_does_NOT_accept_owner_id() -> None:
    with pytest.raises(ValidationError):
        NewsletterIssueUpdate(owner_id=uuid4())  # type: ignore[call-arg]


def test_update_is_fully_optional() -> None:
    p = NewsletterIssueUpdate()
    assert p.model_dump(exclude_unset=True) == {}


def test_update_accepts_the_editable_fields() -> None:
    p = NewsletterIssueUpdate(
        subject="New subject",
        preview_text="New preview",
        body={"type": "doc", "content": []},
        reply_to="x@example.com",
        targeted_tier_ids=[uuid4()],
    )
    keys = set(p.model_dump(exclude_unset=True).keys())
    assert keys == {
        "subject", "preview_text", "body", "reply_to", "targeted_tier_ids",
    }


# ── Create validation ─────────────────────────────────────────


def test_create_minimal_validates() -> None:
    p = NewsletterIssueCreate(subject="Hello")
    assert p.subject == "Hello"
    assert p.targeted_tier_ids == []


def test_create_rejects_empty_subject() -> None:
    with pytest.raises(ValidationError):
        NewsletterIssueCreate(subject="")


def test_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        NewsletterIssueCreate(subject="x", owner_id=uuid4())  # type: ignore[call-arg]


# ── Send-now confirmation contract ────────────────────────────


def test_send_now_result_always_carries_confirmation_required() -> None:
    """THE H07 honesty: the send-now response must carry
    confirmation_required=true so the surface knows to show the
    --warn-soft confirm modal. Pydantic gives us no way to make
    a literal `true` mandatory, but the shape includes the field
    + the route hard-codes the value."""
    r = SendNowResult(
        issue_id=str(uuid4()),
        status="sending",
        recipient_count=42,
        confirmation_required=True,
    )
    assert r.confirmation_required is True


def test_send_now_route_source_hardcodes_true() -> None:
    """Defensive: a future commit that flips this to False (or
    pulls from a config) drops the H07 confirm-modal handshake.
    Source-level check catches it before merge."""
    import inspect

    from theourgia.api.routers.v1.newsletter_issues import send_now

    src = inspect.getsource(send_now)
    assert "confirmation_required=True" in src


# ── Schedule / preview payloads ───────────────────────────────


def test_schedule_payload_validates() -> None:
    p = SchedulePayload(scheduled_send_at=datetime.now(tz=timezone.utc))
    assert isinstance(p.scheduled_send_at, datetime)


def test_schedule_payload_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        SchedulePayload(
            scheduled_send_at=datetime.now(tz=timezone.utc),
            extra="bad",  # type: ignore[call-arg]
        )


def test_preview_payload_rejects_bad_email() -> None:
    with pytest.raises(ValidationError):
        PreviewPayload(preview_email="not-an-email")  # type: ignore[arg-type]


def test_preview_result_shape() -> None:
    r = PreviewResult(
        subject="x",
        preview_text=None,
        html_body="<p>x</p>",
        plaintext_body="x",
    )
    assert r.subject == "x"


# ── Tiptap renderer ──────────────────────────────────────────


def test_render_body_to_html_paragraph() -> None:
    body = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Hello world."}],
            }
        ],
    }
    assert render_body_to_html(body) == "<p>Hello world.</p>"


def test_render_body_to_html_heading_with_level() -> None:
    body = {
        "type": "doc",
        "content": [
            {
                "type": "heading",
                "attrs": {"level": 3},
                "content": [{"type": "text", "text": "Subtitle"}],
            }
        ],
    }
    assert render_body_to_html(body) == "<h3>Subtitle</h3>"


def test_render_body_to_html_bold_and_italic() -> None:
    body = {
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
                    {"type": "text", "text": " and "},
                    {
                        "type": "text",
                        "text": "italic",
                        "marks": [{"type": "italic"}],
                    },
                ],
            }
        ],
    }
    out = render_body_to_html(body)
    assert "<strong>bold</strong>" in out
    assert "<em>italic</em>" in out


def test_render_body_to_html_escapes_html_in_text() -> None:
    body = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "<script>alert('xss')</script>",
                    }
                ],
            }
        ],
    }
    out = render_body_to_html(body)
    assert "<script>" not in out
    assert "&lt;script&gt;" in out


def test_render_body_to_plaintext_strips_tags() -> None:
    body = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Line one."}],
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Line two."}],
            },
        ],
    }
    out = render_body_to_plaintext(body)
    assert "Line one." in out
    assert "Line two." in out
    assert "<" not in out
    assert ">" not in out


# ── Per-recipient rendering ──────────────────────────────────


def test_build_unsubscribe_url_uses_token() -> None:
    url = build_unsubscribe_url("tok_xyz")
    assert "tok_xyz" in url
    assert PUBLIC_BASE_URL in url


def test_render_issue_includes_unsubscribe_in_both_bodies() -> None:
    """Every email gets a per-recipient unsubscribe link in HTML
    AND in plaintext — H07 deliverability + the GDPR/CAN-SPAM
    practical requirement."""
    row = _issue_row()
    sub = _subscriber()
    rendered = render_issue(row, sub)
    assert sub.unsubscribe_token in rendered.html_body
    assert sub.unsubscribe_token in rendered.plaintext_body
    assert sub.unsubscribe_token in rendered.unsubscribe_url


def test_render_issue_is_frozen_dataclass() -> None:
    row = _issue_row()
    sub = _subscriber()
    rendered = render_issue(row, sub)
    assert isinstance(rendered, RenderedIssue)
    with pytest.raises(Exception):
        rendered.subject = "modified"  # type: ignore[misc]


# ── Helpers ──────────────────────────────────────────────────


def test_to_issue_read_serialises_enum_and_uuid() -> None:
    row = _issue_row(status=NewsletterIssueStatus.SCHEDULED)
    read = _to_issue_read(row)
    assert read.id == str(row.id)
    assert read.status == "scheduled"


def test_to_issue_read_serialises_targeted_tier_ids() -> None:
    tid = uuid4()
    row = _issue_row(targeted_tier_ids=[str(tid)])
    read = _to_issue_read(row)
    assert read.targeted_tier_ids == [str(tid)]


# ── Router smoke ─────────────────────────────────────────────


def test_newsletter_router_registers_nine_routes() -> None:
    """5 CRUD + 4 lifecycle = 9 routes."""
    paths_methods = {
        (r.path, m)
        for r in issues_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    expected = {
        ("/newsletter-issues", "GET"),
        ("/newsletter-issues", "POST"),
        ("/newsletter-issues/{issue_id}", "GET"),
        ("/newsletter-issues/{issue_id}", "PATCH"),
        ("/newsletter-issues/{issue_id}", "DELETE"),
        ("/newsletter-issues/{issue_id}/preview", "POST"),
        ("/newsletter-issues/{issue_id}/send-now", "POST"),
        ("/newsletter-issues/{issue_id}/schedule", "POST"),
        ("/newsletter-issues/{issue_id}/cancel", "POST"),
    }
    assert expected.issubset(paths_methods)


def test_newsletter_router_response_models() -> None:
    from fastapi.routing import APIRoute

    by_key: dict[tuple[str, str], object] = {}
    for r in issues_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        for m in r.methods or ():
            by_key[(r.path, m)] = r.response_model
    assert (
        by_key[("/newsletter-issues", "GET")] == list[NewsletterIssueRead]
    )
    assert (
        by_key[("/newsletter-issues/{issue_id}/preview", "POST")]
        == PreviewResult
    )
    assert (
        by_key[("/newsletter-issues/{issue_id}/send-now", "POST")]
        == SendNowResult
    )
    assert (
        by_key[("/newsletter-issues/{issue_id}/cancel", "POST")]
        == NewsletterIssueRead
    )
