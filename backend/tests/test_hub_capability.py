"""Unit tests for the hub capability matrix model (B137).

THE critical honesty rules covered:

  * Default capability matrix mirrors the H08 brief surface 12
    exactly — observer all-false, admin all-true, officer 9,
    moderator 4, member 1. The wire keys are stable.
  * The H08 surface 12 renders role chips WITHOUT the ``hub_``
    prefix. ``bare_to_role`` / ``role_to_bare`` map at the API
    seam — round-tripping is identity.
  * Vault roles are NEVER allowed in the capability matrix;
    only the five hub roles.
"""

from __future__ import annotations

import pytest

from theourgia.models.hub_capability import (
    DEFAULT_CAPABILITY_MATRIX,
    HUB_ROLES,
    HubCapability,
    bare_to_role,
    role_to_bare,
)
from theourgia.models.identity import MembershipRole


# ── Capability matrix ───────────────────────────────────────────────


def test_default_matrix_admin_has_every_capability() -> None:
    assert DEFAULT_CAPABILITY_MATRIX[MembershipRole.HUB_ADMIN] == frozenset(
        HubCapability
    )


def test_default_matrix_observer_holds_zero() -> None:
    assert (
        DEFAULT_CAPABILITY_MATRIX[MembershipRole.HUB_OBSERVER] == frozenset()
    )


def test_default_matrix_officer_count_nine() -> None:
    caps = DEFAULT_CAPABILITY_MATRIX[MembershipRole.HUB_OFFICER]
    assert len(caps) == 9
    assert HubCapability.EDIT_ROLE_DEFINITIONS not in caps
    assert HubCapability.MANAGE_PERMISSION_MATRIX not in caps


def test_default_matrix_moderator_count_four() -> None:
    caps = DEFAULT_CAPABILITY_MATRIX[MembershipRole.HUB_MODERATOR]
    assert len(caps) == 4
    assert HubCapability.MODERATE_SUBMISSIONS in caps


def test_default_matrix_member_count_one() -> None:
    caps = DEFAULT_CAPABILITY_MATRIX[MembershipRole.HUB_MEMBER]
    assert len(caps) == 1
    assert HubCapability.SCHEDULE_GROUP_RITUALS in caps


# ── Capability wire keys ───────────────────────────────────────────


def test_eleven_capabilities_total() -> None:
    assert len(list(HubCapability)) == 11


def test_capability_wire_keys_stable() -> None:
    """The permission-denied banner renders the wire key in user
    copy. Renaming any of these strings breaks the verbatim
    invariant in H08 surface 12."""
    assert {c.value for c in HubCapability} == {
        "edit_hub_content",
        "moderate_submissions",
        "manage_members",
        "send_newsletters",
        "run_analytics_queries",
        "accept_federation_peers",
        "edit_role_definitions",
        "manage_permission_matrix",
        "view_audit_log",
        "schedule_group_rituals",
        "approve_curation_submissions",
    }


# ── Hub roles ──────────────────────────────────────────────────────


def test_hub_roles_tuple_has_five() -> None:
    assert len(HUB_ROLES) == 5


def test_hub_roles_excludes_vault_roles() -> None:
    for role in HUB_ROLES:
        assert role.value.startswith("hub_")


# ── Bare-prefix seam ───────────────────────────────────────────────


def test_bare_to_role_round_trip() -> None:
    """Every hub role round-trips."""
    for role in HUB_ROLES:
        bare = role_to_bare(role)
        assert bare_to_role(bare) is role


def test_bare_to_role_known_mapping() -> None:
    assert bare_to_role("admin") is MembershipRole.HUB_ADMIN
    assert bare_to_role("officer") is MembershipRole.HUB_OFFICER
    assert bare_to_role("moderator") is MembershipRole.HUB_MODERATOR
    assert bare_to_role("member") is MembershipRole.HUB_MEMBER
    assert bare_to_role("observer") is MembershipRole.HUB_OBSERVER


def test_role_to_bare_known_mapping() -> None:
    assert role_to_bare(MembershipRole.HUB_ADMIN) == "admin"
    assert role_to_bare(MembershipRole.HUB_OBSERVER) == "observer"


def test_bare_to_role_unknown_raises() -> None:
    with pytest.raises(KeyError):
        bare_to_role("god")


def test_role_to_bare_vault_role_raises() -> None:
    """Vault roles are NOT representable as bare hub keys."""
    with pytest.raises(KeyError):
        role_to_bare(MembershipRole.VAULT_OWNER)


# ── Matrix coverage ───────────────────────────────────────────────


def test_default_matrix_covers_every_hub_role() -> None:
    """One entry per hub role; no vault role in the matrix."""
    assert set(DEFAULT_CAPABILITY_MATRIX.keys()) == set(HUB_ROLES)


def test_default_matrix_no_unknown_capability() -> None:
    for caps in DEFAULT_CAPABILITY_MATRIX.values():
        for cap in caps:
            assert isinstance(cap, HubCapability)
