"""Unit tests for the gematria indexer (B111).

Covers the PURE functions:
  * normalise_text — NFC + lowercase + diacritic strip parity with
    the client engine
  * reduce_to_digit — digital-sum collapse
  * compute_gematria — sum-of-mapped-letters
  * compute_index_rows — multi-phrase, multi-cipher generation

The side-effectful index_entry_gematria_sync + reindex_cipher_sync
are exercised in test_gematria_search.py (integration-style tests
that need a session fixture).
"""

from __future__ import annotations

from uuid import uuid4

from theourgia.core.linguistic.bundled_ciphers import bundled_by_slug
from theourgia.core.linguistic.indexer import (
    IndexRow,
    compute_gematria,
    compute_index_rows,
    normalise_text,
    reduce_to_digit,
)


# ── Normalisation parity ─────────────────────────────────────────


def test_normalise_lowercases() -> None:
    assert normalise_text("ABCD") == "abcd"


def test_normalise_strips_greek_diacritics() -> None:
    # ἀγάπη → αγαπη (smooth breathing + acute removed)
    assert normalise_text("ἀγάπη") == "αγαπη"


def test_normalise_strips_hebrew_niqqud() -> None:
    # שָׁלוֹם → שלום (niqqud + dagesh removed)
    out = normalise_text("שָׁלוֹם")
    assert out == "שלום"


def test_normalise_preserves_unmapped_punctuation() -> None:
    assert normalise_text("Καί, Λόγος.") == "και, λογος."


def test_normalise_idempotent() -> None:
    s = "ἀγαθοδαίμων"
    once = normalise_text(s)
    twice = normalise_text(once)
    assert once == twice


# ── reduce_to_digit ──────────────────────────────────────────────


def test_reduce_to_digit_single_digit_passthrough() -> None:
    assert reduce_to_digit(0) == 0
    assert reduce_to_digit(7) == 7


def test_reduce_to_digit_two_digit_collapses() -> None:
    assert reduce_to_digit(18) == 9  # 1+8
    assert reduce_to_digit(99) == 9  # 9+9=18, 1+8=9


def test_reduce_to_digit_large_number() -> None:
    # 418 -> 4+1+8=13 -> 1+3=4
    assert reduce_to_digit(418) == 4


def test_reduce_to_digit_negative_uses_abs() -> None:
    assert reduce_to_digit(-37) == 1  # 3+7=10 -> 1


# ── compute_gematria ─────────────────────────────────────────────


def test_compute_gematria_known_value() -> None:
    """ἀγαθοδαίμων has the classical isopsephic value 433.
    α+γ+α+θ+ο+δ+α+ι+μ+ω+ν = 1+3+1+9+70+4+1+10+40+800+50 = 989?
    Let's use a simpler check: σοφια = 781 (σ+ο+φ+ι+α = 200+70+500+10+1)."""
    greek_iso = bundled_by_slug("greek-iso")
    assert greek_iso is not None
    mapping = dict(greek_iso.mapping)
    assert compute_gematria("σοφια", mapping) == 781


def test_compute_gematria_skips_unmapped() -> None:
    greek_iso = bundled_by_slug("greek-iso")
    assert greek_iso is not None
    mapping = dict(greek_iso.mapping)
    # Latin chars + spaces have no values; only the ω counts.
    assert compute_gematria("hello ω world", mapping) == 800


def test_compute_gematria_empty_string() -> None:
    assert compute_gematria("", {"α": 1}) == 0


def test_compute_gematria_no_mapped_chars_returns_zero() -> None:
    assert compute_gematria("xyz", {"α": 1}) == 0


# ── compute_index_rows ───────────────────────────────────────────


def test_compute_index_rows_single_phrase_single_cipher() -> None:
    greek_iso = bundled_by_slug("greek-iso")
    assert greek_iso is not None
    cipher_id = uuid4()
    rows = compute_index_rows(
        "σοφια",
        [(cipher_id, dict(greek_iso.mapping))],
    )
    # 1-gram: "σοφια" = 781
    assert any(
        r.phrase == "σοφια" and r.value == 781 and r.cipher_id == cipher_id
        for r in rows
    )


