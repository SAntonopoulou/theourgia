"""DomainEvent — the value type that crosses the bus.

A :class:`DomainEvent` is immutable and self-describing: type tag,
occurred-at timestamp, actor (who triggered it), and a typed payload.
Every subscriber receives the same instance — never mutate it.

Type tags are dotted, like scope names: ``entry.created``,
``federation.peer_added``, ``auth.password_reset_requested``. They
live in a registry (:class:`EventTypeRegistry`) where each carries a
description and an expected payload shape; subscribers reference
events by type tag, so renaming an event is an intentional breaking
change for every subscriber.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Final
from uuid import UUID

from theourgia.core.ids import uuid7

__all__ = ["DomainEvent"]


def _utcnow() -> datetime:
    return datetime.now(tz=UTC)


@dataclass(frozen=True, slots=True)
class DomainEvent:
    """A domain event ready to publish.

    Attributes:
        type: Dotted event type tag. Must be registered with the
            :class:`EventTypeRegistry` before publication.
        payload: The event's data. Should contain primitive types only
            (JSON-serializable) — events cross process boundaries via
            the outbox and arbitrary Python objects don't survive.
        id: Per-event UUID for correlation and dedup. Auto-generated
            if not supplied.
        occurred_at: When the event happened. Defaults to now-UTC.
        actor_id: User who triggered the event. None for system events
            (scheduled tasks, federation receipt, etc.).
        request_id: For events emitted during an HTTP request — the
            request ID for log correlation. None outside that context.
        metadata: Free-form additional context (vault_id, hub_id,
            plugin name, etc.). Subscribers may inspect but should not
            depend on specific keys unless they're defined by the
            event type's schema.
    """

    type: str
    payload: dict[str, Any] = field(default_factory=dict)
    id: UUID = field(default_factory=uuid7)
    occurred_at: datetime = field(default_factory=_utcnow)
    actor_id: UUID | None = None
    request_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.type:
            raise ValueError("DomainEvent.type must not be empty")
        if "." not in self.type:
            raise ValueError(
                f"DomainEvent.type must be dotted (e.g. 'entry.created'); "
                f"got {self.type!r}"
            )

    def to_dict(self) -> dict[str, Any]:
        """JSON-serializable representation for the outbox.

        The payload and metadata are stored as JSON; UUIDs as strings;
        the timestamp as RFC 3339."""
        return {
            "type": self.type,
            "payload": dict(self.payload),
            "id": str(self.id),
            "occurred_at": self.occurred_at.isoformat(),
            "actor_id": str(self.actor_id) if self.actor_id else None,
            "request_id": self.request_id,
            "metadata": dict(self.metadata),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "DomainEvent":
        """Reconstruct from :meth:`to_dict` output.

        Used by the outbox dispatcher when reading rows back."""
        return cls(
            type=str(data["type"]),
            payload=dict(data.get("payload", {})),
            id=UUID(str(data["id"])),
            occurred_at=_parse_iso(str(data["occurred_at"])),
            actor_id=UUID(str(data["actor_id"])) if data.get("actor_id") else None,
            request_id=data.get("request_id"),
            metadata=dict(data.get("metadata", {})),
        )


def _parse_iso(s: str) -> datetime:
    """Parse the ISO-format timestamps we emit. Always tz-aware UTC."""
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)
