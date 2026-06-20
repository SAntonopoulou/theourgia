"""Zero-telemetry verifier tests.

If any of these tests fail, Theourgia's "zero telemetry by default"
promise has regressed and we must not ship until the cause is
understood (intentional opt-in extension vs. accidental default).
"""

from __future__ import annotations

import pytest

from theourgia.scripts.verify_zero_telemetry import (
    DEFAULT_BLOCKLIST,
    VerifierResult,
    verify_zero_telemetry,
)


def test_verify_passes_on_stock_install() -> None:
    """The CLI verifier must report PASS on this repo at HEAD."""
    result = verify_zero_telemetry()
    assert result.passed, result.render()


def test_blocklist_contains_known_telemetry_sdks() -> None:
    """The blocklist must include the well-known analytics SDKs we
    want to keep out of the default install. If anyone removes an
    entry, this test forces a conversation."""
    for required in ("mixpanel", "posthog", "amplitude", "segment_analytics"):
        assert required in DEFAULT_BLOCKLIST, (
            f"{required!r} dropped from telemetry blocklist — was that "
            f"intentional? If so, update this test too."
        )


def test_meta_endpoint_returns_telemetry_none(stock_env: None) -> None:
    """Stock app: GET /api/v1/meta reports telemetry: "none"."""
    _ = stock_env
    from fastapi.testclient import TestClient

    from theourgia.api.app import create_app

    app = create_app()
    client = TestClient(app)
    response = client.get("/api/v1/meta")
    assert response.status_code == 200
    body = response.json()
    assert body["telemetry"] == "none"


def test_sentry_off_when_dsn_not_set(stock_env: None) -> None:
    """Stock config (no SENTRY_DSN) must not initialize Sentry."""
    _ = stock_env
    from theourgia.core.config import get_settings
    from theourgia.core.observability.sentry import init_sentry

    settings = get_settings()
    assert init_sentry(settings) is False


def test_verifier_returns_structured_result() -> None:
    result = verify_zero_telemetry()
    assert isinstance(result, VerifierResult)
    assert isinstance(result.passed, bool)
    assert isinstance(result.failures, tuple)


def test_verifier_detects_blocklist_violation() -> None:
    """If a blocklisted module *were* importable, the verifier must
    flag it. We simulate by injecting a fake module."""
    import sys
    import types

    fake_name = "totally_fake_telemetry_for_test_zero_telemetry_xyz"
    sys.modules[fake_name] = types.ModuleType(fake_name)
    try:
        result = verify_zero_telemetry(blocklist=(fake_name,))
        assert not result.passed
        assert any(fake_name in f for f in result.failures)
    finally:
        sys.modules.pop(fake_name, None)


def test_verifier_can_be_invoked_as_main() -> None:
    """``python -m theourgia.scripts.verify_zero_telemetry`` exits 0 on a
    healthy repo. We invoke ``main`` directly to avoid spawning a
    subprocess."""
    from theourgia.scripts.verify_zero_telemetry import main

    assert main([]) == 0
