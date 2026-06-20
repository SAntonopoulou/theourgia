"""Library — catalogued books and texts.

A magician's reading: grimoires, treatises, primary sources. Distinct
from entries (which are authored content) — Library rows reference
external works.

Phase 02 ships the minimal book record. Phase 03 adds reading status,
notes-against-passages, citation graph.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Integer, String
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["Book"]


class Book(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One catalogued book."""

    __tablename__ = "book"
    __table_args__ = (
        Index("ix_book_owner", "owner_id"),
        Index("ix_book_title", "title"),
    )

    title: str = Field(sa_column=Column(String(512), nullable=False))
    author: str = Field(
        sa_column=Column(String(256), nullable=False, server_default=""),
        description="Free-text author; multiple → semicolon-separated for v0.",
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
    tradition: str = Field(
        sa_column=Column(String(64), nullable=False, server_default=""),
        description=(
            "Tradition tag — hermetic, hellenic, thelemic, taoist, etc. "
            "Single-tagged for v0; full tag substrate later."
        ),
    )
    notes: Optional[str] = Field(
        default=None, sa_column=Column(String, nullable=True),
        description="Free-text reading notes / commentary.",
    )
    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
