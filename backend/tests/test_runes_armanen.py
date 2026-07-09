"""Armanen rune bundle tests — b108-2hq.

Reference plugin 6 of 7 (part 3): Norse runes extended · Armanen
(Guido von List's 1902 modern reconstruction, 18 runes).

Note: this system is NOT a historical alphabet. It's a modern
reconstruction with significant use in the Armanen tradition. The
bundle documents this explicitly so practitioners aren't misled
about historicity.
"""

from __future__ import annotations

from theourgia.core.divination.runes.bundles import (
    BUILTIN_RUNE_SETS,
    runeset_by_value,
)
from theourgia.core.divination.runes.bundles_extended import ARMANEN_RUNES
from theourgia.core.divination.runes.engine import RuneSet


def test_armanen_registered_in_builtin_sets() -> None:
    assert ARMANEN_RUNES in BUILTIN_RUNE_SETS


def test_armanen_lookup_by_enum_and_string() -> None:
    assert runeset_by_value(RuneSet.ARMANEN) is ARMANEN_RUNES
    assert runeset_by_value("armanen") is ARMANEN_RUNES


def test_armanen_has_exactly_18_runes() -> None:
    """18 runes = 18 charms of Odin in the Hávamál's Rúnatal
    (stanzas 138-145). Regression guard against drift."""
    assert ARMANEN_RUNES.size == 18


def test_armanen_indexes_are_stable() -> None:
    indexes = [r.index for r in ARMANEN_RUNES.runes]
    assert indexes == list(range(18))


def test_armanen_glyphs_are_unicode_runic_block() -> None:
    for r in ARMANEN_RUNES.runes:
        assert 0x16A0 <= ord(r.glyph) <= 0x16FF, (
            f"{r.name}: glyph {r.glyph!r} outside Runic block"
        )


def test_armanen_covers_expected_von_list_sequence() -> None:
    """Von List's canonical 18: Fa · Ur · Thurs · Os · Rit · Ka ·
    Hagal · Not · Is · Ar · Sig · Tyr · Bar · Laf · Man · Yr · Eh ·
    Gibor. Regression guard on the identity of the sequence."""
    names_in_order = [r.name for r in ARMANEN_RUNES.runes]
    assert names_in_order == [
        "Fa", "Ur", "Thurs", "Os", "Rit", "Ka",
        "Hagal", "Not", "Is", "Ar", "Sig",
        "Tyr", "Bar", "Laf", "Man", "Yr", "Eh", "Gibor",
    ]


def test_armanen_symmetric_runes_carry_symmetric_flag() -> None:
    """Hagal · Is · Man are the visually symmetric runes in the
    Armanen 18."""
    symmetric = {"Hagal", "Is", "Man"}
    for r in ARMANEN_RUNES.runes:
        if r.name in symmetric:
            assert r.symmetric is True
            assert r.reversed_meaning.startswith("(symmetric rune")


def test_armanen_description_flags_modern_reconstruction() -> None:
    """The Armanen bundle MUST document its provenance so
    practitioners know it's modern, not historical. Regression guard."""
    desc = ARMANEN_RUNES.description
    assert "modern reconstruction" in desc.lower() or "modern" in desc.lower()
    assert "von List" in desc
    assert "1902" in desc


def test_armanen_description_documents_racialist_association() -> None:
    """The description must acknowledge the tradition's later
    exploitation by 20th-century racialist movements — silence would
    itself be a stance. The bundle ships without endorsement."""
    desc = ARMANEN_RUNES.description
    assert "racialist" in desc or "endorse" in desc.lower()


def test_armanen_all_meanings_populated() -> None:
    for r in ARMANEN_RUNES.runes:
        assert r.upright_meaning.strip()
        assert "TODO" not in r.upright_meaning
        assert "placeholder" not in r.upright_meaning.lower()
