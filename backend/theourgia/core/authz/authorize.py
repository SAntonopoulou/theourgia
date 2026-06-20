"""The ``authorize()`` entry point.

Composes the registered policies for a resource's type and returns
the first non-abstain decision. Default: **deny**.

This is the single call point features use for authorization. Don't
write `if user.id == thing.owner_id` inline; register an owner-check
policy and call ``authorize()``.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from theourgia.core.authz.decisions import AuthorizationDecision
from theourgia.core.authz.policy import (
    PolicyRegistry,
    default_policy_registry,
)

if TYPE_CHECKING:
    from theourgia.core.authz.context import AuthzContext
    from theourgia.core.authz.resource import Resource
    from theourgia.core.authz.scopes import Scope
    from theourgia.models.identity import User

__all__ = ["authorize"]

_log = logging.getLogger(__name__)


async def authorize(
    *,
    user: "User | None",
    action: "Scope",
    resource: "Resource",
    context: "AuthzContext",
    registry: PolicyRegistry | None = None,
) -> AuthorizationDecision:
    """Decide whether ``user`` may perform ``action`` against ``resource``.

    Composition: looks up policies registered against the resource's
    ``resource_type``, then global policies, runs them in registration
    order, and returns the first non-abstain decision.

    Args:
        user: Authenticated user, or None for anonymous requests.
            Anonymous always denies unless a policy explicitly allows
            (e.g., public-read).
        action: The :class:`Scope` the caller intends to perform.
        resource: A :class:`Resource` (concrete model row, or
            :data:`GLOBAL_RESOURCE`).
        context: Per-request state — DB session, request id, etc.
        registry: Override for the policy registry. Tests use this to
            isolate; production uses :data:`default_policy_registry`.

    Returns:
        An :class:`AuthorizationDecision`. Callers raise
        :class:`ForbiddenError` (or 401 / 403 equivalents) on
        ``allowed=False``.
    """
    reg = registry or default_policy_registry
    resource_type = resource.resource_type
    policies = reg.policies_for(resource_type)

    if user is None:
        decision = AuthorizationDecision.deny(
            reason="unauthenticated request",
            policy_name="default_anonymous_deny",
        )
        _log_decision(decision, action, resource, user, context)
        return decision

    for name, policy in policies:
        result = await policy(user, action, resource, context)
        if result is None:
            continue
        # Stamp the policy_name in case the policy author didn't set it
        if not result.policy_name:
            result = AuthorizationDecision(
                allowed=result.allowed,
                reason=result.reason,
                policy_name=name,
            )
        _log_decision(result, action, resource, user, context)
        return result

    decision = AuthorizationDecision.deny(
        reason="no policy permitted the action",
        policy_name="default_deny",
    )
    _log_decision(decision, action, resource, user, context)
    return decision


def _log_decision(
    decision: AuthorizationDecision,
    action: "Scope",
    resource: "Resource",
    user: "User | None",
    context: "AuthzContext",
) -> None:
    """Emit a structured log line for the decision.

    Denials log at WARNING (operationally useful for spotting probing
    behavior); permits log at DEBUG (audit-trail-only)."""
    level = logging.DEBUG if decision.allowed else logging.WARNING
    _log.log(
        level,
        "authz.decision",
        extra={
            "allowed": decision.allowed,
            "policy": decision.policy_name,
            "reason": decision.reason,
            "action": getattr(action, "value", str(action)),
            "resource_type": resource.resource_type,
            "resource_id": str(resource.id),
            "user_id": str(user.id) if user is not None else None,
            "request_id": context.request_id,
        },
    )
