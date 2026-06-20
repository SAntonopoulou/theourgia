"""Theourgia authentication primitives.

This package wraps the underlying password / TOTP / token machinery so
that the rest of the codebase never imports ``argon2-cffi``, ``hmac``,
or ``secrets`` directly for auth purposes.

Modules:

- :mod:`passwords` — Argon2id password hashing
- :mod:`totp` — TOTP 2FA + backup codes (RFC 6238 / RFC 4226)
- :mod:`tokens` — opaque random tokens (sessions, password reset)
- :mod:`lockout` — exponential-backoff account lockout
"""

from __future__ import annotations
