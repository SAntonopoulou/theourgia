"""Differential-privacy primitives tests — b108-2hr.

FEATURES §9 · Cross-magician aggregate analytics DP substrate.

Statistical guarantees are hard to test deterministically, so most
tests use large samples with generous tolerances or seeded runs.
The honesty rules (cohort minimum · epsilon > 0 · post-clip on
counts) get tight regression guards.
"""

from __future__ import annotations

import pytest

from theourgia.core.analytics.differential_privacy import (
    CohortTooSmall,
    InvalidEpsilon,
    NoisyAggregate,
    check_cohort_size,
    laplace_noise,
    noisy_count,
    noisy_mean,
    noisy_sum,
)


# ── Epsilon validation ────────────────────────────────────────────


def test_noisy_count_rejects_zero_epsilon() -> None:
    with pytest.raises(InvalidEpsilon):
        noisy_count(10, epsilon=0)


def test_noisy_count_rejects_negative_epsilon() -> None:
    with pytest.raises(InvalidEpsilon):
        noisy_count(10, epsilon=-0.1)


def test_noisy_count_rejects_nan_epsilon() -> None:
    with pytest.raises(InvalidEpsilon):
        noisy_count(10, epsilon=float("nan"))


def test_noisy_mean_rejects_zero_epsilon() -> None:
    with pytest.raises(InvalidEpsilon):
        noisy_mean([1, 2, 3], epsilon=0, clip_low=0, clip_high=10)


def test_noisy_sum_rejects_zero_epsilon() -> None:
    with pytest.raises(InvalidEpsilon):
        noisy_sum([1, 2, 3], epsilon=0, clip_low=0, clip_high=10)


# ── Cohort size enforcement ───────────────────────────────────────


def test_check_cohort_size_raises_below_threshold() -> None:
    with pytest.raises(CohortTooSmall):
        check_cohort_size(4, 5)


def test_check_cohort_size_ok_at_threshold() -> None:
    # Should NOT raise
    check_cohort_size(5, 5)


def test_noisy_count_refuses_small_cohort() -> None:
    with pytest.raises(CohortTooSmall):
        noisy_count(10, epsilon=1.0, cohort_size=3, min_cohort=5)


def test_noisy_sum_refuses_small_cohort() -> None:
    with pytest.raises(CohortTooSmall):
        noisy_sum([1, 2], epsilon=1.0, clip_low=0, clip_high=10, min_cohort=5)


def test_noisy_mean_refuses_small_cohort() -> None:
    with pytest.raises(CohortTooSmall):
        noisy_mean([1, 2], epsilon=1.0, clip_low=0, clip_high=10, min_cohort=5)


# ── Laplace mechanism sanity ─────────────────────────────────────


def test_laplace_noise_rejects_non_positive_scale() -> None:
    with pytest.raises(ValueError):
        laplace_noise(0)
    with pytest.raises(ValueError):
        laplace_noise(-1)


def test_laplace_noise_is_finite() -> None:
    """Guard against log(0) blowing up. Sample 1000 times, none
    should be infinite or NaN."""
    import math

    for _ in range(1000):
        v = laplace_noise(1.0)
        assert math.isfinite(v)


def test_laplace_noise_mean_approximates_zero() -> None:
    """Over a large sample, the empirical mean of Laplace(0, s)
    should be near 0. Use a generous tolerance for CI stability."""
    n = 5000
    values = [laplace_noise(1.0) for _ in range(n)]
    empirical_mean = sum(values) / n
    # Standard error of the mean for Laplace(0, 1) is ~sqrt(2/n) ≈ 0.02.
    # Allow 5-sigma before flagging (0.10) — a real bug would be way over.
    assert abs(empirical_mean) < 0.10, (
        f"empirical mean {empirical_mean} suspiciously far from 0"
    )


# ── Post-clip on counts ──────────────────────────────────────────


def test_noisy_count_never_returns_negative_value() -> None:
    """Regression guard: even when true count is 0 and noise is
    negative, the returned value is clipped to 0."""
    # Small epsilon = big noise; many trials will hit the negative branch.
    for _ in range(200):
        result = noisy_count(0, epsilon=0.1)
        assert result.value >= 0


# ── Sensitivity + noise scale wiring ─────────────────────────────


