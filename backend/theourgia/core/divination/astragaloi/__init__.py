"""Astragaloi (five-knucklebone) oracle engine.

The 56-cast corpus is operator-supplied content assembled from the
hellinismos-grimoire notes (Heinevetter's Greek, the Order's draft
renderings, Graf's English, and the Session-16 tetraktys overlay).
The loader validates the corpus invariants on first access and the
lookup resolves a cast by its unordered face multiset.

Nothing here ever synthesises a verse — a missing corpus row is a
hard error, never a generated fallback (H12 data-contract note).
"""

from theourgia.core.divination.astragaloi.corpus import (
    IMPOSSIBLE_SUMS,
    LEGAL_FACES,
    CorpusCast,
    CorpusValidationError,
    cast_for_faces,
    corpus_meta,
    load_corpus,
    simulate_faces,
    validate_faces,
)

__all__ = [
    "IMPOSSIBLE_SUMS",
    "LEGAL_FACES",
    "CorpusCast",
    "CorpusValidationError",
    "cast_for_faces",
    "corpus_meta",
    "load_corpus",
    "simulate_faces",
    "validate_faces",
]
