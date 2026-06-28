"""v1_agents router schema + smoke tests.

Schema validation per project convention (full HTTP integration runs
at deploy time against the live daemon)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.agents import (
    CostSampleBody,
    StartRunBody,
)


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
