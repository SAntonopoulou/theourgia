"""Reusable authorization policies.

Features compose these into their per-resource-type policy chains.
Each policy is a pure async function — no global state, no I/O beyond
what's in the supplied :class:`AuthzContext`.

Available out of the box:

- :func:`owner_only_policy` — only the resource's owner can act.
- :func:`visibility_based_read_policy` — read access based on the
  resource's :class:`Visibility` setting.
- :func:`hub_role_policy_factory` — gate by hub role (factory because
  the required role is configurable).
- :func:`hub_member_policy` — any hub member can perform the action.
- :func:`superuser_global_policy` — superusers permitted globally.
  Off by default — register only if/when a superuser concept exists.

Features may also write their own policies — the registry takes any
callable satisfying the :class:`Policy` signature.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select

from theourgia.core.authz.decisions import AuthorizationDecision

if TYPE_CHECKING:
    from theourgia.core.authz.context import AuthzContext
    from theourgia.core.authz.resource import Resource
    from theourgia.core.authz.scopes import Scope
    from theourgia.models.identity import User

__all__ = [
    "hub_member_policy",
    "hub_role_policy_factory",
    "owner_only_policy",
    "visibility_based_read_policy",
]


# Read-style actions — used by visibility-based reads.
_READ_ACTIONS_BY_VALUE: frozenset[str] = frozenset(
    {
        "entry.read",
        "entity.read",
        "vault.read",
        "hub.read",
        "session.read",
        "audit.read",
    }
)


async def owner_only_policy(
    user: "User",
    action: "Scope",
    resource: "Resource",
    context: "AuthzContext",
) -> AuthorizationDecision | None:
    """Allow if the user owns the resource. Abstain otherwise.

    Looks for ``owner_id``, ``user_id``, or ``creator_id`` on the
    resource — whichever the model uses. Resources without any of those
    abstain (the policy isn't applicable)."""
    for attr in ("owner_id", "user_id", "creator_id"):
        owner_id = getattr(resource, attr, None)
        if owner_id is None:
            continue
        if owner_id == user.id:
            return AuthorizationDecision.allow(
                reason="user owns the resource",
                policy_name="owner_only",
            )
        return None
    return None


async def visibility_based_read_policy(
    user: "User",
    action: "Scope",
    resource: "Resource",
    context: "AuthzContext",
) -> AuthorizationDecision | None:
    """Read-only policy keyed on the resource's :class:`Visibility`.

    Abstains for non-read actions, for resources without a
    ``visibility`` field, and for any case the underlying check
    function denies (so other policies — owner_only, etc. — get a
    chance)."""
    action_value = getattr(action, "value", str(action))
    if action_value not in _READ_ACTIONS_BY_VALUE:
        return None

    visibility = getattr(resource, "visibility", None)
    owner_id = getattr(resource, "owner_id", None) or getattr(
        resource, "user_id", None
    )
    if visibility is None or owner_id is None:
        return None

    # Late import — visibility / can_read live in the existing authz
    # package and we want to avoid a circular import at module load.
    from theourgia.core.authz.checks import can_read_with_visibility
    from theourgia.core.authz.visibility import Visibility

    if not isinstance(visibility, Visibility):
        try:
            visibility = Visibility(visibility)
        except (ValueError, KeyError):
            return None

    # NETWORK visibility requires knowing the hubs the content has
    # been published into and the hubs the viewer is a member of, plus
    # whether the viewer is a vault-private-viewer. A feature that uses
    # NETWORK visibility resolves those upstream and passes them via
    # context.metadata; for resources / actions that don't, the policy
    # falls back to PUBLIC / owner-only behavior gracefully.
    content_network_hub_ids = frozenset(
        context.metadata.get("content_network_hub_ids") or ()
    )
    viewer_hub_memberships = frozenset(
        context.metadata.get("viewer_hub_memberships") or ()
    )
    viewer_is_private_viewer_of_vault = bool(
        context.metadata.get("viewer_is_private_viewer_of_vault", False)
    )

    permitted = can_read_with_visibility(
        visibility=visibility,
        viewer_id=user.id,
        content_vault_owner_id=owner_id,
        content_network_hub_ids=content_network_hub_ids,
        viewer_hub_memberships=viewer_hub_memberships,
        viewer_is_private_viewer_of_vault=viewer_is_private_viewer_of_vault,
    )
    if permitted:
        return AuthorizationDecision.allow(
            reason=f"visibility {visibility.name} permits read",
            policy_name="visibility_based_read",
        )
    return None


def hub_role_policy_factory(
    *,
    required_roles: tuple[str, ...],
    hub_id_attr: str = "hub_id",
    name: str | None = None,
):
    """Build a policy that allows the action if the user holds any of
    ``required_roles`` in the resource's hub.

    Args:
        required_roles: Membership role values that grant access
            (``"hub_admin"``, ``"hub_officer"``, ``"hub_member"``).
        hub_id_attr: Attribute on the resource that names its hub.
            Defaults to ``hub_id``; override for nested hubs.
        name: Policy name used in audit logs.
    """
    policy_name = name or f"hub_role[{','.join(required_roles)}]"

    async def _policy(
        user: "User",
        action: "Scope",
        resource: "Resource",
        context: "AuthzContext",
    ) -> AuthorizationDecision | None:
        hub_id = getattr(resource, hub_id_attr, None)
        if hub_id is None:
            return None
        if context.db_session is None:
            # Can't look up membership without a session — abstain
            # rather than deny so other policies get a chance.
            return None
        from theourgia.models.identity import Membership

        result = await context.db_session.execute(
            select(Membership).where(
                Membership.user_id == user.id,
                Membership.hub_id == hub_id,
            )
        )
        membership = result.scalar_one_or_none()
        if membership is None:
            return None
        role_value = getattr(membership.role, "value", str(membership.role))
        if role_value in required_roles:
            return AuthorizationDecision.allow(
                reason=f"hub role {role_value} permits",
                policy_name=policy_name,
            )
        return None

    return _policy


async def hub_member_policy(
    user: "User",
    action: "Scope",
    resource: "Resource",
    context: "AuthzContext",
) -> AuthorizationDecision | None:
    """Allow if the user is any kind of member of the resource's hub."""
    hub_id = getattr(resource, "hub_id", None)
    if hub_id is None or context.db_session is None:
        return None
    from theourgia.models.identity import Membership

    result = await context.db_session.execute(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.hub_id == hub_id,
        )
    )
    if result.scalar_one_or_none() is not None:
        return AuthorizationDecision.allow(
            reason="user is a member of the hub",
            policy_name="hub_member",
        )
    return None
