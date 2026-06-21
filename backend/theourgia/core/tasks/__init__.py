"""Background tasks — Celery app, beat schedule, scheduled jobs.

Imported by the Celery worker entry point::

    celery -A theourgia.core.tasks worker --loglevel=info
    celery -A theourgia.core.tasks beat --loglevel=info

Tasks live in submodules grouped by domain (``backup``, future:
``federation``, ``email``, ``ai``). Each module imports the shared
``celery_app`` from :mod:`theourgia.core.tasks.app` and registers tasks
with the ``@celery_app.task`` decorator.

The Celery app picks up the broker from ``REDIS_URL`` and uses Redis
for both broker and result backend by default. Operators who want a
different broker swap the URL in their environment.
"""

from __future__ import annotations

from theourgia.core.tasks.app import celery_app

# Import side-effects: register tasks with the app
from theourgia.core.tasks import backup, email, scheduler  # noqa: F401

__all__ = ["celery_app", "backup", "email", "scheduler"]
