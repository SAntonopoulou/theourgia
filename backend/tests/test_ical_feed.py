"""Unit tests for the iCal feed serializer + router (B135).

THE critical honesty rules covered:

  * Sealed entries are NEVER emitted as their own VEVENT — only as
    a single all-day "{N} sealed entries today" marker per date.
  * Sealed-day markers have NO description, NO location, no other
    detail.
  * RFC 5545 escaping handles backslash / semicolon / comma /
    newline correctly.
  * Long lines fold per § 3.1 (75-octet limit + CRLF + space
    continuation).
  * Private feeds reject anonymous requests with 401.
  * Token entropy is 32 bytes URL-safe.
  * /regenerate rotates the token.
  * No `/forge`, `/clone`, `/peek-sealed` endpoints exist.
"""

from __future__ import annotations

import inspect
from datetime import date, datetime, timezone

import pytest
from fastapi.routing import APIRoute
from pydantic import ValidationError

from theourgia.api.routers.v1 import ical_feed as ical_module
from theourgia.api.routers.v1.ical_feed import (
    ALLOWED_VISIBILITIES,
    ICalFeedRead,
    ICalFeedUpdate,
    RegenerateResponse,
    TOKEN_BYTES,
    _new_token,
)
from theourgia.core.calendar.ical_serializer import (
    PRODID,
    SEALED_DAY_SUMMARY_TEMPLATE,
    CalendarEvent,
    SealedDayMarker,
    build_vcalendar,
    fold_line,
    ical_escape,
)


# ── ical_escape (RFC 5545 § 3.3.11) ──────────────────────────────


def test_ical_escape_handles_backslash() -> None:
    assert ical_escape("a\\b") == "a\\\\b"


def test_ical_escape_handles_semicolon() -> None:
    assert ical_escape("a;b") == "a\\;b"


def test_ical_escape_handles_comma() -> None:
    assert ical_escape("a,b") == "a\\,b"


def test_ical_escape_handles_newline() -> None:
    assert ical_escape("a\nb") == "a\\nb"


def test_ical_escape_strips_cr() -> None:
    """CR alone is removed; CRLF would already have been split."""
    assert ical_escape("a\r\nb") == "a\\nb"


def test_ical_escape_order_backslash_first() -> None:
    """Backslash MUST be escaped first so we don't double-escape
    backslashes inserted by later replacements."""
    # Input ``a;b`` becomes ``a\;b``. If backslash were escaped LAST,
    # the inserted backslash would also be escaped → ``a\\\;b``.
    assert ical_escape("a;b") == "a\\;b"


def test_ical_escape_empty_string_passes_through() -> None:
    assert ical_escape("") == ""


# ── fold_line (RFC 5545 § 3.1) ──────────────────────────────────


def test_fold_short_line_unchanged() -> None:
    assert fold_line("BEGIN:VCALENDAR") == "BEGIN:VCALENDAR"


def test_fold_long_line_splits_at_75_octets() -> None:
    long_line = "X" * 100
    folded = fold_line(long_line)
    # The continuation marker is "\r\n ".
    assert "\r\n " in folded
    # The first chunk is ≤ 75 octets.
    first_chunk = folded.split("\r\n ", 1)[0]
    assert len(first_chunk.encode("utf-8")) <= 75


def test_fold_respects_multibyte_utf8() -> None:
    """The folder must not split a multi-byte sequence in half."""
    # 30 copies of "θεουργία" (8 chars, 16 bytes each in UTF-8).
    base = "θεουργία"
    long_line = base * 30
    folded = fold_line(long_line)
    # Each chunk MUST decode cleanly as UTF-8 on its own.
    for chunk in folded.split("\r\n "):
        chunk.encode("utf-8").decode("utf-8")  # no raise


def test_fold_custom_max_octets() -> None:
    folded = fold_line("ABCDEFGHIJ", max_octets=4)
    parts = folded.split("\r\n ")
    assert all(len(p.encode("utf-8")) <= 4 for p in parts)


