"""Scheduled-publication tests."""

from __future__ import annotations


def test_scheduler_task_module_imports() -> None:
    """Side-effect import registers the Celery task."""
    from theourgia.core.tasks import scheduler

    assert scheduler.run_promote_scheduled_entries is not None
    assert scheduler.promote_scheduled_entries is not None


def test_scheduler_beat_entry_registered() -> None:
    """The Celery beat schedule includes the promoter task."""
    from theourgia.core.tasks import celery_app

    schedule = celery_app.conf.beat_schedule
    assert "theourgia.scheduler.promote_scheduled_entries" in schedule
    entry = schedule["theourgia.scheduler.promote_scheduled_entries"]
    assert entry["task"] == (
        "theourgia.core.tasks.scheduler.run_promote_scheduled_entries"
    )


def test_target_visibility_blog_post_promotes_to_public() -> None:
    from theourgia.core.tasks.scheduler import _target_visibility
    from theourgia.models.entries import Entry, EntryType, EntryVisibility

    entry = Entry(
        title="A blog post",
        type=EntryType.BLOG_POST,
        excerpt="",
        glyph="feather",
        visibility=EntryVisibility.PERSONAL,
    )
    assert _target_visibility(entry) == EntryVisibility.PUBLIC


def test_target_visibility_other_kinds_preserve_user_choice() -> None:
    """A scheduled personal entry stays personal at promotion time."""
    from theourgia.core.tasks.scheduler import _target_visibility
    from theourgia.models.entries import Entry, EntryType, EntryVisibility

    entry = Entry(
        title="A scheduled personal entry",
        type=EntryType.NOTE,
        excerpt="",
        glyph="feather",
        visibility=EntryVisibility.PERSONAL,
    )
    assert _target_visibility(entry) == EntryVisibility.PERSONAL


def test_schedule_router_registered() -> None:
    from theourgia.api.routers.v1.schedule import router

    paths = {route.path for route in router.routes}
    assert "/schedule/upcoming" in paths
    assert "/schedule/{entry_id}" in paths
