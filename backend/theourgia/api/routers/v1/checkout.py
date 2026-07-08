"""Checkout + download + refund-link endpoints (B127).

Per ``plan/10-batches-backend.md`` § B127.

``POST /api/v1/publications/{id}/checkout``       — create Stripe Checkout session
``GET  /api/v1/purchases/{id}/download``          — stream the asset (single-use)
``POST /api/v1/purchases/{id}/refund-link``       — return Stripe portal URL ONLY

Honesty rules:
  * **Sealed publications cannot be checked out.** Defence in
    depth on top of B126's publish-time rejection.
  * **0% application fee** lives in ``stripe_client.py``.
  * **Refunds via portal hand-off ONLY.** This module ships
    ``/refund-link`` that RETURNS the Stripe Customer Portal URL.
    There is NO ``/refund`` endpoint that calls Stripe's refund
    API. The H07 "Manually refund (Stripe portal)" surface contract.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, OptionalCookieUser, get_db_session
from theourgia.core.billing.stripe_client import (
    StripeError,
    get_default_client,
)
from theourgia.core.pdf_watermark import apply_email_watermark
from theourgia.models.entries import EncryptionMode, Entry
from theourgia.models.publications import (
    Publication,
    PublicationContentFormat,
    PublicationState,
)
from theourgia.models.purchase import Purchase
from theourgia.models.stripe_account import (
    OnboardingStatus,
    StripeConnectAccount,
)

__all__ = ["router"]

router = APIRouter()


# ── Payloads ────────────────────────────────────────────────────


class CheckoutPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    buyer_email: EmailStr


class CheckoutResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    checkout_url: str


class DownloadResult(BaseModel):
    """B127 ships this as a JSON contract; the real PDF stream
    arrives in a follow-up batch that adds the asset pipeline.
    For now the response carries the asset URL the client follows
    + the per-purchase download_count after this fetch."""

    model_config = ConfigDict(extra="forbid")

    asset_url: str
    download_count: int
    download_count_limit: int


class RefundLinkResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refund_link: str
    note: str  # "Refund processed through Stripe Customer Portal."


# ── Helpers ─────────────────────────────────────────────────────


def _walk_entry_refs(body: dict) -> list[UUID]:
    """Same walker as the publications router (B126). Re-defined
    locally to avoid the cross-router import cycle."""
    found: list[UUID] = []

    def walk(node: object) -> None:
        if not isinstance(node, dict):
            return
        attrs = node.get("attrs") if isinstance(node.get("attrs"), dict) else None
        if attrs and isinstance(attrs.get("entry_id"), str):
            try:
                found.append(UUID(attrs["entry_id"]))
            except ValueError:
                pass
        for child in node.get("content", []) or []:
            walk(child)

    walk(body)
    return found


async def _reject_sealed_embeds(
    db: AsyncSession, publication: Publication,
) -> None:
    """Defence in depth — even though /publish refused this body,
    re-check at checkout time. A sealed entry shouldn't reach
    paying eyeballs."""
    refs = _walk_entry_refs(dict(publication.body or {}))
    if not refs:
        return
    stmt = (
        select(Entry.id)
        .where(Entry.id.in_(refs))
        .where(Entry.owner_id == publication.owner_id)
        .where(Entry.encryption_mode == EncryptionMode.SEALED)
    )
    bad = (await db.execute(stmt)).scalars().first()
    if bad is not None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "This publication references sealed entries and cannot be sold.",
        )


# ── /publications/{id}/checkout ────────────────────────────────


@router.post(
    "/publications/{publication_id}/checkout",
    response_model=CheckoutResult,
    tags=["publications"],
)
async def create_checkout(
    publication_id: UUID,
    payload: CheckoutPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> CheckoutResult:
    """Buyer-facing endpoint. Auth NOT required — anonymous buyers
    are first-class."""
    pub = await db.get(Publication, publication_id)
    if (
        pub is None
        or pub.deleted_at is not None
        or pub.state != PublicationState.LIVE
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Publication not available.",
        )
    if pub.pricing_model != "one_time":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Pricing model {pub.pricing_model!r} is not purchasable here.",
        )
    if pub.one_time_amount_cents is None or pub.one_time_amount_cents <= 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Publication price is not set.",
        )

    await _reject_sealed_embeds(db, pub)

    # The publisher must have an active Connect account.
    acct = (
        await db.execute(
            select(StripeConnectAccount).where(
                StripeConnectAccount.owner_id == pub.owner_id,
            )
        )
    ).scalars().first()
    if (
        acct is None
        or acct.stripe_account_id is None
        or acct.onboarding_status != OnboardingStatus.ACTIVE
    ):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Publisher's payment account isn't ready.",
        )

    client = get_default_client()
    try:
        session = client.create_checkout_session(
            publisher_account_id=acct.stripe_account_id,
            publication_title=pub.title,
            amount_cents=pub.one_time_amount_cents,
            currency=pub.currency,
            buyer_email=str(payload.buyer_email),
            success_url=(
                "https://theourgia.app/reader/"
                f"{pub.owner_id}/{pub.slug}?paid=1"
            ),
            cancel_url=(
                "https://theourgia.app/reader/"
                f"{pub.owner_id}/{pub.slug}?paid=0"
            ),
        )
    except StripeError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"Checkout temporarily unavailable: {exc}",
        )
    return CheckoutResult(checkout_url=session.checkout_url)


# ── /purchases/{id}/download ───────────────────────────────────


@router.get(
    "/purchases/{purchase_id}/download",
    response_model=DownloadResult,
    tags=["purchases"],
)
async def download_purchase(
    purchase_id: UUID,
    token: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DownloadResult:
    """Token-gated download. Bumps ``download_count`` and refuses
    when the limit or expiry is hit. The actual asset stream
    arrives in a follow-up batch; this endpoint guards the gate."""
    purchase = await db.get(Purchase, purchase_id)
    if purchase is None or purchase.download_token != token:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Purchase not found.",
        )
    if purchase.refunded_at is not None:
        raise HTTPException(
            status.HTTP_410_GONE,
            "This purchase was refunded; downloads are no longer available.",
        )
    now = datetime.now(tz=timezone.utc)
    if purchase.download_token_expires_at <= now:
        raise HTTPException(
            status.HTTP_410_GONE,
            "Download token has expired.",
        )
    if purchase.download_count >= purchase.download_count_limit:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Download count exceeded. Contact the publisher.",
        )

    pub = await db.get(Publication, purchase.publication_id)
    if pub is None or pub.deleted_at is not None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Publication no longer available.",
        )

    purchase.download_count += 1
    await db.commit()
    await db.refresh(purchase)

    return DownloadResult(
        asset_url=(
            f"/api/v1/purchases/{purchase.id}/asset"
            f"?t={purchase.download_token}"
        ),
        download_count=purchase.download_count,
        download_count_limit=purchase.download_count_limit,
    )


# ── /purchases/{id}/asset ──────────────────────────────────────
#
# The actual streaming endpoint. Fetches the publication file from
# storage, applies the buyer-email watermark when the publication
# has ``watermark_enabled=True`` AND the format is PDF (EPUB /
# HTML never get watermarked here — HTML is served through the
# public reader with visible attribution, EPUB metadata is fragile).


async def _fetch_publication_bytes(file_url: str) -> bytes:
    """Fetch a publication asset. Isolated for monkeypatch in tests."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(file_url, follow_redirects=True)
        resp.raise_for_status()
        return resp.content


