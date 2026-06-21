"""Deterministic passage picker for bibliomancy.

Given a source text and a seed, pick a random passage at the
requested granularity (line, sentence, or paragraph). Same seed +
same source = same passage every time.

The split functions are intentionally simple — bibliomancy doesn't
require linguistic parsing; the user's text is whatever they
provided (a translation, a personal note, a Quote row). For
sentence splitting we use a regex that handles ``.``, ``!``, ``?``
followed by whitespace. Paragraph splitting uses blank lines.

If the source has fewer than the requested granularity's elements,
the engine falls back to the whole text rather than failing — a
two-line poem can still be "bibliomanced" sentence-by-sentence.
"""

from __future__ import annotations

import enum
import hashlib
import random
import re
from dataclasses import dataclass

__all__ = [
    "Passage",
    "PassageKind",
    "bibliomancy_cast",
    "split_text",
]


class PassageKind(str, enum.Enum):
    LINE = "line"
    SENTENCE = "sentence"
    PARAGRAPH = "paragraph"


@dataclass(frozen=True, slots=True)
class Passage:
    text: str
    """The drawn passage, leading/trailing whitespace stripped."""

    start_offset: int
    """Character index of the passage's first character in the
    source text — useful for highlighting the passage in context."""

    kind: PassageKind
    """Which granularity was used."""

    index: int
    """0-based index of the passage within the source (e.g. the 7th
    paragraph)."""

    total: int
    """Total count of passages of this kind in the source — gives
    the user a sense of how rare the draw was."""


_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")


def split_text(source: str, kind: PassageKind) -> list[tuple[int, str]]:
    """Split ``source`` into passages of the given granularity.

    Returns ``(start_offset, text)`` tuples, in document order.
    Empty strings (blank lines, multiple punctuation) are dropped.
    """
    if not source:
        return []
    if kind == PassageKind.LINE:
        results: list[tuple[int, str]] = []
        offset = 0
        for line in source.split("\n"):
            stripped = line.strip()
            if stripped:
                # Find the actual start of the stripped text in the
                # source line — this preserves the user's leading
                # whitespace expectations for highlighting.
                results.append((offset + (len(line) - len(line.lstrip())), stripped))
            offset += len(line) + 1  # +1 for the '\n'
        return results
    if kind == PassageKind.PARAGRAPH:
        results = []
        offset = 0
        # Split on double newlines (paragraph break); keep tracking
        # absolute offsets in the original text.
        chunks = re.split(r"\n\s*\n", source)
        for chunk in chunks:
            stripped = chunk.strip()
            if stripped:
                idx = source.index(stripped, offset)
                results.append((idx, stripped))
                offset = idx + len(stripped)
        return results
    if kind == PassageKind.SENTENCE:
        results = []
        # Sentence splitting walks the regex; each split point sits
        # AFTER the punctuation so we capture the trailing whitespace
        # as part of the boundary, not the sentence.
        last = 0
        for m in _SENTENCE_RE.finditer(source):
            chunk = source[last:m.start()].strip()
            if chunk:
                idx = source.index(chunk, last)
                results.append((idx, chunk))
            last = m.end()
        # The final sentence (no trailing punctuation match).
        trailing = source[last:].strip()
        if trailing:
            idx = source.index(trailing, last) if trailing in source[last:] else last
            results.append((idx, trailing))
        return results
    raise ValueError(f"unknown passage kind: {kind}")


def _seeded_random(seed: str) -> random.Random:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    seed_int = int.from_bytes(digest[:8], "big", signed=False)
    return random.Random(seed_int)


def bibliomancy_cast(
    source: str,
    seed: str,
    *,
    kind: PassageKind | str = PassageKind.PARAGRAPH,
) -> Passage:
    """Pick a random passage from ``source``.

    Falls back to the whole source as a single passage when the
    requested granularity yields nothing.
    """
    kind_enum = kind if isinstance(kind, PassageKind) else PassageKind(kind)
    if not source.strip():
        raise ValueError("source text must not be empty")

    passages = split_text(source, kind_enum)
    if not passages:
        # Fall back to the whole text.
        return Passage(
            text=source.strip(),
            start_offset=0,
            kind=kind_enum,
            index=0,
            total=1,
        )

    rng = _seeded_random(seed)
    idx = rng.randrange(len(passages))
    start, text = passages[idx]
    return Passage(
        text=text,
        start_offset=start,
        kind=kind_enum,
        index=idx,
        total=len(passages),
    )
