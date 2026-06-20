"""Tests for notification preferences."""

from __future__ import annotations

from uuid import uuid4

import pytest

from theourgia.core.notifications.message import DeliveryChannel
from theourgia.core.notifications.preferences import (
    InMemoryPreferenceResolver,
    PreferenceSet,
)


def test_default_preference_set_uses_template_defaults() -> None:
    prefs = PreferenceSet()
    result = prefs.resolve(
        "social",
        (DeliveryChannel.IN_APP, DeliveryChannel.EMAIL),
    )
    assert result == (DeliveryChannel.IN_APP, DeliveryChannel.EMAIL)


def test_per_kind_override_restricts_channels() -> None:
    prefs = PreferenceSet(
        enabled={
            "social": frozenset({DeliveryChannel.IN_APP}),  # email disabled
        }
    )
    result = prefs.resolve(
        "social",
        (DeliveryChannel.IN_APP, DeliveryChannel.EMAIL),
    )
    assert result == (DeliveryChannel.IN_APP,)


def test_unspecified_kind_uses_template_defaults() -> None:
    prefs = PreferenceSet(
        enabled={
            "social": frozenset({DeliveryChannel.IN_APP}),
        }
    )
    # 'security' has no override
    result = prefs.resolve(
        "security",
        (DeliveryChannel.IN_APP, DeliveryChannel.EMAIL),
    )
    assert result == (DeliveryChannel.IN_APP, DeliveryChannel.EMAIL)


def test_empty_enabled_set_disables_kind_entirely() -> None:
    prefs = PreferenceSet(enabled={"social": frozenset()})
    result = prefs.resolve("social", (DeliveryChannel.IN_APP, DeliveryChannel.EMAIL))
    assert result == ()


def test_fully_muted_overrides_everything() -> None:
    prefs = PreferenceSet(
        enabled={
            "social": frozenset({DeliveryChannel.IN_APP, DeliveryChannel.EMAIL}),
        },
        fully_muted=True,
    )
    result = prefs.resolve("social", (DeliveryChannel.IN_APP,))
    assert result == ()


def test_user_cannot_enable_channels_template_lacks() -> None:
    """If user enables WEB_PUSH but template defaults don't include it,
    push doesn't fire."""
    prefs = PreferenceSet(
        enabled={
            "social": frozenset({DeliveryChannel.IN_APP, DeliveryChannel.WEB_PUSH}),
        }
    )
    result = prefs.resolve("social", (DeliveryChannel.IN_APP, DeliveryChannel.EMAIL))
    # WEB_PUSH not in defaults → excluded; EMAIL not in user prefs → excluded
    assert result == (DeliveryChannel.IN_APP,)


# ── Resolver ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_in_memory_resolver_returns_default_for_unknown_user() -> None:
    resolver = InMemoryPreferenceResolver()
    prefs = await resolver.get(uuid4())
    # Default = no entries, not fully muted
    assert prefs.enabled == {}
    assert prefs.fully_muted is False


@pytest.mark.asyncio
async def test_in_memory_resolver_returns_set_preferences() -> None:
    resolver = InMemoryPreferenceResolver()
    uid = uuid4()
    resolver.set(uid, PreferenceSet(fully_muted=True))
    prefs = await resolver.get(uid)
    assert prefs.fully_muted is True
