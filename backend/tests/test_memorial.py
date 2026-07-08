"""Memorial mode router tests — b108-2hg.

Covers the state-computation helpers (pure functions on the
timestamps) + router surface + schema validation. The full
end-to-end DB flow is covered by the standard router-mount tests.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import memorial as memorial_module
from theourgia.api.routers.v1.memorial import (
    MemorialConfigUpdate,
    _compute_state,
    _days_until_pending,
    _days_until_warning,
)


# ── Router surface ────────────────────────────────────────────────


def test_router_paths_present() -> None:
    paths_methods = {
        (r.path, m)
        for r in memorial_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/memorial/config", "GET") in paths_methods
    assert ("/memorial/config", "PATCH") in paths_methods
    assert ("/memorial/check-in", "POST") in paths_methods
    assert ("/memorial/trigger", "POST") in paths_methods
    assert ("/memorial/reactivate", "POST") in paths_methods


def test_every_route_requires_auth() -> None:
    """All memorial endpoints touch owned rows — auth-required."""
    from theourgia.api.deps import get_current_user

    for route in memorial_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        deps = route.dependant.dependencies
        calls = [d.call for d in deps]
        sub_names: list[str] = []
        for d in deps:
            for sub in d.dependencies:
                if hasattr(sub.call, "__name__"):
                    sub_names.append(sub.call.__name__)
        assert (
            get_current_user in calls
            or "get_current_user" in sub_names
        ), f"{route.path} does not require auth"


# ── State computation ─────────────────────────────────────────────


def _cfg(
    *,
    memorialized_at: datetime | None = None,
    cadence_days: int = 180,
    warning_days: int = 30,
    last_check_in_at: datetime | None = None,
    created_at: datetime | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        memorialized_at=memorialized_at,
        check_in_cadence_days=cadence_days,
        warning_window_days=warning_days,
        last_check_in_at=last_check_in_at,
        created_at=created_at or datetime.now(tz=timezone.utc),
    )


def test_state_memorialized_when_timestamp_set() -> None:
    row = _cfg(memorialized_at=datetime.now(tz=timezone.utc))
    assert _compute_state(row) == "memorialized"


def test_state_active_when_cadence_zero_disables_expiry() -> None:
    row = _cfg(
        cadence_days=0,
        last_check_in_at=datetime.now(tz=timezone.utc) - timedelta(days=3650),
    )
    assert _compute_state(row) == "active"


def test_state_active_when_recent_check_in() -> None:
    row = _cfg(
        last_check_in_at=datetime.now(tz=timezone.utc) - timedelta(days=5),
    )
    assert _compute_state(row) == "active"


def test_state_warning_when_past_cadence() -> None:
    row = _cfg(
        cadence_days=180,
        warning_days=30,
        last_check_in_at=datetime.now(tz=timezone.utc) - timedelta(days=200),
    )
    assert _compute_state(row) == "warning"


def test_state_memorial_pending_when_past_warning_window() -> None:
    row = _cfg(
        cadence_days=180,
        warning_days=30,
        last_check_in_at=datetime.now(tz=timezone.utc) - timedelta(days=300),
    )
    assert _compute_state(row) == "memorial_pending"


def test_state_falls_back_to_created_at_when_no_check_in() -> None:
    """A brand-new config with no check-in yet uses created_at as
    the origin timestamp so the state stays sensible."""
    row = _cfg(
        cadence_days=180,
        last_check_in_at=None,
        created_at=datetime.now(tz=timezone.utc) - timedelta(days=5),
    )
    assert _compute_state(row) == "active"


# ── Countdown helpers ─────────────────────────────────────────────


def test_days_until_warning_none_when_memorialized() -> None:
    row = _cfg(memorialized_at=datetime.now(tz=timezone.utc))
    assert _days_until_warning(row) is None


def test_days_until_warning_none_when_cadence_zero() -> None:
    row = _cfg(cadence_days=0)
    assert _days_until_warning(row) is None


def test_days_until_warning_positive_when_still_active() -> None:
    row = _cfg(
        cadence_days=180,
        last_check_in_at=datetime.now(tz=timezone.utc) - timedelta(days=100),
    )
    v = _days_until_warning(row)
    assert v is not None
    # Roughly 80 days remain until warning fires.
    assert 78 <= v <= 82


def test_days_until_pending_positive_during_warning() -> None:
    row = _cfg(
        cadence_days=180,
        warning_days=30,
        last_check_in_at=datetime.now(tz=timezone.utc) - timedelta(days=195),
    )
    v = _days_until_pending(row)
    assert v is not None
    assert 13 <= v <= 17


# ── Schema validation ─────────────────────────────────────────────


def test_config_update_rejects_negative_cadence() -> None:
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        MemorialConfigUpdate(check_in_cadence_days=-1)


def test_config_update_rejects_absurd_cadence() -> None:
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        MemorialConfigUpdate(check_in_cadence_days=3651)


def test_config_update_rejects_malformed_email() -> None:
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        MemorialConfigUpdate(executor_email="not-an-email")


def test_config_update_accepts_empty_patch() -> None:
    """An empty PATCH is a legal no-op; used by the UI to refresh
    the surface without mutating anything."""
    u = MemorialConfigUpdate()
    assert u.model_dump(exclude_unset=True) == {}


def test_config_update_supports_disable_cadence_via_zero() -> None:
    u = MemorialConfigUpdate(check_in_cadence_days=0)
    assert u.model_dump(exclude_unset=True) == {"check_in_cadence_days": 0}
