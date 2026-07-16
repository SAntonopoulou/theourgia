"""Transcription engine Protocol + result shapes.

Engines take a LOCAL file path (the Celery task downloads storage
bytes to a temp file first) and return a :class:`TranscriptionResult`.
Everything is synchronous — transcription is CPU-bound batch work that
runs inside a worker, not in the request path.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

__all__ = [
    "TranscriptionEngine",
    "TranscriptionError",
    "TranscriptionResult",
    "TranscriptionSegment",
]


class TranscriptionError(Exception):
    """Raised when an engine cannot produce a transcript.

    Covers both "the extra isn't installed / the feature is off"
    (NullEngine, missing faster-whisper) and genuine engine failures
    (unreadable audio, model load error). The task layer catches this
    and leaves the attachment's transcript NULL.
    """


@dataclass(frozen=True, slots=True)
class TranscriptionSegment:
    """One timed span of the transcript."""

    start: float
    """Segment start, seconds from the beginning of the audio."""

    end: float
    """Segment end, seconds."""

    text: str


@dataclass(frozen=True, slots=True)
class TranscriptionResult:
    """What an engine returns for one audio file."""

    text: str
    """The full transcript, segments joined."""

    language: str | None
    """Detected (or caller-forced) language code, e.g. ``"en"``."""

    engine_label: str
    """Provenance tag stored on the attachment — ``"whisper:small"``,
    ``"whisper:large-v3"``, etc. The UI renders it next to the
    transcript."""

    duration_seconds: float = 0.0
    """Audio duration as reported by the engine (0.0 when unknown)."""

    segments: tuple[TranscriptionSegment, ...] = field(default_factory=tuple)
    """Optional per-segment timing. Empty when the engine doesn't
    produce (or the caller doesn't need) timestamps."""


@runtime_checkable
class TranscriptionEngine(Protocol):
    """Contract every transcription engine implements."""

    name: str
    """Engine identifier (``"faster-whisper"``, ``"null"``)."""

    def transcribe(
        self, audio_path: str, language: str | None = None
    ) -> TranscriptionResult:
        """Transcribe the audio file at ``audio_path``.

        ``language`` forces a language (ISO 639-1); ``None`` lets the
        engine auto-detect. Raises :class:`TranscriptionError` on any
        failure.
        """
        ...
