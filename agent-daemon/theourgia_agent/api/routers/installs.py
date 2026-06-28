"""Agent install lifecycle — Phase 16 installs CRUD.

The vault calls these endpoints (proxied through its own
/api/v1/agents/installs bridge) to register a magician's installed
agents in the daemon's DB. The records hold:

  · the granted capability set (the daemon enforces these at MCP dispatch)
  · the monthly cost cap (the daemon enforces this at-wake + at-spend)
  · the Mode B encrypted API key blobs (decrypted by the daemon at
    subprocess spawn; never round-trip back to the vault)

Bearer `X-Daemon-Auth` token gates every endpoint.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncEngine

from theourgia_agent.api.routers.runs import (
    control_token_dependency,
    _check_control_token,
)
from theourgia_agent.models.agent_install import (
    AgentInstall,
    AgentInstallState,
)
from theourgia_agent.runs.repos import DbInstallRepo


__all__ = ["create_installs_router", "engine_dependency"]


_default_engine: AsyncEngine | None = None


def engine_dependency() -> AsyncEngine:
    """Process-wide async engine for the daemon's DB. Tests override
    via `app.dependency_overrides`."""
    from theourgia_agent.core.db import get_engine

    global _default_engine
    if _default_engine is None:
        _default_engine = get_engine()
    return _default_engine


# ── schemas ──────────────────────────────────────────────────────────


class InstallCreateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vault_id: str = Field(min_length=1, max_length=64)
    agent_id: str = Field(min_length=1, max_length=64)
    display_name: str = Field(min_length=1, max_length=255)
    kind: str = Field(min_length=1, max_length=64)
    monthly_cost_cap_usd: Decimal


class InstallStateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: str = Field(pattern=r"^(inactive|active|paused|cost_capped)$")


@dataclass(slots=True, frozen=True)
class InstallSnapshot:
    """The wire shape for GET /installs and POST /installs returns."""

    id: str
    vault_id: str
    agent_id: str
    display_name: str
    kind: str
    state: str
    monthly_cost_cap_usd: str
    has_api_key: bool
    created_at: str
    updated_at: str

    @classmethod
    def from_row(cls, row: AgentInstall) -> "InstallSnapshot":
        return cls(
            id=str(row.id),
            vault_id=row.vault_id,
            agent_id=row.agent_id,
            display_name=row.display_name,
            kind=row.kind,
            state=row.state.value,
            monthly_cost_cap_usd=str(row.monthly_cost_cap_usd),
            has_api_key=row.api_key_ciphertext is not None,
            created_at=row.created_at.isoformat() if row.created_at else "",
            updated_at=row.updated_at.isoformat() if row.updated_at else "",
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "vault_id": self.vault_id,
            "agent_id": self.agent_id,
            "display_name": self.display_name,
            "kind": self.kind,
            "state": self.state,
            "monthly_cost_cap_usd": self.monthly_cost_cap_usd,
            "has_api_key": self.has_api_key,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


def create_installs_router() -> APIRouter:
    router = APIRouter(prefix="/installs", tags=["installs"])

    @router.post("")
    async def create_install(
        body: InstallCreateBody,
        engine: Annotated[AsyncEngine, Depends(engine_dependency)],
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)
        repo = DbInstallRepo(engine=engine)
        existing = await repo.get_by_vault_agent(
            vault_id=body.vault_id, agent_id=body.agent_id,
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="install already exists for this vault + agent",
            )
        row = AgentInstall(
            vault_id=body.vault_id,
            agent_id=body.agent_id,
            display_name=body.display_name,
            kind=body.kind,
            state=AgentInstallState.INACTIVE,
            monthly_cost_cap_usd=body.monthly_cost_cap_usd,
        )
        created = await repo.create(row)
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content=InstallSnapshot.from_row(created).to_dict(),
        )

    @router.get("")
    async def list_installs(
        engine: Annotated[AsyncEngine, Depends(engine_dependency)],
        vault_id: str,
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)
        repo = DbInstallRepo(engine=engine)
        rows = await repo.list_by_vault(vault_id)
        return JSONResponse(
            content={
                "vault_id": vault_id,
                "installs": [InstallSnapshot.from_row(r).to_dict() for r in rows],
            },
        )

    @router.get("/{install_id}")
    async def get_install(
        install_id: UUID,
        engine: Annotated[AsyncEngine, Depends(engine_dependency)],
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)
        repo = DbInstallRepo(engine=engine)
        row = await repo.get(install_id)
        if row is None:
            raise HTTPException(status_code=404, detail="install not found")
        return JSONResponse(content=InstallSnapshot.from_row(row).to_dict())

    @router.patch("/{install_id}/state")
    async def update_install_state(
        install_id: UUID,
        body: InstallStateBody,
        engine: Annotated[AsyncEngine, Depends(engine_dependency)],
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)
        repo = DbInstallRepo(engine=engine)
        row = await repo.update_state(
            install_id=install_id, state=AgentInstallState(body.state),
        )
        if row is None:
            raise HTTPException(status_code=404, detail="install not found")
        return JSONResponse(content=InstallSnapshot.from_row(row).to_dict())

    @router.delete("/{install_id}")
    async def delete_install(
        install_id: UUID,
        engine: Annotated[AsyncEngine, Depends(engine_dependency)],
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)
        repo = DbInstallRepo(engine=engine)
        ok = await repo.delete(install_id)
        if not ok:
            raise HTTPException(status_code=404, detail="install not found")
        return JSONResponse(content={"deleted": True})

    return router
