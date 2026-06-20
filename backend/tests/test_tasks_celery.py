"""Tests for the Celery app configuration and beat schedule.

We don't spin up a real worker / broker. We test the *shape* of the
configured app — that it picks up the right settings, has the
expected tasks registered, and has the beat schedule we declared.
"""

from __future__ import annotations

from theourgia.core.tasks.app import build_celery_app, celery_app


def test_celery_app_uses_redis_broker() -> None:
    app = build_celery_app()
    assert "redis://" in app.conf.broker_url


def test_celery_app_json_only_serialization() -> None:
    app = build_celery_app()
    assert app.conf.task_serializer == "json"
    assert app.conf.result_serializer == "json"
    assert "json" in app.conf.accept_content
    # pickle must not be acceptable — it's a security hazard
    assert "pickle" not in app.conf.accept_content


def test_celery_app_reliability_flags() -> None:
    app = build_celery_app()
    assert app.conf.task_acks_late is True
    assert app.conf.task_reject_on_worker_lost is True
    assert app.conf.worker_prefetch_multiplier == 1
    assert app.conf.broker_connection_retry_on_startup is True


def test_celery_app_utc() -> None:
    app = build_celery_app()
    assert app.conf.timezone == "UTC"
    assert app.conf.enable_utc is True


def test_beat_schedule_has_daily_backup() -> None:
    app = build_celery_app()
    schedule = app.conf.beat_schedule
    assert "theourgia.backup.daily" in schedule
    daily = schedule["theourgia.backup.daily"]
    assert daily["task"] == "theourgia.core.tasks.backup.run_scheduled_backup"
    assert daily["kwargs"] == {"incremental": False}
    assert daily["options"]["queue"] == "backups"


def test_beat_schedule_has_hourly_incremental() -> None:
    app = build_celery_app()
    schedule = app.conf.beat_schedule
    assert "theourgia.backup.hourly_incremental" in schedule
    hourly = schedule["theourgia.backup.hourly_incremental"]
    assert hourly["task"] == "theourgia.core.tasks.backup.run_scheduled_backup"
    assert hourly["kwargs"]["incremental"] is True


def test_task_routes_send_backups_to_dedicated_queue() -> None:
    app = build_celery_app()
    routes = app.conf.task_routes
    assert "theourgia.core.tasks.backup.*" in routes
    assert routes["theourgia.core.tasks.backup.*"]["queue"] == "backups"


def test_module_singleton_is_a_celery_instance() -> None:
    from celery import Celery

    assert isinstance(celery_app, Celery)


def test_run_scheduled_backup_is_registered() -> None:
    """The scheduled-backup task must be registered with the app so
    Celery beat can dispatch it. Importing theourgia.core.tasks (which
    runs the registration via import side-effect) is enough."""
    import theourgia.core.tasks  # noqa: F401

    assert (
        "theourgia.core.tasks.backup.run_scheduled_backup"
        in celery_app.tasks
    )
