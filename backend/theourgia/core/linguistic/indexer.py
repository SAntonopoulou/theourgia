"""Gematria indexer (B111).

Computes gematria values for every phrase in an entry's plaintext
body under every enabled cipher, and upserts the results into
``gematria_index``.

Design:
  * The core unit of work is a pure function ``compute_index_rows``
    that takes plaintext + a cipher and returns the rows to insert.
    Pure → trivially testable.
  * ``index_entry_gematria_sync`` is the side-effectful function that
    takes a DB session, fetches the entry + ciphers, calls the pure
    function, and upserts. Tests drive this directly.
  * A Celery task ``index_entry_gematria`` wraps the sync function in
    a session_scope. The entry's after_update hook calls
    ``index_entry_gematria.delay(entry_id)``. Wiring the hook is
    deferred to a follow-up — the indexer itself is fully testable
    in isolation.

Honesty rule (H06): sealed entries are NEVER indexed. The sync
function returns early without raising; the Celery task does the
same. The frontend's "sealed_match_count" comes from a separate
query in the search router (counts sealed entries owned by the
caller), not from this index.

Normalisation rules:
  * Text is NFC-normalised then lowercased then has combining marks
    stripped (diacritics removed). This matches the client's
    ``normalise`` in ``frontend/shared/src/gematria/ciphers.ts``.
  * "Phrases" are extracted by splitting on whitespace and stripping
    surrounding punctuation. A phrase longer than 240 chars does not
    index (rare in practice).
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Iterable
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.linguistic.bundled_ciphers import (
    BUNDLED_CIPHERS,
    BundledCipher,
)
from theourgia.models.ciphers import Cipher
from theourgia.models.entries import EncryptionMode, Entry
from theourgia.models.gematria_index import GematriaIndex

__all__ = [
    "IndexRow",
    "compute_index_rows",
    "compute_gematria",
    "index_entry_gematria_sync",
    "reindex_cipher_sync",
    "normalise_text",
    "reduce_to_digit",
]


# ── Normalisation + computation primitives ─────────────────────────


# Phrase split: split on whitespace + sentence punctuation. The
# resulting tokens are stripped of surrounding punctuation.
_SPLIT = re.compile(r"[\s\.,;:!\?\(\)\[\]\{\}\"'–—]+", re.UNICODE)


def normalise_text(s: str) -> str:
    """Lower-case + NFD + strip combining marks + NFC.

    Equivalent to the client engine's ``normalise`` in
    ``frontend/shared/src/gematria/ciphers.ts``. The client uses a
    regex over the Combining Diacritical Marks Unicode block; we use
    ``unicodedata.combining`` directly so we don't have to embed
    range-encoded literal combining marks in the source (which mis-
    parse depending on the editor)."""
    nfd = unicodedata.normalize("NFD", s.lower())
    stripped = "".join(c for c in nfd if not unicodedata.combining(c))
    return unicodedata.normalize("NFC", stripped)


def reduce_to_digit(n: int) -> int:
    """Repeated digital-sum collapse to a single digit (0-9)."""
    v = abs(n)
    while v > 9:
        v = sum(int(c) for c in str(v))
    return v


def compute_gematria(
    phrase: str, mapping: dict[str, int],
) -> int:
    """Sum of mapped letter values; unmapped chars are skipped.

    The normalisation step lives one level up — this function
    expects already-normalised text. (Matches the client engine,
    which lower-cases + strips diacritics in `normalise` before
    feeding the result to `computeGematria`.)
    """
    total = 0
    for ch in phrase:
        v = mapping.get(ch)
        if v is not None:
            total += v
    return total


@dataclass(frozen=True)
class IndexRow:
    """A single row the indexer wants to upsert.

    Pure-data; the side-effectful sync function turns these into
    actual ORM rows."""

    cipher_id: UUID
    phrase: str
    value: int
    digit_sum: int


def _phrase_candidates(plaintext: str) -> Iterable[str]:
    """Yield normalised phrase candidates from plaintext.

    A "phrase" is a contiguous run of non-whitespace, non-punctuation
    characters. The indexer also yields longer contiguous runs (2-
    and 3-token windows) so multi-word phrases match too — capped at
    3 tokens to keep the index tractable.
    """
    normalised = normalise_text(plaintext)
    tokens = [t for t in _SPLIT.split(normalised) if t]
    seen: set[str] = set()
    # 1-, 2-, and 3-grams; skip duplicates within the same entry.
    for n in (1, 2, 3):
        for i in range(len(tokens) - n + 1):
            phrase = " ".join(tokens[i : i + n])
            if 0 < len(phrase) <= 240 and phrase not in seen:
                seen.add(phrase)
                yield phrase


def compute_index_rows(
    plaintext: str,
    ciphers: list[tuple[UUID, dict[str, int]]],
) -> list[IndexRow]:
    """Pure: turn plaintext + list of (cipher_id, mapping) into
    ``IndexRow`` instances. Skips phrases whose value is 0 under a
    cipher (means none of the phrase's chars are in the mapping —
    irrelevant for that cipher)."""
    rows: list[IndexRow] = []
    for phrase in _phrase_candidates(plaintext):
        for cipher_id, mapping in ciphers:
            value = compute_gematria(phrase, mapping)
            if value <= 0:
                continue
            rows.append(
                IndexRow(
                    cipher_id=cipher_id,
                    phrase=phrase,
                    value=value,
                    digit_sum=reduce_to_digit(value),
                )
            )
    return rows


# ── DB side ───────────────────────────────────────────────────────


async def _load_ciphers_for_owner(
    db: AsyncSession, owner_id: UUID,
) -> list[tuple[UUID, dict[str, int]]]:
    """Load every cipher visible to the owner — bundled + personal.

    Returns (cipher_id, mapping) pairs. Bundled ciphers must be
    materialised in the DB (see ``loader.ensure_bundled_ciphers``);
    until then, tests can pass bundled mappings directly via
    ``compute_index_rows``.
    """
    stmt = (
        select(Cipher)
        .where(Cipher.deleted_at.is_(None))
        .where(
            (Cipher.owner_id == owner_id)
            | (Cipher.bundled_slug.is_not(None))
        )
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [(r.id, dict(r.mapping or {})) for r in rows]


async def index_entry_gematria_sync(
    db: AsyncSession, entry_id: UUID,
) -> int:
    """Compute + upsert gematria rows for one entry.

    Returns the number of rows written. Returns 0 (without raising)
    if the entry doesn't exist, is sealed, lacks an owner, or has no
    plaintext body.
    """
    entry: Entry | None = await db.get(Entry, entry_id)
    if entry is None or entry.deleted_at is not None:
        return 0
    if entry.encryption_mode == EncryptionMode.SEALED:
        return 0
    if entry.owner_id is None:
        return 0
    plaintext = entry.body_text or ""
    if not plaintext.strip():
        # Even with no body, clear any stale rows.
        await db.execute(
            delete(GematriaIndex).where(GematriaIndex.entry_id == entry_id)
        )
        await db.commit()
        return 0

    ciphers = await _load_ciphers_for_owner(db, entry.owner_id)
    if not ciphers:
        return 0

    rows = compute_index_rows(plaintext, ciphers)

    # Re-index strategy: wipe-and-replace per entry. Simple + correct;
    # the index is small per entry (≤ ~hundreds of rows in practice).
    await db.execute(
        delete(GematriaIndex).where(GematriaIndex.entry_id == entry_id)
    )
    for r in rows:
        db.add(
            GematriaIndex(
                owner_id=entry.owner_id,
                entry_id=entry_id,
                cipher_id=r.cipher_id,
                phrase=r.phrase,
                value=r.value,
                digit_sum=r.digit_sum,
            )
        )
    await db.commit()
    return len(rows)


async def reindex_cipher_sync(
    db: AsyncSession, cipher_id: UUID,
) -> int:
    """Re-index every entry that has rows under ``cipher_id``.

    Returns the number of entries re-indexed.
    """
    # Find every entry id that currently has rows under this cipher.
    stmt = select(GematriaIndex.entry_id).where(
        GematriaIndex.cipher_id == cipher_id
    ).distinct()
    entry_ids = list((await db.execute(stmt)).scalars().all())
    for eid in entry_ids:
        await index_entry_gematria_sync(db, eid)
    return len(entry_ids)


def collect_bundled_mappings() -> list[tuple[str, dict[str, int]]]:
    """Helper for tests: pairs of (slug, mapping) for every bundled
    cipher. Used by tests that index without first materialising
    bundled ciphers into the DB."""
    return [(c.slug, dict(c.mapping)) for c in BUNDLED_CIPHERS]
