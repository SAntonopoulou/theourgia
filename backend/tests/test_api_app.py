"""Tests for the FastAPI app factory and unversioned endpoints.

Uses ``httpx.ASGITransport`` so requests hit the app in-process without
spinning up a real server. Database-touching routes (``/readyz``) are
skipped here; they get full coverage in the integration test suite
once the Postgres fixture lands.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from theourgia.__about__ import __version__
from theourgia.api.app import create_app


@pytest.fixture
def app_instance():
    """Fresh app per test (avoids cross-test state on the singleton)."""
    return create_app()


@pytest.fixture
async def client(app_instance):
    async with AsyncClient(
        transport=ASGITransport(app=app_instance),
        base_url="http://testserver",
    ) as ac:
        yield ac


@pytest.mark.asyncio
async def test_app_constructs() -> None:
    app = create_app()
    assert app.title == "Theourgia"
    assert app.version == __version__


@pytest.mark.asyncio
async def test_healthz_returns_ok(client: AsyncClient) -> None:
    response = await client.get("/healthz")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"


@pytest.mark.asyncio
async def test_healthz_propagates_request_id(client: AsyncClient) -> None:
    """An inbound X-Request-ID is echoed back; otherwise one is generated."""
    response = await client.get("/healthz", headers={"X-Request-ID": "test-id-123"})
    assert response.headers["x-request-id"] == "test-id-123"


@pytest.mark.asyncio
async def test_healthz_generates_request_id_if_absent(client: AsyncClient) -> None:
    response = await client.get("/healthz")
    rid = response.headers.get("x-request-id", "")
    assert len(rid) > 0
    # UUIDv7 stringification
    assert rid.count("-") == 4


@pytest.mark.asyncio
async def test_healthz_rejects_unprintable_request_id(client: AsyncClient) -> None:
    """A pathological X-Request-ID is dropped and a fresh one issued."""
    response = await client.get(
        "/healthz",
        headers={"X-Request-ID": "x" * 200},  # too long, drop it
    )
    rid = response.headers.get("x-request-id", "")
    assert rid != "x" * 200
    assert len(rid) > 0


@pytest.mark.asyncio
async def test_meta_endpoint(client: AsyncClient) -> None:
    response = await client.get("/api/v1/meta")
    assert response.status_code == 200
    body = response.json()
    assert body["api_version"] == "v1"
    assert body["version"] == __version__
    assert body["telemetry"] == "none"
    assert body["license"] == "AGPL-3.0-only"
    assert body["source"] == "https://github.com/SAntonopoulou/theourgia"


@pytest.mark.asyncio
async def test_openapi_schema_published(client: AsyncClient) -> None:
    response = await client.get("/api/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["openapi"].startswith("3.")
    assert schema["info"]["title"] == "Theourgia"
    assert "bearerAuth" in schema["components"]["securitySchemes"]


@pytest.mark.asyncio
async def test_docs_available_in_test_env(client: AsyncClient) -> None:
    response = await client.get("/api/docs")
    # Swagger UI HTML; just check 200 and content-type
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_unknown_path_returns_problem_404(client: AsyncClient) -> None:
    response = await client.get("/api/v1/does-not-exist")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    body = response.json()
    assert body["status"] == 404
    assert body["title"] == "Not Found"
    assert body["instance"] == "/api/v1/does-not-exist"
    assert body["request_id"]


@pytest.mark.asyncio
async def test_cors_preflight_allowed_origins_in_dev() -> None:
    """In a development environment, the local frontend origins are allowed."""
    # The test conftest forces THEOURGIA_ENV=test; CORS rules in the
    # factory mirror dev for non-production. Verify the preflight succeeds.
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        response = await ac.options(
            "/api/v1/meta",
            headers={
                "Origin": "http://localhost:4321",
                "Access-Control-Request-Method": "GET",
            },
        )
        # CORSMiddleware returns 200 on a successful preflight
        assert response.status_code in (200, 204)
