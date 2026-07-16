"""Magickal Bundle Format endpoints — ADR-0011 import semantics.

Endpoints:

::

  POST /api/v1/bundles/preview    upload + validate + verify (no writes)
  POST /api/v1/bundles/import     commit a user-selected subset of items
  GET  /api/v1/bundles/installed  the vault's install records
  GET  /api/v1/bundles/export     build an .mbf from vault content

Rules enforced here, verbatim from the ADR:

- Unsigned bundles WARN, never block — a missing signature is a
  verdict on the preview, not an error.
- Attribution surfaces prominently in the preview and persists on the
  ``installed_bundle`` record; no strip path exists.
- Imported content is always personal-visibility; nothing here can
  set anything else.
- ``closed_tradition`` bundles surface the respect-source notice; the
  items keep their ``tradition_tags`` so the Phase 15 §14 public-share
  hard-block and AI-agent exclusion filters apply downstream.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Annotated, Any

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.authz.audit import AuditLogger
from theourgia.core.bundles.container import (
    MAX_CONTAINER_BYTES,
    BundleError,
    BundleTooLargeError,
    ParsedBundle,
    TooManyItemsError,
    read_mbf,
)
from theourgia.core.bundles.exporter import EXPORTABLE_TYPES, build_export
from theourgia.core.bundles.importer import (
    KIND_IMPORTERS,
    STATUS_IMPORTED,
    import_parsed_bundle,
    make_installed_bundle,
)
from theourgia.core.bundles.manifest import build_attribution
from theourgia.core.bundles.signing import (
    VERDICT_UNSIGNED,
    sign_container,
    verify_container,
)
from theourgia.core.config import get_settings
from theourgia.core.federation.keys import load_or_create_keypair
from theourgia.core.traditions import (
    RESPECT_SOURCE_DETAIL,
    closed_tradition_conflicts,
    get_closed_tradition_slugs,
    normalize_tradition_slug,
)
from theourgia.models.audit import AuditEventKind, AuditOutcome
from theourgia.models.bundles import InstalledBundle
from theourgia.models.entities import Entity
from theourgia.models.identity import Vault

__all__ = ["read_bundle_upload", "router"]


router = APIRouter()


UNSIGNED_WARNING = (
    "This bundle is unsigned — its origin cannot be verified. Import "
    "proceeds with this warning; unsigned bundles are warned about, "
    "never blocked."
)


async def read_bundle_upload(file: UploadFile) -> ParsedBundle:
    """Read + parse an uploaded ``.mbf``, mapping container errors to
    HTTP errors. Shared with the sandbox router."""
    raw = await file.read(MAX_CONTAINER_BYTES + 1)
    return parse_bundle_bytes(raw)


def parse_bundle_bytes(raw: bytes) -> ParsedBundle:
    """``read_mbf`` with container errors mapped to HTTP errors."""
    try:
        return read_mbf(raw)
    except (BundleTooLargeError, TooManyItemsError) as exc:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=str(exc),
        ) from exc
    except BundleError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid bundle: {exc}",
        ) from exc


def _display_name(item: dict[str, Any]) -> str:
    for key in ("name", "title"):
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return item["ref"]


def _item_tradition_tags(parsed: ParsedBundle) -> list[str]:
    """Distinct normalized tradition tags across every payload item,
    first-appearance order."""
    seen: set[str] = set()
    ordered: list[str] = []
    for _kind, item in parsed.iter_items():
        for tag in item.get("tradition_tags", []) or []:
            if not isinstance(tag, str) or not tag.strip():
                continue
            slug = normalize_tradition_slug(tag)
            if slug not in seen:
                seen.add(slug)
                ordered.append(slug)
    return ordered


# ── Schemas ────────────────────────────────────────────────────────


class SignatureBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verdict: str
    reason: str


class PreviewItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ref: str
    kind: str
    display_name: str
    importable: bool


class LicenseBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    spdx: str
    magickal_tags: list[str]


class ConflictBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entity_names: list[str]
    installed_bundle_slug: bool


class BundlePreviewResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    manifest: dict[str, Any]
    signature: SignatureBlock
    unsigned_warning: str | None
    items: list[PreviewItem]
    license: LicenseBlock
    attribution: str
    closed_tradition: bool
    closed_tradition_note: str
    respect_source_notice: str | None
    closed_tradition_conflicts: list[str]
    conflicts: ConflictBlock


class ImportItemResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ref: str
    kind: str
    status: str
    detail: str
    created_id: str | None


class BundleImportResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    installed_bundle_id: str
    attribution: str
    signature_verdict: str
    results: list[ImportItemResult]
    imported: int
    skipped: int
    total: int


class InstalledBundleRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    slug: str
    version: str
    name: str
    type: str
    signature_verdict: str
    imported_item_count: int
    closed_tradition: bool
    attribution: str
    provenance: list[dict[str, Any]]
    installed_at: datetime


class InstalledBundleListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bundles: list[InstalledBundleRead]


def _to_installed_read(row: InstalledBundle) -> InstalledBundleRead:
    return InstalledBundleRead(
        id=str(row.id),
        slug=row.slug,
        version=row.version,
        name=row.name,
        type=row.type,
        signature_verdict=row.signature_verdict,
        imported_item_count=row.imported_item_count,
        closed_tradition=row.closed_tradition,
        attribution=row.attribution,
        provenance=list(row.provenance or []),
        installed_at=row.created_at,
    )


# ── Endpoints ──────────────────────────────────────────────────────


@router.post("/bundles/preview", response_model=BundlePreviewResponse)
async def preview_bundle(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    file: Annotated[UploadFile, File(description="The .mbf bundle")],
) -> BundlePreviewResponse:
    """Upload, validate, verify — no writes.

    Returns the manifest, signature verdict (unsigned is a verdict:
    warn, don't block), per-payload item listings, the license +
    attribution block, the closed-tradition declaration with the
    respect-source notice, and conflicts (existing same-name entities
    per the alias-graph model; existing same-slug installed bundles).
    """
    parsed = await read_bundle_upload(file)
    manifest = parsed.manifest
    verification = verify_container(parsed)

    items = [
        PreviewItem(
            ref=item["ref"],
            kind=kind,
            display_name=_display_name(item),
            importable=kind in KIND_IMPORTERS,
        )
        for kind, item in parsed.iter_items()
    ]

    closed = await get_closed_tradition_slugs(db)
    item_tags = _item_tradition_tags(parsed)
    conflict_tags = closed_tradition_conflicts(item_tags, closed)

    respect_source_notice: str | None = None
    if manifest.closed_tradition:
        slugs = item_tags or [manifest.slug]
        respect_source_notice = RESPECT_SOURCE_DETAIL.format(
            slugs=", ".join(slugs)
        )

    entity_names = sorted(
        {
            item["name"]
            for kind, item in parsed.iter_items()
            if kind == "entities" and isinstance(item.get("name"), str)
        }
    )
    entity_conflicts: list[str] = []
    if entity_names:
        rows = await db.execute(
            select(Entity.name).where(
                Entity.owner_id == user.id,
                Entity.name.in_(entity_names),
                Entity.deleted_at.is_(None),
            )
        )
        entity_conflicts = sorted({name for (name,) in rows.all()})

    existing_install = (
        await db.execute(
            select(InstalledBundle).where(
                InstalledBundle.owner_id == user.id,
                InstalledBundle.slug == manifest.slug,
            )
        )
    ).scalars().first()

    return BundlePreviewResponse(
        manifest=manifest.model_dump(mode="json"),
        signature=SignatureBlock(
            verdict=verification.verdict, reason=verification.reason
        ),
        unsigned_warning=(
            UNSIGNED_WARNING
            if verification.verdict == VERDICT_UNSIGNED
            else None
        ),
        items=items,
        license=LicenseBlock(
            spdx=manifest.license.spdx,
            magickal_tags=list(manifest.license.magickal_tags),
        ),
        attribution=build_attribution(manifest),
        closed_tradition=manifest.closed_tradition,
        closed_tradition_note=manifest.closed_tradition_note,
        respect_source_notice=respect_source_notice,
        closed_tradition_conflicts=conflict_tags,
        conflicts=ConflictBlock(
            entity_names=entity_conflicts,
            installed_bundle_slug=existing_install is not None,
        ),
    )


@router.post(
    "/bundles/import",
    response_model=BundleImportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def import_bundle(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    file: Annotated[UploadFile, File(description="The .mbf bundle")],
    selected_refs: Annotated[
        str | None,
        Form(
            description=(
                "JSON array of item refs to import. Omit to import "
                "everything."
            ),
        ),
    ] = None,
) -> BundleImportResponse:
    """Commit a user-selected subset of items (piecemeal by design).

    Imported content is always personal-visibility. Entities become
    immutable nodes with ``origin="imported_from_bundle:<slug>@
    <version>"``; alias prompting defaults to ``distinct`` (v1
    creates no alias rows). The install record persists attribution
    and the verbatim provenance chain.
    """
    parsed = await read_bundle_upload(file)
    refs: list[str] | None = None
    if selected_refs is not None:
        try:
            decoded = json.loads(selected_refs)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="selected_refs must be a JSON array of strings",
            ) from exc
        if not (
            isinstance(decoded, list)
            and decoded
            and all(isinstance(r, str) for r in decoded)
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    "selected_refs must be a non-empty JSON array of "
                    "strings (omit it to import everything)"
                ),
            )
        refs = decoded

    verification = verify_container(parsed)
    results = await import_parsed_bundle(
        db, parsed, owner_id=user.id, selected_refs=refs
    )
    imported = sum(1 for r in results if r.status == STATUS_IMPORTED)

    installed = make_installed_bundle(
        parsed.manifest,
        owner_id=user.id,
        signature_verdict=verification.verdict,
        imported_item_count=imported,
    )
    db.add(installed)
    await AuditLogger(db).log(
        kind=AuditEventKind.PLUGIN,
        action="bundle.import",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        detail={
            "bundle": f"{parsed.manifest.slug}@{parsed.manifest.version}",
            "signature_verdict": verification.verdict,
            "imported": imported,
            "skipped": len(results) - imported,
        },
    )
    await db.commit()

    return BundleImportResponse(
        installed_bundle_id=str(installed.id),
        attribution=installed.attribution,
        signature_verdict=verification.verdict,
        results=[
            ImportItemResult(
                ref=r.ref,
                kind=r.kind,
                status=r.status,
                detail=r.detail,
                created_id=r.created_id,
            )
            for r in results
        ],
        imported=imported,
        skipped=len(results) - imported,
        total=len(results),
    )


@router.get("/bundles/installed", response_model=InstalledBundleListResponse)
async def list_installed_bundles(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> InstalledBundleListResponse:
    """The vault's install records — attribution always present."""
    rows = list(
        (
            await db.execute(
                select(InstalledBundle)
                .where(InstalledBundle.owner_id == user.id)
                .order_by(InstalledBundle.created_at.desc())
            )
        ).scalars().all()
    )
    return InstalledBundleListResponse(
        bundles=[_to_installed_read(r) for r in rows]
    )


