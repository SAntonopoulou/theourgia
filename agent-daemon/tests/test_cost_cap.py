"""At-wake cost-cap evaluator tests.

The cap is HARD — no silent override. These tests verify the gates
that the H10 C7 monitor + the rule-56 chrome rely on.
"""

from __future__ import annotations

from decimal import Decimal

from theourgia_agent.core.cost_cap import evaluate_cap


def test_first_run_with_no_history_allowed_under_any_positive_cap() -> None:
    decision = evaluate_cap(
        monthly_cap_usd=Decimal("10.00"),
        month_spent_usd=Decimal("0"),
        recent_run_cost_usd=[],
    )
    assert decision.allowed is True
    assert decision.reservation_usd == Decimal("0")


def test_at_cap_refuses_to_wake_verbatim_rule_56() -> None:
    decision = evaluate_cap(
        monthly_cap_usd=Decimal("5.00"),
        month_spent_usd=Decimal("5.00"),
        recent_run_cost_usd=[Decimal("0.30")],
    )
    assert decision.allowed is False
    # Rule 56 chrome relies on this exact phrasing in the daemon's
    # cap-decision reason.
    assert "monthly cost cap" in (decision.reason or "")
    assert "no silent override" in (decision.reason or "").lower() or \
           "until you raise the cap" in (decision.reason or "")


def test_over_cap_refuses_to_wake() -> None:
    decision = evaluate_cap(
        monthly_cap_usd=Decimal("5.00"),
        month_spent_usd=Decimal("5.10"),  # bookkeeping rounded up
        recent_run_cost_usd=[Decimal("0.30")],
    )
    assert decision.allowed is False


def test_estimated_overshoot_refuses() -> None:
    """If `month_spent + estimate > cap`, refuse — even if month_spent
    alone is under the cap."""
    decision = evaluate_cap(
        monthly_cap_usd=Decimal("5.00"),
        month_spent_usd=Decimal("4.50"),
        # 5 recent runs averaging $0.80 → estimate ≈ $0.80 × 1.4 = $1.12
        # 4.50 + 1.12 = 5.62 > 5.00 → refuse
        recent_run_cost_usd=[Decimal("0.80")] * 5,
    )
    assert decision.allowed is False
    assert decision.reservation_usd == Decimal("0")


def test_within_estimate_allows_and_reserves() -> None:
    decision = evaluate_cap(
        monthly_cap_usd=Decimal("10.00"),
        month_spent_usd=Decimal("3.00"),
        recent_run_cost_usd=[Decimal("0.40")] * 5,
    )
    assert decision.allowed is True
    # estimate = 0.40 × 1.4 = 0.56
    assert decision.reservation_usd == Decimal("0.56")


def test_reservation_uses_configured_multiplier(monkeypatch) -> None:
    from theourgia_agent.core.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("THEOURGIA_AGENT_COST_CAP_ESTIMATE_MULTIPLIER", "2.0")
    get_settings.cache_clear()

    decision = evaluate_cap(
        monthly_cap_usd=Decimal("10.00"),
        month_spent_usd=Decimal("0"),
        recent_run_cost_usd=[Decimal("0.50")],
    )
    # estimate = 0.50 × 2.0 = 1.00
    assert decision.reservation_usd == Decimal("1.00")
    assert decision.allowed is True

    get_settings.cache_clear()


def test_cap_decision_is_immutable() -> None:
    """The decision dataclass has slots + frozen — callers can't mutate
    it after the cap evaluator returns."""
    from theourgia_agent.core.cost_cap import CapDecision

    decision = CapDecision(
        allowed=True, reservation_usd=Decimal("0.50"),
    )
    import pytest

    with pytest.raises(Exception):
        decision.allowed = False  # type: ignore[misc]
