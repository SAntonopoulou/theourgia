"""End-to-end tests for the authorize() entry point."""

from __future__ import annotations

from dataclasses import dataclass
from typing import ClassVar
from uuid import UUID, uuid4

import pytest

from theourgia.core.authz.authorize import authorize
from theourgia.core.authz.context import AuthzContext
from theourgia.core.authz.decisions import AuthorizationDecision
from theourgia.core.authz.policy import PolicyRegistry
from theourgia.core.authz.resource import GLOBAL_RESOURCE
from theourgia.core.authz.scopes import Scope


@dataclass
class _FakeUser:
    id: UUID


@dataclass
class _FakeEntry:
    resource_type: ClassVar[str] = "entry"
    id: UUID
    owner_id: UUID


def _user() -> _FakeUser:
    return _FakeUser(id=uuid4())


def _entry(owner_id: UUID | None = None) -> _FakeEntry:
    return _FakeEntry(id=uuid4(), owner_id=owner_id or uuid4())


@pytest.mark.asyncio
async def test_default_deny_with_no_policies() -> None:
    r = PolicyRegistry()
    user = _user()
    entry = _entry()
    decision = await authorize(
        user=user,
        action=Scope.ENTRY_READ,
        resource=entry,
        context=AuthzContext(),
        registry=r,
    )
    assert decision.allowed is False
    assert decision.policy_name == "default_deny"


@pytest.mark.asyncio
async def test_anonymous_request_denied() -> None:
    r = PolicyRegistry()
    entry = _entry()
    decision = await authorize(
        user=None,
        action=Scope.ENTRY_READ,
        resource=entry,
        context=AuthzContext(),
        registry=r,
    )
    assert decision.allowed is False
    assert decision.policy_name == "default_anonymous_deny"


@pytest.mark.asyncio
async def test_first_allow_wins() -> None:
    r = PolicyRegistry()

    async def grant(*args, **kwargs):
        return AuthorizationDecision.allow(reason="grant")

    async def deny(*args, **kwargs):
        return AuthorizationDecision.deny(reason="should never run")

    r.register(grant, name="grant", resource_type="entry")
    r.register(deny, name="deny", resource_type="entry")

    decision = await authorize(
        user=_user(),
        action=Scope.ENTRY_READ,
        resource=_entry(),
        context=AuthzContext(),
        registry=r,
    )
    assert decision.allowed is True
    assert decision.policy_name == "grant"


@pytest.mark.asyncio
async def test_first_deny_wins() -> None:
    r = PolicyRegistry()

    async def deny(*args, **kwargs):
        return AuthorizationDecision.deny(reason="explicit deny")

    async def grant(*args, **kwargs):
        return AuthorizationDecision.allow(reason="should never run")

    r.register(deny, name="deny", resource_type="entry")
    r.register(grant, name="grant", resource_type="entry")

    decision = await authorize(
        user=_user(),
        action=Scope.ENTRY_READ,
        resource=_entry(),
        context=AuthzContext(),
        registry=r,
    )
    assert decision.allowed is False
    assert decision.policy_name == "deny"


@pytest.mark.asyncio
async def test_abstaining_policies_skipped() -> None:
    r = PolicyRegistry()

    async def abstain(*args, **kwargs):
        return None

    async def grant(*args, **kwargs):
        return AuthorizationDecision.allow(reason="granted")

    r.register(abstain, name="abstain1", resource_type="entry")
    r.register(abstain, name="abstain2", resource_type="entry")
    r.register(grant, name="grant", resource_type="entry")

    decision = await authorize(
        user=_user(),
        action=Scope.ENTRY_READ,
        resource=_entry(),
        context=AuthzContext(),
        registry=r,
    )
    assert decision.allowed is True
    assert decision.policy_name == "grant"


@pytest.mark.asyncio
async def test_all_abstain_defaults_to_deny() -> None:
    r = PolicyRegistry()

    async def abstain(*args, **kwargs):
        return None

    r.register(abstain, name="a", resource_type="entry")
    r.register(abstain, name="b", resource_type="entry")

    decision = await authorize(
        user=_user(),
        action=Scope.ENTRY_READ,
        resource=_entry(),
        context=AuthzContext(),
        registry=r,
    )
    assert decision.allowed is False
    assert decision.policy_name == "default_deny"


@pytest.mark.asyncio
async def test_policy_name_stamped_from_registry_when_missing() -> None:
    """A policy that returns AuthorizationDecision.allow() without a
    policy_name gets the registry name stamped on by authorize()."""
    r = PolicyRegistry()

    async def grant(*args, **kwargs):
        # No policy_name on this decision
        return AuthorizationDecision(allowed=True, reason="ok")

    r.register(grant, name="registered_as", resource_type="entry")
    decision = await authorize(
        user=_user(),
        action=Scope.ENTRY_READ,
        resource=_entry(),
        context=AuthzContext(),
        registry=r,
    )
    assert decision.policy_name == "registered_as"


@pytest.mark.asyncio
async def test_global_resource_uses_global_policies() -> None:
    r = PolicyRegistry()

    async def grant(*args, **kwargs):
        return AuthorizationDecision.allow(reason="global ok")

    r.register(grant, name="global_grant", resource_type="__global__")
    decision = await authorize(
        user=_user(),
        action=Scope.ADMIN_OBSERVE,
        resource=GLOBAL_RESOURCE,
        context=AuthzContext(),
        registry=r,
    )
    assert decision.allowed
