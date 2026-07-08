"""Anglo-Saxon Futhorc rune bundle tests — b108-2hp.

Reference plugin 6 of 7 (part 2): Norse runes extended · Anglo-Saxon
Futhorc (33 runes, c. 5th-11th c.). Extends Elder Futhark with runes
for Old English phonology + late Northumbrian additions.
"""

from __future__ import annotations

from theourgia.core.divination.runes.bundles import (
    BUILTIN_RUNE_SETS,
    runeset_by_value,
)
from theourgia.core.divination.runes.bundles_extended import (
    ANGLO_SAXON_FUTHORC,
)
from theourgia.core.divination.runes.engine import RuneSet


def test_futhorc_registered_in_builtin_sets() -> None:
    assert ANGLO_SAXON_FUTHORC in BUILTIN_RUNE_SETS


def test_futhorc_lookup_by_value_and_string() -> None:
    assert runeset_by_value(RuneSet.ANGLO_SAXON_FUTHORC) is ANGLO_SAXON_FUTHORC
    assert runeset_by_value("anglo_saxon_futhorc") is ANGLO_SAXON_FUTHORC


def test_futhorc_has_exactly_33_runes() -> None:
    """The extended Anglo-Saxon set has 24 Elder + 5 OE additions +
    4 Northumbrian additions = 33. Regression guard."""
    assert ANGLO_SAXON_FUTHORC.size == 33


def test_futhorc_indexes_are_stable_zero_through_thirtytwo() -> None:
    indexes = [r.index for r in ANGLO_SAXON_FUTHORC.runes]
    assert indexes == list(range(33))


def test_futhorc_preserves_old_english_names() -> None:
    """The Anglo-Saxon corpus uses OE forms (Feoh, Þorn, Os, Cen,
    Gyfu, Wynn, Hægl, Nyd, Ger, Sigel, Tir, Beorc, Mann, Lagu, Ing,
    Eðel, Dæg). Regression guard against Elder Futhark drift."""
    names = {r.name for r in ANGLO_SAXON_FUTHORC.runes}
    assert "Feoh" in names
    assert "Þorn" in names
    assert "Os" in names
    assert "Cen" in names
    assert "Gyfu" in names
    assert "Wynn" in names
    assert "Hægl" in names
    assert "Sigel" in names
    assert "Tir" in names
    assert "Beorc" in names
    assert "Eðel" in names
    assert "Dæg" in names


def test_futhorc_carries_the_five_oe_additions() -> None:
    names = {r.name for r in ANGLO_SAXON_FUTHORC.runes}
    assert "Ac" in names
    assert "Æsc" in names
    assert "Yr" in names
    assert "Ior" in names
    assert "Ear" in names


def test_futhorc_carries_the_four_northumbrian_additions() -> None:
    names = {r.name for r in ANGLO_SAXON_FUTHORC.runes}
    assert "Cweorð" in names
    assert "Calc" in names
    assert "Stan" in names
    assert "Gar" in names


def test_futhorc_glyphs_are_unicode_runic_block() -> None:
    """Every glyph must live in the Unicode Runic block (U+16A0..U+16FF)."""
    for r in ANGLO_SAXON_FUTHORC.runes:
        assert 0x16A0 <= ord(r.glyph) <= 0x16FF, (
            f"{r.name}: glyph {r.glyph!r} outside Runic block"
        )


def test_futhorc_aett_distribution() -> None:
    """Traditional aett grouping: three groups of 8 covering the
    Elder base (24), plus aett 4 covering the Anglo-Saxon additions (9)."""
    from collections import Counter

    counts = Counter(r.aett for r in ANGLO_SAXON_FUTHORC.runes)
    assert counts == {1: 8, 2: 8, 3: 8, 4: 9}


def test_futhorc_all_meanings_populated() -> None:
    for r in ANGLO_SAXON_FUTHORC.runes:
        assert r.upright_meaning.strip(), f"{r.name} missing upright_meaning"
        assert "TODO" not in r.upright_meaning
        assert "placeholder" not in r.upright_meaning.lower()


def test_futhorc_symmetric_runes_carry_symmetric_flag() -> None:
    """Gyfu · Hægl · Is · Mann · Ing · Dæg are the visually symmetric
    runes in the Futhorc. Their reversed_meaning should indicate no
    reversal reading."""
    symmetric_names = {"Gyfu", "Hægl", "Is", "Mann", "Ing", "Dæg"}
    for r in ANGLO_SAXON_FUTHORC.runes:
        if r.name in symmetric_names:
            assert r.symmetric is True, f"{r.name} should be symmetric"
            assert r.reversed_meaning.startswith("(symmetric rune")


def test_futhorc_description_notes_rune_poem() -> None:
    """The description should surface the *Anglo-Saxon Rune Poem*
    as the tradition source so readers know where the meanings come from."""
    assert "Rune Poem" in ANGLO_SAXON_FUTHORC.description
