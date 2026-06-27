"""Schema-level unit tests for the group rituals router (B139b).

The H08 honesty rules covered:

  · GroupRitualCreate defaults location to DISPERSED.
  · PATCH shape uses ALL-optional fields.
  · Fragment + Reflection bodies are length-bounded (4000 chars).
  · InvitePayload requires at least one user_id (no empty bulk).
  · RespondPayload accepts only "accepted" / "declined".
  · No participant-status update endpoint exposes IN_RITUAL
    arbitrarily — only the start/fragment-post path can reach
    it (covered at the integration layer in B139c).
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.group_rituals import (
    FragmentCreate,
    GroupRitualCreate,
    GroupRitualUpdate,
    InvitePayload,
    ReflectionCreate,
    RespondPayload,
)
from theourgia.models.group_ritual import GroupRitualLocation


# ── Create defaults + validation ───────────────────────────────────


def test_create_defaults_location_to_dispersed() -> None:
    payload = GroupRitualCreate(
        title="x",
        scheduled_for_utc="2026-06-27T18:00:00Z",  # type: ignore[arg-type]
    )
    assert payload.location is GroupRitualLocation.DISPERSED


def test_create_rejects_empty_title() -> None:
    with pytest.raises(ValidationError):
        GroupRitualCreate(
            title="",
            scheduled_for_utc="2026-06-27T18:00:00Z",  # type: ignore[arg-type]
        )


def test_create_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        GroupRitualCreate(  # type: ignore[call-arg]
            title="x",
            scheduled_for_utc="2026-06-27T18:00:00Z",
            sneaky=True,
        )


# ── Update is all-optional ─────────────────────────────────────────


def test_update_empty_body_is_valid() -> None:
    """Empty PATCH body is valid — it's a no-op at the service
    layer."""
    GroupRitualUpdate()


def test_update_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        GroupRitualUpdate(  # type: ignore[call-arg]
            title=None, sneaky=True,
        )


# ── Invite + Respond ──────────────────────────────────────────────


def test_invite_requires_at_least_one_user_id() -> None:
    with pytest.raises(ValidationError):
        InvitePayload(user_ids=[])


def test_respond_accepts_only_two_values() -> None:
    RespondPayload(response="accepted")
    RespondPayload(response="declined")
    with pytest.raises(ValidationError):
        RespondPayload(response="maybe")  # type: ignore[arg-type]


# ── Fragment + Reflection body bounds ─────────────────────────────


def test_fragment_rejects_empty() -> None:
    with pytest.raises(ValidationError):
        FragmentCreate(body="")


def test_fragment_rejects_over_4000() -> None:
    with pytest.raises(ValidationError):
        FragmentCreate(body="x" * 4001)


def test_fragment_accepts_4000() -> None:
    FragmentCreate(body="x" * 4000)


def test_reflection_rejects_empty() -> None:
    with pytest.raises(ValidationError):
        ReflectionCreate(body="")


def test_reflection_rejects_over_4000() -> None:
    with pytest.raises(ValidationError):
        ReflectionCreate(body="x" * 4001)


def test_reflection_accepts_4000() -> None:
    ReflectionCreate(body="x" * 4000)
