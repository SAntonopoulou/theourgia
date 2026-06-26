"""Studies (B112).

Per ``plan/08-batches-backend.md`` § B112.

A ``Study`` is a saved gematria query (or, in the future, an
analytics query). A ``StudySnapshot`` is one frozen execution of
a Study — re-running a Study creates a new snapshot row; the
previous snapshots are immutable history.

Honesty rules (H06 §8 — ritual / committed-make):
  * The ``query`` field is **immutable after first save**. PATCH
    cannot mutate it. To "refine" a study, the practitioner saves
    a new Study (the old one is retained as a study of its own).
  * Snapshot ``results`` are frozen. Only ``notes`` is editable on
    a snapshot.
  * Re-run produces a NEW snapshot — it never replaces the
    most-recent one. Chronological history is preserved.
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

__all__ = ["Study", "StudySnapshot", "StudyKind", "StudyVisibility"]


class StudyKind(str, enum.Enum):
    """What kind of question this study asks."""

    GEMATRIA_SEARCH = "gematria_search"
    GEMATRIA_CALCULATION = "gematria_calculation"
    # Added in B121 — the query-builder kind. Stored ``query`` follows
    # the DSL in :mod:`theourgia.core.analytics.query_dsl`.
    QUERY_BUILDER = "query_builder"


class StudyVisibility(str, enum.Enum):
    """Who can read the study + its snapshots."""

    PERSONAL = "personal"
    VIEWER = "viewer"
    HUB = "hub"
    PUBLIC = "public"


class Study(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A saved gematria query or calculation."""

    __tablename__ = "study"
    __table_args__ = (
        Index("ix_study_owner", "owner_id"),
        Index("ix_study_kind", "kind"),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    name: str = Field(max_length=240, nullable=False)
    kind: StudyKind = Field(
        sa_column=Column(
            SQLEnum(
                StudyKind,
                name="study_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    # Frozen after first save. Format depends on kind:
    #   gematria_search:      { value, cipher_ids, match_mode, delta?, ... }
    #   gematria_calculation: { input, cipher_ids }
    query: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    visibility: StudyVisibility = Field(
        default=StudyVisibility.PERSONAL,
        sa_column=Column(
            SQLEnum(
                StudyVisibility,
                name="study_visibility",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=StudyVisibility.PERSONAL.value,
        ),
    )


class StudySnapshot(IDMixin, TimestampMixin, table=True):
    """One execution of a Study. Results are frozen at write-time."""

    __tablename__ = "study_snapshot"
    __table_args__ = (
        Index("ix_study_snapshot_study", "study_id"),
    )

    study_id: UUID = Field(
        sa_column=Column(
            ForeignKey("study.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    # Full JSON response from the search/calculation API at the time
    # of the snapshot. Frozen — never edited.
    results: dict = Field(
        sa_column=Column(JSONB, nullable=False),
    )
    # Editable — the practitioner may annotate a past run.
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
