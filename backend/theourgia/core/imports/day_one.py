"""Day One journal import parser.

b108-2hk · FEATURES §13 (reference plugin: Day One journal importer).

Day One (Bloom Built) exports each journal as a JSON file. Its
top-level shape is roughly:

    {
      "metadata": { "version": "1.0", "journalName": "..." },
      "entries": [
        {
          "uuid": "...",
          "text": "...",                    # markdown body
          "creationDate": "ISO-8601",
          "modifiedDate": "ISO-8601",
          "tags": [ "tag1", "tag2" ],
          "starred": true,
          "location": { ... },              # optional
          "weather": { ... },               # optional
          "photos": [ { ... } ],            # not carried into Theourgia
          "richText": "{...}"               # optional; ignored — use text
        },
        ...
      ]
    }

This module is a pure converter — takes the parsed JSON dict and
returns a sequence of ``DayOneImportedEntry`` payloads. The router
maps each into an actual Entry row.

Photos, attachments, audio, and video are intentionally NOT
imported — Theourgia's media pipeline is separate and Day One's
photos live in an adjacent `photos/` directory next to the JSON.
The importer notes their presence in `body` so nothing is silently
lost.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

__all__ = [
    "DayOneImportedEntry",
    "DayOneImportSummary",
    "parse_day_one_export",
]


@dataclass(frozen=True)
class DayOneImportedEntry:
    """One Day One entry converted to Theourgia shape."""

    # Sourced from Day One's uuid; may collide across journal exports
    # so the caller must not use it as a primary key — it's a hint.
    source_uuid: str | None
    title: str
    body: str
    tags: tuple[str, ...]
    created_at: datetime
    modified_at: datetime | None
    starred: bool
    photo_count: int
    audio_count: int
    video_count: int
    location_summary: str | None


@dataclass
class DayOneImportSummary:
    """Aggregate result of an import run."""

    total_entries: int = 0
    imported: int = 0
    skipped_reasons: list[str] = field(default_factory=list)
    entries: list[DayOneImportedEntry] = field(default_factory=list)

    @property
    def skipped(self) -> int:
        return self.total_entries - self.imported


def _iso_to_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    # Day One uses ISO-8601 with `Z` suffix or `+00:00`. Python 3.11+
    # `fromisoformat` handles the `Z` suffix directly.
    try:
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _first_line_title(body: str) -> str:
    """Derive a title from the entry body — first non-empty line,
    truncated. Day One entries don't ship with a separate title field."""
    for line in body.splitlines():
        stripped = line.strip().lstrip("#").strip()
        if stripped:
            return stripped[:240]
    return "Untitled Day One entry"


def _tags(raw: Any) -> tuple[str, ...]:
    if not isinstance(raw, list):
        return ()
    out: list[str] = []
    for t in raw:
        if isinstance(t, str) and t.strip():
            out.append(t.strip())
    return tuple(out)


def _location_summary(raw: Any) -> str | None:
    """Compose a short readable location line. Never emits raw lat/lng
    — coordinates go through the Theourgia precision floor if the
    operator wants them recorded. Here we just note the human name."""
    if not isinstance(raw, dict):
        return None
    parts = []
    for key in ("placeName", "localityName", "administrativeArea", "country"):
        v = raw.get(key)
        if isinstance(v, str) and v.strip():
            parts.append(v.strip())
    return ", ".join(parts) if parts else None


def _count_list(raw: Any) -> int:
    return len(raw) if isinstance(raw, list) else 0


def parse_day_one_export(payload: dict[str, Any]) -> DayOneImportSummary:
    """Parse a Day One JSON export into ``DayOneImportedEntry`` payloads.

    Returns a summary + the converted entries. Malformed entries are
    counted in ``skipped_reasons`` but never raise — the importer is
    lenient because Day One's schema has drifted across versions
    (2015 exports look different from 2024 exports).
    """
    summary = DayOneImportSummary()
    entries = payload.get("entries")
    if not isinstance(entries, list):
        summary.skipped_reasons.append("no 'entries' array in payload")
        return summary

    for i, raw in enumerate(entries):
        summary.total_entries += 1
        if not isinstance(raw, dict):
            summary.skipped_reasons.append(f"entry {i}: not an object")
            continue
        text = raw.get("text")
        if not isinstance(text, str):
            summary.skipped_reasons.append(f"entry {i}: missing text body")
            continue
        created_at = _iso_to_datetime(raw.get("creationDate"))
        if created_at is None:
            summary.skipped_reasons.append(
                f"entry {i}: missing / malformed creationDate",
            )
            continue

        modified_at = _iso_to_datetime(raw.get("modifiedDate"))
        title = _first_line_title(text)
        tags = _tags(raw.get("tags"))
        photo_count = _count_list(raw.get("photos"))
        audio_count = _count_list(raw.get("audios"))
        video_count = _count_list(raw.get("videos"))
        location = _location_summary(raw.get("location"))
        uuid = raw.get("uuid") if isinstance(raw.get("uuid"), str) else None

        # If media were attached, note them at the end of the body
        # so an import doesn't silently drop the reader's memory of them.
        body = text.rstrip()
        media_notes: list[str] = []
        if photo_count:
            media_notes.append(f"[imported: {photo_count} photo(s) not carried across]")
        if audio_count:
            media_notes.append(f"[imported: {audio_count} audio clip(s) not carried across]")
        if video_count:
            media_notes.append(f"[imported: {video_count} video clip(s) not carried across]")
        if media_notes:
            body = body + "\n\n" + "\n".join(media_notes)

        summary.entries.append(
            DayOneImportedEntry(
                source_uuid=uuid,
                title=title,
                body=body,
                tags=tags,
                created_at=created_at,
                modified_at=modified_at,
                starred=bool(raw.get("starred")),
                photo_count=photo_count,
                audio_count=audio_count,
                video_count=video_count,
                location_summary=location,
            )
        )
        summary.imported += 1

    return summary
