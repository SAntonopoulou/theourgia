"""Lunar adorations — the four stations of the moon's day.

The lunar counterpart of Liber Resh's four *solar* transitions: moonrise, the
upper culmination, moonset, and the lower nadir. Computed with the same
``swe.rise_trans`` machinery as :mod:`theourgia.core.astro.day_frames`.

Unlike the solar rite, no godform/invocation preset ships here yet — on the
phone that text comes from the practitioner's chosen *adoration set*, which has
no web surface (20 Aug). So this returns the four station times with their plain
names; the naming layer lands when adoration-set selection reaches the web.
"""

from theourgia.core.lunar.stations import LunarStation, lunar_stations

__all__ = ["LunarStation", "lunar_stations"]
