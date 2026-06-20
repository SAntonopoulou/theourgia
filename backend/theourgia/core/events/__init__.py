"""Domain events — the integration spine.

Features publish events ("entry.created", "divination.logged",
"entity.aliased") and cross-cutting subscribers consume them:

- Plugins (extension-point hooks fire on registered events)
- Federation outbound delivery (publishes to peers)
- AI agents (daskalos subscribes to journal events)
- Notification service (digest mode queues from event stream)
- Email service (transactional emails subscribe to e.g. ``auth.password_reset_requested``)
- Audit log
- Future webhooks

Without this bus, every feature ends up with N inlined hooks. With
it, features publish once and subscribers wire themselves.

The bus supports two delivery modes:

- **In-process synchronous** — :class:`EventBus.publish` invokes
  subscribers right now. Good for plugin extension-point hooks where
  the caller cares about the result and same-process behavior.
- **Persistent / async via outbox** — :func:`enqueue_event` writes a
  row to :class:`OutboxEvent` inside the caller's DB transaction. A
  background dispatcher (Celery beat) reads the outbox and invokes
  subscribers. Survives process death; supports retry; guarantees
  at-least-once delivery for federation / notifications / email.

The pattern: **publish in-process for synchronous reactions**
(plugins, in-memory caches); **enqueue via outbox for durable
side-effects** (federation, email, notifications). Most events use
both — the caller doesn't know or care which subscribers attached.
"""

from __future__ import annotations

from theourgia.core.events.bus import (
    EventBus,
    EventHandler,
    SubscriptionToken,
    default_bus,
)
from theourgia.core.events.event import DomainEvent
from theourgia.core.events.outbox import (
    OutboxDispatcher,
    enqueue_event,
)
from theourgia.core.events.registry import (
    EventTypeRegistry,
    default_event_registry,
    register_event_type,
)

__all__ = [
    "DomainEvent",
    "EventBus",
    "EventHandler",
    "EventTypeRegistry",
    "OutboxDispatcher",
    "SubscriptionToken",
    "default_bus",
    "default_event_registry",
    "enqueue_event",
    "register_event_type",
]
