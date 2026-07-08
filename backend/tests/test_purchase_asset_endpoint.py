"""Purchase asset streaming + watermark integration — b108-2hb.

Wires the ``/purchases/{id}/asset`` endpoint into checkout.py so
buyers can actually download their purchases. When the publication
opted into ``watermark_enabled`` AND the format is PDF, the
buyer's email is overlaid at download time.

The unit-level watermark logic is tested in
``test_pdf_watermark.py``; this file covers router shape + the
per-content-type branching logic + a hand-rolled end-to-end test
that hits the real Response body via a monkeypatched fetch stub.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from theourgia.api.routers.v1 import checkout as checkout_module
from theourgia.models.publications import PublicationContentFormat


# ── Router surface ────────────────────────────────────────────────


def test_asset_endpoint_registered() -> None:
    paths_methods = {
        (r.path, m)
        for r in checkout_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/purchases/{purchase_id}/asset", "GET") in paths_methods


def test_download_asset_url_is_relative_to_backend() -> None:
    """Post-b108-2hb the asset_url returned by /download points at
    the same-origin asset endpoint, not the fake theourgia.app
    subdomain that shipped as a placeholder in B127."""
    import re
    from inspect import getsource

    src = getsource(checkout_module.download_purchase)
    assert "/api/v1/purchases/" in src
    assert "/asset" in src
    # And the fake theourgia.app placeholder is gone.
    assert "theourgia.app/reader-asset" not in src


# ── End-to-end via monkeypatch of the fetch helper ────────────────


@pytest.mark.anyio
async def test_asset_endpoint_watermarks_pdf_when_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Fetches PDF bytes via a stub, applies the watermark, returns
    the stamped body with the buyer email visible in the PDF text."""
    import io

    from pypdf import PdfReader
    from reportlab.pdfgen.canvas import Canvas

    # Build a tiny source PDF.
    buf = io.BytesIO()
    c = Canvas(buf)
    c.drawString(72, 720, "Chapter One")
    c.showPage()
    c.save()
    source_pdf = buf.getvalue()

    async def fake_fetch(url: str) -> bytes:
        assert url == "https://cdn.example.com/x.pdf"
        return source_pdf

    monkeypatch.setattr(
        checkout_module,
        "_fetch_publication_bytes",
        fake_fetch,
    )

    # Mock db.get() to return a purchase then a publication.
    purchase = SimpleNamespace(
        id=uuid4(),
        download_token="tok-42",
        refunded_at=None,
        download_token_expires_at=(
            datetime.now(tz=timezone.utc) + timedelta(hours=1)
        ),
        publication_id=uuid4(),
        buyer_email="buyer@example.com",
    )
    publication = SimpleNamespace(
        id=purchase.publication_id,
        deleted_at=None,
        file_url="https://cdn.example.com/x.pdf",
        content_format=PublicationContentFormat.PDF,
        watermark_enabled=True,
        slug="grimoire-1",
    )

    class FakeDb:
        async def get(self, cls, id_):  # noqa: ARG002
            if cls.__name__ == "Purchase":
                return purchase
            return publication

    response = await checkout_module.download_purchase_asset(
        purchase_id=purchase.id,
        t="tok-42",
        db=FakeDb(),  # type: ignore[arg-type]
    )
    assert response.media_type == "application/pdf"
    assert response.headers["X-Watermarked"] == "1"
    assert 'filename="grimoire-1.pdf"' in response.headers["Content-Disposition"]

    # Confirm the returned bytes contain the buyer email.
    reader = PdfReader(io.BytesIO(response.body))
    assert "buyer@example.com" in (reader.pages[0].extract_text() or "")


@pytest.mark.anyio
async def test_asset_endpoint_does_not_watermark_when_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import io

    from pypdf import PdfReader
    from reportlab.pdfgen.canvas import Canvas

    buf = io.BytesIO()
    c = Canvas(buf)
    c.drawString(72, 720, "Chapter One")
    c.showPage()
    c.save()
    source_pdf = buf.getvalue()

    async def fake_fetch(url: str) -> bytes:
        return source_pdf

    monkeypatch.setattr(
        checkout_module,
        "_fetch_publication_bytes",
        fake_fetch,
    )

    purchase = SimpleNamespace(
        id=uuid4(),
        download_token="tok-42",
        refunded_at=None,
        download_token_expires_at=(
            datetime.now(tz=timezone.utc) + timedelta(hours=1)
        ),
        publication_id=uuid4(),
        buyer_email="buyer@example.com",
    )
    publication = SimpleNamespace(
        id=purchase.publication_id,
        deleted_at=None,
        file_url="https://cdn.example.com/x.pdf",
        content_format=PublicationContentFormat.PDF,
        watermark_enabled=False,
        slug="freely-shared",
    )

    class FakeDb:
        async def get(self, cls, id_):  # noqa: ARG002
            if cls.__name__ == "Purchase":
                return purchase
            return publication

    response = await checkout_module.download_purchase_asset(
        purchase_id=purchase.id,
        t="tok-42",
        db=FakeDb(),  # type: ignore[arg-type]
    )
    assert response.headers["X-Watermarked"] == "0"
    reader = PdfReader(io.BytesIO(response.body))
    text = reader.pages[0].extract_text() or ""
    assert "buyer@example.com" not in text


