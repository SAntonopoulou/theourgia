"""v1-041 — operator health dashboard aggregation.

The individual probes are failure-isolated: a probe that raises reports
degraded on its own card rather than 500ing the endpoint. These tests
exercise the pure probe logic with fake sessions (DB-less style).
"""

from __future__ import annotations

import asyncio

from theourgia.api.routers.v1 import admin_health as ah


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one(self):
        return self._value

    def scalar_one_or_none(self):
        return self._value

    def scalars(self):
        return self

    def first(self):
        return self._value


class _FakeSession:
    """Returns queued results per execute() call, in order."""

    def __init__(self, results):
        self._results = list(results)

    async def execute(self, *_a, **_k):
        return self._results.pop(0)


def test_database_probe_ok():
    session = _FakeSession([_ScalarResult(1)])
    probe = asyncio.run(ah._probe_database(session))
    assert probe.id == "database" and probe.status == "operational"


def test_database_probe_failure_is_isolated():
    class _Boom:
        async def execute(self, *_a, **_k):
            raise RuntimeError("connection refused")

    probe = asyncio.run(ah._probe_database(_Boom()))
    assert probe.status == "unavailable"
    assert "connection refused" in probe.detail


def test_migrations_probe_flags_pending():
    # Applied version well below the real newest migration file on disk
    # → the probe must report Pending (the deploy-safety signal).
    session = _FakeSession([_ScalarResult("0001")])
    probe = asyncio.run(ah._probe_migrations(session))
    assert probe.id == "migrations"
    assert probe.status == "degraded"
    assert "run alembic upgrade head" in probe.detail


def test_migrations_probe_ok_at_head():
    # Applied version at/above the newest file → Up to date.
    session = _FakeSession([_ScalarResult("9999")])
    probe = asyncio.run(ah._probe_migrations(session))
    assert probe.status == "operational"


def test_storage_probe_reports_backend(monkeypatch):
    from theourgia.core import config

    monkeypatch.setenv("THEOURGIA_STORAGE_BACKEND", "s3")
    config.get_settings.cache_clear()
    probe = ah._probe_storage()
    assert probe.status == "operational" and "s3" in probe.detail
    config.get_settings.cache_clear()


def test_agent_daemon_probe_pending_when_unset(monkeypatch):
    from theourgia.core import config

    monkeypatch.delenv("THEOURGIA_AGENT_DAEMON_URL", raising=False)
    config.get_settings.cache_clear()
    probe = ah._probe_agent_daemon()
    assert probe.status == "pending"
    config.get_settings.cache_clear()
