"""Signed outbound HTTP delivery primitive — Phase 12.5.

Composes the existing RFC 9421 HTTP-signature signer with an
``httpx``-based POST. This is the LOWEST level of the federation
outbound layer — a single attempt, no retry, no queue. A higher-level
delivery worker stacks on top to manage retries, dead-letter
handling, and per-peer backoff.

Usage::

    from theourgia.core.federation.outbound import deliver

    result = await deliver(
        url="https://aurora.example/inbox",
        body_json={"type": "Note", ...},
        sender_keyid="did:theourgia:hearth.sophia.example",
        sender_private_key=instance_keypair.private_key,
    )
    if not result.ok:
        # The caller decides whether to enqueue a retry.
        ...

The function NEVER raises on transport failure — it returns a
:class:`DeliveryResult` carrying the outcome. Network errors are
caught and surfaced as ``DeliveryResult(ok=False, status=None,
error=…)`` so the caller can branch cleanly.

Honesty rules wired:

  · The function is a no-op when ``settings.federation_transport_enabled``
    is False — returns ``DeliveryResult(ok=False, status=None,
    error='transport disabled')``. Defence in depth on top of the
    inbox-side gate.
  · The body is JSON-encoded ONCE (canonical encoding) — same bytes
    are hashed for the Content-Digest header AND posted as the
    request body. Otherwise the recipient's verifier would reject.
  · The signature includes ``content-digest``, ``host``, and ``date``
    headers (DEFAULT_COMPONENTS).
"""

from __future__ import annotations

import json
import logging
from collections.abc import Mapping
from dataclasses import dataclass
from time import time
from urllib.parse import urlparse

import httpx
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from theourgia.core.config import get_settings
from theourgia.core.federation.http_signatures import (
    DEFAULT_COMPONENTS,
    SignedRequestComponents,
    content_digest_header,
    sign_request,
)

__all__ = ["DeliveryResult", "deliver"]


_log = logging.getLogger(__name__)


@dataclass(slots=True)
class DeliveryResult:
    """Outcome of a single delivery attempt. NEVER raises."""

    ok: bool
    status: int | None
    error: str | None
    body_excerpt: str | None = None


_DEFAULT_TIMEOUT_S = 30.0


def _canonical_body(body: object) -> bytes:
    """Encode the body to canonical UTF-8 JSON.

    Sorted keys + no extraneous whitespace. The same bytes are hashed
    + posted; otherwise the verifier rejects on digest mismatch.
    """
    if isinstance(body, (bytes, bytearray)):
        return bytes(body)
    return json.dumps(
        body, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
    ).encode("utf-8")


async def deliver(
    *,
    url: str,
    body_json: object,
    sender_keyid: str,
    sender_private_key: Ed25519PrivateKey,
    extra_headers: Mapping[str, str] | None = None,
    timeout_seconds: float = _DEFAULT_TIMEOUT_S,
) -> DeliveryResult:
    """Sign + POST a federation message.

    Returns a :class:`DeliveryResult`. Never raises — transport errors
    are caught and surfaced via the result.
    """
    settings = get_settings()
    if not settings.federation_transport_enabled:
        return DeliveryResult(
            ok=False, status=None, error="transport disabled",
        )

    parsed = urlparse(url)
    scheme_ok = parsed.scheme == "https" or (
        parsed.scheme == "http" and settings.federation_allow_insecure_http
    )
    if not scheme_ok:
        return DeliveryResult(
            ok=False, status=None, error="non-HTTPS URL",
        )
    if not parsed.netloc:
        return DeliveryResult(
            ok=False, status=None, error="invalid URL",
        )

    body = _canonical_body(body_json)
    headers: dict[str, str] = {
        "Host": parsed.netloc,
        "Content-Type": "application/activity+json",
        "Content-Digest": content_digest_header(body),
    }
    if extra_headers:
        headers.update(dict(extra_headers))

    path = parsed.path + (f"?{parsed.query}" if parsed.query else "")
    components = SignedRequestComponents(
        method="POST",
        path=path,
        headers=headers,
        components=DEFAULT_COMPONENTS,
    )
    created = int(time())
    sig_headers = sign_request(
        private_key=sender_private_key,
        keyid=sender_keyid,
        components=components,
        created=created,
    )
    headers.update(sig_headers)

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(url, content=body, headers=headers)
    except httpx.TimeoutException:
        return DeliveryResult(
            ok=False, status=None, error="timeout",
        )
    except httpx.HTTPError as exc:
        return DeliveryResult(
            ok=False, status=None, error=f"transport error: {exc}",
        )
    except Exception as exc:  # noqa: BLE001 — transport must never raise
        _log.exception("federation outbound: unexpected error")
        return DeliveryResult(
            ok=False, status=None, error=f"unexpected: {exc.__class__.__name__}",
        )

    excerpt = response.text[:200] if response.text else None
    return DeliveryResult(
        ok=200 <= response.status_code < 300,
        status=response.status_code,
        error=None if 200 <= response.status_code < 300 else f"HTTP {response.status_code}",
        body_excerpt=excerpt,
    )
