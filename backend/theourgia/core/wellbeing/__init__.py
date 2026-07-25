"""Wellbeing substrate — the opt-in crisis-aware nudge (v1-010).

Three small pieces:

* :mod:`theourgia.core.wellbeing.trigger` — pure sustained-severe-
  distress rule over mood readings (the full rule text lives in that
  module's docstring).
* :mod:`theourgia.core.wellbeing.service` — DB loading + the privacy
  contract (opted-out users' mood data is never queried).
* :mod:`theourgia.core.wellbeing.resources` — operator-configured
  crisis-support resources (instance setting
  ``wellbeing.crisis_resources``). Theourgia ships no built-in
  entries; the API serves an explicit empty state when none are
  configured.

Project rules that govern this feature: opt-in OFF by default; care
palette only on the frontend (never danger tokens); every user-visible
string is verbatim designer copy — nothing in this package is
user-visible copy.
"""

from __future__ import annotations

from theourgia.core.wellbeing.resources import (
    CRISIS_RESOURCES_KEY,
    CrisisResource,
    load_crisis_resources,
)
from theourgia.core.wellbeing.service import (
    CRISIS_NUDGE_KEY,
    CRISIS_NUDGE_MUTED_UNTIL_KEY,
    MUTED_FOREVER,
    NudgeState,
    evaluate_nudge,
    is_muted,
    load_mood_readings,
    set_crisis_nudge_enabled,
    set_muted_until,
)
from theourgia.core.wellbeing.trigger import (
    MIN_DISTINCT_DAYS,
    MOOD_SCALE_MAX,
    MOOD_SCALE_MIN,
    SEVERE_FRACTION,
    SEVERE_MOOD_CEILING,
    WINDOW_DAYS,
    MoodReading,
    evaluate_sustained_distress,
    is_severe_mood,
)

__all__ = [
    "CRISIS_NUDGE_KEY",
    "CRISIS_NUDGE_MUTED_UNTIL_KEY",
    "CRISIS_RESOURCES_KEY",
    "MIN_DISTINCT_DAYS",
    "MOOD_SCALE_MAX",
    "MOOD_SCALE_MIN",
    "MUTED_FOREVER",
    "SEVERE_FRACTION",
    "SEVERE_MOOD_CEILING",
    "WINDOW_DAYS",
    "CrisisResource",
    "MoodReading",
    "NudgeState",
    "evaluate_nudge",
    "evaluate_sustained_distress",
    "is_muted",
    "is_severe_mood",
    "load_crisis_resources",
    "load_mood_readings",
    "set_crisis_nudge_enabled",
    "set_muted_until",
]
