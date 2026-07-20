"""Memorial-mode hourly sweep — v1-018 · plan/15 §13.

Celery beat fires :func:`run_memorial_sweep` once an hour (see
:mod:`theourgia.core.tasks.app`). For every :class:`MemorialConfig`
with a cadence set and not yet memorialized, the sweep computes the
state via the SAME function the router uses
(:func:`theourgia.core.memorial.compute_state`) and:

1. **Warning** — first time a config is seen in the warning window,
   dispatches a check-in reminder to the OWNER through the
   notification substrate (in-app + email by default; the user's
   preferences apply). ``warning_notified_at`` is the idempotency
   marker; the check-in endpoint clears it so a future lapse cycle
   notifies again.

2. **Trigger** — when the warning window has fully lapsed
   (``memorial_pending``), sets ``memorialized_at`` — the vault enters
   read-only memorial mode. If an executor email is configured and
   not yet notified, sends the executor a factual notice with a link
   to the guided-steps documentation, then sets
   ``executor_notified_at`` (cleared on reactivate).

3. **Posthumous release** — for memorialized configs with
   ``posthumous_publications_enabled``, publishes entries flagged
   ``publish_on_death`` that are still unpublished, through the SAME
   code path as the publish endpoint
   (:func:`theourgia.api.routers.v1.entries.apply_publish`). Sealed
   and closed-tradition entries refuse there and are log-skipped —
   they are NEVER auto-published.

Failure semantics mirror the backup task: an error while processing
one config is logged and never aborts the sweep for the others.
Notification copy here is backend-generated email/inbox text (not
designed UI copy) — kept warm + matter-of-fact to match the memorial
surface register.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.email.templates import EmailTemplate, default_registry
from theourgia.core.memorial import compute_state, days_until_pending
from theourgia.core.notifications import (
    DeliveryChannel,
    NotificationTemplate,
    default_notification_registry,
)
from theourgia.core.tasks.app import celery_app
from theourgia.models.entries import Entry
from theourgia.models.memorial import MemorialConfig

__all__ = [
    "CHECK_IN_REMINDER_TEMPLATE",
    "EXECUTOR_NOTICE_TEMPLATE",
    "run_memorial_sweep",
    "sweep_memorial_configs",
]


log = logging.getLogger(__name__)


# ── Templates ─────────────────────────────────────────────────────
#
# Registered here at import time, per the substrate convention
# ("templates live next to the code that triggers them"). Both are
# factual, warm, matter-of-fact — no urgency, no countdown-doom.

CHECK_IN_REMINDER_TEMPLATE = "memorial.check_in_reminder"
EXECUTOR_NOTICE_TEMPLATE = "memorial.executor_notice"

if not default_notification_registry.has(CHECK_IN_REMINDER_TEMPLATE):
    default_notification_registry.register(
        NotificationTemplate(
            name=CHECK_IN_REMINDER_TEMPLATE,
            kind="memorial",
            subject="Your Theourgia check-in window is closing",
            body_text=(
                "It has been a while since your last check-in. If we "
                "don't hear from you within about $days_remaining days, "
                "the vault will enter memorial mode. If you're here, a "
                "quick check-in resets everything."
            ),
            action_url="$base_url/memorial",
            action_label="Check in",
            default_channels=(DeliveryChannel.IN_APP, DeliveryChannel.EMAIL),
            description=(
                "Check-in reminder sent once when a vault enters the "
                "memorial warning window."
            ),
        )
    )

if not default_registry.has(EXECUTOR_NOTICE_TEMPLATE):
    default_registry.register(
        EmailTemplate(
            name=EXECUTOR_NOTICE_TEMPLATE,
            subject="A Theourgia vault has entered memorial mode",
            body_text=(
                "Hello$executor_name_suffix,\n"
                "\n"
                "You were named the digital executor for a Theourgia "
                "vault. The vault's check-in window has lapsed, and it "
                "has now entered memorial mode: its public content is "
                "preserved as a read-only in-memoriam surface, and its "
                "private content stays sealed.\n"
                "\n"
                "There is no immediate action required. When you are "
                "ready, the guided steps for executors are here:\n"
                "\n"
                "$docs_url\n"
                "\n"
                "If this is unexpected — the vault's operator may simply "
                "have missed a check-in — they can sign in and "
                "reactivate the vault at any time.\n"
            ),
            description=(
                "Notice to the designated digital executor when a vault "
                "memorializes via the automatic trigger."
            ),
        )
    )


# ── Notification dispatch (injectable for tests) ──────────────────

OwnerNotifier = Callable[[MemorialConfig, int | None], Awaitable[None]]
ExecutorNotifier = Callable[[MemorialConfig], Awaitable[None]]


async def _notify_owner_default(
    config: MemorialConfig, days_remaining: int | None,
) -> None:
    """Dispatch the check-in reminder through the notification
    substrate — in-app + email, user preferences applied."""
    from theourgia.core.config import get_settings
    from theourgia.core.email.factory import build_email_service
    from theourgia.core.notifications import (
        EmailChannel,
        InAppChannel,
        NotificationService,
    )
    from theourgia.core.notifications.db import (
        DbPreferenceResolver,
        DbRecipientLookup,
    )

    settings = get_settings()
    service = NotificationService(
        channels=(
            InAppChannel(),
            EmailChannel(build_email_service(settings)),
        ),
        recipients=DbRecipientLookup(),
        preferences=DbPreferenceResolver(),
    )
    await service.send_to_user(
        user_id=config.owner_id,
        template=CHECK_IN_REMINDER_TEMPLATE,
        context={
            "days_remaining": days_remaining if days_remaining is not None else 0,
            "base_url": str(settings.base_url).rstrip("/"),
        },
    )


async def _notify_executor_default(config: MemorialConfig) -> None:
    """Email the designated executor directly — executors are not
    platform users, so this goes through the email substrate rather
    than the (user-addressed) notification service."""
    from theourgia.core.config import get_settings
    from theourgia.core.email.factory import build_email_service

    settings = get_settings()
    service = build_email_service(settings)
    base_url = str(settings.base_url).rstrip("/")
    await service.send_template(
        EXECUTOR_NOTICE_TEMPLATE,
        to=config.executor_email or "",
        context={
            "executor_name_suffix": (
                f" {config.executor_name}" if config.executor_name else ""
            ),
            # Guided-steps documentation — /docs placeholder until
            # docs/user/digital-inheritance.md publishes (plan/15 §13).
            "docs_url": f"{base_url}/docs",
        },
        tags=("memorial",),
    )


# ── Sweep ─────────────────────────────────────────────────────────


async def release_posthumous_entries(
    session: AsyncSession,
    config: MemorialConfig,
    *,
    now: datetime | None = None,
) -> dict[str, int]:
    """Publish ``publish_on_death`` entries for a memorialized config.

    Goes through :func:`apply_publish` — the SAME path as the publish
    endpoint — so sealed + closed-tradition refusals hold here too.
    Refused entries are logged and skipped, never published. Caller
    commits.
    """
    # Late import: the router module imports FastAPI machinery the
    # worker doesn't otherwise need; also avoids an import cycle.
    from fastapi import HTTPException

    from theourgia.api.routers.v1.entries import apply_publish

    stmt = (
        select(Entry)
        .where(Entry.deleted_at.is_(None))
        .where(Entry.owner_id == config.owner_id)
        .where(Entry.publish_on_death.is_(True))
        .where(Entry.published_at.is_(None))
    )
    rows = (await session.execute(stmt)).scalars().all()

    published = 0
    skipped = 0
    for entry in rows:
        try:
            await apply_publish(session, entry, now=now)
        except HTTPException as exc:
            # Sealed / closed-tradition refusal — log-skip. The entry
            # stays flagged; it will be re-evaluated (and re-skipped)
            # next sweep, which is deliberate: unsealing or untagging
            # later makes it releasable without extra bookkeeping.
            skipped += 1
            log.info(
                "memorial.posthumous.skipped",
                extra={
                    "entry_id": str(entry.id),
                    "owner_id": str(config.owner_id),
                    "reason": exc.detail,
                },
            )
            continue
        published += 1
        log.info(
            "memorial.posthumous.published",
            extra={
                "entry_id": str(entry.id),
                "owner_id": str(config.owner_id),
            },
        )
    return {"published": published, "skipped": skipped}


async def sweep_memorial_configs(
    session: AsyncSession,
    *,
    now: datetime | None = None,
    notify_owner: OwnerNotifier | None = None,
    notify_executor: ExecutorNotifier | None = None,
) -> dict[str, int]:
    """One pass over every memorial config. Returns counters.

    Per-config errors are logged and never abort the sweep (mirrors
    the backup task's failure semantics). Caller does NOT need to
    commit — the sweep commits after each mutated config so a crash
    mid-sweep keeps completed work.
    """
    now = now or datetime.now(tz=UTC)
    notify_owner = notify_owner or _notify_owner_default
    notify_executor = notify_executor or _notify_executor_default

    # Cadence-driven configs move through warning → trigger; already-
    # memorialized configs (including manual triggers with cadence 0)
    # still need executor notification + posthumous release.
    stmt = select(MemorialConfig).where(
        (MemorialConfig.check_in_cadence_days > 0)
        | (MemorialConfig.memorialized_at.is_not(None))
    )
    configs = (await session.execute(stmt)).scalars().all()

    counters = {
        "examined": 0,
        "warnings_notified": 0,
        "triggered": 0,
        "executors_notified": 0,
        "posthumous_published": 0,
        "posthumous_skipped": 0,
        "errors": 0,
    }

    for config in configs:
        counters["examined"] += 1
        try:
            changed = False
            state = compute_state(config, now=now)

            if state == "warning" and config.warning_notified_at is None:
                await notify_owner(config, days_until_pending(config, now=now))
                config.warning_notified_at = now
                changed = True
                counters["warnings_notified"] += 1
                log.info(
                    "memorial.warning.notified",
                    extra={"owner_id": str(config.owner_id)},
                )

            if state == "memorial_pending":
                # The automatic trigger: cadence + warning window both
                # lapsed without a check-in.
                config.memorialized_at = now
                changed = True
                state = "memorialized"
                counters["triggered"] += 1
                log.info(
                    "memorial.triggered",
                    extra={"owner_id": str(config.owner_id)},
                )

            if (
                state == "memorialized"
                and config.executor_email
                and config.executor_notified_at is None
            ):
                await notify_executor(config)
                config.executor_notified_at = now
                changed = True
                counters["executors_notified"] += 1
                log.info(
                    "memorial.executor.notified",
                    extra={"owner_id": str(config.owner_id)},
                )

            if state == "memorialized" and config.posthumous_publications_enabled:
                released = await release_posthumous_entries(
                    session, config, now=now,
                )
                counters["posthumous_published"] += released["published"]
                counters["posthumous_skipped"] += released["skipped"]
                changed = changed or released["published"] > 0

            if changed:
                await session.commit()
        except Exception as exc:  # noqa: BLE001 — per-config isolation
            counters["errors"] += 1
            log.warning(
                "memorial.sweep.config_failed",
                extra={
                    "owner_id": str(config.owner_id),
                    "error": str(exc),
                },
            )

    return counters


@celery_app.task(
    name="theourgia.core.tasks.memorial.run_memorial_sweep",
    bind=True,
    max_retries=0,
)
def run_memorial_sweep(self: Any) -> dict[str, int]:  # noqa: ARG001
    """Celery wrapper — hourly beat entry point.

    No retries: the hourly cadence IS the retry; a failed sweep is
    fully caught up by the next one because every decision derives
    from persisted timestamps, not from delivery state.
    """
    from theourgia.core.db import task_session_scope

    async def _run() -> dict[str, int]:
        async with task_session_scope() as session:
            return await sweep_memorial_configs(session)

    return asyncio.run(_run())
