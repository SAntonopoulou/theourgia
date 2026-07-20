"""Default policies registered at app startup.

The substrate ships a small set of baseline policies so endpoints that
``require_scope(...)`` against :data:`GLOBAL_RESOURCE` actions work
out of the box without each feature wiring its own. These are the
minimum needed to keep the existing endpoints (metrics, etc.)
functional after the substrate becomes teeth-having.

Feature modules register their own per-resource-type policies in their
own ``register()`` functions.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select

from theourgia.core.authz.decisions import AuthorizationDecision
from theourgia.core.authz.policy import (
    PolicyRegistry,
    default_policy_registry,
)
from theourgia.core.authz.scopes import Scope

if TYPE_CHECKING:
    from theourgia.core.authz.context import AuthzContext
    from theourgia.core.authz.resource import Resource
    from theourgia.models.identity import User

__all__ = ["register_default_policies"]


# Scopes that ANY authenticated user may perform globally (no resource
# context required) — basic per-self operations like reading sessions,
# updating their own password, enrolling in 2FA. KEY_ROTATE is
# per-self too: the keys router resolves the vault by ownership, so
# the scope can only ever act on the caller's own vault (v1-027).
_USER_SELF_SCOPES: frozenset[Scope] = frozenset(
    {
        Scope.SESSION_READ,
        Scope.SESSION_REVOKE,
        Scope.USER_PASSWORD_CHANGE,
        Scope.USER_2FA_ENROLL,
        Scope.USER_2FA_DISABLE,
        Scope.KEY_ROTATE,
    }
)


# Scopes that require hub_admin or hub_officer membership somewhere on
# the instance — admin observability, backup runs, audit reads.
_HUB_OFFICER_SCOPES: frozenset[Scope] = frozenset(
    {
        Scope.ADMIN_OBSERVE,
        Scope.BACKUP_RUN,
        Scope.BACKUP_RESTORE,
        Scope.AUDIT_READ,
    }
)


async def _self_scope_policy(
    user: "User",
    action: "Scope",
    resource: "Resource",
    context: "AuthzContext",
) -> AuthorizationDecision | None:
    """Allow user-self scopes for any authenticated user."""
    if action in _USER_SELF_SCOPES:
        return AuthorizationDecision.allow(
            reason="self-scope permitted for authenticated user",
            policy_name="self_scope",
        )
    return None


async def _hub_officer_global_policy(
    user: "User",
    action: "Scope",
    resource: "Resource",
    context: "AuthzContext",
) -> AuthorizationDecision | None:
    """Allow hub-officer-grade scopes if the user is hub_admin or
    hub_officer anywhere on the instance."""
    if action not in _HUB_OFFICER_SCOPES:
        return None
    if context.db_session is None:
        return None
    from theourgia.models.identity import Membership

    result = await context.db_session.execute(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.role.in_(["hub_admin", "hub_officer"]),  # type: ignore[arg-type]
        ).limit(1)
    )
    if result.scalar_one_or_none() is not None:
        return AuthorizationDecision.allow(
            reason="user holds hub_admin or hub_officer role",
            policy_name="hub_officer_global",
        )
    return None


def register_default_policies(
    registry: PolicyRegistry | None = None,
) -> None:
    """Install the substrate's baseline policies on ``registry``.

    **Idempotent** — safe to call multiple times. Each baseline is
    skipped if a policy of the same name is already registered for the
    global resource. This matters in tests that clear the registry
    mid-run and want to re-install the baseline without duplication."""
    target = registry or default_policy_registry
    existing_global_names = {
        name for name, _ in target.policies_for("__global__")
    }

    if "self_scope" not in existing_global_names:
        target.register(
            _self_scope_policy,
            name="self_scope",
            resource_type="__global__",
        )
    if "hub_officer_global" not in existing_global_names:
        target.register(
            _hub_officer_global_policy,
            name="hub_officer_global",
            resource_type="__global__",
        )
