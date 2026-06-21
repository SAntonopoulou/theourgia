"""Tests for the Phase 06 practice-log surfaces:
Tree of Life paths catalog, body practice, banishing log.

Pure-Python tests; DB-integration via deploy path.
"""

from __future__ import annotations

import pytest

from theourgia.core.practice import (
    TREE_PATHS,
    TreeTradition,
    paths_for_tradition,
)


# ───── Tree of Life paths catalog ────────────────────────────────────


def test_three_traditions_bundled() -> None:
    """Lurianic, Golden Dawn, Thelemic — 22 paths each."""
    for tradition in TreeTradition:
        paths = paths_for_tradition(tradition)
        assert len(paths) == 22, f"{tradition} expected 22 paths"


def test_path_numbers_are_11_through_32() -> None:
    for tradition in TreeTradition:
        numbers = sorted(p.number for p in paths_for_tradition(tradition))
        assert numbers == list(range(11, 33))


def test_path_hebrew_letters_are_unique_per_tradition() -> None:
    for tradition in TreeTradition:
        letters = {p.hebrew_letter for p in paths_for_tradition(tradition)}
        assert len(letters) == 22


def test_golden_dawn_first_path_is_aleph_fool() -> None:
    gd = paths_for_tradition(TreeTradition.GOLDEN_DAWN)
    fool = next(p for p in gd if p.number == 11)
    assert fool.letter_name == "Aleph"
    assert fool.tarot_card == "the-fool"
    assert "Zeus" in fool.deity_associations


def test_lurianic_paths_have_no_tarot_attribution() -> None:
    """Lurianic Kabbalah pre-dates the Tarot overlay; the bundle
    leaves tarot_card None for the Lurianic tradition."""
    for p in paths_for_tradition(TreeTradition.LURIANIC):
        assert p.tarot_card is None
        assert p.planet is None


def test_thelemic_swap_heh_tzaddi() -> None:
    """Per Liber AL II:24 ('Tzaddi is not the Star'), the Thelemic
    tradition attaches The Star to Heh (15) and The Emperor to
    Tzaddi (28), reversing the Golden Dawn pairing."""
    thelemic = {p.number: p for p in paths_for_tradition(TreeTradition.THELEMIC)}
    assert thelemic[15].tarot_card == "the-star"
    assert thelemic[28].tarot_card == "the-emperor"
    # And the Golden Dawn version should not have the swap.
    gd = {p.number: p for p in paths_for_tradition(TreeTradition.GOLDEN_DAWN)}
    assert gd[15].tarot_card == "the-emperor"
    assert gd[28].tarot_card == "the-star"


def test_tree_paths_total_count_is_22_times_3() -> None:
    assert len(TREE_PATHS) == 22 * 3


def test_paths_for_unknown_tradition_raises() -> None:
    with pytest.raises(ValueError):
        paths_for_tradition("not-a-tradition")


def test_connections_within_sephirah_range() -> None:
    """Every path connects two sephiroth numbered 1..10."""
    for p in TREE_PATHS:
        lower, upper = p.connects
        assert 1 <= lower <= 10
        assert 1 <= upper <= 10
        # Some Trees draw paths with lower > upper in the diagram, but
        # the values are sephirah numbers, not positions.


# ───── Body practice ─────────────────────────────────────────────────


def test_body_practice_kind_enum() -> None:
    from theourgia.models.practice_logs import BodyPracticeKind

    assert {k.value for k in BodyPracticeKind} == {"asana", "pranayama", "other"}


def test_body_create_payload_requires_positive_duration() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.practice_logs import BodyCreate

    BodyCreate(posture_or_pattern="thunderbolt", duration_seconds=60)
    with pytest.raises(ValidationError):
        BodyCreate(posture_or_pattern="x", duration_seconds=0)
    with pytest.raises(ValidationError):
        BodyCreate(posture_or_pattern="x", duration_seconds=-1)


def test_body_create_default_kind_is_asana() -> None:
    from theourgia.api.routers.v1.practice_logs import BodyCreate

    p = BodyCreate(posture_or_pattern="dragon", duration_seconds=300)
    assert p.kind == "asana"
    assert p.breaks_count == 0


def test_body_create_rejects_negative_breaks() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.practice_logs import BodyCreate

    with pytest.raises(ValidationError):
        BodyCreate(
            posture_or_pattern="x",
            duration_seconds=60,
            breaks_count=-1,
        )


def test_body_practice_model_has_expected_columns() -> None:
    from theourgia.models.practice_logs import BodyPracticeSession

    for col in (
        "kind", "posture_or_pattern", "started_at", "duration_seconds",
        "breaks_count", "observation_notes", "body_snapshot_id",
    ):
        assert hasattr(BodyPracticeSession, col)


# ───── Banishing log ─────────────────────────────────────────────────


def test_banishing_method_enum() -> None:
    from theourgia.models.practice_logs import BanishingMethod

    expected = {
        "lbrp", "star_ruby", "simple_ground", "breath",
        "water", "salt", "bell", "incense", "khephra", "other",
    }
    assert {m.value for m in BanishingMethod} == expected


def test_banishing_create_payload_minimal() -> None:
    from theourgia.api.routers.v1.practice_logs import BanishingCreate

    p = BanishingCreate(method="lbrp")
    assert p.method == "lbrp"
    assert p.method_label is None


def test_banishing_create_rejects_invalid_method() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.practice_logs import BanishingCreate

    with pytest.raises(ValidationError):
        BanishingCreate(method="goetic-grand-banishing")  # type: ignore[arg-type]


def test_banishing_cadence_response_shape() -> None:
    from theourgia.api.routers.v1.practice_logs import BanishingCadence

    c = BanishingCadence(
        window_days=30,
        total_count=12,
        days_with_banishing=8,
        days_with_banishing_ratio=8 / 30,
    )
    assert c.days_with_banishing == 8


def test_banishing_log_model_has_expected_columns() -> None:
    from theourgia.models.practice_logs import BanishingLog

    for col in (
        "method", "method_label", "performed_at", "duration_seconds",
        "state_before", "state_after", "notes", "correspondences",
    ):
        assert hasattr(BanishingLog, col)


# ───── Path API payload shape ────────────────────────────────────────


def test_path_read_payload_round_trip() -> None:
    """`PathRead` accepts a TreeOfLifePath via the helper."""
    from theourgia.api.routers.v1.practice_logs import _path_to_read

    gd = paths_for_tradition(TreeTradition.GOLDEN_DAWN)
    fool = next(p for p in gd if p.number == 11)
    payload = _path_to_read(fool)
    assert payload.number == 11
    assert payload.tradition == "golden_dawn"
    assert payload.tarot_card == "the-fool"
    assert payload.deity_associations == list(fool.deity_associations)
