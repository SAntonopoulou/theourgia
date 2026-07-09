"""Differential-privacy primitives for cross-magician aggregates.

b108-2hr · FEATURES §9 (Cross-magician aggregate analytics).

Ships the math substrate. Wiring to actual cross-vault data
requires the federation-sharing infrastructure from Phase 12+;
until that lands, this module powers unit-tested primitives that
downstream aggregation endpoints will call.

Design
------

**Laplace mechanism** (Dwork et al. 2006) is used as the default
noise source. Every query provides an ``epsilon`` privacy budget;
the noise scale is ``sensitivity / epsilon``.

**Sensitivity** is the maximum change a single participant can
cause to the true statistic. For a count it's 1. For a mean over
clipped values ``[low, high]`` the sensitivity is
``(high - low) / n``.

**Minimum cohort size** is enforced BEFORE the noise is added. If
the true cohort size is below the threshold, we raise
:class:`CohortTooSmall` and refuse to return any answer — not even
a noised one. That matches the honesty rule: never surface an
aggregate that could re-identify an individual.

Honesty rules
-------------

- ``noisy_count`` MUST NOT return negative counts. We clip at 0
  after adding noise. This is a common post-processing hook; it
  never expands the privacy budget.
- ``noisy_mean`` MUST clip input values BEFORE aggregation. An
  unclipped mean has unbounded sensitivity and provides no
  meaningful privacy guarantee.
- Every function that takes ``epsilon`` accepts only strictly
  positive floats. Passing ``epsilon <= 0`` raises.
"""

from __future__ import annotations

import math
import secrets
from dataclasses import dataclass

__all__ = [
    "CohortTooSmall",
    "InvalidEpsilon",
    "check_cohort_size",
    "laplace_noise",
    "noisy_count",
    "noisy_mean",
    "noisy_sum",
    "NoisyAggregate",
]


class CohortTooSmall(Exception):
    """Raised when the queried cohort is smaller than the configured
    threshold. Never surface an aggregate in this case."""


class InvalidEpsilon(ValueError):
    """Raised when ``epsilon`` is not strictly positive."""


@dataclass(frozen=True)
class NoisyAggregate:
    """The result of a DP query.

    Callers should surface all four fields to the reader so the
    honesty rule holds — the true value is never surfaced but the
    noised value is annotated with the epsilon used, the cohort
    size, and the noise scale, so a reader can judge how much to
    trust it.
    """

    value: float
    epsilon: float
    cohort_size: int
    noise_scale: float


def _check_epsilon(epsilon: float) -> None:
    if not isinstance(epsilon, (int, float)) or epsilon <= 0 or math.isnan(epsilon):
        raise InvalidEpsilon(
            f"epsilon must be a positive real number, got {epsilon!r}",
        )


def check_cohort_size(cohort_size: int, threshold: int) -> None:
    """Enforce the minimum cohort size. Raises :class:`CohortTooSmall`.

    Callers should invoke this BEFORE any query — a passing check
    is a necessary condition for any noised aggregate to be
    returned.
    """
    if cohort_size < threshold:
        raise CohortTooSmall(
            f"cohort size {cohort_size} < threshold {threshold}",
        )


def laplace_noise(scale: float) -> float:
    """Sample from Laplace(0, ``scale``) using cryptographic RNG.

    Uses ``secrets.SystemRandom`` (not ``random``) so the noise
    stream cannot be predicted from a reader's seed. Returning
    zero-noise (``scale <= 0``) is refused — the caller almost
    certainly meant something else.
    """
    if scale <= 0:
        msg = f"noise scale must be positive, got {scale!r}"
        raise ValueError(msg)
    # Inverse-CDF sampling. Draw uniform u in (0, 1), then flip
    # sign based on a fair coin so the distribution stays symmetric.
    rng = secrets.SystemRandom()
    # Avoid the tail exactly at 0 or 1 which would cause log(0).
    u = 0.0
    while u == 0.0 or u == 1.0:
        u = rng.random()
    sign = 1 if rng.random() < 0.5 else -1
    return sign * scale * math.log(1.0 - u) * -1  # -log(1-u) is exponential


def noisy_count(
    true_count: int,
    epsilon: float,
    *,
    cohort_size: int | None = None,
    min_cohort: int = 0,
) -> NoisyAggregate:
    """Return a DP-noised count.

    - Sensitivity is 1 (one participant contributes at most 1 to a count).
    - Post-clip at 0 (counts cannot be negative).
    - If ``cohort_size`` is supplied, ``min_cohort`` is enforced.
    """
    _check_epsilon(epsilon)
    if cohort_size is not None:
        check_cohort_size(cohort_size, min_cohort)
    scale = 1.0 / epsilon
    noised = true_count + laplace_noise(scale)
    if noised < 0:
        noised = 0
    return NoisyAggregate(
        value=noised,
        epsilon=epsilon,
        cohort_size=cohort_size if cohort_size is not None else true_count,
        noise_scale=scale,
    )


def noisy_sum(
    values: list[float],
    epsilon: float,
    *,
    clip_low: float,
    clip_high: float,
    min_cohort: int = 0,
) -> NoisyAggregate:
    """Return a DP-noised sum of clipped values.

    - Each value is clipped to ``[clip_low, clip_high]``.
    - Sensitivity = ``clip_high - clip_low`` (one participant's
      max contribution).
    - No post-clip — the sum may be any real number.
    """
    _check_epsilon(epsilon)
    if clip_high <= clip_low:
        msg = "clip_high must be greater than clip_low"
        raise ValueError(msg)
    check_cohort_size(len(values), min_cohort)
    clipped = [max(clip_low, min(clip_high, v)) for v in values]
    true_sum = sum(clipped)
    sensitivity = clip_high - clip_low
    scale = sensitivity / epsilon
    return NoisyAggregate(
        value=true_sum + laplace_noise(scale),
        epsilon=epsilon,
        cohort_size=len(values),
        noise_scale=scale,
    )


def noisy_mean(
    values: list[float],
    epsilon: float,
    *,
    clip_low: float,
    clip_high: float,
    min_cohort: int = 0,
) -> NoisyAggregate:
    """Return a DP-noised mean of clipped values.

    - Values are clipped BEFORE aggregation.
    - Sensitivity of the mean over an n-sample bounded distribution
      is ``(clip_high - clip_low) / n``.
    """
    _check_epsilon(epsilon)
    if clip_high <= clip_low:
        msg = "clip_high must be greater than clip_low"
        raise ValueError(msg)
    check_cohort_size(len(values), min_cohort)
    if not values:
        # After the cohort check, empty only happens when min_cohort
        # is 0 — still nothing to average.
        raise ValueError("cannot compute mean of empty values")
    clipped = [max(clip_low, min(clip_high, v)) for v in values]
    true_mean = sum(clipped) / len(clipped)
    sensitivity = (clip_high - clip_low) / len(values)
    scale = sensitivity / epsilon
    return NoisyAggregate(
        value=true_mean + laplace_noise(scale),
        epsilon=epsilon,
        cohort_size=len(values),
        noise_scale=scale,
    )
