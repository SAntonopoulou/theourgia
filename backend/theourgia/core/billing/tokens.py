"""Download token helpers (B127).

Per ``plan/10-batches-backend.md`` § B127.

Cryptographically signed single-use download tokens. The token is
32 bytes of URL-safe randomness; the signature is HMAC-SHA256 over
the token + the purchase id. Verification rejects on signature
mismatch OR on the per-row ``download_count_limit`` / expiry.

Honesty rules:
  * **30-day default expiry.** Generous, but bounded.
  * **5-download default limit.** The buyer may have multiple
    devices.
  * **No DRM.** The token is the only key needed; we don't
    fingerprint the device or call home.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

__all__ = [
    "DEFAULT_DOWNLOAD_COUNT_LIMIT",
    "DEFAULT_TOKEN_TTL",
    "generate_download_token",
    "sign_download_token",
    "verify_download_token",
]


DEFAULT_TOKEN_TTL = timedelta(days=30)
DEFAULT_DOWNLOAD_COUNT_LIMIT = 5


def generate_download_token() -> str:
    """Return a 32-byte URL-safe random token (43 base64 chars)."""
    return secrets.token_urlsafe(32)


def sign_download_token(
    token: str, purchase_id: str, signing_key: str,
) -> str:
    """HMAC-SHA256 the token + purchase id with the app's
    signing key. Returns a hex digest the route appends to the
    download URL."""
    msg = f"{token}:{purchase_id}".encode("utf-8")
    return hmac.new(
        signing_key.encode("utf-8"),
        msg,
        hashlib.sha256,
    ).hexdigest()


def verify_download_token(
    token: str,
    purchase_id: str,
    signature: str,
    signing_key: str,
) -> bool:
    """Verify the signature matches. Constant-time compare to dodge
    timing attacks. Does NOT enforce expiry or download-count —
    the route owns those checks against the live DB row."""
    expected = sign_download_token(token, purchase_id, signing_key)
    return hmac.compare_digest(expected, signature)


def fresh_expiry(now: datetime | None = None) -> datetime:
    """The default expiry, 30 days from ``now`` (or :func:`datetime.now`
    in UTC)."""
    n = now or datetime.now(tz=timezone.utc)
    return n + DEFAULT_TOKEN_TTL
