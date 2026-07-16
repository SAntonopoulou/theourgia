"""Construct a :class:`TranscriptionEngine` from settings."""

from __future__ import annotations

from theourgia.core.transcription.base import TranscriptionEngine
from theourgia.core.transcription.faster_whisper import FasterWhisperEngine
from theourgia.core.transcription.null import NullEngine

__all__ = ["build_transcription_engine"]


def build_transcription_engine(settings: object) -> TranscriptionEngine:
    """Select the engine the instance is configured for.

    Disabled (the default) → :class:`NullEngine`; enabled →
    :class:`FasterWhisperEngine` with the configured model size.
    """
    if not bool(getattr(settings, "transcription_enabled", False)):
        return NullEngine()

    model_size = getattr(settings, "transcription_model", None) or "small"
    return FasterWhisperEngine(model_size=model_size)
