"""Tests for the API error → Problem translation."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from theourgia.api.errors import (
    APIError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    PROBLEM_CONTENT_TYPE,
    RateLimitedError,
    ServiceUnavailableError,
    UnauthorizedError,
    ValidationFailedError,
    register_error_handlers,
)
from theourgia.api.middleware import register_middleware
from theourgia.core.config import get_settings


@pytest.fixture
def error_app() -> FastAPI:
    """Build a tiny app that raises every error type."""
    app = FastAPI()
    settings = get_settings()
    register_error_handlers(app)
    register_middleware(app, settings)

    @app.get("/api-error")
    async def _api_error() -> None:
        raise APIError("oops")

    @app.get("/unauthorized")
    async def _unauthorized() -> None:
        raise UnauthorizedError("token missing")

    @app.get("/forbidden")
    async def _forbidden() -> None:
        raise ForbiddenError("not allowed")

    @app.get("/not-found")
    async def _not_found() -> None:
        raise NotFoundError("nope")

    @app.get("/conflict")
    async def _conflict() -> None:
        raise ConflictError("already exists")

    @app.get("/validation")
    async def _validation() -> None:
        raise ValidationFailedError("bad input")

    @app.get("/rate-limited")
    async def _rate_limited() -> None:
        raise RateLimitedError("too fast", headers={"Retry-After": "30"})

    @app.get("/unavailable")
    async def _unavailable() -> None:
        raise ServiceUnavailableError("database down")

    @app.get("/unhandled")
    async def _unhandled() -> None:
        raise RuntimeError("internal explosion")

    return app


@pytest.fixture
async def client(error_app: FastAPI) -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=error_app),
        base_url="http://testserver",
    ) as ac:
        yield ac


@pytest.mark.parametrize(
    ("path", "expected_status", "expected_title"),
    [
        ("/unauthorized", 401, "Unauthorized"),
        ("/forbidden", 403, "Forbidden"),
        ("/not-found", 404, "Not Found"),
        ("/conflict", 409, "Conflict"),
        ("/validation", 422, "Validation Failed"),
        ("/rate-limited", 429, "Too Many Requests"),
        ("/unavailable", 503, "Service Unavailable"),
    ],
)
@pytest.mark.asyncio
async def test_known_errors_render_as_problem(
    client: AsyncClient, path: str, expected_status: int, expected_title: str
) -> None:
    response = await client.get(path)
    assert response.status_code == expected_status
    assert response.headers["content-type"].startswith(PROBLEM_CONTENT_TYPE)
    body = response.json()
    assert body["status"] == expected_status
    assert body["title"] == expected_title
    assert body["instance"] == path
    assert body["request_id"]
    assert "detail" in body


@pytest.mark.asyncio
async def test_rate_limited_includes_retry_after_header(client: AsyncClient) -> None:
    response = await client.get("/rate-limited")
    assert response.status_code == 429
    assert response.headers.get("retry-after") == "30"


@pytest.mark.asyncio
async def test_unhandled_exception_returns_500_problem(client: AsyncClient) -> None:
    response = await client.get("/unhandled")
    assert response.status_code == 500
    assert response.headers["content-type"].startswith(PROBLEM_CONTENT_TYPE)
    body = response.json()
    assert body["status"] == 500
    assert body["title"] == "Internal Server Error"
    # The detail must not leak internal traceback contents
    assert "RuntimeError" not in (body.get("detail") or "")
    assert "internal explosion" not in (body.get("detail") or "")
    # Request ID is still present for log correlation
    assert body["request_id"]


@pytest.mark.asyncio
async def test_validation_error_from_fastapi_renders_as_problem(client: AsyncClient) -> None:
    """A missing required query param triggers FastAPI's RequestValidationError."""
    # Build a minimal app with a route that requires a query param
    inner = FastAPI()
    settings = get_settings()
    register_error_handlers(inner)
    register_middleware(inner, settings)

    from pydantic import BaseModel

    class _Body(BaseModel):
        name: str

    @inner.post("/needs-body")
    async def _needs_body(_body: _Body) -> dict[str, str]:
        return {"ok": "yes"}

    async with AsyncClient(
        transport=ASGITransport(app=inner),
        base_url="http://testserver",
    ) as ac:
        response = await ac.post("/needs-body", json={})  # missing 'name'

    assert response.status_code == 422
    body = response.json()
    assert body["title"] == "Validation Failed"
    assert "name" in (body.get("detail") or "")
    assert response.headers["content-type"].startswith(PROBLEM_CONTENT_TYPE)
