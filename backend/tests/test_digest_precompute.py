"""Unit tests for the digest tier-2/3 pre-compute helpers.

The helpers themselves are async and touch the DB, so the layer of
unit coverage here focuses on the pure-builder side:

* The new TIER2_CATEGORY_TEMPLATE passes the banned-phrase regex.
* The headline_templates() listing includes it.
* The AnalyticsSnapshot carries the new field as a backwards-
  compatible default-empty list.
* build_digest emits the new tier-2 draft when category candidates
  clear the threshold; it suppresses below threshold; it caps at
  top three.

The route wiring is covered indirectly by the existing digest
integration sweep — running the precompute helpers with an empty
DB returns ``[]`` and the digest ships tier-1 only (preserving the
B124 behaviour).
"""

from __future__ import annotations

from datetime import datetime

import pytest

from theourgia.core.analytics.digest_builder import (
    BANNED_HEADLINE_PHRASES,
    MIN_SAMPLE_PER_TIER_2,
    AnalyticsSnapshot,
    TIER2_CATEGORY_TEMPLATE,
    assert_clean_headline,
    build_digest,
    headline_templates,
)
from theourgia.core.analytics.digest_precompute import (
    TIER2_CATEGORY_TEMPLATE as PRECOMPUTE_TIER2_TEMPLATE,
    TIER3_INTENSITY_WEEKDAY_TEMPLATE,
)


# ── Template parity ──────────────────────────────────────────────


def test_precompute_tier2_template_matches_builder() -> None:
    """The precompute module re-exports the template constant for
    callers that want the canonical wording. The two must stay in
    sync — a future commit that diverges them gets caught here."""
    assert TIER2_CATEGORY_TEMPLATE == PRECOMPUTE_TIER2_TEMPLATE


def test_tier2_category_template_clears_banned_phrase_regex() -> None:
    """Tier-2 headline templates pass the no-modal-language audit."""
    sample = TIER2_CATEGORY_TEMPLATE.format(category="weather", n=15)
    # Should NOT raise.
    assert_clean_headline(sample)


def test_tier3_intensity_weekday_template_clears_banned() -> None:
    sample = TIER3_INTENSITY_WEEKDAY_TEMPLATE.format(r=0.42, n=25)
    assert_clean_headline(sample)


def test_tier2_category_template_in_headline_templates() -> None:
    """``headline_templates()`` is what the banned-phrase audit
    iterates over. The new template must be in the listing."""
    assert TIER2_CATEGORY_TEMPLATE in headline_templates()


# ── AnalyticsSnapshot backwards-compat ───────────────────────────


def test_snapshot_default_category_frequencies_is_empty_list() -> None:
    """Pre-existing callers that don't yet pass category_frequencies
    keep working — the field defaults to []."""
    snap = AnalyticsSnapshot(
        entries_count=5, workings_count=2, syncs_count=3,
    )
    assert snap.category_frequencies == []


def test_snapshot_accepts_category_frequencies() -> None:
    snap = AnalyticsSnapshot(
        entries_count=5, workings_count=2, syncs_count=3,
        category_frequencies=[{"category": "weather", "n": 15}],
    )
    assert snap.category_frequencies == [{"category": "weather", "n": 15}]


# ── build_digest with category frequencies ───────────────────────


def _start_end() -> tuple[datetime, datetime]:
    return (
        datetime(2026, 6, 22),
        datetime(2026, 6, 29),
    )


def test_build_digest_surfaces_category_frequency_above_threshold() -> None:
    ps, pe = _start_end()
    snap = AnalyticsSnapshot(
        entries_count=0, workings_count=0, syncs_count=15,
        category_frequencies=[
            {"category": "weather", "n": MIN_SAMPLE_PER_TIER_2},
        ],
    )
    _, drafts = build_digest(
        period_start=ps, period_end=pe, snapshot=snap,
    )
    tier2 = [d for d in drafts if d.kind == "tier2-category-frequency"]
    assert len(tier2) == 1
    assert "weather" in tier2[0].headline
    assert tier2[0].sample_size == MIN_SAMPLE_PER_TIER_2


def test_build_digest_suppresses_category_frequency_below_threshold() -> None:
    ps, pe = _start_end()
    snap = AnalyticsSnapshot(
        entries_count=0, workings_count=0, syncs_count=5,
        category_frequencies=[
            {"category": "weather", "n": MIN_SAMPLE_PER_TIER_2 - 1},
        ],
    )
    _, drafts = build_digest(
        period_start=ps, period_end=pe, snapshot=snap,
    )
    assert not any(
        d.kind == "tier2-category-frequency" for d in drafts
    )


def test_build_digest_caps_category_frequency_at_three() -> None:
    """Digest never bloats — top three categories above threshold."""
    ps, pe = _start_end()
    candidates = [
        {"category": f"category-{i}", "n": MIN_SAMPLE_PER_TIER_2 + i}
        for i in range(10)
    ]
    snap = AnalyticsSnapshot(
        entries_count=0, workings_count=0, syncs_count=300,
        category_frequencies=candidates,
    )
    _, drafts = build_digest(
        period_start=ps, period_end=pe, snapshot=snap,
    )
    tier2 = [d for d in drafts if d.kind == "tier2-category-frequency"]
    assert len(tier2) == 3


def test_build_digest_tier1_still_present_with_tier2_candidates() -> None:
    """Tier-1 surfaces regardless of tier-2 candidate presence."""
    ps, pe = _start_end()
    snap = AnalyticsSnapshot(
        entries_count=42, workings_count=3, syncs_count=8,
        category_frequencies=[
            {"category": "weather", "n": MIN_SAMPLE_PER_TIER_2},
        ],
    )
    _, drafts = build_digest(
        period_start=ps, period_end=pe, snapshot=snap,
    )
    kinds = {d.kind for d in drafts}
    assert "tier1-counts" in kinds
    assert "tier2-category-frequency" in kinds


def test_build_digest_body_carries_observational_framing() -> None:
    """Tier-2 category frequency body is observational, not predictive.
    The banned-phrase regex catches modal language; this test pins
    the affirmative observational copy too."""
    ps, pe = _start_end()
    snap = AnalyticsSnapshot(
        entries_count=0, workings_count=0, syncs_count=15,
        category_frequencies=[
            {"category": "weather", "n": MIN_SAMPLE_PER_TIER_2},
        ],
    )
    _, drafts = build_digest(
        period_start=ps, period_end=pe, snapshot=snap,
    )
    tier2 = next(
        d for d in drafts if d.kind == "tier2-category-frequency"
    )
    body = tier2.body or ""
    # No modal language in the body either.
    import re

    banned_re = re.compile(
        "|".join(BANNED_HEADLINE_PHRASES), flags=re.IGNORECASE,
    )
    assert banned_re.search(body) is None, (
        f"banned phrase in body: {body!r}"
    )
    assert "observation" in body.lower()


def test_build_digest_unknown_category_falls_back_to_string() -> None:
    """Defensive: a candidate dict with no 'category' key still
    produces a clean headline (using the fallback)."""
    ps, pe = _start_end()
    snap = AnalyticsSnapshot(
        entries_count=0, workings_count=0, syncs_count=15,
        category_frequencies=[{"n": MIN_SAMPLE_PER_TIER_2}],
    )
    _, drafts = build_digest(
        period_start=ps, period_end=pe, snapshot=snap,
    )
    tier2 = [d for d in drafts if d.kind == "tier2-category-frequency"]
    assert len(tier2) == 1
    assert "uncategorised" in tier2[0].headline
