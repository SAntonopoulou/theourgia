"""Public registry endpoints — browse + per-plugin detail + author profile.

These endpoints back surfaces A1 (RegistryPublicHome) and the
publicly-visible detail pages. They are unauthenticated.

Rule 38: sort options are alpha · recent-update · recently-added.
NEVER popularity. Rule 9: no count-of-installs / no stars / no
ranking.
"""

from __future__ import annotations

import base64
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PublicKey,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia_registry.api.deps import get_db_session
from theourgia_registry.models.artifact import ReleaseArtifact
from theourgia_registry.models.author import Author
from theourgia_registry.models.plugin import (
    Plugin,
    PluginVersion,
    VersionStatus,
)

__all__ = ["router"]


router = APIRouter()


SortOption = Literal["alpha", "recent_update", "recently_added"]

_ACCEPTED_STATUSES = (
    VersionStatus.ACCEPTED_COMMUNITY,
    VersionStatus.ACCEPTED_OFFICIAL,
)


class PublicPluginCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    author_did: str
    author_display_name: str
    description: str
    tier: str
    homepage: str | None
    updated_at: datetime
    tombstoned: bool
    latest_version: str | None = None


class PublicPluginListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plugins: list[PublicPluginCard]


class PublicAuthorRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    did: str
    display_name: str
    homepage: str | None
    plugin_count: int


@router.get("/plugins", response_model=PublicPluginListResponse)
async def list_plugins(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    sort: SortOption = "recent_update",
    q: str | None = Query(default=None, max_length=200),
) -> PublicPluginListResponse:
    stmt = select(Plugin, Author).join(Author, Plugin.author_id == Author.id)
    if q:
        # Simple ILIKE substring match for v1.
        stmt = stmt.where(Plugin.name.ilike(f"%{q}%"))  # type: ignore[union-attr]
    if sort == "alpha":
        stmt = stmt.order_by(Plugin.name.asc())  # type: ignore[union-attr]
    elif sort == "recently_added":
        stmt = stmt.order_by(Plugin.created_at.desc())  # type: ignore[union-attr]
    else:  # recent_update
        stmt = stmt.order_by(Plugin.updated_at.desc())  # type: ignore[union-attr]

    rows = (await db.execute(stmt)).all()

    # Latest accepted version per plugin (one query, grouped client-side;
    # registry catalogues are small). Powers the marketplace card's
    # version chip + the vault's search proxy.
    latest_by_plugin: dict[UUID, str] = {}
    if rows:
        version_rows = (
            await db.execute(
                select(PluginVersion)
                .where(
                    PluginVersion.plugin_id.in_(  # type: ignore[union-attr]
                        [plugin.id for (plugin, _author) in rows],
                    ),
                    PluginVersion.status.in_(_ACCEPTED_STATUSES),  # type: ignore[union-attr]
                )
                .order_by(PluginVersion.created_at.asc()),  # type: ignore[union-attr]
            )
        ).scalars().all()
        for v in version_rows:
            # ascending order → last write wins → newest accepted
            latest_by_plugin[v.plugin_id] = v.version

    cards = [
        PublicPluginCard(
            id=str(plugin.id),
            name=plugin.name,
            author_did=author.did,
            author_display_name=author.display_name,
            description=plugin.description,
            tier=plugin.tier.value,
            homepage=plugin.homepage,
            updated_at=plugin.updated_at,
            tombstoned=plugin.tombstoned_at is not None,
            latest_version=latest_by_plugin.get(plugin.id),
        )
        for (plugin, author) in rows
    ]
    return PublicPluginListResponse(plugins=cards)


# ── release hosting (v1-032) ───────────────────────────────────────────


class PublicReleaseRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: str
    status: str
    license_spdx: str
    has_artifact: bool
    sha256: str | None
    created_at: datetime


class PublicReleaseListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plugin_name: str
    author_did: str
    tier: str
    releases: list[PublicReleaseRead]


async def _resolve_public_plugin(
    db: AsyncSession, slug: str, author_did: str | None,
) -> tuple[Plugin, Author]:
    """Resolve a plugin by name (optionally qualified by author DID).

    Plugin names are unique per author, not globally — when two authors
    share a name the caller must qualify with ``author_did`` (409).
    Tombstoned plugins raise 410 with the author's reason (rule 40 —
    existing installs keep working; new fetches see the notice).
    """
    stmt = (
        select(Plugin, Author)
        .join(Author, Plugin.author_id == Author.id)
        .where(Plugin.name == slug)
    )
    if author_did:
        stmt = stmt.where(Author.did == author_did)
    rows = (await db.execute(stmt)).all()
    if not rows:
        raise HTTPException(status_code=404, detail="plugin not found")
    if len(rows) > 1:
        raise HTTPException(
            status_code=409,
            detail=(
                "multiple authors publish this plugin name — qualify "
                "the request with ?author_did="
            ),
        )
    plugin, author = rows[0]
    if plugin.tombstoned_at is not None:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={
                "error": "tombstoned",
                "reason": plugin.tombstone_reason
                or "withdrawn by the author",
                "tombstoned_at": plugin.tombstoned_at.isoformat(),
            },
        )
    return plugin, author


