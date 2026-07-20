"""HTTP client for the localhost agent daemon.

The vault calls the daemon over HTTP (loopback only — both processes
on the same host). Authenticates with the shared `X-Daemon-Auth`
control token. The daemon is responsible for cap evaluation,
subprocess supervision, MCP filtering; the vault is the thin
HTTP gateway between the magician's UI session and the daemon.

When the daemon is unconfigured (no URL set), the client surfaces
:class:`DaemonNotConfigured` and the routes return 503 with the
verbatim 'daemon not configured' copy.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import httpx


__all__ = [
    "DaemonClient",
    "DaemonError",
    "DaemonNotConfigured",
    "DaemonRefused",
    "DaemonUnreachable",
]


class DaemonError(Exception):
    """Generic daemon-side error surfacing at the bridge."""


class DaemonNotConfigured(DaemonError):
    """`agent_daemon_url` is unset; the vault cannot proxy agent calls."""


class DaemonRefused(DaemonError):
    """Daemon refused the call (4xx with structured body).

    Carries the daemon's verbatim refusal payload — the bridge proxies
    it through to the magician's UI unchanged (rule 49 — what the daemon
    said is what the magician sees)."""

    def __init__(
        self, *, status_code: int, payload: dict[str, Any] | str,
    ) -> None:
        super().__init__(f"daemon refused with status {status_code}")
        self.status_code = status_code
        self.payload = payload


class DaemonUnreachable(DaemonError):
    """Network-level failure dialing the daemon."""


@dataclass(slots=True)
class DaemonClient:
    """Async HTTP client for the daemon. One per request (or per
    long-lived component) — backed by httpx.AsyncClient.

    Tests inject `http_client` for httpx.MockTransport-based mocking
    (same pattern as the daemon's vault_client)."""

    base_url: str | None
    control_token: str = ""
    timeout_seconds: float = 30.0
    http_client: httpx.AsyncClient | None = None

    def _ensure_configured(self) -> str:
        if not self.base_url:
            raise DaemonNotConfigured(
                "agent daemon URL not configured (set "
                "THEOURGIA_AGENT_DAEMON_URL)",
            )
        return self.base_url.rstrip("/")

    def _headers(self) -> dict[str, str]:
        return {
            "X-Daemon-Auth": self.control_token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = self._ensure_configured() + path
        headers = self._headers()
        try:
            if self.http_client is not None:
                response = await self.http_client.request(
                    method, url, json=json_body, headers=headers,
                )
            else:
                async with httpx.AsyncClient(
                    timeout=self.timeout_seconds,
                ) as client:
                    response = await client.request(
                        method, url, json=json_body, headers=headers,
                    )
        except httpx.HTTPError as exc:
            raise DaemonUnreachable(
                f"daemon unreachable: {exc}",
            ) from exc

        if 400 <= response.status_code < 600:
            payload: Any
            try:
                payload = response.json()
            except ValueError:
                payload = response.text
            raise DaemonRefused(
                status_code=response.status_code, payload=payload,
            )
        try:
            return response.json()
        except ValueError as exc:
            raise DaemonError(
                "daemon returned non-JSON response",
            ) from exc

    # ── runs control plane ─────────────────────────────────────────────

    async def start_run(self, request_body: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/runs", json_body=request_body)

    async def get_run(self, run_id: str) -> dict[str, Any]:
        return await self._request("GET", f"/runs/{run_id}")

    async def terminate_run(self, run_id: str) -> dict[str, Any]:
        return await self._request("DELETE", f"/runs/{run_id}")

    async def report_cost(
        self, run_id: str, sample: dict[str, Any],
    ) -> dict[str, Any]:
        return await self._request(
            "POST", f"/runs/{run_id}/cost", json_body=sample,
        )

    # ── installs lifecycle ─────────────────────────────────────────────

    async def create_install(
        self, body: dict[str, Any],
    ) -> dict[str, Any]:
        return await self._request("POST", "/installs", json_body=body)

    async def list_installs(self, vault_id: str) -> dict[str, Any]:
        return await self._request(
            "GET", f"/installs?vault_id={vault_id}",
        )

    async def get_install(self, install_id: str) -> dict[str, Any]:
        return await self._request("GET", f"/installs/{install_id}")

    async def update_install_state(
        self, install_id: str, state: str,
    ) -> dict[str, Any]:
        return await self._request(
            "PATCH",
            f"/installs/{install_id}/state",
            json_body={"state": state},
        )

    async def delete_install(self, install_id: str) -> dict[str, Any]:
        return await self._request("DELETE", f"/installs/{install_id}")

    # ── memory directory ───────────────────────────────────────────────

    async def list_install_memory(
        self, install_id: str,
    ) -> dict[str, Any]:
        return await self._request(
            "GET", f"/installs/{install_id}/memory",
        )

    async def read_install_memory(
        self, install_id: str, name: str,
    ) -> dict[str, Any]:
        return await self._request(
            "GET", f"/installs/{install_id}/memory/{name}",
        )

    async def write_install_memory(
        self, install_id: str, name: str, body: str,
    ) -> dict[str, Any]:
        return await self._request(
            "PUT",
            f"/installs/{install_id}/memory/{name}",
            json_body={"body": body},
        )

    async def delete_install_memory(
        self, install_id: str, name: str,
    ) -> dict[str, Any]:
        return await self._request(
            "DELETE", f"/installs/{install_id}/memory/{name}",
        )

    async def cost_summary(
        self, *, vault_id: str, window: str = "month",
    ) -> dict[str, Any]:
        return await self._request(
            "GET", f"/costs/summary?vault_id={vault_id}&window={window}",
        )

    async def query_audit(
        self,
        *,
        vault_did: str,
        event_type: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict[str, Any]:
        params = f"?vault_did={vault_did}&limit={limit}&offset={offset}"
        if event_type:
            params += f"&event_type={event_type}"
        return await self._request("GET", f"/audit{params}")

    async def stream_run(
        self, run_id: str,
    ) -> AsyncIterator[bytes]:
        """SSE relay — yields raw event-stream bytes verbatim.

        The caller (an SSE FastAPI route) re-emits these on its own
        streaming response. We don't parse here because we want to
        preserve the exact framing the daemon emits."""
        url = self._ensure_configured() + f"/runs/{run_id}/stream"
        headers = self._headers()
        client = self.http_client or httpx.AsyncClient(
            timeout=None,  # SSE streams are open-ended
        )
        owns_client = self.http_client is None
        try:
            async with client.stream(
                "GET", url, headers=headers,
            ) as response:
                if 400 <= response.status_code < 600:
                    body = await response.aread()
                    raise DaemonRefused(
                        status_code=response.status_code,
                        payload=body.decode("utf-8", errors="replace"),
                    )
                async for chunk in response.aiter_bytes():
                    yield chunk
        except httpx.HTTPError as exc:
            raise DaemonUnreachable(f"daemon SSE error: {exc}") from exc
        finally:
            if owns_client:
                await client.aclose()
