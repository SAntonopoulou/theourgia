"""Tests for the persona substrate.

The full integration suite (database round-trips, RLS policy
enforcement, signup-creates-default flow) lands when Phase 02 ships
a real-database test fixture. For now, the tests here cover:

- The handle-validation regex (pure logic)
- The error type hierarchy
- The authorization-policy update (owner_only checks persona before
  user)
- Model construction invariants
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import ClassVar
from uuid import UUID, uuid4

import pytest

from theourgia.core.authz.context import AuthzContext
from theourgia.core.authz.policies import owner_only_policy
from theourgia.core.authz.scopes import Scope
from theourgia.core.persona import (
    PersonaConflictError,
    PersonaError,
    PersonaNotFoundError,
    PersonaService,
)
from theourgia.models.persona import Persona, PersonaKind


# ── Handle validation ────────────────────────────────────────────────


@pytest.mark.parametrize(
    "handle",
    [
        "alice",
        "soror_eua",
        "ritualist_42",
        "a_b",
        "AliceCaps",
    ],
)
def test_valid_handles_accepted(handle: str) -> None:
    """The handle validation regex accepts well-formed identifiers."""
    service = PersonaService(session=None)  # type: ignore[arg-type]
    # _validate_handle is purely string-shape; no I/O.
    service._validate_handle(handle)  # type: ignore[attr-defined]


@pytest.mark.parametrize(
    "handle",
    [
        "",                  # empty
        "_underscore_start", # starts with underscore
        "-hyphen_start",     # starts with hyphen
        "1numeric_start",    # starts with digit
        "trailing_",         # trailing underscore
        "trailing-",         # trailing hyphen
        "has spaces",        # whitespace
        "has@symbols",       # disallowed chars
        "x",                 # too short (< 3)
        "a" * 65,            # too long (> 64)
    ],
)
def test_invalid_handles_rejected(handle: str) -> None:
    service = PersonaService(session=None)  # type: ignore[arg-type]
    with pytest.raises(PersonaError):
        service._validate_handle(handle)  # type: ignore[attr-defined]


# ── Error hierarchy ──────────────────────────────────────────────────


def test_persona_not_found_is_a_persona_error() -> None:
    assert issubclass(PersonaNotFoundError, PersonaError)


def test_persona_conflict_is_a_persona_error() -> None:
    assert issubclass(PersonaConflictError, PersonaError)


# ── PersonaKind enum ─────────────────────────────────────────────────


def test_persona_kind_values() -> None:
    assert PersonaKind.DEFAULT.value == "default"
    assert PersonaKind.SECONDARY.value == "secondary"


# ── Authorization-policy persona awareness ───────────────────────────


@dataclass
class _FakeUser:
    id: UUID


@dataclass
class _PersonaOwnedResource:
    """A resource whose ownership is persona-scoped (Phase 02+ pattern)."""

    resource_type: ClassVar[str] = "entry"
    id: UUID
    owner_persona_id: UUID


@dataclass
class _UserOwnedResource:
    """A resource whose ownership is user-scoped (legacy Phase 01 pattern)."""

    resource_type: ClassVar[str] = "entry"
    id: UUID
    owner_id: UUID


@pytest.mark.asyncio
async def test_owner_only_allows_active_persona_owner() -> None:
    """When a resource is persona-scoped and the active persona owns
    it, the policy allows."""
    user = _FakeUser(id=uuid4())
    persona_id = uuid4()
    resource = _PersonaOwnedResource(id=uuid4(), owner_persona_id=persona_id)
    decision = await owner_only_policy(
        user,
        Scope.ENTRY_READ,
        resource,
        AuthzContext(active_persona_id=persona_id),
    )
    assert decision is not None
    assert decision.allowed


@pytest.mark.asyncio
async def test_owner_only_abstains_when_different_persona_owns() -> None:
    """A persona-owned resource doesn't authorize the user under a
    different active persona — even if the same User owns both
    personas. Persona is the ACL boundary."""
    user = _FakeUser(id=uuid4())
    resource = _PersonaOwnedResource(
        id=uuid4(), owner_persona_id=uuid4()  # different persona
    )
    decision = await owner_only_policy(
        user,
        Scope.ENTRY_READ,
        resource,
        AuthzContext(active_persona_id=uuid4()),  # active is yet another
    )
    assert decision is None  # abstain — other policies may allow


@pytest.mark.asyncio
async def test_owner_only_abstains_when_no_active_persona() -> None:
    """A persona-scoped resource read without an active_persona_id in
    context abstains. The system-level call path (no persona) doesn't
    own anything via persona match."""
    user = _FakeUser(id=uuid4())
    resource = _PersonaOwnedResource(id=uuid4(), owner_persona_id=uuid4())
    decision = await owner_only_policy(
        user,
        Scope.ENTRY_READ,
        resource,
        AuthzContext(active_persona_id=None),
    )
    assert decision is None


@pytest.mark.asyncio
async def test_owner_only_falls_back_to_user_check_for_legacy_resources() -> None:
    """Resources WITHOUT owner_persona_id fall back to the user-based
    check — Phase 01 tables that haven't been migrated still work."""
    user = _FakeUser(id=uuid4())
    resource = _UserOwnedResource(id=uuid4(), owner_id=user.id)
    decision = await owner_only_policy(
        user,
        Scope.ENTRY_READ,
        resource,
        AuthzContext(active_persona_id=uuid4()),  # persona present but resource ignores
    )
    assert decision is not None
    assert decision.allowed


@pytest.mark.asyncio
async def test_owner_only_persona_check_runs_before_user_check() -> None:
    """If a resource has BOTH owner_persona_id and owner_id, the
    persona check wins (it's the canonical pattern). Defensive — we
    don't expect both shapes on the same row, but if they appear,
    persona is authoritative."""

    @dataclass
    class _HybridResource:
        resource_type: ClassVar[str] = "entry"
        id: UUID
        owner_persona_id: UUID
        owner_id: UUID

    user = _FakeUser(id=uuid4())
    matching_persona = uuid4()
    resource = _HybridResource(
        id=uuid4(),
        owner_persona_id=matching_persona,
        owner_id=uuid4(),  # different user — would abstain via user check
    )
    decision = await owner_only_policy(
        user,
        Scope.ENTRY_READ,
        resource,
        AuthzContext(active_persona_id=matching_persona),
    )
    assert decision is not None
    assert decision.allowed
    assert "persona" in decision.reason


# ── AuthzContext gains persona ───────────────────────────────────────


def test_authz_context_default_persona_is_none() -> None:
    """Backward compatibility: existing code that builds AuthzContext
    without naming active_persona_id continues to work."""
    ctx = AuthzContext()
    assert ctx.active_persona_id is None


def test_authz_context_accepts_persona_id() -> None:
    persona_id = uuid4()
    ctx = AuthzContext(active_persona_id=persona_id)
    assert ctx.active_persona_id == persona_id
