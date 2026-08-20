"""The eight built-in practices — the web's mirror of the phone's catalog.

Parity, 20 Aug 2026: the phone can turn each built-in discipline on or off
(`lib/domain/practice.dart`), and the site must offer the same. These are NOT
the user-authored recurring practices in :mod:`theourgia.models.practices` —
those are a different, CRUD-shaped thing. These are the fixed disciplines the
app ships knowing how to keep.

The ``key`` strings are a **cross-repo contract**: the phone writes them into its
settings table as ``practice.enabled.<key>`` and its own comment warns that
renaming one "would silently reset whoever had switched it off". So the keys
here are the phone enum's member names, verbatim, and must not drift. Deepening
this list is a phone-first decision (see the alignment protocol); the site ports.

``numbers`` is deliberately *not* labelled numerology — the phone's doc-comment
lays out why (gematria / isopsephy / ʿilm al-ḥurūf are distinct attested
sciences); the label here matches so the two surfaces read the same.
"""

from __future__ import annotations

from dataclasses import dataclass

__all__ = ["PRACTICES", "PRACTICE_KEYS", "Practice", "practice_for"]


@dataclass(frozen=True, slots=True)
class Practice:
    """One built-in discipline. Mirrors the phone enum's public fields."""

    key: str
    label: str
    glyph: str
    detail: str


#: The eight, in the phone's own order. On by default, each switchable off.
PRACTICES: tuple[Practice, ...] = (
    Practice("lunarAdorations", "Lunar adorations", "☽", "Moonrise, culmination, moonset, nadir"),
    Practice("solarAdorations", "Solar adorations", "☉", "Sunrise, noon, sunset, midnight"),
    Practice("rituals", "Rituals", "☩", "Rites you have written"),
    Practice("workings", "Workings", "☿", "Operations that run over days or months"),
    Practice("meditation", "Meditation", "🜔", "Sittings, timed and recorded"),
    Practice("pranayama", "Pranayama", "🜁", "The breath, counted in ratios and rounds"),
    Practice("divination", "Divination", "☍", "Oracles, cast and read"),
    Practice("numbers", "Letters and numbers", "Ϡ", "What a name comes to"),
)

#: The canonical key set, for validating what a client sends.
PRACTICE_KEYS: frozenset[str] = frozenset(p.key for p in PRACTICES)


def practice_for(key: str) -> Practice | None:
    """The practice with this key, or ``None`` for one this build has never
    heard of — the caller decides whether an unknown key is an error or, as on
    the phone, simply left alone."""
    return next((p for p in PRACTICES if p.key == key), None)
