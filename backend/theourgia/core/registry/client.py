"""HTTP client for the plugin registry service (plugins.theourgia.com).

The vault proxies the H10 A-cluster + C2 marketplace browse through
here. Public registry endpoints are unauthenticated; signed-author
endpoints will land separately (plugin submission, etc.) once the
admin SPA's signing UX is wired.

When the registry is unconfigured (no URL set), the client raises
:class:`RegistryNotConfigured` and routes return 503 with a clear
explanation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


__all__ = [
    "RegistryClient",
    "RegistryError",
    "RegistryNotConfigured",
    "RegistryRefused",
    "RegistryUnreachable",
]


class RegistryError(Exception):
    """Generic registry-side error surfacing at the bridge."""


class RegistryNotConfigured(RegistryError):
    """`registry_url` is unset; the vault cannot proxy registry calls."""


class RegistryRefused(RegistryError):
    """Registry refused the call (4xx with structured body)."""

    def __init__(
        self, *, status_code: int, payload: dict[str, Any] | str,
    ) -> None:
        super().__init__(f"registry refused with status {status_code}")
        self.status_code = status_code
        self.payload = payload


class RegistryUnreachable(RegistryError):
    """Network-level failure dialing the registry."""


@dataclass(slots=True)
class RegistryClient:
    """Async HTTP client for the registry.

    Tests inject `http_client` (an httpx.AsyncClient backed by
    MockTransport) for unit testing — same pattern as DaemonClient
    + the daemon's VaultClient."""

    base_url: str | None
    timeout_seconds: float = 15.0
    http_client: httpx.AsyncClient | None = None

    def _ensure_configured(self) -> str:
        if not self.base_url:
            raise RegistryNotConfigured(
                "registry URL not configured (set THEOURGIA_REGISTRY_URL)",
            )
        return self.base_url.rstrip("/")

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        url = self._ensure_configured() + path
        request_headers = headers or {}
        request_headers.setdefault("Accept", "application/json")
        try:
            if self.http_client is not None:
                response = await self.http_client.request(
                    method,
                    url,
                    params=params,
                    json=json_body,
                    headers=request_headers,
                )
            else:
                async with httpx.AsyncClient(
                    timeout=self.timeout_seconds,
                ) as client:
                    response = await client.request(
                        method,
                        url,
                        params=params,
                        json=json_body,
                        headers=request_headers,
                    )
        except httpx.HTTPError as exc:
            raise RegistryUnreachable(
                f"registry unreachable: {exc}",
            ) from exc

        if 400 <= response.status_code < 600:
            payload: Any
            try:
                payload = response.json()
            except ValueError:
                payload = response.text
            raise RegistryRefused(
                status_code=response.status_code, payload=payload,
            )
        try:
            return response.json()
        except ValueError as exc:
            raise RegistryError(
                "registry returned non-JSON response",
            ) from exc

    # ── public endpoints ─────────────────────────────────────────────

    async def list_plugins(
        self,
        *,
        sort: str = "recent_update",
    ) -> dict[str, Any]:
        """GET /api/v1/plugins — paged plugin list for the marketplace +
        public home. Sort options: alpha · recent_update · recently_added.
        NEVER popularity (rule 38)."""
        return await self._request(
            "GET", "/api/v1/plugins", params={"sort": sort},
        )

    async def get_author(self, did: str) -> dict[str, Any]:
        """GET /api/v1/authors/{did:path}."""
        return await self._request(
            "GET", f"/api/v1/authors/{did}",
        )
