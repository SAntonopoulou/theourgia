"""Plugin lifecycle endpoints — Phase 14 § 9.

Endpoints (per ``plan/14-plugin-ecosystem.md`` § 9):

::

  GET    /api/v1/plugins/installed
  POST   /api/v1/plugins/install
  POST   /api/v1/plugins/{id}/activate
  POST   /api/v1/plugins/{id}/deactivate
  DELETE /api/v1/plugins/{id}                 (uninstall)
  GET    /api/v1/plugins/registry/search
  POST   /api/v1/plugins/{id}/configure

The substrate (``plugin_install`` / ``plugin_capability_grant`` /
``plugin_setting`` from Phase 01 B7-B10 · plus the manifest /
capability / loader / state machine) already exists. This router is
the thin lifecycle layer that the H09 surfaces consume.

The registry-search endpoint currently returns an empty list — there
is no upstream registry yet (Phase 14 deliverable 5 + 10). It is wired
so the surface contract is stable; populating it is a follow-on once
the registry is hosted.
"""

from __future__ import annotations

import base64
import logging
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.api.routers.v1.registry_bridge import (
    _handle_registry_error,
    get_registry_client,
)
from theourgia.core.authz.audit import AuditLogger
from theourgia.core.config import get_settings
from theourgia.core.plugins.capabilities import Capability
from theourgia.core.plugins.install import (
    ArtifactVerificationError,
    PluginArchiveError,
    unpack_plugin_archive,
    verify_release_artifact,
)
from theourgia.core.plugins.state import PluginState, allowed_transition
from theourgia.core.registry.client import RegistryClient, RegistryError
from theourgia.models.audit import AuditEventKind, AuditOutcome
from theourgia.models.identity import Vault
from theourgia.models.plugins import (
    PluginCapabilityGrant,
    PluginInstall,
    PluginSetting,
)

__all__ = ["router"]

_log = logging.getLogger(__name__)


router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────


async def _resolve_user_vault(db: AsyncSession, user_id: UUID) -> Vault:
    """Return the user's vault. Plugins are per-vault; for v1 we use
    the first vault the user owns. Multi-vault selection is a future
    concern that the API path will accept as a query param when the
    surface needs it."""
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


async def _load_install(
    db: AsyncSession, vault_id: UUID, install_id: UUID,
) -> PluginInstall:
    install = (
        await db.execute(
            select(PluginInstall).where(
                PluginInstall.id == install_id,
                PluginInstall.vault_id == vault_id,
            )
        )
    ).scalars().first()
    if install is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plugin not installed.",
        )
    return install


# ── Schemas ────────────────────────────────────────────────────────


class CapabilityGrantRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    capability: str
    granted_at: datetime


class PluginInstallRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    version: str
    author: str
    license: str
    description: str
    homepage: str | None
    source: str
    state: str
    last_error: str | None
    activated_at: datetime | None
    installed_at: datetime
    capabilities: list[CapabilityGrantRead]
    # Manifest is exposed so the configure surface can render the
    # plugin's declared config_schema. May be an empty dict for
    # legacy installs.
    manifest: dict[str, object] = Field(default_factory=dict)


def _to_read(
    install: PluginInstall,
    grants: list[PluginCapabilityGrant],
) -> PluginInstallRead:
    return PluginInstallRead(
        id=str(install.id),
        name=install.name,
        version=install.version,
        author=install.author,
        license=install.license,
        description=install.description,
        homepage=install.homepage,
        source=install.source,
        state=install.state.value,
        last_error=install.last_error,
        activated_at=install.activated_at,
        installed_at=install.created_at,
        capabilities=[
            CapabilityGrantRead(
                capability=g.capability.value,
                granted_at=g.created_at,
            )
            for g in grants
        ],
        manifest=dict(install.manifest_json or {}),
    )


class InstalledListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plugins: list[PluginInstallRead]


class InstallBody(BaseModel):
    """The body shape the H09 capability-review surface POSTs once the
    magician has scrolled through and approved every capability."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=64)
    version: str = Field(min_length=1, max_length=64)
    author: str = Field(min_length=1, max_length=255)
    license: str = Field(min_length=1, max_length=64)
    description: str = Field(default="", max_length=2000)
    homepage: str | None = Field(default=None, max_length=500)
    source: str = Field(min_length=1, max_length=500)
    manifest: dict[str, object] = Field(default_factory=dict)
    capabilities: list[str] = Field(default_factory=list)


class InstallFromRegistryBody(BaseModel):
    """The capability-review surface POSTs this after the magician has
    approved the manifest's capability requests for a registry plugin."""

    model_config = ConfigDict(extra="forbid")

    slug: str = Field(
        min_length=2, max_length=64, pattern=r"^[a-z][a-z0-9-]{1,63}$",
    )
    version: str | None = Field(default=None, min_length=1, max_length=64)
    approved_capabilities: list[str] = Field(default_factory=list)


