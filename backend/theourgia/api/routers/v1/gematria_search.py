"""Gematria cross-journal search (B111).

Per ``plan/08-batches-backend.md`` § B111.

``POST /api/v1/gematria/search`` — match-mode-driven scan of the
caller's gematria_index. Returns plaintext phrase matches + a
sealed-match count (count-only) + cross-cipher resonances.

Honesty rules (H06):
  * Unauthenticated → 401.
  * Owner scope enforced at the SQL layer.
  * Sealed entries' phrases NEVER appear in results; only the count
    is surfaced (sealed_match_count).
  * Personal-cipher results carry ``cipher_personal=true`` so the
    frontend can flag them.
"""

from __future__ import annotations

import csv
import io
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.models.ciphers import Cipher
from theourgia.models.entries import EncryptionMode, Entry
from theourgia.models.gematria_index import GematriaIndex

__all__ = ["router"]

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────


MatchMode = Literal["exact", "near", "reduced"]


class GematriaSearchPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: int = Field(ge=0)
    cipher_ids: list[UUID] = Field(default_factory=list)
    match_mode: MatchMode = "exact"
    # delta is only honoured when match_mode == "near"; ignored otherwise.
    delta: int = Field(default=0, ge=0, le=100)
    include_personal_ciphers: bool = True
    limit: int = Field(default=25, ge=1, le=500)
    offset: int = Field(default=0, ge=0)


class GematriaSearchResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entry_id: str
    entry_title: str | None
    entry_date: str | None
    phrase: str | None  # NULL when is_sealed=true
    cipher_id: str
    cipher_name: str
    cipher_personal: bool
    value: int
    digit_sum: int
    is_sealed: bool


class GematriaResonance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    phrase: str
    value: int
    ciphers: list[str]


class GematriaSearchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_matches: int
    entries_with_matches: int
    results: list[GematriaSearchResult]
    sealed_match_count: int
    resonances: list[GematriaResonance]


# ── Helpers ──────────────────────────────────────────────────────────


def _match_predicate(
    payload: GematriaSearchPayload,
):
    """Return a SQLAlchemy predicate enforcing the chosen match mode."""
    if payload.match_mode == "exact":
        return GematriaIndex.value == payload.value
    if payload.match_mode == "near":
        delta = payload.delta
        return and_(
            GematriaIndex.value >= payload.value - delta,
            GematriaIndex.value <= payload.value + delta,
        )
    # reduced: digit_sum equality
    from theourgia.core.linguistic.indexer import reduce_to_digit

    return GematriaIndex.digit_sum == reduce_to_digit(payload.value)


# ── Routes ──────────────────────────────────────────────────────────


@router.post(
    "/gematria/search",
    response_model=GematriaSearchResponse,
    tags=["gematria"],
)
async def search_gematria(
    payload: GematriaSearchPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> GematriaSearchResponse:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    owner_id = current_user.id

    stmt = (
        select(GematriaIndex, Cipher, Entry)
        .join(Cipher, Cipher.id == GematriaIndex.cipher_id)
        .join(Entry, Entry.id == GematriaIndex.entry_id)
        .where(GematriaIndex.owner_id == owner_id)
        .where(_match_predicate(payload))
        .where(Entry.deleted_at.is_(None))
    )
    if payload.cipher_ids:
        stmt = stmt.where(Cipher.id.in_(payload.cipher_ids))
    if not payload.include_personal_ciphers:
        stmt = stmt.where(Cipher.personal.is_(False))

    # We never index sealed entries (the indexer skips them) but we
    # double-check at the join layer so even if a stale row exists,
    # we never leak its phrase.
    stmt_unsealed = stmt.where(
        or_(
            Entry.encryption_mode != EncryptionMode.SEALED,
            Entry.encryption_mode.is_(None),
        )
    )

    total = (
        await db.execute(
            select(func.count()).select_from(stmt_unsealed.subquery())
        )
    ).scalar_one()

    distinct_entries = (
        await db.execute(
            select(func.count(func.distinct(GematriaIndex.entry_id)))
            .select_from(stmt_unsealed.subquery())
        )
    ).scalar_one()

    stmt_paged = stmt_unsealed.order_by(
        GematriaIndex.value.asc(),
        GematriaIndex.created_at.asc(),
    ).offset(payload.offset).limit(payload.limit)

    rows = (await db.execute(stmt_paged)).all()

    results: list[GematriaSearchResult] = []
    resonance_map: dict[tuple[str, int], set[str]] = {}
    for idx_row, cipher_row, entry_row in rows:
        results.append(
            GematriaSearchResult(
                entry_id=str(entry_row.id),
                entry_title=getattr(entry_row, "title", None),
                entry_date=(
                    entry_row.captured_at.isoformat()
                    if getattr(entry_row, "captured_at", None)
                    else None
                ),
                phrase=idx_row.phrase,
                cipher_id=str(cipher_row.id),
                cipher_name=cipher_row.name,
                cipher_personal=cipher_row.personal,
                value=idx_row.value,
                digit_sum=idx_row.digit_sum,
                is_sealed=False,
            )
        )
        key = (idx_row.phrase, idx_row.value)
        resonance_map.setdefault(key, set()).add(cipher_row.name)

    # Sealed-match indicator: count of caller's sealed entries.
    # This is a STRUCTURAL hint ("you have N sealed entries"), not a
    # match count. Never queries gematria_index for sealed rows.
    sealed_count = (
        await db.execute(
            select(func.count(Entry.id))
            .where(Entry.owner_id == owner_id)
            .where(Entry.encryption_mode == EncryptionMode.SEALED)
            .where(Entry.deleted_at.is_(None))
        )
    ).scalar_one()

    resonances = [
        GematriaResonance(phrase=phrase, value=value, ciphers=sorted(ciphers))
        for (phrase, value), ciphers in resonance_map.items()
        if len(ciphers) >= 2
    ]
    resonances.sort(key=lambda r: (r.value, r.phrase))

    return GematriaSearchResponse(
        total_matches=int(total),
        entries_with_matches=int(distinct_entries),
        results=results,
        sealed_match_count=int(sealed_count),
        resonances=resonances,
    )


@router.post(
    "/gematria/search/csv",
    tags=["gematria"],
)
async def search_gematria_csv(
    payload: GematriaSearchPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> StreamingResponse:
    """CSV export of the same search results."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    # Reuse the JSON search path; we just re-render its rows as CSV.
    response = await search_gematria(payload, db, current_user)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "entry_id", "entry_title", "entry_date", "phrase",
        "cipher_id", "cipher_name", "cipher_personal",
        "value", "digit_sum", "is_sealed",
    ])
    for r in response.results:
        writer.writerow([
            r.entry_id, r.entry_title or "", r.entry_date or "",
            r.phrase or "",
            r.cipher_id, r.cipher_name, "true" if r.cipher_personal else "false",
            r.value, r.digit_sum,
            "true" if r.is_sealed else "false",
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": (
                f'attachment; filename="gematria-search-{payload.value}.csv"'
            ),
        },
    )
