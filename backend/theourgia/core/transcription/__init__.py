"""Local audio transcription substrate (Tier 2 #10 / FEATURES §2).

Voice recordings attached to journal entries can be transcribed
locally — the audio NEVER leaves the operator's machine. The engine
of record is faster-whisper (CTranslate2 Whisper), installed via the
``[transcription]`` extra; instances that skip the extra (or leave
``THEOURGIA_TRANSCRIPTION_ENABLED`` unset) get the NullEngine which
refuses with a clear message.

Shape mirrors the storage / email substrates: a Protocol in ``base``,
concrete engines alongside, and a settings-driven ``factory``.

Transcription runs only when BOTH gates are open:

1. Instance: ``THEOURGIA_TRANSCRIPTION_ENABLED=true`` (operator).
2. User: the ``audio.transcription_opt_in`` user setting (per user,
   default False).
"""

from __future__ import annotations

from theourgia.core.transcription.base import (
    TranscriptionEngine,
    TranscriptionError,
    TranscriptionResult,
    TranscriptionSegment,
)
from theourgia.core.transcription.factory import build_transcription_engine
from theourgia.core.transcription.faster_whisper import FasterWhisperEngine
from theourgia.core.transcription.null import NullEngine

__all__ = [
    "FasterWhisperEngine",
    "NullEngine",
    "TranscriptionEngine",
    "TranscriptionError",
    "TranscriptionResult",
    "TranscriptionSegment",
    "build_transcription_engine",
]
