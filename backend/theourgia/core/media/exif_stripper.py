"""EXIF stripper (B133).

Pillow-backed strip with a no-op fallback for environments without
PIL installed (e.g., CI before the optional `media` extra is on).

Per ``plan/11-batches-backend.md`` § B133:
  * The strip step is verified — the result records original + post-
    strip sizes so a caller can assert non-passthrough where one was
    expected.
  * Sealed bytes are never passed to the stripper — the orchestrator
    routes those past this module entirely.
  * HEIC/HEIF/TIFF mime-types pass through with a clear ``stripped =
    False`` indicator so the caller can surface a `--warn` to the
    practitioner.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

__all__ = [
    "EXIF_STRIPPABLE_MIME_TYPES",
    "ExifStripper",
    "ExifStripResult",
    "NullExifStripper",
    "PillowExifStripper",
    "pick_exif_stripper",
]


# The strippable subset. HEIC/HEIF/TIFF need a fuller stripper and
# pass through with a ``stripped=False`` marker today — they'll be
# upgraded in a later batch when AVIF support also lands.
EXIF_STRIPPABLE_MIME_TYPES = frozenset(
    {"image/jpeg", "image/jpg", "image/png", "image/webp"},
)


@dataclass(frozen=True, slots=True)
class ExifStripResult:
    """The strip step's pure record.

    ``stripped=False`` means the input was passed through unchanged —
    either because the mime-type isn't in the supported set, or because
    no implementation was available. The orchestrator uses the size
    delta + the boolean to record audit telemetry.
    """

    bytes_out: bytes
    bytes_in_size: int
    bytes_out_size: int
    stripped: bool
    reason: str = ""


@runtime_checkable
class ExifStripper(Protocol):
    """Protocol shape for EXIF strippers.

    Implementations MUST be pure (input → output, no side-effects).
    The pipeline orchestrator (B133 media_uploads router) wraps the
    real I/O around the call.
    """

    def strip(self, bytes_in: bytes, mime_type: str) -> ExifStripResult:
        ...


class NullExifStripper:
    """A no-op stripper. Returns the input verbatim with ``stripped=
    False`` + a reason explaining why. Used in CI / dev where Pillow
    isn't installed."""

    def strip(self, bytes_in: bytes, mime_type: str) -> ExifStripResult:
        return ExifStripResult(
            bytes_out=bytes_in,
            bytes_in_size=len(bytes_in),
            bytes_out_size=len(bytes_in),
            stripped=False,
            reason="Pillow not available; no EXIF strip applied.",
        )


class PillowExifStripper:
    """Real stripper backed by Pillow.

    The Pillow import is lazy so the module is importable on systems
    without PIL. ``strip`` raises ``RuntimeError`` if Pillow isn't
    installed when called — callers should fall back to the Null
    stripper at construction time."""

    def strip(self, bytes_in: bytes, mime_type: str) -> ExifStripResult:
        size_in = len(bytes_in)
        if mime_type.lower() not in EXIF_STRIPPABLE_MIME_TYPES:
            return ExifStripResult(
                bytes_out=bytes_in,
                bytes_in_size=size_in,
                bytes_out_size=size_in,
                stripped=False,
                reason=(
                    f"mime-type {mime_type!r} not in strippable set; "
                    "passed through unchanged."
                ),
            )

        try:
            from PIL import Image  # lazy import
        except ImportError as exc:
            raise RuntimeError(
                "PillowExifStripper.strip called without Pillow "
                "installed; construct NullExifStripper instead.",
            ) from exc

        import io

        try:
            img = Image.open(io.BytesIO(bytes_in))
            img.load()
        except Exception as exc:  # noqa: BLE001
            return ExifStripResult(
                bytes_out=bytes_in,
                bytes_in_size=size_in,
                bytes_out_size=size_in,
                stripped=False,
                reason=(
                    f"PIL could not decode input ({exc.__class__.__name__}); "
                    "passed through unchanged."
                ),
            )

        # Strip via re-encode without EXIF.
        out_format = img.format or _format_for_mime(mime_type)
        buf = io.BytesIO()
        # ``exif`` arg explicitly omitted on save; Pillow's default
        # save path includes EXIF when present. We construct a new
        # Image with the same pixels but no metadata to be safe.
        clean = Image.new(img.mode, img.size)
        clean.putdata(list(img.getdata()))
        clean.save(buf, format=out_format)
        out = buf.getvalue()
        return ExifStripResult(
            bytes_out=out,
            bytes_in_size=size_in,
            bytes_out_size=len(out),
            stripped=True,
            reason="",
        )


def _format_for_mime(mime_type: str) -> str:
    return {
        "image/jpeg": "JPEG",
        "image/jpg": "JPEG",
        "image/png": "PNG",
        "image/webp": "WEBP",
    }.get(mime_type.lower(), "JPEG")


def pick_exif_stripper() -> ExifStripper:
    """Construct the best stripper available.

    Returns :class:`PillowExifStripper` when PIL is importable; falls
    back to :class:`NullExifStripper` otherwise. Callers wire this at
    app start so production gets the real strip and CI gets the
    pass-through."""
    try:
        import PIL  # noqa: F401
    except ImportError:
        return NullExifStripper()
    return PillowExifStripper()
