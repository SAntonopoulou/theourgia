"""Federation transport — Phase 12.5 + Phase 13.

Schema + helper tests for the replay-nonce store + WebFinger parser.
End-to-end inbox/outbox tests live in a follow-on batch once a second
test instance is available.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from theourgia.api.routers.webfinger import (
    WebFingerLink,
    WebFingerResponse,
    _parse_acct,
)
from theourgia.core.federation.replay_store import (
    DEFAULT_REPLAY_WINDOW,
    ReplayDetectedError,
)


# ── WebFinger acct parser ──────────────────────────────────────────


def test_acct_parser_returns_user_when_host_matches() -> None:
    assert _parse_acct("acct:aspasia@hearth.sophia.example", "hearth.sophia.example") == "aspasia"


def test_acct_parser_rejects_non_acct_resource() -> None:
    with pytest.raises(HTTPException) as exc:
        _parse_acct("mailto:aspasia@hearth.sophia.example", "hearth.sophia.example")
    assert exc.value.status_code == 400


def test_acct_parser_rejects_resource_missing_at() -> None:
    with pytest.raises(HTTPException) as exc:
        _parse_acct("acct:aspasia", "hearth.sophia.example")
    assert exc.value.status_code == 400


def test_acct_parser_404s_when_host_differs() -> None:
    """Defence in depth — we don't disclose whether the user exists on
    another host; we just say not-found."""
    with pytest.raises(HTTPException) as exc:
        _parse_acct(
            "acct:aspasia@some-other-instance.example",
            "hearth.sophia.example",
        )
    assert exc.value.status_code == 404


def test_acct_parser_rejects_empty_user() -> None:
    with pytest.raises(HTTPException) as exc:
        _parse_acct("acct:@hearth.sophia.example", "hearth.sophia.example")
    assert exc.value.status_code == 400


# ── WebFinger response shape ───────────────────────────────────────


def test_webfinger_link_extra_forbidden() -> None:
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        WebFingerLink(  # type: ignore[call-arg]
            rel="self",
            sneaky=True,
        )


def test_webfinger_response_extra_forbidden() -> None:
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        WebFingerResponse(  # type: ignore[call-arg]
            subject="acct:aspasia@hearth.sophia.example",
            sneaky=True,
        )


def test_webfinger_response_serializes_to_jrd_shape() -> None:
    response = WebFingerResponse(
        subject="acct:aspasia@hearth.sophia.example",
        aliases=["https://hearth.sophia.example/users/aspasia"],
        links=[
            WebFingerLink(
                rel="self",
                type="application/activity+json",
                href="https://hearth.sophia.example/users/aspasia",
            ),
        ],
    )
    dumped = response.model_dump(exclude_none=True)
    assert dumped["subject"].startswith("acct:")
    assert dumped["links"][0]["rel"] == "self"
    assert "type" in dumped["links"][0]
    assert "href" in dumped["links"][0]


# ── Replay store contract ──────────────────────────────────────────


def test_replay_window_default_is_five_minutes() -> None:
    assert DEFAULT_REPLAY_WINDOW.total_seconds() == 300


def test_replay_detected_error_carries_key() -> None:
    err = ReplayDetectedError("did:theourgia:example.com:1234:nonce-abc")
    assert err.nonce_key == "did:theourgia:example.com:1234:nonce-abc"
    assert "replay detected" in str(err)
