"""Library phase-04 expansion tests — BibTeX / RIS / model shapes."""

from __future__ import annotations

from theourgia.core.library import (
    book_to_bibtex,
    book_to_ris,
    parse_bibtex,
    parse_ris,
)
from theourgia.models.library import (
    Book,
    BookNote,
    BookStatus,
    Holding,
    Quote,
    ReadingList,
)


# ───── BibTeX ──────────────────────────────────────────────────────────


def test_bibtex_parse_single_book() -> None:
    src = """
@book{ regardie1932,
  title = "The Garden of Pomegranates",
  author = "Israel Regardie",
  year = 1932,
  publisher = "Aries Press",
  isbn = "978-0875427232"
}
"""
    entries = parse_bibtex(src)
    assert len(entries) == 1
    e = entries[0]
    assert e.entry_type == "book"
    assert e.cite_key == "regardie1932"
    assert e.title == "The Garden of Pomegranates"
    assert e.author == "Israel Regardie"
    assert e.year == 1932
    assert e.isbn == "978-0875427232"


def test_bibtex_parse_multiple_entries() -> None:
    src = """
@book{burkert1985, title = "Greek Religion", author = "Walter Burkert", year = 1985}
@book{parker1996, title = "Athenian Religion", author = "Robert Parker", year = 1996}
"""
    entries = parse_bibtex(src)
    assert len(entries) == 2
    assert {e.cite_key for e in entries} == {"burkert1985", "parker1996"}


def test_bibtex_parse_tolerates_latex_escapes() -> None:
    src = """
@book{x, title = "Beard \\& North \\& Price", author = "M. Beard"}
"""
    entries = parse_bibtex(src)
    assert entries[0].title == "Beard & North & Price"


def test_bibtex_round_trip_via_book() -> None:
    """Build a Book → emit BibTeX → reparse → fields preserved."""
    book = Book(
        title="The Magus",
        author="Francis Barrett",
        year=1801,
        publisher="Lackington, Allen & Co.",
        isbn="",
        edition="1st",
    )
    bib_text = book_to_bibtex(book)
    parsed = parse_bibtex(bib_text)
    assert len(parsed) == 1
    p = parsed[0]
    assert p.title == "The Magus"
    assert p.author == "Francis Barrett"
    assert p.year == 1801
    assert p.publisher == "Lackington, Allen & Co."
    assert p.edition == "1st"


def test_bibtex_writer_escapes_ampersand() -> None:
    book = Book(title="Brown & Sons", author="x", year=2020)
    bib_text = book_to_bibtex(book)
    assert "\\&" in bib_text


# ───── RIS ─────────────────────────────────────────────────────────────


def test_ris_parse_minimal_book() -> None:
    src = """TY  - BOOK
TI  - Magick in Theory and Practice
AU  - Aleister Crowley
PY  - 1929
PB  - Lecram Press
SN  - 978-1729207756
LA  - en
ER  -
"""
    records = parse_ris(src)
    assert len(records) == 1
    r = records[0]
    assert r.type == "BOOK"
    assert r.title == "Magick in Theory and Practice"
    assert r.authors == ["Aleister Crowley"]
    assert r.year == 1929
    assert r.publisher == "Lecram Press"
    assert r.isbn == "978-1729207756"
    assert r.language == "en"


def test_ris_round_trip_via_book() -> None:
    book = Book(
        title="Ovid's Fasti",
        author="Ovid; James G. Frazer",
        year=8,
        publisher="Heinemann",
        isbn="978-0674992795",
        languages="en;la",
    )
    ris_text = book_to_ris(book)
    parsed = parse_ris(ris_text)
    assert len(parsed) == 1
    p = parsed[0]
    assert p.title == "Ovid's Fasti"
    assert "Ovid" in (p.authors or [])
    assert p.year == 8
    assert p.language == "en"  # primary lang only


def test_ris_parse_multiple_authors_via_repeated_au() -> None:
    src = """TY  - BOOK
TI  - Religions of Rome
AU  - Mary Beard
AU  - John North
AU  - Simon Price
PY  - 1998
ER  -
"""
    records = parse_ris(src)
    assert records[0].authors == ["Mary Beard", "John North", "Simon Price"]


# ───── Model shape — Book + BookNote + Quote + ReadingList ─────────────


def test_book_carries_phase04_columns() -> None:
    expected = {
        "editor", "edition", "publisher", "languages", "status",
        "holding", "shelf_location", "cover_image_url",
    }
    for col in expected:
        assert hasattr(Book, col), f"Book missing Phase 04 column {col!r}"


def test_book_status_enum_values() -> None:
    assert {s.value for s in BookStatus} == {
        "owned", "reading", "read", "want", "lent_out", "unlisted",
    }


def test_holding_enum_values() -> None:
    assert {h.value for h in Holding} == {
        "physical", "digital", "audiobook", "none",
    }


def test_book_note_construct() -> None:
    note = BookNote(
        book_id="00000000-0000-0000-0000-000000000000",
        body="Margin note on the dechiyot.",
        page_reference="p. 47",
    )
    assert note.body == "Margin note on the dechiyot."
    assert note.page_reference == "p. 47"


def test_quote_construct() -> None:
    quote = Quote(
        book_id="00000000-0000-0000-0000-000000000000",
        text="Do what thou wilt shall be the whole of the Law.",
        page_reference="II:36",
        language="en",
    )
    assert quote.text.startswith("Do what thou wilt")
    assert quote.language == "en"


def test_reading_list_construct() -> None:
    rl = ReadingList(
        name="Hellenistic foundations",
        description="A six-month deep-read.",
        book_ids="11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222",
    )
    assert rl.name == "Hellenistic foundations"
    assert "," in rl.book_ids


# ───── Defaults ─────────────────────────────────────────────────────────


def test_book_defaults_owned_physical() -> None:
    book = Book(title="x", author="x")
    assert book.status == BookStatus.OWNED
    assert book.holding == Holding.PHYSICAL
