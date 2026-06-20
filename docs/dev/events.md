# Domain events — developer guide

Theourgia's integration spine. Features publish events; plugins, federation, AI agents, notifications, email digests, and audit all subscribe to the same bus.

## The substrate at a glance

```
core/events/
├── event.py          # DomainEvent — the value type
├── registry.py       # EventType + EventTypeRegistry
├── bus.py            # In-process EventBus (synchronous fan-out)
└── outbox.py         # Outbox dispatcher (durable async delivery)

models/events.py      # OutboxEvent table
```

## When to publish in-process vs through the outbox

**In-process (`EventBus.publish`)** — synchronous reactions inside the current request:
- Plugin extension-point hooks (the plugin host listens for `entry.created` to fire `on_entry_created`)
- In-memory cache invalidation
- Same-process audit fan-out

**Outbox (`enqueue_event`)** — durable side-effects that must survive process death:
- Federation outbound delivery
- Email sending
- Notification dispatch
- Webhook firing

Most events use **both**: features call both `enqueue_event` (durable subscribers) and `EventBus.publish` (synchronous subscribers), and the caller doesn't know which subscribers attached where.

## Pattern: declaring an event

Event types live in a registry, declared near the feature that owns them:

```python
# theourgia/features/entries/events.py
from theourgia.core.events import register_event_type

ENTRY_CREATED = register_event_type(
    "entry.created",
    description="A journal entry was created.",
    payload_keys=("entry_id", "vault_id", "visibility"),
    owner="entries",
)

ENTRY_UPDATED = register_event_type(
    "entry.updated",
    description="A journal entry was updated.",
    payload_keys=("entry_id", "fields_changed"),
    owner="entries",
)
```

Call `register_event_type` at module-import time. Duplicate names raise — typos are caught at boot, not at the first publish.

## Pattern: publishing in-process

```python
from theourgia.core.events import default_bus, DomainEvent

await default_bus.publish(
    DomainEvent(
        type="entry.created",
        payload={
            "entry_id": str(entry.id),
            "vault_id": str(entry.vault_id),
            "visibility": entry.visibility.value,
        },
        actor_id=current_user.id,
        request_id=request.state.request_id,
    )
)
```

This fans out synchronously to every matching subscriber. An exception in one handler logs and continues; the first exception re-raises after all handlers have had a chance to run.

## Pattern: publishing via the outbox (durable)

```python
from theourgia.core.events import enqueue_event, DomainEvent

async with session_scope() as session:
    entry = Entry(...)
    session.add(entry)
    await enqueue_event(
        session,
        DomainEvent(
            type="entry.created",
            payload={"entry_id": str(entry.id)},
            actor_id=current_user.id,
        ),
    )
    await session.commit()
```

The event row is written in the **same transaction** as the business write. If the commit fails, no event leaks; if the commit succeeds, the dispatcher picks it up on the next tick (within seconds) and fans out via the bus.

## Pattern: subscribing

```python
from theourgia.core.events import default_bus
from theourgia.core.events.event import DomainEvent

async def on_entry_created(event: DomainEvent) -> None:
    # event.payload contains what the publisher recorded
    ...

token = default_bus.subscribe("entry.created", on_entry_created)
```

Subscribe patterns:

- Exact: `"entry.created"` — only that specific type.
- Prefix wildcard: `"entry.*"` — every type starting with `entry.`.
- Catch-all: `"*"` — every event. Use for cross-cutting concerns (audit, analytics).

The returned `SubscriptionToken` can be passed to `unsubscribe`; in practice features subscribe at import time and never unsubscribe.

## Pattern: testing

```python
import pytest
from theourgia.core.events.bus import EventBus
from theourgia.core.events.event import DomainEvent
from theourgia.core.events.registry import EventType, EventTypeRegistry


@pytest.fixture
def bus():
    registry = EventTypeRegistry()
    registry.register(EventType(name="my_feature.thing_happened"))
    return EventBus(registry=registry)


@pytest.mark.asyncio
async def test_my_feature_publishes_event(bus):
    received = []
    bus.subscribe("my_feature.thing_happened", lambda e: received.append(e))
    await my_feature.do_thing(bus=bus)
    assert len(received) == 1
    assert received[0].payload["x"] == "expected"
```

The bus accepts both async and sync handlers; for sync ones a wrapper is available via `as_async_handler`.

## At-least-once delivery — what subscribers must tolerate

The outbox guarantees at-least-once, not exactly-once. A dispatcher crash between "publish succeeded" and "row marked delivered" results in a retry. Subscribers that produce external effects (sending an email, calling a federation peer, writing to an external API) **must** be idempotent — typically by keying on `event.id` for dedup.

In-process publication via `EventBus.publish` is exactly-once within the process boundary. The at-least-once concern is only for outbox-routed events.

## The dispatcher

`OutboxDispatcher.tick(session)` is the worker that drains the outbox. Wire it into Celery beat with a short schedule (e.g., every 5 seconds). The dispatcher:

1. Reads up to `batch_size` (default 100) pending rows scheduled for "now or earlier."
2. Reconstructs `DomainEvent` from each payload.
3. Publishes via the in-process bus.
4. On success: marks `delivered`.
5. On failure: increments `attempts`, schedules retry for `now + retry_after`, captures `last_error`. After `max_attempts` (default 10) the row is marked `dead` for operator investigation.

Dead-letter rows surface in the admin dashboard.
