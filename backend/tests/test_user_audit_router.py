"""Per-user audit log router — schema + helper tests.

End-to-end DB tests live in a follow-on batch with a seeded fixture
vault. Schema invariants:

  · AuditEventRead is extra-forbidden + carries vault_id (federation
    audit log doesn't carry vault_id; this one does because the
    H10 PerUserAuditLog surface needs to scope to user's own vaults).
  · TimeRange is a closed enum.
  · _time_floor returns None for all_time + the right offset for
    the windowed values.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.user_audit import (
    AuditEventRead,
    AuditListResponse,
    _time_floor,
)


def test_audit_event_read_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        AuditEventRead(  # type: ignore[call-arg]
            id="x",
            kind="plugin",
            action="plugin.install",
            actor_id=None,
            hub_id=None,
            vault_id=None,
            outcome="success",
            detail={},
            created_at="2026-06-27T00:00:00Z",  # type: ignore[arg-type]
            sneaky=True,
        )


def test_audit_event_read_carries_vault_id() -> None:
    """Per-user variant — vault_id is included (vs federation audit
    log where it isn't)."""
    e = AuditEventRead(
        id="x",
        kind="plugin",
        action="plugin.install",
        actor_id="some-user-id",
        hub_id=None,
        vault_id="some-vault-id",
        outcome="success",
        detail={},
        created_at=datetime(2026, 6, 27, tzinfo=UTC),
    )
    assert e.vault_id == "some-vault-id"


def test_audit_list_response_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        AuditListResponse(  # type: ignore[call-arg]
            events=[],
            total=0,
            sneaky=True,
        )


def test_time_floor_all_time_is_none() -> None:
    assert _time_floor("all_time") is None


def test_time_floor_7_days_in_past() -> None:
    now = datetime.now(tz=UTC)
    floor = _time_floor("last_7_days")
    assert floor is not None
    delta = now - floor
    assert timedelta(days=6, hours=23) < delta < timedelta(days=7, minutes=1)


def test_time_floor_window_lengths() -> None:
    now = datetime.now(tz=UTC)
    for label, days in [
        ("last_7_days", 7),
        ("last_30_days", 30),
        ("last_90_days", 90),
    ]:
        floor = _time_floor(label)  # type: ignore[arg-type]
        assert floor is not None
        delta = now - floor
        assert (
            timedelta(days=days - 1) < delta < timedelta(days=days, minutes=1)
        )
