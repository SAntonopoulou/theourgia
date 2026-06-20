# Email — operator runbook

Theourgia ships with five outbound-email backends. Pick one at deploy time. Each is configured via environment variables; no secret ever lives in code.

## Choosing a backend

Set `THEOURGIA_EMAIL_BACKEND` to one of:

| Backend | When to use | Requires |
|---|---|---|
| `console` | Development — prints messages to stderr instead of sending | nothing |
| `null` | Tests — silently records sends without delivery | nothing |
| `resend` | Production with the Resend.com API (recommended for most operators) | `pip install theourgia[email-resend]` + `THEOURGIA_RESEND_API_KEY` |
| `smtp` | Production with any SMTP relay (Postfix, mail provider, etc.) | `THEOURGIA_SMTP_*` env vars |

Additional providers (SES, Postmark, Mailgun) land as additional backend modules. The substrate is set up so adding one is ~50 lines of code; ask in an issue if your provider isn't listed.

## Required settings (all backends)

| Variable | Purpose |
|---|---|
| `THEOURGIA_EMAIL_BACKEND` | Which backend to use |
| `THEOURGIA_EMAIL_DEFAULT_FROM` | The `From:` address on outbound mail (e.g. `theourgia@your-domain.tld`) |
| `THEOURGIA_EMAIL_DEFAULT_FROM_NAME` | Display name to pair with the From address (optional) |
| `THEOURGIA_EMAIL_DRY_RUN` | When `true`, the system behaves as if sending but skips actual delivery |

## Resend (recommended)

```bash
THEOURGIA_EMAIL_BACKEND=resend
THEOURGIA_RESEND_API_KEY=re_your_api_key_here
THEOURGIA_EMAIL_DEFAULT_FROM=theourgia@your-verified-domain.tld
```

You must verify the sending domain inside the Resend dashboard before the API key will accept sends. The default install does not include the `resend` package; install with `pip install theourgia[email-resend]`.

## SMTP

```bash
THEOURGIA_EMAIL_BACKEND=smtp
THEOURGIA_SMTP_HOST=smtp.your-provider.tld
THEOURGIA_SMTP_PORT=587
THEOURGIA_SMTP_USERNAME=your-username
THEOURGIA_SMTP_PASSWORD=your-password
THEOURGIA_SMTP_USE_STARTTLS=true
THEOURGIA_SMTP_USE_SSL=false
THEOURGIA_EMAIL_DEFAULT_FROM=theourgia@your-domain.tld
```

Use STARTTLS for port 587, SSL for port 465. The SMTP backend uses stdlib `smtplib` — works against Postfix, your mail provider's relay, or self-hosted setups.

## Dry-run for staging

A staging instance that should behave like production but not actually send:

```bash
THEOURGIA_EMAIL_BACKEND=resend
THEOURGIA_RESEND_API_KEY=re_real_key
THEOURGIA_EMAIL_DRY_RUN=true
```

Templates render, recipients are recorded in `email_log`, but no API call to Resend happens. Audit / observability look identical to production.

## Audit & diagnostics

Every send (success and failure) is logged to the `email_log` table. The admin dashboard surfaces:

- Total sends per template, per day
- Last failure and its provider error
- Per-recipient send history (admin-only)

Production observability:

- Structured log event `email.sent` (success) or `email.failed` (failure)
- Prometheus metrics (Phase 10 batch — `email_sent_total{template,outcome}`)

## When sending fails

1. Check `email_log` for the last failure row and its `error_message` column.
2. Check Sentry (if enabled) for the full traceback.
3. Re-send by dispatching the Celery task `theourgia.core.tasks.email.send_email_async` (the task has automatic retry with exponential backoff for the next 5 attempts).
4. For persistent failure, verify the backend's credentials and the sender-domain reputation. Most provider failures trace back to (a) unverified sending domain, (b) revoked / expired API key, or (c) SPF/DKIM/DMARC misalignment.

## Adding a template

Templates are defined in code by the feature that triggers them. See `docs/dev/email.md` for the developer pattern. As an operator you don't manage templates directly; you'll see the catalog in the admin dashboard once Phase 10 ships the UI surface.
