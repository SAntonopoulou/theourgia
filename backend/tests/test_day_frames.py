"""Day-frame boundaries — the practitioner's day, computed here.

The record page groups by these, so the claims that matter are the
sky-shaped ones: the walk opens EARLY (the boundary that begins the first
day precedes the span), the rises come roughly a day apart with the
Moon's lag visible, and what cannot be answered is refused rather than
guessed at.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from itertools import pairwise

import pytest

from theourgia.core.astro.day_frames import frame_boundaries

_WATERLOO = (50.72, 4.40)


class TestFrameBoundaries:
    def test_the_walk_opens_before_the_span(self) -> None:
        """An entry at 03:00 under a moonrise frame belongs to a day that
        began the previous afternoon — so the first boundary must come
        from before the span asked for."""
        start = datetime(2026, 8, 1, tzinfo=UTC)
        boundaries = frame_boundaries(
            "moonrise", start, datetime(2026, 8, 31, tzinfo=UTC), *_WATERLOO
        )
        assert boundaries[0] < start
        assert start - boundaries[0] < timedelta(hours=36)

    def test_the_rises_come_a_day_apart_with_the_moons_lag(self) -> None:
        boundaries = frame_boundaries(
            "moonrise",
            datetime(2026, 8, 1, tzinfo=UTC),
            datetime(2026, 8, 31, tzinfo=UTC),
            *_WATERLOO,
        )
        assert len(boundaries) >= 28, "a month holds at least that many rises"
        gaps = [b - a for a, b in pairwise(boundaries)]
        assert all(timedelta(hours=22) < gap < timedelta(hours=28) for gap in gaps)
        assert boundaries == sorted(boundaries), "strictly in order"

    def test_the_sun_keeps_a_steadier_day(self) -> None:
        boundaries = frame_boundaries(
            "sunrise",
            datetime(2026, 8, 1, tzinfo=UTC),
            datetime(2026, 8, 6, tzinfo=UTC),
            *_WATERLOO,
        )
        gaps = [b - a for a, b in pairwise(boundaries)]
        assert all(
            timedelta(hours=23, minutes=50) < gap < timedelta(hours=24, minutes=10)
            for gap in gaps
        )

    def test_an_unknown_frame_is_refused_by_name(self) -> None:
        with pytest.raises(ValueError, match="frame must be one of"):
            frame_boundaries(
                "midnight",
                datetime(2026, 8, 1, tzinfo=UTC),
                datetime(2026, 8, 2, tzinfo=UTC),
                *_WATERLOO,
            )

    def test_a_naive_moment_is_refused_rather_than_guessed_at(self) -> None:
        with pytest.raises(ValueError, match="timezone-aware"):
            frame_boundaries(
                "moonrise",
                datetime(2026, 8, 1),  # noqa: DTZ001 — the refusal under test
                datetime(2026, 8, 2, tzinfo=UTC),
                *_WATERLOO,
            )
