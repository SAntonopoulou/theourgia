"""Library — catalogued books, notes, and extracted quotes.

The library is the spine of the project's scholarship layer. Three
tables compose it:

* :class:`Book` — bibliographic record of a work.
* :class:`BookNote` — free-form per-book notes (multiple per book).
* :class:`Quote` — extracted quotations with page references; powers
  the ``/quote`` autocite slash command in the editor.

Phase 02 shipped a minimal :class:`Book` for the entity-citation
proof of concept. Phase 04 extends it with edition / publisher /
holdings / status / languages, and adds the two new tables.
"""

from __future__ import annotations

import enum
from datetime import date as date_cls
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, Date, ForeignKey, Index, Integer, String, Text
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["Book", "BookNote", "BookStatus", "Holding", "Quote", "ReadingList"]


class BookStatus(str, enum.Enum):
    """Where the user is with this book."""

    OWNED = "owned"
    READING = "reading"
    READ = "read"
    WANT = "want"
    LENT_OUT = "lent_out"
    UNLISTED = "unlisted"


class Holding(str, enum.Enum):
    """How the user holds this book (multiple via the m2m would be
    nicer but a single-pick column is enough for v0)."""

    PHYSICAL = "physical"
    DIGITAL = "digital"
    AUDIOBOOK = "audiobook"
    NONE = "none"


class Book(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One catalogued book."""

    __tablename__ = "book"
    __table_args__ = (
        Index("ix_book_owner", "owner_id"),
        Index("ix_book_title", "title"),
        Index("ix_book_isbn", "isbn"),
        Index("ix_book_status", "status"),
    )

    title: str = Field(sa_column=Column(String(512), nullable=False))
    author: str = Field(
        sa_column=Column(String(256), nullable=False, server_default=""),
        description="Free-text author; multiple → semicolon-separated for v0.",
    )
    editor: Optional[str] = Field(
        default=None,
        sa_column=Column(String(256), nullable=True),
        description="Editor / translator if distinct from the author.",
    )
    edition: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description='Edition descriptor — "2nd", "rev.", "facsimile", etc.',
    )
    publisher: Optional[str] = Field(
        default=None,
        sa_column=Column(String(256), nullable=True),
    )
    year: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
        description="First-known publication year (negative for BCE).",
    )
    isbn: str = Field(
        sa_column=Column(String(32), nullable=False, server_default=""),
        description="ISBN-10 or ISBN-13 (digits + dashes); empty for unbooked works.",
    )
    languages: str = Field(
        sa_column=Column(String(128), nullable=False, server_default=""),
        description=(
            "Semicolon-separated BCP-47 language tags "
            '(e.g. "en;grc" for an English-translation Greek text).'
        ),
    )
    tradition: str = Field(
        sa_column=Column(String(64), nullable=False, server_default=""),
        description=(
            "Tradition tag — hermetic, hellenic, thelemic, taoist, etc."
        ),
    )

    status: BookStatus = Field(
        default=BookStatus.OWNED,
        sa_column=Column(
            SQLEnum(
                BookStatus,
                name="book_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="owned",
        ),
    )

    holding: Holding = Field(
        default=Holding.PHYSICAL,
        sa_column=Column(
            SQLEnum(
                Holding,
                name="book_holding",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="physical",
        ),
    )

    shelf_location: Optional[str] = Field(
        default=None,
        sa_column=Column(String(128), nullable=True),
        description=(
            'Free-text location — "Study, top shelf", "Loft archive box 3", '
            '"Calibre/Hermetic", etc.'
        ),
    )

    cover_image_url: Optional[str] = Field(
        default=None,
        sa_column=Column(String(512), nullable=True),
        description="Optional URL to a cover image (cached locally on display).",
    )

    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "Free-text reading notes / commentary. Distinct from "
            "BookNote which gives multiple-rows-per-book."
        ),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


class BookNote(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One free-form note attached to a book.

    Multiple notes per book — typical use is per-reading-session
    reflection, or per-chapter commentary.
    """

    __tablename__ = "book_note"
    __table_args__ = (
        Index("ix_book_note_book_id", "book_id"),
        Index("ix_book_note_owner_id", "owner_id"),
    )

    book_id: UUID = Field(
        sa_column=Column(
            ForeignKey("book.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    body: str = Field(
        sa_column=Column(Text, nullable=False),
    )

    page_reference: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description='Page or section reference; free-form ("pp. 132-134", "Ch. III", "fol. 27v").',
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


class Quote(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """An extracted quotation. Powers the ``/quote`` autocite slash
    command in the editor.

    Each quote carries the source book reference, the verbatim text,
    a page or locator, and optional image of the page (URL only here;
    the actual upload sits in `uploads` table).
    """

    __tablename__ = "quote"
    __table_args__ = (
        Index("ix_quote_book_id", "book_id"),
        Index("ix_quote_owner_id", "owner_id"),
    )

    book_id: UUID = Field(
        sa_column=Column(
            ForeignKey("book.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    text: str = Field(
        sa_column=Column(Text, nullable=False),
        description="The verbatim quotation.",
    )

    page_reference: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
    )

    language: Optional[str] = Field(
        default=None,
        sa_column=Column(String(16), nullable=True),
        description='BCP-47 language tag for the quote ("grc", "la", "he", "en"…).',
    )

    image_url: Optional[str] = Field(
        default=None,
        sa_column=Column(String(512), nullable=True),
        description="Optional URL to a photo of the page.",
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


class ReadingList(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """An ordered reading queue / curriculum builder.

    Lists are named ("Liber Aleph reading plan", "Hellenistic
    foundations"); each member is a book + a position + optional
    target completion date. The m2m table comes in a follow-up batch
    once the ordering UX is settled — for v0 we store the list of
    book ids as a comma-separated string in ``book_ids``.
    """

    __tablename__ = "reading_list"
    __table_args__ = (
        Index("ix_reading_list_owner_id", "owner_id"),
    )

    name: str = Field(
        sa_column=Column(String(256), nullable=False),
    )

    description: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    book_ids: str = Field(
        sa_column=Column(Text, nullable=False, server_default=""),
        description=(
            "Comma-separated ordered book ids. v0 storage; a proper "
            "join table lands when the UI surfaces drag-reorder."
        ),
    )

    target_date: Optional[date_cls] = Field(
        default=None,
        sa_column=Column(Date, nullable=True),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
