"""Talisman HTTP endpoints.

``GET    /api/v1/talismans``                    — list
``POST   /api/v1/talismans``                    — create (plaintext)
``GET    /api/v1/talismans/{id}``               — detail
``PATCH  /api/v1/talismans/{id}``               — update meta only
``DELETE /api/v1/talismans/{id}``               — soft delete
``POST   /api/v1/talismans/{id}/seal``          — encrypt + null plaintext
``POST   /api/v1/talismans/{id}/unseal``        — return ciphertext + IV
``POST   /api/v1/talismans/{id}/fork``          — fork a new version

Per the H05 designer handoff worked example (Talisman Designer):
the talisman is a composition of references (sigil_ids, square_ids,
inscriptions, etc.). Plaintext face SVGs are derived from the
composition. Sealed talismans store only ciphertext + IV; the
client encrypts before POST and decrypts after GET.

Honesty rules (H05):
  · A consecrated talisman (linked_consecration_working_id set)
    is read-only — editing requires fork.
  · Sealed talismans cannot accept plaintext patches — the client
    re-encrypts and POSTs to /seal again.
  · sigil_ids + square_ids in components must reference rows in
    the same vault. Validated at create + update.
"""

from __future__ import annotations

from base64 import b64decode, b64encode
from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.entries import EncryptionMode, Entry
from theourgia.models.magic_squares import MagicSquare
from theourgia.models.sigils import Sigil
from theourgia.models.talismans import Talisman

__all__ = ["router"]

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────


class TalismanRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str | None
    name: str
    purpose: str
    front_svg: str | None
    back_svg: str | None
    components: dict[str, Any] | None
    materials_notes: str | None
    linked_election: dict[str, Any] | None
    linked_consecration_working_id: str | None
    encryption_mode: str
    sealed: bool
    # Base64 when present; None when not sealed.
    encrypted_payload_b64: str | None
    encryption_iv_b64: str | None
    parent_talisman_id: str | None
    created_at: datetime
    updated_at: datetime


class TalismanCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=240)
    purpose: str = Field(min_length=1)
    front_svg: str = Field(min_length=1)
    back_svg: str = Field(min_length=1)
    components: dict[str, Any] = Field(default_factory=dict)
    materials_notes: str | None = None
    linked_election: dict[str, Any] | None = None
    linked_consecration_working_id: UUID | None = None


