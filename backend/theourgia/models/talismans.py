"""Talisman model.

Per `plan/07-workshop.md` § Talisman designer and the H05 designer
handoff (`agent_data_and_components_H05.md` § E — the worked example).

A ``Talisman`` is a composite artefact: front face SVG + back face
SVG + a JSONB ``components`` block referencing sigils + magic
squares + inscriptions + images + borders. Per the H05 honesty rule,
the talisman is **derived-not-stored**: the front/back SVGs are
compositions of the referenced components, not flattened bitmaps.
Editing requires forking a new version (parent_talisman_id chain).

Sealed talismans use the same Mode B crypto pattern as Oath /
Initiation: client encrypts the SVG + components JSON, POSTs the
ciphertext + IV via ``/seal``; server stores the ciphertext and
**nulls out** the plaintext columns. The decryption key never
leaves the practitioner's device.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, LargeBinary, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin
from theourgia.models.entries import EncryptionMode

__all__ = ["Talisman"]


class Talisman(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One talisman row.

    Defaults to plaintext (``encryption_mode = none``). The Sealed
    save mode encrypts client-side, POSTs ciphertext + IV via
    ``/seal``, and the API nulls out front_svg / back_svg /
    components on the row.

    The H05 design constraint: a consecrated talisman (one with a
    ``linked_consecration_working_id``) is read-only — editing
    requires fork. Enforced at the API layer.
    """

    __tablename__ = "talisman"
    __table_args__ = (
        Index("ix_talisman_owner", "owner_id"),
        Index("ix_talisman_parent", "parent_talisman_id"),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    name: str = Field(max_length=240, nullable=False)
    purpose: str = Field(sa_column=Column(Text, nullable=False))

    # Plaintext fields — NULL when sealed.
    front_svg: Optional[str] = Field(default=None, sa_column=Column(Text))
    back_svg: Optional[str] = Field(default=None, sa_column=Column(Text))
    # JSONB shape (H05 §E):
    #   {
    #     "sigil_ids": [uuid…],
    #     "square_ids": [uuid…],
    #     "names": [{ "text", "script", "position", "size", "color" }],
    #     "borders": [{ "kind", "inscription_text?", "rotation_deg" }],
    #     "image_attachment_ids": [uuid…],
    #     "inscriptions": [{ "text", "script", "position", "size", "color" }],
    #   }
    components: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

    materials_notes: Optional[str] = Field(
        default=None, sa_column=Column(Text)
    )

    # Linked election is a snapshot (NOT a FK — elections aren't a
    # table). JSONB shape: { datetime, latitude, longitude, planet,
    # planetary_hour, system }.
    linked_election: Optional[dict] = Field(
        default=None, sa_column=Column(JSONB)
    )
    # Linked consecration working IS a FK — the entry holds the
    # ritual record.
    linked_consecration_working_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # ── Sealed (Mode B) state ───────────────────────────────────────
    encryption_mode: EncryptionMode = Field(
        default=EncryptionMode.NONE,
        sa_column=Column(
            SQLEnum(
                EncryptionMode,
                name="entry_encryption_mode",
                values_callable=lambda obj: [m.value for m in obj],
                create_type=False,
            ),
            nullable=False,
            server_default=EncryptionMode.NONE.value,
        ),
    )
    encrypted_payload: Optional[bytes] = Field(
        default=None, sa_column=Column(LargeBinary)
    )
    encryption_iv: Optional[bytes] = Field(
        default=None, sa_column=Column(LargeBinary)
    )

    # ── Versioning ──────────────────────────────────────────────────
    parent_talisman_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("talisman.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
