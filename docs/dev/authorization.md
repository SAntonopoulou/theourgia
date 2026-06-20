# Authorization — developer guide

How features decide who can do what. Replaces the Phase 01 placeholder where `require_scope` accepted any authenticated user.

## The substrate at a glance

```
core/authz/
├── decisions.py       # AuthorizationDecision (allow / deny / policy_name)
├── resource.py        # Resource Protocol + GLOBAL_RESOURCE sentinel
├── context.py         # AuthzContext (db_session, request_id, metadata)
├── policy.py          # Policy callable + PolicyRegistry
├── authorize.py       # authorize(user, action, resource, context)
├── policies.py        # owner_only, visibility_based_read, hub_role_*
├── defaults.py        # baseline global policies installed at app start
├── checks.py          # pure can_read_with_visibility / can_write_with_visibility
├── visibility.py      # Visibility enum
├── scopes.py          # Scope enum
└── rls.py             # PostgreSQL RLS GUC setter
```

## The model

Three layers, defense-in-depth:

1. **Application-layer policies** (this substrate) — feature-specific logic.
2. **PostgreSQL Row-Level Security** — backstop. Even if a policy bug lets a row through application checks, RLS rejects it.
3. **Audit log** — every denial logs at WARNING for visibility into probing behavior.

## Pattern: feature registers its policies

A feature owns a resource type. At module import time, it registers policies for that type:

```python
# theourgia/features/entries/policies.py
from theourgia.core.authz import (
    default_policy_registry,
    owner_only_policy,
    visibility_based_read_policy,
)


def register() -> None:
    default_policy_registry.register(
        owner_only_policy,
        name="entry_owner_only",
        resource_type="entry",
    )
    default_policy_registry.register(
        visibility_based_read_policy,
        name="entry_visibility_read",
        resource_type="entry",
    )
```

Order matters: `authorize()` evaluates policies in registration order and returns the first non-abstain decision. Put more-permissive policies before more-restrictive ones; put fast checks before expensive DB-touching ones.

## Pattern: model declares its resource_type

```python
class Entry(IDMixin, TimestampMixin, table=True):
    __tablename__ = "entry"
    resource_type: ClassVar[str] = "entry"

    owner_id: UUID = Field(...)
    visibility: Visibility = Field(...)
    # ...
```

`resource_type` is what the policy registry keys on. Make it stable — renaming it later is a breaking change for the policy chain.

## Pattern: endpoint authorizes

Inside an endpoint that has loaded the resource:

```python
from theourgia.core.authz import authorize, AuthzContext

@router.get("/entries/{id}")
async def get_entry(
    id: UUID,
    user: CurrentUser,
    session: DBSession,
    request: Request,
):
    entry = await session.get(Entry, id)
    if entry is None:
        raise NotFoundError("entry not found")

    decision = await authorize(
        user=user,
        action=Scope.ENTRY_READ,
        resource=entry,
        context=AuthzContext(
            db_session=session,
            request_id=request.state.request_id,
        ),
    )
    if not decision.allowed:
        raise ForbiddenError(decision.reason)

    return entry
```

Or use the `require_access` dependency factory:

```python
from theourgia.api.deps import require_access

async def get_entry_by_id(id: UUID, session: DBSession) -> Entry:
    entry = await session.get(Entry, id)
    if entry is None:
        raise NotFoundError("entry not found")
    return entry

@router.get("/entries/{id}")
async def get_entry(
    entry: Annotated[
        Entry,
        Depends(require_access(Scope.ENTRY_READ, get_entry_by_id)),
    ],
) -> Entry:
    return entry
```

## Pattern: global actions

For actions that don't target a single resource — admin observability, `backup.run`, `hub.create`:

```python
@router.get("/metrics")
async def metrics(
    _user: Annotated[User, Depends(require_scope(Scope.ADMIN_OBSERVE))],
):
    ...
```

`require_scope` routes through `authorize()` against `GLOBAL_RESOURCE`. The baseline `register_default_policies()` (installed at app startup) handles user-self scopes and hub-officer-grade global actions; features add per-action global policies as needed.

## Writing a policy

A policy is an async function `(user, action, resource, context) -> AuthorizationDecision | None`:

```python
async def my_custom_policy(user, action, resource, context):
    if some_condition:
        return AuthorizationDecision.allow(reason="my reason", policy_name="my_policy")
    if other_condition:
        return AuthorizationDecision.deny(reason="why denied", policy_name="my_policy")
    # Abstain — let other policies decide
    return None
```

**Three return values:**

- `AuthorizationDecision.allow(...)` — definitely permit. Stops the chain.
- `AuthorizationDecision.deny(...)` — definitely deny. Stops the chain.
- `None` — abstain. Let the next policy decide.

**Default DENY** — if every policy abstains, the request is denied.

## Built-in policies

| Policy | What it does |
|---|---|
| `owner_only_policy` | Allows if the user owns the resource (checks `owner_id` / `user_id` / `creator_id`). Abstains otherwise. |
| `visibility_based_read_policy` | For read scopes, applies the resource's `visibility` setting. Uses `network_member_ids` from `context.metadata` for NETWORK visibility. |
| `hub_role_policy_factory` | Factory: builds a policy that grants access when the user holds one of the required roles in the resource's hub. |
| `hub_member_policy` | Allows if the user is any kind of member of the resource's hub. |

## Testing

```python
import pytest
from theourgia.core.authz import (
    AuthzContext,
    AuthorizationDecision,
    PolicyRegistry,
    authorize,
)

@pytest.mark.asyncio
async def test_my_feature_denies_non_owner():
    registry = PolicyRegistry()
    registry.register(my_owner_policy, name="x", resource_type="entry")
    decision = await authorize(
        user=non_owner_user,
        action=Scope.ENTRY_READ,
        resource=entry,
        context=AuthzContext(),
        registry=registry,
    )
    assert not decision.allowed
```

Use an isolated `PolicyRegistry` per test so policies from other tests don't bleed in.

## Audit + observability

Every decision is logged. Denials log at WARNING (operationally useful for spotting probing behavior); permits log at DEBUG (audit-trail-only). Structured fields:

- `allowed` (bool)
- `policy` (which policy decided)
- `reason` (human-readable)
- `action` (the scope)
- `resource_type` + `resource_id`
- `user_id`
- `request_id`

Future hardening: a Prometheus counter `theourgia_authz_decisions_total{outcome,policy}` lands when the first feature actually starts exercising the substrate at volume.

## Anti-patterns

**Don't** do per-resource auth inline:
```python
# WRONG
if entry.owner_id != user.id:
    raise ForbiddenError("not your entry")
```

**Do** route through the substrate:
```python
# RIGHT
decision = await authorize(user=user, action=Scope.ENTRY_WRITE, resource=entry, context=...)
if not decision.allowed:
    raise ForbiddenError(decision.reason)
```

The substrate accumulates context (audit, observability, defense-in-depth) inline code never can.
