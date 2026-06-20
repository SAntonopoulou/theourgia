"""Shared pytest fixtures for the Theourgia backend test suite.

Fixtures here are stack-wide. Domain-specific fixtures live in nested
conftest files alongside the tests that use them.

Phase 01 fixtures (database, session, request-scoped settings, …) will
grow as the test surface needs them. The pattern: each test runs in its
own transaction that rolls back at teardown, so tests are isolated and
fast.
"""

from __future__ import annotations

import os
from collections.abc import Generator

import pytest


@pytest.fixture(autouse=True, scope="session")
def _set_test_environment() -> Generator[None, None, None]:
    """Force ``THEOURGIA_ENV=test`` for the duration of the test session.

    Many code paths check this to skip "required secret" enforcement and
    to relax other production-only behaviors.
    """
    prior = os.environ.get("THEOURGIA_ENV")
    os.environ["THEOURGIA_ENV"] = "test"
    try:
        yield
    finally:
        if prior is None:
            os.environ.pop("THEOURGIA_ENV", None)
        else:
            os.environ["THEOURGIA_ENV"] = prior
