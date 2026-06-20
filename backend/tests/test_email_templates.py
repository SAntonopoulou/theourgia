"""Tests for the email template registry and rendering."""

from __future__ import annotations

import pytest

from theourgia.core.email.templates import (
    EmailTemplate,
    RenderedEmail,
    TemplateRegistry,
)


def test_template_renders_simple_substitution() -> None:
    t = EmailTemplate(
        name="x.y",
        subject="Hello $name",
        body_text="Welcome, $name!",
    )
    rendered = t.render({"name": "Alice"})
    assert rendered.subject == "Hello Alice"
    assert rendered.body_text == "Welcome, Alice!"
    assert rendered.body_html is None


def test_template_renders_braced_substitution() -> None:
    t = EmailTemplate(
        name="x.y",
        subject="${greeting}, friend",
        body_text="See you ${when}.",
    )
    rendered = t.render({"greeting": "Salve", "when": "soon"})
    assert rendered.subject == "Salve, friend"
    assert rendered.body_text == "See you soon."


def test_template_html_and_text() -> None:
    t = EmailTemplate(
        name="x.y",
        subject="hi",
        body_text="plain $key",
        body_html="<p>html $key</p>",
    )
    rendered = t.render({"key": "value"})
    assert rendered.body_text == "plain value"
    assert rendered.body_html == "<p>html value</p>"


def test_template_missing_key_raises_by_default() -> None:
    t = EmailTemplate(name="x.y", subject="$missing", body_text="x")
    with pytest.raises(KeyError):
        t.render({})


def test_template_safe_substitute_keeps_missing_placeholder() -> None:
    t = EmailTemplate(
        name="x.y", subject="$missing", body_text="$gone", safe_substitute=True
    )
    rendered = t.render({})
    assert rendered.subject == "$missing"
    assert rendered.body_text == "$gone"


def test_template_rejects_empty_name() -> None:
    with pytest.raises(ValueError, match="name"):
        EmailTemplate(name="", subject="x", body_text="y")


def test_template_rejects_empty_subject() -> None:
    with pytest.raises(ValueError, match="subject"):
        EmailTemplate(name="x.y", subject="", body_text="y")


def test_template_rejects_no_body() -> None:
    with pytest.raises(ValueError, match="body_text"):
        EmailTemplate(name="x.y", subject="hi", body_text="")


# ── Registry ─────────────────────────────────────────────────────────


def test_registry_register_and_get() -> None:
    r = TemplateRegistry()
    t = EmailTemplate(name="auth.password_reset", subject="reset", body_text="x")
    r.register(t)
    assert r.get("auth.password_reset") is t
    assert r.has("auth.password_reset")


def test_registry_get_missing_raises_keyerror() -> None:
    r = TemplateRegistry()
    with pytest.raises(KeyError, match="not registered"):
        r.get("nope")


def test_registry_duplicate_registration_rejected_by_default() -> None:
    r = TemplateRegistry()
    t1 = EmailTemplate(name="x.y", subject="a", body_text="b")
    t2 = EmailTemplate(name="x.y", subject="c", body_text="d")
    r.register(t1)
    with pytest.raises(ValueError, match="already registered"):
        r.register(t2)


def test_registry_overwrite_flag_allows_replacement() -> None:
    r = TemplateRegistry()
    t1 = EmailTemplate(name="x.y", subject="old", body_text="o")
    t2 = EmailTemplate(name="x.y", subject="new", body_text="n")
    r.register(t1)
    r.register(t2, overwrite=True)
    assert r.get("x.y") is t2


def test_registry_all_returns_snapshot() -> None:
    r = TemplateRegistry()
    r.register(EmailTemplate(name="a.b", subject="x", body_text="y"))
    r.register(EmailTemplate(name="c.d", subject="x", body_text="y"))
    names = sorted(t.name for t in r.all())
    assert names == ["a.b", "c.d"]


def test_registry_clear() -> None:
    r = TemplateRegistry()
    r.register(EmailTemplate(name="a.b", subject="x", body_text="y"))
    assert r.has("a.b")
    r.clear()
    assert not r.has("a.b")


def test_rendered_email_is_frozen() -> None:
    rendered = RenderedEmail(subject="x", body_text="y", body_html=None)
    with pytest.raises(Exception):  # FrozenInstanceError
        rendered.subject = "z"  # type: ignore[misc]
