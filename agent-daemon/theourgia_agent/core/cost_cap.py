"""At-wake budget reservation cost-cap enforcement.

Locked with the user 2026-06-28. Algorithm:

  1. Each agent has a `monthly_cost_cap_usd` set at install time
     (rule 56 · hardcoded enforcement, no silent override).
  2. The daemon tracks `month_spent_usd` per agent in the
     `agent_run_summary` table.
  3. When the daemon wakes an agent for a new run, it ESTIMATES the
     run's max spend as `multiplier × avg(last_10_runs_for_kind)`.
     Default multiplier is 1.4× (conservative).
  4. If `month_spent_usd + estimate > cap`: the agent declines to
     wake. The H10 C7 monitor surfaces the verbatim cost-cap halt
     copy.
  5. On run completion, the actual spend replaces the reservation in
     the bookkeeping. If actual < estimate, the difference returns
     to the cap budget.

The cap is HARD — `month_spent_usd >= cap` ALWAYS halts; there is no
"just this once" override anywhere in the daemon.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from theourgia_agent.core.config import get_settings


__all__ = [
    "CapDecision",
    "evaluate_cap",
]


@dataclass(slots=True, frozen=True)
class CapDecision:
    """Whether an agent may wake for a new run."""

    allowed: bool
    reservation_usd: Decimal
    reason: str | None = None


def evaluate_cap(
    *,
    monthly_cap_usd: Decimal,
    month_spent_usd: Decimal,
    recent_run_cost_usd: list[Decimal],
) -> CapDecision:
    """Reserve budget for a new agent run + decide whether to allow.

    `recent_run_cost_usd` is the list of the last N runs' actual
    cost (most-recent first). Empty list → bootstrap estimate of $0
    (any cap > 0 will allow the first run).
    """
    s = get_settings()
    avg = (
        sum(recent_run_cost_usd) / Decimal(len(recent_run_cost_usd))
        if recent_run_cost_usd
        else Decimal("0")
    )
    estimate = avg * Decimal(str(s.cost_cap_estimate_multiplier))

    if month_spent_usd >= monthly_cap_usd:
        return CapDecision(
            allowed=False,
            reservation_usd=Decimal("0"),
            reason=(
                "This agent has reached its monthly cost cap. It will "
                "not run again until next month or until you raise the cap."
            ),
        )

    remaining = monthly_cap_usd - month_spent_usd
    if estimate > remaining:
        return CapDecision(
            allowed=False,
            reservation_usd=Decimal("0"),
            reason=(
                "This run's estimated cost would exceed the remaining "
                "monthly cap. Raise the cap or wait for the next month."
            ),
        )

    return CapDecision(allowed=True, reservation_usd=estimate)
