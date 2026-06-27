"""Model-level invariants for group ritual (B139).

The H08 honesty rules covered:

  · Status lifecycle is DRAFT → INVITED → IN_PROGRESS → COMPLETED.
  · Default location is DISPERSED.
  · Reflections write-once per (ritual, author) — UniqueConstraint
    enforces it.
  · Fragments are append-only — no soft-delete + no update API
    in the model.
"""

from __future__ import annotations

from theourgia.models.group_ritual import (
    GroupRitual,
    GroupRitualFragment,
    GroupRitualLocation,
    GroupRitualParticipant,
    GroupRitualReflection,
    GroupRitualStatus,
    ParticipantStatus,
)


def test_group_ritual_location_enum_values() -> None:
    assert {m.value for m in GroupRitualLocation} == {
        "physical", "virtual", "dispersed",
    }


def test_group_ritual_status_enum_values() -> None:
    """Four states, in lifecycle order."""
    values = [m.value for m in GroupRitualStatus]
    assert values == ["draft", "invited", "in_progress", "completed"]


def test_participant_status_enum_values() -> None:
    assert {m.value for m in ParticipantStatus} == {
        "invited", "accepted", "declined", "in_ritual", "completed",
    }


def test_group_ritual_default_status_is_draft() -> None:
    """Schema-level default — every newly created ritual starts
    as draft."""
    assert GroupRitual.model_fields["status"].default is GroupRitualStatus.DRAFT


def test_group_ritual_default_location_is_dispersed() -> None:
    assert (
        GroupRitual.model_fields["location"].default
        is GroupRitualLocation.DISPERSED
    )


def test_participant_default_status_is_invited() -> None:
    assert (
        GroupRitualParticipant.model_fields["status"].default
        is ParticipantStatus.INVITED
    )


def test_reflection_uniqueness_constraint_named() -> None:
    """One reflection per (ritual, author) — enforced at the
    DB layer via uq_reflection_ritual_author. Schema test
    checks the table args mention the constraint."""
    names = [
        getattr(arg, "name", None)
        for arg in GroupRitualReflection.__table_args__
    ]
    assert "uq_reflection_ritual_author" in names


def test_fragment_has_no_soft_delete_column() -> None:
    """Fragments are append-only. The model does NOT use
    SoftDeleteMixin — no deleted_at column to hide a fragment."""
    field_names = set(GroupRitualFragment.model_fields.keys())
    assert "deleted_at" not in field_names


def test_group_ritual_does_use_soft_delete() -> None:
    """The ritual ITSELF is soft-deletable (organizer can cancel
    a draft); only the immutable children aren't."""
    assert "deleted_at" in GroupRitual.model_fields


def test_group_ritual_table_name_is_singular() -> None:
    """House convention — Theourgia tables are singular."""
    assert GroupRitual.__tablename__ == "group_ritual"
    assert (
        GroupRitualParticipant.__tablename__
        == "group_ritual_participant"
    )
    assert GroupRitualFragment.__tablename__ == "group_ritual_fragment"
    assert (
        GroupRitualReflection.__tablename__ == "group_ritual_reflection"
    )
