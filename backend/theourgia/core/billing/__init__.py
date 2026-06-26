"""Phase 10 — Billing core.

Houses the Stripe integration substrate. Everything is Protocol-
isolated so tests can substitute a fake without touching the
``stripe`` SDK; the production wiring imports the real SDK lazily.

Modules:
  * stripe_client — the StripeClient Protocol + a Null fallback
    + a real-SDK implementation behind a feature flag.
  * webhook_processor — pure functions that consume Stripe
    webhook events and persist the side effects.
  * tokens — download token generation + verification helpers.
"""
