"""RIS parser / writer.

RIS is the simpler citation format used by EndNote / Mendeley / Zotero
exports. Line-based, two-letter tag followed by ``-`` and the value;
each record ends with ``ER  -``.

A useful subset (BOOK, JOUR, CHAP). Field mapping:

* ``TY`` — type (BOOK, JOUR, etc.)
* ``T1`` / ``TI`` — title
* ``AU`` — author (repeatable; joined on output with `; `)
* ``ED`` — editor
* ``PY`` — publication year
* ``PB`` — publisher
* ``SN`` — ISBN
* ``LA`` — language
* ``ED`` (edition) — see RIS spec inconsistency; some files use it
  for editor, others for edition; our parser tolerates both.
"""

from __future__ import annotations

from dataclasses import dataclass

__all__ = ["RisRecord", "parse_ris", "book_to_ris"]


@dataclass(slots=True)
class RisRecord:
    type: str  # BOOK / JOUR / CHAP / etc.
    title: str = ""
    authors: list[str] | None = None
    editor: str = ""
    year: int | None = None
    publisher: str = ""
    isbn: str = ""
    language: str = ""


def parse_ris(source: str) -> list[RisRecord]:
    """Parse a RIS file or string into records."""
    records: list[RisRecord] = []
    current: RisRecord | None = None
    authors: list[str] = []

    for raw_line in source.splitlines():
        line = raw_line.rstrip()
        # RIS format: "XX  - value" (2-letter tag, 2 spaces, dash, space,
        # value). The `ER` end-record line often has no value, leaving
        # the suffix as just "ER  -" (5 chars after rstrip).
        if len(line) < 5 or line[2:5] != "  -":
            continue
        tag = line[:2]
        value = line[6:] if len(line) > 6 else ""
        if tag == "TY":
            current = RisRecord(type=value.strip())
            authors = []
        elif current is None:
            continue
        elif tag in ("T1", "TI"):
            current.title = value
        elif tag == "AU":
            authors.append(value)
        elif tag == "ED":
            current.editor = value
        elif tag == "PY":
            try:
                current.year = int(value[:4])
            except ValueError:
                pass
        elif tag == "PB":
            current.publisher = value
        elif tag == "SN":
            current.isbn = value
        elif tag == "LA":
            current.language = value
        elif tag == "ER":
            if authors:
                current.authors = authors
            records.append(current)
            current = None
            authors = []
    return records


def book_to_ris(book: object) -> str:
    """Serialise a Book row to a RIS record."""
    lines: list[str] = ["TY  - BOOK"]
    title = getattr(book, "title", "")
    author = getattr(book, "author", "") or ""
    editor = getattr(book, "editor", "") or ""
    year = getattr(book, "year", None)
    publisher = getattr(book, "publisher", "") or ""
    isbn = getattr(book, "isbn", "") or ""
    languages = getattr(book, "languages", "") or ""

    if title:
        lines.append(f"TI  - {title}")
    for au in [a.strip() for a in author.split(";") if a.strip()]:
        lines.append(f"AU  - {au}")
    if editor:
        lines.append(f"ED  - {editor}")
    if year:
        lines.append(f"PY  - {year}")
    if publisher:
        lines.append(f"PB  - {publisher}")
    if isbn:
        lines.append(f"SN  - {isbn}")
    if languages:
        primary = languages.split(";")[0].strip()
        lines.append(f"LA  - {primary}")
    lines.append("ER  - ")
    lines.append("")
    return "\n".join(lines)
