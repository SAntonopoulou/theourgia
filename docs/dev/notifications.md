# Notifications — developer guide

In-app inbox + email + web push, from a single feature call. Channels are pluggable; per-user preferences gate which actually fire.

## The substrate at a glance

```
core/notifications/
├── message.py         # NotificationMessage + DeliveryChannel enum
├── templates.py       # NotificationTemplate + registry
├── preferences.py     # PreferenceSet + PreferenceResolver
├── service.py         # NotificationService (the orchestrator)
└── channels/
    ├── base.py        # NotificationChannel Protocol
    ├── in_app.py      # writes to Notification table
    ├── email.py       # bridges to email substrate (S1)
    └── web_push.py    # Web Push (stub at S4; real impl Phase 02+)

models/notifications.py    # Notification + NotificationPreference
```

## Pattern: declare a template

```python
# theourgia/features/entities/notifications.py
from theourgia.core.notifications import (
    DeliveryChannel,
    NotificationTemplate,
    default_notification_registry,
)

ENTITY_MERGED = NotificationTemplate(
    name="entity.merged",
    kind="social",
    subject="Your entity $name was merged",
    body_text=(
        "$actor_name merged $name with $into.\n"
        "You can review the merge from your entity dashboard."
    ),
    body_html=(
        "<p><strong>$actor_name</strong> merged "
        "<em>$name</em> with <em>$into</em>.</p>"
    ),
    action_url="https://$host/entities/$entity_id",
    action_label="Review entity",
    default_channels=(DeliveryChannel.IN_APP, DeliveryChannel.EMAIL),
)


def register() -> None:
    default_notification_registry.register(ENTITY_MERGED)
```

Call `register()` from the feature's module init.

## Pattern: send a notification

```python
from theourgia.core.notifications import NotificationService

await notification_service.send_to_user(
    user_id=user.id,
    template="entity.merged",
    context={
        "actor_name": actor.display_name,
        "name": entity.name,
        "into": target.name,
        "host": settings.base_url,
        "entity_id": str(entity.id),
    },
)
```

The service:

1. Looks up the recipient (email address, push subscriptions, etc.).
2. Loads the template by name.
3. Consults the user's preferences for the template's `kind`.
4. Renders once.
5. Dispatches to every enabled channel.

If one channel fails, others still fire — the service swallows the first error unless ALL channels fail, in which case it re-raises.

## Pattern: preferences

User-facing UI sets:

```python
PreferenceSet(
    enabled={
        "social": frozenset({DeliveryChannel.IN_APP}),     # social: in-app only
        "security": frozenset({                            # security: everything
            DeliveryChannel.IN_APP,
            DeliveryChannel.EMAIL,
            DeliveryChannel.WEB_PUSH,
        }),
    },
    fully_muted=False,
)
```

- `fully_muted=True` — no notifications fire, regardless of per-kind settings.
- Per-kind set absent — template defaults apply.
- Per-kind empty set — kind disabled entirely.
- Per-kind set: intersection with template defaults (user can't enable a channel the template doesn't support).

## Pattern: testing

```python
@pytest.mark.asyncio
async def test_feature_notifies_user():
    registry = NotificationTemplateRegistry()
    registry.register(MY_TEMPLATE)

    in_app = _RecordingChannel(DeliveryChannel.IN_APP)
    service = NotificationService(
        channels=[in_app],
        recipients=InMemoryRecipientLookup({user.id: RecipientInfo(user_id=user.id, email="...")}),
        preferences=InMemoryPreferenceResolver(),
        registry=registry,
    )

    await my_feature.do_thing(notification_service=service)

    assert len(in_app.received) == 1
    assert in_app.received[0].subject == "Expected subject"
```

## Channel notes

- **In-app** writes a `Notification` row. The frontend reads from this table for the user's inbox/badge.
- **Email** bridges to the email substrate. Convention: notification template `entity.merged` produces an email tagged `template_name="notif.entity.merged"` — no separate email template required for the simple case (the notification's rendered subject + bodies are used directly).
- **Web push** is stubbed at this batch — the channel accepts messages and logs an event, but doesn't actually push. Real delivery lands once the frontend ships a service worker (Phase 02+) and the operator configures VAPID keys.

## At-least-once delivery — what subscribers must tolerate

For the email channel: same at-least-once contract as the email substrate (S1) — the email service may retry on transient failure. For in-app: writing the row is transactional; duplicate-row prevention is the caller's responsibility if they care (most don't; users dismiss duplicates easily).

## Sync vs async dispatch

`send_to_user` is async but inline. For fire-and-forget delivery in production, wrap calls in a Celery task (a generic `dispatch_notification` task lands in a later batch when the first feature needs it).
