"""Tests for AuthorizationDecision."""

from __future__ import annotations

import pytest

from theourgia.core.authz.decisions import AuthorizationDecision


def test_decision_allow() -> None:
    d = AuthorizationDecision.allow(reason="ok", policy_name="p1")
    assert d.allowed is True
    assert d.reason == "ok"
    assert d.policy_name == "p1"


def test_decision_deny() -> None:
    d = AuthorizationDecision.deny(reason="nope", policy_name="p1")
    assert d.allowed is False
    assert d.reason == "nope"


def test_decision_deny_supplies_default_reason() -> None:
    """Callers may pass empty string; the decision still has a reason."""
    d = AuthorizationDecision.deny(reason="")
    assert d.reason == "denied"


def test_decision_is_frozen() -> None:
    d = AuthorizationDecision.allow()
    with pytest.raises(Exception):  # FrozenInstanceError
        d.allowed = False  # type: ignore[misc]


def test_decision_allow_with_defaults() -> None:
    d = AuthorizationDecision.allow()
    assert d.allowed
    assert d.reason == ""
    assert d.policy_name == ""
