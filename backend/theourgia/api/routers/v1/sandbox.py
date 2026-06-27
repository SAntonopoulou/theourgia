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
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.authz.audit import AuditLogger
from theourgia.models.audit import AuditEventKind, AuditOutcome
from theourgia.models.identity import Vault
from theourgia.models.sandbox import DEFAULT_LIFETIME, Sandbox, SandboxKind

__all__ = ["router"]


router = APIRouter()


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


@router.post(
    "/sandbox/import",
    response_model=SandboxRead,
    status_code=status.HTTP_201_CREATED,
)
async def import_into_sandbox(
    body: SandboxImportBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SandboxRead:
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
    against the bundle's data persist after the sandbox is gone."""
    sandbox = await _load_sandbox(db, user.id, sandbox_id)
    sandbox.promoted_at = datetime.now()
    await AuditLogger(db).log(
        kind=AuditEventKind.PLUGIN,
        action="sandbox.promote",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        vault_id=sandbox.vault_id,
        detail={
            "sandbox_id": str(sandbox.id),
            "kind": sandbox.kind.value,
            "source": sandbox.source,
        },
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
