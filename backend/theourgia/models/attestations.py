"""Lineage attestation + counter-signing.

Per `plan/05-magical-beings.md` §12.

A magician makes a public claim about their lineage — "I am a
Minerval of OTO since 2020", "I was initiated in the Lyceum
tradition by L. Vespera on Beltane 2022". The attestation is
**signed by the claimant's own Ed25519 key** so the public can
verify the cryptographic provenance.

Authorities (lodge masters, granting bodies, individual initiators)
**counter-sign** the same attestation using their own keys. Public
verification UI then shows:

> "Soror Ev. A. claims initiation as Minerval (OTO) on 2020-03-20.
>  Signed by her on 2020-03-21.
>  Counter-signed by L. Vespera (lodge master, key: 9F2A...) on
>  2020-03-22."

Revocation works the same way: an authority signs a revocation row
referencing the original attestation by id; the public UI shows the
attestation as "revoked by X on Y" without erasing history.

The trust model is peer-to-peer — there's no central authority. Each
authority publishes their public key (typically on their profile);
verifiers check signatures against those keys. The plan resolves
this as "no central authority; trust webs work peer-to-peer".
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, LargeBinary, String, Text
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = [
    "Attestation",
    "AttestationKind",
    "AttestationSignature",
    "AttestationVisibility",
]


class AttestationKind(str, enum.Enum):
    """What kind of lineage claim."""

    INITIATION = "initiation"
    GRADE_GRANTED = "grade-granted"
    MEMBERSHIP = "membership"
    TEACHER_STUDENT = "teacher-student"
    ORDAINATION = "ordination"
    AUTHORSHIP = "authorship"
    OTHER = "other"


class AttestationVisibility(str, enum.Enum):
    """Who can see this attestation."""

    PRIVATE = "private"
    VIEWER = "viewer"
    NETWORK = "network"  # the user's federated network
    PUBLIC = "public"


class Attestation(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One lineage attestation.

    The signed statement (canonical JSON) is stored separately from
    the human-readable ``description`` so signatures verify against
    deterministic bytes.
    """

    __tablename__ = "attestation"
    __table_args__ = (
        Index("ix_attestation_subject_user_id", "subject_user_id"),
        Index("ix_attestation_subject_persona_id", "subject_persona_id"),
        Index("ix_attestation_visibility", "visibility"),
        Index("ix_attestation_kind", "kind"),
    )

    # The user / persona this attestation is *about*. Usually the
    # author signs it themselves (self-attestation); an authority
    # may sign an attestation about another magician.
    subject_user_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    subject_persona_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("persona.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    kind: AttestationKind = Field(
        sa_column=Column(
            SQLEnum(
                AttestationKind,
                name="attestation_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    description: str = Field(
        sa_column=Column(Text, nullable=False),
        description='Human-readable summary — "Minerval of OTO since 2020-03-20".',
    )

    tradition: Optional[str] = Field(
        default=None,
        sa_column=Column(String(128), nullable=True),
        description="Tradition / order tag (OTO, Golden Dawn, Lyceum, etc.).",
    )

    grade_or_degree: Optional[str] = Field(
        default=None,
        sa_column=Column(String(128), nullable=True),
    )

    granted_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
    )

    # The signed statement — canonical JSON bytes. Signatures verify
    # against this exact byte sequence.
    signed_statement: bytes = Field(
        sa_column=Column(LargeBinary, nullable=False),
        description=(
            "Canonical JSON bytes of the attestation claim. Signatures "
            "in :class:`AttestationSignature` are over these bytes "
            "exactly."
        ),
    )

    visibility: AttestationVisibility = Field(
        default=AttestationVisibility.PRIVATE,
        sa_column=Column(
            SQLEnum(
                AttestationVisibility,
                name="attestation_visibility",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="private",
        ),
    )

    revoked_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
        description=(
            "When this attestation was revoked. The revocation is a "
            "separate signed row in AttestationSignature with role = "
            "'revocation' — this denormalisation is for fast UI lookup."
        ),
    )


class AttestationSignature(IDMixin, TimestampMixin, table=True):
    """One signature over an :class:`Attestation`.

    Multiple signatures per attestation:
    * The claimant's self-signature.
    * Counter-signatures from authorities.
    * Revocation signatures (`role = "revocation"`).
    """

    __tablename__ = "attestation_signature"
    __table_args__ = (
        Index("ix_attestation_signature_attestation_id", "attestation_id"),
        Index("ix_attestation_signature_signer_user_id", "signer_user_id"),
    )

    attestation_id: UUID = Field(
        sa_column=Column(
            ForeignKey("attestation.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    signer_user_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="The signer's user_id. NULL for external authorities.",
    )

    signer_label: str = Field(
        sa_column=Column(String(256), nullable=False),
        description=(
            'Human-readable identity of the signer — "L. Vespera, '
            'Lodge Master of Lyceum" / "Soror Ev. A.".'
        ),
    )

    signer_public_key: bytes = Field(
        sa_column=Column(LargeBinary, nullable=False),
        description="32-byte Ed25519 public key the signature verifies against.",
    )

    signature: bytes = Field(
        sa_column=Column(LargeBinary, nullable=False),
        description="64-byte Ed25519 signature over the attestation's signed_statement.",
    )

    role: str = Field(
        default="counter-sign",
        sa_column=Column(String(64), nullable=False, server_default="counter-sign"),
        description=(
            'One of: "self" / "counter-sign" / "revocation". '
            "Determines how the verifier UI presents this row."
        ),
    )

    signed_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )
