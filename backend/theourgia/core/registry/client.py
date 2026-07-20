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
    "ReleaseDownload",
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


@dataclass(slots=True, frozen=True)
class ReleaseDownload:
    """A downloaded release archive plus the registry's integrity +
    authenticity headers (v1-032 contract, see registry README).

    ``author_public_key_b64`` is the standard-base64 raw 32-byte
    Ed25519 key the registry pins on the author's record — the
    installing vault verifies ``signature_b64`` against it."""

    content: bytes
    sha256: str
    signature_b64: str
    author_did: str
    author_public_key_b64: str
    content_type: str


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

    async def _request_raw(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
    ) -> httpx.Response:
        """Like :meth:`_request` but returns the raw response — for
        byte-body endpoints (release download) whose contract lives in
        the headers, not a JSON envelope."""
        url = self._ensure_configured() + path
        try:
            if self.http_client is not None:
                response = await self.http_client.request(
                    method, url, params=params,
                )
            else:
                async with httpx.AsyncClient(
                    timeout=self.timeout_seconds,
                ) as client:
                    response = await client.request(
                        method, url, params=params,
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
        return response

    # ── public endpoints ─────────────────────────────────────────────

    async def list_plugins(
        self,
        *,
        sort: str = "recent_update",
        q: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/v1/plugins — paged plugin list for the marketplace +
        public home. Sort options: alpha · recent_update · recently_added.
        NEVER popularity (rule 38)."""
        params: dict[str, Any] = {"sort": sort}
        if q:
            params["q"] = q
        return await self._request(
            "GET", "/api/v1/plugins", params=params,
        )

    async def list_releases(
        self,
        slug: str,
        *,
        author_did: str | None = None,
    ) -> dict[str, Any]:
        """GET /api/v1/plugins/{slug}/releases — accepted releases,
        oldest first, with per-release artifact presence + sha256.
        Tombstoned plugins surface as RegistryRefused(410)."""
        params: dict[str, Any] = {}
        if author_did:
            params["author_did"] = author_did
        return await self._request(
            "GET",
            f"/api/v1/plugins/{slug}/releases",
            params=params or None,
        )

    async def download_release(
        self,
        slug: str,
        version: str,
        *,
        author_did: str | None = None,
    ) -> ReleaseDownload:
        """GET /api/v1/plugins/{slug}/releases/{version}/download.

        Returns the archive bytes plus the registry's pinned integrity
        headers. The CALLER must verify sha256 + signature — this
        method only transports."""
        params: dict[str, Any] = {}
        if author_did:
            params["author_did"] = author_did
        response = await self._request_raw(
            "GET",
            f"/api/v1/plugins/{slug}/releases/{version}/download",
            params=params or None,
        )
        return ReleaseDownload(
            content=response.content,
            sha256=response.headers.get("X-Artifact-Sha256", ""),
            signature_b64=response.headers.get("X-Artifact-Signature", ""),
            author_did=response.headers.get("X-Author-Did", ""),
            author_public_key_b64=response.headers.get(
                "X-Author-Public-Key", "",
            ),
            content_type=response.headers.get(
                "Content-Type", "application/gzip",
            ),
        )

    async def get_author(self, did: str) -> dict[str, Any]:
        """GET /api/v1/authors/{did:path}."""
        return await self._request(
            "GET", f"/api/v1/authors/{did}",
        )

    # ── author-signed endpoints ───────────────────────────────────

    async def author_request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None,
        signing_headers: dict[str, str],
    ) -> dict[str, Any]:
        """Run an author-protected call with the operator's signing
        headers. The body MUST be the exact JSON the signer hashed —
        the headers contain the SHA-256 of those bytes."""
        return await self._request(
            method, path, json_body=body, headers=signing_headers,
        )
