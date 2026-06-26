"""Stripe webhook receiver (B127).

Per ``plan/10-batches-backend.md`` § B127.

``POST /api/v1/stripe/webhook`` — receives signed Stripe webhook
events and dispatches them to the pure-function processor in
``core/billing/webhook_processor.py``.

Honesty rule: signature verification is mandatory. A request that
fails verification is rejected with 401 — the route never trusts
the payload alone.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.core.billing.stripe_client import (
    StripeError,
    get_default_client,
)
from theourgia.core.billing.webhook_processor import process_event
from theourgia.core.config import get_settings

__all__ = ["router"]

_log = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/stripe/webhook",
    tags=["stripe-webhook"],
)
async def stripe_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    stripe_signature: Annotated[str | None, Header(alias="Stripe-Signature")] = None,
) -> dict:
    settings = get_settings()
    secret = getattr(settings, "stripe_webhook_secret", None)
    if not secret or not stripe_signature:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Webhook signature missing.",
        )
    payload = await request.body()
    try:
        event = get_default_client().verify_webhook_signature(
            payload=payload,
            header=stripe_signature,
            secret=str(secret),
        )
    except StripeError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            f"Webhook signature invalid: {exc}",
        )
    outcome = await process_event(db=db, event=event)
    _log.info(
        "stripe_webhook handled=%s kind=%s effects=%s",
        outcome.handled,
        outcome.kind,
        outcome.side_effects,
    )
    return {
        "handled": outcome.handled,
        "kind": outcome.kind,
        "side_effects": list(outcome.side_effects),
    }
