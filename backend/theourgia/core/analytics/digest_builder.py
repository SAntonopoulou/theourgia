"""Weekly digest builder (B124).

Per ``plan/09-batches-backend.md`` § B124.

Pure-where-possible builder that produces a summary dict + a list
of DigestItemDraft instances. The route + the Celery task call
this and persist the result; tests drive it directly.

Honesty rules:
  * Headlines NEVER use modal language. The :data:`BANNED_PHRASES`
    regex captures the rule; :func:`assert_clean_headline` raises
    on any banned phrase. Tests run this against every shipped
    headline template.
  * Tier-2 items require ``n >= MIN_SAMPLE_PER_TIER_2``; tier-3
    requires ``MIN_SAMPLE_PER_TIER_3``. Below those, the items are
    not produced (the practitioner sees only tier-1 counts).
  * Confidence is included when a known interval can be derived;
    otherwise the field is None and the surface renders "no CI".
  * The builder NEVER reads sealed entry body text.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

__all__ = [
    "BANNED_HEADLINE_PHRASES",
    "DigestItemDraft",
    "DIGEST_BUILDER_VERSION",
    "MIN_SAMPLE_PER_TIER_2",
    "MIN_SAMPLE_PER_TIER_3",
    "AnalyticsSnapshot",
    "TIER1_HEADLINE_TEMPLATE",
    "TIER2_CATEGORY_TEMPLATE",
    "TIER2_SATURN_HOUR_TEMPLATE",
    "TIER3_CORRELATION_TEMPLATE",
    "assert_clean_headline",
    "build_digest",
    "headline_templates",
]


DIGEST_BUILDER_VERSION = 1

MIN_SAMPLE_PER_TIER_2 = 10
MIN_SAMPLE_PER_TIER_3 = 20


# Headlines NEVER include modal language ("must", "will", "should"
# work). This regex is run against every shipped headline template
# at import time (via the assert in :func:`assert_clean_headline`,
# called from the test suite). If a future template adds banned
# language the test catches it before merge.
BANNED_HEADLINE_PHRASES: tuple[str, ...] = (
    r"\bmust\b",
    r"\bwill\b",
    r"\bshould work\b",
    r"\bguaranteed\b",
    r"\bdefinitely\b",
    # Oracular framing
    r"\bdestiny\b",
    r"\bfated\b",
    r"\bthe (gods?|fates?) (favo[u]?r|smile|bless)",
    # Conviction without sample size
    r"\bclearly (favors?|tracks?)\b",
)


_BANNED_RE = re.compile(
    "|".join(BANNED_HEADLINE_PHRASES), flags=re.IGNORECASE,
)


def assert_clean_headline(headline: str) -> None:
    """Raise ``ValueError`` if a headline includes any banned phrase.

    Used at builder authoring time + at runtime (defensive — the
    builder runs the check on each item before returning)."""
    match = _BANNED_RE.search(headline)
    if match is not None:
        raise ValueError(
            f"Headline contains banned phrase {match.group(0)!r}: "
            f"{headline!r}",
        )


# ── Headline templates ───────────────────────────────────────────


TIER1_HEADLINE_TEMPLATE = (
    "{entries} entries · {workings} workings · {syncs} synchronicities"
)
TIER2_SATURN_HOUR_TEMPLATE = (
    "Saturn-hour workings: mean outcome {mean:.1f} · n={n}"
)
TIER2_CATEGORY_TEMPLATE = (
    "{category} synchronicities led the week · n={n}"
)
TIER3_CORRELATION_TEMPLATE = (
    "{axis_a} and {axis_b} correlate at {r:+.2f} · n={n}"
)


def headline_templates() -> list[str]:
    """Every static headline template the builder may emit. Tests
    iterate over this list."""
    return [
        TIER1_HEADLINE_TEMPLATE,
        TIER2_SATURN_HOUR_TEMPLATE,
        TIER2_CATEGORY_TEMPLATE,
        TIER3_CORRELATION_TEMPLATE,
    ]


# ── Input snapshot ───────────────────────────────────────────────


@dataclass(frozen=True)
class AnalyticsSnapshot:
    """A pre-computed pack of counts the builder operates on.

    The route assembles this from the B123 aggregate endpoints + a
    handful of additional queries before calling ``build_digest``.
    Keeping it as a frozen dataclass means the builder is pure +
    trivially testable.
    """

    entries_count: int
    workings_count: int
    syncs_count: int
    # Tier-2 candidates the route already pre-computed. The builder
    # filters out anything below MIN_SAMPLE_PER_TIER_2.
    saturn_hour_workings: list[dict] = field(default_factory=list)
    # Synchronicity-category frequency dicts shaped { category, n }.
    # Surfaced as the TIER2_CATEGORY_TEMPLATE — top three above
    # threshold are emitted per period.
    category_frequencies: list[dict] = field(default_factory=list)
    # Tier-3 correlation pairs, each shaped:
    #   { "axis_a": "...", "axis_b": "...", "r": float, "n": int }
    correlations: list[dict] = field(default_factory=list)


# ── Drafts ───────────────────────────────────────────────────────


@dataclass(frozen=True)
class DigestItemDraft:
    """Pure-data shape the route turns into a DigestItem ORM row."""

    kind: str
    headline: str
    body: str | None
    structured: dict
    sample_size: int
    confidence: float | None


# ── Builder ──────────────────────────────────────────────────────


def build_digest(
    *,
    period_start: datetime,
    period_end: datetime,
    snapshot: AnalyticsSnapshot,
) -> tuple[dict, list[DigestItemDraft]]:
    """Produce a summary + drafts for the given week.

    Returns ``(summary_dict, drafts)``. The summary captures the
    tier-1 counts plus the builder version; drafts include every
    surfaced observation that cleared its tier threshold.
    """
    summary = {
        "builder_version": DIGEST_BUILDER_VERSION,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "entries_count": snapshot.entries_count,
        "workings_count": snapshot.workings_count,
        "syncs_count": snapshot.syncs_count,
    }

    drafts: list[DigestItemDraft] = []

    # Tier 1: always present.
    headline_t1 = TIER1_HEADLINE_TEMPLATE.format(
        entries=snapshot.entries_count,
        workings=snapshot.workings_count,
        syncs=snapshot.syncs_count,
    )
    assert_clean_headline(headline_t1)
    drafts.append(
        DigestItemDraft(
            kind="tier1-counts",
            headline=headline_t1,
            body=None,
            structured={
                "entries_count": snapshot.entries_count,
                "workings_count": snapshot.workings_count,
                "syncs_count": snapshot.syncs_count,
            },
            sample_size=(
                snapshot.entries_count
                + snapshot.workings_count
                + snapshot.syncs_count
            ),
            confidence=None,
        )
    )

    # Tier 2: gated by MIN_SAMPLE_PER_TIER_2.
    for candidate in snapshot.saturn_hour_workings:
        n = int(candidate.get("n", 0))
        if n < MIN_SAMPLE_PER_TIER_2:
            continue
        mean = float(candidate.get("mean", 0.0))
        headline = TIER2_SATURN_HOUR_TEMPLATE.format(mean=mean, n=n)
        assert_clean_headline(headline)
        drafts.append(
            DigestItemDraft(
                kind="tier2-saturn-hour",
                headline=headline,
                body=(
                    "Observation only — your record so far suggests "
                    "this; the next month of practice will sharpen it."
                ),
                structured=dict(candidate),
                sample_size=n,
                confidence=candidate.get("confidence"),
            )
        )

    # Tier 2 (category frequency): top three categories that clear
    # the threshold. Pre-computed sources rank by ``n`` already; we
    # take the top three to avoid digest bloat.
    surfaced_categories = 0
    for cand in snapshot.category_frequencies:
        if surfaced_categories >= 3:
            break
        n = int(cand.get("n", 0))
        if n < MIN_SAMPLE_PER_TIER_2:
            continue
        category = str(cand.get("category", "uncategorised"))
        headline = TIER2_CATEGORY_TEMPLATE.format(category=category, n=n)
        assert_clean_headline(headline)
        drafts.append(
            DigestItemDraft(
                kind="tier2-category-frequency",
                headline=headline,
                body=(
                    "Frequency observation only. "
                    "What stood out this week may not next week."
                ),
                structured=dict(cand),
                sample_size=n,
                confidence=cand.get("confidence"),
            )
        )
        surfaced_categories += 1

    # Tier 3: gated by MIN_SAMPLE_PER_TIER_3.
    for corr in snapshot.correlations:
        n = int(corr.get("n", 0))
        if n < MIN_SAMPLE_PER_TIER_3:
            continue
        headline = TIER3_CORRELATION_TEMPLATE.format(
            axis_a=corr.get("axis_a", "?"),
            axis_b=corr.get("axis_b", "?"),
            r=float(corr.get("r", 0.0)),
            n=n,
        )
        assert_clean_headline(headline)
        drafts.append(
            DigestItemDraft(
                kind="tier3-correlation",
                headline=headline,
                body=(
                    "Correlation, not causation. "
                    "Patterns suggest where to look, not what to do."
                ),
                structured=dict(corr),
                sample_size=n,
                confidence=corr.get("confidence"),
            )
        )

    return summary, drafts
