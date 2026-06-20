"""Tests for the Visibility enum and its convenience predicates."""

from __future__ import annotations

from theourgia.core.authz.visibility import AT_LEAST_INTERNAL, PUBLISHABLE, Visibility


def test_visibility_values_are_stable() -> None:
    """The integer values are persisted; they must never change once shipped."""
    assert Visibility.PERSONAL.value == 1
    assert Visibility.VIEWER.value == 2
    assert Visibility.NETWORK.value == 3
    assert Visibility.PUBLIC.value == 4
    assert Visibility.SEALED.value == 5


def test_visibility_enum_complete() -> None:
    """Sanity check: exactly five members. New visibilities require a new ADR."""
    assert len(list(Visibility)) == 5


def test_is_private_includes_sealed_personal_viewer() -> None:
    assert Visibility.SEALED.is_private
    assert Visibility.PERSONAL.is_private
    assert Visibility.VIEWER.is_private


def test_is_private_excludes_network_and_public() -> None:
    assert not Visibility.NETWORK.is_private
    assert not Visibility.PUBLIC.is_private


def test_is_publishable_outbound_only_public() -> None:
    assert Visibility.PUBLIC.is_publishable_outbound
    for v in (Visibility.SEALED, Visibility.PERSONAL, Visibility.VIEWER, Visibility.NETWORK):
        assert not v.is_publishable_outbound


def test_is_sealed_only_sealed() -> None:
    assert Visibility.SEALED.is_sealed
    for v in (Visibility.PERSONAL, Visibility.VIEWER, Visibility.NETWORK, Visibility.PUBLIC):
        assert not v.is_sealed


def test_at_least_internal_set() -> None:
    assert Visibility.VIEWER in AT_LEAST_INTERNAL
    assert Visibility.NETWORK in AT_LEAST_INTERNAL
    assert Visibility.PUBLIC in AT_LEAST_INTERNAL
    assert Visibility.PERSONAL not in AT_LEAST_INTERNAL
    assert Visibility.SEALED not in AT_LEAST_INTERNAL


def test_publishable_set() -> None:
    assert Visibility.PUBLIC in PUBLISHABLE
    for v in (Visibility.PERSONAL, Visibility.VIEWER, Visibility.NETWORK, Visibility.SEALED):
        assert v not in PUBLISHABLE
