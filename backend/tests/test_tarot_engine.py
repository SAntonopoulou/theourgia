"""Tarot engine tests — determinism, reversal flips, bundle integrity.

Pure-Python tests of the seeded-shuffle engine + the RWS bundle.
The DB-integration round-trip (cast → persist → retrieve) is covered
by the deploy path; these tests lock the engine invariants.
"""

from __future__ import annotations

import pytest

from theourgia.core.divination.tarot import (
    DrawnCard,
    draw_cards,
    make_seed,
    shuffle_deck,
    tarot_cast,
)
from theourgia.core.divination.tarot.bundles import (
    BUILTIN_DECKS,
    BUILTIN_SPREADS,
    RIDER_WAITE_SMITH,
    builtin_deck_by_slug,
    builtin_spread_by_slug,
)
from theourgia.models.tarot import Suit


# ───── make_seed ──────────────────────────────────────────────────────


def test_make_seed_is_deterministic_for_same_inputs() -> None:
    a = make_seed("2026-06-21T18:00:00Z", "Should I take the offer?")
    b = make_seed("2026-06-21T18:00:00Z", "Should I take the offer?")
    assert a == b
    assert len(a) == 64  # SHA-256 hex digest


def test_make_seed_differs_for_different_inputs() -> None:
    a = make_seed("2026-06-21T18:00:00Z", "A")
    b = make_seed("2026-06-21T18:00:00Z", "B")
    assert a != b


def test_make_seed_handles_unicode() -> None:
    seed = make_seed("2026-06-21", "Ευλογία")
    assert isinstance(seed, str)


# ───── shuffle_deck ───────────────────────────────────────────────────


def test_shuffle_is_a_permutation() -> None:
    """The shuffled list contains every position exactly once."""
    positions = shuffle_deck(78, seed="test")
    assert sorted(positions) == list(range(78))
    assert len(positions) == 78


def test_same_seed_yields_same_shuffle() -> None:
    a = shuffle_deck(78, seed="hekate")
    b = shuffle_deck(78, seed="hekate")
    assert a == b


def test_different_seeds_yield_different_shuffles() -> None:
    a = shuffle_deck(78, seed="seed-a")
    b = shuffle_deck(78, seed="seed-b")
    # 78! permutations; the probability of collision is vanishingly
    # small, so we treat equality as a real bug if it happens.
    assert a != b


def test_shuffle_rejects_nonpositive_deck_size() -> None:
    with pytest.raises(ValueError):
        shuffle_deck(0, seed="x")
    with pytest.raises(ValueError):
        shuffle_deck(-1, seed="x")


# ───── draw_cards ─────────────────────────────────────────────────────


def test_draw_cards_returns_correct_count() -> None:
    cards = draw_cards(78, position_count=10, seed="celtic")
    assert len(cards) == 10
    for i, card in enumerate(cards):
        assert isinstance(card, DrawnCard)
        assert card.position_index == i


def test_draw_cards_positions_are_unique() -> None:
    """Two positions in the same reading never land on the same card."""
    cards = draw_cards(78, position_count=10, seed="celtic")
    positions = [c.card_position for c in cards]
    assert len(set(positions)) == len(positions)


def test_draw_cards_same_seed_is_reproducible() -> None:
    a = draw_cards(78, position_count=5, seed="reproducible")
    b = draw_cards(78, position_count=5, seed="reproducible")
    assert a == b


def test_draw_cards_rejects_drawing_more_than_deck_size() -> None:
    with pytest.raises(ValueError):
        draw_cards(10, position_count=11, seed="x")


def test_draw_cards_rejects_nonpositive_position_count() -> None:
    with pytest.raises(ValueError):
        draw_cards(10, position_count=0, seed="x")


def test_draw_cards_disabling_reversals_keeps_all_upright() -> None:
    cards = draw_cards(78, position_count=10, seed="rev", reversals=False)
    assert all(not c.reversed for c in cards)


def test_draw_cards_with_reversals_sometimes_reverses() -> None:
    """Across many seeds with reversals on, at least one card flips."""
    seen_reversal = False
    for i in range(50):
        cards = draw_cards(78, position_count=3, seed=f"seed-{i}", reversals=True)
        if any(c.reversed for c in cards):
            seen_reversal = True
            break
    assert seen_reversal, "no reversals seen across 50 seeds — RNG is broken"


def test_draw_cards_orientation_bias_zero_means_no_reversals() -> None:
    cards = draw_cards(
        78, position_count=10, seed="b0", reversals=True, orientation_bias=0.0,
    )
    assert all(not c.reversed for c in cards)


def test_draw_cards_orientation_bias_one_means_all_reversed() -> None:
    cards = draw_cards(
        78, position_count=10, seed="b1", reversals=True, orientation_bias=1.0,
    )
    assert all(c.reversed for c in cards)


def test_draw_cards_rejects_invalid_orientation_bias() -> None:
    with pytest.raises(ValueError):
        draw_cards(78, position_count=3, seed="x", orientation_bias=1.5)
    with pytest.raises(ValueError):
        draw_cards(78, position_count=3, seed="x", orientation_bias=-0.1)


# ───── tarot_cast wrapper ────────────────────────────────────────────


def test_tarot_cast_matches_draw_cards() -> None:
    a = tarot_cast(deck_size=78, position_count=3, seed="match")
    b = draw_cards(deck_size=78, position_count=3, seed="match")
    assert a == b


# ───── Rider-Waite-Smith bundle ──────────────────────────────────────


def test_rws_has_seventy_eight_cards() -> None:
    assert len(RIDER_WAITE_SMITH.cards) == 78


