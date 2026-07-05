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

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.authz.audit import AuditLogger
from theourgia.core.plugins.capabilities import Capability
from theourgia.core.plugins.state import PluginState, allowed_transition
from theourgia.models.audit import AuditEventKind, AuditOutcome
from theourgia.models.identity import Vault
from theourgia.models.plugins import (
    PluginCapabilityGrant,
    PluginInstall,
    PluginSetting,
)

__all__ = ["router"]


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
    db: Annotated[AsyncSession, Depends(get_db_session)],  # noqa: ARG001
    q: str = "",  # noqa: ARG001
    tier: str | None = None,  # noqa: ARG001
) -> RegistrySearchResponse:
    """Stable contract; empty until the registry is hosted (deliverable 10)."""
    return RegistrySearchResponse(hits=[], total=0)


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
