"""HTTP transport for the API-based email backends.

Postmark, SES, and Mailgun all reduce to "POST some bytes to an HTTPS
endpoint and read back a JSON body". That single operation is broken
out as :class:`EmailHTTPTransport` so tests can pass an in-memory stub
without spinning up httpx, mirroring the ``MatrixTransport`` pattern
in the notification substrate.

Production uses :class:`HttpxEmailTransport` (httpx is a hard
dependency, so no optional extra is needed for these backends).
"""

from __future__ import annotations

from typing import Any, Final, Protocol

import httpx

__all__ = ["EmailHTTPTransport", "HttpxEmailTransport"]


_DEFAULT_TIMEOUT: Final[float] = 30.0


class EmailHTTPTransport(Protocol):
    """The HTTP transport an API email backend calls into.

    Broken out as a Protocol so tests can pass an in-memory stub.
    The backend prepares the full request (URL, headers, encoded
    body bytes); the transport only moves it over the wire.
    """

    async def post(
        self,
        url: str,
        *,
        headers: dict[str, str],
        content: bytes,
    ) -> tuple[int, dict[str, Any]]:
        """POST ``content`` to ``url`` and return
        ``(status_code, parsed_json_body)``. Non-JSON responses come
        back as ``{"raw": <truncated text>}``."""
        ...


class HttpxEmailTransport:
    """Production transport — one httpx request per send.

    No connection pooling across sends: email volume is low enough
    that a fresh client per call keeps lifecycle management trivial
    (nothing to close at shutdown)."""

    def __init__(self, timeout: float = _DEFAULT_TIMEOUT) -> None:
        self._timeout = timeout

    async def post(
        self,
        url: str,
        *,
        headers: dict[str, str],
        content: bytes,
    ) -> tuple[int, dict[str, Any]]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(url, headers=headers, content=content)
        try:
            body = response.json()
        except ValueError:
            body = {"raw": response.text[:512]}
        if not isinstance(body, dict):
            body = {"raw": repr(body)[:512]}
        return response.status_code, body
