"""Dispatch tests — verifies that capability gating, vault client,
and the rule-52/53 filter compose correctly at the tool boundary."""

from __future__ import annotations

import pytest

from theourgia_agent.mcp.capabilities import AgentCapability
from theourgia_agent.mcp.dispatch import (
    DispatchContext,
    ToolCallResult,
    dispatch_tool,
)
from theourgia_agent.mcp.gating import CapabilityDenied


class FakeVault:
    """A minimal vault client stand-in for dispatch tests."""

    def __init__(
        self,
        records: list[dict] | None = None,
        closed_slugs: frozenset[str] = frozenset(),
    ) -> None:
        self._records = records or []
        self._closed_slugs = closed_slugs
        self.calls: list[tuple[str, dict]] = []

    async def closed_tradition_slugs(self) -> frozenset[str]:
        return self._closed_slugs

    async def read_entries(
        self, *, tag: str | None = None, limit: int = 50,
    ) -> list[dict]:
        self.calls.append(("read.entries", {"tag": tag, "limit": limit}))
        return list(self._records)

    async def read_entities(self, *, limit: int = 50) -> list[dict]:
        self.calls.append(("read.entities", {"limit": limit}))
        return list(self._records)

    async def read_divinations(self, *, limit: int = 50) -> list[dict]:
        self.calls.append(("read.divinations", {"limit": limit}))
        return list(self._records)

    async def read_library(self, *, kind: str | None = None) -> list[dict]:
        self.calls.append(("read.library", {"kind": kind}))
        return list(self._records)

    async def read_correspondences(
        self, *, bundle: str | None = None,
    ) -> list[dict]:
        self.calls.append(
            ("read.correspondences", {"bundle": bundle}),
        )
        return list(self._records)

    async def read_synchronicities(
        self, *, limit: int = 50,
    ) -> list[dict]:
        self.calls.append(("read.synchronicities", {"limit": limit}))
        return list(self._records)


def make_ctx(
    granted: list[AgentCapability],
    *,
    records: list[dict] | None = None,
    closed_slugs: frozenset[str] = frozenset(),
) -> DispatchContext:
    return DispatchContext(
        granted=granted,
        vault=FakeVault(records=records, closed_slugs=closed_slugs),  # type: ignore[arg-type]
    )


@pytest.mark.asyncio
async def test_dispatch_returns_filtered_records() -> None:
    ctx = make_ctx(
        [AgentCapability.READ_ENTRIES],
        records=[
            {"id": "a", "sealed": False, "tradition_tags": ["hellenic"]},
            {"id": "b", "sealed": True, "tradition_tags": ["hellenic"]},
            {"id": "c", "sealed": False, "tradition_tags": ["closed-x"]},
        ],
        closed_slugs=frozenset({"closed-x"}),
    )
    result = await dispatch_tool(ctx, tool_name="read.entries")
    assert isinstance(result, ToolCallResult)
    assert [r["id"] for r in result.records] == ["a"]
    assert result.filtered_count == 2


@pytest.mark.asyncio
async def test_dispatch_denies_ungranted_capability() -> None:
    ctx = make_ctx([AgentCapability.READ_ENTRIES])
    with pytest.raises(CapabilityDenied):
        await dispatch_tool(ctx, tool_name="read.entities")


@pytest.mark.asyncio
async def test_dispatch_rejects_non_callable_caps() -> None:
    """filesystem + network.outbound are capability FLAGS, not callable
    tools. Calling them via tools/call is a malformed client request."""
    ctx = make_ctx(
        [AgentCapability.FILESYSTEM, AgentCapability.NETWORK_OUTBOUND],
    )
    with pytest.raises(ValueError):
        await dispatch_tool(ctx, tool_name="filesystem")
    with pytest.raises(ValueError):
        await dispatch_tool(ctx, tool_name="network.outbound")


@pytest.mark.asyncio
async def test_dispatch_rejects_unknown_tool_name() -> None:
    ctx = make_ctx([AgentCapability.READ_ENTRIES])
    with pytest.raises(ValueError):
        await dispatch_tool(ctx, tool_name="read.everything")


@pytest.mark.asyncio
async def test_dispatch_closed_slugs_cached_after_first_call() -> None:
    """The closed-tradition slug set is fetched once per session and
    reused across tool calls."""
    ctx = make_ctx(
        [AgentCapability.READ_ENTRIES, AgentCapability.READ_ENTITIES],
        records=[{"id": "a", "sealed": False}],
        closed_slugs=frozenset({"closed-x"}),
    )
    assert ctx.closed_tradition_slugs == frozenset()
    await dispatch_tool(ctx, tool_name="read.entries")
    assert ctx.closed_tradition_slugs == frozenset({"closed-x"})
    # A second call doesn't refetch — the slugs are already on the ctx
    # (the test just verifies the value is preserved, not the network
    # behaviour of the real vault client).
    await dispatch_tool(ctx, tool_name="read.entities")
    assert ctx.closed_tradition_slugs == frozenset({"closed-x"})


@pytest.mark.asyncio
async def test_dispatch_filtered_count_reflects_drops() -> None:
    """filtered_count is the number the daemon dropped — surfaced to
    the agent for honesty, but not the dropped content."""
    ctx = make_ctx(
        [AgentCapability.READ_ENTRIES],
        records=[
            {"id": "a", "sealed": False},
            {"id": "b", "sealed": True},
            {"id": "c", "sealed": True},
            {"id": "d", "sealed": False},
        ],
    )
    result = await dispatch_tool(ctx, tool_name="read.entries")
    assert len(result.records) == 2
    assert result.filtered_count == 2


@pytest.mark.asyncio
async def test_dispatch_passes_arguments_to_vault() -> None:
    """tag + limit args propagate to the vault client call."""
    fake = FakeVault(records=[])
    ctx = DispatchContext(
        granted=[AgentCapability.READ_ENTRIES],
        vault=fake,  # type: ignore[arg-type]
    )
    await dispatch_tool(
        ctx, tool_name="read.entries", arguments={"tag": "hekate", "limit": 10},
    )
    assert fake.calls == [
        ("read.entries", {"tag": "hekate", "limit": 10}),
    ]


@pytest.mark.asyncio
async def test_property_no_sealed_or_closed_through_dispatch() -> None:
    """Composition guarantee — at the dispatch boundary, the agent
    NEVER sees sealed or closed-tradition records."""
    import random

    random.seed(123)
    closed = frozenset({"closed-x"})

    for _ in range(30):
        n = random.randint(0, 15)
        records = [
            {
                "id": str(i),
                "sealed": random.choice([True, False]),
                "tradition_tags": random.choice(
                    [[], ["hellenic"], ["closed-x"], ["closed-x", "y"]],
                ),
            }
            for i in range(n)
        ]
        ctx = make_ctx(
            [AgentCapability.READ_ENTRIES],
            records=records,
            closed_slugs=closed,
        )
        result = await dispatch_tool(ctx, tool_name="read.entries")
        for r in result.records:
            assert r.get("sealed") in (False, None)
            for tag in r.get("tradition_tags") or []:
                assert tag != "closed-x"
