"""Tests for the cache factory."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from theourgia.core.cache.backends.memory import InMemoryCacheBackend
from theourgia.core.cache.backends.redis import RedisCacheBackend
from theourgia.core.cache.factory import (
    build_backend_from_settings,
    build_cache,
)


def _settings(**overrides: Any) -> SimpleNamespace:
    defaults = {
        "cache_backend": "memory",
        "redis_url": "redis://localhost:6379/0",
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def test_memory_backend_default() -> None:
    backend = build_backend_from_settings(_settings(cache_backend="memory"))
    assert isinstance(backend, InMemoryCacheBackend)


def test_redis_backend_selection() -> None:
    backend = build_backend_from_settings(_settings(cache_backend="redis"))
    assert isinstance(backend, RedisCacheBackend)


def test_case_insensitive_selection() -> None:
    backend = build_backend_from_settings(_settings(cache_backend="MEMORY"))
    assert isinstance(backend, InMemoryCacheBackend)


def test_unknown_backend_raises() -> None:
    with pytest.raises(ValueError, match="unknown cache backend"):
        build_backend_from_settings(_settings(cache_backend="quantum"))


def test_build_cache_returns_orchestrator() -> None:
    from theourgia.core.cache.cache import Cache

    cache = build_cache(_settings())
    assert isinstance(cache, Cache)
    assert cache.backend_name == "memory"
