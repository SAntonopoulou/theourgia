"""Library router shape tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.library import BookCreate, BookRead, BookUpdate


def test_book_create_minimal() -> None:
    book = BookCreate(title="The Picatrix")
    assert book.title == "The Picatrix"
    assert book.author == ""
    assert book.year is None
    assert book.tradition == ""


def test_book_create_full() -> None:
    book = BookCreate(
        title="Three Books of Occult Philosophy",
        author="Heinrich Cornelius Agrippa",
        year=1533,
        isbn="",
        tradition="hermetic",
        notes="Foundational text",
    )
    assert book.year == 1533
    assert book.tradition == "hermetic"


def test_book_create_rejects_empty_title() -> None:
    with pytest.raises(ValidationError):
        BookCreate(title="")


def test_book_create_rejects_extras() -> None:
    with pytest.raises(ValidationError):
        BookCreate(title="x", random_field=1)  # type: ignore[call-arg]


def test_book_update_partial_allowed() -> None:
    BookUpdate()  # all-empty patch is valid (no-op)
    upd = BookUpdate(notes="New annotation")
    assert upd.notes == "New annotation"


def test_book_read_round_trips() -> None:
    from datetime import UTC, datetime
    from uuid import uuid4

    when = datetime(2026, 6, 21, 12, 0, 0, tzinfo=UTC)
    read = BookRead(
        id=str(uuid4()),
        title="x",
        author="",
        year=None,
        isbn="",
        tradition="",
        notes=None,
        created_at=when,
        updated_at=when,
    )
    payload = read.model_dump()
    assert payload["title"] == "x"
    assert payload["year"] is None


def test_library_router_registered() -> None:
    from theourgia.api.app import create_app

    app = create_app()
    schema = app.openapi()
    paths = set(schema["paths"].keys())
    assert "/api/v1/books" in paths
    assert "/api/v1/books/{book_id}" in paths
    methods = set(schema["paths"]["/api/v1/books/{book_id}"].keys())
    assert {"get", "patch", "delete"} <= methods
