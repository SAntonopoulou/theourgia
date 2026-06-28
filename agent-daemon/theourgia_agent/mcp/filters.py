"""Rules 52 + 53 enforcement at the query layer.

The daemon NEVER passes sealed or closed-tradition content to the
`claude` subprocess. This is defence-in-depth — the vault's MCP
endpoint also filters — but the daemon does its own pass too. If a
malicious or buggy plugin on the vault side ever leaked one of these,
the daemon strips it before the agent sees it.

The filters operate on the wire format the vault returns. Each
content record carries:

  · ``sealed`` — boolean. When True, content is zero-knowledge
    encrypted at rest; the daemon has no keys to decrypt it. The
    filter REMOVES the record entirely (not just the ciphertext) so
    the agent doesn't even learn the record exists.

  · ``tradition_tags`` — list of tradition slugs. Any slug appearing
    in the vault's `closed_tradition_slugs` set REMOVES the record.
    The closed-tradition flag is set per-content by the magician at
    creation; the slug list is operator-curated (Phase 15 §14).

The functions are pure — no DB access, no I/O. The caller passes the
closed-tradition slug set in (typically loaded once at MCP-session
start and cached for the run).
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Protocol


__all__ = [
    "ContentRecord",
    "filter_records",
    "is_sealed",
    "is_closed_tradition",
]


class ContentRecord(Protocol):
    """Structural type for any vault record the daemon might receive.

    The vault's MCP response is a JSON document — the daemon decodes
    into dicts but the filter is typed against the structural shape.
    """

    @property
    def sealed(self) -> bool: ...

    @property
    def tradition_tags(self) -> list[str]: ...


def is_sealed(record: dict) -> bool:
    """Whether the record carries the sealed flag.

    Accepts dicts (the wire format); missing key → treated as not
    sealed (the vault should always set it; missing means an older
    record or test fixture).
    """
    return bool(record.get("sealed", False))


def is_closed_tradition(
    record: dict, closed_slugs: frozenset[str],
) -> bool:
    """Whether ANY of the record's tradition tags is in the closed set.

    Empty tag list → not closed. Empty slug set → never closed.
    """
    tags = record.get("tradition_tags") or []
    if not tags or not closed_slugs:
        return False
    return any(tag in closed_slugs for tag in tags)


def filter_records(
    records: Iterable[dict],
    *,
    closed_tradition_slugs: frozenset[str] = frozenset(),
) -> list[dict]:
    """Strip every sealed + closed-tradition record.

    Returns a new list — the input is not mutated. The order of
    surviving records is preserved.
    """
    out: list[dict] = []
    for r in records:
        if is_sealed(r):
            continue
        if is_closed_tradition(r, closed_tradition_slugs):
            continue
        out.append(r)
    return out
