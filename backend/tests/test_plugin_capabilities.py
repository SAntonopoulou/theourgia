"""Tests for the Capability enum."""

from __future__ import annotations

import pytest

from theourgia.core.plugins.capabilities import Capability


def test_capability_strings_dotted_lowercase() -> None:
    for cap in Capability:
        assert cap.value == cap.value.lower()
        assert "." in cap.value
        assert " " not in cap.value


def test_capability_from_string_round_trip() -> None:
    for cap in Capability:
        assert Capability.from_string(cap.value) is cap


def test_capability_from_string_rejects_unknown() -> None:
    with pytest.raises(ValueError, match="unknown capability"):
        Capability.from_string("read.everything")


def test_capability_domain_property() -> None:
    assert Capability.READ_ENTRIES.domain == "read"
    assert Capability.WRITE_ENTRIES.domain == "write"
    assert Capability.UI_EDITOR_BLOCK.domain == "ui"
    assert Capability.DB_MIGRATIONS.domain == "db"
    assert Capability.NETWORK_OUTBOUND.domain == "network"
    assert Capability.FS_READ.domain == "fs"
    assert Capability.NOTIF_SEND.domain == "notif"
    assert Capability.AGENT_INVOKE.domain == "agent"


def test_capability_values_are_unique() -> None:
    values = [c.value for c in Capability]
    assert len(values) == len(set(values))


def test_known_critical_capabilities_present() -> None:
    """Capabilities the plan refers to by name must exist."""
    expected = {
        Capability.READ_ENTRIES,
        Capability.WRITE_ENTRIES,
        Capability.UI_EDITOR_BLOCK,
        Capability.DB_MIGRATIONS,
        Capability.NETWORK_OUTBOUND,
        Capability.FS_READ,
        Capability.FS_WRITE,
        Capability.NOTIF_SEND,
    }
    for cap in expected:
        assert cap in Capability
