"""Background reaper — operator-runnable cleanup script.

Sweeps state that has aged out of its grace window:

  · Federation nonces past ``expires_at`` (Phase 12.5).
  · User accounts past their ``scheduled_for_deletion_at`` (H10 Cluster B3,
    rule 46 — 30-day grace period).

Designed to run as a cron job or systemd timer (every 5 minutes for
nonces, daily for deletions). The script is idempotent — running it
twice in a row does the same thing as running it once.

Usage::

    python -m theourgia.scripts.reaper [--once] [--nonces-only|--deletions-only]

Without flags, the script enters a loop that ticks once per minute
and exits cleanly on SIGTERM. With ``--once`` it does a single sweep
and exits.

NOTE: account deletion is not yet wired to the GDPRService.
delete_user_data — this script logs the would-delete users until the
deletion wire is exercised end-to-end with an integration test that
seeds + sweeps. Once that test lands, the LOG statement becomes a
call into the service. The schedule is unchanged.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.db import session_scope
from theourgia.core.federation.replay_store import purge_expired
from theourgia.models.identity import User


_log = logging.getLogger("theourgia.reaper")


async def reap_nonces(session: AsyncSession) -> int:
    """Delete federation nonces past their expiry. Returns the count."""
    count = await purge_expired(session)
    if count > 0:
        _log.info("reaper.nonces_purged", extra={"count": count})
    return count


async def reap_deletions(session: AsyncSession) -> int:
    """Find users past their deletion grace window and process them.

    For v1, this LOGS the users (without acting) so an operator can
    inspect the candidate set before flipping to the destructive path.
    A follow-on commit replaces the log with the
    ``GDPRService.delete_user_data`` call + the user-row hard delete.
    """
    now = datetime.now(tz=UTC)
    rows = list(
        (
            await session.execute(
                select(User).where(
                    User.scheduled_for_deletion_at.is_not(None),
                    User.scheduled_for_deletion_at < now,
                )
            )
        ).scalars().all()
    )
    for row in rows:
        _log.warning(
            "reaper.deletion_candidate",
            extra={
                "user_id": str(row.id),
                "scheduled_for": (
                    row.scheduled_for_deletion_at.isoformat()
                    if row.scheduled_for_deletion_at
                    else None
                ),
            },
        )
    return len(rows)


async def sweep_once(
    *, do_nonces: bool, do_deletions: bool,
) -> tuple[int, int]:
    """Run one sweep cycle. Returns (nonces_purged, deletion_candidates)."""
    nonces_count = 0
    deletions_count = 0
    async with session_scope() as session:
        if do_nonces:
            nonces_count = await reap_nonces(session)
        if do_deletions:
            deletions_count = await reap_deletions(session)
    return nonces_count, deletions_count


async def main() -> int:
    parser = argparse.ArgumentParser(description="Theourgia background reaper")
    parser.add_argument(
        "--once", action="store_true", help="single sweep then exit",
    )
    parser.add_argument(
        "--nonces-only", action="store_true",
    )
    parser.add_argument(
        "--deletions-only", action="store_true",
    )
    parser.add_argument(
        "--interval-seconds", type=int, default=60,
        help="loop interval (only used without --once)",
    )
    args = parser.parse_args()

    do_nonces = not args.deletions_only
    do_deletions = not args.nonces_only

    logging.basicConfig(level=logging.INFO)

    if args.once:
        nonces, deletions = await sweep_once(
            do_nonces=do_nonces, do_deletions=do_deletions,
        )
        _log.info(
            "reaper.once",
            extra={"nonces": nonces, "deletion_candidates": deletions},
        )
        return 0

    _log.info("reaper.start", extra={"interval_s": args.interval_seconds})
    while True:
        try:
            await sweep_once(
                do_nonces=do_nonces, do_deletions=do_deletions,
            )
        except Exception:  # noqa: BLE001 — never crash the reaper loop
            _log.exception("reaper.tick_failed")
        await asyncio.sleep(args.interval_seconds)


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
