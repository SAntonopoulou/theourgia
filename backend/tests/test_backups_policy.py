"""Tests for the backup retention policy."""

from __future__ import annotations

import pytest

from theourgia.core.backups.policy import DEFAULT_POLICY, RetentionPolicy


def test_default_policy_keeps_something() -> None:
    assert DEFAULT_POLICY.keeps_anything


def test_default_policy_values() -> None:
    assert DEFAULT_POLICY.keep_last == 5
    assert DEFAULT_POLICY.keep_hourly == 24
    assert DEFAULT_POLICY.keep_daily == 7
    assert DEFAULT_POLICY.keep_weekly == 4
    assert DEFAULT_POLICY.keep_monthly == 12
    assert DEFAULT_POLICY.keep_yearly == 5


def test_to_restic_args_default() -> None:
    args = DEFAULT_POLICY.to_restic_args()
    assert "--keep-last" in args
    assert "5" in args
    assert "--keep-hourly" in args
    assert "24" in args
    assert "--keep-daily" in args
    assert "7" in args
    assert "--keep-weekly" in args
    assert "4" in args
    assert "--keep-monthly" in args
    assert "12" in args
    assert "--keep-yearly" in args


def test_zero_rules_omitted_from_args() -> None:
    policy = RetentionPolicy(
        keep_last=3,
        keep_hourly=0,
        keep_daily=0,
        keep_weekly=2,
        keep_monthly=0,
        keep_yearly=0,
    )
    args = policy.to_restic_args()
    assert "--keep-last" in args
    assert "--keep-weekly" in args
    assert "--keep-hourly" not in args
    assert "--keep-daily" not in args
    assert "--keep-monthly" not in args
    assert "--keep-yearly" not in args


def test_keep_tags_emitted() -> None:
    policy = RetentionPolicy(keep_tags=("important", "manual"))
    args = policy.to_restic_args()
    assert "--keep-tag" in args
    assert "important" in args
    assert "manual" in args


def test_keep_tags_does_not_satisfy_keeps_anything_alone() -> None:
    """``keeps_anything`` accepts a tags-only policy as 'keeps something'."""
    policy_with_tags_only = RetentionPolicy(
        keep_last=0,
        keep_hourly=0,
        keep_daily=0,
        keep_weekly=0,
        keep_monthly=0,
        keep_yearly=0,
        keep_tags=("manual",),
    )
    assert policy_with_tags_only.keeps_anything


def test_all_zeros_policy_keeps_nothing() -> None:
    nothing = RetentionPolicy(
        keep_last=0,
        keep_hourly=0,
        keep_daily=0,
        keep_weekly=0,
        keep_monthly=0,
        keep_yearly=0,
        keep_tags=(),
    )
    assert not nothing.keeps_anything


@pytest.mark.parametrize(
    "field",
    [
        "keep_last",
        "keep_hourly",
        "keep_daily",
        "keep_weekly",
        "keep_monthly",
        "keep_yearly",
    ],
)
def test_negative_value_rejected(field: str) -> None:
    with pytest.raises(ValueError, match=f"{field} must be >= 0"):
        RetentionPolicy(**{field: -1})  # type: ignore[arg-type]


def test_policy_is_frozen() -> None:
    p = RetentionPolicy(keep_last=3)
    with pytest.raises(Exception):  # FrozenInstanceError
        p.keep_last = 99  # type: ignore[misc]
