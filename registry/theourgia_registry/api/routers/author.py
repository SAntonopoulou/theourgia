"""Author-side endpoints — submission lifecycle.

The author signs requests with their vault DID's Ed25519 private key;
the verifier here re-fetches the public key from the author's DID
document (cached on the Author row). See `core.did_auth` for the
signature scheme.

Rule 41: authors can NEVER promote themselves. No self-promotion path.
Rule 42: License SPDX-validated at submit (rule 44 blocks non-AGPL-
compatible licenses outright).
Rule 44: every submission carries a manifest + capability declaration;
diff against previously accepted version is computed at review time.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia_registry.api.deps import CurrentAuthor, get_db_session
from theourgia_registry.models.advisory import (
    AdvisorySeverity,
    VulnerabilityAdvisory,
)
from theourgia_registry.models.author import Author
from theourgia_registry.models.plugin import (
    Plugin,
    PluginTier,
    PluginVersion,
    VersionStatus,
)


__all__ = ["router", "ACCEPTED_LICENSES"]


router = APIRouter()


ACCEPTED_LICENSES: frozenset[str] = frozenset(
    {
        "AGPL-3.0-only",
        "AGPL-3.0-or-later",
        "GPL-3.0-or-later",
        "LGPL-3.0-or-later",
        "MPL-2.0",
        "MIT",
        "BSD-2-Clause",
        "BSD-3-Clause",
        "Apache-2.0",
        "CC-BY-SA-4.0",
        "Unlicense",
    },
)


class SubmissionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=64, pattern=r"^[a-z][a-z0-9-]{1,63}$")
    version: str = Field(min_length=5, max_length=64)
    license_spdx: str
    description: str = Field(default="", max_length=2000)
    homepage: str | None = Field(default=None, max_length=500)
    source_url: str = Field(min_length=8, max_length=500)
    signature_base64: str = Field(min_length=4, max_length=255)
    manifest: dict = Field(default_factory=dict)
    capabilities: list[str] = Field(default_factory=list)
    target_tier: str = Field(default="community")


class SubmissionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    plugin_id: str
    plugin_name: str
    version: str
    status: str
    license_spdx: str
    submitted_at: str
    decided_at: str | None = None


class SubmissionListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    submissions: list[SubmissionRead]


def _serialise(plugin: Plugin, version: PluginVersion) -> SubmissionRead:
    return SubmissionRead(
        id=str(version.id),
        plugin_id=str(plugin.id),
        plugin_name=plugin.name,
        version=version.version,
        status=version.status.value,
        license_spdx=version.license_spdx,
        submitted_at=version.created_at.isoformat(),
        decided_at=(
            version.decided_at.isoformat()
            if version.decided_at is not None
            else None
        ),
    )


@router.post(
    "/submissions",
    response_model=SubmissionRead,
    status_code=status.HTTP_201_CREATED,
)
async def submit(
    payload: SubmissionCreate,
    author: CurrentAuthor,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SubmissionRead:
    """Submit a new version of a plugin.

    Rule 42 — license validated against ACCEPTED_LICENSES BEFORE any
    insert. Non-acceptable licenses surface a 400 with the accepted
    list in the detail.

    If the plugin name is new for this author, create a Plugin row
    (tier=UNVERIFIED). Otherwise, attach the version to the existing
    Plugin row. Duplicate (plugin, version) → 409.
    """
    if payload.license_spdx not in ACCEPTED_LICENSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "license_not_accepted",
                "accepted": sorted(ACCEPTED_LICENSES),
            },
        )

    plugin = (
        await db.execute(
            select(Plugin).where(
                Plugin.author_id == author.id, Plugin.name == payload.name,
            ),
        )
    ).scalar_one_or_none()

    if plugin is None:
        plugin = Plugin(
            author_id=author.id,
            name=payload.name,
            description=payload.description,
            homepage=payload.homepage,
            tier=PluginTier.UNVERIFIED,
        )
        db.add(plugin)
        await db.flush()

    existing_version = (
        await db.execute(
            select(PluginVersion).where(
                PluginVersion.plugin_id == plugin.id,
                PluginVersion.version == payload.version,
            ),
        )
    ).scalar_one_or_none()
    if existing_version is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="this version already submitted",
        )

    version = PluginVersion(
        plugin_id=plugin.id,
        version=payload.version,
        license_spdx=payload.license_spdx,
        source_url=payload.source_url,
        signature_base64=payload.signature_base64,
        manifest_json=payload.manifest,
        capabilities=payload.capabilities,
        status=VersionStatus.PENDING_REVIEW,
        submitted_by_author_id=author.id,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return _serialise(plugin, version)


@router.get(
    "/submissions",
    response_model=SubmissionListResponse,
)
async def list_my_submissions(
    author: CurrentAuthor,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SubmissionListResponse:
    """The author's own submissions, newest first — backs surface A3.

    Other authors' submissions are not visible (rule 9 — no leaderboard,
    no cross-author counts on this view either)."""
    rows = (
        await db.execute(
            select(Plugin, PluginVersion)
            .join(PluginVersion, PluginVersion.plugin_id == Plugin.id)
            .where(Plugin.author_id == author.id)
            .order_by(desc(PluginVersion.created_at)),
        )
    ).all()
    return SubmissionListResponse(
        submissions=[_serialise(plugin, version) for plugin, version in rows],
    )


@router.get(
    "/submissions/{submission_id}",
    response_model=SubmissionRead,
)
async def get_submission(
    submission_id: UUID,
    author: CurrentAuthor,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SubmissionRead:
    """One submission's detail — backs surface A4.

    Only the submitting author can view their own submission (404
    masquerades as 'not found' for other authors' submissions —
    privacy-by-default; we don't differentiate 'forbidden' from
    'absent' on read endpoints)."""
    row = (
        await db.execute(
            select(Plugin, PluginVersion)
            .join(PluginVersion, PluginVersion.plugin_id == Plugin.id)
            .where(
                PluginVersion.id == submission_id,
                Plugin.author_id == author.id,
            ),
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="submission not found")
    plugin, version = row
    return _serialise(plugin, version)


# ── advisories (A8) ────────────────────────────────────────────────────


class AdvisoryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plugin_id: str
    severity: str = Field(pattern=r"^(low|medium|high)$")
    affected_version_range: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=8000)
    remediation_version: str | None = Field(default=None, max_length=64)


class AdvisoryRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    plugin_id: str
    severity: str
    affected_version_range: str
    body: str
    remediation_version: str | None
    filed_at: str
    filed_by_author_did: str
    published_at: str | None


@router.post(
    "/advisories",
    response_model=AdvisoryRead,
    status_code=status.HTTP_201_CREATED,
)
async def file_advisory(
    payload: AdvisoryCreate,
    author: CurrentAuthor,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> AdvisoryRead:
    """File a vulnerability advisory against a plugin — backs surface A8.

    Rule 43: three severity tiers (low/medium/high), no `critical`. The
    pattern check on `severity` enforces this at the wire.
    Rule 30: the advisory body renders verbatim in the H09 banner; no
    auto-formatting beyond minimal Markdown is applied at read time.

    The `published_at` field starts NULL — a maintainer (or the filing
    author, on a separate publish endpoint) sets it when the advisory
    is ready to be visible. Until then it's draft."""
    plugin = (
        await db.execute(
            select(Plugin).where(Plugin.id == UUID(payload.plugin_id)),
        )
    ).scalar_one_or_none()
    if plugin is None:
        raise HTTPException(status_code=404, detail="plugin not found")

    advisory = VulnerabilityAdvisory(
        plugin_id=plugin.id,
        filed_by_author_id=author.id,
        severity=AdvisorySeverity(payload.severity),
        affected_version_range=payload.affected_version_range,
        body=payload.body,
        remediation_version=payload.remediation_version,
        published_at=None,
    )
    db.add(advisory)
    await db.commit()
    await db.refresh(advisory)

    return AdvisoryRead(
        id=str(advisory.id),
        plugin_id=str(advisory.plugin_id),
        severity=advisory.severity.value,
        affected_version_range=advisory.affected_version_range,
        body=advisory.body,
        remediation_version=advisory.remediation_version,
        filed_at=advisory.created_at.isoformat(),
        filed_by_author_did=author.did,
        published_at=(
            advisory.published_at.isoformat()
            if advisory.published_at is not None
            else None
        ),
    )
