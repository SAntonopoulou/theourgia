"""Tests for application settings loading."""

from __future__ import annotations

import os

import pytest

from theourgia.core.config import Settings, get_settings, reset_settings_cache


@pytest.fixture(autouse=True)
def _isolate_settings_cache() -> None:
    """Reset the lru_cache around get_settings between tests."""
    reset_settings_cache()
    yield
    reset_settings_cache()


def test_settings_defaults_in_test_env() -> None:
    """In the default test session env, Settings loads with empty secrets allowed."""
    s = Settings()
    assert s.env == "test"
    assert s.is_test
    assert not s.is_production
    assert not s.is_development


def test_get_settings_is_cached() -> None:
    a = get_settings()
    b = get_settings()
    assert a is b


def test_reset_settings_cache_returns_fresh() -> None:
    a = get_settings()
    reset_settings_cache()
    b = get_settings()
    assert a is not b


def test_secrets_required_in_production_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    """Production env without secrets must refuse to operate."""
    monkeypatch.setenv("THEOURGIA_ENV", "production")
    monkeypatch.delenv("THEOURGIA_SECRET_KEY", raising=False)
    monkeypatch.delenv("THEOURGIA_MASTER_ENCRYPTION_KEY", raising=False)
    reset_settings_cache()
    s = get_settings()
    with pytest.raises(RuntimeError, match="missing required secret"):
        s.require_secrets_or_raise()


def test_secrets_present_in_production_passes(monkeypatch: pytest.MonkeyPatch) -> None:
    """Production env WITH secrets does not raise."""
    monkeypatch.setenv("THEOURGIA_ENV", "production")
    monkeypatch.setenv("THEOURGIA_SECRET_KEY", "valid-secret-for-testing-purposes-only")
    monkeypatch.setenv(
        "THEOURGIA_MASTER_ENCRYPTION_KEY", "valid-master-key-for-testing-purposes"
    )
    reset_settings_cache()
    s = get_settings()
    # Should not raise
    s.require_secrets_or_raise()
    assert s.is_production


def test_test_env_skips_secret_enforcement(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test env never raises even with empty secrets."""
    monkeypatch.setenv("THEOURGIA_ENV", "test")
    monkeypatch.delenv("THEOURGIA_SECRET_KEY", raising=False)
    reset_settings_cache()
    s = get_settings()
    s.require_secrets_or_raise()  # must not raise