@pytest.mark.anyio
async def test_asset_endpoint_skips_watermark_for_epub(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """EPUB is streamed as-is even when watermark_enabled=True —
    watermarking EPUB metadata is fragile enough that we opt out
    at the PDF-only boundary and note it in the docstring."""
    epub_bytes = b"PK\x03\x04fake-epub-bytes-here"

    async def fake_fetch(url: str) -> bytes:
        return epub_bytes

    monkeypatch.setattr(
        checkout_module,
        "_fetch_publication_bytes",
        fake_fetch,
    )

    purchase = SimpleNamespace(
        id=uuid4(),
        download_token="tok-42",
        refunded_at=None,
        download_token_expires_at=(
            datetime.now(tz=timezone.utc) + timedelta(hours=1)
        ),
        publication_id=uuid4(),
        buyer_email="buyer@example.com",
    )
    publication = SimpleNamespace(
        id=purchase.publication_id,
        deleted_at=None,
        file_url="https://cdn.example.com/x.epub",
        content_format=PublicationContentFormat.EPUB,
        watermark_enabled=True,
        slug="book-1",
    )

    class FakeDb:
        async def get(self, cls, id_):  # noqa: ARG002
            if cls.__name__ == "Purchase":
                return purchase
            return publication

    response = await checkout_module.download_purchase_asset(
        purchase_id=purchase.id,
        t="tok-42",
        db=FakeDb(),  # type: ignore[arg-type]
    )
    assert response.media_type == "application/epub+zip"
    assert response.headers["X-Watermarked"] == "0"
    assert response.body == epub_bytes


@pytest.mark.anyio
async def test_asset_endpoint_rejects_bad_token() -> None:
    from fastapi import HTTPException

    purchase = SimpleNamespace(
        id=uuid4(),
        download_token="right-token",
        refunded_at=None,
        download_token_expires_at=(
            datetime.now(tz=timezone.utc) + timedelta(hours=1)
        ),
    )

    class FakeDb:
        async def get(self, cls, id_):  # noqa: ARG002
            if cls.__name__ == "Purchase":
                return purchase
            return None

    with pytest.raises(HTTPException) as exc:
        await checkout_module.download_purchase_asset(
            purchase_id=purchase.id,
            t="wrong-token",
            db=FakeDb(),  # type: ignore[arg-type]
        )
    assert exc.value.status_code == 404


@pytest.mark.anyio
async def test_asset_endpoint_410_on_refunded() -> None:
    from fastapi import HTTPException

    purchase = SimpleNamespace(
        id=uuid4(),
        download_token="tok",
        refunded_at=datetime.now(tz=timezone.utc),
        download_token_expires_at=(
            datetime.now(tz=timezone.utc) + timedelta(hours=1)
        ),
    )

    class FakeDb:
        async def get(self, cls, id_):  # noqa: ARG002
            return purchase

    with pytest.raises(HTTPException) as exc:
        await checkout_module.download_purchase_asset(
            purchase_id=purchase.id,
            t="tok",
            db=FakeDb(),  # type: ignore[arg-type]
        )
    assert exc.value.status_code == 410


@pytest.mark.anyio
async def test_asset_endpoint_410_on_expired_token() -> None:
    from fastapi import HTTPException

    purchase = SimpleNamespace(
        id=uuid4(),
        download_token="tok",
        refunded_at=None,
        download_token_expires_at=(
            datetime.now(tz=timezone.utc) - timedelta(seconds=1)
        ),
    )

    class FakeDb:
        async def get(self, cls, id_):  # noqa: ARG002
            return purchase

    with pytest.raises(HTTPException) as exc:
        await checkout_module.download_purchase_asset(
            purchase_id=purchase.id,
            t="tok",
            db=FakeDb(),  # type: ignore[arg-type]
        )
    assert exc.value.status_code == 410


def test_content_disposition_filename_is_slug_safe() -> None:
    """The slug is passed through a filter that keeps only alnum/
    dash/underscore chars — the Content-Disposition header would
    otherwise break on a slug containing quotes or path separators."""
    from inspect import getsource
    src = getsource(checkout_module.download_purchase_asset)
    assert 'safe_slug = "".join' in src
    assert "if ch.isalnum() or ch in" in src
