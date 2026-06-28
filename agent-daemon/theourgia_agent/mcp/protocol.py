"""JSON-RPC 2.0 protocol shapes + MCP method handlers.

The MCP server has only two methods exposed to subprocess agents:

  * ``tools/list``  — returns the granted capability set as MCP tools
  * ``tools/call``  — invokes one tool via the dispatch layer

Both transports (HTTP POST + SSE) share these handlers. The transport
layer's only job is framing — protocol semantics live here.

We do NOT use the upstream MCP Python SDK because it pulls in too much
machinery for what is essentially three RPC verbs. Hand-rolling keeps
the surface area small and the rules-52/53 invariants auditable.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from theourgia_agent.mcp.capabilities import AgentCapability
from theourgia_agent.mcp.dispatch import (
    DispatchContext,
    ToolCallResult,
    dispatch_tool,
)
from theourgia_agent.mcp.gating import CapabilityDenied
from theourgia_agent.mcp.vault_client import (
    VaultClientError,
    VaultUnauthorisedError,
)
from theourgia_agent.models.audit import AuditEventType
from theourgia_agent.runs.audit import AuditRecord, now


__all__ = [
    "JsonRpcRequest",
    "JsonRpcResponse",
    "JsonRpcError",
    "ERROR_PARSE",
    "ERROR_INVALID_REQUEST",
    "ERROR_METHOD_NOT_FOUND",
    "ERROR_INVALID_PARAMS",
    "ERROR_INTERNAL",
    "ERROR_CAPABILITY_DENIED",
    "ERROR_VAULT_UNAUTHORISED",
    "ERROR_VAULT_FAILURE",
    "handle_request",
    "tool_descriptors",
]


ERROR_PARSE = -32700
ERROR_INVALID_REQUEST = -32600
ERROR_METHOD_NOT_FOUND = -32601
ERROR_INVALID_PARAMS = -32602
ERROR_INTERNAL = -32603

# Theourgia-specific application errors (in JSON-RPC's server-reserved
# range -32099..-32000).
ERROR_CAPABILITY_DENIED = -32001
ERROR_VAULT_UNAUTHORISED = -32002
ERROR_VAULT_FAILURE = -32003


@dataclass(slots=True)
class JsonRpcError:
    code: int
    message: str
    data: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.data is not None:
            out["data"] = self.data
        return out


@dataclass(slots=True)
class JsonRpcRequest:
    method: str
    params: dict[str, Any]
    id: int | str | None
    jsonrpc: str = "2.0"

    @classmethod
    def from_payload(cls, payload: Any) -> "JsonRpcRequest":
        if not isinstance(payload, dict):
            msg = "request must be a JSON object"
            raise ValueError(msg)
        if payload.get("jsonrpc") != "2.0":
            msg = "jsonrpc must be '2.0'"
            raise ValueError(msg)
        method = payload.get("method")
        if not isinstance(method, str) or not method:
            msg = "method must be a non-empty string"
            raise ValueError(msg)
        params = payload.get("params") or {}
        if not isinstance(params, dict):
            msg = "params must be a JSON object when present"
            raise ValueError(msg)
        return cls(method=method, params=params, id=payload.get("id"))


@dataclass(slots=True)
class JsonRpcResponse:
    id: int | str | None
    result: dict[str, Any] | None = None
    error: JsonRpcError | None = None
    jsonrpc: str = "2.0"

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"jsonrpc": "2.0", "id": self.id}
        if self.error is not None:
            out["error"] = self.error.to_dict()
        else:
            out["result"] = self.result or {}
        return out


def _tool_description(cap: AgentCapability) -> str:
    return (cap.__doc__ or cap.value).strip().splitlines()[0]


def tool_descriptors(
    granted: list[AgentCapability],
) -> list[dict[str, Any]]:
    """Render the MCP `tools/list` payload from the granted set.

    `filesystem` and `network.outbound` are capability flags, NOT tools
    the agent calls via MCP. They influence other daemon subsystems
    (filesystem sandbox, outbound proxy) but never appear as tools.
    """
    out: list[dict[str, Any]] = []
    for cap in granted:
        if cap in (
            AgentCapability.FILESYSTEM,
            AgentCapability.NETWORK_OUTBOUND,
        ):
            continue
        out.append(
            {
                "name": cap.value,
                "description": _tool_description(cap),
                "inputSchema": _input_schema_for(cap),
            },
        )
    return out


def _input_schema_for(cap: AgentCapability) -> dict[str, Any]:
    """Minimal JSON Schema for each callable tool's arguments."""
    if cap == AgentCapability.READ_ENTRIES:
        return {
            "type": "object",
            "properties": {
                "tag": {"type": ["string", "null"]},
                "limit": {"type": "integer", "minimum": 1, "maximum": 200},
            },
            "additionalProperties": False,
        }
    if cap in (
        AgentCapability.READ_ENTITIES,
        AgentCapability.READ_DIVINATIONS,
        AgentCapability.READ_SYNCHRONICITIES,
    ):
        return {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "minimum": 1, "maximum": 200},
            },
            "additionalProperties": False,
        }
    if cap == AgentCapability.READ_LIBRARY:
        return {
            "type": "object",
            "properties": {"kind": {"type": ["string", "null"]}},
            "additionalProperties": False,
        }
    if cap == AgentCapability.READ_CORRESPONDENCES:
        return {
            "type": "object",
            "properties": {"bundle": {"type": ["string", "null"]}},
            "additionalProperties": False,
        }
    if cap == AgentCapability.READ_ANALYTICS:
        return {
            "type": "object",
            "properties": {
                "query_id": {"type": ["string", "null"]},
            },
            "additionalProperties": False,
        }
    return {"type": "object", "additionalProperties": False}


