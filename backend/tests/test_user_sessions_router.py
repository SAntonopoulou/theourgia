"""Per-user sessions router — schema + helper tests.

Schema invariants:

  · SessionRead is extra-forbidden + ONLY carries device-friendly
    fields (rule 48). No `user_agent` raw string, no `token_hash`.
  · Device-label derivation handles known browsers + mobile heuristic.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.user_sessions import (
    SessionRead,
    SessionsListResponse,
    _browser,
    _device,
    _device_label,
)


def test_session_read_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        SessionRead(  # type: ignore[call-arg]
            id="x",
            device_label="Laptop · Firefox",
            ip_address="127.0.0.1",
            created_at="2026-06-27T00:00:00Z",  # type: ignore[arg-type]
            last_used_at="2026-06-27T00:00:00Z",  # type: ignore[arg-type]
            expires_at="2026-07-27T00:00:00Z",  # type: ignore[arg-type]
            is_current=True,
            sneaky=True,
        )


def test_session_read_no_token_hash() -> None:
    """Rule 48 — the shape never carries raw token data."""
    fields = SessionRead.model_fields
    assert "token_hash" not in fields
    assert "user_agent" not in fields


def test_sessions_list_response_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        SessionsListResponse(  # type: ignore[call-arg]
            sessions=[],
            sneaky=True,
        )


def test_browser_detection() -> None:
    assert _browser("Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/123.0") == "Firefox"
    assert _browser("Mozilla/5.0 ... Chrome/120.0.0.0") == "Chrome"
    assert _browser("Mozilla/5.0 ... Safari/605.1.15") == "Safari"
    assert _browser("curl/7.0") == "Browser"


def test_device_heuristic() -> None:
    assert _device("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)") == "phone"
    assert _device("Mozilla/5.0 (Linux; Android 13)") == "phone"
    assert _device("Mozilla/5.0 (X11; Linux)") == "laptop"


def test_device_label_combines() -> None:
    label = _device_label(
        "Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/123.0",
    )
    assert label == "Laptop · Firefox"
    assert _device_label("") == "Unknown device"
