"""Tests for the consent substrate."""

from __future__ import annotations

from uuid import uuid4

import pytest

from theourgia.core.gdpr.consent import (
    ConsentPurpose,
    ConsentResolver,
    ConsentSet,
    InMemoryConsentResolver,
)


def test_default_consent_set_is_empty() -> None:
    cs = ConsentSet()
    assert not cs.is_granted(ConsentPurpose.FEDERATION_PUBLISH)
    assert not cs.is_granted(ConsentPurpose.AI_AGENT_INVOKE)


def test_grant_returns_new_set_with_purpose() -> None:
    cs = ConsentSet().grant(ConsentPurpose.FEDERATION_PUBLISH)
    assert cs.is_granted(ConsentPurpose.FEDERATION_PUBLISH)
    assert not cs.is_granted(ConsentPurpose.AI_AGENT_INVOKE)


def test_grant_is_idempotent() -> None:
    cs = (
        ConsentSet()
        .grant(ConsentPurpose.FEDERATION_PUBLISH)
        .grant(ConsentPurpose.FEDERATION_PUBLISH)
    )
    assert cs.is_granted(ConsentPurpose.FEDERATION_PUBLISH)


def test_revoke_removes_purpose() -> None:
    cs = (
        ConsentSet()
        .grant(ConsentPurpose.FEDERATION_PUBLISH)
        .revoke(ConsentPurpose.FEDERATION_PUBLISH)
    )
    assert not cs.is_granted(ConsentPurpose.FEDERATION_PUBLISH)


def test_revoke_unknown_purpose_is_noop() -> None:
    cs = ConsentSet().revoke(ConsentPurpose.FEDERATION_PUBLISH)
    assert not cs.is_granted(ConsentPurpose.FEDERATION_PUBLISH)


def test_consent_set_is_frozen() -> None:
    cs = ConsentSet()
    with pytest.raises(Exception):  # FrozenInstanceError
        cs.granted = frozenset()  # type: ignore[misc]


@pytest.mark.asyncio
async def test_in_memory_resolver_defaults_to_empty() -> None:
    resolver = InMemoryConsentResolver()
    cs = await resolver.get(uuid4())
    assert cs.granted == frozenset()


@pytest.mark.asyncio
async def test_in_memory_resolver_returns_set_value() -> None:
    resolver = InMemoryConsentResolver()
    uid = uuid4()
    resolver.set(uid, ConsentSet().grant(ConsentPurpose.FEDERATION_PUBLISH))
    cs = await resolver.get(uid)
    assert cs.is_granted(ConsentPurpose.FEDERATION_PUBLISH)


@pytest.mark.asyncio
async def test_in_memory_resolver_grant_helper() -> None:
    resolver = InMemoryConsentResolver()
    uid = uuid4()
    resolver.grant(uid, ConsentPurpose.AI_AGENT_INVOKE)
    cs = await resolver.get(uid)
    assert cs.is_granted(ConsentPurpose.AI_AGENT_INVOKE)


@pytest.mark.asyncio
async def test_in_memory_resolver_revoke_helper() -> None:
    resolver = InMemoryConsentResolver()
    uid = uuid4()
    resolver.grant(uid, ConsentPurpose.AI_AGENT_INVOKE)
    resolver.revoke(uid, ConsentPurpose.AI_AGENT_INVOKE)
    cs = await resolver.get(uid)
    assert not cs.is_granted(ConsentPurpose.AI_AGENT_INVOKE)


@pytest.mark.asyncio
async def test_resolver_satisfies_protocol() -> None:
    resolver: ConsentResolver = InMemoryConsentResolver()
    cs = await resolver.get(uuid4())
    assert isinstance(cs, ConsentSet)
