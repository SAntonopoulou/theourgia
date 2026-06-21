"""Celery application + beat schedule.

A single :class:`Celery` instance services the whole process. It's
configured once at import time from :class:`Settings` and re-used by
every task module (which decorates with ``@celery_app.task``).

Beat schedule entries are declared here so the operational surface is
visible in one place. Each entry specifies the task name, the cron
schedule, the queue, and any kwargs.

Why one app, not many: tasks share broker, result backend, and
serialization settings; splitting would multiply config-drift risk
without operational benefit at our scale.
"""

from __future__ import annotations

from typing import Final

from celery import Celery
from celery.schedules import crontab

from theourgia.core.config import get_settings

__all__ = ["celery_app", "build_celery_app"]


def build_celery_app() -> Celery:
    """Construct a fresh Celery app from current settings.

    Lives as a function (rather than just module-level construction)
    so tests can build their own instance with overridden settings
    without disturbing the global one.
    """
    settings = get_settings()
    broker = str(settings.redis_url)

    app = Celery(
        "theourgia",
        broker=broker,
        backend=broker,
    )

    app.conf.update(
        # Time
        timezone="UTC",
        enable_utc=True,
        # Serialization — JSON only; no pickle.
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        # Reliability
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        worker_prefetch_multiplier=1,
        broker_connection_retry_on_startup=True,
        # Observability
        task_track_started=True,
        task_send_sent_event=True,
        worker_send_task_events=True,
        # Defaults
        task_default_queue="default",
        task_default_exchange="default",
        task_default_routing_key="default",
    )

    # Routes — push backups to their own queue so a stuck backup never
    # starves quick-turnaround tasks (email, federation deliveries).
    app.conf.task_routes = {
        "theourgia.core.tasks.backup.*": {"queue": "backups"},
    }

    # Beat schedule — declared here so the schedule is reviewable in
    # source. Times are UTC.
    app.conf.beat_schedule = {
        "theourgia.backup.daily": {
            "task": "theourgia.core.tasks.backup.run_scheduled_backup",
            "schedule": crontab(hour=3, minute=15),
            "kwargs": {"incremental": False},
            "options": {"queue": "backups"},
        },
        "theourgia.backup.hourly_incremental": {
            "task": "theourgia.core.tasks.backup.run_scheduled_backup",
            # Every 6 hours — Restic is incremental by default, so a
            # "full" vs "incremental" distinction is more about retention
            # tags than payload size.
            "schedule": crontab(hour="*/6", minute=15),
            "kwargs": {"incremental": True},
            "options": {"queue": "backups"},
        },
        "theourgia.scheduler.promote_scheduled_entries": {
            "task": "theourgia.core.tasks.scheduler.run_promote_scheduled_entries",
            # Every minute — scheduled releases land within 60s of their
            # nominal time. Missed runs catch up via the SQL `<= now()`
            # predicate so we tolerate worker pauses gracefully.
            "schedule": crontab(minute="*"),
            "options": {"queue": "default"},
        },
        "theourgia.phase05.reminders": {
            "task": "theourgia.core.tasks.phase05.run_phase05_reminders",
            # Every 15 minutes — oaths / contracts / servitors /
            # recurring offerings don't need minute-level resolution;
            # the user reads them as part of the daily / weekly review.
            "schedule": crontab(minute="*/15"),
            "options": {"queue": "default"},
        },
    }

    return app


celery_app: Final[Celery] = build_celery_app()
"""Process-wide Celery app instance.

Reach for this from task modules with ``@celery_app.task``."""
