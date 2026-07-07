"""Auth router shape tests.

Pure schema + slug + route-registration smoke. Live HTTP integration is
exercised by the deploy round-trip (curl against dev.theourgia.com).
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.auth import (
    DemoSignInInput,
    SessionRead,
    _demo_email,
    _slug,
)


def test_slug_collapses_whitespace_and_punctuation() -> None:
    assert _slug("Soror Eva Antonopoulou") == "soror-eva-antonopoulou"
    assert _slug("Soror Ευ. Α.") == "soror"
    assert _slug("!!! ") == "demo"
    assert _slug("") == "demo"


def test_slug_truncates_long_names() -> None:
    out = _slug("a" * 100)
    assert len(out) == 32


def test_demo_email_uses_dev_subdomain() -> None:
    assert _demo_email("Frater Z").endswith("@dev.theourgia.com")


def test_demo_signin_input_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        DemoSignInInput(magickal_name="")


def test_demo_signin_input_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        DemoSignInInput(magickal_name="x", extra="nope")  # type: ignore[call-arg]


def test_session_read_round_trips() -> None:
    from datetime import UTC, datetime
    from uuid import uuid4

    when = datetime(2026, 6, 27, 12, 0, 0, tzinfo=UTC)
    read = SessionRead(
        user_id=str(uuid4()),
        display_name="soror-eva",
        magickal_name="soror-eva",
        vault_id=None,
        expires_at=when,
    )
    dumped = read.model_dump()
    assert dumped["magickal_name"] == "soror-eva"
    assert dumped["vault_id"] is None
    assert dumped["expires_at"] == when


def test_auth_router_is_registered_on_v1() -> None:
    from theourgia.api.app import create_app

    app = create_app()
    schema = app.openapi()
    paths = set(schema["paths"].keys())
    assert "/api/v1/auth/demo-signin" in paths
    assert "/api/v1/auth/session" in paths


# ── Single-operator vault gate (b108-2gs) ─────────────────────────────


def test_allowlist_empty_string_means_open_enrollment() -> None:
    from theourgia.core.config import Settings

    s = Settings(THEOURGIA_ALLOWED_MAGICKAL_NAMES="")
    assert s.allowed_magickal_names_set == frozenset()


def test_allowlist_single_name_normalises_case() -> None:
    from theourgia.core.config import Settings

    s = Settings(THEOURGIA_ALLOWED_MAGICKAL_NAMES="Soror-Eu-A")
    assert s.allowed_magickal_names_set == frozenset({"soror-eu-a"})


def test_allowlist_comma_separated_strips_whitespace() -> None:
    from theourgia.core.config import Settings

    s = Settings(
        THEOURGIA_ALLOWED_MAGICKAL_NAMES=" Soror ,  Frater Z , ,  "
    )
    assert s.allowed_magickal_names_set == frozenset(
        {"soror", "frater z"}
    )


def test_allowlist_lookup_is_case_folded() -> None:
    from theourgia.core.config import Settings

    s = Settings(THEOURGIA_ALLOWED_MAGICKAL_NAMES="Soror-Eu-A")
    allowed = s.allowed_magickal_names_set
    # A user typing any casing of the allowed name is accepted.
    assert "soror-eu-a".casefold() in allowed
    assert "SOROR-EU-A".casefold() in allowed
    assert "Soror-Eu-A".casefold() in allowed
    # Names not on the list are refused.
    assert "someone-else".casefold() not in allowed