@router.get(
    "/purchases/{purchase_id}/asset",
    tags=["purchases"],
    responses={
        200: {"content": {"application/pdf": {}, "application/epub+zip": {}}},
        404: {"description": "Purchase or file not found"},
        410: {"description": "Refunded or token expired"},
    },
)
async def download_purchase_asset(
    purchase_id: UUID,
    t: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    """Stream the purchased file to the client.

    Token-gated. Applies the watermark inline when the publication
    opted in. The download_count bump happened at ``/download`` —
    the asset endpoint accepts any request whose token still matches
    and hasn't expired.
    """
    purchase = await db.get(Purchase, purchase_id)
    if purchase is None or purchase.download_token != t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Purchase not found.")
    if purchase.refunded_at is not None:
        raise HTTPException(
            status.HTTP_410_GONE,
            "This purchase was refunded; downloads are no longer available.",
        )
    now = datetime.now(tz=timezone.utc)
    if purchase.download_token_expires_at <= now:
        raise HTTPException(status.HTTP_410_GONE, "Download token has expired.")

    pub = await db.get(Publication, purchase.publication_id)
    if pub is None or pub.deleted_at is not None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Publication no longer available.",
        )
    if not pub.file_url:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Publication has no downloadable file.",
        )

    source_bytes = await _fetch_publication_bytes(pub.file_url)

    watermarked = (
        pub.watermark_enabled
        and pub.content_format == PublicationContentFormat.PDF
    )
    if watermarked:
        source_bytes = apply_email_watermark(source_bytes, purchase.buyer_email)

    if pub.content_format == PublicationContentFormat.EPUB:
        media_type = "application/epub+zip"
        extension = "epub"
    else:
        media_type = "application/pdf"
        extension = "pdf"

    safe_slug = "".join(
        ch for ch in pub.slug if ch.isalnum() or ch in "-_"
    ) or "publication"
    filename = f"{safe_slug}.{extension}"

    return Response(
        content=source_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "private, no-store",
            "X-Watermarked": "1" if watermarked else "0",
        },
    )


# ── /purchases/{id}/refund-link ────────────────────────────────


@router.post(
    "/purchases/{purchase_id}/refund-link",
    response_model=RefundLinkResult,
    tags=["purchases"],
)
async def refund_link(
    purchase_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> RefundLinkResult:
    """Returns the publisher's Stripe Customer Portal URL.

    The H07 honesty rule: this endpoint NEVER calls Stripe's
    refund API. The publisher follows the link and processes the
    refund through Stripe's portal. The ``charge.refunded``
    webhook eventually flips ``Purchase.refunded_at``."""
    purchase = await db.get(Purchase, purchase_id)
    if purchase is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Purchase not found.",
        )
    pub = await db.get(Publication, purchase.publication_id)
    if pub is None or pub.owner_id != current_user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Only the publisher can fetch the refund link.",
        )
    acct = (
        await db.execute(
            select(StripeConnectAccount).where(
                StripeConnectAccount.owner_id == current_user.id,
            )
        )
    ).scalars().first()
    if acct is None or acct.stripe_account_id is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Publisher's Stripe account isn't connected.",
        )
    try:
        url = get_default_client().get_customer_portal_url(
            # The Customer is the buyer; on Connect standard accounts
            # the portal is created against the publisher's account
            # — Stripe surfaces the right buyer purchase via the
            # account context.
            customer_id=purchase.stripe_payment_intent_id,
            return_url=(
                "https://theourgia.app/admin/subscribers/"
                f"refund-return?p={purchase.id}"
            ),
        )
    except StripeError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"Refund portal unavailable: {exc}",
        )
    return RefundLinkResult(
        refund_link=url,
        note="Refund processed through Stripe Customer Portal.",
    )
