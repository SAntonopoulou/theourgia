"""Launch planner tests — cap refusal + happy-path command/env shape."""

from __future__ import annotations

from decimal import Decimal

from theourgia_agent.mcp.capabilities import AgentCapability
from theourgia_agent.mcp.sessions import MCPSessionRegistry
from theourgia_agent.runs.launcher import (
    LaunchPlan,
    LaunchRefused,
    LaunchRequest,
    plan_launch,
)


def _request(**overrides) -> LaunchRequest:
    defaults = dict(
        install_id="install-123",
        vault_did="did:vault:abc",
        agent_slug="example-agent",
        task_text="please review my draft entry",
        granted_caps=[AgentCapability.READ_ENTRIES],
        scope_id="scope-default",
        monthly_cap_usd=Decimal("10.00"),
        month_spent_usd=Decimal("0.00"),
        recent_run_cost_usd=[],
        vault_session_token="vt-test",
        claude_binary="/usr/bin/true",
        api_key_env="ANTHROPIC_API_KEY",
        api_key_plaintext="sk-test",
    )
    defaults.update(overrides)
    return LaunchRequest(**defaults)


def test_launch_refused_when_month_spent_at_or_over_cap() -> None:
    reg = MCPSessionRegistry()
    out = plan_launch(
        request=_request(
            monthly_cap_usd=Decimal("5.00"),
            month_spent_usd=Decimal("5.00"),
        ),
        registry=reg,
    )
    assert isinstance(out, LaunchRefused)
    assert "monthly cost cap" in out.reason
    assert len(reg) == 0


def test_launch_refused_when_estimate_exceeds_remaining_cap() -> None:
    """Recent runs each cost $4; remaining cap is $5; 1.4× estimate $5.6
    is over remaining. Halt."""
    reg = MCPSessionRegistry()
    out = plan_launch(
        request=_request(
            monthly_cap_usd=Decimal("10.00"),
            month_spent_usd=Decimal("5.00"),
            recent_run_cost_usd=[
                Decimal("4.00"), Decimal("4.00"), Decimal("4.00"),
            ],
        ),
        registry=reg,
    )
    assert isinstance(out, LaunchRefused)
    assert "remaining monthly cap" in out.reason


def test_happy_path_returns_plan_and_registers_session() -> None:
    reg = MCPSessionRegistry()
    out = plan_launch(request=_request(), registry=reg)
    assert isinstance(out, LaunchPlan)
    assert len(reg) == 1
    # Session looked up by its token reaches the same DispatchContext.
    assert reg.lookup(out.session.token) is out.session


def test_plan_command_passes_task_text_verbatim() -> None:
    reg = MCPSessionRegistry()
    out = plan_launch(
        request=_request(task_text="audit my last week's synchronicities"),
        registry=reg,
    )
    assert isinstance(out, LaunchPlan)
    assert "audit my last week's synchronicities" in out.command


def test_plan_env_carries_mcp_url_and_bearer() -> None:
    reg = MCPSessionRegistry()
    out = plan_launch(request=_request(), registry=reg)
    assert isinstance(out, LaunchPlan)
    assert out.env["THEOURGIA_MCP_TOKEN"] == out.session.token
    assert out.env["THEOURGIA_MCP_URL"].endswith("/mcp/sse")
    assert out.env["THEOURGIA_RUN_ID"] == "install-123"


def test_plan_env_carries_api_key_in_named_var_only() -> None:
    reg = MCPSessionRegistry()
    out = plan_launch(
        request=_request(
            api_key_env="ANTHROPIC_API_KEY",
            api_key_plaintext="sk-abc-123",
        ),
        registry=reg,
    )
    assert isinstance(out, LaunchPlan)
    assert out.env["ANTHROPIC_API_KEY"] == "sk-abc-123"
    # Defence in depth: no other env var contains the secret.
    for k, v in out.env.items():
        if k == "ANTHROPIC_API_KEY":
            continue
        assert "sk-abc-123" not in v


def test_plan_env_omits_api_key_when_none() -> None:
    reg = MCPSessionRegistry()
    out = plan_launch(
        request=_request(api_key_plaintext=None),
        registry=reg,
    )
    assert isinstance(out, LaunchPlan)
    assert "ANTHROPIC_API_KEY" not in out.env


def test_plan_cwd_uses_vault_did_and_install_id() -> None:
    reg = MCPSessionRegistry()
    out = plan_launch(
        request=_request(
            vault_did="did:vault:my-grove",
            install_id="install-xyz",
        ),
        registry=reg,
    )
    assert isinstance(out, LaunchPlan)
    assert "did:vault:my-grove" in str(out.cwd)
    assert "install-xyz" in str(out.cwd)


def test_plan_reservation_matches_decision() -> None:
    reg = MCPSessionRegistry()
    out = plan_launch(
        request=_request(
            monthly_cap_usd=Decimal("100.00"),
            month_spent_usd=Decimal("10.00"),
            recent_run_cost_usd=[Decimal("1.00"), Decimal("1.00")],
        ),
        registry=reg,
    )
    assert isinstance(out, LaunchPlan)
    # avg = 1.0; multiplier default 1.4; reservation = 1.4 * 1.0
    assert out.reservation_usd == Decimal("1.4")


def test_session_dispatch_context_carries_granted_caps() -> None:
    reg = MCPSessionRegistry()
    out = plan_launch(
        request=_request(
            granted_caps=[
                AgentCapability.READ_ENTRIES,
                AgentCapability.READ_ENTITIES,
                AgentCapability.FILESYSTEM,
            ],
        ),
        registry=reg,
    )
    assert isinstance(out, LaunchPlan)
    assert out.session.ctx.granted == [
        AgentCapability.READ_ENTRIES,
        AgentCapability.READ_ENTITIES,
        AgentCapability.FILESYSTEM,
    ]
