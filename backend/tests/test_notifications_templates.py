"""Tests for the notification template registry and rendering."""

from __future__ import annotations

import pytest

from theourgia.core.notifications.message import DeliveryChannel
from theourgia.core.notifications.templates import (
    NotificationTemplate,
    NotificationTemplateRegistry,
)


def test_template_renders_substitution() -> None:
    t = NotificationTemplate(
        name="entity.merged",
        kind="social",
        subject="Entity $name was merged",
        body_text="Your entity $name was merged into $into.",
    )
    r = t.render({"name": "Hekate", "into": "Hecate"})
    assert r.subject == "Entity Hekate was merged"
    assert r.body_text == "Your entity Hekate was merged into Hecate."


def test_template_with_html_and_action_url() -> None:
    t = NotificationTemplate(
        name="auth.session_revoked",
        kind="security",
        subject="Session revoked",
        body_text="A session was revoked from $location.",
        body_html="<p>A session was revoked from $location.</p>",
        action_url="https://t.example/security/sessions/$session_id",
        action_label="Review sessions",
    )
    r = t.render({"location": "Athens", "session_id": "abc123"})
    assert r.body_html == "<p>A session was revoked from Athens.</p>"
    assert r.action_url == "https://t.example/security/sessions/abc123"
    assert r.action_label == "Review sessions"


def test_template_rejects_empty_name() -> None:
    with pytest.raises(ValueError, match="name"):
        NotificationTemplate(
            name="", kind="x", subject="s", body_text="b"
        )


def test_template_rejects_non_dotted_name() -> None:
    with pytest.raises(ValueError, match="dotted"):
        NotificationTemplate(
            name="bare", kind="x", subject="s", body_text="b"
        )


def test_template_rejects_empty_kind() -> None:
    with pytest.raises(ValueError, match="kind"):
        NotificationTemplate(name="x.y", kind="", subject="s", body_text="b")


def test_template_rejects_empty_subject() -> None:
    with pytest.raises(ValueError, match="subject"):
        NotificationTemplate(name="x.y", kind="k", subject="", body_text="b")


def test_template_rejects_empty_body() -> None:
    with pytest.raises(ValueError, match="body_text"):
        NotificationTemplate(name="x.y", kind="k", subject="s", body_text="")


def test_template_rejects_empty_default_channels() -> None:
    with pytest.raises(ValueError, match="default_channels"):
        NotificationTemplate(
            name="x.y",
            kind="k",
            subject="s",
            body_text="b",
            default_channels=(),
        )


# ── Registry ─────────────────────────────────────────────────────────


def test_registry_register_and_get() -> None:
    r = NotificationTemplateRegistry()
    t = NotificationTemplate(
        name="x.y", kind="k", subject="s", body_text="b"
    )
    r.register(t)
    assert r.get("x.y") is t


def test_registry_duplicate_rejected() -> None:
    r = NotificationTemplateRegistry()
    r.register(
        NotificationTemplate(name="x.y", kind="k", subject="s", body_text="b")
    )
    with pytest.raises(ValueError, match="already registered"):
        r.register(
            NotificationTemplate(
                name="x.y", kind="k", subject="s2", body_text="b2"
            )
        )


def test_registry_overwrite_flag() -> None:
    r = NotificationTemplateRegistry()
    r.register(
        NotificationTemplate(name="x.y", kind="k", subject="old", body_text="b")
    )
    r.register(
        NotificationTemplate(name="x.y", kind="k", subject="new", body_text="b"),
        overwrite=True,
    )
    assert r.get("x.y").subject == "new"


def test_registry_by_kind() -> None:
    r = NotificationTemplateRegistry()
    r.register(NotificationTemplate(name="a.b", kind="social", subject="s", body_text="b"))
    r.register(NotificationTemplate(name="c.d", kind="social", subject="s", body_text="b"))
    r.register(NotificationTemplate(name="e.f", kind="security", subject="s", body_text="b"))
    social = sorted(t.name for t in r.by_kind("social"))
    assert social == ["a.b", "c.d"]


def test_template_carries_default_channels() -> None:
    t = NotificationTemplate(
        name="x.y",
        kind="k",
        subject="s",
        body_text="b",
        default_channels=(DeliveryChannel.IN_APP, DeliveryChannel.EMAIL),
    )
    assert t.default_channels == (DeliveryChannel.IN_APP, DeliveryChannel.EMAIL)
