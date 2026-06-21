"""Lineage attestations + counter-signing HTTP endpoints.

``GET    /api/v1/attestations``                         — list (filter ``?subject_user_id=`` / ``?kind=`` / ``?visibility=``)
``POST   /api/v1/attestations``                         — create + self-sign (caller supplies private key bytes or 64-byte signature)
``GET    /api/v1/attestations/{id}``                    — fetch + signatures
``POST   /api/v1/attestations/{id}/sign``               — counter-sign or revoke
``GET    /api/v1/attestations/{id}/verify``             — verify all signatures; returns per-signature status

Per ``plan/05-magical-beings.md`` §12. Trust model is peer-to-peer:
* The claimant signs with their own Ed25519 key on creation.
* Authorities counter-sign by POSTing a signature over the same
  canonical bytes.
* Revocations are signatures with ``role = "revocation"``; the
  ``revoked_at`` denormalisation column is updated for fast lookup.
"""

from __future__ import annotations

import base64
import contextlib
from datetime import UTC, datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.federation.signing import (
    canonical_attestation_bytes,
    sign_bytes,
    verify_signature,
)
from theourgia.models.attestations import (
    Attestation,
    AttestationKind,
    AttestationSignature,
    AttestationVisibility,
)

__all__ = ["router"]

router = APIRouter()


AttestationKindLiteral = Literal[
    "initiation", "grade-granted", "membership", "teacher-student",
    "ordination", "authorship", "other",
]
AttestationVisibilityLiteral = Literal["private", "viewer", "network", "public"]
SignatureRole = Literal["self", "counter-sign", "revocation"]


# ───── Schemas ─────────────────────────────────────────────────────────


class SignatureRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    signer_user_id: str | None
    signer_label: str
    signer_public_key: str  # base64
    signature: str  # base64
    role: SignatureRole
    signed_at: datetime


class AttestationRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    subject_user_id: str | None
    subject_persona_id: str | None
    kind: AttestationKindLiteral
    description: str
    tradition: str | None
    grade_or_degree: str | None
    granted_at: datetime | None
    signed_statement: str  # base64 of the canonical JSON bytes
    visibility: AttestationVisibilityLiteral
    revoked_at: datetime | None
    created_at: datetime
    updated_at: datetime
    signatures: list[SignatureRead] = Field(default_factory=list)


class AttestationCreate(BaseModel):
    """Body for ``POST /attestations``.

    The caller supplies either:
    * ``self_signature`` + ``signer_public_key`` (the signature is
      computed client-side; the server only verifies and persists), OR
    * ``private_key`` bytes (the server signs on behalf of the caller —
      used by integration tests / scripted attestations).

    The signed bytes are the canonical JSON of the claim payload built
    from ``kind`` / ``description`` / ``tradition`` / ``grade_or_degree``
    / ``granted_at`` / ``subject_*``. Server and client both compute
    those bytes from the same recipe (:func:`canonical_attestation_bytes`).
    """

    model_config = ConfigDict(extra="forbid")

    subject_user_id: UUID | None = None
    subject_persona_id: UUID | None = None
    kind: AttestationKindLiteral
    description: str = Field(min_length=1)
    tradition: str | None = Field(default=None, max_length=128)
    grade_or_degree: str | None = Field(default=None, max_length=128)
    granted_at: datetime | None = None
    visibility: AttestationVisibilityLiteral = "private"

    signer_label: str = Field(min_length=1, max_length=256)
    signer_public_key: bytes = Field(description="32 raw Ed25519 public key bytes")

    # Two paths — exactly one must be supplied.
    self_signature: bytes | None = Field(
        default=None, description="64 raw Ed25519 signature bytes (over canonical claim).",
    )
    private_key: bytes | None = Field(
        default=None,
        description=(
            "32 raw Ed25519 private key bytes. Server-side signing path. "
            "Server discards the key after use; never persisted."
        ),
    )


class CounterSignCreate(BaseModel):
    """Body for ``POST /attestations/{id}/sign``."""

    model_config = ConfigDict(extra="forbid")

    signer_label: str = Field(min_length=1, max_length=256)
    signer_public_key: bytes
    signature: bytes
    role: SignatureRole = "counter-sign"


class SignatureVerification(BaseModel):
    model_config = ConfigDict(extra="forbid")

    signature_id: str
    role: SignatureRole
    signer_label: str
    valid: bool
    reason: str | None = None


class VerifyResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    attestation_id: str
    has_self_signature: bool
    self_signature_valid: bool | None
    counter_signatures: int
    valid_counter_signatures: int
    revoked: bool
    signatures: list[SignatureVerification]


