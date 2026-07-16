"""faster-whisper transcription engine — fully local.

Wraps the ``faster_whisper`` package (CTranslate2 port of OpenAI
Whisper). The model runs on the operator's own hardware; audio bytes
never touch a cloud API.

Requires ``faster-whisper``, lazy-imported. Operators install via the
``[transcription]`` extra (``uv sync --extra transcription``); default
install ships without it and the guarded import raises a clear
:class:`TranscriptionError` naming the extra.

Model instances are cached per process — loading takes seconds and
hundreds of MB of RAM, so one load per worker lifetime, not per task.
"""

from __future__ import annotations

import logging
import threading
from typing import Final

from theourgia.core.transcription.base import (
    TranscriptionError,
    TranscriptionResult,
    TranscriptionSegment,
)

__all__ = ["VALID_MODEL_SIZES", "FasterWhisperEngine"]

_log = logging.getLogger(__name__)

VALID_MODEL_SIZES: Final[tuple[str, ...]] = (
    "tiny",
    "base",
    "small",
    "medium",
    "large-v3",
)

# Per-process model cache — one WhisperModel per (size, device,
# compute_type). Guarded by a lock so concurrent first-loads in a
# threaded worker don't double-load.
_MODEL_CACHE: dict[tuple[str, str, str], object] = {}
_MODEL_CACHE_LOCK = threading.Lock()


class FasterWhisperEngine:
    """Local Whisper transcription via faster-whisper."""

    name = "faster-whisper"

    def __init__(
        self,
        *,
        model_size: str = "small",
        device: str = "cpu",
        compute_type: str = "int8",
    ) -> None:
        if model_size not in VALID_MODEL_SIZES:
            msg = (
                f"unknown Whisper model size: {model_size!r}. "
                "Set THEOURGIA_TRANSCRIPTION_MODEL to one of: "
                + ", ".join(VALID_MODEL_SIZES)
            )
            raise ValueError(msg)
        self._model_size = model_size
        self._device = device
        self._compute_type = compute_type

    @property
    def model_size(self) -> str:
        return self._model_size

    @property
    def engine_label(self) -> str:
        """Provenance tag written to ``transcript_engine``."""
        return f"whisper:{self._model_size}"

    def _get_model(self) -> object:
        key = (self._model_size, self._device, self._compute_type)
        model = _MODEL_CACHE.get(key)
        if model is not None:
            return model
        with _MODEL_CACHE_LOCK:
            model = _MODEL_CACHE.get(key)
            if model is not None:
                return model
            try:
                from faster_whisper import WhisperModel  # noqa: PLC0415
            except ImportError as exc:
                raise TranscriptionError(
                    "FasterWhisperEngine requires the 'faster-whisper' "
                    "package; install the [transcription] extra with "
                    "`uv sync --extra transcription`"
                ) from exc
            _log.info(
                "transcription.model_load",
                extra={
                    "model_size": self._model_size,
                    "device": self._device,
                    "compute_type": self._compute_type,
                },
            )
            model = WhisperModel(
                self._model_size,
                device=self._device,
                compute_type=self._compute_type,
            )
            _MODEL_CACHE[key] = model
            return model

    def transcribe(
        self, audio_path: str, language: str | None = None
    ) -> TranscriptionResult:
        model = self._get_model()
        try:
            raw_segments, info = model.transcribe(  # type: ignore[attr-defined]
                audio_path, language=language
            )
            segments = tuple(
                TranscriptionSegment(
                    start=float(s.start),
                    end=float(s.end),
                    text=s.text.strip(),
                )
                # The generator runs the actual inference — consume it
                # fully here so failures surface inside this try.
                for s in raw_segments
            )
        except TranscriptionError:
            raise
        except Exception as exc:
            raise TranscriptionError(
                f"faster-whisper failed on {audio_path!r}: {exc}"
            ) from exc

        text = " ".join(s.text for s in segments if s.text).strip()
        return TranscriptionResult(
            text=text,
            language=getattr(info, "language", None),
            engine_label=self.engine_label,
            duration_seconds=float(getattr(info, "duration", 0.0) or 0.0),
            segments=segments,
        )
