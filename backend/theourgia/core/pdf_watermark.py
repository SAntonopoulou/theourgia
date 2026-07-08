"""PDF watermarking for purchase downloads (b108-2hb).

FEATURES.md §12 · "DRM-free always — optional watermarking with
buyer email". The publication carries a ``watermark_enabled``
opt-in; when set, the buyer's email is drawn diagonally across
every page in low-opacity grey text before the PDF is streamed to
the client. The original file in R2 is never modified — the
watermark is applied at download time.

There is NO DRM. The watermark exists only so a buyer can see
what identifier is tied to their copy; it does not restrict
what the buyer can do with the file.
"""

from __future__ import annotations

import io

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import Color
from reportlab.pdfgen.canvas import Canvas

__all__ = ["apply_email_watermark"]


_WATERMARK_TEXT_COLOR = Color(0.5, 0.5, 0.5, alpha=0.30)


def _build_stamp(text: str, page_width: float, page_height: float) -> bytes:
    """Build a one-page PDF containing the diagonal watermark text."""
    buffer = io.BytesIO()
    c = Canvas(buffer, pagesize=(page_width, page_height))
    c.setFillColor(_WATERMARK_TEXT_COLOR)
    c.setFont("Helvetica-Oblique", 18)
    c.saveState()
    # Rotate the canvas around the page centre so the text runs
    # diagonally from bottom-left to top-right.
    c.translate(page_width / 2.0, page_height / 2.0)
    c.rotate(30)
    c.drawCentredString(0, 0, text)
    # A quieter caption below the main line — reads as a legal note
    # rather than an accusation.
    c.setFont("Helvetica", 8)
    c.drawCentredString(
        0, -24,
        "This copy is licensed to the address above. Please do not"
        " redistribute.",
    )
    c.restoreState()
    c.showPage()
    c.save()
    return buffer.getvalue()


def apply_email_watermark(pdf_bytes: bytes, email: str) -> bytes:
    """Return a new PDF with the buyer's ``email`` stamped on every page.

    The stamp is applied per-page so pages of varying sizes still
    display a properly-centred watermark. If the source PDF is
    malformed pypdf will raise — callers should let it propagate to
    the HTTP layer so buyers see a real error instead of a corrupted
    download.
    """
    if not email:
        return pdf_bytes
    source = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    for page in source.pages:
        media = page.mediabox
        width = float(media.width)
        height = float(media.height)
        stamp_pdf = PdfReader(io.BytesIO(_build_stamp(email, width, height)))
        stamp_page = stamp_pdf.pages[0]
        # merge_page draws the stamp on top of the existing page.
        page.merge_page(stamp_page)
        writer.add_page(page)
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()
