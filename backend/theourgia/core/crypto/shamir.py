"""Shamir's Secret Sharing over GF(256) — pure Python, no dependencies.

v1-018 · plan/15 §13 — executor key-share for memorial mode. The
magician's client supplies a secret; the server splits it into ``n``
shares of which any ``k`` reconstruct it, returns the shares exactly
once, and stores only a SHA-256 commitment (never the shares, never
the secret). Threat model:
``docs/architecture/memorial-key-share-threat-model.md``.

Scheme
------
Each byte of the secret is shared independently. For byte value ``s``
we pick a random polynomial of degree ``k - 1`` over GF(2^8)::

    f(x) = s + a1*x + a2*x^2 + ... + a_{k-1}*x^{k-1}

with ``a1 .. a_{k-1}`` drawn from ``secrets`` (CSPRNG). Share ``i``
is the point ``(x_i, f(x_i))`` with ``x_i = i`` (``i = 1..n``; ``x = 0``
is never issued because ``f(0)`` IS the secret). Reconstruction is
Lagrange interpolation at ``x = 0`` from any ``k`` distinct points.

Field arithmetic uses the AES polynomial ``x^8 + x^4 + x^3 + x + 1``
(0x11b) — the conventional GF(256) representation, matching the many
existing SSS implementations (e.g. Hashicorp Vault) so shares are
auditable against independent code.

Wire format of a share: ``bytes([x]) || y_bytes`` — one x-coordinate
byte followed by one y byte per secret byte. All shares of a secret
have length ``len(secret) + 1``.

Security argument (information-theoretic)
-----------------------------------------
With ``k - 1`` shares, for EVERY candidate secret byte ``s'`` there
exists exactly one degree-``k-1`` polynomial passing through the
``k - 1`` known points and ``(0, s')``. Since the coefficients were
drawn uniformly at random, every candidate secret is exactly equally
likely given ``k - 1`` shares — they carry literally zero information
about the secret, regardless of computational power. This is Shamir's
original perfect-secrecy property, not a hardness assumption. (The
test suite demonstrates the practical consequence: combining ``k - 1``
shares yields an unrelated value, and only the commitment stored
server-side can tell a correct reconstruction from a wrong one.)

Consequently ``combine`` CANNOT detect an insufficient or tampered
share set by itself — any ``k`` points interpolate to *some* value.
Integrity comes from the caller comparing the reconstruction against
the stored SHA-256 commitment.
"""

from __future__ import annotations

import secrets
from collections.abc import Iterable, Sequence

__all__ = ["combine", "split", "MAX_SHARES"]


MAX_SHARES: int = 255
"""x-coordinates are single non-zero bytes, so at most 255 shares."""


# ── GF(256) arithmetic ────────────────────────────────────────────

_AES_POLY = 0x11B


def _build_tables() -> tuple[list[int], list[int]]:
    """Log/antilog tables over the 0x11b field with generator 3."""
    exp = [0] * 510  # doubled so _gf_mul can skip a modulo
    log = [0] * 256
    x = 1
    for i in range(255):
        exp[i] = x
        log[x] = i
        # multiply x by the generator 3 = x + 1
        x ^= (x << 1) ^ (_AES_POLY if x & 0x80 else 0)
        x &= 0xFF
    for i in range(255, 510):
        exp[i] = exp[i - 255]
    return exp, log


_EXP, _LOG = _build_tables()


def _gf_mul(a: int, b: int) -> int:
    if a == 0 or b == 0:
        return 0
    return _EXP[_LOG[a] + _LOG[b]]


def _gf_div(a: int, b: int) -> int:
    if b == 0:
        raise ZeroDivisionError("division by zero in GF(256)")
    if a == 0:
        return 0
    return _EXP[(_LOG[a] - _LOG[b]) % 255]


def _eval_poly(coeffs: Sequence[int], x: int) -> int:
    """Evaluate a polynomial (coeffs[0] is the constant term) at x,
    via Horner's rule."""
    acc = 0
    for c in reversed(coeffs):
        acc = _gf_mul(acc, x) ^ c
    return acc


# ── Public API ────────────────────────────────────────────────────


def split(secret: bytes, n: int, k: int) -> list[bytes]:
    """Split ``secret`` into ``n`` shares, any ``k`` of which combine
    back to the secret.

    Returns ``n`` byte strings of ``len(secret) + 1`` bytes each
    (leading x-coordinate byte, then one y byte per secret byte).
    Coefficients come from :mod:`secrets` — never a seeded PRNG.
    """
    if not secret:
        raise ValueError("secret must not be empty")
    if not 1 <= k <= n:
        raise ValueError(f"threshold k={k} must satisfy 1 <= k <= n={n}")
    if n > MAX_SHARES:
        raise ValueError(f"n={n} exceeds the maximum of {MAX_SHARES} shares")

    # Per secret byte: coefficients [s, a1, .., a_{k-1}].
    polys = [
        [byte, *(secrets.randbelow(256) for _ in range(k - 1))]
        for byte in secret
    ]
    return [
        bytes([x]) + bytes(_eval_poly(poly, x) for poly in polys)
        for x in range(1, n + 1)
    ]


def combine(shares: Iterable[bytes]) -> bytes:
    """Reconstruct the secret from ``k`` (or more) shares.

    Interpolates at ``x = 0``. NOTE: with fewer than ``k`` genuine
    shares this still returns *a* value — a uniformly-random-looking
    wrong one (see the module docstring). Callers must verify the
    result against the stored commitment.
    """
    share_list = list(shares)
    if not share_list:
        raise ValueError("combining requires at least one share")
    lengths = {len(s) for s in share_list}
    if len(lengths) != 1:
        raise ValueError("shares have inconsistent lengths")
    if lengths.pop() < 2:
        raise ValueError("shares are too short to carry a secret")
    xs = [s[0] for s in share_list]
    if 0 in xs:
        raise ValueError("share has forbidden x-coordinate 0")
    if len(set(xs)) != len(xs):
        raise ValueError("shares contain duplicate x-coordinates")

    secret_len = len(share_list[0]) - 1
    out = bytearray(secret_len)
    for byte_idx in range(secret_len):
        acc = 0
        for i, share_i in enumerate(share_list):
            x_i = share_i[0]
            y_i = share_i[1 + byte_idx]
            # Lagrange basis at x=0: prod_{j != i} x_j / (x_j ^ x_i)
            num = 1
            den = 1
            for j, share_j in enumerate(share_list):
                if i == j:
                    continue
                x_j = share_j[0]
                num = _gf_mul(num, x_j)
                den = _gf_mul(den, x_j ^ x_i)
            acc ^= _gf_mul(y_i, _gf_div(num, den))
        out[byte_idx] = acc
    return bytes(out)
