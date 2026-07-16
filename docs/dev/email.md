# Email — developer guide

How features send email in Theourgia. The substrate is set up so a feature writer never touches a provider library or constructs SMTP messages by hand — they register a template, then call `email_service.send_template(name, to, context)`.

## The substrate at a glance

```
core/email/
├── message.py          # EmailMessage, EmailAddress, Attachment dataclasses
├── templates.py        # TemplateRegistry + EmailTemplate
├── service.py          # EmailService — what features call into
├── factory.py          # build_email_service(settings)
└── backends/
    ├── base.py         # EmailBackend Protocol + EmailDeliveryError
    ├── console.py      # dev: prints to stderr
    ├── null.py         # tests: records sends
    ├── resend.py       # Resend API
    ├── smtp.py         # stdlib SMTP
    ├── transport.py    # EmailHTTPTransport Protocol + httpx default
    ├── postmark.py     # Postmark API
    ├── ses.py          # AWS SES v2 (hand-rolled SigV4, no boto3)
    └── mailgun.py      # Mailgun API
```

Plus `core/tasks/email.py` (Celery task for async dispatch) and `models/email.py` (`EmailLog` audit table).

## Pattern: registering a template

Templates live next to the feature that triggers them. For an auth feature:

```python
# theourgia/features/auth/templates.py
from theourgia.core.email.templates import EmailTemplate, default_registry

PASSWORD_RESET = EmailTemplate(
    name="auth.password_reset",
    subject="Reset your Theourgia passphrase",
    body_text=(
        "Hello $user_name,\n\n"
        "Click the link below to reset your passphrase. The link expires "
        "in 30 minutes.\n\n"
        "$reset_url\n\n"
        "If you didn't request this, you can safely ignore this email.\n"
    ),
    body_html=(
        "<p>Hello $user_name,</p>"
        "<p>Click the link below to reset your passphrase. "
        "The link expires in 30 minutes.</p>"
        '<p><a href="$reset_url">Reset passphrase</a></p>'
        "<p>If you didn't request this, you can safely ignore this email.</p>"
    ),
    description="Sent on password-reset request.",
)


def register() -> None:
    default_registry.register(PASSWORD_RESET)
```

Call `register()` from the feature's module init so it runs at import time. (A later batch will replace this manual wire-up with auto-discovery via the plugin extension-point system — until then, explicit is fine.)

## Pattern: sending from a feature

```python
from theourgia.api.deps import EmailServiceDep  # to be added in Phase 02
# For now, build the service from settings or inject it directly.

async def request_password_reset(user: User, reset_url: str) -> None:
    await email_service.send_template(
        "auth.password_reset",
        to=user.email,
        context={
            "user_name": user.display_name or user.email,
            "reset_url": reset_url,
        },
    )
```

### What `send_template` does for you

1. Looks up the template by name in the registry.
2. Renders subject + bodies with the supplied context (raises `KeyError` if a placeholder is missing — that's a bug worth surfacing).
3. Constructs an `EmailMessage` with the operator-configured default sender.
4. Hands the message to the configured backend.
5. Persists the result to `email_log` (when a `db_session` is supplied).
6. Returns an `EmailSendResult` with the provider's message ID.

## Pattern: dispatching asynchronously

For non-critical-path sends (welcome emails, digests, notifications), dispatch via Celery so the API responds quickly and the system retries automatically on transient provider failures:

```python
from theourgia.core.tasks.email import send_email_async

# Schedule for delivery (returns immediately)
send_email_async.delay(
    template_name="auth.password_reset",
    to=[user.email],
    context={"user_name": user.display_name, "reset_url": reset_url},
)
```

The task retries up to 5 times with exponential backoff (capped at 10 minutes) on any exception.

**Trade-off:** sync send (`await email_service.send_template(...)`) is simpler and lets the caller surface errors directly to the user; async dispatch keeps the request fast and survives transient outages. Use sync for password resets where the user is waiting; async for everything else.

## Pattern: testing

```python
import pytest
from theourgia.core.email.backends.null import NullEmailBackend
from theourgia.core.email.message import EmailAddress
from theourgia.core.email.service import EmailService
from theourgia.core.email.templates import TemplateRegistry


@pytest.fixture
def email_service():
    registry = TemplateRegistry()
    register_my_feature_templates(registry)  # whatever the feature does
    backend = NullEmailBackend()
    service = EmailService(
        backend=backend,
        default_sender=EmailAddress(email="test@theourgia.test"),
        registry=registry,
    )
    return service, backend


async def test_feature_sends_welcome_email(email_service):
    service, backend = email_service
    await my_feature.welcome_user(service, user)
    sent = backend.find_by_template("account.welcome")
    assert len(sent) == 1
    assert sent[0].to[0].email == user.email
```

The `NullEmailBackend` records every send in `backend.sent`; `find_by_template` and `find_by_recipient` are convenience methods for assertions.

## Style — when in doubt

- **Subject lines** stay under 78 characters; many clients truncate at 50.
- **Plain-text bodies** are mandatory; HTML bodies are nice-to-have. Many recipients prefer plain.
- **Avoid embedded tracking**. No open-tracking pixels, no link-rewriting. Theourgia's zero-telemetry promise extends to the messages it sends.
- **Tags** describe purpose (`onboarding`, `transactional`, `digest`) — never PII.
- **Never inline secrets or full URLs in the template definition**. Pass them via `context` so the template stays public-readable and rotatable.

## Adding a new provider

The seven backends today (console, null, smtp, resend, postmark, ses, mailgun) cover most cases, but adding one follows the same pattern:

1. Add `core/email/backends/<provider>.py` implementing the `EmailBackend` Protocol. For an HTTPS API provider, take an injected `EmailHTTPTransport` (see `backends/transport.py`) with the httpx default — no provider SDK, and tests never touch the network. Only reach for a provider package (and a `[email-<provider>]` extra in `pyproject.toml`) if the API genuinely can't be spoken as a plain POST.
2. Add settings fields to `core/config.py`.
3. Add a branch to `factory.build_backend_from_settings`.
4. Tests against a stubbed transport (see `tests/test_email_backends_v1.py` for the Postmark/SES/Mailgun examples, `tests/test_email_backends.py` for the older backends).

Aim for ~100 LOC per backend. Rules every backend keeps: one attempt per send (retries live in the service layer / Celery), a clean `EmailDeliveryError` on any failure, and no logging of message bodies or recipient lists.
