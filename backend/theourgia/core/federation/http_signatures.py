"""HTTP Message Signatures for federation requests.

A focused subset of RFC 9421 (HTTP Message Signatures). We implement
just enough to sign and verify the requests Theourgia federation
actually sends:

- **Covered components**: ``@method``, ``@path``, ``host``, ``date``,
  ``content-digest`` (when there is a body).
- **Algorithm**: Ed25519 only (``alg="ed25519"``).
- **Signature ID**: a single signature labeled ``sig`` (no multi-sig).
- **Parameters**: ``created`` (Unix timestamp), ``keyid`` (DID),
  ``alg``.

This is not a general-purpose HTTP Signatures library — it's the
specific subset Theourgia federation speaks. Inbound requests with
unknown / unsupported parameters are rejected.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import re
from dataclasses import dataclass, field
from email.utils import parsedate_to_datetime, formatdate
from time import time
from typing import Mapping

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

__all__ = [
    "DEFAULT_COMPONENTS",
    "HTTPSignatureError",
    "SignedRequestComponents",
    "sign_request",
    "verify_request",
    "build_signature_base",
    "content_digest_header",
]

_log = logging.getLogger(__name__)


# Default components for signed Theourgia federation requests.
# Order matters: it defines the canonical signing string.
DEFAULT_COMPONENTS: tuple[str, ...] = (
    "@method",
    "@path",
    "host",
    "date",
)
"""Default covered components when no body is present.

