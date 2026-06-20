"""Verify the DB pool settings hook is wired correctly.

Companion to the 2026-06-21 foundation audit finding F: DB pool
parameters used to be hardcoded in core/db.py; they now flow from
:class:`Settings`. This test pins that wiring so a future refactor
can't quietly revert to hardcoded values.
"""

from __future__ import annotations

from theourgia.core.config import Settings


def test_pool_defaults_match_documented_values() -> None:
    """Defaults match what the audit recorded (no surprise regressions)."""
    s = Settings()
    assert s.db_pool_size == 10
    assert s.db_max_overflow == 20
    assert s.db_pool_recycle_seconds == 1800


def test_pool_size_settable_via_env(monkeypatch) -> None:
    monkeypatch.setenv("THEOURGIA_DB_POOL_SIZE", "25")
    s = Settings()
    assert s.db_pool_size == 25


def test_pool_max_overflow_settable_via_env(monkeypatch) -> None:
    monkeypatch.setenv("THEOURGIA_DB_MAX_OVERFLOW", "5")
    s = Settings()
    assert s.db_max_overflow == 5


def test_pool_recycle_settable_via_env(monkeypatch) -> None:
    monkeypatch.setenv("THEOURGIA_DB_POOL_RECYCLE_SECONDS", "900")
    s = Settings()
    assert s.db_pool_recycle_seconds == 900


def test_pool_size_must_be_positive(monkeypatch) -> None:
    from pydantic import ValidationError
    import pytest

    monkeypatch.setenv("THEOURGIA_DB_POOL_SIZE", "0")
    with pytest.raises(ValidationError):
        Settings()


def test_pool_recycle_min_one_minute(monkeypatch) -> None:
    """Reject sub-minute recycle values — pathologically short recycle
    thrashes connections and is almost always a misconfiguration."""
    from pydantic import ValidationError
    import pytest

    monkeypatch.setenv("THEOURGIA_DB_POOL_RECYCLE_SECONDS", "5")
    with pytest.raises(ValidationError):
        Settings()


def test_db_module_reads_settings(monkeypatch) -> None:
    """The engine factory in core/db.py references the Settings fields,
    not the old hardcoded literals."""
    import inspect

    from theourgia.core import db

    source = inspect.getsource(db.get_engine)
    assert "settings.db_pool_size" in source
    assert "settings.db_max_overflow" in source
    assert "settings.db_pool_recycle_seconds" in source
    # Bare literals should be gone
    assert "pool_size=10" not in source
    assert "max_overflow=20" not in source
    assert "pool_recycle=1800" not in source