class TalismanUpdate(BaseModel):
    """Only meta fields. Edit the composition (front_svg, back_svg,
    components) by forking — the H05 committed-make rule."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)
    purpose: str | None = Field(default=None, min_length=1)
    materials_notes: str | None = None
    linked_election: dict[str, Any] | None = None
    linked_consecration_working_id: UUID | None = None


class TalismanSealPayload(BaseModel):
    """Client encrypts ``{front_svg, back_svg, components}`` and POSTs
    the ciphertext + IV here. Server stores both and nulls out the
    plaintext columns."""

    model_config = ConfigDict(extra="forbid")

    encrypted_payload_b64: str = Field(min_length=1)
    encryption_iv_b64: str = Field(min_length=1)


class TalismanUnsealResponse(BaseModel):
    """The server returns ciphertext + IV; the client decrypts in
    memory."""

    model_config = ConfigDict(extra="forbid")

    encrypted_payload_b64: str
    encryption_iv_b64: str


class TalismanForkPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)


# ── Helpers ──────────────────────────────────────────────────────────


def _to_read(row: Talisman) -> TalismanRead:
    sealed = row.encryption_mode == EncryptionMode.SEALED
    return TalismanRead(
        id=str(row.id),
        owner_id=str(row.owner_id) if row.owner_id else None,
        name=row.name,
        purpose=row.purpose,
        # When sealed, the wire returns no plaintext even if the
        # column happens to be populated (defence in depth).
        front_svg=None if sealed else row.front_svg,
        back_svg=None if sealed else row.back_svg,
        components=None if sealed else row.components,
        materials_notes=row.materials_notes,
        linked_election=row.linked_election,
        linked_consecration_working_id=(
            str(row.linked_consecration_working_id)
            if row.linked_consecration_working_id
            else None
        ),
        encryption_mode=row.encryption_mode.value,
        sealed=sealed,
        encrypted_payload_b64=(
            b64encode(row.encrypted_payload).decode("ascii")
            if row.encrypted_payload
            else None
        ),
        encryption_iv_b64=(
            b64encode(row.encryption_iv).decode("ascii")
            if row.encryption_iv
            else None
        ),
        parent_talisman_id=(
            str(row.parent_talisman_id) if row.parent_talisman_id else None
        ),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _validate_component_refs(
    components: dict[str, Any],
    db: AsyncSession,
    owner_id: UUID | None,
) -> None:
    """Sigil + magic-square ids referenced in components must belong
    to the same vault as the talisman."""
    sigil_ids = components.get("sigil_ids", []) or []
    if sigil_ids:
        stmt = select(Sigil).where(Sigil.id.in_(sigil_ids))
        if owner_id is not None:
            stmt = stmt.where(Sigil.owner_id == owner_id)
        rows = (await db.execute(stmt)).scalars().all()
        if len(rows) != len(set(sigil_ids)):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "One or more sigil_ids in components are not in your vault.",
            )
    square_ids = components.get("square_ids", []) or []
    if square_ids:
        stmt = select(MagicSquare).where(MagicSquare.id.in_(square_ids))
        if owner_id is not None:
            stmt = stmt.where(MagicSquare.owner_id == owner_id)
        rows = (await db.execute(stmt)).scalars().all()
        if len(rows) != len(set(square_ids)):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "One or more square_ids in components are not in your vault.",
            )


async def _validate_consecration_link(
    working_id: UUID | None,
    db: AsyncSession,
    owner_id: UUID | None,
) -> None:
    if working_id is None:
        return
    entry = await db.get(Entry, working_id)
    if entry is None or entry.deleted_at is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "linked_consecration_working_id does not match a live entry.",
        )
    if owner_id is not None and entry.owner_id != owner_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            (
                "linked_consecration_working_id must reference an entry "
                "in your vault."
            ),
        )


def _ensure_not_consecrated_locked(row: Talisman) -> None:
    """The H05 honesty rule: a talisman with a consecration link is
    read-only. Edits require fork."""
    if row.linked_consecration_working_id is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            (
                "This talisman is consecrated — edits require forking a "
                "new version via POST /api/v1/talismans/{id}/fork."
            ),
        )


def _owner_check(row: Talisman, current_user_id: UUID) -> None:
    """Raise 404 if the caller is not the row's owner."""
    if row.owner_id != current_user_id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Talisman not found.",
        )


# ── Routes ──────────────────────────────────────────────────────────


