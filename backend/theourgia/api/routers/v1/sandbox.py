"""Sandbox lifecycle endpoints — Phase 14 § 9 + § 11.

Endpoints:

::

  GET    /api/v1/sandbox                  list active sandboxes
  POST   /api/v1/sandbox/import           create a sandbox holding a bundle/plugin
  POST   /api/v1/sandbox/{id}/promote     promote into the main vault (irrevocable)
  DELETE /api/v1/sandbox/{id}             discard explicitly

Sandbox content (the actual bundle rows or plugin install once
promoted) lives in their own tables — this router only manages the
lifecycle container itself. The 30-day auto-expiry is enforced by
``expires_at``; periodic cleanup is the substrate's responsibility.

MBF bundles (ADR-0011): ``POST /sandbox/import`` also accepts a
multipart upload of an ``.mbf`` file for ``kind=bundle``. The raw
bytes go to the storage substrate and the parsed manifest is stashed
on the row — nothing is materialized, so sandbox isolation is
structural (nothing exists to leak into search or federation).
Promote reads the bytes back and runs the real import.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.api.routers.v1.bundles import (
    parse_bundle_bytes,
)
from theourgia.core.authz.audit import AuditLogger
from theourgia.core.bundles.container import (
    MAX_CONTAINER_BYTES,
    ParsedBundle,
    read_mbf,
)
from theourgia.core.bundles.importer import (
    STATUS_IMPORTED,
    import_parsed_bundle,
    make_installed_bundle,
)
from theourgia.core.bundles.signing import verify_container
from theourgia.core.config import get_settings
from theourgia.core.storage import StorageService, build_storage_service
from theourgia.models.audit import AuditEventKind, AuditOutcome
from theourgia.models.identity import Vault
from theourgia.models.sandbox import DEFAULT_LIFETIME, Sandbox, SandboxKind

__all__ = ["router", "set_bundle_storage"]


router = APIRouter()


# ── Storage seam ───────────────────────────────────────────────────
# Same injection pattern as media_uploads: production wiring builds
# from settings lazily; tests register a NullStorageBackend-backed
# service via set_bundle_storage().

_bundle_storage: StorageService | None = None


def set_bundle_storage(service: StorageService | None) -> None:
    """App start / tests use this to register the active storage."""
    global _bundle_storage
    _bundle_storage = service


def _get_bundle_storage() -> StorageService:
    global _bundle_storage
    if _bundle_storage is None:
        _bundle_storage = build_storage_service(get_settings())
    return _bundle_storage


async def _resolve_user_vault(db: AsyncSession, user_id: UUID) -> Vault:
    vault = (
        await db.execute(
            select(Vault).where(Vault.owner_id == user_id)
            .order_by(Vault.created_at.asc())
            .limit(1)
        )
    ).scalars().first()
    if vault is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You do not own any vault.",
        )
    return vault


async def _load_sandbox(
    db: AsyncSession, owner_id: UUID, sandbox_id: UUID,
) -> Sandbox:
    sandbox = (
        await db.execute(
            select(Sandbox).where(
                Sandbox.id == sandbox_id,
                Sandbox.owner_id == owner_id,
            )
        )
    ).scalars().first()
    if sandbox is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sandbox not found.",
        )
    if sandbox.promoted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Sandbox has been promoted to the main vault.",
        )
    if sandbox.discarded_at is not None:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Sandbox has been discarded.",
        )
    return sandbox


# ── Schemas ────────────────────────────────────────────────────────


class SandboxRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    kind: Literal["bundle", "plugin"]
    label: str
    source: str
    notes: str
    created_at: datetime
    expires_at: datetime


class SandboxListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sandboxes: list[SandboxRead]


class SandboxImportBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["bundle", "plugin"]
    label: str = Field(min_length=1, max_length=200)
    source: str = Field(min_length=1, max_length=500)
    notes: str = Field(default="", max_length=2000)


def _to_read(row: Sandbox) -> SandboxRead:
    return SandboxRead(
        id=str(row.id),
        kind=row.kind.value,  # type: ignore[arg-type]
        label=row.label,
        source=row.source,
        notes=row.notes,
        created_at=row.created_at,
        expires_at=row.expires_at,
    )


# ── Endpoints ──────────────────────────────────────────────────────


@router.get("/sandbox", response_model=SandboxListResponse)
async def list_sandboxes(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SandboxListResponse:
    rows = list(
        (
            await db.execute(
                select(Sandbox).where(
                    Sandbox.owner_id == user.id,
                    Sandbox.promoted_at.is_(None),
                    Sandbox.discarded_at.is_(None),
                )
                .order_by(Sandbox.created_at.desc())
            )
        ).scalars().all()
    )
    return SandboxListResponse(sandboxes=[_to_read(r) for r in rows])


async def _parse_import_request(
    request: Request,
) -> tuple[SandboxImportBody, bytes | None, ParsedBundle | None]:
    """Accept either the historical JSON body or a multipart form
    carrying an ``.mbf`` file (ADR-0011 sandbox path).

    Returns the validated body plus, for file uploads, the raw bundle
    bytes and the :class:`ParsedBundle`.
    """
    content_type = request.headers.get("content-type", "")
    if not content_type.startswith("multipart/form-data"):
        try:
            payload = await request.json()
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="request body must be JSON or multipart/form-data",
            ) from exc
        try:
            return SandboxImportBody.model_validate(payload), None, None
        except ValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(exc),
            ) from exc

    form = await request.form()
    upload = form.get("file")
    if upload is None or isinstance(upload, str):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="multipart import requires a 'file' part with the .mbf",
        )
    kind = str(form.get("kind") or "bundle")
    if kind != "bundle":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="file uploads are only supported for kind=bundle",
        )
    raw = await upload.read(MAX_CONTAINER_BYTES + 1)
    parsed = parse_bundle_bytes(raw)
    manifest = parsed.manifest
    label = str(form.get("label") or manifest.name)[:200]
    source = str(form.get("source") or f"{manifest.slug}@{manifest.version}")[
        :500
    ]
    notes = str(form.get("notes") or "")[:2000]
    try:
        body = SandboxImportBody(
            kind="bundle", label=label, source=source, notes=notes
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
    return body, raw, parsed


@router.post(
    "/sandbox/import",
    response_model=SandboxRead,
    status_code=status.HTTP_201_CREATED,
)
async def import_into_sandbox(
    request: Request,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SandboxRead:
    """Create a sandbox. JSON body for the historical bundle/plugin
    reference form; multipart with an ``.mbf`` ``file`` part for real
    bundle uploads. Uploaded bundles are stored without materializing
    any content — promote runs the real import."""
    body, bundle_bytes, parsed = await _parse_import_request(request)
    vault = await _resolve_user_vault(db, user.id)
    sandbox = Sandbox(
        owner_id=user.id,
        vault_id=vault.id,
        kind=SandboxKind(body.kind),
        label=body.label,
        source=body.source,
        notes=body.notes,
        expires_at=datetime.now() + DEFAULT_LIFETIME,
    )
    if bundle_bytes is not None and parsed is not None:
        key = f"vaults/{vault.id}/sandbox-bundles/{sandbox.id}.mbf"
        await _get_bundle_storage().put(
            key=key,
            content=bundle_bytes,
            content_type="application/zip",
            owner_id=user.id,
            db_session=db,
        )
        sandbox.bundle_manifest = parsed.manifest.model_dump(mode="json")
        sandbox.bundle_file_key = key
    db.add(sandbox)
    await db.flush()
    await AuditLogger(db).log(
        kind=AuditEventKind.PLUGIN,
        action="sandbox.import",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        vault_id=vault.id,
        detail={
            "sandbox_id": str(sandbox.id),
            "kind": body.kind,
            "source": body.source,
            "bundle_file_key": sandbox.bundle_file_key,
        },
    )
    await db.commit()
    await db.refresh(sandbox)
    return _to_read(sandbox)


@router.post(
    "/sandbox/{sandbox_id}/promote",
    response_model=SandboxRead,
)
async def promote_sandbox(
    sandbox_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SandboxRead:
    """Promote a sandbox to the main vault. Irrevocable — once
    promoted, the row is marked ``promoted_at`` and no longer appears
    in the sandbox browser; any references created in the main vault
    against the bundle's data persist after the sandbox is gone.

    Bundle sandboxes holding an uploaded ``.mbf`` run the real import
    here (all items) and record an ``installed_bundle`` row — the
    sandbox held only bytes + manifest, never materialized content."""
    sandbox = await _load_sandbox(db, user.id, sandbox_id)

    detail: dict[str, object] = {
        "sandbox_id": str(sandbox.id),
        "kind": sandbox.kind.value,
        "source": sandbox.source,
    }
    if sandbox.kind == SandboxKind.BUNDLE and sandbox.bundle_file_key:
        try:
            raw = await _get_bundle_storage().get(sandbox.bundle_file_key)
            parsed = read_mbf(raw)
        except Exception as exc:  # abort the promote, keep the sandbox intact
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "The stored bundle could not be read back — promote "
                    "aborted; the sandbox remains intact."
                ),
            ) from exc
        verification = verify_container(parsed)
        results = await import_parsed_bundle(db, parsed, owner_id=user.id)
        imported = sum(1 for r in results if r.status == STATUS_IMPORTED)
        installed = make_installed_bundle(
            parsed.manifest,
            owner_id=user.id,
            signature_verdict=verification.verdict,
            imported_item_count=imported,
            source_file_key=sandbox.bundle_file_key,
        )
        db.add(installed)
        detail["bundle"] = (
            f"{parsed.manifest.slug}@{parsed.manifest.version}"
        )
        detail["imported"] = imported
        detail["skipped"] = len(results) - imported

    sandbox.promoted_at = datetime.now()
    await AuditLogger(db).log(
        kind=AuditEventKind.PLUGIN,
        action="sandbox.promote",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        vault_id=sandbox.vault_id,
        detail=detail,
    )
    await db.commit()
    await db.refresh(sandbox)
    return _to_read(sandbox)


@router.delete(
    "/sandbox/{sandbox_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def discard_sandbox(
    sandbox_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    sandbox = await _load_sandbox(db, user.id, sandbox_id)
    sandbox.discarded_at = datetime.now()
    await AuditLogger(db).log(
        kind=AuditEventKind.PLUGIN,
        action="sandbox.discard",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        vault_id=sandbox.vault_id,
        detail={
            "sandbox_id": str(sandbox.id),
            "kind": sandbox.kind.value,
        },
    )
    await db.commit()