def test_noisy_count_scale_equals_one_over_epsilon() -> None:
    """Sensitivity of a count is 1; scale = 1/epsilon. Regression
    guard on the wiring."""
    for epsilon in (0.1, 0.5, 1.0, 2.0):
        result = noisy_count(50, epsilon=epsilon)
        assert result.noise_scale == pytest.approx(1.0 / epsilon)


def test_noisy_sum_scale_equals_clip_range_over_epsilon() -> None:
    result = noisy_sum(
        [1, 2, 3, 4, 5], epsilon=1.0, clip_low=0, clip_high=10,
    )
    assert result.noise_scale == pytest.approx(10.0 / 1.0)


def test_noisy_mean_scale_equals_range_over_n_epsilon() -> None:
    """Sensitivity of mean over n bounded values is (high-low)/n."""
    n = 20
    values = [1.0] * n
    result = noisy_mean(
        values, epsilon=1.0, clip_low=0, clip_high=10,
    )
    assert result.noise_scale == pytest.approx(10.0 / n / 1.0)


# ── Value clipping in sum / mean ─────────────────────────────────


def test_noisy_sum_clips_values_before_aggregating() -> None:
    """A single value of 1000 should be clipped down to 10, so the
    true sum is 30 (three 10s), not 3 * 10 * 100.

    Use large epsilon (small noise) so the returned value is close
    to the clipped true sum."""
    values = [1000, 1000, 1000]
    result = noisy_sum(
        values, epsilon=100.0, clip_low=0, clip_high=10,
    )
    # True clipped sum = 30. Noise scale = 10/100 = 0.1.
    # Value should be within a few sigma of 30.
    assert 25 < result.value < 35


def test_noisy_mean_clips_values_before_aggregating() -> None:
    """Same idea for the mean. Clipping to [0, 5] gives true mean 5
    regardless of the input's raw scale."""
    values = [1000, 1000, 1000, 1000, 1000]
    result = noisy_mean(
        values, epsilon=100.0, clip_low=0, clip_high=5,
    )
    # True clipped mean = 5. Noise scale = 5/5/100 = 0.01.
    # Value very close to 5.
    assert 4.5 < result.value < 5.5


# ── Reject inverted clip ranges ──────────────────────────────────


def test_noisy_sum_rejects_inverted_clip_range() -> None:
    with pytest.raises(ValueError):
        noisy_sum([1, 2, 3], epsilon=1.0, clip_low=10, clip_high=0)


def test_noisy_mean_rejects_inverted_clip_range() -> None:
    with pytest.raises(ValueError):
        noisy_mean([1, 2, 3], epsilon=1.0, clip_low=10, clip_high=0)


# ── Aggregate metadata carries the honesty knobs ─────────────────


def test_aggregate_result_surfaces_epsilon_cohort_size_and_noise_scale() -> None:
    """Regression guard on the honesty rule: the returned aggregate
    MUST carry the epsilon used + the cohort size + the noise scale
    so a reader can judge trustworthiness."""
    fields = NoisyAggregate.__dataclass_fields__.keys()
    assert set(fields) == {"value", "epsilon", "cohort_size", "noise_scale"}


def test_noisy_count_populates_cohort_from_true_count_when_absent() -> None:
    """If the caller omits cohort_size (they're querying a private
    single-vault count where cohort = the count itself), the returned
    metadata still populates the field so the response shape stays
    consistent."""
    result = noisy_count(42, epsilon=1.0)
    assert result.cohort_size == 42


def test_noisy_sum_populates_cohort_from_input_length() -> None:
    result = noisy_sum([1, 2, 3, 4], epsilon=1.0, clip_low=0, clip_high=10)
    assert result.cohort_size == 4


# ── Empty values on noisy_mean ────────────────────────────────────


def test_noisy_mean_raises_on_empty_values() -> None:
    """After the cohort check (min_cohort=0 by default), an empty
    list still can't average — raise a clear error rather than
    dividing by zero."""
    with pytest.raises(ValueError):
        noisy_mean([], epsilon=1.0, clip_low=0, clip_high=10)


# ── Reproducibility notes (documented; not a test) ───────────────
# The noise sampler uses secrets.SystemRandom by design, so results
# are NOT reproducible across runs. If a future batch adds a
# deterministic-mode for testing, tests should switch to seeded RNG
# via dependency injection. Until then, statistical tests use large
# n and generous tolerances.
