"""CostAccumulator + CostSample tests."""

from __future__ import annotations

from decimal import Decimal

import pytest

from theourgia_agent.runs.cost import (
    CostAccumulator,
    CostExceededReservation,
    CostSample,
)


@pytest.mark.asyncio
async def test_record_single_sample_updates_totals() -> None:
    acc = CostAccumulator(reservation_usd=Decimal("1.00"))
    await acc.record(
        CostSample(
            tokens_in=100,
            tokens_out=50,
            tokens_cache=20,
            tokens_fresh=80,
            tokens_resume=20,
            cost_usd=Decimal("0.10"),
        ),
    )
    snap = acc.snapshot()
    assert snap["tokens_in"] == 100
    assert snap["tokens_out"] == 50
    assert snap["tokens_cache"] == 20
    assert snap["tokens_fresh"] == 80
    assert snap["tokens_resume"] == 20
    assert snap["cost_usd"] == "0.10"
    assert snap["remaining_usd"] == "0.90"
    assert snap["over_reservation"] is False


@pytest.mark.asyncio
async def test_multiple_samples_accumulate() -> None:
    acc = CostAccumulator(reservation_usd=Decimal("5.00"))
    for _ in range(3):
        await acc.record(
            CostSample(
                tokens_in=10, tokens_out=5, tokens_cache=0,
                tokens_fresh=10, tokens_resume=0,
                cost_usd=Decimal("0.20"),
            ),
        )
    snap = acc.snapshot()
    assert snap["tokens_in"] == 30
    assert snap["cost_usd"] == "0.60"


@pytest.mark.asyncio
async def test_record_raises_when_cost_exceeds_reservation() -> None:
    acc = CostAccumulator(reservation_usd=Decimal("1.00"))
    with pytest.raises(CostExceededReservation) as exc:
        await acc.record(
            CostSample(
                tokens_in=0, tokens_out=0, tokens_cache=0,
                tokens_fresh=0, tokens_resume=0,
                cost_usd=Decimal("1.50"),
            ),
        )
    assert exc.value.reservation_usd == Decimal("1.00")
    assert exc.value.spent_usd == Decimal("1.50")


@pytest.mark.asyncio
async def test_snapshot_flags_over_reservation_after_threshold() -> None:
    acc = CostAccumulator(reservation_usd=Decimal("1.00"))
    # First sample under reservation — no raise.
    await acc.record(
        CostSample(
            tokens_in=0, tokens_out=0, tokens_cache=0,
            tokens_fresh=0, tokens_resume=0,
            cost_usd=Decimal("0.80"),
        ),
    )
    snap = acc.snapshot()
    assert snap["over_reservation"] is False
    # Second sample puts us over — raises.
    with pytest.raises(CostExceededReservation):
        await acc.record(
            CostSample(
                tokens_in=0, tokens_out=0, tokens_cache=0,
                tokens_fresh=0, tokens_resume=0,
                cost_usd=Decimal("0.40"),
            ),
        )
    snap = acc.snapshot()
    assert snap["over_reservation"] is True
    assert snap["remaining_usd"] == "-0.20"


@pytest.mark.asyncio
async def test_remaining_is_reservation_minus_spent() -> None:
    acc = CostAccumulator(reservation_usd=Decimal("2.00"))
    await acc.record(
        CostSample(
            tokens_in=0, tokens_out=0, tokens_cache=0,
            tokens_fresh=0, tokens_resume=0,
            cost_usd=Decimal("0.75"),
        ),
    )
    snap = acc.snapshot()
    assert snap["remaining_usd"] == "1.25"


@pytest.mark.asyncio
async def test_fresh_vs_resume_tracked_separately() -> None:
    """Rule 58 — fresh and resume MUST be reported separately so the
    C7 monitor can render the split."""
    acc = CostAccumulator(reservation_usd=Decimal("10.00"))
    await acc.record(
        CostSample(
            tokens_in=200, tokens_out=100, tokens_cache=0,
            tokens_fresh=150, tokens_resume=50,
            cost_usd=Decimal("0.20"),
        ),
    )
    await acc.record(
        CostSample(
            tokens_in=200, tokens_out=100, tokens_cache=0,
            tokens_fresh=50, tokens_resume=150,
            cost_usd=Decimal("0.20"),
        ),
    )
    snap = acc.snapshot()
    assert snap["tokens_fresh"] == 200
    assert snap["tokens_resume"] == 200


@pytest.mark.asyncio
async def test_initial_snapshot_is_all_zeros_with_full_reservation() -> None:
    acc = CostAccumulator(reservation_usd=Decimal("3.00"))
    snap = acc.snapshot()
    assert snap["tokens_in"] == 0
    assert snap["cost_usd"] == "0"
    assert snap["remaining_usd"] == "3.00"
    assert snap["over_reservation"] is False


@pytest.mark.asyncio
async def test_record_is_atomic_under_concurrent_samples() -> None:
    """If two `record` coroutines fire concurrently, the totals should
    reflect both — the internal lock prevents lost updates."""
    import asyncio

    acc = CostAccumulator(reservation_usd=Decimal("100.00"))

    async def one() -> None:
        for _ in range(50):
            await acc.record(
                CostSample(
                    tokens_in=1, tokens_out=1, tokens_cache=0,
                    tokens_fresh=1, tokens_resume=0,
                    cost_usd=Decimal("0.01"),
                ),
            )

    await asyncio.gather(one(), one(), one())
    snap = acc.snapshot()
    assert snap["tokens_in"] == 150
    assert snap["cost_usd"] == "1.50"
