"""Tests for the policy registry."""

from __future__ import annotations

import pytest

from theourgia.core.authz.decisions import AuthorizationDecision
from theourgia.core.authz.policy import PolicyRegistry


async def _make_policy(verdict):
    async def _p(user, action, resource, context):
        return verdict
    return _p


@pytest.mark.asyncio
async def test_register_per_type_policy() -> None:
    r = PolicyRegistry()
    policy = await _make_policy(AuthorizationDecision.allow())
    r.register(policy, name="p1", resource_type="entry")
    found = r.policies_for("entry")
    assert len(found) == 1
    assert found[0][0] == "p1"


@pytest.mark.asyncio
async def test_register_global_policy() -> None:
    r = PolicyRegistry()
    policy = await _make_policy(AuthorizationDecision.allow())
    r.register(policy, name="p1")
    # Global policies apply to every resource type
    assert len(r.policies_for("entry")) == 1
    assert len(r.policies_for("vault")) == 1


@pytest.mark.asyncio
async def test_per_type_policies_come_before_global() -> None:
    r = PolicyRegistry()
    p1 = await _make_policy(None)
    p2 = await _make_policy(None)
    r.register(p1, name="global1")
    r.register(p2, name="per_type", resource_type="entry")
    order = [name for name, _ in r.policies_for("entry")]
    assert order == ["per_type", "global1"]


def test_register_rejects_empty_name() -> None:
    r = PolicyRegistry()

    async def _p(user, action, resource, context):
        return None

    with pytest.raises(ValueError, match="name"):
        r.register(_p, name="")


def test_all_resource_types_lists_unique_types() -> None:
    r = PolicyRegistry()

    async def _p(user, action, resource, context):
        return None

    r.register(_p, name="a", resource_type="entry")
    r.register(_p, name="b", resource_type="entry")
    r.register(_p, name="c", resource_type="vault")
    types = set(r.all_resource_types())
    assert types == {"entry", "vault"}


def test_clear_resets_registry() -> None:
    r = PolicyRegistry()

    async def _p(user, action, resource, context):
        return None

    r.register(_p, name="x", resource_type="entry")
    r.clear()
    assert r.policies_for("entry") == []
    assert r.all_resource_types() == []
