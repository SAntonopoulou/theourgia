"""MCP transport — JSON-RPC over HTTP POST (+ SSE in a follow-on)."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

from theourgia_agent.mcp.protocol import (
    ERROR_PARSE,
    JsonRpcError,
    JsonRpcRequest,
    JsonRpcResponse,
    handle_request,
)
from theourgia_agent.mcp.sessions import (
    MCPSession,
    MCPSessionRegistry,
    get_default_registry,
)


__all__ = [
    "create_mcp_router",
    "registry_dependency",
    "endpoint_event_payload",
]


def endpoint_event_payload(session: MCPSession) -> dict[str, Any]:
    """The first SSE event on /mcp/sse — tells the agent where to POST
    JSON-RPC messages. Kept pure so tests can verify the shape without
    holding open a streaming response."""
    return {
        "type": "endpoint",
        "uri": f"/mcp/jsonrpc?session={session.token}",
    }


def registry_dependency() -> MCPSessionRegistry:
    """FastAPI dependency that returns the process-wide registry.
    Tests override this via `app.dependency_overrides`."""
    return get_default_registry()


async def _resolve_session(
    authorization: str | None,
    registry: MCPSessionRegistry,
) -> MCPSession:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401, detail="Bearer token required",
        )
    token = authorization.split(" ", 1)[1].strip()
    session = registry.lookup(token)
    if session is None:
        raise HTTPException(
            status_code=401, detail="invalid or expired session token",
        )
    return session


def create_mcp_router() -> APIRouter:
    router = APIRouter(prefix="/mcp", tags=["mcp"])

    @router.post("/jsonrpc")
    async def jsonrpc(
        request: Request,
        authorization: str | None = Header(default=None),
        registry: MCPSessionRegistry = Depends(registry_dependency),
    ) -> JSONResponse:
        session = await _resolve_session(authorization, registry)

        try:
            payload: Any = await request.json()
        except (ValueError, json.JSONDecodeError):
            err = JsonRpcResponse(
                id=None,
                error=JsonRpcError(
                    code=ERROR_PARSE, message="invalid JSON body",
                ),
            )
            return JSONResponse(content=err.to_dict(), status_code=200)

        try:
            rpc_request = JsonRpcRequest.from_payload(payload)
        except ValueError as exc:
            err = JsonRpcResponse(
                id=payload.get("id") if isinstance(payload, dict) else None,
                error=JsonRpcError(
                    code=ERROR_PARSE, message=str(exc),
                ),
            )
            return JSONResponse(content=err.to_dict(), status_code=200)

        response = await handle_request(session.ctx, rpc_request)
        return JSONResponse(content=response.to_dict(), status_code=200)

    @router.get("/sse")
    async def sse(
        authorization: str | None = Header(default=None),
        registry: MCPSessionRegistry = Depends(registry_dependency),
    ) -> StreamingResponse:
        """SSE stream for MCP. The endpoint event names where JSON-RPC
        messages should be POSTed; subsequent messages on this stream
        carry the responses.

        The current implementation is a minimal heartbeat — bidirectional
        framing arrives with the streaming-messages layer."""
        session = await _resolve_session(authorization, registry)

        async def event_source() -> AsyncGenerator[bytes, None]:
            endpoint_event = endpoint_event_payload(session)
            yield f"event: endpoint\ndata: {json.dumps(endpoint_event)}\n\n".encode()
            try:
                while True:
                    await asyncio.sleep(15)
                    yield b": keep-alive\n\n"
            except asyncio.CancelledError:
                return

        return StreamingResponse(
            event_source(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "X-Accel-Buffering": "no",
            },
        )

    return router