# ───── Helpers ─────────────────────────────────────────────────────────


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _sig_to_read(row: AttestationSignature) -> SignatureRead:
    return SignatureRead(
        id=str(row.id),
        signer_user_id=str(row.signer_user_id) if row.signer_user_id else None,
        signer_label=row.signer_label,
        signer_public_key=_b64(row.signer_public_key),
        signature=_b64(row.signature),
        role=row.role,  # type: ignore[arg-type]
        signed_at=row.signed_at,
    )


def _attestation_to_read(
    row: Attestation,
    signatures: list[AttestationSignature],
) -> AttestationRead:
    return AttestationRead(
        id=str(row.id),
        subject_user_id=str(row.subject_user_id) if row.subject_user_id else None,
        subject_persona_id=str(row.subject_persona_id) if row.subject_persona_id else None,
        kind=row.kind.value,
        description=row.description,
        tradition=row.tradition,
        grade_or_degree=row.grade_or_degree,
        granted_at=row.granted_at,
        signed_statement=_b64(row.signed_statement),
        visibility=row.visibility.value,
        revoked_at=row.revoked_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
        signatures=[_sig_to_read(s) for s in signatures],
    )


def _build_claim_payload(payload: AttestationCreate) -> dict[str, Any]:
    """Build the canonical claim dict that gets signed.

    Includes only the fields that semantically commit the signer —
    not visibility (which is access policy, not the lineage claim
    itself) and not transient server fields.
    """
    return {
        "subject_user_id": str(payload.subject_user_id) if payload.subject_user_id else None,
        "subject_persona_id": (
            str(payload.subject_persona_id) if payload.subject_persona_id else None
        ),
        "kind": payload.kind,
        "description": payload.description,
        "tradition": payload.tradition,
        "grade_or_degree": payload.grade_or_degree,
        "granted_at": payload.granted_at.isoformat() if payload.granted_at else None,
    }


async def _load_signatures(
    db: AsyncSession, attestation_id: UUID,
) -> list[AttestationSignature]:
    stmt = (
        select(AttestationSignature)
        .where(AttestationSignature.attestation_id == attestation_id)
        .order_by(AttestationSignature.signed_at.asc())
    )
    return list((await db.execute(stmt)).scalars().all())


# ───── List / read ─────────────────────────────────────────────────────


@router.get(
    "/attestations",
    response_model=list[AttestationRead],
    tags=["attestations"],
)
async def list_attestations(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    subject_user_id: UUID | None = None,
    kind: AttestationKindLiteral | None = None,
    visibility: AttestationVisibilityLiteral | None = None,
    limit: int = 100,
) -> list[AttestationRead]:
    stmt = select(Attestation).where(Attestation.deleted_at.is_(None))
    if subject_user_id is not None:
        stmt = stmt.where(Attestation.subject_user_id == subject_user_id)
    if kind is not None:
        stmt = stmt.where(Attestation.kind == AttestationKind(kind))
    if visibility is not None:
        stmt = stmt.where(Attestation.visibility == AttestationVisibility(visibility))
    stmt = stmt.order_by(Attestation.created_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    out: list[AttestationRead] = []
    for row in rows:
        sigs = await _load_signatures(db, row.id)
        out.append(_attestation_to_read(row, sigs))
    return out


@router.get(
    "/attestations/{attestation_id}",
    response_model=AttestationRead,
    tags=["attestations"],
)
async def get_attestation(
    attestation_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> AttestationRead:
    row = await db.get(Attestation, attestation_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attestation not found.")
    sigs = await _load_signatures(db, row.id)
    return _attestation_to_read(row, sigs)


# ───── Create + self-sign ────────────────────────────────────────────


@router.post(
    "/attestations",
    response_model=AttestationRead,
    status_code=status.HTTP_201_CREATED,
    tags=["attestations"],
)
async def create_attestation(
    payload: AttestationCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> AttestationRead:
    """Create an attestation and persist its self-signature.

    The signer's public key must be present; the signature can either
    be supplied directly or computed server-side from the private key
    (the latter is the test path).
    """
    if len(payload.signer_public_key) != 32:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "signer_public_key must be exactly 32 bytes.",
        )
    if (payload.self_signature is None) == (payload.private_key is None):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Provide exactly one of self_signature or private_key.",
        )

    claim = _build_claim_payload(payload)
    signed_statement = canonical_attestation_bytes(claim)

    if payload.private_key is not None:
        if len(payload.private_key) != 32:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "private_key must be exactly 32 raw bytes.",
            )
        priv = Ed25519PrivateKey.from_private_bytes(payload.private_key)
        signature = sign_bytes(priv, signed_statement)
    else:
        assert payload.self_signature is not None
        if len(payload.self_signature) != 64:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "self_signature must be exactly 64 raw bytes.",
            )
        signature = payload.self_signature

    pub = Ed25519PublicKey.from_public_bytes(payload.signer_public_key)
    if not verify_signature(pub, signed_statement, signature):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "self-signature does not verify against signer_public_key.",
        )

    row = Attestation(
        subject_user_id=payload.subject_user_id,
        subject_persona_id=payload.subject_persona_id,
        kind=AttestationKind(payload.kind),
        description=payload.description,
        tradition=payload.tradition,
        grade_or_degree=payload.grade_or_degree,
        granted_at=payload.granted_at,
        signed_statement=signed_statement,
        visibility=AttestationVisibility(payload.visibility),
    )
    db.add(row)
    await db.flush()  # need row.id before signature row

    sig = AttestationSignature(
        attestation_id=row.id,
        signer_user_id=current_user.id if current_user is not None else None,
        signer_label=payload.signer_label,
        signer_public_key=payload.signer_public_key,
        signature=signature,
        role="self",
        signed_at=datetime.now(tz=UTC),
    )
    db.add(sig)
    await db.commit()
    await db.refresh(row)

    sigs = await _load_signatures(db, row.id)
    return _attestation_to_read(row, sigs)


