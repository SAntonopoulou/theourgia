"""Per-user account router — schema + grace period constant tests.

Schema invariants:

  · MeRead / DeletionScheduledRead / DataExportResponse all
    extra-forbidden.
  · GRACE_PERIOD is exactly 30 days (rule 46).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.user_account import (
    DataExportResponse,
    DeletionScheduledRead,
    GRACE_PERIOD,
    MeRead,
)


def test_grace_period_is_thirty_days() -> None:
    """Rule 46 — 30-day grace period is fixed, hardcoded, not configurable."""
    assert GRACE_PERIOD == timedelta(days=30)


_FIXED_CREATED_AT = datetime(2026, 1, 1, tzinfo=UTC)


def test_me_read_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        MeRead(  # type: ignore[call-arg]
            id="x",
            email="x@example.com",
            scheduled_for_deletion_at=None,
            account_created_at=_FIXED_CREATED_AT,
            sneaky=True,
        )


def test_me_read_scheduled_can_be_null() -> None:
    MeRead(
        id="x",
        email="x@example.com",
        scheduled_for_deletion_at=None,
        account_created_at=_FIXED_CREATED_AT,
    )


def test_deletion_scheduled_read_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        DeletionScheduledRead(  # type: ignore[call-arg]
            scheduled_for_deletion_at="2026-07-27T00:00:00Z",  # type: ignore[arg-type]
            sneaky=True,
        )


def test_data_export_response_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        DataExportResponse(  # type: ignore[call-arg]
            archive={},
            sneaky=True,
        )


def test_data_export_response_archive_is_a_dict() -> None:
    # The archive type is dict (not list) — H10 contract.
    DataExportResponse(archive={"schema_version": 1})