def _tool_call_result_to_payload(result: ToolCallResult) -> dict[str, Any]:
    """Render a dispatch result as the MCP tools/call response.

    The `filtered_count` is included as a top-level field so the agent
    sees how many records the daemon dropped — honesty-by-construction
    (rule 49: counts visible, content not)."""
    return {
        "records": result.records,
        "filtered_count": result.filtered_count,
    }


async def handle_request(
    ctx: DispatchContext,
    request: JsonRpcRequest,
) -> JsonRpcResponse:
    """Map a parsed JSON-RPC request to a response."""
    if request.method == "tools/list":
        await ctx.audit_sink.emit(
            AuditRecord(
                vault_did=ctx.vault_did,
                event_type=AuditEventType.MCP_TOOLS_LIST,
                happened_at=now(),
                run_id=ctx.run_id,
                allowed=True,
            ),
        )
        return JsonRpcResponse(
            id=request.id,
            result={"tools": tool_descriptors(ctx.granted)},
        )

    if request.method == "tools/call":
        name = request.params.get("name")
        arguments = request.params.get("arguments") or {}
        if not isinstance(name, str) or not name:
            return JsonRpcResponse(
                id=request.id,
                error=JsonRpcError(
                    code=ERROR_INVALID_PARAMS,
                    message="'name' must be a non-empty string",
                ),
            )
        if not isinstance(arguments, dict):
            return JsonRpcResponse(
                id=request.id,
                error=JsonRpcError(
                    code=ERROR_INVALID_PARAMS,
                    message="'arguments' must be a JSON object",
                ),
            )

        try:
            result = await dispatch_tool(
                ctx, tool_name=name, arguments=arguments,
            )
        except CapabilityDenied as exc:
            return JsonRpcResponse(
                id=request.id,
                error=JsonRpcError(
                    code=ERROR_CAPABILITY_DENIED,
                    message=f"capability {exc.required.value!r} not granted",
                    data={"required": exc.required.value},
                ),
            )
        except ValueError as exc:
            return JsonRpcResponse(
                id=request.id,
                error=JsonRpcError(
                    code=ERROR_INVALID_PARAMS,
                    message=str(exc),
                ),
            )
        except VaultUnauthorisedError as exc:
            return JsonRpcResponse(
                id=request.id,
                error=JsonRpcError(
                    code=ERROR_VAULT_UNAUTHORISED,
                    message=str(exc),
                ),
            )
        except VaultClientError as exc:
            return JsonRpcResponse(
                id=request.id,
                error=JsonRpcError(
                    code=ERROR_VAULT_FAILURE,
                    message=str(exc),
                ),
            )

        return JsonRpcResponse(
            id=request.id,
            result=_tool_call_result_to_payload(result),
        )

    return JsonRpcResponse(
        id=request.id,
        error=JsonRpcError(
            code=ERROR_METHOD_NOT_FOUND,
            message=f"method {request.method!r} not found",
        ),
    )
