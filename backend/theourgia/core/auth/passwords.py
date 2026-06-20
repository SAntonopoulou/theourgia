"""Argon2id password hashing.

Wraps ``argon2-cffi``'s :class:`PasswordHasher` with project-tuned
parameters. Parameters target ~100–200ms per hash on modest hardware —
slow enough to deter offline attacks, fast enough not to degrade UX.

The hash includes the algorithm name, version, parameters, salt, and
output, so a stored hash is fully self-describing. Verification works
against legacy parameters too; :func:`needs_rehash` flags hashes that
should be re-generated at next login.

Empty passwords are rejected at the API boundary; the underlying hasher
would accept them but we refuse on principle.
"""

from __future__ import annotations

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

__all__ = ["hash_password", "verify_password", "needs_rehash"]


# Project parameters: same Argon2id grade as Mode B KDF defaults
# (RFC 9106 hybrid). Adjust here if profiling shows the target hardware
# is materially faster/slower than expected.
_HASHER = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MiB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(plain: str) -> str:
    """Return the Argon2id hash of the given password.

    Raises :class:`ValueError` if ``plain`` is empty. The returned string
    is the canonical Argon2 PHC format and is safe to store as-is.
    """
    if not plain:
        msg = "password must not be empty"
        raise ValueError(msg)
    return _HASHER.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a stored hash.

    Returns ``True`` on match, ``False`` on any failure (wrong password,
    malformed hash, or unsupported parameters). Constant-time at the
    Argon2 layer.

    Empty inputs return ``False`` without invoking the hasher.
    """
    if not plain or not hashed:
        return False
    try:
        _HASHER.verify(hashed, plain)
    except (VerifyMismatchError, InvalidHashError):
        return False
    except Exception:
        # Defensive: any unexpected error treated as verification failure
        # rather than propagated. The login pathway records the detail
        # via structured logs, not to the user.
        return False
    return True


def needs_rehash(hashed: str) -> bool:
    """Whether a stored hash should be re-computed at next successful login.

    Returns ``True`` if the hash was created with weaker parameters than
    the current configuration (e.g., after we increase ``time_cost``).
    Callers detect this on a successful verification and re-hash + persist.
    """
    return _HASHER.check_needs_rehash(hashed)