class RegistrySearchHit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    version: str
    author: str
    description: str
    tier: str  # "official" | "community" | "unverified"


class RegistrySearchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hits: list[RegistrySearchHit]
    total: int


class ConfigureBody(BaseModel):
    """A bag of key/value settings to merge into the plugin's
    ``plugin_setting`` rows. Existing keys are overwritten; absent
    keys are untouched."""

    model_config = ConfigDict(extra="forbid")

    settings: dict[str, object]


class ConfigureResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    updated_keys: list[str]


# ── Endpoints ──────────────────────────────────────────────────────


@router.get("/plugins/installed", response_model=InstalledListResponse)
async def list_installed(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> InstalledListResponse:
    vault = await _resolve_user_vault(db, user.id)
    installs = list(
        (
            await db.execute(
                select(PluginInstall)
                .where(PluginInstall.vault_id == vault.id)
                .order_by(PluginInstall.created_at.desc())
            )
        ).scalars().all()
    )
    grants_by_install: dict[UUID, list[PluginCapabilityGrant]] = {}
    if installs:
        rows = list(
            (
                await db.execute(
                    select(PluginCapabilityGrant).where(
                        PluginCapabilityGrant.plugin_install_id.in_(
                            [i.id for i in installs],
                        )
                    )
                )
            ).scalars().all()
        )
        for g in rows:
            grants_by_install.setdefault(g.plugin_install_id, []).append(g)
    return InstalledListResponse(
        plugins=[
            _to_read(i, grants_by_install.get(i.id, []))
            for i in installs
        ],
    )


@router.post(
    "/plugins/install",
    response_model=PluginInstallRead,
    status_code=status.HTTP_201_CREATED,
)
async def install_plugin(
    body: InstallBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> PluginInstallRead:
    vault = await _resolve_user_vault(db, user.id)

    # Reject duplicates by (vault_id, name) — the model has a unique
    # constraint but we surface the conflict with a clear 409.
    existing = (
        await db.execute(
            select(PluginInstall).where(
                PluginInstall.vault_id == vault.id,
                PluginInstall.name == body.name,
            )
        )
    ).scalars().first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Plugin {body.name!r} is already installed.",
        )

    # Validate every requested capability before any insert.
    parsed_caps: list[Capability] = []
    for cap_str in body.capabilities:
        try:
            parsed_caps.append(Capability.from_string(cap_str))
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    install = PluginInstall(
        vault_id=vault.id,
        name=body.name,
        version=body.version,
        author=body.author,
        license=body.license,
        description=body.description,
        homepage=body.homepage,
        source=body.source,
        state=PluginState.INSTALLED,
        manifest_json=body.manifest,
    )
    db.add(install)
    await db.flush()

    for cap in parsed_caps:
        db.add(
            PluginCapabilityGrant(
                plugin_install_id=install.id,
                capability=cap,
                granted_by_user_id=user.id,
            )
        )

    await AuditLogger(db).log(
        kind=AuditEventKind.PLUGIN,
        action="plugin.install",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        vault_id=vault.id,
        detail={
            "plugin_id": str(install.id),
            "name": body.name,
            "version": body.version,
            "capabilities": [c.value for c in parsed_caps],
        },
    )

    await db.commit()
    await db.refresh(install)

    grants = list(
        (
            await db.execute(
                select(PluginCapabilityGrant).where(
                    PluginCapabilityGrant.plugin_install_id == install.id,
                )
            )
        ).scalars().all()
    )
    return _to_read(install, grants)


async def _transition(
    db: AsyncSession,
    install: PluginInstall,
    target: PluginState,
    *,
    actor_id: UUID,
    vault_id: UUID,
) -> PluginInstall:
    previous = install.state
    if not allowed_transition(previous, target):
        await AuditLogger(db).log(
            kind=AuditEventKind.PLUGIN,
            action=f"plugin.{target.value}",
            outcome=AuditOutcome.FAILURE,
            actor_id=actor_id,
            vault_id=vault_id,
            detail={
                "plugin_id": str(install.id),
                "name": install.name,
                "from_state": previous.value,
                "target_state": target.value,
            },
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot move plugin from {previous.value!r} "
                f"to {target.value!r}."
            ),
        )
    install.state = target
    if target is PluginState.ACTIVE:
        install.activated_at = datetime.now()
        install.last_error = None
    if target is PluginState.INACTIVE:
        install.activated_at = None
    await AuditLogger(db).log(
        kind=AuditEventKind.PLUGIN,
        action=(
            "plugin.activate"
            if target is PluginState.ACTIVE
            else "plugin.deactivate"
        ),
        outcome=AuditOutcome.SUCCESS,
        actor_id=actor_id,
        vault_id=vault_id,
        detail={
            "plugin_id": str(install.id),
            "name": install.name,
            "from_state": previous.value,
            "to_state": target.value,
        },
    )
    await db.commit()
    await db.refresh(install)
    return install


