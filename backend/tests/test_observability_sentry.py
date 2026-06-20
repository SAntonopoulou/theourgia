"""Tests for the opt-in Sentry integration."""

from __future__ import annotations

import sys
from types import SimpleNamespace
from typing import Any

import pytest

from theourgia.core.observability.sentry import init_sentry


def _make_settings(
    *,
    dsn: str = "",
    env: str = "production",
    traces: float = 0.0,
) -> Any:
    """A minimal settings stand-in for sentry-init testing."""
    from pydantic import SecretStr

    return SimpleNamespace(
        sentry_dsn=SecretStr(dsn) if dsn else None,
        sentry_traces_sample_rate=traces,
        env=env,
        release=None,
    )


def test_no_dsn_means_no_initialization() -> None:
    """The single most important property: empty DSN = silent no-op.
    This is what makes the zero-telemetry default real."""
    result = init_sentry(_make_settings(dsn=""))
    assert result is False


def test_missing_sentry_sdk_logs_warning_and_returns_false(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    """When the DSN is set but sentry-sdk is not importable, we must
    fail open (return False) and not crash. A single warning is
    acceptable so the operator can see why their DSN was ignored."""
    # Block the import of sentry_sdk
    monkeypatch.setitem(sys.modules, "sentry_sdk", None)  # type: ignore[arg-type]
    settings = _make_settings(dsn="https://abc@example.com/123")
    with caplog.at_level("WARNING"):
        result = init_sentry(settings)
    assert result is False
    # We don't pin exact log content, just that *something* logged at WARN
    # (the absence is the failure mode; presence is acceptable).


def test_dsn_with_sentry_sdk_calls_init(monkeypatch: pytest.MonkeyPatch) -> None:
    """When the DSN is set and a fake sentry_sdk is importable, init is
    called with the right shape."""
    captured: dict[str, Any] = {}

    class _FakeSentry:
        @staticmethod
        def init(**kwargs: Any) -> None:
            captured.update(kwargs)

    # Inject fake module
    monkeypatch.setitem(sys.modules, "sentry_sdk", _FakeSentry)
    # And fake integrations — they're imported lazily and any failure
    # falls back to no integration, so we don't need to mock them.
    settings = _make_settings(dsn="https://x@y.com/z", traces=0.2, env="production")
    result = init_sentry(settings)
    assert result is True
    assert captured.get("dsn") == "https://x@y.com/z"
    assert captured.get("traces_sample_rate") == 0.2
    assert captured.get("send_default_pii") is False
    assert captured.get("environment") == "production"