@router.get(
    "/talismans", response_model=list[TalismanRead], tags=["talismans"],
)
async def list_talismans(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    sealed: bool | None = None,
    limit: int = 100,
) -> list[TalismanRead]:
    stmt = select(Talisman).where(
        Talisman.deleted_at.is_(None),
        Talisman.owner_id == current_user.id,
    )
    if sealed is True:
        stmt = stmt.where(Talisman.encryption_mode == EncryptionMode.SEALED)
    elif sealed is False:
        stmt = stmt.where(Talisman.encryption_mode == EncryptionMode.NONE)
    stmt = stmt.order_by(Talisman.created_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.post(
    "/talismans",
    response_model=TalismanRead,
    status_code=status.HTTP_201_CREATED,
    tags=["talismans"],
)
async def create_talisman(
    payload: TalismanCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> TalismanRead:
    owner_id = current_user.id
    await _validate_component_refs(payload.components, db, owner_id)
    await _validate_consecration_link(
        payload.linked_consecration_working_id, db, owner_id,
    )

    row = Talisman(
        owner_id=owner_id,
        name=payload.name,
        purpose=payload.purpose,
        front_svg=payload.front_svg,
        back_svg=payload.back_svg,
        components=payload.components,
        materials_notes=payload.materials_notes,
        linked_election=payload.linked_election,
        linked_consecration_working_id=(
            payload.linked_consecration_working_id
        ),
        encryption_mode=EncryptionMode.NONE,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/talismans/{talisman_id}",
    response_model=TalismanRead,
    tags=["talismans"],
)
async def get_talisman(
    talisman_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> TalismanRead:
    row = await db.get(Talisman, talisman_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talisman not found.")
    _owner_check(row, current_user.id)
    return _to_read(row)


@router.patch(
    "/talismans/{talisman_id}",
    response_model=TalismanRead,
    tags=["talismans"],
)
async def update_talisman(
    talisman_id: UUID,
    payload: TalismanUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> TalismanRead:
    row = await db.get(Talisman, talisman_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talisman not found.")
    _owner_check(row, current_user.id)
    _ensure_not_consecrated_locked(row)

    data = payload.model_dump(exclude_unset=True)
    if "linked_consecration_working_id" in data:
        await _validate_consecration_link(
            data["linked_consecration_working_id"],
            db,
            row.owner_id,
        )
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/talismans/{talisman_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["talismans"],
)
async def delete_talisman(
    talisman_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(Talisman, talisman_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talisman not found.")
    _owner_check(row, current_user.id)
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/talismans/{talisman_id}/seal",
    response_model=TalismanRead,
    tags=["talismans"],
)
async def seal_talisman(
    talisman_id: UUID,
    payload: TalismanSealPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> TalismanRead:
    """Switch a talisman into sealed (Mode B) mode.

    The client has already encrypted ``{front_svg, back_svg,
    components}`` with the vault key and is POSTing the ciphertext +
    IV. We:
      1. store the ciphertext + IV
      2. set encryption_mode = SEALED
      3. NULL out the plaintext columns (the server must never see
         the cleartext again)
    """
    row = await db.get(Talisman, talisman_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talisman not found.")
    _owner_check(row, current_user.id)

    try:
        ciphertext = b64decode(payload.encrypted_payload_b64, validate=True)
        iv = b64decode(payload.encryption_iv_b64, validate=True)
    except Exception as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "encrypted_payload_b64 and encryption_iv_b64 must be valid base64.",
        ) from exc

    row.encrypted_payload = ciphertext
    row.encryption_iv = iv
    row.encryption_mode = EncryptionMode.SEALED
    # Null the plaintext columns. The server cannot read them again.
    row.front_svg = None
    row.back_svg = None
    row.components = None
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.post(
    "/talismans/{talisman_id}/unseal",
    response_model=TalismanUnsealResponse,
    tags=["talismans"],
)
async def unseal_talisman(
    talisman_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> TalismanUnsealResponse:
    """Return the ciphertext + IV so the client can decrypt in
    memory. The row stays sealed — this is read-only."""
    row = await db.get(Talisman, talisman_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talisman not found.")
    _owner_check(row, current_user.id)
    if (
        row.encryption_mode != EncryptionMode.SEALED
        or row.encrypted_payload is None
        or row.encryption_iv is None
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This talisman is not sealed.",
        )
    return TalismanUnsealResponse(
        encrypted_payload_b64=b64encode(row.encrypted_payload).decode("ascii"),
        encryption_iv_b64=b64encode(row.encryption_iv).decode("ascii"),
    )


@router.post(
    "/talismans/{talisman_id}/fork",
    response_model=TalismanRead,
    status_code=status.HTTP_201_CREATED,
    tags=["talismans"],
)
async def fork_talisman(
    talisman_id: UUID,
    payload: TalismanForkPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> TalismanRead:
    """Fork a new version with ``parent_talisman_id`` set.

    Forking a sealed talisman initialises the child sealed with the
    same ciphertext + IV — the practitioner must re-encrypt if they
    want the fork to diverge. Forking a plaintext talisman copies
    the composition.

    The consecration link is **not** inherited (forks default to
    not-consecrated; the practitioner must re-link if applicable).
    """
    parent = await db.get(Talisman, talisman_id)
    if parent is None or parent.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talisman not found.")
    _owner_check(parent, current_user.id)

    name = payload.name or f"{parent.name} — new version"
    child = Talisman(
        owner_id=current_user.id,
        name=name,
        purpose=parent.purpose,
        front_svg=parent.front_svg,
        back_svg=parent.back_svg,
        components=dict(parent.components) if parent.components else None,
        materials_notes=parent.materials_notes,
        linked_election=(
            dict(parent.linked_election) if parent.linked_election else None
        ),
        linked_consecration_working_id=None,  # do not inherit
        encryption_mode=parent.encryption_mode,
        encrypted_payload=parent.encrypted_payload,
        encryption_iv=parent.encryption_iv,
        parent_talisman_id=parent.id,
    )
    db.add(child)
    await db.commit()
    await db.refresh(child)
    return _to_read(child)
