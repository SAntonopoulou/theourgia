"""Audit log query endpoint — the read side for H10 B4 PerUserAuditLog.

Filters by vault_did (mandatory — rule 9: no cross-vault leakage even
in the audit log itself), optionally by event_type. Returns newest-
first. Paginated via limit + offset.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import JSONResponse

from theourgia_agent.api.routers.runs import (
    audit_sink_dependency,
    control_token_dependency,
)
from theourgia_agent.models.audit import AuditEventType
from theourgia_agent.runs.audit import AuditRecord, AuditReader


__all__ = ["create_audit_router"]


def _record_to_dict(r: AuditRecord) -> dict[str, Any]:
    return {
        "vault_did": r.vault_did,
        "event_type": r.event_type.value,
        "happened_at": r.happened_at.isoformat(),
        "run_id": r.run_id,
        "install_id": str(r.install_id) if r.install_id is not None else None,
        "tool_name": r.tool_name,
        "arguments_json": r.arguments_json,
        "allowed": r.allowed,
        "filtered_count": r.filtered_count,
        "detail": r.detail,
    }


def _check_control_token(
    provided: str | None,
    expected: str | None,
) -> None:
    if expected is None:
        return
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="invalid control token")


def create_audit_router() -> APIRouter:
    router = APIRouter(prefix="/audit", tags=["audit"])

    @router.get("")
    async def query_audit(
        vault_did: str = Query(min_length=1),
        event_type: str | None = Query(default=None),
        limit: int = Query(default=100, ge=1, le=500),
        offset: int = Query(default=0, ge=0),
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
        reader: AuditReader = Depends(audit_sink_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)

        parsed_event_type: AuditEventType | None = None
        if event_type is not None:
            try:
                parsed_event_type = AuditEventType(event_type)
            except ValueError as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"unknown event_type {event_type!r}",
                ) from exc

        records = await reader.query(
            vault_did=vault_did,
            event_type=parsed_event_type,
            limit=limit,
            offset=offset,
        )
        return JSONResponse(
            content={
                "vault_did": vault_did,
                "limit": limit,
                "offset": offset,
                "events": [_record_to_dict(r) for r in records],
            },
        )

    return router