When the request has a body, callers should add ``"content-digest"``
to the list (and set the corresponding header via
:func:`content_digest_header`)."""


# Maximum age of an inbound signature relative to server clock. Helps
# prevent replay; clients with skewed clocks are rejected.
SIGNATURE_MAX_AGE_SECONDS: int = 300
SIGNATURE_MAX_FUTURE_SKEW_SECONDS: int = 60


class HTTPSignatureError(Exception):
    """Raised when signing or verification fails."""


@dataclass(frozen=True, slots=True)
class SignedRequestComponents:
    """Inputs to a sign/verify operation."""

    method: str
    path: str
    headers: Mapping[str, str]
    components: tuple[str, ...] = field(default=DEFAULT_COMPONENTS)


def content_digest_header(body: bytes) -> str:
    """Return the ``Content-Digest`` header value for a given body.

    Format: ``sha-256=:<base64 sha256>:`` per RFC 9530.
    """
    digest = hashlib.sha256(body).digest()
    return f"sha-256=:{base64.b64encode(digest).decode('ascii')}:"


def build_signature_base(
    *,
    method: str,
    path: str,
    headers: Mapping[str, str],
    components: tuple[str, ...],
    created: int,
    keyid: str,
    alg: str = "ed25519",
) -> bytes:
    """Build the canonical signature base per RFC 9421 §2.

    Lines are ``"<component>": <value>`` separated by ``\\n``. The
    trailing line is ``"@signature-params": <params>`` where params is
    the parenthesized component list plus parameter k=v pairs.
    """
    if not components:
        msg = "components must not be empty"
        raise HTTPSignatureError(msg)

    # Normalize header keys for lookup
    lower_headers = {k.lower(): v for k, v in headers.items()}

    lines: list[str] = []
    for c in components:
        if c == "@method":
            value = method.upper()
        elif c == "@path":
            value = path
        elif c.startswith("@"):
            msg = f"unsupported derived component: {c!r}"
            raise HTTPSignatureError(msg)
        else:
            value = lower_headers.get(c.lower())
            if value is None:
                msg = f"missing required header for signature: {c!r}"
                raise HTTPSignatureError(msg)
        lines.append(f'"{c}": {value}')

    # Compose the @signature-params line
    component_list = " ".join(f'"{c}"' for c in components)
    params = f'({component_list});created={created};keyid="{keyid}";alg="{alg}"'
    lines.append(f'"@signature-params": {params}')

    return "\n".join(lines).encode("ascii")


def sign_request(
    *,
    private_key: Ed25519PrivateKey,
    keyid: str,
    components: SignedRequestComponents,
    created: int | None = None,
) -> dict[str, str]:
    """Sign a request and return new headers to add.

    Returns a dict containing ``Signature``, ``Signature-Input``, and
    ``Date`` (the latter set to the ``created`` timestamp if not
    already present in ``components.headers``).

    Callers MERGE the returned headers into their outbound request
    headers. They MUST also include any header values that the
    signature base referenced (e.g., ``Content-Digest`` when bodies are
    signed).
    """
    if created is None:
        created = int(time())

    headers = dict(components.headers)
    # Default Date if not provided
    if "date" not in {k.lower() for k in headers}:
        headers["Date"] = formatdate(timeval=created, usegmt=True)

    base = build_signature_base(
        method=components.method,
        path=components.path,
        headers=headers,
        components=components.components,
        created=created,
        keyid=keyid,
    )
    raw_signature = private_key.sign(base)
    sig_b64 = base64.b64encode(raw_signature).decode("ascii")

    component_list = " ".join(f'"{c}"' for c in components.components)
    signature_input = (
        f'sig=({component_list});created={created};keyid="{keyid}";alg="ed25519"'
    )

    return {
        "Date": headers["Date"] if "Date" in headers else headers.get("date", ""),
        "Signature-Input": signature_input,
        "Signature": f"sig=:{sig_b64}:",
    }


# Parsers for Signature-Input header. The full RFC 9421 grammar is
# elaborate; we accept a small focused subset matching what sign_request
# produces.
_INPUT_RE = re.compile(
    r"^sig=\((?P<components>[^)]*)\);"
    r"created=(?P<created>\d+);"
    r'keyid="(?P<keyid>[^"]+)";'
    r'alg="(?P<alg>[^"]+)"$'
)
_SIGNATURE_RE = re.compile(r"^sig=:(?P<b64>[A-Za-z0-9+/=]+):$")


def verify_request(
    *,
    public_key: Ed25519PublicKey,
    method: str,
    path: str,
    headers: Mapping[str, str],
    expected_keyid: str | None = None,
    now: float | None = None,
) -> None:
    """Verify the signature on an inbound request. Raises on failure.

    The verifier:

    1. Parses the ``Signature-Input`` and ``Signature`` headers.
    2. Rejects unsupported algorithms (anything other than ``ed25519``).
    3. Rejects signatures older than :data:`SIGNATURE_MAX_AGE_SECONDS`
       or further in the future than
       :data:`SIGNATURE_MAX_FUTURE_SKEW_SECONDS`.
    4. Optionally verifies the keyid matches ``expected_keyid``.
    5. Rebuilds the signature base from the request and verifies the
       Ed25519 signature against the supplied public key.
    """
    lower_headers = {k.lower(): v for k, v in headers.items()}

    sig_input = lower_headers.get("signature-input")
    sig_value = lower_headers.get("signature")
    if not sig_input or not sig_value:
        msg = "missing Signature-Input or Signature header"
        raise HTTPSignatureError(msg)

    input_match = _INPUT_RE.match(sig_input)
    if not input_match:
        msg = "malformed Signature-Input header"
        raise HTTPSignatureError(msg)

    if input_match.group("alg") != "ed25519":
        msg = f"unsupported algorithm: {input_match.group('alg')!r}"
        raise HTTPSignatureError(msg)

    if expected_keyid is not None and input_match.group("keyid") != expected_keyid:
        msg = (
            f"keyid mismatch: expected {expected_keyid!r}, "
            f"got {input_match.group('keyid')!r}"
        )
        raise HTTPSignatureError(msg)

    created = int(input_match.group("created"))
    current = now if now is not None else time()
    if created > current + SIGNATURE_MAX_FUTURE_SKEW_SECONDS:
        msg = "signature is from too far in the future (clock skew?)"
        raise HTTPSignatureError(msg)
    if current - created > SIGNATURE_MAX_AGE_SECONDS:
        msg = "signature is too old"
        raise HTTPSignatureError(msg)

    # Parse component list — items are space-separated quoted strings
    components_raw = input_match.group("components")
    components: list[str] = []
    for token in re.findall(r'"([^"]+)"', components_raw):
        components.append(token)
    if not components:
        msg = "Signature-Input contained no covered components"
        raise HTTPSignatureError(msg)

    sig_match = _SIGNATURE_RE.match(sig_value)
    if not sig_match:
        msg = "malformed Signature header"
        raise HTTPSignatureError(msg)

    try:
        raw_signature = base64.b64decode(sig_match.group("b64"), validate=True)
    except Exception as exc:
        msg = "Signature header is not valid base64"
        raise HTTPSignatureError(msg) from exc

    # Rebuild the signature base from request data
    base = build_signature_base(
        method=method,
        path=path,
        headers=headers,
        components=tuple(components),
        created=created,
        keyid=input_match.group("keyid"),
    )

    try:
        public_key.verify(raw_signature, base)
    except InvalidSignature as exc:
        msg = "signature did not verify"
        raise HTTPSignatureError(msg) from exc
