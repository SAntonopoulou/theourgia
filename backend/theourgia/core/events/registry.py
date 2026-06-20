"""Event-type registry.

Features register their event types here at module-import time. The
registry exists so:

- The admin dashboard can show every event the instance can emit.
- Subscribers (plugins, the federation engine, the docs generator)
  can introspect the available types.
- Typos in event names are caught at publish time (the bus consults
  the registry before dispatch and raises on unknown types).
- Cross-cutting concerns (auditing, analytics) can iterate over every
  known event without each one having to ping them.

Registration is intentionally separate from emission. The same
discipline as :class:`Scope` and :class:`Capability` — names are stable
identifiers, not free-form strings.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Final

__all__ = [
    "EventType",
    "EventTypeRegistry",
    "default_event_registry",
    "register_event_type",
]


@dataclass(frozen=True, slots=True)
class EventType:
    """A registered domain-event type.

    Attributes:
        name: Dotted identifier, e.g. ``"entry.created"``.
        description: One-line human-readable summary for the admin
            dashboard and docs generator.
        payload_keys: Keys subscribers can expect to find on this
            event's payload. Informational — not enforced at publish
            time (subscribers do their own validation).
        owner: Feature module that owns the event ("auth", "entries",
            "federation", "plugins", …). Used for grouping in the
            admin dashboard.
    """

    name: str
    description: str = ""
    payload_keys: tuple[str, ...] = field(default_factory=tuple)
    owner: str = ""


class EventTypeRegistry:
    """Names → :class:`EventType`. Duplicate registration raises by
    default so accidental name collisions are caught at import time."""

    def __init__(self) -> None:
        self._types: dict[str, EventType] = {}

    def register(self, event_type: EventType, *, overwrite: bool = False) -> EventType:
        if event_type.name in self._types and not overwrite:
            msg = (
                f"event type {event_type.name!r} already registered; "
                "pass overwrite=True to replace (typically a bug)"
            )
            raise ValueError(msg)
        self._types[event_type.name] = event_type
        return event_type

    def get(self, name: str) -> EventType:
        try:
            return self._types[name]
        except KeyError as exc:
            msg = f"event type not registered: {name!r}"
            raise KeyError(msg) from exc

    def has(self, name: str) -> bool:
        return name in self._types

    def all(self) -> list[EventType]:
        """Snapshot of every registered event type. Used by the admin
        dashboard's event catalog page."""
        return list(self._types.values())

    def by_owner(self, owner: str) -> list[EventType]:
        """Events grouped by their owning feature."""
        return [t for t in self._types.values() if t.owner == owner]

    def clear(self) -> None:
        """Reset to empty. Tests only."""
        self._types.clear()


default_event_registry: Final[EventTypeRegistry] = EventTypeRegistry()
"""Process-wide registry. Features register here at import time."""


def register_event_type(
    name: str,
    *,
    description: str = "",
    payload_keys: tuple[str, ...] = (),
    owner: str = "",
    registry: EventTypeRegistry | None = None,
) -> EventType:
    """Convenience function for ``default_event_registry.register(...)``.

    Returns the :class:`EventType` so callers can keep a typed
    reference for use in subscribe / publish calls.
    """
    target = registry or default_event_registry
    return target.register(
        EventType(
            name=name,
            description=description,
            payload_keys=payload_keys,
            owner=owner,
        )
    )
