"""BibTeX parser / writer.

A focused subset of BibTeX: we handle the entry types practitioners
actually use (book, article, incollection, misc) and the fields the
:class:`Book` model tracks. Strict standards-compliance is out of
scope — published academic .bib files use sloppy formatting and a
permissive reader is more useful than a strict one.

The parser is line-based, tolerant of the most common LaTeX
character sequences (``\\&`` → ``&``, ``{...}`` braces stripped from
field values), and returns a list of :class:`BibTexEntry` ready to
map onto :class:`theourgia.models.library.Book` rows.

The writer emits well-formed BibTeX for downstream tools.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

__all__ = ["BibTexEntry", "parse_bibtex", "book_to_bibtex"]


@dataclass(slots=True)
class BibTexEntry:
    """One bibliographic record from a .bib file or destined for one."""

    entry_type: str  # "book" | "article" | "incollection" | "misc"
    cite_key: str    # the @book{KEY,...} key
    fields: dict[str, str] = field(default_factory=dict)

    @property
    def title(self) -> str:
        return self.fields.get("title", "")

    @property
    def author(self) -> str:
        return self.fields.get("author", "")

    @property
    def year(self) -> int | None:
        raw = self.fields.get("year")
        if not raw:
            return None
        try:
            return int(re.search(r"-?\d+", raw).group())  # type: ignore[union-attr]
        except (AttributeError, ValueError):
            return None

    @property
    def publisher(self) -> str:
        return self.fields.get("publisher", "")

    @property
    def isbn(self) -> str:
        return self.fields.get("isbn", "")

    @property
    def edition(self) -> str:
        return self.fields.get("edition", "")

    @property
    def editor(self) -> str:
        return self.fields.get("editor", "")

    @property
    def language(self) -> str:
        return self.fields.get("language", "")


# ────────────────────────────────────────────────────────────────────────
# Parsing
# ────────────────────────────────────────────────────────────────────────


# Match `@type{key,` start.
_ENTRY_START = re.compile(r"@(\w+)\s*\{\s*([^,\s]+)\s*,", re.MULTILINE)
# Match `field = "value"` or `field = {value}` or `field = bare_word`.
_FIELD = re.compile(
    r"(\w+)\s*=\s*(?:\"([^\"]*)\"|\{(.*?)\}|([^,}\s]+))\s*,?",
    re.DOTALL,
)


def _strip_latex(value: str) -> str:
    """Apply the few most common LaTeX → plain-text substitutions."""
    value = value.replace("\\&", "&")
    value = value.replace("\\%", "%")
    value = value.replace("--", "–")  # en-dash in page ranges
    value = value.replace("\\'e", "é")
    value = value.replace("\\\"o", "ö")
    value = value.replace("\\\"a", "ä")
    value = value.replace("\\\"u", "ü")
    # Strip outer braces that survived: "{Title}" → "Title".
    value = value.strip()
    while value.startswith("{") and value.endswith("}"):
        value = value[1:-1].strip()
    return value


def parse_bibtex(source: str) -> list[BibTexEntry]:
    """Parse a BibTeX file or string into entries.

    Returns an empty list rather than raising on malformed input;
    individual fields that can't be parsed are silently skipped.
    """
    entries: list[BibTexEntry] = []
    for match in _ENTRY_START.finditer(source):
        entry_type, cite_key = match.group(1).lower(), match.group(2)
        # Find the matching closing brace for this entry.
        body_start = match.end()
        depth = 1
        i = body_start
        while i < len(source) and depth > 0:
            ch = source[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
            i += 1
        body = source[body_start : i - 1]
        # Parse field-by-field.
        fields: dict[str, str] = {}
        for f_match in _FIELD.finditer(body):
            name = f_match.group(1).lower()
            value = (
                f_match.group(2)
                or f_match.group(3)
                or f_match.group(4)
                or ""
            )
            fields[name] = _strip_latex(value)
        entries.append(BibTexEntry(entry_type, cite_key, fields))
    return entries


# ────────────────────────────────────────────────────────────────────────
# Writing
# ────────────────────────────────────────────────────────────────────────


def _bibtex_escape(value: str) -> str:
    """Escape the characters BibTeX cares about for safe field values."""
    value = value.replace("\\", "\\\\")
    value = value.replace("&", "\\&")
    value = value.replace("%", "\\%")
    value = value.replace("$", "\\$")
    return value


def book_to_bibtex(book: object, cite_key: str | None = None) -> str:
    """Serialise a Book row to a BibTeX string.

    Accepts any object with the Book column attributes — we duck-type
    so the writer is decoupled from the SQLModel class.
    """
    key = cite_key or _derive_cite_key(book)
    fields: list[tuple[str, str]] = []
    for attr, bib_field in (
        ("title", "title"),
        ("author", "author"),
        ("editor", "editor"),
        ("year", "year"),
        ("publisher", "publisher"),
        ("edition", "edition"),
        ("isbn", "isbn"),
        ("languages", "language"),
    ):
        value = getattr(book, attr, None)
        if value is None or value == "":
            continue
        fields.append((bib_field, str(value)))

    body = ",\n  ".join(
        f'{name} = "{_bibtex_escape(value)}"'
        for name, value in fields
    )
    return f"@book{{{key},\n  {body}\n}}\n"


def _derive_cite_key(book: object) -> str:
    """Produce a plausible cite_key from author + year."""
    author = (getattr(book, "author", "") or "").strip()
    year = getattr(book, "year", None)
    first_author = author.split(",")[0].split(";")[0].split(" ")[-1].lower() if author else "anon"
    first_author = re.sub(r"[^a-z0-9]", "", first_author) or "anon"
    if year:
        return f"{first_author}{year}"
    return first_author
