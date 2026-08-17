"""The record, as a device holds it — rows carried whole, never shredded.

## What this table is

The phone's record is a timed ledger of practice: keepings with the sky,
the hour and the weather they were kept under, notes carrying a Mood and
a Body reading, tombstones where entries were deleted. Sophia's standing
ruling: *"the record needs to be added pretty much separate from the
journal"* — the journal here is entries with a type and a visibility;
this is not that, and flattening one into the other would lose exactly
the part that makes the record a record.

## Why JSONB documents, not columns

The requirement is *"capable of running both ways for all the features"*
— round-tripping. A relational decomposition must decide, for every
field, whether it deserves a column, and every field it declines is
dropped silently on the way back: the phone syncs up, the site syncs
back something thinner, and nobody sees it happen. That is not a sync,
it is a slow deletion. So the device's row travels and rests WHOLE, and
columns exist only for what the sync protocol itself needs: identity,
ordering, and the conflict key.

The honest cost, accepted knowingly: the database cannot check what is
inside a document. Validation lives at the API.

## The conflict rule

Last writer wins, per row, judged by the DEVICE's own ``updated_at_utc``
— an upsert only lands when the incoming timestamp is strictly newer
than the stored one, so replays and re-pushes are idempotent and an old
device cannot overwrite a newer edit with a stale copy. Ties lose. The
server never invents or merges content; it is a shelf, not an author.

## ``synced_seq``

Server-side arrival order, bumped on every accepted write (inserts by
default, updates by hand in the router). Pull cursors are sequence
positions: "everything after seq N" is a complete, gapless answer in a
way "everything after time T" never quite is.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

__all__ = ["RecordEntry", "RECORD_ENTRY_SEQ"]


RECORD_ENTRY_SEQ = "record_entry_seq"
"""The sequence behind ``synced_seq``. Named so the router can bump it on
updates — a BIGSERIAL default only fires on insert."""


class RecordEntry(SQLModel, table=True):
    """One row of somebody's record, exactly as their device said it.

    The primary key is composite: the DEVICE mints the ``id`` (it is the
    row's uuid in the phone's own database, which is what lets two
    devices on one account interleave without renumbering), and rows are
    scoped per owner.
    """

    __tablename__ = "record_entry"
    __table_args__ = (
        Index("ix_record_entry_owner_seq", "owner_id", "synced_seq"),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
    )
    id: UUID = Field(primary_key=True)

    kind: str = Field(sa_column=Column(String(64), nullable=False))
    """What the document is — 'observance' first; day entries and the
    rest join as the protocol grows. A discriminator, never a schema."""

    doc: dict[str, Any] = Field(
        default_factory=dict, sa_column=Column(JSONB, nullable=False)
    )

    updated_at_utc: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    """The device's clock at the row's last edit — the LWW conflict key.
    Deliberately NOT a server timestamp: the question 'which edit is
    newer' is about when the practitioner acted, not when the packet
    arrived."""

    deleted_at_utc: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    """The device's tombstone, carried like any other fact of the row.
    A deletion syncs as an update whose document says so — removed,
    never never-there, the same rule the phone keeps locally."""

    synced_seq: int = Field(
        sa_column=Column(
            BigInteger,
            nullable=False,
            index=True,
            server_default=text(f"nextval('{RECORD_ENTRY_SEQ}')"),
        ),
    )

    received_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=text("now()"),
        ),
    )
    """When the server first shelved this row — bookkeeping, never the
    conflict key."""
