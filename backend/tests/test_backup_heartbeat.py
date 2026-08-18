"""The backup dead-man's-switch pings only on success, and never fails
the backup when the ping cannot be delivered."""

from __future__ import annotations

import pytest

from theourgia.core.tasks import backup as backup_mod


async def test_heartbeat_is_a_noop_when_unconfigured() -> None:
    # No URL set → nothing sent, nothing raised.
    await backup_mod._ping_heartbeat(None)
    await backup_mod._ping_heartbeat("")


async def test_heartbeat_pings_the_configured_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    class _FakeResponse:
        status_code = 200

    class _FakeClient:
        def __init__(self, *a: object, **k: object) -> None: ...
        async def __aenter__(self) -> "_FakeClient":
            return self

        async def __aexit__(self, *a: object) -> None: ...
        async def get(self, url: str) -> _FakeResponse:
            calls.append(url)
            return _FakeResponse()

    import httpx

    monkeypatch.setattr(httpx, "AsyncClient", _FakeClient)
    await backup_mod._ping_heartbeat("https://hc.example/ping/abc")
    assert calls == ["https://hc.example/ping/abc"]


async def test_a_failed_ping_does_not_raise(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class _BoomClient:
        def __init__(self, *a: object, **k: object) -> None: ...
        async def __aenter__(self) -> "_BoomClient":
            return self

        async def __aexit__(self, *a: object) -> None: ...
        async def get(self, url: str) -> None:
            raise OSError("network down")

    import httpx

    monkeypatch.setattr(httpx, "AsyncClient", _BoomClient)
    # A monitoring gap is logged, never raised — the backup already
    # succeeded and must not be undone by a dead check endpoint.
    await backup_mod._ping_heartbeat("https://hc.example/ping/abc")


def test_sentry_checkin_is_a_noop_without_the_sdk() -> None:
    """On an install without sentry-sdk (the default), the cron check-in
    is a silent no-op — it never raises, never blocks a backup."""
    from theourgia.core.tasks import backup as backup_mod

    # sentry-sdk is an optional extra; when absent the import fails and the
    # helper returns None. (Also covers the DSN-unset case in the same path.)
    assert backup_mod._sentry_backup_checkin("in_progress") is None
    assert backup_mod._sentry_backup_checkin("ok", check_in_id="x") is None


def test_sentry_checkin_sends_when_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """With a configured Sentry client, the helper opens/closes a cron
    check-in against the backup monitor slug."""
    import sys
    import types

    calls: list[dict] = []

    fake = types.ModuleType("sentry_sdk")

    class _Client:
        dsn = "https://k@o1.ingest.sentry.io/2"

    fake.get_client = lambda: _Client()  # type: ignore[attr-defined]
    crons = types.ModuleType("sentry_sdk.crons")

    def _capture_checkin(**kw: object) -> str:
        calls.append(kw)
        return "checkin-123"

    crons.capture_checkin = _capture_checkin  # type: ignore[attr-defined]
    fake.crons = crons  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "sentry_sdk", fake)
    monkeypatch.setitem(sys.modules, "sentry_sdk.crons", crons)

    from theourgia.core.tasks import backup as backup_mod

    cid = backup_mod._sentry_backup_checkin("in_progress")
    assert cid == "checkin-123"
    assert calls[0]["monitor_slug"] == "theourgia-scheduled-backup"
    assert calls[0]["status"] == "in_progress"
