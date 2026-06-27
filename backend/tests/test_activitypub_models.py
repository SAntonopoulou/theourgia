"""ActivityPub adapter model invariants (Phase 13 stub).

The H08 honesty rules covered:

  · Master enabled defaults to FALSE (rule 28 · per-network
    opt-in).
  · follower_approval defaults to MANUAL for vaults (rule 20).
  · broadcast_deletes defaults to FALSE (rule 32 carry-forward:
    no auto-update; the user explicitly opts in to broadcast
    deletions).
  · broadcast_creates + broadcast_updates default to TRUE
    (the publish-something-new flow expects them).
  · object_type_mapping is JSONB so plugin authors can extend
    without a schema migration.
"""

from __future__ import annotations

from theourgia.models.activitypub import (
    ActivityPubFollowRequest,
    ActivityPubFollower,
    ActivityPubSettings,
    FollowerApproval,
    FollowRequestState,
)


def test_settings_enabled_defaults_false() -> None:
    """Master per-network opt-in (H08 rule 28)."""
    assert ActivityPubSettings.model_fields["enabled"].default is False


def test_follower_approval_defaults_manual() -> None:
    """H08 rule 20 — default MANUAL for vaults."""
    assert (
        ActivityPubSettings.model_fields["follower_approval"].default
        is FollowerApproval.MANUAL
    )


def test_broadcast_deletes_defaults_false() -> None:
    """The user opts IN to broadcasting deletions (cache caveat
    in the H08 settings surface)."""
    assert (
        ActivityPubSettings.model_fields["broadcast_deletes"].default
        is False
    )


def test_broadcast_creates_defaults_true() -> None:
    assert (
        ActivityPubSettings.model_fields["broadcast_creates"].default
        is True
    )


def test_broadcast_updates_defaults_true() -> None:
    assert (
        ActivityPubSettings.model_fields["broadcast_updates"].default
        is True
    )


def test_follower_approval_enum_values() -> None:
    assert {m.value for m in FollowerApproval} == {"manual", "auto"}


def test_follow_request_state_enum_values() -> None:
    assert {m.value for m in FollowRequestState} == {
        "pending", "accepted", "rejected",
    }


def test_settings_uniqueness_named_constraint() -> None:
    """One settings row per user — enforced via
    uq_aps_owner."""
    names = [
        getattr(arg, "name", None)
        for arg in ActivityPubSettings.__table_args__
    ]
    assert "uq_aps_owner" in names


def test_follower_uniqueness_named_constraint() -> None:
    """One follower row per (owner, follower_did) — enforced
    via uq_ap_follower_owner_did. Prevents duplicate
    follow-confirmation."""
    names = [
        getattr(arg, "name", None)
        for arg in ActivityPubFollower.__table_args__
    ]
    assert "uq_ap_follower_owner_did" in names


def test_follow_request_state_default_pending() -> None:
    assert (
        ActivityPubFollowRequest.model_fields["state"].default
        is FollowRequestState.PENDING
    )


def test_object_type_mapping_default_empty_dict() -> None:
    """Default empty — the API seam fills the standard
    entries/notes/rituals/publications mapping if absent."""
    factory = ActivityPubSettings.model_fields[
        "object_type_mapping"
    ].default_factory
    assert factory() == {}


def test_table_names_house_convention() -> None:
    """House convention — Theourgia tables are singular.
    AP tables prefix with activitypub_."""
    assert ActivityPubSettings.__tablename__ == "activitypub_settings"
    assert ActivityPubFollower.__tablename__ == "activitypub_follower"
    assert (
        ActivityPubFollowRequest.__tablename__
        == "activitypub_follow_request"
    )
