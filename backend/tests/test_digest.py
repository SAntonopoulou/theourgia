"""Unit tests for the weekly digest (B124).

Covers:
  * Model invariants — uniqueness on (owner_id, period_start)
  * Builder pure-function: tier 1 always, tier 2/3 gated by sample
  * Banned-phrase regex blocks oracular headlines (the critical
    honesty rule)
  * Router smoke + schema (only ``dismissed`` patchable)
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1 import digest as digest_module
from theourgia.api.routers.v1.digest import (
    DigestItemRead,
    DigestItemUpdate,
    DigestRead,
)
from theourgia.core.analytics.digest_builder import (
    AnalyticsSnapshot,
    BANNED_HEADLINE_PHRASES,
    DIGEST_BUILDER_VERSION,
    DigestItemDraft,
    MIN_SAMPLE_PER_TIER_2,
    MIN_SAMPLE_PER_TIER_3,
    TIER1_HEADLINE_TEMPLATE,
    TIER2_SATURN_HOUR_TEMPLATE,
    TIER3_CORRELATION_TEMPLATE,
    assert_clean_headline,
    build_digest,
    headline_templates,
)
from theourgia.models.digest import Digest, DigestItem


# ── Constants ───────────────────────────────────────────────────


def test_builder_version_is_one() -> None:
    assert DIGEST_BUILDER_VERSION == 1


def test_min_sample_thresholds() -> None:
    """The H06 honesty rule: tier 2 ≥ 10, tier 3 ≥ 20."""
    assert MIN_SAMPLE_PER_TIER_2 == 10
    assert MIN_SAMPLE_PER_TIER_3 == 20


# ── Banned-phrase regex (the critical honesty test) ─────────────


def test_banned_phrases_block_must() -> None:
    with pytest.raises(ValueError):
        assert_clean_headline("Your Mars-hour workings must succeed.")


def test_banned_phrases_block_will() -> None:
    with pytest.raises(ValueError):
        assert_clean_headline("The waning moon will favor your banishings.")


def test_banned_phrases_block_should_work() -> None:
    with pytest.raises(ValueError):
        assert_clean_headline(
            "Hekate workings should work better on dark moons.",
        )


def test_banned_phrases_block_guaranteed() -> None:
    with pytest.raises(ValueError):
        assert_clean_headline("Guaranteed outcome on Saturn hours.")


def test_banned_phrases_block_destiny_language() -> None:
    with pytest.raises(ValueError):
        assert_clean_headline("This is your destiny tonight.")


def test_banned_phrases_block_oracular_framing() -> None:
    with pytest.raises(ValueError):
        assert_clean_headline("The gods favor your bindings.")


def test_banned_phrases_block_clearly_favors() -> None:
    """Conviction without sample size."""
    with pytest.raises(ValueError):
        assert_clean_headline("Saturn-hour clearly favors workings.")


def test_observational_headline_passes() -> None:
    """The shipped tier-1 template is observational. No raise."""
    headline = TIER1_HEADLINE_TEMPLATE.format(
        entries=12, workings=3, syncs=5,
    )
    assert_clean_headline(headline)


def test_every_shipped_template_passes_the_banned_regex() -> None:
    """Run the banned-phrase check against every shipped template
    with realistic placeholders. CI catches a future template that
    accidentally adds modal language."""
    from theourgia.core.analytics.digest_builder import (
        TIER2_CATEGORY_TEMPLATE,
    )

    samples = {
        TIER1_HEADLINE_TEMPLATE: {"entries": 12, "workings": 3, "syncs": 5},
        TIER2_SATURN_HOUR_TEMPLATE: {"mean": 7.4, "n": 14},
        TIER2_CATEGORY_TEMPLATE: {"category": "weather", "n": 15},
        TIER3_CORRELATION_TEMPLATE: {
            "axis_a": "Saturn hour",
            "axis_b": "outcome",
            "r": 0.41,
            "n": 22,
        },
    }
    for tmpl in headline_templates():
        rendered = tmpl.format(**samples[tmpl])
        assert_clean_headline(rendered)


def test_banned_phrases_listed_in_constant() -> None:
    """Defensive: the BANNED_HEADLINE_PHRASES tuple is at least the
    plan-required size (5 entries). Extending is safe; shrinking
    would loosen the rule."""
    assert len(BANNED_HEADLINE_PHRASES) >= 5


# ── Builder: tier 1 always ──────────────────────────────────────


def _snapshot_with_counts(
    *, entries: int = 12, workings: int = 3, syncs: int = 5,
) -> AnalyticsSnapshot:
    return AnalyticsSnapshot(
        entries_count=entries,
        workings_count=workings,
        syncs_count=syncs,
    )


def test_build_digest_tier1_always_present() -> None:
    period_start = datetime(2026, 6, 22, tzinfo=timezone.utc)
    period_end = period_start + timedelta(days=7)
    summary, drafts = build_digest(
        period_start=period_start,
        period_end=period_end,
        snapshot=_snapshot_with_counts(),
    )
    assert summary["entries_count"] == 12
    assert summary["builder_version"] == DIGEST_BUILDER_VERSION
    kinds = [d.kind for d in drafts]
    assert "tier1-counts" in kinds


def test_build_digest_tier2_below_threshold_is_suppressed() -> None:
    snapshot = AnalyticsSnapshot(
        entries_count=0,
        workings_count=0,
        syncs_count=0,
        saturn_hour_workings=[
            {"mean": 7.4, "n": 5},  # below MIN_SAMPLE_PER_TIER_2
        ],
    )
    _, drafts = build_digest(
        period_start=datetime(2026, 6, 22, tzinfo=timezone.utc),
        period_end=datetime(2026, 6, 29, tzinfo=timezone.utc),
        snapshot=snapshot,
    )
    assert not any(d.kind == "tier2-saturn-hour" for d in drafts)


def test_build_digest_tier2_at_threshold_surfaces() -> None:
    snapshot = AnalyticsSnapshot(
        entries_count=0,
        workings_count=0,
        syncs_count=0,
        saturn_hour_workings=[
            {"mean": 7.4, "n": MIN_SAMPLE_PER_TIER_2},
        ],
    )
    _, drafts = build_digest(
        period_start=datetime(2026, 6, 22, tzinfo=timezone.utc),
        period_end=datetime(2026, 6, 29, tzinfo=timezone.utc),
        snapshot=snapshot,
    )
    tier2 = [d for d in drafts if d.kind == "tier2-saturn-hour"]
    assert len(tier2) == 1
    assert tier2[0].sample_size == MIN_SAMPLE_PER_TIER_2


def test_build_digest_tier3_below_threshold_is_suppressed() -> None:
    snapshot = AnalyticsSnapshot(
        entries_count=0,
        workings_count=0,
        syncs_count=0,
        correlations=[
            {"axis_a": "x", "axis_b": "y", "r": 0.5, "n": 12},
        ],
    )
    _, drafts = build_digest(
        period_start=datetime(2026, 6, 22, tzinfo=timezone.utc),
        period_end=datetime(2026, 6, 29, tzinfo=timezone.utc),
        snapshot=snapshot,
    )
    assert not any(d.kind == "tier3-correlation" for d in drafts)


def test_build_digest_tier3_at_threshold_surfaces() -> None:
    snapshot = AnalyticsSnapshot(
        entries_count=0,
        workings_count=0,
        syncs_count=0,
        correlations=[
            {
                "axis_a": "Saturn hour",
                "axis_b": "outcome",
                "r": 0.41,
                "n": MIN_SAMPLE_PER_TIER_3,
            },
        ],
    )
    _, drafts = build_digest(
        period_start=datetime(2026, 6, 22, tzinfo=timezone.utc),
        period_end=datetime(2026, 6, 29, tzinfo=timezone.utc),
        snapshot=snapshot,
    )
    tier3 = [d for d in drafts if d.kind == "tier3-correlation"]
    assert len(tier3) == 1
    assert tier3[0].sample_size == MIN_SAMPLE_PER_TIER_3


def test_build_digest_drafts_are_frozen_dataclasses() -> None:
    summary, drafts = build_digest(
        period_start=datetime(2026, 6, 22, tzinfo=timezone.utc),
        period_end=datetime(2026, 6, 29, tzinfo=timezone.utc),
        snapshot=_snapshot_with_counts(),
    )
    assert isinstance(drafts[0], DigestItemDraft)
    with pytest.raises(Exception):
        drafts[0].headline = "modified"  # type: ignore[misc]


# ── Schemas ─────────────────────────────────────────────────────


def test_digest_item_update_only_accepts_dismissed() -> None:
    p = DigestItemUpdate(dismissed=True)
    assert p.dismissed is True


def test_digest_item_update_rejects_results_field() -> None:
    with pytest.raises(ValidationError):
        DigestItemUpdate(structured={"hacked": True})  # type: ignore[call-arg]


def test_digest_item_update_rejects_headline_change() -> None:
    with pytest.raises(ValidationError):
        DigestItemUpdate(headline="x")  # type: ignore[call-arg]


def test_digest_item_update_is_fully_optional() -> None:
    p = DigestItemUpdate()
    assert p.model_dump(exclude_unset=True) == {}


# ── Model uniqueness ────────────────────────────────────────────


def test_digest_model_unique_constraint_on_owner_and_period() -> None:
    """The uniqueness rule keeps history clean — one row per
    (owner, week)."""
    constraints = {
        c.name for c in Digest.__table_args__ if hasattr(c, "name")
    }
    assert "uq_digest_owner_period" in constraints


def test_digest_item_default_dismissed_is_false() -> None:
    """Fresh items are NOT auto-dismissed (the practitioner has to
    see them at least once)."""
    field = DigestItem.model_fields["dismissed"]
    assert field.default is False


# ── Router smoke ───────────────────────────────────────────────


def test_digest_router_registers_four_routes() -> None:
    paths_methods = {
        (r.path, m)
        for r in digest_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    expected = {
        ("/digest/weekly", "GET"),
        ("/digest/weekly/{period_start}", "GET"),
        ("/digest/items/{item_id}", "PATCH"),
        ("/digest/rebuild", "POST"),
    }
    assert expected.issubset(paths_methods)


def test_digest_router_response_models() -> None:
    from fastapi.routing import APIRoute

    by_key: dict[tuple[str, str], object] = {}
    for r in digest_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        for m in r.methods or ():
            by_key[(r.path, m)] = r.response_model
    assert by_key[("/digest/weekly", "GET")] == DigestRead
    assert by_key[("/digest/rebuild", "POST")] == DigestRead
    assert by_key[("/digest/items/{item_id}", "PATCH")] == DigestItemRead
