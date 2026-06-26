"""Gematria index (B111).

Per ``plan/08-batches-backend.md`` § B111.

``GematriaIndex`` is a derived per-(entry, cipher, phrase) row that
the indexer maintains. The row records the numeric value of one
phrase from one entry under one cipher; the cross-journal search
endpoint scans these rows to find all entries that mention a phrase
with a given value.

Honesty rules (H06):
  * **Sealed entries are never indexed.** The indexer skips entries
    with ``encryption_mode == 'sealed'`` entirely. A separate
    ``sealed_match_count`` indicator on the search response surfaces
    "you have N sealed entries that MAY contain matches; unseal to
    check" without leaking any substring.
  * **Owner-scoped.** Every row carries the owner's id; search is
    scoped server-side.
  * **Personal-cipher provenance.** Search results carry a
    ``cipher_personal`` flag so the frontend can surface "this match
    comes from your custom cipher only — not for shared studies".
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Column,
    ForeignKey,
    Index,
    UniqueConstraint,
)
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["GematriaIndex"]


class GematriaIndex(IDMixin, TimestampMixin, table=True):
    """Derived per-(entry, cipher, phrase) gematria row."""

    __tablename__ = "gematria_index"
    __table_args__ = (
        Index("ix_gematria_value", "value"),
        Index("ix_gematria_owner_value", "owner_id", "value"),
        Index(
            "ix_gematria_owner_cipher_value",
            "owner_id", "cipher_id", "value",
        ),
        Index("ix_gematria_digit_sum", "digit_sum"),
        UniqueConstraint(
            "entry_id", "cipher_id", "phrase",
            name="uq_gematria_entry_cipher_phrase",
        ),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    entry_id: UUID = Field(
        sa_column=Column(
            ForeignKey("entry.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    cipher_id: UUID = Field(
        sa_column=Column(
            ForeignKey("cipher.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    phrase: str = Field(max_length=240, nullable=False)
    value: int = Field(nullable=False)
    # Cached at index time so SQL "reduced" search can filter without
    # recomputation. digit_sum is the repeated digital-sum collapse to
    # a single digit (1-9).
    digit_sum: int = Field(nullable=False)
