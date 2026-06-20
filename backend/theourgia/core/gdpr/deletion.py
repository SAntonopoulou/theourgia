"""Data deletion registry — Article 17 (right to erasure).

Each feature that stores user data registers a deletion handler that
removes or anonymizes its storage for a given user.

Two strategies a handler can use:

- **Delete** — drop the rows. Use for content the user wholly owns
  (entries, divinations, uploads, etc.).
- **Anonymize** — null out user-identifying fields, keep the row.
  Use for content that has been federated / published into shared
  spaces where wholesale deletion would orphan references on peer
  instances. (E.g., an entry shared into a hub: the row stays for
  archival purposes, but ``owner_id`` becomes NULL and
  user-identifying content is redacted.)

Each handler returns a :class:`DeletionReport` describing what it did
so the service can record the operation in an audit row.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import TYPE_CHECKING
from uuid import UUID

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = [
    "DeletionContext",
    "DeletionHandler",
    "DeletionRegistry",
    "DeletionReport",
    "default_deletion_registry",
    "register_deletion_handler",
]


@dataclass
class DeletionContext:
    """Ambient state for a deletion run."""

    user_id: UUID
    db_session: "AsyncSession | None" = None
    request_id: str | None = None
    metadata: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class DeletionReport:
    """What a deletion handler did.

    Attributes:
        feature: Stable feature identifier.
        rows_deleted: How many rows were hard-deleted.
        rows_anonymized: How many rows had identifying fields nulled.
        notes: Human-readable additional info (e.g. ``"federation
            outbound deliveries cancelled"``).
    """

    feature: str
    rows_deleted: int = 0
    rows_anonymized: int = 0
    notes: str = ""


DeletionHandler = Callable[[DeletionContext], Awaitable[DeletionReport]]


class DeletionRegistry:
    """Per-feature deletion-handler registry."""

    def __init__(self) -> None:
        self._handlers: dict[str, DeletionHandler] = {}
        self._descriptions: dict[str, str] = {}

    def register(
        self,
        handler: DeletionHandler,
        *,
        feature: str,
        description: str = "",
    ) -> None:
        if not feature:
            raise ValueError("feature identifier must not be empty")
        if feature in self._handlers:
            raise ValueError(
                f"deletion handler already registered for: {feature!r}"
            )
        self._handlers[feature] = handler
        self._descriptions[feature] = description

    def get(self, feature: str) -> DeletionHandler:
        try:
            return self._handlers[feature]
        except KeyError as exc:
            raise KeyError(
                f"no deletion handler registered for: {feature!r}"
            ) from exc

    def has(self, feature: str) -> bool:
        return feature in self._handlers

    def all_features(self) -> list[str]:
        return list(self._handlers.keys())

    def description(self, feature: str) -> str:
        return self._descriptions.get(feature, "")

    def clear(self) -> None:
        self._handlers.clear()
        self._descriptions.clear()


default_deletion_registry: DeletionRegistry = DeletionRegistry()


def register_deletion_handler(
    feature: str,
    handler: DeletionHandler,
    *,
    description: str = "",
    registry: DeletionRegistry | None = None,
) -> None:
    """Convenience function for import-time registration."""
    target = registry or default_deletion_registry
    target.register(handler, feature=feature, description=description)
