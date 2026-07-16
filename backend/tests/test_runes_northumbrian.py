"""Northumbrian rune bundle tests — v1-007.

FEATURES §4 lists Northumbrian as its own tradition, so it ships as
its own bundle id — but the "Northumbrian futhorc" is not a distinct
alphabet. The bundle derives its rune tuple directly from the
Anglo-Saxon Futhorc (no data duplicated) and its description states
the relationship plainly, following the Armanen bundle's historical
honesty framing.
"""

from __future__ import annotations

from collections import Counter

from theourgia.core.divination.runes.bundles import (
    BUILTIN_RUNE_SETS,
    runeset_by_value,
)
from theourgia.core.divination.runes.bundles_extended import (
    ANGLO_SAXON_FUTHORC,
    NORTHUMBRIAN_RUNES,
)
from theourgia.core.divination.runes.engine import RuneSet


def test_northumbrian_registered_in_builtin_sets() -> None:
    assert NORTHUMBRIAN_RUNES in BUILTIN_RUNE_SETS


def test_northumbrian_lookup_by_enum_and_string() -> None:
    assert runeset_by_value(RuneSet.NORTHUMBRIAN) is NORTHUMBRIAN_RUNES
    assert runeset_by_value("northumbrian") is NORTHUMBRIAN_RUNES


def test_northumbrian_has_exactly_33_runes() -> None:
    """The full Northumbrian row: 24 Elder-derived + 5 Old English
    additions + 4 Northumbrian additions = 33. Regression guard."""
    assert NORTHUMBRIAN_RUNES.size == 33


def test_northumbrian_indexes_are_stable_zero_through_thirtytwo() -> None:
    indexes = [r.index for r in NORTHUMBRIAN_RUNES.runes]
    assert indexes == list(range(33))


def test_northumbrian_derives_from_futhorc_without_duplication() -> None:
    """The bundle must share the Futhorc's rune tuple — identity, not
    a copy. Duplicating the 33 rune definitions would let the two
    bundles silently drift apart."""
    assert NORTHUMBRIAN_RUNES.runes is ANGLO_SAXON_FUTHORC.runes


def test_northumbrian_preserves_diacritics() -> None:
    """The OE forms carry thorn, eth, ash, and æ-ligatures (Þorn,
    Cweorð, Peorð, Eðel, Hægl, Æsc, Dæg). Regression guard against
    ASCII-flattening drift."""
    names = {r.name for r in NORTHUMBRIAN_RUNES.runes}
    assert "Þorn" in names
    assert "Cweorð" in names
    assert "Peorð" in names
    assert "Eðel" in names
    assert "Hægl" in names
    assert "Æsc" in names
    assert "Dæg" in names


def test_northumbrian_carries_the_four_northumbrian_additions() -> None:
    names = {r.name for r in NORTHUMBRIAN_RUNES.runes}
    assert "Cweorð" in names
    assert "Calc" in names
    assert "Stan" in names
    assert "Gar" in names


def test_northumbrian_glyphs_are_unicode_runic_block() -> None:
    """Every glyph must live in the Unicode Runic block (U+16A0..U+16FF)."""
    for r in NORTHUMBRIAN_RUNES.runes:
        assert 0x16A0 <= ord(r.glyph) <= 0x16FF, (
            f"{r.name}: glyph {r.glyph!r} outside Runic block"
        )


def test_northumbrian_aett_distribution() -> None:
    """Same grouping as the Futhorc: three aetts of 8 covering the
    Elder base (24), plus aett 4 covering the 9 additions."""
    counts = Counter(r.aett for r in NORTHUMBRIAN_RUNES.runes)
    assert counts == {1: 8, 2: 8, 3: 8, 4: 9}


def test_northumbrian_all_meanings_populated() -> None:
    for r in NORTHUMBRIAN_RUNES.runes:
        assert r.upright_meaning.strip(), f"{r.name} missing upright_meaning"
        assert "TODO" not in r.upright_meaning
        assert "placeholder" not in r.upright_meaning.lower()


def test_northumbrian_description_states_futhorc_relationship() -> None:
    """The description MUST honestly note that this is the Futhorc
    row presented standalone — not a distinct historical alphabet.
    Same honesty discipline as the Armanen bundle. Regression guard."""
    desc = NORTHUMBRIAN_RUNES.description
    assert "Northumbria" in desc
    assert "Futhorc" in desc
    assert "identical" in desc.lower() or "same" in desc.lower()
    assert "not a distinct alphabet" in desc.lower()
