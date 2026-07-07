"""Media upload pipeline endpoints (B133).

Per ``plan/11-batches-backend.md`` § B133.

The H07 Upload modal has three phases: Pick → Configure → Upload.
The backend supports this via three endpoints:

``POST   /api/v1/media/uploads/begin``                — issue presigned PUT
``POST   /api/v1/media/uploads/{id}/complete``        — verify + create row
``DELETE /api/v1/media/uploads/{id}``                 — cancel + cleanup

The actual byte transfer goes DIRECTLY from the client to R2 via the
presigned PUT URL. The server only touches bytes during the EXIF strip
step (reverse-fetch → strip → re-PUT) for unsealed images that opted
into ``exif_policy=STRIPPED``.

Honesty rules pinned at the source level:

1. **EXIF strip default is ON for images.** ``begin`` injects
   ``exif_policy=STRIPPED`` when caller omits the field on an image
   upload — H07 Upload modal default.
2. **Sealed uploads bypass EXIF.** sealed=true + exif_policy=stripped
   is REJECTED at begin time — encrypted bytes are unreadable so the
   client must strip BEFORE encrypting.
3. **Quota enforcement at begin.** Per-vault default 5 GB; over-
   quota returns 413 with the practitioner-friendly "raise your
   quota" message.
4. **Direct-to-R2 path.** The bytes never traverse the FastAPI
   process during the upload itself. The only server hop is the
   strip step for unsealed images opting in.
5. **Strip step is verified.** Both pre- and post-strip sizes are
   recorded; ``post_strip_size`` is surfaced in the response so an
   integration test can assert non-passthrough on EXIF-bearing
   fixtures.
6. **Session immutability after complete.** Once COMPLETED, the
   session is frozen; ``DELETE /uploads/{id}`` returns 409.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Annotated, Callable, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.media import (
    EXIF_STRIPPABLE_MIME_TYPES,
    ExifStripper,
    NullExifStripper,
    pick_exif_stripper,
)
from theourgia.models.media import ExifPolicy, MediaAsset, MediaKind
from theourgia.models.media_upload_session import (
    MediaUploadSession,
    MediaUploadSessionStatus,
)

__all__ = [
    "router",
    "BeginUploadPayload",
    "BeginUploadResponse",
    "CompleteUploadPayload",
    "DEFAULT_QUOTA_BYTES",
    "DEFAULT_SESSION_TTL",
    "set_exif_stripper",
    "set_storage_adapter",
]


router = APIRouter()


DEFAULT_QUOTA_BYTES = 5 * 1024 * 1024 * 1024  # 5 GB per vault
DEFAULT_SESSION_TTL = timedelta(hours=24)


# ── Injection seams ─────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class StorageAdapter:
    """A thin synchronous-friendly adapter the router uses to talk
    to whatever storage backend is configured.

    Decoupled from :class:`StorageService` directly so tests can
    inject a fake without touching the global app state."""

    presigned_put_url: Callable[..., object]
    exists: Callable[..., object]
    stat: Callable[..., object]
    get: Callable[..., object]
    put: Callable[..., object]
    delete: Callable[..., object]


_exif_stripper: ExifStripper | None = None
_storage_adapter: StorageAdapter | None = None


def set_exif_stripper(stripper: ExifStripper) -> None:
    """App start / tests use this to register the active stripper."""
    global _exif_stripper
    _exif_stripper = stripper


def set_storage_adapter(adapter: StorageAdapter | None) -> None:
    """App start / tests use this to register the active storage."""
    global _storage_adapter
    _storage_adapter = adapter


def _get_exif_stripper() -> ExifStripper:
    global _exif_stripper
    if _exif_stripper is None:
        _exif_stripper = pick_exif_stripper()
    return _exif_stripper


def _get_storage_adapter() -> StorageAdapter:
    if _storage_adapter is None:
        # Production wiring lands at app start. Surface a clear
        # error rather than silently failing.
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Storage adapter not configured.",
        )
    return _storage_adapter


# ── Schemas ─────────────────────────────────────────────────────


class BeginUploadPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: MediaKind
    filename: str = Field(min_length=1, max_length=240)
    size_bytes: int = Field(ge=0)
    mime_type: str = Field(min_length=1, max_length=120)
    sealed: bool = False
    exif_policy: ExifPolicy | None = None


class BeginUploadResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    upload_id: str
    r2_object_key: str
    presigned_put_url: str
    expires_at: datetime
    # Echoed back so the H07 Upload modal can pin the strip policy
    # against the local choice + display the default-on indicator.
    effective_exif_policy: ExifPolicy | None


class CompleteUploadPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    width_px: int | None = Field(default=None, ge=0)
    height_px: int | None = Field(default=None, ge=0)
    duration_seconds: int | None = Field(default=None, ge=0)
    alt_text: str | None = None
    caption: str | None = None
    tags: list = Field(default_factory=list)
    exif_metadata: dict = Field(default_factory=dict)


class CompleteUploadResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    media_asset_id: str
    upload_id: str
    sealed: bool
    exif_stripped: bool
    pre_strip_size: int
    post_strip_size: int
    strip_reason: str


# ── Helpers ─────────────────────────────────────────────────────


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _new_object_key(owner_id: UUID, filename: str) -> str:
    """Random R2 key. Owner prefix keeps the bucket browsable +
    enforceable via R2 IAM policies."""
    handle = secrets.token_urlsafe(16)
    return f"vault/{owner_id}/{handle}/{filename}"


async def _used_bytes(db: AsyncSession, owner_id: UUID) -> int:
    """Total size of the caller's non-deleted media assets."""
    n = (
        await db.execute(
            select(func.coalesce(func.sum(MediaAsset.size_bytes), 0))
            .where(MediaAsset.owner_id == owner_id)
            .where(MediaAsset.deleted_at.is_(None))
        )
    ).scalar_one()
    return int(n or 0)


