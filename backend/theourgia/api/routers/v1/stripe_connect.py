"""Stripe Connect onboarding endpoints (B127).

Per ``plan/10-batches-backend.md`` § B127.

``POST   /api/v1/stripe-connect/account``      — create + onboarding URL
``GET    /api/v1/stripe-connect/account``      — status
``POST   /api/v1/stripe-connect/refresh``      — fresh onboarding URL
``DELETE /api/v1/stripe-connect/account``      — disconnect

Honesty: this surface NEVER charges anything. It exists only to
let the publisher manage their Connect account. Checkouts live in
``checkout.py``.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.billing.stripe_client import (
    StripeError,
    get_default_client,
)
from theourgia.models.stripe_account import (
    OnboardingStatus,
    StripeConnectAccount,
)

__all__ = ["router"]

router = APIRouter()


class AccountRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stripe_account_id: str | None
    onboarding_status: str
    payouts_enabled: bool
    charges_enabled: bool


class OnboardingLinkRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str
    expires_at: int


@router.post(
    "/stripe-connect/account",
    response_model=OnboardingLinkRead,
    status_code=status.HTTP_201_CREATED,
    tags=["stripe-connect"],
)
async def create_connect_account(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> OnboardingLinkRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    client = get_default_client()

    # Find or create the local row first; rolling back the Stripe
    # call on a DB error is harder than the reverse.
    existing = (
        await db.execute(
            select(StripeConnectAccount).where(
                StripeConnectAccount.owner_id == current_user.id,
            )
        )
    ).scalars().first()

    if existing is None:
        row = StripeConnectAccount(
            owner_id=current_user.id,
            onboarding_status=OnboardingStatus.PENDING,
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)
    else:
        row = existing

    try:
        if row.stripe_account_id is None:
            acct = client.create_connect_account(
                email=current_user.email or "publisher@example.invalid",
            )
            row.stripe_account_id = acct.account_id
            await db.commit()
        link = client.create_account_link(
            account_id=row.stripe_account_id,
            return_url="https://theourgia.app/admin/account/connect/return",
            refresh_url="https://theourgia.app/admin/account/connect/refresh",
        )
    except StripeError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"Stripe Connect unavailable: {exc}",
        )
    return OnboardingLinkRead(url=link.url, expires_at=link.expires_at)


@router.get(
    "/stripe-connect/account",
    response_model=AccountRead,
    tags=["stripe-connect"],
)
async def get_connect_account(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> AccountRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = (
        await db.execute(
            select(StripeConnectAccount).where(
                StripeConnectAccount.owner_id == current_user.id,
            )
        )
    ).scalars().first()
    if row is None:
        return AccountRead(
            stripe_account_id=None,
            onboarding_status="pending",
            payouts_enabled=False,
            charges_enabled=False,
        )
    return AccountRead(
        stripe_account_id=row.stripe_account_id,
        onboarding_status=row.onboarding_status.value,
        payouts_enabled=row.payouts_enabled,
        charges_enabled=row.charges_enabled,
    )


@router.post(
    "/stripe-connect/refresh",
    response_model=OnboardingLinkRead,
    tags=["stripe-connect"],
)
async def refresh_onboarding_link(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> OnboardingLinkRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = (
        await db.execute(
            select(StripeConnectAccount).where(
                StripeConnectAccount.owner_id == current_user.id,
            )
        )
    ).scalars().first()
    if row is None or row.stripe_account_id is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No Stripe Connect account yet. POST first.",
        )
    try:
        link = get_default_client().create_account_link(
            account_id=row.stripe_account_id,
            return_url="https://theourgia.app/admin/account/connect/return",
            refresh_url="https://theourgia.app/admin/account/connect/refresh",
        )
    except StripeError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"Stripe Connect unavailable: {exc}",
        )
    return OnboardingLinkRead(url=link.url, expires_at=link.expires_at)


@router.delete(
    "/stripe-connect/account",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["stripe-connect"],
)
async def disconnect_account(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = (
        await db.execute(
            select(StripeConnectAccount).where(
                StripeConnectAccount.owner_id == current_user.id,
            )
        )
    ).scalars().first()
    if row is None or row.stripe_account_id is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    try:
        get_default_client().disconnect_account(row.stripe_account_id)
    except StripeError:
        # The local-side disconnect proceeds regardless — if Stripe
        # is unreachable the publisher still gets the local state
        # flip. They can re-disconnect once Stripe is back.
        pass
    row.onboarding_status = OnboardingStatus.DISCONNECTED
    row.charges_enabled = False
    row.payouts_enabled = False
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
