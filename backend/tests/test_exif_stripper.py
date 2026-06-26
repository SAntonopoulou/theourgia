"""Unit tests for the EXIF stripper substrate (B133).

Covers:
  * NullExifStripper pass-through behaviour + result fields
  * PillowExifStripper non-strippable mime pass-through (does not
    need Pillow)
  * pick_exif_stripper picks PillowExifStripper if PIL present,
    NullExifStripper otherwise
  * EXIF_STRIPPABLE_MIME_TYPES contains the documented set
  * Real Pillow strip behaviour is gated behind a skip-if-Pillow
    marker so CI without the media extra still passes
"""

from __future__ import annotations

import importlib.util

import pytest

from theourgia.core.media.exif_stripper import (
    EXIF_STRIPPABLE_MIME_TYPES,
    ExifStripper,
    ExifStripResult,
    NullExifStripper,
    PillowExifStripper,
    pick_exif_stripper,
)


# ── Result dataclass ─────────────────────────────────────────────


def test_exif_strip_result_carries_required_fields() -> None:
    r = ExifStripResult(
        bytes_out=b"x",
        bytes_in_size=10,
        bytes_out_size=1,
        stripped=True,
        reason="",
    )
    assert r.bytes_out == b"x"
    assert r.bytes_in_size == 10
    assert r.bytes_out_size == 1
    assert r.stripped is True
    assert r.reason == ""


def test_exif_strip_result_is_frozen() -> None:
    r = ExifStripResult(
        bytes_out=b"x", bytes_in_size=1, bytes_out_size=1,
        stripped=False, reason="",
    )
    with pytest.raises((AttributeError, Exception)):
        r.stripped = True  # type: ignore[misc]


# ── Strippable mime types ────────────────────────────────────────


def test_strippable_set_contains_jpeg() -> None:
    assert "image/jpeg" in EXIF_STRIPPABLE_MIME_TYPES


def test_strippable_set_contains_png() -> None:
    assert "image/png" in EXIF_STRIPPABLE_MIME_TYPES


def test_strippable_set_contains_webp() -> None:
    assert "image/webp" in EXIF_STRIPPABLE_MIME_TYPES


def test_strippable_set_excludes_heic() -> None:
    """HEIC pass-through — practitioner gets a `--warn` from the
    upload modal; we don't pretend to strip it."""
    assert "image/heic" not in EXIF_STRIPPABLE_MIME_TYPES


def test_strippable_set_excludes_tiff() -> None:
    assert "image/tiff" not in EXIF_STRIPPABLE_MIME_TYPES


def test_strippable_set_excludes_pdf() -> None:
    """We don't strip documents — only images."""
    assert "application/pdf" not in EXIF_STRIPPABLE_MIME_TYPES


def test_strippable_set_is_frozen() -> None:
    """frozenset so a future commit can't accidentally add to it
    in-place."""
    assert isinstance(EXIF_STRIPPABLE_MIME_TYPES, frozenset)


# ── NullExifStripper ─────────────────────────────────────────────


def test_null_stripper_passes_bytes_through() -> None:
    s = NullExifStripper()
    result = s.strip(b"hello", "image/jpeg")
    assert result.bytes_out == b"hello"


def test_null_stripper_marks_stripped_false() -> None:
    s = NullExifStripper()
    assert s.strip(b"hello", "image/jpeg").stripped is False


def test_null_stripper_records_input_size() -> None:
    s = NullExifStripper()
    payload = b"a" * 1000
    result = s.strip(payload, "image/jpeg")
    assert result.bytes_in_size == 1000
    assert result.bytes_out_size == 1000


def test_null_stripper_provides_reason() -> None:
    s = NullExifStripper()
    assert "Pillow" in s.strip(b"x", "image/jpeg").reason


def test_null_stripper_satisfies_protocol() -> None:
    assert isinstance(NullExifStripper(), ExifStripper)


# ── PillowExifStripper (no-PIL paths) ────────────────────────────


def test_pillow_stripper_passes_non_strippable_mime() -> None:
    """HEIC pass-through doesn't even touch PIL — the early-return
    works without the import."""
    s = PillowExifStripper()
    payload = b"fake heic bytes"
    result = s.strip(payload, "image/heic")
    assert result.bytes_out == payload
    assert result.stripped is False
    assert "heic" in result.reason.lower()


def test_pillow_stripper_passes_tiff_unchanged() -> None:
    s = PillowExifStripper()
    payload = b"fake tiff bytes"
    result = s.strip(payload, "image/tiff")
    assert result.bytes_out == payload
    assert result.stripped is False


def test_pillow_stripper_passes_pdf_unchanged() -> None:
    s = PillowExifStripper()
    payload = b"%PDF-1.4"
    result = s.strip(payload, "application/pdf")
    assert result.bytes_out == payload
    assert result.stripped is False


def test_pillow_stripper_satisfies_protocol() -> None:
    assert isinstance(PillowExifStripper(), ExifStripper)


def test_pillow_stripper_raises_clear_error_without_pil(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """If Pillow really isn't installed AND the caller hands us a
    strippable mime, we want a clear RuntimeError telling them to
    construct the Null stripper instead. Simulated via import
    hook so the test runs regardless of PIL availability."""
    s = PillowExifStripper()
    # Block the lazy ``from PIL import Image`` inside ``.strip``.
    import builtins

    real_import = builtins.__import__

    def _blocked(
        name: str, globals=None, locals=None, fromlist=(), level=0,
    ):
        if name == "PIL" or name.startswith("PIL."):
            raise ImportError("blocked for test")
        return real_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr(builtins, "__import__", _blocked)
    with pytest.raises(RuntimeError, match="without Pillow installed"):
        s.strip(b"fake jpeg", "image/jpeg")


# ── pick_exif_stripper ──────────────────────────────────────────


def test_pick_exif_stripper_returns_null_without_pil(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When PIL can't be imported, pick falls back to Null."""
    import builtins

    real_import = builtins.__import__

    def _blocked(
        name: str, globals=None, locals=None, fromlist=(), level=0,
    ):
        if name == "PIL" or name.startswith("PIL."):
            raise ImportError("blocked for test")
        return real_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr(builtins, "__import__", _blocked)
    s = pick_exif_stripper()
    assert isinstance(s, NullExifStripper)


def test_pick_exif_stripper_returns_pillow_when_pil_present(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When PIL imports cleanly, pick returns PillowExifStripper."""
    import sys
    import types

    fake_pil = types.ModuleType("PIL")
    monkeypatch.setitem(sys.modules, "PIL", fake_pil)
    s = pick_exif_stripper()
    assert isinstance(s, PillowExifStripper)


# ── Real Pillow strip — gated ─────────────────────────────────────


_pillow_available = importlib.util.find_spec("PIL") is not None


@pytest.mark.skipif(
    not _pillow_available,
    reason="Pillow not installed in this environment",
)
def test_pillow_strip_round_trip_no_exif_image() -> None:
    """A round-trip on a fresh in-memory JPEG validates the strip
    doesn't corrupt the image. The image had no EXIF to begin with,
    so the strip is effectively a re-encode (stripped=True; the
    bytes may differ in length but the pixel data round-trips)."""
    from PIL import Image
    import io

    src = Image.new("RGB", (4, 4), color=(255, 0, 0))
    buf = io.BytesIO()
    src.save(buf, format="JPEG")
    payload = buf.getvalue()

    result = PillowExifStripper().strip(payload, "image/jpeg")
    assert result.stripped is True
    decoded = Image.open(io.BytesIO(result.bytes_out))
    assert decoded.size == (4, 4)