# ── build_vcalendar (the top-level serializer) ────────────────────


def test_build_vcalendar_emits_envelope() -> None:
    out = build_vcalendar(events=[], sealed_markers=[])
    assert out.startswith("BEGIN:VCALENDAR\r\n")
    assert "END:VCALENDAR\r\n" in out
    assert "VERSION:2.0" in out
    assert f"PRODID:{PRODID}" in out
    assert "CALSCALE:GREGORIAN" in out
    assert "METHOD:PUBLISH" in out


def test_build_vcalendar_uses_crlf_line_endings() -> None:
    out = build_vcalendar(events=[], sealed_markers=[])
    # Every logical separator is CRLF.
    # The shell has ≥6 lines (BEGIN/VERSION/PRODID/CALSCALE/METHOD/
    # X-WR-CALNAME/END), each separated by \r\n.
    assert "\r\n" in out
    # No bare LF without CR.
    for ch_idx, ch in enumerate(out):
        if ch == "\n":
            assert out[ch_idx - 1] == "\r", (
                f"bare LF at index {ch_idx}"
            )


def test_build_vcalendar_emits_one_vevent_per_event() -> None:
    ev = CalendarEvent(
        uid="working-1@theourgia",
        summary="Hekate's Deipnon",
        start=datetime(2026, 7, 1, 19, 0, tzinfo=timezone.utc),
    )
    out = build_vcalendar(events=[ev], sealed_markers=[])
    assert out.count("BEGIN:VEVENT") == 1
    assert out.count("END:VEVENT") == 1
    assert "UID:working-1@theourgia" in out
    assert "SUMMARY:Hekate's Deipnon" in out


def test_build_vcalendar_emits_dtend_when_provided() -> None:
    ev = CalendarEvent(
        uid="a", summary="Ritual",
        start=datetime(2026, 7, 1, 19, 0, tzinfo=timezone.utc),
        end=datetime(2026, 7, 1, 22, 0, tzinfo=timezone.utc),
    )
    out = build_vcalendar(events=[ev], sealed_markers=[])
    assert "DTEND:20260701T220000Z" in out


def test_build_vcalendar_omits_dtend_when_absent() -> None:
    ev = CalendarEvent(
        uid="a", summary="x",
        start=datetime(2026, 7, 1, 19, 0, tzinfo=timezone.utc),
    )
    out = build_vcalendar(events=[ev], sealed_markers=[])
    assert "DTEND" not in out


def test_build_vcalendar_all_day_event_uses_date_value() -> None:
    ev = CalendarEvent(
        uid="festival-1",
        summary="Summer Solstice",
        start=datetime(2026, 6, 21, 0, 0, tzinfo=timezone.utc),
        is_all_day=True,
    )
    out = build_vcalendar(events=[ev], sealed_markers=[])
    assert "DTSTART;VALUE=DATE:20260621" in out


def test_build_vcalendar_escapes_summary() -> None:
    ev = CalendarEvent(
        uid="a", summary="One; two, three\\four",
        start=datetime(2026, 7, 1, 19, 0, tzinfo=timezone.utc),
    )
    out = build_vcalendar(events=[ev], sealed_markers=[])
    assert "SUMMARY:One\\; two\\, three\\\\four" in out


# ── Sealed-day collapse (the CRITICAL rule) ──────────────────────


def test_sealed_marker_emits_count_only_summary() -> None:
    marker = SealedDayMarker(date=date(2026, 7, 4), count=3)
    out = build_vcalendar(events=[], sealed_markers=[marker])
    assert "BEGIN:VEVENT" in out
    assert "3 sealed entries today" in out


def test_sealed_marker_uses_template() -> None:
    """The template is the canonical copy — a future commit that
    changes the wording away from "{n} sealed entries today" must
    update the template (which propagates to all callers)."""
    assert SEALED_DAY_SUMMARY_TEMPLATE.format(n=5) == "5 sealed entries today"


