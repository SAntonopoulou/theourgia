"""Search substrate — Postgres FTS + filter chips.

Lexical full-text search over Entry's ``title`` + ``body_text``
columns via a stored ``search_tsvector`` generated column with GIN
index (added in migration 0018). Filter chips compose on top: by
kind, visibility, tag, date range, astrology condition.

Sealed entries (`encryption_mode == sealed`) are excluded from
server-side text search — the server doesn't see the plaintext. The
client decrypts the candidate set on a small per-vault basis and
filters locally. This module returns only NON-SEALED matches; the
"plus sealed" composition happens at the API layer once the client
has supplied keys.

Semantic (vector) search via pgvector is a follow-up. The interface
here (:class:`SearchRequest` + :func:`search_entries`) is the same;
a future ``embed`` field on SearchRequest enables the additional
similarity ranking.
"""

from theourgia.core.search.search import (
    SearchHit,
    SearchRequest,
    SearchResults,
    search_entries,
)

__all__ = [
    "SearchHit",
    "SearchRequest",
    "SearchResults",
    "search_entries",
]
