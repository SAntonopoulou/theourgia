"""Cipher model (B110).

Per ``plan/08-batches-backend.md`` § B110.

``Cipher`` is a gematria letter-value table — either a bundled
public-domain entry that ships with the project, or a personal
practitioner-authored cipher. The 13 bundled entries live in
:mod:`theourgia.core.linguistic.bundled_ciphers` as Python constants
and are inserted into this table on first server boot (loader in a
follow-up batch).

Honesty rules (H06):
  * Bundled rows carry verbatim PD citations. The B107 voces invariant
    pattern applies: a CI test fails if any bundled cipher's
    ``source_citation`` is empty or < 10 chars.
  * Personal ciphers (``personal=True``) carry no citation; the API
    flips ``personal`` based on whether ``source_citation`` is empty.
  * Bundled rows (``bundled_slug IS NOT NULL`` and ``owner_id IS
    NULL``) are immutable through the API — PATCH/DELETE return 409.
"""

from __future__ import annotations

import enum
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["Cipher", "CipherLanguage"]


class CipherLanguage(str, enum.Enum):
    """The seven cipher language families recognised by Phase 08."""

    GREEK = "greek"
    HEBREW = "hebrew"
    ENGLISH = "english"
    COPTIC = "coptic"
    ARABIC = "arabic"
    SANSKRIT = "sanskrit"
    CUSTOM = "custom"


class Cipher(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One gematria cipher — bundled or per-vault."""

    __tablename__ = "cipher"
    __table_args__ = (
        Index("ix_cipher_owner", "owner_id"),
        Index("ix_cipher_language", "language"),
        Index("ix_cipher_bundled_slug", "bundled_slug", unique=True),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    name: str = Field(max_length=240, nullable=False)
    language: CipherLanguage = Field(
        sa_column=Column(
            SQLEnum(
                CipherLanguage,
                name="cipher_language",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    # mapping = { "α": 1, "β": 2, ... }
    mapping: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    # REQUIRED for non-personal ciphers. NULL when personal=True.
    source_citation: Optional[str] = Field(default=None, max_length=480)
    personal: bool = Field(default=False, nullable=False)
    # Bundled ciphers carry a stable slug (e.g., "greek-iso").
    # Personal / custom ciphers leave this NULL.
    bundled_slug: Optional[str] = Field(default=None, max_length=120)
