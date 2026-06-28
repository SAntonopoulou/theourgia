"""Per-install memory directory — Phase 16 H10 C9.

The H10 C9 surface (AgentMemoryReader) reads the human-editable
markdown files in `<memory_root>/<vault_id>/<install_id>/`. The
filesystem sandbox bounds writes to that directory at the syscall
level (rule 59 — bwrap-enforced when the agent runs); these
endpoints expose the same path read-only to the vault, which proxies
them to the admin SPA.

Three endpoints — list / read / write. Write is intentionally
exposed (the magician can edit the agent's memory directly, by
design — rule 60).
"""

from __future__ import annotations

from pathlib import Path
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncEngine

from theourgia_agent.api.routers.installs import engine_dependency
from theourgia_agent.api.routers.runs import (
    _check_control_token,
    control_token_dependency,
)
from theourgia_agent.core.config import get_settings
from theourgia_agent.runs.repos import DbInstallRepo


__all__ = ["create_memory_router"]


# Max size we'll write or read in one call (rule: agent memory is
# narrative markdown, not databases — 256 KiB is plenty per file).
MAX_FILE_BYTES = 256 * 1024


class MemoryWriteBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: str = Field(max_length=MAX_FILE_BYTES)


def _install_dir(vault_id: str, install_id: str) -> Path:
    root = get_settings().memory_root
    return root / vault_id / install_id


def _safe_resolve(install_dir: Path, name: str) -> Path:
    """Resolve `name` within `install_dir` + refuse paths that
    escape (rule 59 — defence in depth alongside the bwrap sandbox).

    Forbidden: absolute paths, `..` segments, directory separators
    in name. Names must be flat filenames within the install dir."""
    if "/" in name or "\\" in name or name.startswith(".") or ".." in name:
        msg = f"invalid memory file name: {name!r}"
        raise HTTPException(status_code=400, detail=msg)
    resolved = (install_dir / name).resolve()
    install_resolved = install_dir.resolve()
    # The file MUST be a direct child of install_dir.
    if resolved.parent != install_resolved:
        msg = f"memory path escapes install dir: {name!r}"
        raise HTTPException(status_code=400, detail=msg)
    return resolved


def create_memory_router() -> APIRouter:
    router = APIRouter(tags=["memory"])

    @router.get("/installs/{install_id}/memory")
    async def list_memory(
        install_id: UUID,
        engine: Annotated[AsyncEngine, Depends(engine_dependency)],
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)
        repo = DbInstallRepo(engine=engine)
        install = await repo.get(install_id)
        if install is None:
            raise HTTPException(status_code=404, detail="install not found")
        memory_dir = _install_dir(install.vault_id, str(install.id))
        if not memory_dir.exists() or not memory_dir.is_dir():
            return JSONResponse(content={"files": []})
        entries: list[dict[str, Any]] = []
        for child in sorted(memory_dir.iterdir()):
            if not child.is_file():
                continue
            stat = child.stat()
            entries.append(
                {
                    "name": child.name,
                    "size_bytes": stat.st_size,
                    "modified_at": stat.st_mtime,
                },
            )
        return JSONResponse(content={"files": entries})

    @router.get("/installs/{install_id}/memory/{name}")
    async def read_memory(
        install_id: UUID,
        name: str,
        engine: Annotated[AsyncEngine, Depends(engine_dependency)],
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)
        repo = DbInstallRepo(engine=engine)
        install = await repo.get(install_id)
        if install is None:
            raise HTTPException(status_code=404, detail="install not found")
        path = _safe_resolve(
            _install_dir(install.vault_id, str(install.id)), name,
        )
        if not path.exists() or not path.is_file():
            raise HTTPException(status_code=404, detail="memory file not found")
        # Cap reads at MAX_FILE_BYTES — refuse to serve oversized files
        # rather than truncating (truncation would create silent data loss).
        if path.stat().st_size > MAX_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"file exceeds {MAX_FILE_BYTES} bytes",
            )
        body = path.read_text(encoding="utf-8", errors="replace")
        return JSONResponse(
            content={"name": name, "body": body, "size_bytes": path.stat().st_size},
        )

    @router.put("/installs/{install_id}/memory/{name}")
    async def write_memory(
        install_id: UUID,
        name: str,
        payload: MemoryWriteBody,
        engine: Annotated[AsyncEngine, Depends(engine_dependency)],
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)
        repo = DbInstallRepo(engine=engine)
        install = await repo.get(install_id)
        if install is None:
            raise HTTPException(status_code=404, detail="install not found")
        memory_dir = _install_dir(install.vault_id, str(install.id))
        memory_dir.mkdir(parents=True, exist_ok=True)
        path = _safe_resolve(memory_dir, name)
        path.write_text(payload.body, encoding="utf-8")
        return JSONResponse(
            content={"name": name, "size_bytes": path.stat().st_size},
        )

    @router.delete("/installs/{install_id}/memory/{name}")
    async def delete_memory(
        install_id: UUID,
        name: str,
        engine: Annotated[AsyncEngine, Depends(engine_dependency)],
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)
        repo = DbInstallRepo(engine=engine)
        install = await repo.get(install_id)
        if install is None:
            raise HTTPException(status_code=404, detail="install not found")
        path = _safe_resolve(
            _install_dir(install.vault_id, str(install.id)), name,
        )
        if not path.exists():
            raise HTTPException(status_code=404, detail="memory file not found")
        path.unlink()
        return JSONResponse(content={"deleted": True})

    return router
