"""Content visibility model.

Every content row in Theourgia carries a :class:`Visibility` value that
determines who can read it. Values are ordered from most private to
most public (with ``sealed`` as a side category that is *more* private
than ``personal`` because it is also zero-knowledge-encrypted).

The integer values are persisted to the database via SQLModel ``Enum``
columns and travel with rows in exports / federation messages, so they
are stable and never reused.
"""

from __future__ import annotations

import enum

__all__ = ["Visibility", "AT_LEAST_INTERNAL", "PUBLISHABLE"]


class Visibility(int, enum.Enum):
    """How visible a content row is.

    Ordering, from most private to most public, matches the integer
    values (with ``SEALED`` as a side category):

    1. ``SEALED`` — zero-knowledge-encrypted; even the server cannot
       decrypt. Used for initiation records, oath ledger, and content
       the user explicitly marks sealed.
    2. ``PERSONAL`` — visible only to the vault owner. Default for most
       new entries.
    3. ``VIEWER`` — visible to the owner and named private-viewer
       accounts the owner has minted credentials for.
    4. ``NETWORK`` — visible to members of the hub(s) the row has been
       published into. The set of hubs is recorded alongside the
       visibility value on the content row.
    5. ``PUBLIC`` — visible to anyone; federated outbound via the
       Theourgia native protocol and (where enabled) ActivityPub.
    """

    SEALED = 5  # also private; sits at the top numerically for "most protected"
    PERSONAL = 1
    VIEWER = 2
    NETWORK = 3
    PUBLIC = 4

    @property
    def is_private(self) -> bool:
        """True for visibilities that the public web cannot read."""
        return self in {Visibility.SEALED, Visibility.PERSONAL, Visibility.VIEWER}

    @property
    def is_publishable_outbound(self) -> bool:
        """True for visibilities that federate / RSS / appear on public pages."""
        return self == Visibility.PUBLIC

    @property
    def is_sealed(self) -> bool:
        """Whether this visibility implies zero-knowledge encryption."""
        return self == Visibility.SEALED


# Convenience sets used by check helpers and tests.
AT_LEAST_INTERNAL: frozenset[Visibility] = frozenset(
    {Visibility.VIEWER, Visibility.NETWORK, Visibility.PUBLIC}
)
"""Visibilities that admit at least *some* non-owner reader."""

PUBLISHABLE: frozenset[Visibility] = frozenset({Visibility.PUBLIC})
"""Visibilities that flow outbound to public-broadcast channels."""
