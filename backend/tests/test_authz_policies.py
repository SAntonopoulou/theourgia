"""Tests for the reusable policies."""

from __future__ import annotations

from dataclasses import dataclass
from typing import ClassVar
from uuid import UUID, uuid4

import pytest

from theourgia.core.authz.context import AuthzContext
from theourgia.core.authz.policies import (
    owner_only_policy,
    visibility_based_read_policy,
)
from theourgia.core.authz.scopes import Scope
from theourgia.core.authz.visibility import Visibility


@dataclass
class _FakeUser:
    id: UUID


@dataclass
class _EntryWithOwnerId:
    resource_type: ClassVar[str] = "entry"
    id: UUID
    owner_id: UUID


@dataclass
class _EntryWithUserId:
    resource_type: ClassVar[str] = "entry"
    id: UUID
    user_id: UUID


@dataclass
class _ResourceWithoutOwner:
    resource_type: ClassVar[str] = "weird"
    id: UUID


@dataclass
class _EntryWithVisibility:
    resource_type: ClassVar[str] = "entry"
    id: UUID
    owner_id: UUID
    visibility: Visibility


# ── owner_only_policy ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_owner_only_allows_when_user_owns_via_owner_id() -> None:
    user = _FakeUser(id=uuid4())
    entry = _EntryWithOwnerId(id=uuid4(), owner_id=user.id)
    decision = await owner_only_policy(
        user, Scope.ENTRY_READ, entry, AuthzContext()
    )
    assert decision is not None
    assert decision.allowed


@pytest.mark.asyncio
async def test_owner_only_allows_when_user_owns_via_user_id() -> None:
    user = _FakeUser(id=uuid4())
    entry = _EntryWithUserId(id=uuid4(), user_id=user.id)
    decision = await owner_only_policy(
        user, Scope.ENTRY_READ, entry, AuthzContext()
    )
    assert decision is not None
    assert decision.allowed


@pytest.mark.asyncio
async def test_owner_only_abstains_when_resource_has_no_owner_attr() -> None:
    """A resource with no owner_id/user_id/creator_id → policy abstains
    rather than denying — other policies may still authorize."""
    user = _FakeUser(id=uuid4())
    resource = _ResourceWithoutOwner(id=uuid4())
    decision = await owner_only_policy(
        user, Scope.ENTRY_READ, resource, AuthzContext()
    )
    assert decision is None


@pytest.mark.asyncio
async def test_owner_only_abstains_when_user_does_not_own() -> None:
    user = _FakeUser(id=uuid4())
    entry = _EntryWithOwnerId(id=uuid4(), owner_id=uuid4())  # different
    decision = await owner_only_policy(
        user, Scope.ENTRY_READ, entry, AuthzContext()
    )
    # Abstain — the policy "owner_only" doesn't have an opinion when
    # the user isn't the owner; other policies may still allow.
    assert decision is None


# ── visibility_based_read_policy ─────────────────────────────────────


@pytest.mark.asyncio
async def test_visibility_public_allows_anyone_to_read() -> None:
    actor = _FakeUser(id=uuid4())
    entry = _EntryWithVisibility(
        id=uuid4(), owner_id=uuid4(), visibility=Visibility.PUBLIC
    )
    decision = await visibility_based_read_policy(
        actor, Scope.ENTRY_READ, entry, AuthzContext()
    )
    assert decision is not None
    assert decision.allowed


@pytest.mark.asyncio
async def test_visibility_personal_only_allows_owner() -> None:
    owner = _FakeUser(id=uuid4())
    entry = _EntryWithVisibility(
        id=uuid4(), owner_id=owner.id, visibility=Visibility.PERSONAL
    )
    # Owner reads
    decision_owner = await visibility_based_read_policy(
        owner, Scope.ENTRY_READ, entry, AuthzContext()
    )
    assert decision_owner is not None and decision_owner.allowed

    # Non-owner: abstain (not deny — owner_only policy handles owner)
    other = _FakeUser(id=uuid4())
    decision_other = await visibility_based_read_policy(
        other, Scope.ENTRY_READ, entry, AuthzContext()
    )
    # PERSONAL visibility only permits owner; non-owner not permitted
    # via this policy → abstain
    assert decision_other is None


@pytest.mark.asyncio
async def test_visibility_abstains_for_non_read_actions() -> None:
    """The policy only opines on read scopes."""
    user = _FakeUser(id=uuid4())
    entry = _EntryWithVisibility(
        id=uuid4(), owner_id=user.id, visibility=Visibility.PUBLIC
    )
    decision = await visibility_based_read_policy(
        user, Scope.ENTRY_WRITE, entry, AuthzContext()
    )
    assert decision is None


@pytest.mark.asyncio
async def test_visibility_abstains_when_resource_lacks_visibility() -> None:
    user = _FakeUser(id=uuid4())
    entry = _EntryWithOwnerId(id=uuid4(), owner_id=user.id)
    # No visibility field → abstain
    decision = await visibility_based_read_policy(
        user, Scope.ENTRY_READ, entry, AuthzContext()
    )
    assert decision is None


@pytest.mark.asyncio
async def test_visibility_network_consults_metadata() -> None:
    """NETWORK visibility allows reads when the viewer's hub
    memberships intersect with the content's published hubs.

    The substrate doesn't fetch these — the feature resolves them
    upstream and stashes them on ``context.metadata``."""
    owner_id = uuid4()
    actor = _FakeUser(id=uuid4())
    shared_hub_id = uuid4()
    entry = _EntryWithVisibility(
        id=uuid4(), owner_id=owner_id, visibility=Visibility.NETWORK
    )

    # Actor shares a hub with the published content — allowed
    ctx_in = AuthzContext(
        metadata={
            "content_network_hub_ids": {shared_hub_id},
            "viewer_hub_memberships": {shared_hub_id},
        }
    )
    decision_in = await visibility_based_read_policy(
        actor, Scope.ENTRY_READ, entry, ctx_in
    )
    assert decision_in is not None and decision_in.allowed

    # No hub overlap — abstain (not deny; owner_only might still allow)
    ctx_out = AuthzContext(
        metadata={
            "content_network_hub_ids": {uuid4()},
            "viewer_hub_memberships": {uuid4()},
        }
    )
    decision_out = await visibility_based_read_policy(
        actor, Scope.ENTRY_READ, entry, ctx_out
    )
    assert decision_out is None
