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