def test_rws_majors_are_first_twenty_two() -> None:
    majors = [c for c in RIDER_WAITE_SMITH.cards if c.suit == Suit.MAJOR]
    assert len(majors) == 22
    assert [c.position for c in majors] == list(range(22))


def test_rws_minors_split_by_suit() -> None:
    by_suit: dict[Suit, int] = {}
    for c in RIDER_WAITE_SMITH.cards:
        by_suit[c.suit] = by_suit.get(c.suit, 0) + 1
    assert by_suit[Suit.MAJOR] == 22
    assert by_suit[Suit.WANDS] == 14
    assert by_suit[Suit.CUPS] == 14
    assert by_suit[Suit.SWORDS] == 14
    assert by_suit[Suit.PENTACLES] == 14


def test_rws_positions_are_unique_and_contiguous() -> None:
    positions = [c.position for c in RIDER_WAITE_SMITH.cards]
    assert positions == list(range(78))


def test_rws_slugs_are_unique() -> None:
    slugs = [c.slug for c in RIDER_WAITE_SMITH.cards]
    assert len(set(slugs)) == 78


def test_rws_known_cards_present() -> None:
    by_slug = {c.slug: c for c in RIDER_WAITE_SMITH.cards}
    assert "the-fool" in by_slug
    assert "the-world" in by_slug
    assert "ace-of-cups" in by_slug
    assert "king-of-pentacles" in by_slug


def test_rws_majors_have_arcana_number() -> None:
    for c in RIDER_WAITE_SMITH.cards:
        if c.suit == Suit.MAJOR:
            assert c.arcana_number is not None
            assert 0 <= c.arcana_number <= 21


def test_rws_correspondences_include_hebrew_letter_for_majors() -> None:
    fool = next(c for c in RIDER_WAITE_SMITH.cards if c.slug == "the-fool")
    assert "hebrew_letter" in fool.correspondences
    assert fool.correspondences["hebrew_letter"] == "Aleph"


def test_rws_meanings_populated_for_every_card() -> None:
    for c in RIDER_WAITE_SMITH.cards:
        assert c.upright_meaning, f"{c.slug} missing upright_meaning"
        assert c.reversed_meaning, f"{c.slug} missing reversed_meaning"


def test_rws_license_is_public_domain() -> None:
    assert RIDER_WAITE_SMITH.license == "public-domain"


# ───── Built-in spreads ───────────────────────────────────────────────


def test_builtin_spreads_count() -> None:
    """Single, two three-card variants, Celtic Cross, Year Ahead."""
    assert len(BUILTIN_SPREADS) == 5


def test_celtic_cross_has_ten_positions() -> None:
    cc = builtin_spread_by_slug("celtic-cross")
    assert len(cc.positions) == 10
    assert [p["index"] for p in cc.positions] == list(range(10))


def test_year_ahead_has_twelve_positions() -> None:
    ya = builtin_spread_by_slug("year-ahead")
    assert len(ya.positions) == 12


def test_single_card_spread() -> None:
    s = builtin_spread_by_slug("single-card")
    assert len(s.positions) == 1


def test_builtin_spread_lookup_unknown_raises() -> None:
    with pytest.raises(KeyError):
        builtin_spread_by_slug("not-a-real-spread")


# ───── Cross-cutting: cast a Celtic Cross with the RWS deck ──────────


def test_celtic_cross_cast_with_rws_is_deterministic() -> None:
    deck_size = len(RIDER_WAITE_SMITH.cards)
    cc = builtin_spread_by_slug("celtic-cross")
    a = tarot_cast(deck_size=deck_size, position_count=len(cc.positions), seed="x")
    b = tarot_cast(deck_size=deck_size, position_count=len(cc.positions), seed="x")
    assert a == b
    assert len(a) == 10


def test_builtin_decks_lookup() -> None:
    found = builtin_deck_by_slug("rider-waite-smith")
    assert found is RIDER_WAITE_SMITH


def test_builtin_decks_lookup_unknown_raises() -> None:
    with pytest.raises(KeyError):
        builtin_deck_by_slug("not-real")


# ───── Tarot model class-shape tests ─────────────────────────────────


def test_tarot_models_carry_expected_columns() -> None:
    from theourgia.models.tarot import Card, Deck, Reading, Spread

    for col in ("name", "slug", "tradition", "reversal_convention", "is_builtin"):
        assert hasattr(Deck, col)
    for col in ("deck_id", "position", "slug", "name", "suit"):
        assert hasattr(Card, col)
    for col in ("name", "slug", "kind", "positions", "is_builtin"):
        assert hasattr(Spread, col)
    for col in (
        "deck_id", "spread_id", "seed", "drawn_at", "drawn_cards",
        "question", "querent", "draw_method", "retrospective_rating",
    ):
        assert hasattr(Reading, col)


# ───── Router payload class-shape tests ──────────────────────────────


def test_cast_request_default_draw_method_and_querent() -> None:
    from uuid import uuid4

    from theourgia.api.routers.v1.tarot import CastRequest

    payload = CastRequest(deck_id=uuid4(), spread_id=uuid4())
    assert payload.draw_method == "browser_rng"
    assert payload.querent == "self"
    assert payload.seed is None


def test_deck_create_rejects_empty_cards_list() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.tarot import DeckCreate

    with pytest.raises(ValidationError):
        DeckCreate(name="X", slug="x", cards=[])


def test_reading_update_rating_must_be_one_to_five() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.tarot import ReadingUpdate

    ReadingUpdate(retrospective_rating=5)
    ReadingUpdate(retrospective_rating=1)
    with pytest.raises(ValidationError):
        ReadingUpdate(retrospective_rating=6)
    with pytest.raises(ValidationError):
        ReadingUpdate(retrospective_rating=0)