@router.get(
    "/plugins/{slug}/releases",
    response_model=PublicReleaseListResponse,
)
async def list_releases(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    author_did: str | None = Query(default=None, max_length=255),
) -> PublicReleaseListResponse:
    """Accepted releases for a plugin, oldest first.

    Only accepted (community/official) versions appear — pending,
    rejected, and withdrawn submissions are not distribution
    candidates. Tombstoned plugin → 410 with reason."""
    plugin, author = await _resolve_public_plugin(db, slug, author_did)

    version_rows = (
        await db.execute(
            select(PluginVersion)
            .where(
                PluginVersion.plugin_id == plugin.id,
                PluginVersion.status.in_(_ACCEPTED_STATUSES),  # type: ignore[union-attr]
            )
            .order_by(PluginVersion.created_at.asc()),  # type: ignore[union-attr]
        )
    ).scalars().all()

    artifacts_by_version: dict[UUID, ReleaseArtifact] = {}
    if version_rows:
        artifact_rows = (
            await db.execute(
                select(ReleaseArtifact).where(
                    ReleaseArtifact.plugin_version_id.in_(  # type: ignore[union-attr]
                        [v.id for v in version_rows],
                    ),
                ),
            )
        ).scalars().all()
        artifacts_by_version = {a.plugin_version_id: a for a in artifact_rows}

    return PublicReleaseListResponse(
        plugin_name=plugin.name,
        author_did=author.did,
        tier=plugin.tier.value,
        releases=[
            PublicReleaseRead(
                version=v.version,
                status=v.status.value,
                license_spdx=v.license_spdx,
                has_artifact=v.id in artifacts_by_version,
                sha256=(
                    artifacts_by_version[v.id].sha256
                    if v.id in artifacts_by_version
                    else None
                ),
                created_at=v.created_at,
            )
            for v in version_rows
        ],
    )


def _author_public_key_b64(public_key_pem: str | None) -> str:
    """The author's Ed25519 key as standard base64 of the raw 32 bytes.

    Header-safe (PEM newlines are not). Installing vaults pin the
    artifact signature against this key."""
    if not public_key_pem:
        return ""
    try:
        key = serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
    except (ValueError, TypeError):
        return ""
    if not isinstance(key, Ed25519PublicKey):
        return ""
    raw = key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return base64.b64encode(raw).decode("ascii")


@router.get("/plugins/{slug}/releases/{version}/download")
async def download_release(
    slug: str,
    version: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    author_did: str | None = Query(default=None, max_length=255),
) -> Response:
    """Serve the release archive with its integrity + authenticity headers.

    Response headers::

        X-Artifact-Sha256      hex SHA-256 of the body
        X-Artifact-Signature   author's Ed25519 signature (base64) over
                               the domain-separated artifact payload
        X-Author-Did           the author's DID
        X-Author-Public-Key    base64 of the raw 32-byte Ed25519 key
                               pinned on the author's registry record

    Refusals: tombstoned plugin → 410 with reason · withdrawn version →
    410 · non-accepted version → 404 (not a distribution candidate) ·
    no uploaded artifact → 404."""
    plugin, author = await _resolve_public_plugin(db, slug, author_did)

    version_row = (
        await db.execute(
            select(PluginVersion).where(
                PluginVersion.plugin_id == plugin.id,
                PluginVersion.version == version,
            ),
        )
    ).scalar_one_or_none()
    if version_row is None:
        raise HTTPException(status_code=404, detail="release not found")
    if version_row.status == VersionStatus.WITHDRAWN:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={
                "error": "version_withdrawn",
                "reason": "this version was withdrawn by its author",
            },
        )
    if version_row.status not in _ACCEPTED_STATUSES:
        raise HTTPException(
            status_code=404,
            detail=(
                f"release is {version_row.status.value!r} — only accepted "
                "releases are downloadable"
            ),
        )

    artifact = (
        await db.execute(
            select(ReleaseArtifact).where(
                ReleaseArtifact.plugin_version_id == version_row.id,
            ),
        )
    ).scalar_one_or_none()
    if artifact is None:
        raise HTTPException(
            status_code=404,
            detail="no artifact uploaded for this release",
        )

    filename = f"{plugin.name}-{version_row.version}.tar.gz"
    return Response(
        content=artifact.content,
        media_type=artifact.content_type,
        headers={
            "X-Artifact-Sha256": artifact.sha256,
            "X-Artifact-Signature": artifact.signature_base64,
            "X-Author-Did": author.did,
            "X-Author-Public-Key": _author_public_key_b64(
                author.public_key_pem,
            ),
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/authors/{did:path}", response_model=PublicAuthorRead)
async def get_author(
    did: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> PublicAuthorRead:
    author = (
        await db.execute(select(Author).where(Author.did == did))
    ).scalars().first()
    if author is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No such author on this registry.",
        )
    count = len(
        list(
            (
                await db.execute(
                    select(Plugin).where(Plugin.author_id == author.id)
                )
            ).scalars().all()
        )
    )
    return PublicAuthorRead(
        did=author.did,
        display_name=author.display_name,
        homepage=author.homepage,
        plugin_count=count,
    )
