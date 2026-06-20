"""Tests for the pure permission-check functions."""

from __future__ import annotations

from uuid import UUID, uuid4

from theourgia.core.authz.checks import can_read_with_visibility, can_write_with_visibility
from theourgia.core.authz.visibility import Visibility


# ─────────────────────────────────────────────────────────────────────────────
# can_read_with_visibility
# ─────────────────────────────────────────────────────────────────────────────


def _ids() -> tuple[UUID, UUID, UUID]:
    """Returns (owner, viewer, stranger) — three distinct UUIDs."""
    return uuid4(), uuid4(), uuid4()


def test_public_readable_by_anyone() -> None:
    owner, _, _ = _ids()
    assert can_read_with_visibility(
        visibility=Visibility.PUBLIC,
        viewer_id=None,
        content_vault_owner_id=owner,
    )


def test_public_readable_by_stranger() -> None:
    owner, _, stranger = _ids()
    assert can_read_with_visibility(
        visibility=Visibility.PUBLIC,
        viewer_id=stranger,
        content_vault_owner_id=owner,
    )


def test_personal_readable_only_by_owner() -> None:
    owner, _, stranger = _ids()
    assert can_read_with_visibility(
        visibility=Visibility.PERSONAL,
        viewer_id=owner,
        content_vault_owner_id=owner,
    )
    assert not can_read_with_visibility(
        visibility=Visibility.PERSONAL,
        viewer_id=stranger,
        content_vault_owner_id=owner,
    )


def test_personal_not_readable_by_anonymous() -> None:
    owner, _, _ = _ids()
    assert not can_read_with_visibility(
        visibility=Visibility.PERSONAL,
        viewer_id=None,
        content_vault_owner_id=owner,
    )


def test_sealed_readable_only_by_owner() -> None:
    owner, _, stranger = _ids()
    assert can_read_with_visibility(
        visibility=Visibility.SEALED,
        viewer_id=owner,
        content_vault_owner_id=owner,
    )
    assert not can_read_with_visibility(
        visibility=Visibility.SEALED,
        viewer_id=stranger,
        content_vault_owner_id=owner,
    )


def test_viewer_visibility_readable_by_private_viewer() -> None:
    owner, viewer, stranger = _ids()
    assert can_read_with_visibility(
        visibility=Visibility.VIEWER,
        viewer_id=viewer,
        content_vault_owner_id=owner,
        viewer_is_private_viewer_of_vault=True,
    )
    # Same viewer, no private-viewer credential: refused
    assert not can_read_with_visibility(
        visibility=Visibility.VIEWER,
        viewer_id=viewer,
        content_vault_owner_id=owner,
        viewer_is_private_viewer_of_vault=False,
    )
    # Owner always allowed
    assert can_read_with_visibility(
        visibility=Visibility.VIEWER,
        viewer_id=owner,
        content_vault_owner_id=owner,
    )
    # Stranger refused
    assert not can_read_with_visibility(
        visibility=Visibility.VIEWER,
        viewer_id=stranger,
        content_vault_owner_id=owner,
    )


def test_network_readable_by_hub_member() -> None:
    owner, viewer, _ = _ids()
    hub_x, hub_y = uuid4(), uuid4()
    # Content is published to hub_x; viewer is a member of hub_x → allowed
    assert can_read_with_visibility(
        visibility=Visibility.NETWORK,
        viewer_id=viewer,
        content_vault_owner_id=owner,
        content_network_hub_ids=frozenset({hub_x}),
        viewer_hub_memberships=frozenset({hub_x}),
    )
    # Content is published to hub_x; viewer is a member of hub_y only → refused
    assert not can_read_with_visibility(
        visibility=Visibility.NETWORK,
        viewer_id=viewer,
        content_vault_owner_id=owner,
        content_network_hub_ids=frozenset({hub_x}),
        viewer_hub_memberships=frozenset({hub_y}),
    )


def test_network_readable_by_private_viewer() -> None:
    """Private viewers can read network-published content of the vaults they view."""
    owner, viewer, _ = _ids()
    assert can_read_with_visibility(
        visibility=Visibility.NETWORK,
        viewer_id=viewer,
        content_vault_owner_id=owner,
        content_network_hub_ids=frozenset({uuid4()}),
        viewer_hub_memberships=frozenset(),  # no hub memberships
        viewer_is_private_viewer_of_vault=True,
    )


def test_network_not_readable_without_membership_or_viewer_credential() -> None:
    owner, viewer, _ = _ids()
    assert not can_read_with_visibility(
        visibility=Visibility.NETWORK,
        viewer_id=viewer,
        content_vault_owner_id=owner,
        content_network_hub_ids=frozenset({uuid4()}),
    )


def test_network_no_hubs_published_not_readable() -> None:
    owner, viewer, _ = _ids()
    # Content marked NETWORK but no hubs declared on the row — nobody but owner reads
    assert not can_read_with_visibility(
        visibility=Visibility.NETWORK,
        viewer_id=viewer,
        content_vault_owner_id=owner,
        content_network_hub_ids=frozenset(),
        viewer_hub_memberships=frozenset({uuid4()}),
    )


def test_anonymous_cannot_read_anything_non_public() -> None:
    owner, _, _ = _ids()
    for vis in (Visibility.SEALED, Visibility.PERSONAL, Visibility.VIEWER, Visibility.NETWORK):
        assert not can_read_with_visibility(
            visibility=vis,
            viewer_id=None,
            content_vault_owner_id=owner,
            content_network_hub_ids=frozenset({uuid4()}),
            viewer_hub_memberships=frozenset({uuid4()}),
        )


# ─────────────────────────────────────────────────────────────────────────────
# can_write_with_visibility
# ─────────────────────────────────────────────────────────────────────────────


def test_owner_can_always_write() -> None:
    owner, _, _ = _ids()
    assert can_write_with_visibility(viewer_id=owner, content_vault_owner_id=owner)


def test_collaborator_can_write() -> None:
    owner, viewer, _ = _ids()
    assert can_write_with_visibility(
        viewer_id=viewer,
        content_vault_owner_id=owner,
        is_collaborator=True,
    )


def test_non_owner_non_collaborator_cannot_write() -> None:
    owner, viewer, _ = _ids()
    assert not can_write_with_visibility(
        viewer_id=viewer,
        content_vault_owner_id=owner,
        is_collaborator=False,
    )


def test_anonymous_cannot_write() -> None:
    owner, _, _ = _ids()
    assert not can_write_with_visibility(viewer_id=None, content_vault_owner_id=owner)
