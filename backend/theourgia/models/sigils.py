"""Sigil model.

Per `plan/07-workshop.md` § Sigil generator and the H05 designer
handoff (`agent_data_and_components_H05.md` § A). A ``Sigil`` is the
practitioner's saved magical mark produced by one of eleven
generation modes.

The intention text + generation mode + parameters are **immutable**
once saved (the committed-make rule from H05) — editing requires
forking a new row via ``POST /api/v1/sigils/{id}/fork``. The parent's
``svg`` and source parameters are never silently mutated.

Per the H05 honesty rule: ``purpose=consecrated`` cannot be set
without a ``linked_working_entry_id`` pointing at a real working
entry — enforced at the API layer.
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

__all__ = ["Sigil", "SigilMode", "SigilPurpose"]


class SigilMode(str, enum.Enum):
    """The eleven generation modes from the H05 spec.

    Order is the surface's left-rail mode order (sacred, not
    alphabetical):
    """

    SPARE = "spare"            # letter elimination (Austin Osman Spare, 1913)
    KAMEA = "kamea"            # magic-square pathing (Agrippa, 1531)
    ROSE_CROSS = "rose_cross"  # Rose Cross cipher (Golden Dawn)
    PYTHAGOREAN = "pythagorean"  # Pythagorean rosette
    HEBREW = "hebrew"          # Hebrew letterform composite
    GREEK = "greek"            # Greek letterform composite
    HASHED = "hashed"          # deterministic curve from SHA-256 seed
    HARMONOGRAPH = "harmonograph"  # damped harmonic plot
    FORMULA = "formula"        # user-supplied r = f(θ, g, t) (sandboxed eval)
    FREEFORM = "freeform"      # direct canvas drawing
    IMAGE = "image"            # upload + vectorize


class SigilPurpose(str, enum.Enum):
    """The four purpose tags the H05 save dialog accepts."""

    WORKSHOP_DRAFT = "workshop_draft"
    CONSECRATED = "consecrated"
    GIFT = "gift"
    PERSONAL_STUDY = "personal_study"


class Sigil(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One saved sigil in the practitioner's vault.

    Defaults to ``purpose=workshop_draft``. The ``intention`` text is
    immutable once saved (the API layer rejects PATCH attempts to
    change it). Fork to make a new version with new parameters.
    """

    __tablename__ = "sigil"
    __table_args__ = (
        Index("ix_sigil_owner", "owner_id"),
        Index("ix_sigil_mode", "mode"),
        Index("ix_sigil_parent", "parent_sigil_id"),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    title: str = Field(max_length=240, nullable=False)
    intention: str = Field(sa_column=Column(Text, nullable=False))
    mode: SigilMode = Field(
        sa_column=Column(
            SQLEnum(
                SigilMode,
                name="sigil_mode",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    # Mode-specific config. Per the H05 spec, each mode has its own
    # schema for ``parameters`` (Kamea: square + cipher; Hashed:
    # salt + curve family + point count; Harmonograph: damping +
    # duration; etc.). JSONB so the model accepts any mode's shape.
    parameters: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    svg: str = Field(sa_column=Column(Text, nullable=False))
    # Deterministic seed for hashed/harmonograph/formula modes —
    # opaque string the engine consumes. ``None`` for modes that
    # don't need one (freeform, image).
    seed: Optional[str] = Field(default=None, max_length=64)
    purpose: SigilPurpose = Field(
        default=SigilPurpose.WORKSHOP_DRAFT,
        sa_column=Column(
            SQLEnum(
                SigilPurpose,
                name="sigil_purpose",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=SigilPurpose.WORKSHOP_DRAFT.value,
        ),
    )
    citation: Optional[str] = Field(default=None, max_length=480)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))

    # Optional links to other vault rows. ``ondelete=SET NULL`` so
    # deleting an entity or entry doesn't cascade-delete the sigil.
    linked_entity_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    linked_working_entry_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # Versioning. ``parent_sigil_id`` points at the row this sigil
    # was forked from. ``ondelete=SET NULL`` so forking history is
    # preserved as soft data even if a parent is hard-deleted later.
    parent_sigil_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("sigil.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
