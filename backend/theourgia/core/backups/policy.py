"""Backup retention policy.

A :class:`RetentionPolicy` describes which snapshots Restic should keep
when it runs ``forget --prune``. Values map to Restic's
``--keep-last`` / ``--keep-hourly`` / ``--keep-daily`` / etc. flags.

The default policy is conservative — comfortably enough history to
recover from a problem reported up to a year later, without keeping so
many snapshots that storage cost balloons.
"""

from __future__ import annotations

from dataclasses import dataclass, field

__all__ = ["RetentionPolicy", "DEFAULT_POLICY"]


@dataclass(frozen=True, slots=True)
class RetentionPolicy:
    """Restic retention parameters.

    Values are passed to ``restic forget`` via the corresponding
    ``--keep-*`` flags. Restic applies the rules cumulatively — a
    snapshot is kept if it qualifies under *any* rule.

    Set a field to ``0`` to disable that rule entirely.

    Attributes:
        keep_last: Keep the N most recent snapshots regardless of age.
        keep_hourly: Keep the most recent N hourly snapshots.
        keep_daily: Keep the most recent N daily snapshots.
        keep_weekly: Keep the most recent N weekly snapshots.
        keep_monthly: Keep the most recent N monthly snapshots.
        keep_yearly: Keep the most recent N yearly snapshots.
        keep_tags: Always keep snapshots that carry any of these tags.
    """

    keep_last: int = 5
    keep_hourly: int = 24
    keep_daily: int = 7
    keep_weekly: int = 4
    keep_monthly: int = 12
    keep_yearly: int = 5
    keep_tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        for name in (
            "keep_last",
            "keep_hourly",
            "keep_daily",
            "keep_weekly",
            "keep_monthly",
            "keep_yearly",
        ):
            v = getattr(self, name)
            if v < 0:
                msg = f"{name} must be >= 0, got {v}"
                raise ValueError(msg)

    def to_restic_args(self) -> list[str]:
        """Build the ``--keep-*`` argument list for ``restic forget``."""
        args: list[str] = []
        for flag, value in (
            ("--keep-last", self.keep_last),
            ("--keep-hourly", self.keep_hourly),
            ("--keep-daily", self.keep_daily),
            ("--keep-weekly", self.keep_weekly),
            ("--keep-monthly", self.keep_monthly),
            ("--keep-yearly", self.keep_yearly),
        ):
            if value > 0:
                args.extend([flag, str(value)])
        for tag in self.keep_tags:
            args.extend(["--keep-tag", tag])
        return args

    @property
    def keeps_anything(self) -> bool:
        """Whether at least one retention rule is active.

        An all-zeros policy would tell Restic to keep nothing, which we
        defensively forbid at the call site — :class:`ResticClient.prune`
        refuses to run with such a policy.
        """
        return (
            self.keep_last > 0
            or self.keep_hourly > 0
            or self.keep_daily > 0
            or self.keep_weekly > 0
            or self.keep_monthly > 0
            or self.keep_yearly > 0
            or bool(self.keep_tags)
        )


DEFAULT_POLICY: RetentionPolicy = RetentionPolicy()
"""The project's default retention policy.

Keeps: 5 most recent + 24 hourly + 7 daily + 4 weekly + 12 monthly +
5 yearly. Sufficient to recover from a problem reported up to a year
later; bounded enough that storage cost stays predictable."""
