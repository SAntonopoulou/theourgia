"""Upload validation — content type, size limits.

Lightweight: filename-based MIME detection via stdlib ``mimetypes``
plus a size guard. Real content-sniffing (libmagic) is deferred to a
Phase 11 hardening pass — for now, callers should treat the
content_type field as advisory and re-verify on the server before
acting on the payload (e.g., before passing to an image library).
"""

from __future__ import annotations

import mimetypes
from typing import Final

__all__ = [
    "DEFAULT_MAX_SIZE",
    "ValidationError",
    "detect_content_type",
    "validate_size",
]


DEFAULT_MAX_SIZE: Final[int] = 50 * 1024 * 1024
"""50 MiB default cap. Operators can raise / lower via
``THEOURGIA_STORAGE_MAX_UPLOAD_SIZE``."""


class ValidationError(ValueError):
    """Raised by the validators on rejected input. ValueError subclass
    so callers can catch broadly when they just want to reject."""


def detect_content_type(filename: str) -> str:
    """Best-effort MIME type from filename. Falls back to
    ``application/octet-stream`` when the extension is unknown."""
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def validate_size(
    size: int, *, max_size: int = DEFAULT_MAX_SIZE
) -> None:
    """Raise :class:`ValidationError` when ``size`` exceeds ``max_size``."""
    if size < 0:
        raise ValidationError(f"negative upload size: {size}")
    if size > max_size:
        raise ValidationError(
            f"upload size {size} exceeds limit {max_size}"
        )
