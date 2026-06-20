"""In-process event bus.

Synchronous fan-out to subscribed handlers. Each handler runs in
sequence; an exception from one handler does not prevent later ones
from running (we collect exceptions and re-raise as a group at the
end, similar to ``ExceptionGroup``).

This is the bus for **same-process reactions** — plugins, in-memory
cache invalidation, audit hook firing. Durable side-effects
(federation delivery, email sending, notification dispatch) go through
the outbox instead.

Handlers are async-callable. Synchronous handlers can be supplied via
:func:`as_async_handler`; the bus normalizes either to the async path.

Wildcards: subscribing to ``"entry.*"`` matches any event whose type
starts with ``entry.``. Subscribing to ``"*"`` matches every event.
Useful for cross-cutting concerns (audit, analytics) that don't want
to maintain a list of every event type.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Final

from theourgia.core.events.event import DomainEvent
from theourgia.core.events.registry import (
    EventTypeRegistry,
    default_event_registry,
)

__all__ = [
    "EventBus",
    "EventHandler",
    "SubscriptionToken",
    "default_bus",
]


_log = logging.getLogger(__name__)


# A handler may be async or sync — the bus normalizes.
EventHandler = Callable[[DomainEvent], Awaitable[None] | None]


@dataclass(frozen=True, slots=True)
class SubscriptionToken:
    """Returned by :meth:`EventBus.subscribe`. Pass back to
    :meth:`EventBus.unsubscribe` to remove the handler."""

    id: int
    pattern: str


@dataclass
class _Subscription:
    id: int
    pattern: str
    handler: EventHandler


class EventBus:
    """Synchronous in-process event bus.

    Construction is cheap; tests create their own and inject. The
    module-level :data:`default_bus` is the process-wide singleton
    features publish to.

    Thread-safety: subscribe / unsubscribe / publish are not
    individually thread-safe. The expectation is that subscription
    happens at import / startup time (single-threaded) and publication
    happens inside the FastAPI / Celery event loop (single-thread per
    worker). If a future feature needs multi-thread access, add a lock.
    """

    def __init__(self, *, registry: EventTypeRegistry | None = None) -> None:
        self._registry = registry or default_event_registry
        self._subscriptions: list[_Subscription] = []
        self._next_id = 1
        self._strict_registry = True

    @property
    def strict_registry(self) -> bool:
        """When True (default), :meth:`publish` raises for unregistered
        event types. Tests sometimes flip this off."""
        return self._strict_registry

    @strict_registry.setter
    def strict_registry(self, value: bool) -> None:
        self._strict_registry = value

    # ── Subscription ─────────────────────────────────────────────────

    def subscribe(
        self, pattern: str, handler: EventHandler
    ) -> SubscriptionToken:
        """Subscribe ``handler`` to events matching ``pattern``.

        ``pattern`` is either an exact event type (``"entry.created"``)
        or a wildcard form ending in ``"*"`` (``"entry.*"``, ``"*"``).
        """
        if not pattern:
            raise ValueError("subscription pattern must not be empty")
        token_id = self._next_id
        self._next_id += 1
        self._subscriptions.append(
            _Subscription(id=token_id, pattern=pattern, handler=handler)
        )
        return SubscriptionToken(id=token_id, pattern=pattern)

    def unsubscribe(self, token: SubscriptionToken) -> bool:
        """Remove a previously-subscribed handler. Returns whether a
        match was found (False = already removed / never subscribed)."""
        before = len(self._subscriptions)
        self._subscriptions = [
            s for s in self._subscriptions if s.id != token.id
        ]
        return len(self._subscriptions) < before

    def clear(self) -> None:
        """Remove every subscription. Tests only."""
        self._subscriptions.clear()

    # ── Introspection ────────────────────────────────────────────────

    def subscription_count(self) -> int:
        return len(self._subscriptions)

    def handlers_for(self, event_type: str) -> list[EventHandler]:
        """Return the handlers that would receive an event of
        ``event_type``. Order is registration order."""
        return [
            s.handler
            for s in self._subscriptions
            if _pattern_matches(s.pattern, event_type)
        ]

    # ── Publication ──────────────────────────────────────────────────

    async def publish(self, event: DomainEvent) -> None:
        """Deliver ``event`` to every matching subscriber.

        Each handler runs in registration order; an exception from one
        handler is logged and other handlers still run, then the
        first exception is re-raised at the end. (Subsequent
        exceptions are logged but not re-raised; this matches what
        an `ExceptionGroup` would do, without requiring 3.11+ syntax
        in every caller.)
        """
        if self._strict_registry and not self._registry.has(event.type):
            msg = (
                f"event type not registered: {event.type!r}. "
                "Register via theourgia.core.events.register_event_type "
                "or disable strict_registry on the bus."
            )
            raise KeyError(msg)

        first_error: BaseException | None = None
        for subscription in list(self._subscriptions):
            if not _pattern_matches(subscription.pattern, event.type):
                continue
            try:
                result = subscription.handler(event)
                if isinstance(result, Awaitable):
                    await result
            except BaseException as exc:  # noqa: BLE001 — fan-out resilience
                if first_error is None:
                    first_error = exc
                _log.exception(
                    "event.handler.failed",
                    extra={
                        "event_type": event.type,
                        "pattern": subscription.pattern,
                    },
                )

        if first_error is not None:
            raise first_error


def _pattern_matches(pattern: str, event_type: str) -> bool:
    if pattern == "*":
        return True
    if pattern.endswith(".*"):
        prefix = pattern[:-1]  # keep trailing dot
        return event_type.startswith(prefix)
    return pattern == event_type


# ── Helpers ──────────────────────────────────────────────────────────


def as_async_handler(
    fn: Callable[[DomainEvent], None],
) -> Callable[[DomainEvent], Awaitable[None]]:
    """Wrap a sync handler so it satisfies the async-handler signature.

    Most handlers are naturally async, but a few (test stubs,
    in-memory cache invalidators) are sync. This wrapper lets the bus
    treat them uniformly."""

    async def _wrapper(event: DomainEvent) -> None:
        fn(event)

    return _wrapper


# Process-wide singleton
default_bus: Final[EventBus] = EventBus()
"""The bus features publish to by default. Tests construct their own."""
