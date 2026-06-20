"""Tests for the RLS GUC setter.

Structural tests against a mock session — full integration testing
against a real PostgreSQL with active RLS policies lands when the
PostgreSQL test-fixture infrastructure is set up in a subsequent batch.
"""

from __future__ import annotations

from uuid import uuid4

import pytest

from theourgia.core.authz.rls import GUC_NAME, clear_current_user_id, set_current_user_id


class _RecordingSession:
    """Minimal session double that captures executed SQL + params."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, dict | None]] = []

    async def execute(self, statement, params=None) -> None:  # type: ignore[no-untyped-def]
        # statement is a SQLAlchemy TextClause; coerce to its raw SQL.
        sql = str(statement)
        self.calls.append((sql, params))


def test_guc_name_uses_theourgia_namespace() -> None:
    assert GUC_NAME == "theourgia.current_user_id"
    assert "." in GUC_NAME, "Postgres custom GUC names must contain a dot"


@pytest.mark.asyncio
async def test_set_current_user_id_uses_set_config_with_is_local_true() -> None:
    session = _RecordingSession()
    uid = uuid4()
    await set_current_user_id(session, uid)  # type: ignore[arg-type]

    assert len(session.calls) == 1
    sql, params = session.calls[0]
    assert "set_config" in sql.lower()
    assert "true" in sql.lower(), "is_local must be true to scope the GUC"
    assert params == {"name": GUC_NAME, "value": str(uid)}


@pytest.mark.asyncio
async def test_set_current_user_id_rejects_non_uuid() -> None:
    session = _RecordingSession()
    with pytest.raises(ValueError, match="user_id must be a UUID"):
        await set_current_user_id(session, "not-a-uuid")  # type: ignore[arg-type]
    assert session.calls == [], "should not execute SQL on bad input"


@pytest.mark.asyncio
async def test_clear_current_user_id_clears_the_guc() -> None:
    session = _RecordingSession()
    await clear_current_user_id(session)  # type: ignore[arg-type]

    assert len(session.calls) == 1
    sql, params = session.calls[0]
    assert "set_config" in sql.lower()
    assert params == {"name": GUC_NAME}
    assert "''" in sql, "clear should pass an empty string value"
