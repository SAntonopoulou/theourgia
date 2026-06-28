"""Capability gating tests — the runtime check at MCP dispatch."""

from __future__ import annotations

import pytest

from theourgia_agent.mcp.capabilities import AgentCapability
from theourgia_agent.mcp.gating import CapabilityDenied, require_capability


def test_granted_capability_passes() -> None:
    require_capability(
        [AgentCapability.READ_ENTRIES, AgentCapability.READ_ENTITIES],
        AgentCapability.READ_ENTRIES,
    )


def test_ungranted_capability_raises() -> None:
    with pytest.raises(CapabilityDenied) as exc:
        require_capability(
            [AgentCapability.READ_ENTRIES],
            AgentCapability.FILESYSTEM,
        )
    assert exc.value.required == AgentCapability.FILESYSTEM


def test_capability_denied_carries_required_attribute() -> None:
    err = CapabilityDenied(AgentCapability.NETWORK_OUTBOUND)
    assert err.required == AgentCapability.NETWORK_OUTBOUND
    assert "network.outbound" in str(err)


def test_no_implicit_hierarchy() -> None:
    """An agent with read.entries is NOT implicitly granted
    read.entities even though both are 'reads'. Each capability is
    individually granted."""
    with pytest.raises(CapabilityDenied):
        require_capability(
            [AgentCapability.READ_ENTRIES],
            AgentCapability.READ_ENTITIES,
        )


def test_empty_granted_set_denies_every_capability() -> None:
    for cap in AgentCapability:
        with pytest.raises(CapabilityDenied):
            require_capability([], cap)