# ───── Counter-sign / revoke ─────────────────────────────────────────


@router.post(
    "/attestations/{attestation_id}/sign",
    response_model=AttestationRead,
    status_code=status.HTTP_201_CREATED,
    tags=["attestations"],
)
async def add_signature(
    attestation_id: UUID,
    payload: CounterSignCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> AttestationRead:
    row = await db.get(Attestation, attestation_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attestation not found.")

    if len(payload.signer_public_key) != 32:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "signer_public_key must be exactly 32 bytes.",
        )
    if len(payload.signature) != 64:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "signature must be exactly 64 bytes.",
        )

    pub = Ed25519PublicKey.from_public_bytes(payload.signer_public_key)
    if not verify_signature(pub, row.signed_statement, payload.signature):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "signature does not verify against the attestation's signed_statement.",
        )

    now = datetime.now(tz=UTC)
    sig = AttestationSignature(
        attestation_id=row.id,
        signer_user_id=current_user.id if current_user is not None else None,
        signer_label=payload.signer_label,
        signer_public_key=payload.signer_public_key,
        signature=payload.signature,
        role=payload.role,
        signed_at=now,
    )
    db.add(sig)

    if payload.role == "revocation":
        row.revoked_at = now

    await db.commit()
    await db.refresh(row)
    sigs = await _load_signatures(db, row.id)
    return _attestation_to_read(row, sigs)


# ───── Verify ─────────────────────────────────────────────────────────


@router.get(
    "/attestations/{attestation_id}/verify",
    response_model=VerifyResponse,
    tags=["attestations"],
)
async def verify_attestation(
    attestation_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> VerifyResponse:
    """Verify every signature on this attestation.

    Returns per-signature status so the UI can show "L. Vespera's
    signature: ✓ valid" / "Original initiator key: ✗ does not verify".
    """
    row = await db.get(Attestation, attestation_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attestation not found.")

    sigs = await _load_signatures(db, row.id)
    verifications: list[SignatureVerification] = []
    self_seen = False
    self_valid: bool | None = None
    counter_total = 0
    counter_valid = 0

    for s in sigs:
        valid = False
        reason: str | None = None
        try:
            if len(s.signer_public_key) != 32 or len(s.signature) != 64:
                reason = "malformed key or signature length"
            else:
                pub = Ed25519PublicKey.from_public_bytes(s.signer_public_key)
                valid = verify_signature(pub, row.signed_statement, s.signature)
                if not valid:
                    reason = "signature does not verify"
        except Exception as exc:  # pragma: no cover — defensive
            with contextlib.suppress(Exception):
                reason = str(exc)

        verifications.append(
            SignatureVerification(
                signature_id=str(s.id),
                role=s.role,  # type: ignore[arg-type]
                signer_label=s.signer_label,
                valid=valid,
                reason=reason,
            )
        )
        if s.role == "self":
            self_seen = True
            self_valid = valid
        elif s.role == "counter-sign":
            counter_total += 1
            if valid:
                counter_valid += 1

    return VerifyResponse(
        attestation_id=str(row.id),
        has_self_signature=self_seen,
        self_signature_valid=self_valid,
        counter_signatures=counter_total,
        valid_counter_signatures=counter_valid,
        revoked=row.revoked_at is not None,
        signatures=verifications,
    )
