"""Data export registry — Article 15 (access) + Article 20 (portability).

Each feature that stores user data registers an :class:`Exporter` that
produces a JSON-serializable representation of what it holds for a
single user. The :class:`GDPRService.export_user_data` call iterates
every registered exporter and assembles the per-feature shards into a
single archive.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import TYPE_CHECKING
from uuid import UUID

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = [
    "ExportContext",
    "ExportRegistry",
    "Exporter",
    "default_export_registry",
    "register_exporter",
]


@dataclass
class ExportContext:
    """Ambient state for an export run."""

    user_id: UUID
    db_session: "AsyncSession | None" = None
    request_id: str | None = None
    metadata: dict[str, object] = field(default_factory=dict)


# An exporter is an async callable returning JSON-serializable data.
# Implementations should NOT include data belonging to other users.
Exporter = Callable[[ExportContext], Awaitable[dict[str, object]]]


class ExportRegistry:
    """Per-feature exporter registry.

    Feature owners register at import time; the central export
    endpoint iterates all registered exporters when a user requests
    their data."""

    def __init__(self) -> None:
        self._exporters: dict[str, Exporter] = {}
        self._descriptions: dict[str, str] = {}

    def register(
        self,
        exporter: Exporter,
        *,
        feature: str,
        description: str = "",
    ) -> None:
        """Register an exporter for ``feature``.

        Args:
            exporter: Async callable taking :class:`ExportContext` and
                returning JSON-serializable data.
            feature: Stable feature identifier (``"journal"``,
                ``"divination"``, ``"sigils"``, etc.). One exporter
                per feature; re-registration raises.
            description: Human-readable summary for the GDPR catalog
                page in the admin dashboard.
        """
        if not feature:
            raise ValueError("feature identifier must not be empty")
        if feature in self._exporters:
            raise ValueError(f"exporter already registered for: {feature!r}")
        self._exporters[feature] = exporter
        self._descriptions[feature] = description

    def get(self, feature: str) -> Exporter:
        try:
            return self._exporters[feature]
        except KeyError as exc:
            raise KeyError(f"no exporter registered for: {feature!r}") from exc

    def has(self, feature: str) -> bool:
        return feature in self._exporters

    def all_features(self) -> list[str]:
        return list(self._exporters.keys())

    def description(self, feature: str) -> str:
        return self._descriptions.get(feature, "")

    def clear(self) -> None:
        """Reset. Tests only."""
        self._exporters.clear()
        self._descriptions.clear()


default_export_registry: ExportRegistry = ExportRegistry()


def register_exporter(
    feature: str,
    exporter: Exporter,
    *,
    description: str = "",
    registry: ExportRegistry | None = None,
) -> None:
    """Convenience function — features register via this at import time."""
    target = registry or default_export_registry
    target.register(exporter, feature=feature, description=description)
