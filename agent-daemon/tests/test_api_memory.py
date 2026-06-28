"""Memory directory endpoint tests — install setup + path safety."""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine

from theourgia_agent.api.app import create_app
from theourgia_agent.api.routers.installs import engine_dependency
from theourgia_agent.api.routers.runs import control_token_dependency


@pytest.fixture
def memory_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Redirect the memory root to a temp dir for the test session."""
    root = tmp_path / "agents"
    root.mkdir()
    monkeypatch.setenv("THEOURGIA_AGENT_MEMORY_ROOT", str(root))
    # Reset cached settings so the override takes effect.
    from theourgia_agent.core.config import get_settings

    get_settings.cache_clear()
    yield root
    get_settings.cache_clear()


def _make_app(engine: AsyncEngine):
    app = create_app()
    app.dependency_overrides[engine_dependency] = lambda: engine
    app.dependency_overrides[control_token_dependency] = lambda: None
    return app


async def _create_install(client: AsyncClient) -> str:
    response = await client.post(
        "/installs",
        json={
            "vault_id": "test-vault",
            "agent_id": "test-agent",
            "display_name": "Test",
            "kind": "reviewer",
            "monthly_cost_cap_usd": "10.00",
        },
    )
    return response.json()["id"]


@pytest.mark.asyncio
async def test_list_memory_empty_for_new_install(
    daemon_engine: AsyncEngine, memory_root: Path,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        install_id = await _create_install(client)
        response = await client.get(f"/installs/{install_id}/memory")
    assert response.status_code == 200
    assert response.json() == {"files": []}


@pytest.mark.asyncio
async def test_write_then_read_round_trip(
    daemon_engine: AsyncEngine, memory_root: Path,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        install_id = await _create_install(client)
        write_resp = await client.put(
            f"/installs/{install_id}/memory/notes.md",
            json={"body": "# Notes\n\nFirst observation."},
        )
        assert write_resp.status_code == 200
        read_resp = await client.get(
            f"/installs/{install_id}/memory/notes.md",
        )
        assert read_resp.status_code == 200
        body = read_resp.json()
        assert body["name"] == "notes.md"
        assert body["body"] == "# Notes\n\nFirst observation."


@pytest.mark.asyncio
async def test_list_after_write_shows_file(
    daemon_engine: AsyncEngine, memory_root: Path,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        install_id = await _create_install(client)
        await client.put(
            f"/installs/{install_id}/memory/a.md",
            json={"body": "hi"},
        )
        await client.put(
            f"/installs/{install_id}/memory/b.md",
            json={"body": "world"},
        )
        list_resp = await client.get(f"/installs/{install_id}/memory")
    files = list_resp.json()["files"]
    assert sorted(f["name"] for f in files) == ["a.md", "b.md"]


@pytest.mark.asyncio
async def test_read_404_for_missing_file(
    daemon_engine: AsyncEngine, memory_root: Path,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        install_id = await _create_install(client)
        response = await client.get(
            f"/installs/{install_id}/memory/never.md",
        )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_round_trip(
    daemon_engine: AsyncEngine, memory_root: Path,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        install_id = await _create_install(client)
        await client.put(
            f"/installs/{install_id}/memory/tmp.md", json={"body": "x"},
        )
        delete_resp = await client.delete(
            f"/installs/{install_id}/memory/tmp.md",
        )
        assert delete_resp.status_code == 200
        read_resp = await client.get(
            f"/installs/{install_id}/memory/tmp.md",
        )
        assert read_resp.status_code == 404


@pytest.mark.asyncio
async def test_path_escape_blocked_with_dotdot(
    daemon_engine: AsyncEngine, memory_root: Path,
) -> None:
    """Rule 59 defence-in-depth — even if the bwrap sandbox is off,
    the endpoint refuses path-escape attempts."""
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        install_id = await _create_install(client)
        response = await client.get(
            f"/installs/{install_id}/memory/..%2Fescape.md",
        )
    assert response.status_code in (400, 404)


@pytest.mark.asyncio
async def test_path_escape_blocked_with_slash_in_name(
    daemon_engine: AsyncEngine, memory_root: Path,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        install_id = await _create_install(client)
        # /-as-segment in URL becomes a new path segment; FastAPI's
        # path matching means the request goes to a non-existent route,
        # which returns 404. That's also acceptable refusal.
        response = await client.get(
            f"/installs/{install_id}/memory/sub/leak.md",
        )
    assert response.status_code in (400, 404)


@pytest.mark.asyncio
async def test_path_escape_blocked_with_leading_dot(
    daemon_engine: AsyncEngine, memory_root: Path,
) -> None:
    """Leading-dot names refused (no .ssh / .env exposure)."""
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        install_id = await _create_install(client)
        # Use PUT — write attempt to leading-dot name should be refused.
        write_resp = await client.put(
            f"/installs/{install_id}/memory/.env",
            json={"body": "SECRET=1"},
        )
    assert write_resp.status_code == 400


@pytest.mark.asyncio
async def test_install_404_for_unknown_install_id(
    daemon_engine: AsyncEngine, memory_root: Path,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        response = await client.get(
            "/installs/00000000-0000-0000-0000-000000000000/memory",
        )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_write_oversize_body_rejected(
    daemon_engine: AsyncEngine, memory_root: Path,
) -> None:
    """Rule: refuse > MAX_FILE_BYTES rather than truncate (no silent
    data loss)."""
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        install_id = await _create_install(client)
        oversize = "x" * (256 * 1024 + 100)
        response = await client.put(
            f"/installs/{install_id}/memory/big.md",
            json={"body": oversize},
        )
    # Pydantic validation rejects the body with 422.
    assert response.status_code == 422
