"""Younger Futhark rune bundle tests — b108-2ho.

Reference plugin 6 of 7: Norse runes extended · Younger Futhark
Long Branch (16 runes, c. 800-1100 CE).
"""

from __future__ import annotations

from theourgia.core.divination.runes.bundles import (
    BUILTIN_RUNE_SETS,
    runeset_by_value,
)
from theourgia.core.divination.runes.bundles_extended import YOUNGER_FUTHARK
from theourgia.core.divination.runes.engine import RuneSet


def test_younger_futhark_registered_in_builtin_sets() -> None:
    assert YOUNGER_FUTHARK in BUILTIN_RUNE_SETS


def test_younger_futhark_lookup_by_value() -> None:
    resolved = runeset_by_value(RuneSet.YOUNGER_FUTHARK)
    assert resolved is YOUNGER_FUTHARK
    resolved_by_string = runeset_by_value("younger_futhark")
    assert resolved_by_string is YOUNGER_FUTHARK


def test_younger_futhark_has_exactly_16_runes() -> None:
    """The Younger Futhark reduced from Elder's 24 to 16 runes as
    Proto-Norse phonology collapsed. Any drift here is a data-import bug."""
    assert YOUNGER_FUTHARK.size == 16


def test_younger_futhark_indexes_are_stable_zero_through_fifteen() -> None:
    indexes = [r.index for r in YOUNGER_FUTHARK.runes]
    assert indexes == list(range(16))


def test_younger_futhark_names_carry_diacritics() -> None:
    """Old Norse runes are usually cited with their diacritics (Ýr not
    Yr, Þurs not Thurs). The bundle preserves them so downstream
    display is authentic."""
    names = {r.name for r in YOUNGER_FUTHARK.runes}
    assert "Þurs" in names
    assert "Óss" in names
    assert "Reið" in names
    assert "Nauðr" in names
    assert "Ísa" in names
    assert "Sól" in names
    assert "Týr" in names
    assert "Maðr" in names
    assert "Lögr" in names
    assert "Ýr" in names


def test_younger_futhark_glyphs_are_unicode_runic_block() -> None:
    """Every glyph must live in the Unicode Runic block (U+16A0..U+16FF).
    A stray Latin character means someone forgot to paste the runic
    codepoint."""
    for r in YOUNGER_FUTHARK.runes:
        assert 0x16A0 <= ord(r.glyph) <= 0x16FF, (
            f"{r.name}: glyph {r.glyph!r} outside Runic block"
        )


def test_younger_futhark_aett_distribution_matches_16_rune_pattern() -> None:
    """Younger Futhark's three aettir: Freyr (6), Hagall (5), Týr (5).
    Regression guard against re-authoring drift."""
    from collections import Counter

    counts = Counter(r.aett for r in YOUNGER_FUTHARK.runes)
    assert counts == {1: 6, 2: 5, 3: 5}


def test_younger_futhark_symmetric_flag_matches_tradition() -> None:
    """Ísa (ice) is the classic symmetric rune in the 16-rune set —
    reversal has no distinct meaning. Regression guard."""
    isa = next(r for r in YOUNGER_FUTHARK.runes if r.name == "Ísa")
    assert isa.symmetric is True
    assert isa.reversed_meaning.startswith("(symmetric rune")


def test_younger_futhark_upright_meanings_are_authored() -> None:
    """Every rune ships with a real upright meaning; no placeholders
    like TODO or empty strings."""
    for r in YOUNGER_FUTHARK.runes:
        assert r.upright_meaning.strip()
        assert "TODO" not in r.upright_meaning
        assert "placeholder" not in r.upright_meaning.lower()


def test_younger_futhark_description_notes_variant() -> None:
    """The description must disambiguate — Younger Futhark has two
    variants (Long Branch / Short Twig) and readers need to know which
    one they're getting."""
    assert "Long Branch" in YOUNGER_FUTHARK.description


def test_younger_futhark_reversible_flags_consistent_with_symmetric() -> None:
    """The BuiltinRune.reversible property is derived: reversible iff
    not symmetric. Regression guard so the two never drift."""
    for r in YOUNGER_FUTHARK.runes:
        assert r.reversible is (not r.symmetric)
