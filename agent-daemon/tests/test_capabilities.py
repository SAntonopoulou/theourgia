"""Capability vocabulary tests — wire keys must match the H10 C3
surface verbatim, and the kind-summary must produce the C2 chip
labels exactly."""

from __future__ import annotations

import pytest

from theourgia_agent.mcp.capabilities import (
    AgentCapability,
    CAPABILITY_KIND_NETWORK,
    CAPABILITY_KIND_READ,
    CAPABILITY_KIND_WRITE,
    capability_kind,
    summarise_capability_set,
)


def test_every_capability_wire_key_matches_surface() -> None:
    """The wire keys must match H10 C3 + the backend's plugin caps."""
    keys = {c.value for c in AgentCapability}
    # Surface wire keys (from frontend/shared/src/AgentInstall/copy.ts
    # test fixture).
    assert "read.entries" in keys
    assert "read.entities" in keys
    assert "read.divinations" in keys
    assert "filesystem" in keys
    assert "network.outbound" in keys


def test_from_string_round_trips() -> None:
    for cap in AgentCapability:
        assert AgentCapability.from_string(cap.value) is cap


def test_from_string_rejects_unknown() -> None:
    with pytest.raises(ValueError):
        AgentCapability.from_string("read.everything")


def test_capability_kind_classification() -> None:
    assert capability_kind(AgentCapability.READ_ENTRIES) == CAPABILITY_KIND_READ
    assert capability_kind(AgentCapability.READ_LIBRARY) == CAPABILITY_KIND_READ
    assert capability_kind(AgentCapability.FILESYSTEM) == CAPABILITY_KIND_WRITE
    assert (
        capability_kind(AgentCapability.NETWORK_OUTBOUND)
        == CAPABILITY_KIND_NETWORK
    )


def test_summarise_read_only() -> None:
    assert (
        summarise_capability_set(
            [AgentCapability.READ_ENTRIES, AgentCapability.READ_ENTITIES],
        )
        == "read-only"
    )


def test_summarise_read_write() -> None:
    assert (
        summarise_capability_set(
            [AgentCapability.READ_ENTRIES, AgentCapability.FILESYSTEM],
        )
        == "read-write"
    )


def test_summarise_read_write_plus_network() -> None:
    assert (
        summarise_capability_set(
            [
                AgentCapability.READ_ENTRIES,
                AgentCapability.FILESYSTEM,
                AgentCapability.NETWORK_OUTBOUND,
            ],
        )
        == "read-write + network"
    )


def test_summarise_read_plus_network_no_write() -> None:
    """Edge case — read-only + network without filesystem."""
    assert (
        summarise_capability_set(
            [
                AgentCapability.READ_ENTRIES,
                AgentCapability.NETWORK_OUTBOUND,
            ],
        )
        == "read + network"
    )


def test_summarise_empty_is_read_only() -> None:
    """Empty set is the most-restrictive label."""
    assert summarise_capability_set([]) == "read-only"
