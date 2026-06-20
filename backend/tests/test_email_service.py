"""Tests for the EmailService orchestrator."""

from __future__ import annotations

from typing import Any

import pytest

from theourgia.core.email.backends.null import NullEmailBackend
from theourgia.core.email.message import EmailAddress
from theourgia.core.email.service import EmailService
from theourgia.core.email.templates import EmailTemplate, TemplateRegistry


@pytest.fixture
def backend() -> NullEmailBackend:
    return NullEmailBackend()


@pytest.fixture
def registry() -> TemplateRegistry:
    r = TemplateRegistry()
    r.register(
        EmailTemplate(
            name="auth.welcome",
            subject="Welcome, $name",
            body_text="Hello $name, welcome to Theourgia.",
            body_html="<p>Hello $name</p>",
        )
    )
    r.register(
        EmailTemplate(
            name="auth.password_reset",
            subject="Reset your password",
            body_text="Click here: $reset_url",
        )
    )
    return r


@pytest.fixture
def service(backend: NullEmailBackend, registry: TemplateRegistry) -> EmailService:
    return EmailService(
        backend=backend,
        default_sender=EmailAddress(email="theourgia@example.com", name="Theourgia"),
        registry=registry,
    )


# ── send_template ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_send_template_renders_and_sends(
    service: EmailService, backend: NullEmailBackend
) -> None:
    result = await service.send_template(
        "auth.welcome",
        to="alice@example.com",
        context={"name": "Alice"},
    )
    assert result.provider == "null"
    assert len(backend.sent) == 1
    msg = backend.sent[0]
    assert msg.subject == "Welcome, Alice"
    assert msg.body_text == "Hello Alice, welcome to Theourgia."
    assert msg.body_html == "<p>Hello Alice</p>"
    assert msg.template_name == "auth.welcome"
    assert msg.to[0].email == "alice@example.com"


@pytest.mark.asyncio
async def test_send_template_uses_default_sender(
    service: EmailService, backend: NullEmailBackend
) -> None:
    await service.send_template(
        "auth.welcome", to="x@y.com", context={"name": "X"}
    )
    assert backend.sent[0].sender.email == "theourgia@example.com"
    assert backend.sent[0].sender.name == "Theourgia"


@pytest.mark.asyncio
async def test_send_template_accepts_explicit_sender(
    service: EmailService, backend: NullEmailBackend
) -> None:
    custom = EmailAddress(email="other@example.com")
    await service.send_template(
        "auth.welcome",
        to="x@y.com",
        context={"name": "X"},
        sender=custom,
    )
    assert backend.sent[0].sender.email == "other@example.com"


@pytest.mark.asyncio
async def test_send_template_accepts_list_of_recipients(
    service: EmailService, backend: NullEmailBackend
) -> None:
    await service.send_template(
        "auth.welcome",
        to=["a@x.com", "b@x.com", "c@x.com"],
        context={"name": "Group"},
    )
    msg = backend.sent[0]
    assert len(msg.to) == 3
    assert {a.email for a in msg.to} == {"a@x.com", "b@x.com", "c@x.com"}


@pytest.mark.asyncio
async def test_send_template_carries_tags(
    service: EmailService, backend: NullEmailBackend
) -> None:
    await service.send_template(
        "auth.welcome",
        to="x@y.com",
        context={"name": "X"},
        tags=("onboarding",),
    )
    assert backend.sent[0].tags == ("onboarding",)


@pytest.mark.asyncio
async def test_send_template_with_cc_and_bcc(
    service: EmailService, backend: NullEmailBackend
) -> None:
    await service.send_template(
        "auth.welcome",
        to="x@y.com",
        context={"name": "X"},
        cc=["cc@y.com"],
        bcc=["bcc@y.com"],
    )
    msg = backend.sent[0]
    assert msg.cc[0].email == "cc@y.com"
    assert msg.bcc[0].email == "bcc@y.com"


@pytest.mark.asyncio
async def test_send_template_missing_template_raises_keyerror(
    service: EmailService,
) -> None:
    with pytest.raises(KeyError):
        await service.send_template("nope.x", to="a@b.com", context={})


@pytest.mark.asyncio
async def test_send_template_missing_context_var_raises_keyerror(
    service: EmailService,
) -> None:
    """$reset_url is required by the template but not supplied — should raise."""
    with pytest.raises(KeyError):
        await service.send_template(
            "auth.password_reset", to="a@b.com", context={}
        )


# ── dry-run ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_dry_run_does_not_call_backend(
    backend: NullEmailBackend, registry: TemplateRegistry
) -> None:
    service = EmailService(
        backend=backend,
        default_sender=EmailAddress(email="theourgia@example.com"),
        registry=registry,
        dry_run=True,
    )
    result = await service.send_template(
        "auth.welcome", to="a@b.com", context={"name": "X"}
    )
    assert "dry-run" in result.provider
    assert backend.sent == []  # backend never called


@pytest.mark.asyncio
async def test_dry_run_still_returns_accepted_recipients(
    backend: NullEmailBackend, registry: TemplateRegistry
) -> None:
    service = EmailService(
        backend=backend,
        default_sender=EmailAddress(email="theourgia@example.com"),
        registry=registry,
        dry_run=True,
    )
    result = await service.send_template(
        "auth.welcome", to="a@b.com", context={"name": "X"}
    )
    assert result.accepted_recipients == ("a@b.com",)


# ── send (raw message) ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_send_raw_message_passes_through(
    service: EmailService, backend: NullEmailBackend
) -> None:
    from theourgia.core.email.message import EmailMessage

    msg = EmailMessage(
        to=(EmailAddress(email="x@y.com"),),
        sender=EmailAddress(email="from@y.com"),
        subject="Direct",
        body_text="raw",
    )
    await service.send(msg)
    assert backend.sent[-1].subject == "Direct"
