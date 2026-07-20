"""v1_agents router schema + smoke tests.

Schema validation per project convention (full HTTP integration runs
at deploy time against the live daemon)."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from theourgia.api import deps
from theourgia.api.routers.v1.agents import (
    CostSampleBody,
    StartRunBody,
    get_daemon_client,
)
from theourgia.core.auth.tokens import hash_token
from theourgia.models.agents import AgentMcpToken


def test_start_run_body_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        StartRunBody(  # type: ignore[call-arg]
            install_id="i",
            agent_slug="s",
            task_text="t",
            granted_caps=["read.entries"],
            scope_id="s",
            monthly_cap_usd="10.00",
            sneaky=True,
        )


def test_start_run_body_minimal_payload() -> None:
    body = StartRunBody(
        install_id="i",
        agent_slug="s",
        task_text="audit my entries",
        granted_caps=["read.entries"],
        scope_id="s",
        monthly_cap_usd="10.00",
    )
    assert body.task_text == "audit my entries"
    assert body.month_spent_usd == "0"
    assert body.api_key_plaintext is None


def test_start_run_body_rejects_empty_task_text() -> None:
    with pytest.raises(ValidationError):
        StartRunBody(
            install_id="i",
            agent_slug="s",
            task_text="",
            granted_caps=[],
            scope_id="s",
            monthly_cap_usd="0",
        )


def test_start_run_body_rejects_task_text_over_limit() -> None:
    with pytest.raises(ValidationError):
        StartRunBody(
            install_id="i",
            agent_slug="s",
            task_text="x" * 8001,
            granted_caps=[],
            scope_id="s",
            monthly_cap_usd="0",
        )


def test_cost_sample_body_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        CostSampleBody(  # type: ignore[call-arg]
            cost_usd="0.50",
            sneaky=True,
        )


def test_cost_sample_body_defaults_zero_tokens() -> None:
    body = CostSampleBody(cost_usd="1.00")
    assert body.tokens_in == 0
    assert body.tokens_fresh == 0
    assert body.cost_usd == "1.00"


def test_agents_router_is_registered_on_v1() -> None:
    """Smoke: /api/v1/agents/* routes attach under /api/v1."""
    from theourgia.api.app import create_app

    app = create_app()
    paths = list(app.openapi()["paths"].keys())
    assert "/api/v1/agents/runs" in paths
    assert "/api/v1/agents/runs/{run_id}" in paths
    assert "/api/v1/agents/runs/{run_id}/stream" in paths
    assert "/api/v1/agents/runs/{run_id}/cost" in paths
    assert "/api/v1/agents/audit" in paths
    assert "/api/v1/agents/costs/summary" in paths
    # Vault-side MCP (v1-031) rides the same tag.
    assert "/api/v1/mcp" in paths


# ── start_run mints a dedicated MCP token (v1-031) ───────────────────


class _FakeMintSession:
    """Captures the AgentMcpToken row the run-start path mints."""

    def __init__(self) -> None:
        self.added: list[object] = []
        self.commits = 0

    def add(self, obj) -> None:
        self.added.append(obj)

    async def commit(self) -> None:
        self.commits += 1


class _CapturingDaemon:
    def __init__(self) -> None:
        self.bodies: list[dict] = []

    async def start_run(self, body: dict) -> dict:
        self.bodies.append(body)
        return {"run_id": body["install_id"], "status": "running"}


@pytest.mark.asyncio
async def test_start_run_mints_dedicated_mcp_token(app) -> None:
    """REGRESSION: the daemon must receive a real minted MCP bearer
    (hash persisted vault-side), never the old ``vault-sess-<id>``
    placeholder and never the caller's session token."""
    fake_session = _FakeMintSession()
    daemon = _CapturingDaemon()
    user = SimpleNamespace(id=uuid4(), primary_handle="soror-eu-a")

    async def session_override():
        yield fake_session

    app.dependency_overrides[deps.get_db_session] = session_override
    app.dependency_overrides[deps.get_current_user] = lambda: user
    app.dependency_overrides[get_daemon_client] = lambda: daemon

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        response = await ac.post(
            "/api/v1/agents/runs",
            json={
                "install_id": "install-1",
                "agent_slug": "study-tutor",
                "task_text": "quiz me on Liber Aleph ch. 1",
                "granted_caps": ["read.library"],
                "scope_id": "default",
                "monthly_cap_usd": "5.00",
            },
        )

    assert response.status_code == 202
    assert len(daemon.bodies) == 1
    sent = daemon.bodies[0]
    token = sent["vault_session_token"]
    assert token and not token.startswith("vault-sess-")
    # The plaintext hashes to the persisted row — and only the hash
    # is stored.
    rows = [r for r in fake_session.added if isinstance(r, AgentMcpToken)]
    assert len(rows) == 1
    assert rows[0].token_hash == hash_token(token)
    assert rows[0].install_id == "install-1"
    assert rows[0].user_id == user.id
    # Committed BEFORE the daemon call so the dial-back can't race.
    assert fake_session.commits >= 1
    # The daemon also gets the vault_id for cost-summary scoping.
    assert sent["vault_id"] == str(user.id)