@router.get("/bundles/export")
async def export_bundle(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    bundle_type: Annotated[
        str,
        Query(alias="type", description="Bundle type to export"),
    ],
    sign: Annotated[
        bool,
        Query(description="Sign with the instance federation keypair"),
    ] = False,
) -> Response:
    """Build an ``.mbf`` from vault content of one type.

    ``sign=true`` signs with the instance Ed25519 federation keypair
    (opt-in). Closed-tradition declarations survive export: items
    whose tags intersect this instance's closed list stamp the
    manifest ``closed_tradition: true``.
    """
    if bundle_type not in EXPORTABLE_TYPES:
        supported = ", ".join(sorted(EXPORTABLE_TYPES))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"unsupported export type {bundle_type!r} — "
                f"v1 supports: {supported}"
            ),
        )

    vault = (
        await db.execute(
            select(Vault)
            .where(Vault.owner_id == user.id)
            .order_by(Vault.created_at.asc())
            .limit(1)
        )
    ).scalars().first()
    author_name = (
        vault.display_name if vault is not None else "Theourgia practitioner"
    )

    closed = await get_closed_tradition_slugs(db)
    data = await build_export(
        db,
        owner_id=user.id,
        bundle_type=bundle_type,
        author_name=author_name,
        closed_slugs=closed,
    )

    if sign:
        settings = get_settings()
        try:
            keypair = load_or_create_keypair(
                private_path=settings.federation_private_key_path,
                public_path=settings.federation_public_key_path,
            )
        except OSError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="instance federation keypair unavailable",
            ) from exc
        data = sign_container(data, keypair.private_key)

    filename = f"{bundle_type}-export.mbf"
    return Response(
        content=data,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