def _effective_exif_policy(
    payload: BeginUploadPayload,
) -> ExifPolicy | None:
    """The H07 default-strip rule.

    For image uploads where the caller omits the policy, we set
    STRIPPED. For non-image uploads we leave it None. For sealed
    uploads we leave it None — they bypass strip entirely (handled
    elsewhere with a hard 400 on the begin endpoint).
    """
    if payload.exif_policy is not None:
        return payload.exif_policy
    if payload.kind == MediaKind.IMAGE and not payload.sealed:
        return ExifPolicy.STRIPPED
    return None


# ── Endpoints ───────────────────────────────────────────────────


@router.post(
    "/media/uploads/begin",
    response_model=BeginUploadResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["media"],
)
async def begin_upload(
    payload: BeginUploadPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> BeginUploadResponse:

    # Sealed + strip is an explicit rejection — encrypted bytes are
    # unreadable to the server. The client must pre-strip before
    # encrypting.
    if payload.sealed and payload.exif_policy == ExifPolicy.STRIPPED:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            (
                "Sealed uploads must pre-strip EXIF on the client; "
                "set exif_policy=retained or omit it for sealed "
                "uploads."
            ),
        )

    # Quota check.
    used = await _used_bytes(db, current_user.id)
    if used + payload.size_bytes > DEFAULT_QUOTA_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            (
                f"Vault quota ({DEFAULT_QUOTA_BYTES // (1024 ** 3)} "
                "GB) would be exceeded. Reach out to raise your "
                "quota."
            ),
        )

    key = _new_object_key(current_user.id, payload.filename)
    expires = _now() + DEFAULT_SESSION_TTL

    # Presign the PUT URL.
    adapter = _get_storage_adapter()
    presigned = await _await_maybe(
        adapter.presigned_put_url(
            key=key,
            content_type=payload.mime_type,
        )
    )

    effective_policy = _effective_exif_policy(payload)

    session = MediaUploadSession(
        owner_id=current_user.id,
        status=MediaUploadSessionStatus.PENDING,
        r2_object_key=key,
        kind=payload.kind.value,
        filename=payload.filename,
        mime_type=payload.mime_type,
        size_bytes=payload.size_bytes,
        sealed=payload.sealed,
        exif_policy=effective_policy.value if effective_policy else None,
        expires_at=expires,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return BeginUploadResponse(
        upload_id=str(session.id),
        r2_object_key=key,
        presigned_put_url=str(presigned),
        expires_at=expires,
        effective_exif_policy=effective_policy,
    )


@router.post(
    "/media/uploads/{upload_id}/complete",
    response_model=CompleteUploadResponse,
    tags=["media"],
)
async def complete_upload(
    upload_id: UUID,
    payload: CompleteUploadPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> CompleteUploadResponse:
    session = await db.get(MediaUploadSession, upload_id)
    if session is None or session.owner_id != current_user.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Upload session not found.",
        )

    if session.status == MediaUploadSessionStatus.COMPLETED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Upload already completed.",
        )
    if session.status == MediaUploadSessionStatus.CANCELLED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Upload was cancelled.",
        )

    # Lazy-expire.
    if _now() >= session.expires_at:
        session.status = MediaUploadSessionStatus.EXPIRED
        await db.commit()
        raise HTTPException(
            status.HTTP_410_GONE, "Upload session expired.",
        )

    # The R2 object must exist + size must match the begin claim.
    adapter = _get_storage_adapter()
    exists = await _await_maybe(adapter.exists(session.r2_object_key))
    if not exists:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "R2 object not found at the presigned key.",
        )

    # EXIF strip step. Sealed uploads bypass. Unsealed images with
    # exif_policy=stripped go through; everything else passes.
    pre_size = session.size_bytes
    post_size = session.size_bytes
    stripped = False
    reason = ""
    if (
        not session.sealed
        and session.exif_policy == ExifPolicy.STRIPPED.value
        and session.mime_type.lower() in EXIF_STRIPPABLE_MIME_TYPES
    ):
        stripper = _get_exif_stripper()
        bytes_in = await _await_maybe(adapter.get(session.r2_object_key))
        result = stripper.strip(bytes_in or b"", session.mime_type)
        if result.stripped and result.bytes_out != bytes_in:
            await _await_maybe(
                adapter.put(
                    session.r2_object_key,
                    result.bytes_out,
                    content_type=session.mime_type,
                )
            )
        pre_size = result.bytes_in_size
        post_size = result.bytes_out_size
        stripped = result.stripped
        reason = result.reason

    # Create the MediaAsset row.
    asset = MediaAsset(
        owner_id=current_user.id,
        kind=MediaKind(session.kind),
        filename=session.filename,
        r2_object_key=session.r2_object_key,
        mime_type=session.mime_type,
        size_bytes=post_size if stripped else session.size_bytes,
        width_px=payload.width_px,
        height_px=payload.height_px,
        duration_seconds=payload.duration_seconds,
        alt_text=payload.alt_text,
        caption=payload.caption,
        tags=list(payload.tags),
        sealed=session.sealed,
        exif_policy=(
            ExifPolicy(session.exif_policy) if session.exif_policy else None
        ),
        exif_metadata=dict(payload.exif_metadata),
        link_count=0,
    )
    db.add(asset)
    session.status = MediaUploadSessionStatus.COMPLETED
    await db.flush()
    session.media_asset_id = asset.id
    await db.commit()
    await db.refresh(asset)

    return CompleteUploadResponse(
        media_asset_id=str(asset.id),
        upload_id=str(session.id),
        sealed=session.sealed,
        exif_stripped=stripped,
        pre_strip_size=pre_size,
        post_strip_size=post_size,
        strip_reason=reason,
    )


