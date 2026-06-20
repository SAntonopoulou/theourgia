"""Resource protocol — the shape :func:`authorize` checks access against.

Any model that ``authorize()`` can decide about must satisfy
:class:`Resource`:

- ``resource_type`` (class-level): a stable string identifier matching
  the policy-registration key (``"entry"``, ``"vault"``, ``"hub"``,
  ``"entity"``, ``"plugin"``, etc.).
- ``id`` (instance): the row's primary key, for log correlation.

Most domain models will simply declare ``resource_type: ClassVar[str] =
"entry"`` alongside their table definition. Models that don't represent
a single row (e.g. operations like "list my vaults") use the
:data:`GLOBAL_RESOURCE` sentinel.

Adding more attributes (``owner_id``, ``visibility``, ``vault_id``,
``hub_id``) is the responsibility of the model itself and the policies
that consume them — the Protocol intentionally requires only the
identifying pair.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import ClassVar, Final, Protocol, runtime_checkable
from uuid import UUID

__all__ = ["GLOBAL_RESOURCE", "Resource"]


@runtime_checkable
class Resource(Protocol):
    """The minimum shape :func:`authorize` requires."""

    resource_type: ClassVar[str]
    id: UUID


@dataclass(frozen=True, slots=True)
class _GlobalResource:
    """Sentinel for global actions (admin observe, hub create, etc.)
    that don't target a single row.

    Policies that handle global actions register for
    ``resource_type="__global__"``. The :data:`GLOBAL_RESOURCE`
    singleton satisfies the :class:`Resource` protocol for these calls.
    """

    resource_type: ClassVar[str] = "__global__"
    id: UUID = UUID("00000000-0000-0000-0000-000000000000")


GLOBAL_RESOURCE: Final[_GlobalResource] = _GlobalResource()
"""Sentinel resource for global authorization checks.

Pass to ``authorize()`` when the action doesn't target a single row —
e.g. ``admin.observe``, ``hub.create``, ``backup.run``."""
