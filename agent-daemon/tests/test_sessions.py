"""MCP session registry tests."""

from __future__ import annotations

from theourgia_agent.mcp.capabilities import AgentCapability
from theourgia_agent.mcp.dispatch import DispatchContext
from theourgia_agent.mcp.sessions import (
    MCPSessionRegistry,
    issue_session_token,
)


class _StubVault:
    async def closed_tradition_slugs(self) -> frozenset[str]:
        return frozenset()


def _ctx() -> DispatchContext:
    return DispatchContext(
        granted=[AgentCapability.READ_ENTRIES],
        vault=_StubVault(),  # type: ignore[arg-type]
    )


def test_issue_session_token_returns_unique_strings() -> None:
    tokens = {issue_session_token() for _ in range(50)}
    assert len(tokens) == 50
    for t in tokens:
        assert len(t) >= 32


def test_register_and_lookup_round_trip() -> None:
    reg = MCPSessionRegistry()
    session = reg.register(ctx=_ctx(), run_id="run-1")
    found = reg.lookup(session.token)
    assert found is not None
    assert found.run_id == "run-1"
    assert found is session


def test_lookup_returns_none_for_unknown_token() -> None:
    reg = MCPSessionRegistry()
    assert reg.lookup("not-issued") is None


def test_drop_removes_session() -> None:
    reg = MCPSessionRegistry()
    session = reg.register(ctx=_ctx(), run_id="run-1")
    assert reg.lookup(session.token) is not None
    reg.drop(session.token)
    assert reg.lookup(session.token) is None


def test_drop_unknown_token_is_idempotent() -> None:
    reg = MCPSessionRegistry()
    reg.drop("nonexistent")  # Should not raise.


def test_register_multiple_sessions_returns_distinct_tokens() -> None:
    reg = MCPSessionRegistry()
    s1 = reg.register(ctx=_ctx(), run_id="run-1")
    s2 = reg.register(ctx=_ctx(), run_id="run-2")
    assert s1.token != s2.token
    assert len(reg) == 2


def test_clear_empties_registry() -> None:
    reg = MCPSessionRegistry()
    reg.register(ctx=_ctx(), run_id="run-1")
    reg.register(ctx=_ctx(), run_id="run-2")
    reg.clear()
    assert len(reg) == 0
