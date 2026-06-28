"""HTTP client that dials the vault's MCP endpoint on behalf of the
agent.

The daemon never touches vault data directly. When the `claude`
subprocess calls one of the daemon's MCP tools (a capability), the
daemon turns around and asks the vault for the underlying read, then
filters the response and returns it to the subprocess.

This client is intentionally thin — it speaks JSON-RPC over HTTP to
the vault's MCP, doesn't cache anything, doesn't transform the
result. Filtering is one layer up
(`theourgia_agent.mcp.filters.filter_records`).

The vault is trusted to enforce auth — the daemon presents a vault
session token that the magician issued during the daemon's session-
unlock dance.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from theourgia_agent.core.config import get_settings


__all__ = [
    "VaultClient",
    "VaultClientError",
    "VaultUnauthorisedError",
]


class VaultClientError(Exception):
    """Generic transport / protocol error from the vault."""


class VaultUnauthorisedError(VaultClientError):
    """Vault refused the session token (likely expired)."""


@dataclass(slots=True)
class VaultClient:
    """One client per agent run. Carries the session token + vault URL.

    Methods correspond 1:1 to the AgentCapability enum's read.* values.
    Each method returns the parsed JSON response from the vault. The
    daemon's MCP tool dispatch passes the result through the rule-
    52/53 filter before returning to the subprocess.

    Tests inject `http_client` (an `httpx.AsyncClient` built against a
    `MockTransport`); production code leaves it None and a fresh
    client is created per request.
    """

    session_token: str
    base_url: str | None = None
    timeout_seconds: float = 30.0
    http_client: httpx.AsyncClient | None = None

    def _url(self) -> str:
        return self.base_url or get_settings().vault_mcp_url

    async def _post(
        self, method: str, params: dict[str, Any],
    ) -> dict[str, Any]:
        """Issue a JSON-RPC request to the vault's MCP endpoint."""
        body = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": 1,
        }
        headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json",
        }

        try:
            if self.http_client is not None:
                response = await self.http_client.post(
                    self._url(), json=body, headers=headers,
                )
            else:
                async with httpx.AsyncClient(
                    timeout=self.timeout_seconds,
                ) as client:
                    response = await client.post(
                        self._url(), json=body, headers=headers,
                    )
        except httpx.HTTPError as exc:
            raise VaultClientError(f"vault transport error: {exc}") from exc

        if response.status_code == 401:
            raise VaultUnauthorisedError(
                "vault session token expired or invalid",
            )
        if response.status_code >= 400:
            raise VaultClientError(
                f"vault returned HTTP {response.status_code}",
            )

        try:
            data = response.json()
        except ValueError as exc:
            raise VaultClientError("vault returned invalid JSON") from exc

        if "error" in data:
            err = data["error"]
            code = err.get("code")
            message = err.get("message", "unknown vault error")
            raise VaultClientError(
                f"vault JSON-RPC error (code={code}): {message}"
            )

        result = data.get("result")
        if not isinstance(result, dict):
            raise VaultClientError(
                "vault JSON-RPC response missing dict 'result'"
            )
        return result

    async def read_entries(
        self,
        *,
        tag: str | None = None,
        limit: int = 50,
    ) -> list[dict]:
        """Read journal entries. Returns the records UNFILTERED — the
        caller MUST pass through filter_records() before exposing to
        the agent."""
        result = await self._post(
            "read.entries", {"tag": tag, "limit": limit},
        )
        records = result.get("records") or []
        return list(records)

    async def read_entities(self, *, limit: int = 50) -> list[dict]:
        result = await self._post("read.entities", {"limit": limit})
        return list(result.get("records") or [])

    async def read_divinations(self, *, limit: int = 50) -> list[dict]:
        result = await self._post("read.divinations", {"limit": limit})
        return list(result.get("records") or [])

    async def read_library(self, *, kind: str | None = None) -> list[dict]:
        result = await self._post("read.library", {"kind": kind})
        return list(result.get("records") or [])

    async def read_correspondences(
        self, *, bundle: str | None = None,
    ) -> list[dict]:
        result = await self._post(
            "read.correspondences", {"bundle": bundle},
        )
        return list(result.get("records") or [])

    async def read_synchronicities(self, *, limit: int = 50) -> list[dict]:
        result = await self._post(
            "read.synchronicities", {"limit": limit},
        )
        return list(result.get("records") or [])

    async def closed_tradition_slugs(self) -> frozenset[str]:
        """Fetch the vault's operator-curated closed-tradition slug
        set. Cached for one MCP session in the dispatch layer."""
        result = await self._post("meta.closed_tradition_slugs", {})
        slugs = result.get("slugs") or []
        return frozenset(slugs)