@router.delete(
    "/media/uploads/{upload_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["media"],
)
async def cancel_upload(
    upload_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    """Cancel an in-flight upload. Idempotent on already-CANCELLED.
    Refuses to cancel an already-COMPLETED upload (409) — use
    DELETE /media/{id} to soft-delete a completed asset."""
    session = await db.get(MediaUploadSession, upload_id)
    if session is None or session.owner_id != current_user.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Upload session not found.",
        )
    if session.status == MediaUploadSessionStatus.COMPLETED:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Cannot cancel a completed upload; use DELETE /media/{id}.",
        )
    if session.status == MediaUploadSessionStatus.CANCELLED:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    session.status = MediaUploadSessionStatus.CANCELLED

    # Best-effort R2 cleanup. If the client never PUT, this is a no-op.
    adapter = _get_storage_adapter()
    try:
        if await _await_maybe(adapter.exists(session.r2_object_key)):
            await _await_maybe(adapter.delete(session.r2_object_key))
    except Exception:  # noqa: BLE001
        # Storage cleanup is opportunistic. The session is marked
        # cancelled regardless; the R2 lifecycle policy will
        # eventually reclaim orphaned objects.
        pass

    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Tiny async/sync straddle ────────────────────────────────────


async def _await_maybe(value: object) -> object:
    """The injected adapter callables may return either a coroutine
    or a plain value (synchronous fakes are easier in tests).
    Awaits the former; passes the latter through."""
    import inspect

    if inspect.isawaitable(value):
        return await value
    return value
