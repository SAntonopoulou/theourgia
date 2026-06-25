"""Unit tests for the magic_squares router + planetary constants (B103).

Pydantic shape + helper-function + router-registration smoke,
matching the existing convention (``test_api_entries.py``).

The seven planetary squares are validated separately because they
are the load-bearing reference material — every cell value comes
from Agrippa 1531 and the test pins those values.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1 import magic_squares as ms_module
from theourgia.api.routers.v1.magic_squares import (
    MagicSquareCreate,
    MagicSquareRead,
    MagicSquareUpdate,
    _validate_cells_shape,
)
from theourgia.core.workshop.planetary_squares import (
    JUPITER_4X4,
    MARS_5X5,
    MERCURY_8X8,
    MOON_9X9,
    PLANETARY_SQUARES,
    SATURN_3X3,
    SUN_6X6,
    VENUS_7X7,
    is_valid_magic_square,
    magic_constant,
)


# ── Planetary squares: constants verified ────────────────────────────


def test_planetary_squares_ship_in_sacred_order() -> None:
    """Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon (slowest
    planet to fastest, classical celestial order). NEVER re-sort."""
    planets = [s.planet for s in PLANETARY_SQUARES]
    assert planets == [
        "saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon",
    ]


def test_all_seven_planetary_squares_are_valid() -> None:
    """Every row, column, and both main diagonals sum to the planet's
    magic constant. This is the load-bearing test for the whole
    constants module."""
    for s in PLANETARY_SQUARES:
        assert is_valid_magic_square(s.cells), (
            f"{s.planet} square is invalid"
        )


def test_planetary_square_magic_constants() -> None:
    """The classical magic constants per Agrippa 1531."""
    assert SATURN_3X3.magic_constant == 15
    assert JUPITER_4X4.magic_constant == 34
    assert MARS_5X5.magic_constant == 65
    assert SUN_6X6.magic_constant == 111
    assert VENUS_7X7.magic_constant == 175
    assert MERCURY_8X8.magic_constant == 260
    assert MOON_9X9.magic_constant == 369


def test_planetary_square_orders() -> None:
    assert SATURN_3X3.order == 3
    assert JUPITER_4X4.order == 4
    assert MARS_5X5.order == 5
    assert SUN_6X6.order == 6
    assert VENUS_7X7.order == 7
    assert MERCURY_8X8.order == 8
    assert MOON_9X9.order == 9


def test_planetary_squares_cell_dimensions_match_order() -> None:
    for s in PLANETARY_SQUARES:
        assert len(s.cells) == s.order
        for row in s.cells:
            assert len(row) == s.order


# ── Helpers: magic_constant + is_valid_magic_square ──────────────────


def test_magic_constant_formula() -> None:
    """n(n² + 1) / 2."""
    assert magic_constant(3) == 15
    assert magic_constant(4) == 34
    assert magic_constant(5) == 65
    assert magic_constant(9) == 369


def test_is_valid_magic_square_rejects_too_small() -> None:
    assert is_valid_magic_square([[1, 2], [3, 4]]) is False


def test_is_valid_magic_square_rejects_non_square_shape() -> None:
    """Each row must have ``order`` cells."""
    bad = [
        [1, 2, 3],
        [4, 5],  # short row
        [7, 8, 9],
    ]
    assert is_valid_magic_square(bad) is False


def test_is_valid_magic_square_rejects_wrong_sums() -> None:
    """All-1s is not magic."""
    assert is_valid_magic_square([[1, 1, 1], [1, 1, 1], [1, 1, 1]]) is False


def test_is_valid_magic_square_accepts_lo_shu() -> None:
    """Lo Shu is the canonical 3×3 magic square (same as Saturn)."""
    lo_shu = [[4, 9, 2], [3, 5, 7], [8, 1, 6]]
    assert is_valid_magic_square(lo_shu) is True


def test_is_valid_magic_square_accepts_tuple_input() -> None:
    """Helper accepts both lists and tuples (for the Python
    constants and for fresh user input)."""
    assert is_valid_magic_square(SATURN_3X3.cells) is True


# ── Schema: MagicSquareCreate ────────────────────────────────────────


def test_magic_square_create_minimal_payload_validates() -> None:
    payload = MagicSquareCreate(
        name="Lo Shu",
        order=3,
        cells=[[4, 9, 2], [3, 5, 7], [8, 1, 6]],
    )
    assert payload.order == 3
    assert payload.attribution is None


def test_magic_square_create_with_attribution() -> None:
    payload = MagicSquareCreate(
        name="Diabolic 4×4",
        order=4,
        cells=[[0] * 4 for _ in range(4)],
        attribution="Picatrix variant",
    )
    assert payload.attribution == "Picatrix variant"


def test_magic_square_create_rejects_order_too_small() -> None:
    with pytest.raises(ValidationError):
        MagicSquareCreate(name="x", order=2, cells=[[0, 0], [0, 0]])


def test_magic_square_create_rejects_order_too_large() -> None:
    with pytest.raises(ValidationError):
        MagicSquareCreate(
            name="x",
            order=13,
            cells=[[0] * 13 for _ in range(13)],
        )


def test_magic_square_create_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        MagicSquareCreate(
            name="",
            order=3,
            cells=[[0] * 3 for _ in range(3)],
        )


def test_magic_square_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        MagicSquareCreate(
            name="x",
            order=3,
            cells=[[0] * 3 for _ in range(3)],
            is_magic=True,  # type: ignore[call-arg]
        )


# ── Schema: MagicSquareUpdate ────────────────────────────────────────


def test_magic_square_update_omits_order_field() -> None:
    """``order`` is immutable — changing it would invalidate cells."""
    fields = set(MagicSquareUpdate.model_fields.keys())
    assert "order" not in fields
    assert "name" in fields
    assert "cells" in fields
    assert "attribution" in fields


def test_magic_square_update_partial_payload() -> None:
    payload = MagicSquareUpdate(name="renamed")
    assert payload.name == "renamed"
    assert payload.cells is None


# ── Helper: _validate_cells_shape ────────────────────────────────────


def test_validate_cells_shape_accepts_well_formed() -> None:
    _validate_cells_shape([[1, 2, 3], [4, 5, 6], [7, 8, 9]], order=3)


def test_validate_cells_shape_rejects_wrong_row_count() -> None:
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as ctx:
        _validate_cells_shape([[1, 2, 3], [4, 5, 6]], order=3)
    assert ctx.value.status_code == 400


def test_validate_cells_shape_rejects_wrong_column_count() -> None:
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as ctx:
        _validate_cells_shape(
            [[1, 2, 3], [4, 5], [7, 8, 9]], order=3,
        )
    assert ctx.value.status_code == 400


# ── Router registration smoke ────────────────────────────────────────


def test_magic_squares_router_registers_expected_routes() -> None:
    """Planetary (public) + list + create + get + patch + delete = 6."""
    methods_and_paths = sorted(
        (frozenset(r.methods), r.path)
        for r in ms_module.router.routes
        if hasattr(r, "methods")
    )
    expected = sorted(
        [
            (frozenset({"GET"}), "/magic-squares/planetary"),
            (frozenset({"GET"}), "/magic-squares"),
            (frozenset({"POST"}), "/magic-squares"),
            (frozenset({"GET"}), "/magic-squares/{square_id}"),
            (frozenset({"PATCH"}), "/magic-squares/{square_id}"),
            (frozenset({"DELETE"}), "/magic-squares/{square_id}"),
        ]
    )
    assert methods_and_paths == expected


def test_magic_squares_read_schema_round_trip() -> None:
    """``MagicSquareRead`` accepts an int-array of ints — verifies the
    model schema is consistent with how rows serialise."""
    sample = MagicSquareRead(
        id="00000000-0000-0000-0000-000000000000",
        owner_id=None,
        name="Sample",
        order=3,
        cells=[[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        attribution=None,
        is_magic=False,
        created_at=__import__("datetime").datetime(
            2026, 6, 23, tzinfo=__import__("datetime").timezone.utc,
        ),
        updated_at=__import__("datetime").datetime(
            2026, 6, 23, tzinfo=__import__("datetime").timezone.utc,
        ),
    )
    assert sample.order == 3
    assert sample.is_magic is False
