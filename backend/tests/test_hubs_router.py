"""Unit tests for the hubs router schemas (B137).

Schema validation + slug regex + role-change protection.
Integration-level tests against a live DB land in B137c.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.hubs import (
    _SLUG_RE,
    CapabilityMatrixUpdate,
    HubCreate,
    HubUpdate,
    RoleChange,
)
from theourgia.models.hub_capability import HubCapability
from theourgia.models.identity import HubMembershipPolicy


# ── Slug regex ─────────────────────────────────────────────────────


def test_slug_accepts_lowercase_alphanumeric_hyphens() -> None:
    assert _SLUG_RE.match("the-crossroads-coven")
    assert _SLUG_RE.match("aurora42")
    assert _SLUG_RE.match("a1")


def test_slug_rejects_uppercase() -> None:
    assert _SLUG_RE.match("Coven") is None


def test_slug_rejects_leading_hyphen() -> None:
    assert _SLUG_RE.match("-coven") is None


def test_slug_rejects_trailing_hyphen() -> None:
    assert _SLUG_RE.match("coven-") is None


def test_slug_rejects_underscore() -> None:
    assert _SLUG_RE.match("the_coven") is None


def test_slug_rejects_single_char() -> None:
    assert _SLUG_RE.match("a") is None


# ── Schema validation ──────────────────────────────────────────────


def test_hub_create_defaults_membership_policy_to_private() -> None:
    payload = HubCreate(slug="coven", name="The Crossroads Coven")
    assert payload.membership_policy is HubMembershipPolicy.PRIVATE


def test_hub_create_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        HubCreate(slug="c", name="X", sneaky=True)  # type: ignore[call-arg]


def test_hub_create_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        HubCreate(slug="c", name="")


def test_hub_update_all_fields_optional() -> None:
    HubUpdate()  # no error


def test_role_change_accepts_bare_keys() -> None:
    """Wire keys are bare; the router maps to MembershipRole.HUB_*."""
    payload = RoleChange(role="officer")  # type: ignore[arg-type]
    assert payload.role == "officer"


def test_role_change_rejects_prefixed_keys() -> None:
    """The wire is bare-only; the prefixed form is internal."""
    with pytest.raises(ValidationError):
        RoleChange(role="hub_officer")  # type: ignore[arg-type]


def test_role_change_rejects_vault_role() -> None:
    with pytest.raises(ValidationError):
        RoleChange(role="vault_owner")  # type: ignore[arg-type]


def test_role_change_rejects_unknown_role() -> None:
    with pytest.raises(ValidationError):
        RoleChange(role="god")  # type: ignore[arg-type]


# ── Capability matrix payload ──────────────────────────────────────


def test_capability_matrix_update_accepts_bare_role_keys() -> None:
    payload = CapabilityMatrixUpdate(
        matrix={
            "admin": [],
            "officer": [HubCapability.VIEW_AUDIT_LOG],
            "moderator": [],
            "member": [],
            "observer": [],
        }
    )
    assert (
        payload.matrix["officer"][0] is HubCapability.VIEW_AUDIT_LOG
    )


def test_capability_matrix_update_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        CapabilityMatrixUpdate(
            matrix={},  # type: ignore[arg-type]
            sneaky=True,  # type: ignore[call-arg]
        )