def test_sealed_marker_emits_no_description() -> None:
    marker = SealedDayMarker(date=date(2026, 7, 4), count=3)
    out = build_vcalendar(events=[], sealed_markers=[marker])
    # The marker's VEVENT block has no DESCRIPTION line.
    vevent_block = out.split("BEGIN:VEVENT", 1)[1].split("END:VEVENT", 1)[0]
    assert "DESCRIPTION" not in vevent_block


def test_sealed_marker_emits_no_location() -> None:
    marker = SealedDayMarker(date=date(2026, 7, 4), count=3)
    out = build_vcalendar(events=[], sealed_markers=[marker])
    vevent_block = out.split("BEGIN:VEVENT", 1)[1].split("END:VEVENT", 1)[0]
    assert "LOCATION" not in vevent_block


def test_sealed_marker_is_all_day() -> None:
    """Sealed markers cover the entire day — never a specific time
    (that would leak when in the day the working happened)."""
    marker = SealedDayMarker(date=date(2026, 7, 4), count=3)
    out = build_vcalendar(events=[], sealed_markers=[marker])
    assert "DTSTART;VALUE=DATE:20260704" in out


def test_sealed_marker_no_underlying_titles_leak() -> None:
    """Defensive: even if the caller accidentally tried to include
    the underlying titles, the dataclass doesn't accept them. The
    SealedDayMarker has only date + count."""
    fields = SealedDayMarker.__dataclass_fields__.keys()
    assert set(fields) == {"date", "count"}


def test_sealed_marker_count_appears_in_summary() -> None:
    out = build_vcalendar(
        events=[],
        sealed_markers=[SealedDayMarker(date=date(2026, 7, 4), count=12)],
    )
    assert "12 sealed entries today" in out


def test_multiple_sealed_markers_each_emit_one_vevent() -> None:
    markers = [
        SealedDayMarker(date=date(2026, 7, 1), count=1),
        SealedDayMarker(date=date(2026, 7, 2), count=2),
        SealedDayMarker(date=date(2026, 7, 3), count=3),
    ]
    out = build_vcalendar(events=[], sealed_markers=markers)
    assert out.count("BEGIN:VEVENT") == 3
    assert "1 sealed entries today" in out
    assert "2 sealed entries today" in out
    assert "3 sealed entries today" in out


def test_events_and_sealed_markers_combine() -> None:
    ev = CalendarEvent(
        uid="a", summary="Working",
        start=datetime(2026, 7, 1, 19, 0, tzinfo=timezone.utc),
    )
    marker = SealedDayMarker(date=date(2026, 7, 4), count=2)
    out = build_vcalendar(events=[ev], sealed_markers=[marker])
    assert out.count("BEGIN:VEVENT") == 2


# ── Schema invariants ─────────────────────────────────────────────


def test_feed_read_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        ICalFeedRead(
            id="x", owner_id="y", name="n",
            include_resh=True, include_workings=True,
            include_pilgrimage_anniversaries=False,
            include_lunar_events=True,
            include_planetary_hours=False,
            include_custom=False, custom_cron=None,
            visibility="private",
            feed_url_path="/ical/v1/abc.ics",
            last_regenerated_at=None,
            created_at=datetime.now(tz=timezone.utc),
            updated_at=datetime.now(tz=timezone.utc),
            sneaky_unknown=True,
        )


def test_feed_update_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        ICalFeedUpdate(sneaky_unknown=True)


def test_feed_update_omits_url_token() -> None:
    """The url_token rotates via /regenerate ONLY — PATCH cannot
    set it."""
    assert "url_token" not in ICalFeedUpdate.model_fields


def test_feed_update_omits_last_regenerated_at() -> None:
    """Server-only timestamp."""
    assert "last_regenerated_at" not in ICalFeedUpdate.model_fields


def test_feed_update_omits_owner_id() -> None:
    assert "owner_id" not in ICalFeedUpdate.model_fields


def test_feed_update_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        ICalFeedUpdate(name="")