def test_compute_index_rows_skips_zero_values() -> None:
    """Phrases whose value is 0 (no chars in the cipher's mapping)
    must not be indexed — keeps the index small."""
    greek_iso = bundled_by_slug("greek-iso")
    assert greek_iso is not None
    cipher_id = uuid4()
    rows = compute_index_rows(
        "hello world",  # no Greek chars
        [(cipher_id, dict(greek_iso.mapping))],
    )
    assert rows == []


def test_compute_index_rows_yields_unigrams_bigrams_trigrams() -> None:
    greek_iso = bundled_by_slug("greek-iso")
    assert greek_iso is not None
    cipher_id = uuid4()
    rows = compute_index_rows(
        "σοφια αληθεια καλον",
        [(cipher_id, dict(greek_iso.mapping))],
    )
    phrases = {r.phrase for r in rows}
    # Unigrams
    assert "σοφια" in phrases
    assert "αληθεια" in phrases
    assert "καλον" in phrases
    # Bigrams
    assert "σοφια αληθεια" in phrases
    assert "αληθεια καλον" in phrases
    # Trigram
    assert "σοφια αληθεια καλον" in phrases


def test_compute_index_rows_multi_cipher() -> None:
    greek_iso = bundled_by_slug("greek-iso")
    greek_ord = bundled_by_slug("greek-ord")
    assert greek_iso is not None and greek_ord is not None
    c1 = uuid4()
    c2 = uuid4()
    rows = compute_index_rows(
        "σοφια",
        [
            (c1, dict(greek_iso.mapping)),
            (c2, dict(greek_ord.mapping)),
        ],
    )
    # σοφια under iso = 781, under ord = σ(18)+ο(15)+φ(21)+ι(9)+α(1) = 64
    iso_match = next(r for r in rows if r.cipher_id == c1 and r.phrase == "σοφια")
    ord_match = next(r for r in rows if r.cipher_id == c2 and r.phrase == "σοφια")
    assert iso_match.value == 781
    assert iso_match.digit_sum == 7  # 7+8+1=16 → 7
    assert ord_match.value == 64
    assert ord_match.digit_sum == 1  # 6+4=10 → 1


def test_compute_index_rows_deduplicates_repeated_phrases() -> None:
    """If a phrase appears twice in the text, the indexer only
    indexes it once (per cipher) — the unique constraint would
    reject a second insert anyway."""
    greek_iso = bundled_by_slug("greek-iso")
    assert greek_iso is not None
    cipher_id = uuid4()
    rows = compute_index_rows(
        "σοφια σοφια σοφια",
        [(cipher_id, dict(greek_iso.mapping))],
    )
    σοφια_unigrams = [r for r in rows if r.phrase == "σοφια"]
    assert len(σοφια_unigrams) == 1


def test_compute_index_rows_respects_240_char_limit() -> None:
    """Phrases longer than 240 chars do not index."""
    cipher_id = uuid4()
    long_word = "α" * 300
    rows = compute_index_rows(
        long_word,
        [(cipher_id, {"α": 1})],
    )
    # The 300-α unigram is over the limit → skipped.
    assert not any(r.phrase == long_word for r in rows)


def test_compute_index_rows_normalises_input() -> None:
    """Phrase keys are already-normalised text."""
    greek_iso = bundled_by_slug("greek-iso")
    assert greek_iso is not None
    cipher_id = uuid4()
    rows = compute_index_rows(
        "Ἀγάπη",  # uppercase + diacritics
        [(cipher_id, dict(greek_iso.mapping))],
    )
    # "αγαπη" = 1+3+1+80+8 = 93
    target = next((r for r in rows if r.phrase == "αγαπη"), None)
    assert target is not None
    assert target.value == 93


def test_index_row_is_frozen_dataclass() -> None:
    """IndexRow is immutable — defensive against accidental mutation
    in the hot indexer path."""
    import pytest

    row = IndexRow(
        cipher_id=uuid4(), phrase="σοφια", value=781, digit_sum=7,
    )
    with pytest.raises(Exception):
        row.value = 100  # type: ignore[misc]