@router.post("/plugins/{install_id}/activate", response_model=PluginInstallRead)
async def activate_plugin(
    install_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> PluginInstallRead:
    vault = await _resolve_user_vault(db, user.id)
    install = await _load_install(db, vault.id, install_id)
    install = await _transition(
        db, install, PluginState.ACTIVE,
        actor_id=user.id, vault_id=vault.id,
    )
    grants = list(
        (
            await db.execute(
                select(PluginCapabilityGrant).where(
                    PluginCapabilityGrant.plugin_install_id == install.id,
                )
            )
        ).scalars().all()
    )
    return _to_read(install, grants)


@router.post("/plugins/{install_id}/deactivate", response_model=PluginInstallRead)
async def deactivate_plugin(
    install_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> PluginInstallRead:
    vault = await _resolve_user_vault(db, user.id)
    install = await _load_install(db, vault.id, install_id)
    install = await _transition(
        db, install, PluginState.INACTIVE,
        actor_id=user.id, vault_id=vault.id,
    )
    grants = list(
        (
            await db.execute(
                select(PluginCapabilityGrant).where(
                    PluginCapabilityGrant.plugin_install_id == install.id,
                )
            )
        ).scalars().all()
    )
    return _to_read(install, grants)


@router.delete(
    "/plugins/{install_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def uninstall_plugin(
    install_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    vault = await _resolve_user_vault(db, user.id)
    install = await _load_install(db, vault.id, install_id)
    snapshot_name = install.name
    snapshot_version = install.version
    await db.delete(install)
    await AuditLogger(db).log(
        kind=AuditEventKind.PLUGIN,
        action="plugin.uninstall",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        vault_id=vault.id,
        detail={
            "plugin_id": str(install_id),
            "name": snapshot_name,
            "version": snapshot_version,
        },
    )
    await db.commit()


@router.get(
    "/plugins/registry/search", response_model=RegistrySearchResponse,
)
async def search_registry(
    user: CurrentUser,  # noqa: ARG001 — authenticated browse
    registry: Annotated[RegistryClient, Depends(get_registry_client)],
    q: str = "",
    tier: str | None = None,
) -> RegistrySearchResponse:
    """Proxy the registry's public browse into the search contract.

    ``version`` maps from the registry card's ``latest_version`` (the
    newest accepted release); plugins with no accepted release yet show
    an em dash. Unconfigured registry → 503, unreachable → 502 (same
    honesty mapping as the registry bridge)."""
    try:
        body = await registry.list_plugins(q=q or None)
    except RegistryError as exc:
        raise _handle_registry_error(exc) from exc

    hits: list[RegistrySearchHit] = []
    for card in body.get("plugins", []):
        card_tier = str(card.get("tier", "unverified"))
        if tier and card_tier != tier:
            continue
        hits.append(
            RegistrySearchHit(
                name=str(card.get("name", "")),
                version=str(card.get("latest_version") or "—"),
                author=str(card.get("author_did", "")),
                description=str(card.get("description", "")),
                tier=card_tier,
            )
        )
    return RegistrySearchResponse(hits=hits, total=len(hits))


@router.post(
    "/plugins/install-from-registry",
    response_model=PluginInstallRead,
    status_code=status.HTTP_201_CREATED,
)
async def install_from_registry(
    body: InstallFromRegistryBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    registry: Annotated[RegistryClient, Depends(get_registry_client)],
) -> PluginInstallRead:
    """Fetch a release from the registry, VERIFY it, unpack, record.

    Verification chain (all failures → 400, nothing touches disk):

      1. sha256 of the downloaded bytes matches the registry's header
         (and is recomputed locally — the header is cross-checked, not
         trusted).
      2. The author's Ed25519 signature over the domain-separated
         artifact payload verifies against the public key pinned in the
         registry record.
      3. The archive unpacks safely (no traversal/links/bombs) and its
         ``plugin.toml`` parses STRICTLY, with name + version matching
         the requested release.

    Policy: install-time signature failure is **warn-not-block for
    BUNDLES** (data imports — see the MBF importer) but **block for
    plugin CODE** (plan/14 § 5 signed releases). This endpoint installs
    code, so unsigned or badly-signed releases are refused outright.

    ``version`` omitted → the newest accepted release with an uploaded
    artifact. Registry refusals pass through with their status (410
    tombstone/withdrawn keeps the author's reason)."""
    vault = await _resolve_user_vault(db, user.id)

    existing = (
        await db.execute(
            select(PluginInstall).where(
                PluginInstall.vault_id == vault.id,
                PluginInstall.name == body.slug,
            )
        )
    ).scalars().first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Plugin {body.slug!r} is already installed.",
        )

    # Validate capability strings BEFORE any network or disk work.
    approved_caps: set[Capability] = set()
    for cap_str in body.approved_capabilities:
        try:
            approved_caps.add(Capability.from_string(cap_str))
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    try:
        version = body.version
        if version is None:
            releases = await registry.list_releases(body.slug)
            downloadable = [
                r for r in releases.get("releases", [])
                if r.get("has_artifact")
            ]
            if not downloadable:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=(
                        f"Registry has no downloadable release for "
                        f"{body.slug!r}."
                    ),
                )
            version = str(downloadable[-1]["version"])
        download = await registry.download_release(body.slug, version)
    except RegistryError as exc:
        raise _handle_registry_error(exc) from exc

    try:
        sha256_hex = verify_release_artifact(
            download.content,
            slug=body.slug,
            version=version,
            expected_sha256=download.sha256,
            signature_b64=download.signature_b64,
            author_public_key_b64=download.author_public_key_b64,
        )
    except ArtifactVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    settings = get_settings()
    try:
        _package_path, manifest = unpack_plugin_archive(
            download.content,
            slug=body.slug,
            version=version,
            plugins_dir=settings.plugins_dir,
        )
    except PluginArchiveError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # Grants = what the magician approved ∩ what the manifest declares.
    # The loader re-intersects at activation; doing it here too keeps
    # the DB an honest record of effective consent.
    manifest_caps = set(manifest.capabilities)
    effective_caps = approved_caps & manifest_caps
    dropped = approved_caps - manifest_caps
    if dropped:
        _log.warning(
            "plugin.install.capabilities_not_in_manifest",
            extra={
                "plugin": manifest.name,
                "dropped": sorted(c.value for c in dropped),
            },
        )

    install = PluginInstall(
        vault_id=vault.id,
        name=manifest.name,
        version=manifest.version,
        author=manifest.author,
        license=manifest.license,
        description=manifest.description,
        homepage=manifest.homepage,
        source=f"registry:{body.slug}@{version}",
        state=PluginState.INSTALLED,
        manifest_json=manifest.model_dump(mode="json", by_alias=True),
        signature=base64.b64decode(download.signature_b64),
        signature_public_key=base64.b64decode(
            download.author_public_key_b64,
        ),
        artifact_sha256=sha256_hex,
    )
    db.add(install)
    await db.flush()

    for cap in sorted(effective_caps, key=lambda c: c.value):
        db.add(
            PluginCapabilityGrant(
                plugin_install_id=install.id,
                capability=cap,
                granted_by_user_id=user.id,
            )
        )

    await AuditLogger(db).log(
        kind=AuditEventKind.PLUGIN,
        action="plugin.install_from_registry",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        vault_id=vault.id,
        detail={
            "plugin_id": str(install.id),
            "name": manifest.name,
            "version": manifest.version,
            "artifact_sha256": sha256_hex,
            "author_did": download.author_did,
            "capabilities": sorted(c.value for c in effective_caps),
        },
    )

    await db.commit()
    await db.refresh(install)

    grants = list(
        (
            await db.execute(
                select(PluginCapabilityGrant).where(
                    PluginCapabilityGrant.plugin_install_id == install.id,
                )
            )
        ).scalars().all()
    )
    return _to_read(install, grants)


@router.post(
    "/plugins/{install_id}/configure",
    response_model=ConfigureResponse,
)
async def configure_plugin(
    install_id: UUID,
    body: ConfigureBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ConfigureResponse:
    vault = await _resolve_user_vault(db, user.id)
    install = await _load_install(db, vault.id, install_id)

    existing_rows = list(
        (
            await db.execute(
                select(PluginSetting).where(
                    PluginSetting.plugin_install_id == install.id,
                )
            )
        ).scalars().all()
    )
    by_key = {row.key: row for row in existing_rows}

    updated: list[str] = []
    for key, value in body.settings.items():
        # SQLAlchemy JSONB column accepts dicts directly; wrap a non-
        # dict primitive in a one-key envelope to stay schema-stable.
        envelope: dict[str, object] = (
            value if isinstance(value, dict) else {"value": value}
        )
        if key in by_key:
            by_key[key].value = envelope
        else:
            db.add(
                PluginSetting(
                    plugin_install_id=install.id,
                    key=key,
                    value=envelope,
                )
            )
        updated.append(key)

    await AuditLogger(db).log(
        kind=AuditEventKind.PLUGIN,
        action="plugin.configure",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        vault_id=vault.id,
        detail={
            "plugin_id": str(install.id),
            "name": install.name,
            # Audit the keys touched but NOT the values — settings may
            # carry secrets (the H09 "secret" field kind).
            "updated_keys": updated,
        },
    )

    await db.commit()
    return ConfigureResponse(updated_keys=updated)
