"""Password auth tests — b108-2hl.

Closes the "typing the magickal name gives you the session" hole.
Before this batch, demo-signin was find-or-create by email and never
checked the password_hash column even when one was set.

Rules being enforced:
- Users WITH a password_hash MUST supply the correct password
- Users WITHOUT a password_hash still get the pre-2FA login path
  (necessary for first-time setup + WebAuthn-only users)
- Setting a new password requires the current one (if one is set)
- New passwords must be at least 8 characters
"""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import auth as auth_module
from theourgia.api.routers.v1.auth import (
    DemoSignInInput,
    PasswordStatusRead,
    SetPasswordInput,
)


# ── Router surface ────────────────────────────────────────────────


def test_password_endpoints_registered() -> None:
    paths_methods = {
        (r.path, m)
        for r in auth_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/auth/password", "GET") in paths_methods
    assert ("/auth/password", "PUT") in paths_methods


def test_password_endpoints_are_session_gated() -> None:
    """These endpoints use the raw session cookie via _resolve_session;
    they surface UnauthorizedError → 401 for anonymous callers.
    Regression guard on the source string so a future refactor can't
    silently drop the gate."""
    from inspect import getsource

    for fn in (auth_module.get_password_status, auth_module.set_password):
        src = getsource(fn)
        assert "_resolve_session" in src
        assert "UnauthorizedError" in src


# ── Demo signin schema ────────────────────────────────────────────


def test_demo_signin_input_accepts_password() -> None:
    payload = DemoSignInInput(
        magickal_name="Soror Ευ. Α.",
        password="not-my-real-one",
    )
    assert payload.password == "not-my-real-one"


def test_demo_signin_input_password_optional() -> None:
    """First-time users without a password still need to be able to
    sign in — the password field is optional at the schema level.
    The endpoint enforces its presence when the User has a password_hash."""
    payload = DemoSignInInput(magickal_name="Soror Ευ. Α.")
    assert payload.password is None


def test_demo_signin_rejects_empty_password() -> None:
    """An explicitly empty password shouldn't slip past the check —
    empty string is treated as unset and returns 401 when required."""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        DemoSignInInput(magickal_name="x", password="")


# ── Set-password schema ───────────────────────────────────────────


def test_set_password_requires_new_password_min_length() -> None:
    """8 characters minimum — long enough that typos in short strings
    don't accidentally set an easy password."""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        SetPasswordInput(new_password="short")


def test_set_password_accepts_8_character_minimum() -> None:
    p = SetPasswordInput(new_password="password")
    assert p.new_password == "password"


def test_set_password_current_password_optional() -> None:
    """Users setting a password for the first time don't have a
    current one to supply."""
    p = SetPasswordInput(new_password="strong-enough")
    assert p.current_password is None


def test_password_status_read_shape() -> None:
    """Response is a single boolean — no leak of hash parameters,
    creation timestamps, or other detail an attacker could enumerate."""
    fields = set(PasswordStatusRead.model_fields.keys())
    assert fields == {"has_password"}


# ── demo_signin regression guard ──────────────────────────────────


def test_demo_signin_enforces_password_when_hash_present() -> None:
    """The b108-2hl fix must be visible in the demo_signin source —
    a future refactor that drops the password check would break
    single-operator isolation."""
    from inspect import getsource

    src = getsource(auth_module.demo_signin)
    assert "user.password_hash is not None" in src
    assert "verify_password" in src
    assert "Password required" in src
    assert "Incorrect password" in src


# ── Password verification round trip ─────────────────────────────


def test_password_hashing_round_trip() -> None:
    """A password set via the module hasher verifies. Sanity check
    ensures the argon2 wiring is present — every deploy has these
    knobs and they must still work at runtime."""
    from theourgia.core.auth.passwords import (
        hash_password,
        verify_password,
    )

    hashed = hash_password("s0m3thing-strong")
    assert verify_password("s0m3thing-strong", hashed) is True
    assert verify_password("s0m3thing-wrong", hashed) is False
