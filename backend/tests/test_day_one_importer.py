"""Day One importer tests — b108-2hk.

Covers the pure parser + router surface. End-to-end persistence is
implicit — the router loop is short and every intermediate is
exercised by the parser tests.
"""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import imports_day_one as import_module
from theourgia.core.imports.day_one import parse_day_one_export


# ── Router surface ────────────────────────────────────────────────


def test_router_registered() -> None:
    paths_methods = {
        (r.path, m)
        for r in import_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/imports/day-one", "POST") in paths_methods


def test_endpoint_requires_auth() -> None:
    from theourgia.api.deps import get_current_user

    for route in import_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        deps = route.dependant.dependencies
        calls = [d.call for d in deps]
        sub_names: list[str] = []
        for d in deps:
            for sub in d.dependencies:
                if hasattr(sub.call, "__name__"):
                    sub_names.append(sub.call.__name__)
        assert (
            get_current_user in calls
            or "get_current_user" in sub_names
        ), "day-one import must be auth-required"


# ── Parser ────────────────────────────────────────────────────────


_MINIMAL_ENTRY = {
    "uuid": "abcd-1234",
    "text": "This is my first entry.\n\nMore text follows.",
    "creationDate": "2020-05-15T09:30:00Z",
    "modifiedDate": "2020-05-15T10:00:00Z",
    "tags": ["hermetic", "solar"],
    "starred": True,
}


def test_parser_returns_empty_summary_on_missing_entries_key() -> None:
    result = parse_day_one_export({})
    assert result.total_entries == 0
    assert "no 'entries' array in payload" in result.skipped_reasons


def test_parser_ignores_non_object_entries() -> None:
    result = parse_day_one_export(
        {"entries": [_MINIMAL_ENTRY, "not-an-object", 42]},
    )
    assert result.total_entries == 3
    assert result.imported == 1
    assert len(result.skipped_reasons) == 2


def test_parser_skips_entries_without_text() -> None:
    result = parse_day_one_export(
        {"entries": [{"uuid": "x", "creationDate": "2020-01-01T00:00Z"}]},
    )
    assert result.imported == 0
    assert "missing text body" in result.skipped_reasons[0]


def test_parser_skips_entries_with_malformed_date() -> None:
    result = parse_day_one_export(
        {
            "entries": [
                {
                    "uuid": "x",
                    "text": "hi",
                    "creationDate": "not-a-date",
                }
            ],
        }
    )
    assert result.imported == 0
    assert "creationDate" in result.skipped_reasons[0]


def test_parser_derives_title_from_first_non_empty_line() -> None:
    result = parse_day_one_export({"entries": [_MINIMAL_ENTRY]})
    entry = result.entries[0]
    assert entry.title == "This is my first entry."


def test_parser_strips_markdown_hashes_from_title() -> None:
    """A heading like `## Winter Solstice` should surface as
    'Winter Solstice', not '## Winter Solstice'."""
    result = parse_day_one_export(
        {
            "entries": [
                {
                    **_MINIMAL_ENTRY,
                    "text": "## Winter Solstice\n\nSome notes.",
                }
            ]
        }
    )
    assert result.entries[0].title == "Winter Solstice"


def test_parser_falls_back_to_untitled_on_empty_body() -> None:
    """Regression guard: an entry whose text is only whitespace still
    surfaces with a legible title so it doesn't get lost in a list."""
    result = parse_day_one_export(
        {
            "entries": [
                {
                    **_MINIMAL_ENTRY,
                    "text": "   \n\n\t",
                }
            ]
        }
    )
    assert result.imported == 1
    assert result.entries[0].title == "Untitled Day One entry"


def test_parser_extracts_tags() -> None:
    result = parse_day_one_export({"entries": [_MINIMAL_ENTRY]})
    entry = result.entries[0]
    assert entry.tags == ("hermetic", "solar")


def test_parser_notes_photo_count_in_body_when_present() -> None:
    result = parse_day_one_export(
        {
            "entries": [
                {
                    **_MINIMAL_ENTRY,
                    "photos": [{"identifier": "a"}, {"identifier": "b"}],
                }
            ]
        }
    )
    entry = result.entries[0]
    assert entry.photo_count == 2
    assert "2 photo(s) not carried across" in entry.body


def test_parser_notes_audio_and_video_counts_when_present() -> None:
    result = parse_day_one_export(
        {
            "entries": [
                {
                    **_MINIMAL_ENTRY,
                    "audios": [{"identifier": "a"}],
                    "videos": [{"identifier": "v1"}, {"identifier": "v2"}],
                }
            ]
        }
    )
    entry = result.entries[0]
    assert entry.audio_count == 1
    assert entry.video_count == 2
    assert "1 audio clip(s) not carried across" in entry.body
    assert "2 video clip(s) not carried across" in entry.body


def test_parser_summarises_location_without_coordinates() -> None:
    """Regression guard: the parser MUST NOT emit raw lat/lng from the
    Day One location block — Theourgia's precision floor exists for a
    reason and pulling exact coords across in bulk breaks that."""
    result = parse_day_one_export(
        {
            "entries": [
                {
                    **_MINIMAL_ENTRY,
                    "location": {
                        "latitude": 40.7128,
                        "longitude": -74.0060,
                        "placeName": "Prospect Park",
                        "localityName": "Brooklyn",
                        "country": "United States",
                    },
                }
            ]
        }
    )
    entry = result.entries[0]
    assert entry.location_summary == "Prospect Park, Brooklyn, United States"
    # No coordinates anywhere in the parsed output.
    assert "40.7128" not in entry.body
    assert "-74.0060" not in entry.body


def test_parser_handles_iso_dates_without_z_suffix() -> None:
    result = parse_day_one_export(
        {
            "entries": [
                {
                    **_MINIMAL_ENTRY,
                    "creationDate": "2020-05-15T09:30:00+00:00",
                }
            ]
        }
    )
    assert result.imported == 1


def test_summary_skipped_property_is_computed() -> None:
    result = parse_day_one_export(
        {
            "entries": [
                _MINIMAL_ENTRY,
                {"text": "hi"},  # missing date
                {"text": "hi"},  # missing date
            ]
        }
    )
    assert result.total_entries == 3
    assert result.imported == 1
    assert result.skipped == 2
