"""Installs control API tests — schema + smoke + repo round-trip.

Uses httpx.AsyncClient via ASGITransport (not TestClient) so the
test's asyncio loop is the same one the daemon_engine was created
on — otherwise asyncpg connections raise "got Future attached to
a different loop"."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine

from theourgia_agent.api.app import create_app
from theourgia_agent.api.routers.installs import engine_dependency
from theourgia_agent.api.routers.runs import control_token_dependency


def _make_app(daemon_engine: AsyncEngine):
    app = create_app()
    app.dependency_overrides[engine_dependency] = lambda: daemon_engine
    app.dependency_overrides[control_token_dependency] = lambda: None
    return app


def _create_body(**overrides) -> dict:
    defaults = dict(
        vault_id="vault-1",
        agent_id="example-agent",
        display_name="Example",
        kind="reviewer",
        monthly_cost_cap_usd="10.00",
    )
    defaults.update(overrides)
    return defaults


@pytest.mark.asyncio
async def test_create_install_returns_201_with_snapshot(
    daemon_engine: AsyncEngine,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        response = await client.post("/installs", json=_create_body())
    assert response.status_code == 201
    body = response.json()
    assert body["vault_id"] == "vault-1"
    assert body["state"] == "inactive"
    assert body["has_api_key"] is False


@pytest.mark.asyncio
async def test_create_install_duplicate_returns_409(
    daemon_engine: AsyncEngine,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        await client.post("/installs", json=_create_body())
        response = await client.post("/installs", json=_create_body())
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_installs_filtered_by_vault(
    daemon_engine: AsyncEngine,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        await client.post("/installs", json=_create_body(vault_id="v1", agent_id="a"))
        await client.post("/installs", json=_create_body(vault_id="v1", agent_id="b"))
        await client.post("/installs", json=_create_body(vault_id="v2", agent_id="a"))
        body = (await client.get("/installs", params={"vault_id": "v1"})).json()
    assert body["vault_id"] == "v1"
    assert len(body["installs"]) == 2


@pytest.mark.asyncio
async def test_list_installs_empty_for_unknown_vault(
    daemon_engine: AsyncEngine,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        body = (await client.get(
            "/installs", params={"vault_id": "nope"},
        )).json()
    assert body["installs"] == []


@pytest.mark.asyncio
async def test_get_install_round_trip(daemon_engine: AsyncEngine) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        created = (await client.post("/installs", json=_create_body())).json()
        body = (await client.get(f"/installs/{created['id']}")).json()
    assert body["id"] == created["id"]


@pytest.mark.asyncio
async def test_get_install_404_for_unknown(
    daemon_engine: AsyncEngine,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        response = await client.get(
            "/installs/00000000-0000-0000-0000-000000000000",
        )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_install_state_active(
    daemon_engine: AsyncEngine,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        created = (await client.post("/installs", json=_create_body())).json()
        patch_resp = await client.patch(
            f"/installs/{created['id']}/state", json={"state": "active"},
        )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["state"] == "active"


@pytest.mark.asyncio
async def test_update_install_state_rejects_unknown_state(
    daemon_engine: AsyncEngine,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        created = (await client.post("/installs", json=_create_body())).json()
        patch_resp = await client.patch(
            f"/installs/{created['id']}/state", json={"state": "deleted"},
        )
    assert patch_resp.status_code == 422


@pytest.mark.asyncio
async def test_delete_install(daemon_engine: AsyncEngine) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        created = (await client.post("/installs", json=_create_body())).json()
        delete_resp = await client.delete(f"/installs/{created['id']}")
        assert delete_resp.status_code == 200
        assert delete_resp.json()["deleted"] is True
        assert (
            await client.get(f"/installs/{created['id']}")
        ).status_code == 404


@pytest.mark.asyncio
async def test_create_install_rejects_missing_vault_id(
    daemon_engine: AsyncEngine,
) -> None:
    app = _make_app(daemon_engine)
    body = _create_body()
    del body["vault_id"]
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        response = await client.post("/installs", json=body)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_install_rejects_empty_strings(
    daemon_engine: AsyncEngine,
) -> None:
    app = _make_app(daemon_engine)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        response = await client.post(
            "/installs", json=_create_body(vault_id=""),
        )
    assert response.status_code == 422
