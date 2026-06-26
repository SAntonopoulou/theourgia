"""RFC 5545 iCalendar serializer (B135).

Per ``plan/11-batches-backend.md`` § B135.

Pure functions — input is a list of ``CalendarEvent`` records and a
list of ``SealedDayMarker`` records; output is a UTF-8 string of
VCALENDAR content suitable for delivery as ``text/calendar``.

The sealed-day collapse rule:
  * Sealed entries are NEVER emitted as their own VEVENT — that
    would leak the practitioner's private occurrences.
  * Instead, the router groups sealed entries by date and passes a
    list of ``SealedDayMarker`` records to the serializer. Each
    marker produces ONE all-day VEVENT with summary
    ``"{N} sealed entries today"`` (no other fields populated).

RFC 5545 line-folding: lines longer than 75 octets are folded with
CRLF + a single space leading on the continuation. Special characters
in text properties are escaped per § 3.3.11 (backslash, semicolon,
comma, newline).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Iterable

__all__ = [
    "CalendarEvent",
    "SealedDayMarker",
    "SEALED_DAY_SUMMARY_TEMPLATE",
    "build_vcalendar",
    "fold_line",
    "ical_escape",
    "PRODID",
]


PRODID = "-//Theourgia//Practitioner Calendar 1.0//EN"
SEALED_DAY_SUMMARY_TEMPLATE = "{n} sealed entries today"


@dataclass(frozen=True, slots=True)
class CalendarEvent:
    """A single calendar event to emit as a VEVENT.

    ``uid`` MUST be globally unique (RFC 5545 § 3.8.4.7); the router
    composes it as ``{kind}-{row_id}@theourgia``.
    """

    uid: str
    summary: str
    start: datetime
    end: datetime | None = None
    description: str = ""
    location: str = ""
    is_all_day: bool = False


@dataclass(frozen=True, slots=True)
class SealedDayMarker:
    """A single date that contains one or more sealed entries.

    The serializer emits ONE all-day VEVENT per marker, with summary
    ``"{count} sealed entries today"``. No other details.
    """

    date: date
    count: int


# ── Escaping + folding ──────────────────────────────────────────


def ical_escape(value: str) -> str:
    """RFC 5545 § 3.3.11 text escape.

    Order matters: backslash MUST be escaped first so subsequent
    inserted backslashes aren't re-escaped.
    """
    if not value:
        return ""
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
        .replace("\r", "")
    )


def fold_line(line: str, *, max_octets: int = 75) -> str:
    """Fold one logical line into one or more RFC 5545 § 3.1 lines.

    RFC requires CRLF + a single space leading on each continuation;
    no continuation line may exceed 75 octets. We work in octets,
    not characters, to respect multi-byte UTF-8 sequences.
    """
    encoded = line.encode("utf-8")
    if len(encoded) <= max_octets:
        return line
    chunks: list[str] = []
    while encoded:
        head = encoded[:max_octets]
        # Walk back so we don't split a multi-byte sequence.
        # Decode-and-retry handles BOTH continuation-byte mid-cuts
        # and lead-byte-at-end cuts.
        while head:
            try:
                decoded = head.decode("utf-8")
                break
            except UnicodeDecodeError:
                head = head[:-1]
        if not head:
            # Defensive: a pathological input. Emit one octet to
            # make progress (will produce invalid UTF-8 but we never
            # hit this in practice).
            decoded = encoded[:1].decode("utf-8", errors="replace")
            head = encoded[:1]
        chunks.append(decoded)
        encoded = encoded[len(head):]
    return "\r\n ".join(chunks)


# ── DT formatting ───────────────────────────────────────────────


def _format_dt(dt: datetime) -> str:
    """UTC, basic format, ``Z`` suffix."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _format_date(d: date) -> str:
    return d.strftime("%Y%m%d")


# ── VEVENT emission ─────────────────────────────────────────────


def _vevent_lines(ev: CalendarEvent) -> list[str]:
    out = ["BEGIN:VEVENT"]
    out.append(f"UID:{ev.uid}")
    out.append(f"DTSTAMP:{_format_dt(datetime.now(tz=timezone.utc))}")
    if ev.is_all_day:
        out.append(f"DTSTART;VALUE=DATE:{_format_date(ev.start.date())}")
        if ev.end is not None:
            out.append(
                f"DTEND;VALUE=DATE:{_format_date(ev.end.date())}",
            )
    else:
        out.append(f"DTSTART:{_format_dt(ev.start)}")
        if ev.end is not None:
            out.append(f"DTEND:{_format_dt(ev.end)}")
    out.append(f"SUMMARY:{ical_escape(ev.summary)}")
    if ev.description:
        out.append(f"DESCRIPTION:{ical_escape(ev.description)}")
    if ev.location:
        out.append(f"LOCATION:{ical_escape(ev.location)}")
    out.append("END:VEVENT")
    return out


def _sealed_marker_lines(marker: SealedDayMarker) -> list[str]:
    """One all-day VEVENT for a sealed-day marker. No description, no
    location, no other detail — count-only by construction."""
    uid = (
        f"sealed-day-{_format_date(marker.date)}-{marker.count}"
        "@theourgia"
    )
    summary = SEALED_DAY_SUMMARY_TEMPLATE.format(n=marker.count)
    return [
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{_format_dt(datetime.now(tz=timezone.utc))}",
        f"DTSTART;VALUE=DATE:{_format_date(marker.date)}",
        f"SUMMARY:{ical_escape(summary)}",
        "END:VEVENT",
    ]


# ── Top-level build ─────────────────────────────────────────────


def build_vcalendar(
    *,
    events: Iterable[CalendarEvent],
    sealed_markers: Iterable[SealedDayMarker] = (),
    feed_name: str = "Theourgia Practice Calendar",
) -> str:
    """Compose the full VCALENDAR string.

    Returns a CRLF-separated string suitable for delivery as
    ``text/calendar``. Each logical line is folded to ≤75 octets per
    RFC 5545 § 3.1.
    """
    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{PRODID}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{ical_escape(feed_name)}",
    ]
    for ev in events:
        lines.extend(_vevent_lines(ev))
    for marker in sealed_markers:
        lines.extend(_sealed_marker_lines(marker))
    lines.append("END:VCALENDAR")
    folded = [fold_line(ln) for ln in lines]
    return "\r\n".join(folded) + "\r\n"
