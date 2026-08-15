"""The derivation primitives, matching practiseapp exactly.

Sophia, 15 August 2026: *"the same engine on the phone and on the website."*

Four of the eight shared primitives are here — the ones that are arithmetic
over pack data rather than astronomy. They are ported from
`practiseapp/lib/domain/reading.dart` and held to vectors **emitted by that
code running**, not transcribed from reading it: see
`tests/vectors/astro-vectors.json` and `tests/test_astro_vectors.py`.

⚠ **The phone is the source of truth.** A disagreement is this side's to fix.

## ⚠ Four things that look like details and are not

**1. Values are STRINGS.** `sum-of-faces` yields `"10"`, not `10`. The layers
chain — one reads another's output — and the phone passes strings the whole
way. Returning numbers here would agree on every case a test happened to
check and differ the moment a table keyed by `"10"` is consulted.

**2. An empty value is DROPPED, not carried.** The phone does
`if (value.isEmpty) continue;`, so a table lookup that misses leaves the key
**absent** from the result — not present with an empty string. A reader
showing "Named: —" where the phone shows nothing at all is a different
reading.

**3. Bands are tried IN ORDER and the first that fits wins.** Sorting them
would change the answer for any pack whose bands overlap, and nothing stops a
pack from overlapping them.

**4. `cycle-of` is 1-BASED**: `((n - 1) % cycle) + 1`. Ten on a ten-cycle is
ten, not zero — and eleven is one. Python and Dart agree on modulo of a
negative with a positive divisor, so the same expression is safe in both;
C-family languages would not be, which is worth knowing before this is ever
ported a third time.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

__all__ = ["Band", "Layer", "band_lookup", "cycle_of", "derive", "table_lookup"]


@dataclass(frozen=True, slots=True)
class Band:
    """One named span of a ladder. ⚠ `up_to` is INCLUSIVE."""

    up_to: int
    name: str
    description: str = ""


@dataclass(frozen=True, slots=True)
class Layer:
    """One derived value, computed from the sum or from an earlier layer."""

    key: str
    label: str
    primitive: str
    #: Which earlier layer to read. Empty means the sum.
    #:
    #: ⚠ Only EARLIER ones, which is what stops the declarations forming a
    #: loop — the phone enforces it by construction and so does `derive`.
    source: str = ""
    cycle: int = 0
    bands: tuple[Band, ...] = ()
    table: dict[str, str] | None = None
    description: str = ""


def cycle_of(value: str, cycle: int) -> str:
    """Reduce a number into a 1-based cycle. ⚠ Ten on a ten-cycle is ten."""
    try:
        n = int(value)
    except (TypeError, ValueError):
        return ""
    if cycle <= 0:
        return ""
    return str(((n - 1) % cycle) + 1)


def band_lookup(value: str, bands: tuple[Band, ...]) -> tuple[str, str]:
    """The first band the number fits in. ⚠ In declared order, not sorted."""
    try:
        n = int(value)
    except (TypeError, ValueError):
        return "", ""
    for band in bands:
        if n <= band.up_to:
            return band.name, band.description
    return "", ""


def table_lookup(value: str, table: dict[str, str] | None) -> str:
    """A key through the pack's own table. ⚠ A miss is empty, never an error."""
    return (table or {}).get(value, "")


def derive(layers: tuple[Layer, ...], cast: tuple[int, ...]) -> dict[str, str]:
    """Every derived value for one cast, keyed by layer.

    ⚠ Mirrors `Diviner._derive` line for line, including the two behaviours
    that are easy to get wrong: an empty value is **dropped** rather than
    stored, and a layer whose source has no value is **skipped** rather than
    treated as reading the sum.
    """
    total = sum(cast)
    values: dict[str, str] = {}

    for layer in layers:
        source = str(total) if not layer.source else values.get(layer.source)
        if source is None:
            # ⚠ Its input never materialised — because an earlier layer was
            # dropped. Falling back to the sum here would invent a reading the
            # phone does not give.
            continue

        if layer.primitive == "sum-of-faces":
            value = str(total)
        elif layer.primitive == "cycle-of":
            value = cycle_of(source, layer.cycle)
        elif layer.primitive == "band-lookup":
            value, _ = band_lookup(source, layer.bands)
        elif layer.primitive == "table-lookup":
            value = table_lookup(source, layer.table)
        else:
            # ⚠ A primitive this build does not have. Nothing is invented —
            # the phone does the same, and refuses at install time so this is
            # only reachable by a pack older than a downgrade.
            value = ""

        if not value:
            continue
        values[layer.key] = value

    return values


def layers_from_payload(raw: list[dict[str, Any]]) -> tuple[Layer, ...]:
    """Read the layers out of a pack payload, as the phone spells them."""
    return tuple(
        Layer(
            key=str(item.get("key", "")),
            label=str(item.get("label", "")),
            primitive=str(item.get("primitive", "")),
            source=str(item.get("from", "")),
            cycle=int(item.get("cycle", 0) or 0),
            bands=tuple(
                Band(
                    up_to=int(b.get("upTo", 0)),
                    name=str(b.get("name", "")),
                    description=str(b.get("description", "")),
                )
                for b in item.get("bands", []) or []
            ),
            table={str(k): str(v) for k, v in (item.get("table") or {}).items()},
            description=str(item.get("description", "")),
        )
        for item in raw
    )
