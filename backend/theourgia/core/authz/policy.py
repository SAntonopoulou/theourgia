"""Policy abstraction + registry.

A *policy* is an async callable that takes
``(user, action, resource, context)`` and returns either an
:class:`AuthorizationDecision` (a definite verdict) or ``None``
(abstain — let the next policy decide).

Policies are registered against a ``resource_type`` (matching the
:class:`Resource` shape). The registry resolves which policies apply
for a given resource and hands them to :func:`authorize` in
registration order.

Two registration modes:

- **Per-resource-type** — registered against a specific string,
  matches resources of that type only. Most policies.
- **Global** (resource_type=None) — applies to every resource type as
  a fallback. Used by sweeping policies like "superusers can do
  anything"; not the place for fine-grained logic.

Per-resource-type policies run BEFORE global policies.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import TYPE_CHECKING

from theourgia.core.authz.decisions import AuthorizationDecision

if TYPE_CHECKING:
    from theourgia.core.authz.context import AuthzContext
    from theourgia.core.authz.resource import Resource
    from theourgia.core.authz.scopes import Scope
    from theourgia.models.identity import User

__all__ = ["Policy", "PolicyRegistry", "default_policy_registry"]


# A policy callable. None = abstain; AuthorizationDecision = verdict.
Policy = Callable[
    ["User", "Scope", "Resource", "AuthzContext"],
    Awaitable["AuthorizationDecision | None"],
]


class PolicyRegistry:
    """Per-resource-type policy registry.

    Thread-safety: registration is expected to happen at module import
    time (single-threaded). Lookups are read-only and lock-free.
    """

    def __init__(self) -> None:
        self._per_type: dict[str, list[tuple[str, Policy]]] = {}
        self._global: list[tuple[str, Policy]] = []

    def register(
        self,
        policy: Policy,
        *,
        name: str,
        resource_type: str | None = None,
    ) -> None:
        """Register ``policy`` under ``name``.

        Args:
            policy: The async callable.
            name: Short stable identifier — appears in audit logs +
                returned :class:`AuthorizationDecision.policy_name`.
            resource_type: Resource type this policy applies to. If
                None, the policy is global (runs after per-type
                policies).
        """
        if not name:
            raise ValueError("policy name must not be empty")
        entry = (name, policy)
        if resource_type is None:
            self._global.append(entry)
        else:
            self._per_type.setdefault(resource_type, []).append(entry)

    def policies_for(self, resource_type: str) -> list[tuple[str, Policy]]:
        """Return the policies that apply to ``resource_type``, in
        evaluation order (per-type first, then global)."""
        return self._per_type.get(resource_type, []) + self._global

    def all_resource_types(self) -> list[str]:
        """Snapshot of every resource_type with at least one policy.
        Used by the admin dashboard's authorization-rules page."""
        return list(self._per_type.keys())

    def clear(self) -> None:
        """Reset to empty. Tests only."""
        self._per_type.clear()
        self._global.clear()


default_policy_registry: PolicyRegistry = PolicyRegistry()
"""Process-wide registry. Features register their policies here at
import time, alongside the resource type they own."""
