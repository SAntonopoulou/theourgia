"""Per-run cost accumulator.

The cost cap (`core/cost_cap.py`) decides at-wake whether to allow a
run, holding back a reservation against the monthly budget. As the run
executes, the subprocess (or its supervisor wrapper) reports actual
token + USD spend in chunks; this module aggregates the chunks into
the run's running total and exposes the live number for the C7 monitor.

When the run ends, the actual total replaces the reservation in the
month-spent rollup (the difference is refunded back to the cap budget).

Inputs come from one of:

  * the wrapped `claude` CLI's `--output-format json` lines (production)
  * a fake reporter in tests

Outputs are written back to the AgentRun row and emitted to the SSE
stream as `cost` events for the C7 'cost so far' chip.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from decimal import Decimal


__all__ = [
    "CostSample",
    "CostAccumulator",
    "CostExceededReservation",
]


@dataclass(slots=True, frozen=True)
class CostSample:
    """One incremental cost report — typically one model-API call."""

    tokens_in: int
    tokens_out: int
    tokens_cache: int
    tokens_fresh: int
    """Tokens in the fresh portion of the context (rule 58 — fresh and
    resume are reported separately so the C7 monitor can render the
    split honestly)."""
    tokens_resume: int
    cost_usd: Decimal


class CostExceededReservation(Exception):
    """Actual cost has passed the reservation — the supervisor should
    terminate the run before the magician is charged beyond what they
    OK'd at install time.

    The exception carries the surplus so the SSE stream can emit a
    `cost-cap-halt` event with verbatim copy.
    """

    def __init__(
        self,
        *,
        reservation_usd: Decimal,
        spent_usd: Decimal,
    ) -> None:
        super().__init__(
            f"actual cost {spent_usd} USD exceeded reservation "
            f"{reservation_usd} USD",
        )
        self.reservation_usd = reservation_usd
        self.spent_usd = spent_usd


@dataclass(slots=True)
class CostAccumulator:
    """Running total for one agent run.

    Thread-safe across `asyncio.Task`s on the same event loop via the
    internal lock; the SSE stream reads `snapshot()` without contention.
    """

    reservation_usd: Decimal
    tokens_in: int = 0
    tokens_out: int = 0
    tokens_cache: int = 0
    tokens_fresh: int = 0
    tokens_resume: int = 0
    cost_usd: Decimal = Decimal("0")
    _lock: asyncio.Lock = field(default=None, init=False)  # type: ignore[assignment]

    def __post_init__(self) -> None:
        self._lock = asyncio.Lock()

    async def record(self, sample: CostSample) -> None:
        """Add a cost sample. Raises :class:`CostExceededReservation` if
        the running total now exceeds the reservation."""
        async with self._lock:
            self.tokens_in += sample.tokens_in
            self.tokens_out += sample.tokens_out
            self.tokens_cache += sample.tokens_cache
            self.tokens_fresh += sample.tokens_fresh
            self.tokens_resume += sample.tokens_resume
            self.cost_usd += sample.cost_usd
            if self.cost_usd > self.reservation_usd:
                raise CostExceededReservation(
                    reservation_usd=self.reservation_usd,
                    spent_usd=self.cost_usd,
                )

    def snapshot(self) -> dict[str, object]:
        """Read-only view for the SSE 'cost' event + GET /runs/{id}.

        Lock-free intentionally — readers may observe a sample-in-flight
        (cost_usd updated before tokens_in); the C7 monitor refreshes
        often enough that one stale value is harmless. The lock guards
        the WRITE-VS-WRITE race only.
        """
        return {
            "tokens_in": self.tokens_in,
            "tokens_out": self.tokens_out,
            "tokens_cache": self.tokens_cache,
            "tokens_fresh": self.tokens_fresh,
            "tokens_resume": self.tokens_resume,
            "cost_usd": str(self.cost_usd),
            "reservation_usd": str(self.reservation_usd),
            "remaining_usd": str(self.reservation_usd - self.cost_usd),
            "over_reservation": self.cost_usd > self.reservation_usd,
        }
