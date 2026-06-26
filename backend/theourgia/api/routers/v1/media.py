"""Media asset HTTP endpoints (B132).

Per ``plan/11-batches-backend.md`` § B132.

``GET    /api/v1/media``                            — list (sealed = count-only)
``POST   /api/v1/media``                            — create (metadata only; R2 wiring in B133)
``GET    /api/v1/media/{id}``                       — read
``PATCH  /api/v1/media/{id}``                       — update mutable fields
``DELETE /api/v1/media/{id}``                       — soft delete

``GET    /api/v1/media/sealed-count``               — sealed-only count
``POST   /api/v1/media/{id}/links``                 — create polymorphic link
``DELETE /api/v1/media/{id}/links/{link_id}``       — remove link

Honesty rules:
  * Sealed media is count-only in the list endpoint. Default response
    carries a separate ``sealed_count`` + ``MediaAssetCard[]`` of
    UNSEALED assets only.
  * Link counts are exact and recomputed deterministically.
  * NO play-counts anywhere (the anti-gamification rule).
  * EXIF metadata defaults to ``{}``; only RETAINED stores fields.
  * Immutable fields on PATCH: r2_object_key, size_bytes, mime_type,
    owner_id, kind. The size is needed for storage-quota math even
    on sealed assets; everything else stays put.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.models.media import ExifPolicy, MediaAsset, MediaKind, MediaLink

__all__ = ["router"]

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────


class MediaAssetCard(BaseModel):
    """The card-shape returned in the list endpoint.

    For sealed assets, the H07 rule is COUNT-ONLY in the list. We
    never emit a sealed card here — the caller sees only the
    ``sealed_count`` aggregate."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    kind: str
    filename: str
    mime_type: str
    size_bytes: int
    width_px: int | None
    height_px: int | None
    duration_seconds: int | None
    alt_text: str | None
    caption: str | None
    tags: list
    exif_policy: str | None
    link_count: int
    created_at: datetime


class MediaListResponse(BaseModel):
    """The list endpoint always carries the sealed_count separately.

    Sealed assets are NEVER enumerated as cards; the count is the
    only visible signal."""

    model_config = ConfigDict(extra="forbid")

    items: list[MediaAssetCard]
    sealed_count: int


