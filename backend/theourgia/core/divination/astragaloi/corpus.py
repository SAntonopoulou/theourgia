"""Loader + validator for the 56-cast astragaloi corpus.

Source of truth: ``theourgia/data/astragaloi_corpus.json``. The file
is transcription, not invention — the loader's job is to *verify* the
mechanical invariants and expose typed lookups, never to repair or
fill gaps.

Invariants enforced on load (rule 68 mechanics):

* exactly 56 casts;
* every cast is five faces, each face ∈ {1, 3, 4, 6} (never 2 or 5);
* every recorded sum equals the sum of its faces;
* the face multisets are pairwise distinct (the 56 unordered
  combinations);
* the sums present are exactly 5–30 minus the impossible {6, 29};
* the tetraktys overlay is self-consistent with its locked rules
  (sphere = sum mod 10 with 0→10; octave = luminous ≤10 /
  embodied 11–20 / chthonic 21–30);
* every valence is one of the castsheet's three keys.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from functools import lru_cache
from importlib import resources
from typing import Any, Iterable, Mapping

__all__ = [
    "IMPOSSIBLE_SUMS",
    "LEGAL_FACES",
    "VALENCES",
    "OCTAVES",
    "CorpusCast",
    "CorpusValidationError",
    "cast_for_faces",
    "corpus_meta",
    "load_corpus",
    "simulate_faces",
    "validate_faces",
]


LEGAL_FACES: tuple[int, ...] = (1, 3, 4, 6)
IMPOSSIBLE_SUMS: frozenset[int] = frozenset({6, 29})
VALENCES: tuple[str, ...] = ("favourable", "cautionary", "unfavourable")
OCTAVES: tuple[str, ...] = ("luminous", "embodied", "chthonic")

_EXPECTED_CAST_COUNT = 56
_EXPECTED_SUMS = frozenset(range(5, 31)) - IMPOSSIBLE_SUMS


class CorpusValidationError(RuntimeError):
    """The corpus file violates a mechanical invariant.

    Raised at load time — a broken corpus must fail fast, before any
    cast can resolve against it.
    """


@dataclass(frozen=True)
class CorpusCast:
    """One resolved row of the 56-cast table."""

    faces: tuple[int, int, int, int, int]  # sorted ascending
    sum: int
    oracle_number: str  # Roman numeral, "I".."LVI"
    god_greek: str
    god_english: str
    verse_greek: str | None  # None where Heinevetter preserves nothing
    verse_english: str
    valence: str  # favourable | cautionary | unfavourable
    sphere: int  # 1..10 (sum mod 10, 0→10)
    octave: str  # luminous | embodied | chthonic
    ground_element: str  # Fire | Air | Water | Earth (Scheme A)
    notes: str | None


def _corpus_path_text() -> str:
    return (
        resources.files("theourgia")
        .joinpath("data/astragaloi_corpus.json")
        .read_text(encoding="utf-8")
    )


def validate_faces(faces: Iterable[int]) -> tuple[int, int, int, int, int]:
    """Normalise a face sequence to the canonical sorted 5-tuple.

    Raises :class:`ValueError` when the throw is not five bones or any
    face is off the legal {1, 3, 4, 6} set (a knucklebone never lands
    on 2 or 5 — rule 68).
    """
    faces = list(faces)
    if len(faces) != 5:
        raise ValueError(
            f"an astragaloi throw is exactly five bones, got {len(faces)}"
        )
    for f in faces:
        if not isinstance(f, int) or isinstance(f, bool) or f not in LEGAL_FACES:
            raise ValueError(
                f"illegal face {f!r}: a knucklebone lands on 1, 3, 4 or 6 only"
            )
    ordered = tuple(sorted(faces))
    return ordered  # type: ignore[return-value]


def _expected_sphere(total: int) -> int:
    return total % 10 or 10


def _expected_octave(total: int) -> str:
    if total <= 10:
        return "luminous"
    if total <= 20:
        return "embodied"
    return "chthonic"


def _parse_cast(raw: Mapping[str, Any], index: int) -> CorpusCast:
    where = f"cast #{index + 1} ({raw.get('oracle_number', '?')})"
    try:
        faces = validate_faces(raw["faces"])
    except (ValueError, KeyError) as exc:
        raise CorpusValidationError(f"{where}: {exc}") from exc

    total = raw.get("sum")
    if total != sum(faces):
        raise CorpusValidationError(
            f"{where}: recorded sum {total!r} != faces sum {sum(faces)}"
        )
    if total in IMPOSSIBLE_SUMS:
        raise CorpusValidationError(
            f"{where}: sum {total} is mechanically impossible"
        )

    valence = raw.get("valence")
    if valence not in VALENCES:
        raise CorpusValidationError(
            f"{where}: valence {valence!r} not in {VALENCES}"
        )

    tetraktys = raw.get("tetraktys") or {}
    sphere = tetraktys.get("sphere")
    octave = tetraktys.get("octave")
    element = tetraktys.get("ground_element")
    if sphere != _expected_sphere(total):
        raise CorpusValidationError(
            f"{where}: sphere {sphere!r} breaks the locked overlay rule "
            f"(sum mod 10, 0→10 ⇒ {_expected_sphere(total)})"
        )
    if octave != _expected_octave(total):
        raise CorpusValidationError(
            f"{where}: octave {octave!r} breaks the locked overlay rule "
            f"(⇒ {_expected_octave(total)})"
        )
    if not element:
        raise CorpusValidationError(f"{where}: missing ground_element")

    god = raw.get("god") or {}
    god_greek = god.get("greek")
    god_english = god.get("english")
    if not god_greek or not god_english:
        raise CorpusValidationError(f"{where}: missing god name")

    verse_english = raw.get("verse_english")
    if not verse_english:
        raise CorpusValidationError(f"{where}: missing verse_english")

    oracle_number = raw.get("oracle_number")
    if not oracle_number:
        raise CorpusValidationError(f"{where}: missing oracle_number")

    return CorpusCast(
        faces=faces,
        sum=total,
        oracle_number=oracle_number,
        god_greek=god_greek,
        god_english=god_english,
        verse_greek=raw.get("verse_greek"),
        verse_english=verse_english,
        valence=valence,
        sphere=sphere,
        octave=octave,
        ground_element=element,
        notes=raw.get("notes"),
    )


@lru_cache(maxsize=1)
def _load() -> tuple[dict[tuple[int, ...], CorpusCast], dict[str, Any]]:
    doc = json.loads(_corpus_path_text())
    raw_casts = doc.get("casts")
    if not isinstance(raw_casts, list):
        raise CorpusValidationError("corpus has no 'casts' array")
    if len(raw_casts) != _EXPECTED_CAST_COUNT:
        raise CorpusValidationError(
            f"corpus must hold exactly {_EXPECTED_CAST_COUNT} casts, "
            f"got {len(raw_casts)}"
        )

    by_faces: dict[tuple[int, ...], CorpusCast] = {}
    for i, raw in enumerate(raw_casts):
        cast = _parse_cast(raw, i)
        if cast.faces in by_faces:
            raise CorpusValidationError(
                f"duplicate face multiset {cast.faces} "
                f"({by_faces[cast.faces].oracle_number} vs {cast.oracle_number})"
            )
        by_faces[cast.faces] = cast

    sums_present = {c.sum for c in by_faces.values()}
    if sums_present != _EXPECTED_SUMS:
        missing = sorted(_EXPECTED_SUMS - sums_present)
        extra = sorted(sums_present - _EXPECTED_SUMS)
        raise CorpusValidationError(
            f"sum coverage broken: missing {missing}, illegal {extra}"
        )

    meta = doc.get("meta")
    if not isinstance(meta, dict):
        raise CorpusValidationError("corpus has no 'meta' object")
    return by_faces, meta


def load_corpus() -> tuple[CorpusCast, ...]:
    """All 56 casts, ordered by (sum, faces). Validated on first load."""
    by_faces, _ = _load()
    return tuple(sorted(by_faces.values(), key=lambda c: (c.sum, c.faces)))


def cast_for_faces(faces: Iterable[int]) -> CorpusCast:
    """Resolve the corpus row for an unordered throw of five faces.

    Raises :class:`ValueError` for an illegal throw. Every legal throw
    resolves — the corpus covers all 56 combinations by construction.
    """
    ordered = validate_faces(faces)
    by_faces, _ = _load()
    try:
        return by_faces[ordered]
    except KeyError as exc:  # unreachable with a validated corpus
        raise CorpusValidationError(
            f"corpus has no row for faces {ordered} — corpus is incomplete"
        ) from exc


def corpus_meta() -> dict[str, Any]:
    """The corpus ``meta`` block — provenance, legend, gaps and the
    pending Nollé adjudications, for display verbatim."""
    _, meta = _load()
    return meta


def simulate_faces(rng: random.Random | None = None) -> tuple[int, ...]:
    """Generate a server-side simulated throw (five legal faces).

    Uniform over faces, which is *not* the physical bone's bias — a
    simulated cast is a study aid, and rule 67 marks it simulated
    forever at the persistence layer.
    """
    chooser = rng if rng is not None else random
    return tuple(chooser.choice(LEGAL_FACES) for _ in range(5))
