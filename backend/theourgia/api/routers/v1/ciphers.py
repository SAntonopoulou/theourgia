"""Cipher HTTP endpoints (B110).

Per-vault rows + bundled fixtures.

``GET    /api/v1/ciphers/bundled``  — bundled PD corpus (public)
``GET    /api/v1/ciphers``           — list per-vault + bundled
``POST   /api/v1/ciphers``           — create
``GET    /api/v1/ciphers/{id}``      — detail
``PATCH  /api/v1/ciphers/{id}``      — update
``DELETE /api/v1/ciphers/{id}``      — soft delete

Honesty rules:
  * Bundled ciphers (``bundled_slug`` set + ``owner_id`` null) are
    immutable through the API. PATCH/DELETE return 409.
  * ``personal`` is derived from ``source_citation`` — empty/null →
    ``personal=true``; non-empty → ``personal=false``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.linguistic.bundled_ciphers import (
    BUNDLED_CIPHERS,
    bundled_by_slug,
)
from theourgia.models.ciphers import Cipher, CipherLanguage

__all__ = ["router"]

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────


class BundledCipherRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str
    name: str
    language: str
    citation: str
    mapping: dict[str, int]


class CipherRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str | None
    name: str
    language: str
    mapping: dict[str, int]
    notes: str | None
    source_citation: str | None
    personal: bool
    bundled_slug: str | None
    created_at: datetime
    updated_at: datetime


class CipherCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=240)
    language: CipherLanguage
    mapping: dict[str, int] = Field(default_factory=dict)
    notes: str | None = None
    # When non-empty → personal=false; when null/empty → personal=true.
    source_citation: str | None = Field(default=None, max_length=480)


class CipherUpdate(BaseModel):
    """Bundled ciphers cannot be updated — PATCH returns 409.

    For per-vault rows, every field except ``personal`` and
    ``bundled_slug`` is patchable. The ``personal`` flag is recomputed
    from the patched ``source_citation`` on save.
    """

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)
    language: CipherLanguage | None = None
    mapping: dict[str, int] | None = None
    notes: str | None = None
    source_citation: str | None = Field(default=None, max_length=480)


# ── Helpers ──────────────────────────────────────────────────────────


def _to_cipher_read(row: Cipher) -> CipherRead:
    return CipherRead(
        id=str(row.id),
        owner_id=str(row.owner_id) if row.owner_id else None,
        name=row.name,
        language=row.language.value,
        mapping=dict(row.mapping or {}),
        notes=row.notes,
        source_citation=row.source_citation,
        personal=row.personal,
        bundled_slug=row.bundled_slug,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _is_bundled(row: Cipher) -> bool:
    """Bundled rows have a slug + no owner."""
    return row.bundled_slug is not None and row.owner_id is None


def _owner_check(row: Cipher, current_user_id: UUID | None) -> None:
    # Bundled rows are world-readable.
    if _is_bundled(row):
        return
    if (
        current_user_id is not None
        and row.owner_id is not None
        and row.owner_id != current_user_id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cipher not found.")


# ── Routes ──────────────────────────────────────────────────────────


@router.get(
    "/ciphers/bundled",
    response_model=list[BundledCipherRead],
    tags=["ciphers"],
)
async def list_bundled_ciphers() -> list[BundledCipherRead]:
    """Return the bundled PD corpus — reference material, no auth."""
    return [
        BundledCipherRead(
            slug=c.slug,
            name=c.name,
            language=c.language,
            citation=c.citation,
            mapping=dict(c.mapping),
        )
        for c in BUNDLED_CIPHERS
    ]


@router.get(
    "/ciphers", response_model=list[CipherRead], tags=["ciphers"],
)
async def list_ciphers(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    language: CipherLanguage | None = None,
    include_personal: bool = True,
    limit: int = 100,
) -> list[CipherRead]:
    """List ciphers visible to the caller — bundled + personal."""
    stmt = select(Cipher).where(Cipher.deleted_at.is_(None))
    if language is not None:
        stmt = stmt.where(Cipher.language == language)
    if current_user is not None:
        if include_personal:
            # Caller's personal + every bundled row.
            stmt = stmt.where(
                (Cipher.owner_id == current_user.id)
                | (Cipher.bundled_slug.is_not(None))
            )
        else:
            # Bundled only.
            stmt = stmt.where(Cipher.bundled_slug.is_not(None))
    else:
        # Unauthenticated: bundled only.
        stmt = stmt.where(Cipher.bundled_slug.is_not(None))
    stmt = stmt.order_by(Cipher.created_at.asc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_cipher_read(r) for r in rows]


@router.post(
    "/ciphers",
    response_model=CipherRead,
    status_code=status.HTTP_201_CREATED,
    tags=["ciphers"],
)
async def create_cipher(
    payload: CipherCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> CipherRead:
    """Create a per-vault cipher.

    Honesty rule: ``personal`` is derived from ``source_citation`` —
    empty/null → ``personal=true``; non-empty → ``personal=false``.
    """
    citation_text = (payload.source_citation or "").strip()
    personal = citation_text == ""
    row = Cipher(
        owner_id=current_user.id if current_user is not None else None,
        name=payload.name,
        language=payload.language,
        mapping=dict(payload.mapping),
        notes=payload.notes,
        source_citation=citation_text or None,
        personal=personal,
        bundled_slug=None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_cipher_read(row)


@router.get(
    "/ciphers/{cipher_id}",
    response_model=CipherRead,
    tags=["ciphers"],
)
async def get_cipher(
    cipher_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> CipherRead:
    row = await db.get(Cipher, cipher_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cipher not found.")
    _owner_check(row, current_user.id if current_user else None)
    return _to_cipher_read(row)


@router.patch(
    "/ciphers/{cipher_id}",
    response_model=CipherRead,
    tags=["ciphers"],
)
async def update_cipher(
    cipher_id: UUID,
    payload: CipherUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> CipherRead:
    row = await db.get(Cipher, cipher_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cipher not found.")
    _owner_check(row, current_user.id if current_user else None)
    if _is_bundled(row):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Bundled ciphers cannot be edited. Fork to a personal copy first.",
        )

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    # Recompute personal from source_citation if it was patched.
    if "source_citation" in data:
        citation_text = (row.source_citation or "").strip()
        row.source_citation = citation_text or None
        row.personal = citation_text == ""
    await db.commit()
    await db.refresh(row)
    return _to_cipher_read(row)


@router.delete(
    "/ciphers/{cipher_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["ciphers"],
)
async def delete_cipher(
    cipher_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    row = await db.get(Cipher, cipher_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cipher not found.")
    _owner_check(row, current_user.id if current_user else None)
    if _is_bundled(row):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Bundled ciphers cannot be deleted.",
        )
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
