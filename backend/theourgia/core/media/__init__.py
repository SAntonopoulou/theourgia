"""Media pipeline substrate (Phase 11 · B133).

The Phase-01 storage substrate already exposes presigned-PUT, exists,
stat, and delete via ``theourgia.core.storage``. This package adds:

* ``ExifStripper`` — protocol + Null + Pillow-backed real impl that
  removes EXIF metadata from JPEG / PNG / WebP image bytes.
* Helpers shared by the upload pipeline router.

The EXIF stripper follows the same Protocol-isolation pattern Phase 10
B127 used for Stripe — the real implementation lazy-imports Pillow so
CI does not need it.
"""

from __future__ import annotations

from theourgia.core.media.exif_stripper import (
    EXIF_STRIPPABLE_MIME_TYPES,
    ExifStripper,
    ExifStripResult,
    NullExifStripper,
    PillowExifStripper,
    pick_exif_stripper,
)

__all__ = [
    "EXIF_STRIPPABLE_MIME_TYPES",
    "ExifStripper",
    "ExifStripResult",
    "NullExifStripper",
    "PillowExifStripper",
    "pick_exif_stripper",
]
