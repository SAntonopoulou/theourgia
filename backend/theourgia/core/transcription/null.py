"""Null transcription engine — the disabled default.

Selected whenever ``THEOURGIA_TRANSCRIPTION_ENABLED`` is unset/false.
Every call refuses with a clear message so a mis-wired caller fails
loudly instead of silently producing empty transcripts.
"""

from __future__ import annotations

from theourgia.core.transcription.base import (
    TranscriptionError,
    TranscriptionResult,
)

__all__ = ["NullEngine"]


class NullEngine:
    """Refuses to transcribe — transcription is not enabled."""

    name = "null"

    def transcribe(
        self, audio_path: str, language: str | None = None
    ) -> TranscriptionResult:
        raise TranscriptionError(
            "transcription not enabled: set "
            "THEOURGIA_TRANSCRIPTION_ENABLED=true and install the "
            "[transcription] extra (`uv sync --extra transcription`)"
        )
