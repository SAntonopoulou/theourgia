"""Stripe client wrapper (B127).

Per ``plan/10-batches-backend.md`` § B127.

Protocol-isolated so the rest of the backend never imports
``stripe`` directly. The Null implementation raises clearly when
called — misconfigured production cannot silently process payments.
The real-SDK implementation lives in ``RealStripeClient`` and is
constructed only when ``STRIPE_SECRET_KEY`` is set.

Honesty rules:
  * **0% application fee.** Every checkout session created here
    routes 100% of the price to the publisher's Connect account.
    The ``application_fee_amount`` parameter is hard-coded to 0
    (Stripe defaults to no fee anyway, but we make it explicit so
    a CI test can assert the invariant against this wrapper).
  * **No refund creation here.** This module ships ``create_*``
    methods but no ``create_refund``. Refunds happen through the
    Stripe Customer Portal — never via our API.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

__all__ = [
    "CheckoutSessionResult",
    "ConnectAccountResult",
    "AccountLinkResult",
    "NullStripeClient",
    "StripeClient",
    "StripeError",
    "make_default_client",
]


# ── Result shapes ────────────────────────────────────────────────


@dataclass(frozen=True)
class ConnectAccountResult:
    """The minimal fields returned by ``create_connect_account``."""

    account_id: str  # acct_…
    payouts_enabled: bool
    charges_enabled: bool


@dataclass(frozen=True)
class AccountLinkResult:
    """A Stripe Account Link for onboarding."""

    url: str
    expires_at: int  # unix timestamp


@dataclass(frozen=True)
class CheckoutSessionResult:
    """The minimal fields returned by ``create_checkout_session``."""

    session_id: str
    checkout_url: str


class StripeError(Exception):
    """Raised when the Stripe client surface signals an error.

    The Null implementation always raises this; the real
    implementation wraps Stripe SDK exceptions.
    """


# ── Protocol ─────────────────────────────────────────────────────


class StripeClient(Protocol):
    """The Protocol every Stripe-touching code path uses.

    Tests substitute a fake at the module-level provider setter
    (see :func:`make_default_client` + the route's
    ``set_stripe_client`` helper)."""

    def create_connect_account(
        self,
        *,
        email: str,
        country: str = "US",
    ) -> ConnectAccountResult: ...

    def create_account_link(
        self,
        *,
        account_id: str,
        return_url: str,
        refresh_url: str,
    ) -> AccountLinkResult: ...

    def retrieve_account(self, account_id: str) -> ConnectAccountResult: ...

    def disconnect_account(self, account_id: str) -> None: ...

    def create_checkout_session(
        self,
        *,
        publisher_account_id: str,
        publication_title: str,
        amount_cents: int,
        currency: str,
        buyer_email: str,
        success_url: str,
        cancel_url: str,
    ) -> CheckoutSessionResult: ...

    def get_customer_portal_url(
        self, *, customer_id: str, return_url: str,
    ) -> str: ...

    def verify_webhook_signature(
        self, *, payload: bytes, header: str, secret: str,
    ) -> dict: ...


# ── Null implementation ────────────────────────────────────────


class NullStripeClient:
    """Defensive default. Every method raises StripeError.

    Production boots with this client until the environment has
    ``STRIPE_SECRET_KEY`` set; the moment a Stripe-touching route
    is called without configuration, the operator gets a clear
    error rather than a silent half-payment.
    """

    def __init__(self, *, reason: str = "Stripe is not configured.") -> None:
        self.reason = reason

    def _raise(self) -> None:
        raise StripeError(self.reason)

    def create_connect_account(
        self, *, email: str, country: str = "US",
    ) -> ConnectAccountResult:
        self._raise()
        raise StripeError("unreachable")

    def create_account_link(
        self, *, account_id: str, return_url: str, refresh_url: str,
    ) -> AccountLinkResult:
        self._raise()
        raise StripeError("unreachable")

    def retrieve_account(self, account_id: str) -> ConnectAccountResult:
        self._raise()
        raise StripeError("unreachable")

    def disconnect_account(self, account_id: str) -> None:
        self._raise()

    def create_checkout_session(
        self,
        *,
        publisher_account_id: str,
        publication_title: str,
        amount_cents: int,
        currency: str,
        buyer_email: str,
        success_url: str,
        cancel_url: str,
    ) -> CheckoutSessionResult:
        self._raise()
        raise StripeError("unreachable")

    def get_customer_portal_url(
        self, *, customer_id: str, return_url: str,
    ) -> str:
        self._raise()
        raise StripeError("unreachable")

    def verify_webhook_signature(
        self, *, payload: bytes, header: str, secret: str,
    ) -> dict:
        self._raise()
        raise StripeError("unreachable")


# ── Real-SDK implementation (lazy import) ─────────────────────


class RealStripeClient:
    """The production implementation. Imports the ``stripe`` SDK
    lazily so the test suite doesn't need it installed.

    HONESTY INVARIANT (the critical one): ``create_checkout_session``
    sets ``payment_intent_data.application_fee_amount = 0`` AND
    ``payment_intent_data.transfer_data.destination`` = the
    publisher's Connect account id. 100% of the price routes to
    the publisher.
    """

    def __init__(self, *, secret_key: str) -> None:
        import stripe  # noqa: F401  - import-time check that SDK is present

        self._stripe = stripe
        self._stripe.api_key = secret_key

    def create_connect_account(
        self, *, email: str, country: str = "US",
    ) -> ConnectAccountResult:
        acct = self._stripe.Account.create(
            type="standard",
            email=email,
            country=country,
        )
        return ConnectAccountResult(
            account_id=acct.id,
            payouts_enabled=bool(acct.get("payouts_enabled", False)),
            charges_enabled=bool(acct.get("charges_enabled", False)),
        )

    def create_account_link(
        self, *, account_id: str, return_url: str, refresh_url: str,
    ) -> AccountLinkResult:
        link = self._stripe.AccountLink.create(
            account=account_id,
            return_url=return_url,
            refresh_url=refresh_url,
            type="account_onboarding",
        )
        return AccountLinkResult(url=link.url, expires_at=link.expires_at)

    def retrieve_account(self, account_id: str) -> ConnectAccountResult:
        acct = self._stripe.Account.retrieve(account_id)
        return ConnectAccountResult(
            account_id=acct.id,
            payouts_enabled=bool(acct.get("payouts_enabled", False)),
            charges_enabled=bool(acct.get("charges_enabled", False)),
        )

    def disconnect_account(self, account_id: str) -> None:
        # OAuth deauthorize. Stripe Connect standard accounts
        # disconnect via this call.
        self._stripe.OAuth.deauthorize(stripe_user_id=account_id)

    def create_checkout_session(
        self,
        *,
        publisher_account_id: str,
        publication_title: str,
        amount_cents: int,
        currency: str,
        buyer_email: str,
        success_url: str,
        cancel_url: str,
    ) -> CheckoutSessionResult:
        # The 0% application fee invariant lives HERE.
        session = self._stripe.checkout.Session.create(
            mode="payment",
            customer_email=buyer_email,
            success_url=success_url,
            cancel_url=cancel_url,
            line_items=[
                {
                    "price_data": {
                        "currency": currency,
                        "unit_amount": amount_cents,
                        "product_data": {"name": publication_title},
                    },
                    "quantity": 1,
                }
            ],
            payment_intent_data={
                # Theourgia takes no cut. Hard-coded 0.
                "application_fee_amount": 0,
                "transfer_data": {
                    "destination": publisher_account_id,
                },
            },
        )
        return CheckoutSessionResult(
            session_id=session.id,
            checkout_url=session.url,
        )

    def get_customer_portal_url(
        self, *, customer_id: str, return_url: str,
    ) -> str:
        portal = self._stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return portal.url

    def verify_webhook_signature(
        self, *, payload: bytes, header: str, secret: str,
    ) -> dict:
        event = self._stripe.Webhook.construct_event(
            payload=payload, sig_header=header, secret=secret,
        )
        return dict(event)


# ── Factory ────────────────────────────────────────────────────


_DEFAULT_CLIENT: StripeClient = NullStripeClient()


def set_default_client(client: StripeClient) -> None:
    """Swap the module-level default. Used by app boot to install
    the real client + by tests to install fakes."""
    global _DEFAULT_CLIENT
    _DEFAULT_CLIENT = client


def get_default_client() -> StripeClient:
    return _DEFAULT_CLIENT


def make_default_client(secret_key: str | None) -> StripeClient:
    """Build the right client for the current environment.

    Returns :class:`NullStripeClient` when no secret key is
    configured. The route + the webhook receiver always go
    through this factory + ``get_default_client``."""
    if not secret_key:
        return NullStripeClient(reason="STRIPE_SECRET_KEY is not set.")
    try:
        return RealStripeClient(secret_key=secret_key)
    except ImportError:
        return NullStripeClient(
            reason=(
                "STRIPE_SECRET_KEY is set but the ``stripe`` SDK is "
                "not installed."
            ),
        )
