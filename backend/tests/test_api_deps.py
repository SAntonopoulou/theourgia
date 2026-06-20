"""Tests for FastAPI dependency injection: auth, db session, scope."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID, uuid4

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient

from theourgia.api.deps import (
    CurrentUser,
    OptionalCurrentUser,
    get_current_user,
    get_db_session,
    get_optional_current_user,
    require_scope,
)
from theourgia.api.errors import register_error_handlers
from theourgia.api.middleware import register_middleware
from theourgia.core.auth.tokens import generate_token, hash_token
from theourgia.core.authz import Scope
from theourgia.core.config import get_settings
from theourgia.core.ids import uuid7
from theourgia.models.identity import Session as SessionRow
from theourgia.models.identity import User


# ─────────────────────────────────────────────────────────────────────────────
# Stub session that returns prepared rows for selects
# ─────────────────────────────────────────────────────────────────────────────


class _ScalarResult:
    def __init__(self, value: object) -> None:
        self._value = value

    def scalar_one_or_none(self) -> object:
        return self._value

    def scalar_one(self) -> object:
        return self._value


class _StubSession:
    """Minimal AsyncSession double for dependency tests.

    Returns pre-configured rows when select() is executed against
    SessionRow or User models. Records GUC-setting SQL.
    """

    def __init__(self) -> None:
        self.session_rows_by_hash: dict[str, SessionRow] = {}
        self.users_by_id: dict[UUID, User] = {}
        self.executed_set_local: list[str] = []

    async def execute(self, statement, params=None):  # type: ignore[no-untyped-def]
        sql = str(statement)
        # GUC setter calls — record and return a no-op result
        if "SET LOCAL" in sql:
            self.executed_set_local.append(sql)
            return _ScalarResult(None)

        # SELECT from session — find by token_hash extracted from compiled stmt
        if "FROM session" in sql or '"session"' in sql:
            # The statement compiles to use a bind parameter; for testing
            # we cheat and inspect via the .whereclause text representation.
            try:
                compiled = statement.compile(compile_kwargs={"literal_binds": True})
            except Exception:
                compiled = None
            if compiled is None:
                return _ScalarResult(None)
            sql_text = str(compiled)
            # Find any session row whose hash appears in the compiled SQL
            for h, row in self.session_rows_by_hash.items():
                if h in sql_text:
                    return _ScalarResult(row)
            return _ScalarResult(None)

        # SELECT from user
        if 'FROM "user"' in sql or "FROM user" in sql:
            try:
                compiled = statement.compile(compile_kwargs={"literal_binds": True})
            except Exception:
                compiled = None
            if compiled is None:
                return _ScalarResult(None)
            sql_text = str(compiled)
            for uid, user in self.users_by_id.items():
                # SQLAlchemy serializes UUIDs without hyphens in literal
                # binds (``b343af64c00d45f8...``), but str(uid) is the
                # hyphenated form. Match either.
                if str(uid) in sql_text or uid.hex in sql_text:
                    return _ScalarResult(user)
            return _ScalarResult(None)

        return _ScalarResult(None)


@pytest.fixture
def stub_session() -> _StubSession:
    return _StubSession()


def _build_app(stub: _StubSession) -> FastAPI:
    """Build a tiny app that exercises the auth dependencies, with the
    DB-session dependency overridden to yield our stub."""
    app = FastAPI()
    register_error_handlers(app)
    register_middleware(app, get_settings())

    async def _override_db_session():  # noqa: ANN202
        yield stub

    app.dependency_overrides[get_db_session] = _override_db_session

    @app.get("/required")
    async def _required(user: CurrentUser) -> dict[str, str]:
        return {"id": str(user.id), "email": user.email}

    @app.get("/optional")
    async def _optional(user: OptionalCurrentUser) -> dict[str, str | None]:
        return {"id": str(user.id) if user else None}

    @app.get("/scoped")
    async def _scoped(
        user: Annotated[User, Depends(require_scope(Scope.ENTRY_READ))],
    ) -> dict[str, str]:
        return {"id": str(user.id)}

    return app


def _seed_user_and_session(
    stub: _StubSession,
    *,
    expires_in: timedelta = timedelta(hours=1),
    revoked: bool = False,
) -> str:
    """Insert a user + valid session into the stub. Returns the plaintext token."""
    user_id = uuid7()
    user = User(
        id=user_id,
        email=f"u-{user_id}@example.com",
        created_at=datetime.now(tz=UTC),
        updated_at=datetime.now(tz=UTC),
    )
    stub.users_by_id[user_id] = user

    plain = generate_token()
    h = hash_token(plain)
    now = datetime.now(tz=UTC)
    row = SessionRow(
        id=uuid7(),
        user_id=user_id,
        token_hash=h,
        expires_at=now + expires_in,
        last_used_at=now,
        revoked_at=now if revoked else None,
        created_at=now,
        updated_at=now,
    )
    stub.session_rows_by_hash[h] = row
    return plain


# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_required_endpoint_rejects_missing_bearer(stub_session: _StubSession) -> None:
    app = _build_app(stub_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        response = await ac.get("/required")
    assert response.status_code == 401
    body = response.json()
    assert body["title"] == "Unauthorized"


@pytest.mark.asyncio
async def test_required_endpoint_rejects_bad_token(stub_session: _StubSession) -> None:
    app = _build_app(stub_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        response = await ac.get(
            "/required", headers={"Authorization": "Bearer not-a-real-token"}
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_required_endpoint_accepts_valid_token(stub_session: _StubSession) -> None:
    token = _seed_user_and_session(stub_session)
    app = _build_app(stub_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        response = await ac.get(
            "/required", headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 200
    body = response.json()
    assert "@example.com" in body["email"]


@pytest.mark.asyncio
async def test_required_endpoint_rejects_revoked_session(stub_session: _StubSession) -> None:
    token = _seed_user_and_session(stub_session, revoked=True)
    app = _build_app(stub_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        response = await ac.get(
            "/required", headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_required_endpoint_rejects_expired_session(stub_session: _StubSession) -> None:
    token = _seed_user_and_session(stub_session, expires_in=timedelta(seconds=-1))
    app = _build_app(stub_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        response = await ac.get(
            "/required", headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_required_endpoint_sets_rls_guc(stub_session: _StubSession) -> None:
    token = _seed_user_and_session(stub_session)
    app = _build_app(stub_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        response = await ac.get(
            "/required", headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 200
    assert any("SET LOCAL" in sql for sql in stub_session.executed_set_local)
    assert any("theourgia.current_user_id" in sql for sql in stub_session.executed_set_local)


@pytest.mark.asyncio
async def test_optional_endpoint_no_auth_returns_none(stub_session: _StubSession) -> None:
    app = _build_app(stub_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        response = await ac.get("/optional")
    assert response.status_code == 200
    assert response.json() == {"id": None}


@pytest.mark.asyncio
async def test_optional_endpoint_bad_token_returns_none(stub_session: _StubSession) -> None:
    app = _build_app(stub_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        response = await ac.get(
            "/optional", headers={"Authorization": "Bearer garbage"}
        )
    assert response.status_code == 200
    assert response.json() == {"id": None}


@pytest.mark.asyncio
async def test_optional_endpoint_valid_token_returns_user(stub_session: _StubSession) -> None:
    token = _seed_user_and_session(stub_session)
    app = _build_app(stub_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        response = await ac.get(
            "/optional", headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 200
    body = response.json()
    assert body["id"] is not None


@pytest.mark.asyncio
async def test_scoped_endpoint_requires_authentication(stub_session: _StubSession) -> None:
    app = _build_app(stub_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        response = await ac.get("/scoped")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_scoped_endpoint_passes_for_any_authenticated_user(
    stub_session: _StubSession,
) -> None:
    """Phase 01 implementation: any authenticated user passes scope checks.
    Tighter per-resource enforcement lands in subsequent batches."""
    token = _seed_user_and_session(stub_session)
    app = _build_app(stub_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        response = await ac.get(
            "/scoped", headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 200
