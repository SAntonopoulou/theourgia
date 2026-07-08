"""PDF watermark helper tests — b108-2hb.

FEATURES.md §12 · "DRM-free always — optional watermarking with
buyer email". Tests the pure ``apply_email_watermark`` helper in
isolation; the end-to-end streaming path lives in
``test_purchase_asset_endpoint.py``.
"""

from __future__ import annotations

import io

import pytest
from pypdf import PdfReader
from reportlab.pdfgen.canvas import Canvas

from theourgia.core.pdf_watermark import apply_email_watermark


def _build_simple_pdf(pages: int = 1) -> bytes:
    buf = io.BytesIO()
    c = Canvas(buf)
    for i in range(pages):
        c.drawString(72, 720, f"Chapter {i + 1}")
        c.showPage()
    c.save()
    return buf.getvalue()


def test_empty_email_returns_source_unchanged() -> None:
    source = _build_simple_pdf(1)
    assert apply_email_watermark(source, "") == source


def test_watermark_preserves_original_pages() -> None:
    source = _build_simple_pdf(3)
    stamped = apply_email_watermark(source, "buyer@example.com")
    reader = PdfReader(io.BytesIO(stamped))
    assert len(reader.pages) == 3


def test_watermark_embeds_buyer_email_on_every_page() -> None:
    source = _build_simple_pdf(2)
    stamped = apply_email_watermark(source, "buyer@example.com")
    reader = PdfReader(io.BytesIO(stamped))
    for page in reader.pages:
        text = page.extract_text() or ""
        assert "buyer@example.com" in text


def test_watermark_output_is_valid_pdf() -> None:
    source = _build_simple_pdf(1)
    stamped = apply_email_watermark(source, "someone@somewhere")
    # PDFs start with %PDF- header.
    assert stamped[:5] == b"%PDF-"
    # And end with %%EOF (allowing trailing whitespace).
    assert b"%%EOF" in stamped[-32:]


def test_watermark_grows_the_file_but_not_absurdly() -> None:
    source = _build_simple_pdf(1)
    stamped = apply_email_watermark(source, "buyer@example.com")
    # Stamp adds at least the text overlay + reference — expect growth.
    assert len(stamped) > len(source)
    # But not more than 5x — this catches gross mis-writes like
    # stamping the stamp page N times.
    assert len(stamped) < 5 * len(source)


def test_watermark_survives_email_with_special_characters() -> None:
    """PDFs need to escape parens and backslashes in the text stream;
    ensure common address characters roundtrip."""
    source = _build_simple_pdf(1)
    stamped = apply_email_watermark(
        source, "buyer+order-42@sub.example.com",
    )
    reader = PdfReader(io.BytesIO(stamped))
    text = reader.pages[0].extract_text() or ""
    assert "buyer+order-42@sub.example.com" in text


def test_watermark_rejects_completely_malformed_input() -> None:
    """A non-PDF byte blob should surface a real error at the pypdf
    layer, not silently return a corrupt PDF."""
    with pytest.raises(Exception):
        apply_email_watermark(b"not a pdf", "buyer@example.com")
