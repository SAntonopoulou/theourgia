"""Tests for the in-process event bus."""

from __future__ import annotations

from typing import Any

import pytest

from theourgia.core.events.bus import (
    EventBus,
    as_async_handler,
)
from theourgia.core.events.event import DomainEvent
from theourgia.core.events.registry import EventType, EventTypeRegistry


@pytest.fixture
def registry() -> EventTypeRegistry:
    r = EventTypeRegistry()
    r.register(EventType(name="entry.created"))
    r.register(EventType(name="entry.updated"))
    r.register(EventType(name="entry.deleted"))
    r.register(EventType(name="auth.signed_in"))
    return r


@pytest.fixture
def bus(registry: EventTypeRegistry) -> EventBus:
    return EventBus(registry=registry)


# ── Subscription ─────────────────────────────────────────────────────


def test_subscribe_returns_token(bus: EventBus) -> None:
    async def _h(e: DomainEvent) -> None:
        pass

    token = bus.subscribe("entry.created", _h)
    assert token.pattern == "entry.created"
    assert isinstance(token.id, int)


def test_subscribe_rejects_empty_pattern(bus: EventBus) -> None:
    with pytest.raises(ValueError, match="pattern"):
        bus.subscribe("", lambda e: None)


def test_unsubscribe_removes_handler(bus: EventBus) -> None:
    async def _h(e: DomainEvent) -> None:
        pass

    token = bus.subscribe("entry.created", _h)
    assert bus.subscription_count() == 1
    assert bus.unsubscribe(token) is True
    assert bus.subscription_count() == 0


def test_unsubscribe_unknown_token_returns_false(bus: EventBus) -> None:
    from theourgia.core.events.bus import SubscriptionToken

    assert bus.unsubscribe(SubscriptionToken(id=99999, pattern="x")) is False


# ── Pattern matching ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_exact_pattern_matches_only_exact(bus: EventBus) -> None:
    received: list[str] = []

    async def handler(e: DomainEvent) -> None:
        received.append(e.type)

    bus.subscribe("entry.created", handler)
    await bus.publish(DomainEvent(type="entry.created"))
    await bus.publish(DomainEvent(type="entry.updated"))
    assert received == ["entry.created"]


@pytest.mark.asyncio
async def test_dotstar_pattern_matches_prefix(bus: EventBus) -> None:
    received: list[str] = []

    async def handler(e: DomainEvent) -> None:
        received.append(e.type)

    bus.subscribe("entry.*", handler)
    await bus.publish(DomainEvent(type="entry.created"))
    await bus.publish(DomainEvent(type="entry.updated"))
    await bus.publish(DomainEvent(type="auth.signed_in"))
    assert received == ["entry.created", "entry.updated"]


@pytest.mark.asyncio
async def test_wildcard_matches_everything(bus: EventBus) -> None:
    received: list[str] = []

    async def handler(e: DomainEvent) -> None:
        received.append(e.type)

    bus.subscribe("*", handler)
    await bus.publish(DomainEvent(type="entry.created"))
    await bus.publish(DomainEvent(type="auth.signed_in"))
    assert received == ["entry.created", "auth.signed_in"]


# ── Multiple subscribers ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_all_matching_handlers_invoked(bus: EventBus) -> None:
    seen_a: list[str] = []
    seen_b: list[str] = []
    seen_c: list[str] = []

    async def a(e: DomainEvent) -> None:
        seen_a.append(e.type)

    async def b(e: DomainEvent) -> None:
        seen_b.append(e.type)

    async def c(e: DomainEvent) -> None:
        seen_c.append(e.type)

    bus.subscribe("entry.created", a)
    bus.subscribe("entry.*", b)
    bus.subscribe("*", c)

    await bus.publish(DomainEvent(type="entry.created"))

    assert seen_a == ["entry.created"]
    assert seen_b == ["entry.created"]
    assert seen_c == ["entry.created"]


@pytest.mark.asyncio
async def test_handlers_run_in_registration_order(bus: EventBus) -> None:
    order: list[str] = []

    async def first(e: DomainEvent) -> None:
        order.append("first")

    async def second(e: DomainEvent) -> None:
        order.append("second")

    async def third(e: DomainEvent) -> None:
        order.append("third")

    bus.subscribe("entry.created", first)
    bus.subscribe("entry.created", second)
    bus.subscribe("entry.created", third)
    await bus.publish(DomainEvent(type="entry.created"))
    assert order == ["first", "second", "third"]


# ── Strict registry ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_unregistered_event_type_raises(bus: EventBus) -> None:
    with pytest.raises(KeyError, match="not registered"):
        await bus.publish(DomainEvent(type="never.registered"))


@pytest.mark.asyncio
async def test_strict_registry_can_be_disabled(
    bus: EventBus,
) -> None:
    bus.strict_registry = False
    received: list[str] = []

    async def handler(e: DomainEvent) -> None:
        received.append(e.type)

    bus.subscribe("*", handler)
    await bus.publish(DomainEvent(type="ad.hoc.event"))
    assert received == ["ad.hoc.event"]


# ── Error handling ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_handler_exception_does_not_prevent_other_handlers(
    bus: EventBus,
) -> None:
    survivors: list[str] = []

    async def boom(e: DomainEvent) -> None:
        raise RuntimeError("handler exploded")

    async def survivor(e: DomainEvent) -> None:
        survivors.append("ran")

    bus.subscribe("entry.created", boom)
    bus.subscribe("entry.created", survivor)

    with pytest.raises(RuntimeError, match="handler exploded"):
        await bus.publish(DomainEvent(type="entry.created"))

    # The second handler ran before the first error re-raised
    assert survivors == ["ran"]


# ── Sync handlers via as_async_handler ───────────────────────────────


@pytest.mark.asyncio
async def test_sync_handler_via_wrapper(bus: EventBus) -> None:
    received: list[str] = []

    def sync_handler(e: DomainEvent) -> None:
        received.append(e.type)

    bus.subscribe("entry.created", as_async_handler(sync_handler))
    await bus.publish(DomainEvent(type="entry.created"))
    assert received == ["entry.created"]


@pytest.mark.asyncio
async def test_sync_handler_works_without_wrapper(bus: EventBus) -> None:
    """The bus also accepts a sync callable directly — the wrapper is
    a convenience, not a requirement."""
    received: list[str] = []

    def sync_handler(e: DomainEvent) -> None:
        received.append(e.type)

    bus.subscribe("entry.created", sync_handler)
    await bus.publish(DomainEvent(type="entry.created"))
    assert received == ["entry.created"]


# ── Introspection ────────────────────────────────────────────────────


def test_handlers_for_returns_matching_subset(bus: EventBus) -> None:
    async def a(e: DomainEvent) -> None:
        pass

    async def b(e: DomainEvent) -> None:
        pass

    async def c(e: DomainEvent) -> None:
        pass

    bus.subscribe("entry.created", a)
    bus.subscribe("entry.*", b)
    bus.subscribe("auth.signed_in", c)

    matched = bus.handlers_for("entry.created")
    assert a in matched
    assert b in matched
    assert c not in matched


def test_clear_removes_all_subscriptions(bus: EventBus) -> None:
    async def h(e: DomainEvent) -> None:
        pass

    bus.subscribe("entry.created", h)
    bus.subscribe("auth.*", h)
    assert bus.subscription_count() == 2
    bus.clear()
    assert bus.subscription_count() == 0