class MediaAssetRead(BaseModel):
    """Single-asset read response.

    For sealed assets we omit alt_text / caption / exif_metadata /
    dimensions / tags — the body is encrypted client-side. We still
    return the R2 object key (the client decrypts after fetching),
    the kind, the size, and the ``sealed: true`` indicator."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str
    kind: str
    filename: str | None
    r2_object_key: str
    mime_type: str
    size_bytes: int
    width_px: int | None
    height_px: int | None
    duration_seconds: int | None
    alt_text: str | None
    caption: str | None
    tags: list
    sealed: bool
    exif_policy: str | None
    exif_metadata: dict
    link_count: int
    created_at: datetime
    updated_at: datetime


class MediaCreate(BaseModel):
    """Direct metadata create. The R2 upload pipeline (B133) will
    create the row through a higher-level flow; this endpoint is the
    primitive."""

    model_config = ConfigDict(extra="forbid")

    kind: MediaKind
    filename: str = Field(min_length=1, max_length=240)
    r2_object_key: str = Field(min_length=1, max_length=480)
    mime_type: str = Field(min_length=1, max_length=120)
    size_bytes: int = Field(ge=0)
    width_px: int | None = Field(default=None, ge=0)
    height_px: int | None = Field(default=None, ge=0)
    duration_seconds: int | None = Field(default=None, ge=0)
    alt_text: str | None = None
    caption: str | None = None
    tags: list = Field(default_factory=list)
    sealed: bool = False
    exif_policy: ExifPolicy | None = None
    exif_metadata: dict = Field(default_factory=dict)


class MediaUpdate(BaseModel):
    """PATCH fields. r2_object_key / size_bytes / mime_type / kind
    / owner_id are intentionally absent — those are immutable per
    the plan."""

    model_config = ConfigDict(extra="forbid")

    filename: str | None = Field(default=None, min_length=1, max_length=240)
    alt_text: str | None = None
    caption: str | None = None
    tags: list | None = None
    exif_policy: ExifPolicy | None = None
    exif_metadata: dict | None = None
    sealed: bool | None = None


class MediaLinkRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    media_id: str
    ref_kind: str
    ref_id: str
    created_at: datetime


class MediaLinkCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ref_kind: str = Field(min_length=1, max_length=32)
    ref_id: UUID


class SealedCountResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sealed_count: int


# ── Helpers ──────────────────────────────────────────────────────


def _to_card(row: MediaAsset) -> MediaAssetCard:
    return MediaAssetCard(
        id=str(row.id),
        kind=row.kind.value,
        filename=row.filename,
        mime_type=row.mime_type,
        size_bytes=row.size_bytes,
        width_px=row.width_px,
        height_px=row.height_px,
        duration_seconds=row.duration_seconds,
        alt_text=row.alt_text,
        caption=row.caption,
        tags=list(row.tags or []),
        exif_policy=row.exif_policy.value if row.exif_policy else None,
        link_count=row.link_count,
        created_at=row.created_at,
    )


def _to_read(row: MediaAsset) -> MediaAssetRead:
    """Read response respects the sealed honesty rule.

    Sealed: filename / alt_text / caption / dimensions / duration /
    tags / exif_metadata are nulled. The bytes still resolve via
    r2_object_key but require the vault passphrase to decrypt."""
    if row.sealed:
        return MediaAssetRead(
            id=str(row.id),
            owner_id=str(row.owner_id),
            kind=row.kind.value,
            filename=None,
            r2_object_key=row.r2_object_key,
            mime_type=row.mime_type,
            size_bytes=row.size_bytes,
            width_px=None,
            height_px=None,
            duration_seconds=None,
            alt_text=None,
            caption=None,
            tags=[],
            sealed=True,
            exif_policy=None,
            exif_metadata={},
            link_count=row.link_count,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
    return MediaAssetRead(
        id=str(row.id),
        owner_id=str(row.owner_id),
        kind=row.kind.value,
        filename=row.filename,
        r2_object_key=row.r2_object_key,
        mime_type=row.mime_type,
        size_bytes=row.size_bytes,
        width_px=row.width_px,
        height_px=row.height_px,
        duration_seconds=row.duration_seconds,
        alt_text=row.alt_text,
        caption=row.caption,
        tags=list(row.tags or []),
        sealed=False,
        exif_policy=row.exif_policy.value if row.exif_policy else None,
        exif_metadata=dict(row.exif_metadata or {}),
        link_count=row.link_count,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _recompute_link_count(
    db: AsyncSession, media_id: UUID,
) -> int:
    """Deterministic recompute. The DoD test asserts no drift after
    add/remove cycles."""
    count = (
        await db.execute(
            select(func.count())
            .select_from(MediaLink)
            .where(MediaLink.media_id == media_id)
        )
    ).scalar_one()
    return int(count or 0)


# ── List + sealed-count ──────────────────────────────────────────


@router.get(
    "/media",
    response_model=MediaListResponse,
    tags=["media"],
)
async def list_media(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    kind: MediaKind | None = None,
    limit: int = 100,
    offset: int = 0,
) -> MediaListResponse:
    """List the caller's media. Sealed assets surface as a count
    only (per the H07 Media Library rule)."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")

    base = (
        select(MediaAsset)
        .where(MediaAsset.owner_id == current_user.id)
        .where(MediaAsset.deleted_at.is_(None))
    )
    if kind is not None:
        base = base.where(MediaAsset.kind == kind)

    # Sealed count is independent of pagination so the caller always
    # sees the true total.
    sealed_total = (
        await db.execute(
            select(func.count())
            .select_from(MediaAsset)
            .where(MediaAsset.owner_id == current_user.id)
            .where(MediaAsset.deleted_at.is_(None))
            .where(MediaAsset.sealed.is_(True))
            .where(*((MediaAsset.kind == kind,) if kind is not None else ()))
        )
    ).scalar_one()

    unsealed_stmt = (
        base.where(MediaAsset.sealed.is_(False))
        .order_by(MediaAsset.created_at.desc())
        .offset(max(0, offset))
        .limit(min(max(1, limit), 500))
    )
    rows = (await db.execute(unsealed_stmt)).scalars().all()

    return MediaListResponse(
        items=[_to_card(r) for r in rows],
        sealed_count=int(sealed_total or 0),
    )