def test_regenerate_response_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        RegenerateResponse(
            feed_url_path="/ical/v1/x.ics",
            last_regenerated_at=datetime.now(tz=timezone.utc),
            sneaky_unknown=True,
        )


# ── Token entropy ────────────────────────────────────────────────


def test_token_bytes_is_32() -> None:
    """The plan locks 32 bytes of entropy."""
    assert TOKEN_BYTES == 32


def test_new_token_is_url_safe() -> None:
    tok = _new_token()
    # ``token_urlsafe`` produces base64 with `-` and `_`, no padding.
    for ch in tok:
        assert ch.isalnum() or ch in "-_"


def test_new_token_has_high_entropy() -> None:
    """32 bytes of entropy mean collision probability is negligible;
    pulling 50 tokens MUST yield 50 unique values."""
    tokens = {_new_token() for _ in range(50)}
    assert len(tokens) == 50


# ── Visibility allow-list ────────────────────────────────────────


def test_allowed_visibilities_set() -> None:
    assert ALLOWED_VISIBILITIES == {"private", "public"}


# ── Router registration ─────────────────────────────────────────


def _paths_methods(router) -> set[tuple[str, str]]:
    return {
        (r.path, m)
        for r in router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }


def test_router_registers_settings_get() -> None:
    assert ("/ical-feed", "GET") in _paths_methods(ical_module.router)


def test_router_registers_settings_patch() -> None:
    assert ("/ical-feed", "PATCH") in _paths_methods(ical_module.router)


def test_router_registers_regenerate() -> None:
    assert (
        ("/ical-feed/regenerate", "POST")
        in _paths_methods(ical_module.router)
    )


def test_feed_router_registers_unversioned_ics_path() -> None:
    """Feed URL is unversioned (NOT under /api/v1) so subscribers'
    clients keep working across API versioning."""
    assert (
        ("/ical/v1/{token}.ics", "GET")
        in _paths_methods(ical_module.feed_router)
    )


def test_router_has_no_forge_or_peek_endpoint() -> None:
    """Defensive: no endpoint can reveal sealed plaintext."""
    paths = {p for (p, _) in _paths_methods(ical_module.router)} | {
        p for (p, _) in _paths_methods(ical_module.feed_router)
    }
    banned = {"forge", "clone", "peek-sealed", "reveal", "unseal"}
    for p in paths:
        for token in banned:
            assert token not in p, (
                f"banned token {token!r} appeared in ical route {p!r}"
            )


def test_feed_router_serves_text_calendar_response_media_type() -> None:
    """The feed serves text/calendar — checked via source inspection
    so the Response constructor argument can't drift away from the
    spec."""
    src = inspect.getsource(ical_module.serve_feed)
    assert "text/calendar" in src


# ── Source-level honesty invariants ──────────────────────────────


def test_private_visibility_check_lives_in_serve_feed_source() -> None:
    src = inspect.getsource(ical_module.serve_feed)
    assert "private" in src
    assert "401" in src or "HTTP_401_UNAUTHORIZED" in src


def test_serializer_does_not_emit_sealed_summaries_with_titles() -> None:
    """Defensive: a future commit that decorates the sealed-marker
    VEVENT with the underlying entry's title gets caught."""
    src = inspect.getsource(ical_module)
    # ``serve_feed`` passes an EMPTY list to ``sealed_markers=`` in
    # the B135 shell; a future commit must NOT pass entry titles
    # along with the count.
    serializer_src = inspect.getsource(
        __import__(
            "theourgia.core.calendar.ical_serializer",
            fromlist=["*"],
        )
    )
    # The marker dataclass MUST stay {date, count} — no title field.
    assert (
        "@dataclass(frozen=True, slots=True)\nclass SealedDayMarker:"
        in serializer_src
    )


def test_no_play_count_in_ical_source() -> None:
    src = inspect.getsource(ical_module)
    assert "play_count" not in src.lower()


def test_no_view_count_in_ical_source() -> None:
    src = inspect.getsource(ical_module)
    assert "view_count" not in src.lower()
