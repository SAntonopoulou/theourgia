"""Smoke tests for the identity domain models.

These tests verify that the SQLModel classes parse, have the expected
columns, and round-trip through Python instantiation. Database-level
tests (RLS policies, constraint enforcement) will land alongside the
fixture infrastructure in a subsequent batch.
"""

from __future__ import annotations

from datetime import UTC, datetime

from theourgia.core.ids import uuid7
from theourgia.core.timeutil import utcnow
from theourgia.models.audit import AuditEvent, AuditEventKind, AuditOutcome
from theourgia.models.identity import (
    Hub,
    Membership,
    MembershipRole,
    PrivateViewer,
    Session,
    User,
    Vault,
)


def test_membership_role_enum_has_expected_values() -> None:
    values = {role.value for role in MembershipRole}
    assert "vault_owner" in values
    assert "vault_collaborator" in values
    assert "vault_viewer" in values
    assert "hub_admin" in values
    assert "hub_officer" in values
    assert "hub_moderator" in values
    assert "hub_member" in values
    assert "hub_observer" in values
    # No accidental extras
    assert len(values) == 8


def test_audit_event_kind_enum_covers_planned_categories() -> None:
    values = {k.value for k in AuditEventKind}
    expected = {
        "auth",
        "visibility",
        "sealed_read",
        "federation",
        "plugin",
        "admin",
        "backup",
        "security",
        "system",
    }
    assert values == expected


def test_audit_outcome_enum_values() -> None:
    assert {o.value for o in AuditOutcome} == {"success", "failure", "denied"}


def test_user_instance_constructs() -> None:
    now = utcnow()
    u = User(
        id=uuid7(),
        email="practitioner@example.com",
        password_hash="$argon2id$v=19$m=1024,t=1,p=1$abc$xyz",
        created_at=now,
        updated_at=now,
    )
    assert u.email == "practitioner@example.com"
    assert u.failed_login_count == 0
    assert u.email_verified_at is None


def test_vault_instance_constructs() -> None:
    now = utcnow()
    user_id = uuid7()
    v = Vault(
        id=uuid7(),
        owner_id=user_id,
        slug="primary-record",
        display_name="Primary Magickal Record",
        created_at=now,
        updated_at=now,
    )
    assert v.slug == "primary-record"
    assert v.owner_id == user_id
    assert v.public_face_enabled is False


def test_hub_instance_constructs() -> None:
    now = utcnow()
    h = Hub(
        id=uuid7(),
        slug="example-lodge",
        display_name="Example Lodge",
        tradition_tags="thelemic,ceremonial",
        created_at=now,
        updated_at=now,
    )
    assert h.slug == "example-lodge"
    assert "thelemic" in h.tradition_tags


def test_session_instance_constructs() -> None:
    now = utcnow()
    s = Session(
        id=uuid7(),
        user_id=uuid7(),
        token_hash="a" * 64,  # SHA-256 hex = 64 chars
        expires_at=now,
        last_used_at=now,
        created_at=now,
        updated_at=now,
    )
    assert s.token_hash == "a" * 64
    assert s.revoked_at is None


def test_membership_role_for_vault() -> None:
    now = utcnow()
    m = Membership(
        id=uuid7(),
        user_id=uuid7(),
        vault_id=uuid7(),
        role=MembershipRole.VAULT_OWNER,
        created_at=now,
        updated_at=now,
    )
    assert m.role == MembershipRole.VAULT_OWNER
    assert m.vault_id is not None
    assert m.hub_id is None


def test_membership_role_for_hub() -> None:
    now = utcnow()
    m = Membership(
        id=uuid7(),
        user_id=uuid7(),
        hub_id=uuid7(),
        role=MembershipRole.HUB_ADMIN,
        created_at=now,
        updated_at=now,
    )
    assert m.role == MembershipRole.HUB_ADMIN
    assert m.hub_id is not None
    assert m.vault_id is None


def test_private_viewer_instance_constructs() -> None:
    now = utcnow()
    pv = PrivateViewer(
        id=uuid7(),
        vault_id=uuid7(),
        user_id=uuid7(),
        display_name="my student Iris",
        created_at=now,
        updated_at=now,
    )
    assert pv.display_name == "my student Iris"
    assert pv.revoked_at is None


def test_audit_event_instance_constructs() -> None:
    now = utcnow()
    e = AuditEvent(
        id=uuid7(),
        actor_id=uuid7(),
        vault_id=uuid7(),
        kind=AuditEventKind.AUTH,
        action="login",
        outcome=AuditOutcome.SUCCESS,
        detail={"method": "password+totp"},
        created_at=now,
        updated_at=now,
    )
    assert e.kind == AuditEventKind.AUTH
    assert e.outcome == AuditOutcome.SUCCESS
    assert e.detail["method"] == "password+totp"


def test_audit_event_with_neutral_outcome_for_sealed_read() -> None:
    now = utcnow()
    e = AuditEvent(
        id=uuid7(),
        actor_id=uuid7(),
        vault_id=uuid7(),
        kind=AuditEventKind.SEALED_READ,
        action="entry.sealed.decrypt",
        outcome=AuditOutcome.SUCCESS,
        created_at=now,
        updated_at=now,
    )
    assert e.kind == AuditEventKind.SEALED_READ


def test_created_at_is_tz_aware() -> None:
    """Smoke check that we use tz-aware datetimes when constructing models."""
    now = utcnow()
    assert now.tzinfo is not None
    u = User(id=uuid7(), email="x@example.com", created_at=now, updated_at=now)
    assert u.created_at.tzinfo is not None
