"""Setup status endpoint tests — b108-2hf.

FEATURES §12 · web-based first-run wizard. The endpoint is public
(no auth required) and answers whether the vault has any users yet.
"""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import first_run as first_run_module
from theourgia.api.routers.v1.first_run import SetupStatus


def test_setup_status_endpoint_registered() -> None:
    paths_methods = {
        (r.path, m)
        for r in first_run_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/setup/status", "GET") in paths_methods


def test_setup_status_endpoint_is_public() -> None:
    """Setup detection MUST be reachable without a session cookie —
    the wizard is a signed-out surface. Regression guard: this test
    fails the moment someone adds a CurrentUser dep to the endpoint."""
    from theourgia.api.deps import get_current_user

    for route in first_run_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        deps = route.dependant.dependencies
        calls = [d.call for d in deps]
        sub_names: list[str] = []
        for d in deps:
            for sub in d.dependencies:
                if hasattr(sub.call, "__name__"):
                    sub_names.append(sub.call.__name__)
        assert get_current_user not in calls
        assert "get_current_user" not in sub_names


def test_setup_status_response_shape() -> None:
    s = SetupStatus(state="empty")
    assert s.state == "empty"
    s2 = SetupStatus(state="provisioned")
    assert s2.state == "provisioned"


def test_setup_status_rejects_unknown_state() -> None:
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        SetupStatus(state="pending")  # type: ignore[arg-type]


def test_setup_status_does_not_leak_allowlist_detail() -> None:
    """Regression guard: the response MUST be limited to the two-state
    enum. Any future addition (like `allowlist_names_hint`) would help
    an attacker enumerate accepted magickal names."""
    fields = set(SetupStatus.model_fields.keys())
    assert fields == {"state"}