@router.get(
    "/media/sealed-count",
    response_model=SealedCountResponse,
    tags=["media"],
)
async def sealed_count(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> SealedCountResponse:
    """Standalone sealed-asset count. The H07 Media Library card
    pulls this on its own without paging the list."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    n = (
        await db.execute(
            select(func.count())
            .select_from(MediaAsset)
            .where(MediaAsset.owner_id == current_user.id)
            .where(MediaAsset.deleted_at.is_(None))
            .where(MediaAsset.sealed.is_(True))
        )
    ).scalar_one()
    return SealedCountResponse(sealed_count=int(n or 0))


# ── CRUD ─────────────────────────────────────────────────────────


@router.post(
    "/media",
    response_model=MediaAssetRead,
    status_code=status.HTTP_201_CREATED,
    tags=["media"],
)
async def create_media(
    payload: MediaCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> MediaAssetRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")

    # If the policy is STRIPPED, the metadata must be empty. The
    # B133 upload pipeline strips before the row is written; this
    # endpoint just refuses inconsistent input.
    if payload.exif_policy == ExifPolicy.STRIPPED and payload.exif_metadata:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "exif_metadata must be empty when exif_policy is STRIPPED.",
        )

    row = MediaAsset(
        owner_id=current_user.id,
        kind=payload.kind,
        filename=payload.filename,
        r2_object_key=payload.r2_object_key,
        mime_type=payload.mime_type,
        size_bytes=payload.size_bytes,
        width_px=payload.width_px,
        height_px=payload.height_px,
        duration_seconds=payload.duration_seconds,
        alt_text=payload.alt_text,
        caption=payload.caption,
        tags=list(payload.tags),
        sealed=payload.sealed,
        exif_policy=payload.exif_policy,
        exif_metadata=dict(payload.exif_metadata),
        link_count=0,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/media/{media_id}",
    response_model=MediaAssetRead,
    tags=["media"],
)
async def read_media(
    media_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> MediaAssetRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(MediaAsset, media_id)
    if (
        row is None
        or row.owner_id != current_user.id
        or row.deleted_at is not None
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Media not found.")
    return _to_read(row)


@router.patch(
    "/media/{media_id}",
    response_model=MediaAssetRead,
    tags=["media"],
)
async def update_media(
    media_id: UUID,
    payload: MediaUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> MediaAssetRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(MediaAsset, media_id)
    if (
        row is None
        or row.owner_id != current_user.id
        or row.deleted_at is not None
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Media not found.")

    data = payload.model_dump(exclude_unset=True)
    if "filename" in data:
        row.filename = data["filename"]
    if "alt_text" in data:
        row.alt_text = data["alt_text"]
    if "caption" in data:
        row.caption = data["caption"]
    if "tags" in data:
        row.tags = list(data["tags"] or [])
    if "exif_policy" in data:
        row.exif_policy = data["exif_policy"]
    if "exif_metadata" in data:
        new_meta = dict(data["exif_metadata"] or {})
        target_policy = row.exif_policy
        if target_policy == ExifPolicy.STRIPPED and new_meta:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "exif_metadata must be empty when exif_policy is STRIPPED.",
            )
        row.exif_metadata = new_meta
    if "sealed" in data:
        row.sealed = bool(data["sealed"])

    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/media/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["media"],
)
async def delete_media(
    media_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    """Soft delete. The R2 lifecycle policy (B133) reclaims bytes
    after 30 days; until then the row is restorable."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(MediaAsset, media_id)
    if (
        row is None
        or row.owner_id != current_user.id
        or row.deleted_at is not None
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Media not found.")
    row.deleted_at = datetime.now(tz=timezone.utc)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Links ────────────────────────────────────────────────────────


@router.post(
    "/media/{media_id}/links",
    response_model=MediaLinkRead,
    status_code=status.HTTP_201_CREATED,
    tags=["media"],
)
async def create_link(
    media_id: UUID,
    payload: MediaLinkCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> MediaLinkRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(MediaAsset, media_id)
    if (
        row is None
        or row.owner_id != current_user.id
        or row.deleted_at is not None
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Media not found.")

    link = MediaLink(
        media_id=media_id,
        ref_kind=payload.ref_kind,
        ref_id=payload.ref_id,
    )
    db.add(link)
    try:
        await db.flush()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Link already exists.",
        ) from exc

    row.link_count = await _recompute_link_count(db, media_id)
    await db.commit()
    await db.refresh(link)
    return MediaLinkRead(
        id=str(link.id),
        media_id=str(link.media_id),
        ref_kind=link.ref_kind,
        ref_id=str(link.ref_id),
        created_at=link.created_at,
    )


@router.delete(
    "/media/{media_id}/links/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["media"],
)
async def delete_link(
    media_id: UUID,
    link_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    asset = await db.get(MediaAsset, media_id)
    if (
        asset is None
        or asset.owner_id != current_user.id
        or asset.deleted_at is not None
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Media not found.")
    link = await db.get(MediaLink, link_id)
    if link is None or link.media_id != media_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found.")
    await db.delete(link)
    await db.flush()
    asset.link_count = await _recompute_link_count(db, media_id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
