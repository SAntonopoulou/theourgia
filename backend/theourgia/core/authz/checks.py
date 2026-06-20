"""Permission check functions — pure logic, no I/O.

The functions here answer "given this viewer state and this content
state, is the action allowed?" without touching the database. They
take all the inputs they need explicitly so they are trivial to unit
test and trivial to reason about.

The application layer composes these checks. Database-layer Row-Level
Security enforces the same answers as defense in depth.
"""

from __future__ import annotations

from uuid import UUID

from theourgia.core.authz.visibility import Visibility

__all__ = ["can_read_with_visibility", "can_write_with_visibility"]


def can_read_with_visibility(
    *,
    visibility: Visibility,
    viewer_id: UUID | None,
    content_vault_owner_id: UUID,
    content_network_hub_ids: frozenset[UUID] = frozenset(),
    viewer_hub_memberships: frozenset[UUID] = frozenset(),
    viewer_is_private_viewer_of_vault: bool = False,
) -> bool:
    """Decide whether a viewer can read a content row.

    Inputs:

    - ``visibility`` — the content's visibility.
    - ``viewer_id`` — the user attempting to read. ``None`` for
      anonymous / public-web requests.
    - ``content_vault_owner_id`` — owner of the vault the content lives
      in.
    - ``content_network_hub_ids`` — set of hub ids the content has been
      published into. Empty for content not pushed to any network.
    - ``viewer_hub_memberships`` — set of hub ids the viewer is a member
      of.
    - ``viewer_is_private_viewer_of_vault`` — whether the viewer holds
      a private-viewer credential for the vault.

    Returns ``True`` iff the read is allowed.

    Decision rules:

    - **SEALED** — only the owner. (Decryption is a separate question;
      this function says whether the row itself is fetchable. The
      ciphertext doesn't reveal content.)
    - **PERSONAL** — only the owner.
    - **VIEWER** — owner or named private viewer.
    - **NETWORK** — owner, private viewer, or member of a hub the
      content has been published into.
    - **PUBLIC** — anyone, including ``viewer_id = None``.
    """
    if visibility == Visibility.PUBLIC:
        return True

    if viewer_id is None:
        # Anonymous: only PUBLIC was permitted; handled above.
        return False

    is_owner = viewer_id == content_vault_owner_id
    if is_owner:
        return True

    if visibility in (Visibility.SEALED, Visibility.PERSONAL):
        # Only the owner can read these.
        return False

    if visibility == Visibility.VIEWER:
        return viewer_is_private_viewer_of_vault

    if visibility == Visibility.NETWORK:
        if viewer_is_private_viewer_of_vault:
            return True
        if not content_network_hub_ids or not viewer_hub_memberships:
            return False
        return bool(content_network_hub_ids & viewer_hub_memberships)

    return False


def can_write_with_visibility(
    *,
    viewer_id: UUID | None,
    content_vault_owner_id: UUID,
    is_collaborator: bool = False,
) -> bool:
    """Decide whether a viewer can write (create / update / delete) a
    content row.

    Writes are stricter than reads: only the vault owner or an
    explicitly-declared vault collaborator may write. Private viewers
    are read-only. Network membership grants reads, not writes.

    Anonymous viewers can never write.
    """
    if viewer_id is None:
        return False
    if viewer_id == content_vault_owner_id:
        return True
    return is_collaborator
