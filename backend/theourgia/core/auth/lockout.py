"""Account lockout with exponential backoff.

After a sequence of failed login attempts, an account is locked for an
escalating duration. The ladder is:

- Attempts 1–4: no lockout (each failure increments the counter)
- Attempt 5:    lock 60 s
- Attempt 10:   lock 5 min
- Attempt 15:   lock 30 min
- Attempt 20:   lock 1 hour
- Beyond 20:    cap at 24 h per attempt

On successful login (correct password + 2FA), the counter resets and
any lockout window clears.

The function :func:`compute_lockout` is pure — it takes a count and
returns a duration, with no I/O. The caller persists the resulting
``locked_until`` to the user row.
"""

from __future__ import annotations

from datetime import datetime, timedelta

__all__ = [
    "LOCKOUT_LADDER",
    "MAX_LOCKOUT",
    "compute_lockout",
    "is_locked",
]


# Threshold → lockout duration applied when ``failed_count >= threshold``.
# Sorted ascending; the highest matching threshold wins.
LOCKOUT_LADDER: dict[int, timedelta] = {
    5: timedelta(seconds=60),
    10: timedelta(minutes=5),
    15: timedelta(minutes=30),
    20: timedelta(hours=1),
}

# Hard cap for absurdly large failed counts. Applied at counts > the
# highest threshold in the ladder.
MAX_LOCKOUT: timedelta = timedelta(hours=24)


def compute_lockout(failed_count: int) -> timedelta | None:
    """Return the lockout duration for the given failed-attempts count.

    Returns ``None`` when no lockout applies (i.e., count below the
    lowest threshold).
    """
    if failed_count < 1:
        return None

    duration: timedelta | None = None
    for threshold in sorted(LOCKOUT_LADDER):
        if failed_count >= threshold:
            duration = LOCKOUT_LADDER[threshold]

    if duration is None:
        return None

    # Past the top threshold, escalate gradually to the cap. We add
    # MAX_LOCKOUT/20 per extra failure above the top threshold.
    top_threshold = max(LOCKOUT_LADDER)
    if failed_count > top_threshold:
        extra = failed_count - top_threshold
        bonus = MAX_LOCKOUT * extra / 20
        duration = min(MAX_LOCKOUT, duration + bonus)

    return duration


def is_locked(locked_until: datetime | None, now: datetime) -> bool:
    """Whether an account is currently locked at ``now``.

    Returns ``False`` if no lockout is recorded; ``True`` only when the
    lockout window has not yet elapsed.
    """
    if locked_until is None:
        return False
    return now < locked_until
