# Phase 10 backend authoring plan (B126 → B131)

**Status:** OPEN — ready to execute.
**Modeled on:** `plan/08-batches-backend.md` and `plan/09-batches-backend.md`.

This document **locks every backend product decision** for Phase 10
(Publishing & Monetization). The implementation agent does not pick
alternatives; the agent renders the locked decisions across
migrations, models, routers, and tests. Where this document says
"this column exists", it exists; where it says "this honesty rule
fires", it fires. If a genuine question remains after reading this
doc, raise it back — do not pick a direction.

**Scope:** the per-vault publishing path that wires the H07
Cluster B frontend (10 surfaces · all shipped) to live data.

**Explicitly out of scope (Phase 12+ or 14+):**

- Network-level (hub) newsletters and curated digests.
- Author-managed comments on publications (per phase plan; deferred
  to the Plugin Ecosystem batch in Phase 14).
- ActivityPub bridging of public posts (Phase 13).
- Federated author profiles + cross-instance follow.
- Stripe Tax automation (the route surfaces the link; we don't
  configure tax for the author).
- EPUB generation (PDF + web reader ship in Phase 10; EPUB is a
  follow-up).
- Subdomain configuration per vault (per phase plan, deferred to
  Phase 15 hardening).

These all have a clear home later and shouldn't be authored
speculatively now.

Carry-forward backend conventions (proven through B103-B125):

- `owner_id: UUID | None` with `ForeignKey("user.id", ondelete="SET NULL")`.
- Inline Pydantic schemas in router files.
- Pagination via `limit: int = 100` (max 500).
- `SoftDeleteMixin` via `deleted_at`.
- Honesty rules enforced at the API layer; DB constraints back
  the most critical ones.
- Federation prep (`canonical_id` + `instance_id`) explicitly
  DEFERRED to Phase 12.

---

## Execution order summary

| Batch | Title | Dependencies | Est. lines | Tests added |
|-------|-------|--------------|-----------:|------------:|
| B126 | Publication model + lifecycle + Tiptap body | Phase 04 (entry / Tiptap nodes) | ~900 | ~35 |
| B127 | Stripe Connect substrate + purchase | B126 + Phase 01 (auth) | ~1100 | ~30 |
| B128 | Subscription tiers + subscribers (double-opt-in + failed-payment) | B127 | ~800 | ~28 |
| B129 | Newsletter issues + delivery pipeline | B126 + Phase 01 (email substrate) | ~750 | ~25 |
| B130 | Public reader + per-vault public page + RSS/Atom/JSON Feed | B126 + B128 | ~700 | ~22 |
| B131 | Phase 10 close-out (CHANGELOG · FEATURES · README · memory) | B126-B130 | (docs) | (none) |

Approximate total: ~4250 lines + ~140 tests.
Backend test count target: 1899 → ~2040 by Phase 10 close.

Alembic chain: 0047 → 0048 → 0049 → 0050 → 0051 → 0052 (one per
batch B126-B130; B131 ships no migrations).

---

## B126 — Publication model + lifecycle + Tiptap body

**Files created:**

- `backend/theourgia/models/publications.py`
- `backend/alembic/versions/0048_phase10_publications.py`
- `backend/theourgia/api/routers/v1/publications.py`
- `backend/tests/test_publications.py`

**Publication model:**

```python
class PublicationKind(str, enum.Enum):
    BOOK = "book"
    ESSAY = "essay"
    POST = "post"
    PAGE = "page"


class PublicationState(str, enum.Enum):
    """Lifecycle. WITHDRAWN is soft (opacity 0.5 in the UI) but
    the row stays in place — never delete a published artefact."""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    LIVE = "live"
    WITHDRAWN = "withdrawn"


class PublicationLicense(str, enum.Enum):
    """The nine licenses the H07 Editor surface picks from."""
    ALL_RIGHTS_RESERVED = "all_rights_reserved"
    CC_BY = "cc_by"
    CC_BY_SA = "cc_by_sa"
    CC_BY_NC = "cc_by_nc"
    CC_BY_NC_SA = "cc_by_nc_sa"
    CC_BY_NC_ND = "cc_by_nc_nd"
    CC_BY_ND = "cc_by_nd"
    CC0 = "cc0"
    PUBLIC_DOMAIN = "public_domain"


class Publication(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "publication"
    owner_id: UUID = Field(foreign_key="user.id", nullable=False, index=True)

    kind: PublicationKind = Field(...)
    state: PublicationState = Field(default=PublicationState.DRAFT)
    title: str = Field(max_length=240, nullable=False)
    slug: str = Field(max_length=240, nullable=False)
    summary: Optional[str] = Field(default=None, sa_column=Column(Text))
    # Tiptap JSON for essay/post/page; for book → root structure
    # with chapter children
    body: dict = Field(sa_column=Column(JSONB, nullable=False, server_default="{}"))
    # Optional cover image URL (R2-backed once Phase 11 ships)
    cover_url: Optional[str] = Field(default=None, max_length=480)
    language: str = Field(default="en", max_length=16)
    license: PublicationLicense = Field(default=PublicationLicense.ALL_RIGHTS_RESERVED)

    # Lifecycle timestamps. published_at is set when state → LIVE.
    # scheduled_publish_at is set when state → SCHEDULED.
    published_at: Optional[datetime] = Field(default=None)
    scheduled_publish_at: Optional[datetime] = Field(default=None)
    withdrawn_at: Optional[datetime] = Field(default=None)

    # Pricing — null when state=DRAFT or kind=PAGE (free pages).
    # See B127 for Stripe wiring.
    pricing_model: str = Field(default="free", max_length=16)  # "free" | "one_time" | "subscribe"
    one_time_amount_cents: Optional[int] = Field(default=None, ge=0)
    currency: str = Field(default="usd", max_length=8)

    # Watermark toggle (H07 Pricing surface; defaults OFF).
    watermark_enabled: bool = Field(default=False, nullable=False)

    # Citation flag — true when the publication contains
    # bundled/PD reference material (H07 ‡ chip).
    cited: bool = Field(default=False, nullable=False)

    __table_args__ = (
        Index("ix_publication_owner", "owner_id"),
        Index("ix_publication_owner_state", "owner_id", "state"),
        Index("ix_publication_slug_owner", "slug", "owner_id", unique=True),
        Index("ix_publication_published_at", "published_at"),
    )


class PublicationChapter(IDMixin, TimestampMixin, table=True):
    """Used only when publication.kind == BOOK. Linear order via
    ``order_index`` (no parent/child nesting in v1)."""
    __tablename__ = "publication_chapter"
    publication_id: UUID = Field(
        foreign_key="publication.id", ondelete="CASCADE", nullable=False,
    )
    order_index: int = Field(nullable=False, default=0)
    title: str = Field(max_length=240, nullable=False)
    body: dict = Field(sa_column=Column(JSONB, nullable=False, server_default="{}"))

    __table_args__ = (
        Index("ix_chapter_publication", "publication_id"),
        UniqueConstraint("publication_id", "order_index", name="uq_chapter_order"),
    )
```

**API:**

- `GET /api/v1/publications?state=&kind=&limit=100` → `list[PublicationCard]` (caller's vault).
- `POST /api/v1/publications` body `{ kind, title, slug?, summary? }` → `PublicationRead`. Slug auto-derived from title when omitted (kebab-case + collision-safe).
- `GET /api/v1/publications/{id}` → `PublicationRead` (with chapters when kind=BOOK).
- `PATCH /api/v1/publications/{id}` → `PublicationRead`. Body / chapters editable independently.
- `DELETE /api/v1/publications/{id}` → 204 (soft).
- `POST /api/v1/publications/{id}/publish` → flips state DRAFT → LIVE (or SCHEDULED → LIVE when ready). Sets `published_at = now()`.
- `POST /api/v1/publications/{id}/schedule` body `{ scheduled_publish_at }` → flips to SCHEDULED with the requested time.
- `POST /api/v1/publications/{id}/withdraw` → flips LIVE → WITHDRAWN. Sets `withdrawn_at`. The row stays.
- `POST /api/v1/publications/{id}/republish` → flips WITHDRAWN → LIVE (the "publish a new version" affordance per H07 rule 8). Bumps `published_at`.
- Chapter sub-resources for books:
  - `POST /api/v1/publications/{id}/chapters` → append.
  - `PATCH /api/v1/publications/{id}/chapters/{chapter_id}` → update title / body.
  - `DELETE /api/v1/publications/{id}/chapters/{chapter_id}` → remove.
  - `POST /api/v1/publications/{id}/chapters/reorder` body `{ ordered_ids: [UUID, ...] }` → rewrite `order_index`.

**Honesty rules:**

1. **Withdrawn is soft.** A withdrawn publication's row stays; `withdrawn_at` is the audit timestamp. Republishing flips it back to LIVE with a fresh `published_at` — the H07 "publish a new version" affordance.
2. **Sealed entries cannot be embedded.** When the publication's Tiptap body references an entry that's `encryption_mode=SEALED`, the publication's `publish` route rejects with 400 "Sealed entries cannot be embedded in a public publication."
3. **Slug + owner_id is unique.** Two publications can't share a slug under the same vault. The route auto-derives an available slug when the caller omits it.
4. **State transitions are explicit.** No silent state flips from a PATCH — only the four lifecycle endpoints change `state`. Patching `state` directly via the generic PATCH is rejected.

**Tests (≥ 35):** CRUD · slug auto-derivation + collision · soft delete · state lifecycle (each transition tested both happy + rejected) · sealed embed rejection · chapter CRUD + reorder · uniqueness invariants.

**DoD:**

- [ ] Model + migration 0048.
- [ ] Router registered.
- [ ] Lifecycle endpoints enforced.
- [ ] Sealed-embed honesty rule wired.
- [ ] Tests green.

---

## B127 — Stripe Connect substrate + purchase

**Files created:**

- `backend/theourgia/models/stripe_account.py`
- `backend/theourgia/models/purchase.py`
- `backend/alembic/versions/0049_phase10_stripe_connect.py`
- `backend/theourgia/core/billing/__init__.py`
- `backend/theourgia/core/billing/stripe_client.py` (thin wrapper around Stripe Python SDK)
- `backend/theourgia/core/billing/webhook_processor.py` (Stripe webhook → DB)
- `backend/theourgia/api/routers/v1/stripe_connect.py`
- `backend/theourgia/api/routers/v1/checkout.py`
- `backend/theourgia/api/routers/v1/stripe_webhook.py`
- `backend/tests/test_stripe_connect.py`
- `backend/tests/test_purchase.py`

**Stripe account model:**

```python
class StripeConnectAccount(IDMixin, TimestampMixin, table=True):
    __tablename__ = "stripe_connect_account"
    owner_id: UUID = Field(foreign_key="user.id", nullable=False, unique=True, index=True)
    # Stripe Connect standard account id (acct_…) issued by Stripe
    # when the practitioner completes onboarding.
    stripe_account_id: Optional[str] = Field(default=None, max_length=64, unique=True)
    onboarding_status: str = Field(default="pending", max_length=24)
    # "pending" | "active" | "restricted" | "rejected"
    # Refresh tokens for re-auth; rotated by webhook on account update.
    payouts_enabled: bool = Field(default=False)
    charges_enabled: bool = Field(default=False)
```

**Purchase model:**

```python
class Purchase(IDMixin, TimestampMixin, table=True):
    __tablename__ = "purchase"
    publication_id: UUID = Field(
        foreign_key="publication.id", ondelete="RESTRICT", nullable=False, index=True,
    )
    # Buyer is identified by email; the buyer may be unauthenticated.
    # When the buyer IS an authenticated Theourgia vault, owner_id
    # points at their user.
    buyer_email: str = Field(max_length=480, nullable=False)
    buyer_user_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    stripe_payment_intent_id: str = Field(max_length=64, nullable=False, unique=True)
    amount_cents: int = Field(nullable=False)
    currency: str = Field(default="usd", max_length=8)
    paid_at: datetime = Field(nullable=False)
    refunded_at: Optional[datetime] = Field(default=None)
    refund_reason: Optional[str] = Field(default=None, max_length=480)
    # Cryptographically signed, single-use download token.
    download_token: str = Field(max_length=128, nullable=False, unique=True)
    download_token_expires_at: datetime = Field(nullable=False)
    download_count: int = Field(default=0, nullable=False)
    download_count_limit: int = Field(default=5, nullable=False)  # generous default
```

**Endpoints:**

Stripe Connect (per-vault account onboarding):

- `POST /api/v1/stripe-connect/account` → creates a Connect standard account for the caller, returns the onboarding URL (Stripe Account Link).
- `GET /api/v1/stripe-connect/account` → returns the caller's account status (pending / active / restricted / rejected + capability flags).
- `POST /api/v1/stripe-connect/refresh` → returns a fresh onboarding URL for an incomplete account.
- `DELETE /api/v1/stripe-connect/account` → disconnects (Stripe's "deauthorize" call). Existing purchases remain; new checkouts are rejected until reconnected.

Checkout (the buyer's path):

- `POST /api/v1/publications/{id}/checkout` body `{ buyer_email }` → creates a Stripe Checkout session for the publication's one-time price under the publisher's Connect account. Returns the `checkout_url` (the route never embeds the Stripe form inline — H07 rule 17, money is sober + portal hand-off).
- `GET /api/v1/purchases/{purchase_id}/download` (Bearer token from the download_token) → streams the PDF + watermarks the footer with `buyer_email` when `Publication.watermark_enabled`.

Refunds (the H07 "refund portal hand-off" rule):

- `POST /api/v1/purchases/{purchase_id}/refund-link` → returns the Stripe Customer Portal URL for that purchase. **The route NEVER processes the refund inline.** This is the H07 "Manually refund (Stripe portal)" CTA contract.

Webhooks:

- `POST /api/v1/stripe/webhook` — receives `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`, `account.updated`. Idempotent via Stripe's `event_id`. Updates Purchase + StripeConnectAccount accordingly.

**Honesty rules:**

1. **Theourgia takes no cut.** The Stripe Checkout session uses `transfer_data.destination = publisher_account_id` with 100% of the price routed to the publisher; the application fee is hard-coded `0`. A test asserts the fee parameter is absent / zero on every checkout session created.
2. **Refunds via portal hand-off.** No `/refund` endpoint that calls Stripe's refund API directly. The route returns the portal URL only. (Per H07 surface contract: "Manually refund (Stripe portal)".)
3. **Watermarking is opt-in.** `Publication.watermark_enabled` defaults False (H07 Pricing surface). When ON, the download response watermarks the buyer's email in the PDF footer — a polite reminder, not DRM.
4. **Single-use download tokens with a generous limit.** `download_count_limit` defaults 5 (the buyer might have multiple devices). Tokens expire after 30 days; expired tokens return 410 Gone.
5. **DRM-free always.** The watermark IS the only post-sale tracking. No license-check call-home, no encrypted PDF, no per-device binding.
6. **Failed account state surfaces as `--warn` not `--danger`.** The H07 Subscribers surface flags failed payments via `--warn`; the StripeConnectAccount.onboarding_status enum surfaces "restricted" + "rejected" which the route emits as warn-category UI state (the surface owns the actual class).
7. **Buyer email is not auto-subscribed to anything.** The checkout doesn't add the buyer to newsletter subscribers. That's a separate B128 opt-in via the per-vault public page.

**Tests (≥ 30):** Account onboarding handshake (mocked Stripe) · webhook idempotency · 0% application fee invariant · refund-link hand-off (no direct refund call) · download token generation + single-use semantics + expiry · watermark toggle threading · purchase email collision (two purchases by the same email under the same publication produce two rows) · refund webhook flips refunded_at.

**DoD:**

- [ ] Models + migration 0049.
- [ ] Stripe wrapper isolated behind a Protocol so tests can substitute a fake.
- [ ] Webhook idempotency verified.
- [ ] 0% fee invariant test passes.
- [ ] No `/refund` endpoint that calls Stripe directly.
- [ ] Tests green.

---

## B128 — Subscription tiers + subscribers (double-opt-in + failed-payment)

**Files created:**

- `backend/theourgia/models/subscription_tier.py`
- `backend/theourgia/models/subscriber.py`
- `backend/alembic/versions/0050_phase10_subscriptions.py`
- `backend/theourgia/api/routers/v1/subscription_tiers.py`
- `backend/theourgia/api/routers/v1/subscribers.py`
- `backend/tests/test_subscriptions.py`

**Models:**

```python
class SubscriptionTier(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "subscription_tier"
    owner_id: UUID = Field(foreign_key="user.id", nullable=False, index=True)
    name: str = Field(max_length=80, nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    monthly_amount_cents: int = Field(ge=0, nullable=False)
    currency: str = Field(default="usd", max_length=8)
    # H07 SubscriptionTiers surface: disabled tiers fade to 0.55.
    enabled: bool = Field(default=True, nullable=False)
    # Primary tier highlighted in the rail.
    is_primary: bool = Field(default=False, nullable=False)
    # Stripe price id for the recurring subscription.
    stripe_price_id: Optional[str] = Field(default=None, max_length=64)


class SubscriberStatus(str, enum.Enum):
    """The H07 Subscribers surface table column."""
    PENDING_CONFIRMATION = "pending_confirmation"  # double-opt-in not yet completed
    ACTIVE = "active"
    FAILED_PAYMENT = "failed_payment"  # --warn, not --danger
    UNSUBSCRIBED = "unsubscribed"


class Subscriber(IDMixin, TimestampMixin, table=True):
    __tablename__ = "subscriber"
    owner_id: UUID = Field(foreign_key="user.id", nullable=False, index=True)  # the publisher
    email: str = Field(max_length=480, nullable=False)
    tier_id: Optional[UUID] = Field(default=None, foreign_key="subscription_tier.id")
    status: SubscriberStatus = Field(default=SubscriberStatus.PENDING_CONFIRMATION)
    # Double-opt-in confirmation token. Rotated per signup.
    confirmation_token: str = Field(max_length=128, nullable=False, unique=True)
    confirmed_at: Optional[datetime] = Field(default=None)
    unsubscribed_at: Optional[datetime] = Field(default=None)
    # Stripe subscription id (when tier_id is set).
    stripe_subscription_id: Optional[str] = Field(default=None, max_length=64, unique=True)
    # Last failed-payment timestamp.
    last_failed_payment_at: Optional[datetime] = Field(default=None)

    __table_args__ = (
        UniqueConstraint("owner_id", "email", name="uq_subscriber_owner_email"),
    )
```

**Endpoints:**

Tiers (publisher-owned):

- `GET /api/v1/subscription-tiers` → caller's tiers.
- `POST /api/v1/subscription-tiers` → new tier; creates a Stripe recurring price under the connected account.
- `PATCH /api/v1/subscription-tiers/{id}` → update name / description / enabled / is_primary. Amount is immutable (Stripe price ids don't change; to bump price, create a new tier and migrate subscribers).
- `DELETE /api/v1/subscription-tiers/{id}` → soft delete; existing subscribers keep their stripe_subscription_id but the tier UI grays out.

Subscribers (publisher-owned admin):

- `GET /api/v1/subscribers?status=&limit=100` → caller's subscribers.
- `POST /api/v1/subscribers/{id}/resend-confirmation` → re-issue the double-opt-in email (rate-limited 1/min).
- `DELETE /api/v1/subscribers/{id}` → flips status → UNSUBSCRIBED; row stays for audit.

Public subscribe (the buyer's path):

- `POST /api/v1/vaults/{vault_slug}/subscribe` body `{ email, tier_id? }` → creates a Subscriber row with `PENDING_CONFIRMATION` + sends the confirmation email. Returns the verbatim H07 acknowledgment payload.
- `POST /api/v1/subscribers/confirm` body `{ token }` → flips status → ACTIVE.
- `POST /api/v1/subscribers/unsubscribe` body `{ token }` → flips status → UNSUBSCRIBED (token here is a permanent unsubscribe token included in every newsletter).

**Honesty rules:**

1. **Double-opt-in is mandatory.** New subscribers are PENDING_CONFIRMATION; they receive an email with a confirmation token. The H07 Public Vault Page acknowledgment copy is verbatim: "Check your email to confirm — you're not subscribed until you click the link." The route NEVER auto-confirms.
2. **Failed payment is `--warn` not `--danger`.** When Stripe sends a `customer.subscription.deleted` or `invoice.payment_failed` webhook, the Subscriber's status flips to `FAILED_PAYMENT`. The H07 Subscribers surface renders this row in `--warn` ink; the API contract surfaces `last_failed_payment_at` as a timestamp the surface uses for "X days overdue" copy. Never red.
3. **Unsubscribe is one-click + sticky.** Once status → UNSUBSCRIBED, re-subscribing requires a fresh signup (the confirmation_token is rotated). Tested.
4. **Per-owner email uniqueness.** Two different publishers can have a subscriber with the same email; one publisher cannot have duplicate subscribers.
5. **Tier amount is immutable.** Stripe prices don't change in-place; to raise a tier price the publisher creates a new tier. The route rejects PATCH to `monthly_amount_cents` with a clear error pointing the publisher at the "new tier" affordance.

**Tests (≥ 28):** Tier CRUD + immutability of amount · Subscriber double-opt-in flow (token issued → email-stub captured → confirm → status flip) · Webhook flips status → FAILED_PAYMENT · Unsubscribe sticky · Per-owner email uniqueness · resend-confirmation rate limit (1/min).

**DoD:**

- [ ] Models + migration 0050.
- [ ] Routers registered.
- [ ] Webhook hooks added to B127's processor.
- [ ] Tests green.

---

## B129 — Newsletter issues + delivery pipeline

**Files created:**

- `backend/theourgia/models/newsletter_issue.py`
- `backend/alembic/versions/0051_phase10_newsletters.py`
- `backend/theourgia/api/routers/v1/newsletter_issues.py`
- `backend/theourgia/core/publishing/__init__.py`
- `backend/theourgia/core/publishing/delivery.py` (the delivery pipeline)
- `backend/tests/test_newsletter_issues.py`

**Newsletter issue model:**

```python
class NewsletterIssueStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    CANCELLED = "cancelled"


class NewsletterIssue(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "newsletter_issue"
    owner_id: UUID = Field(foreign_key="user.id", nullable=False, index=True)
    subject: str = Field(max_length=240, nullable=False)
    preview_text: Optional[str] = Field(default=None, max_length=480)
    # Tiptap JSON — same node set as Publication.body (H07 rule 13:
    # editor block parity).
    body: dict = Field(sa_column=Column(JSONB, nullable=False, server_default="{}"))
    status: NewsletterIssueStatus = Field(default=NewsletterIssueStatus.DRAFT)
    # Targeting: which tiers should receive it (null = all active
    # subscribers).
    targeted_tier_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    reply_to: Optional[str] = Field(default=None, max_length=480)
    # When status=SCHEDULED. The Celery beat picks it up at this time.
    scheduled_send_at: Optional[datetime] = Field(default=None)
    # When status=SENT — the delivery summary lives here.
    sent_at: Optional[datetime] = Field(default=None)
    recipient_count: int = Field(default=0, nullable=False)
    delivered_count: int = Field(default=0, nullable=False)
    bounced_count: int = Field(default=0, nullable=False)
```

**Endpoints:**

- `GET /api/v1/newsletter-issues?status=&limit=100`
- `POST /api/v1/newsletter-issues` body `{ subject, preview_text?, body, reply_to?, targeted_tier_ids? }` → new draft.
- `GET /api/v1/newsletter-issues/{id}`
- `PATCH /api/v1/newsletter-issues/{id}` — body / subject / targeting; only when status=DRAFT.
- `DELETE /api/v1/newsletter-issues/{id}` → soft delete; only when status=DRAFT.
- `POST /api/v1/newsletter-issues/{id}/preview` body `{ preview_email }` → sends a preview to a single address. No status change.
- `POST /api/v1/newsletter-issues/{id}/send-now` → status → SENDING, kicks off the Celery delivery task.
- `POST /api/v1/newsletter-issues/{id}/schedule` body `{ scheduled_send_at }` → status → SCHEDULED.
- `POST /api/v1/newsletter-issues/{id}/cancel` → only when SCHEDULED, flips to CANCELLED.

**Delivery pipeline:**

The pipeline is a Celery task `deliver_newsletter_issue(issue_id)` that:

1. Resolves the recipient set: caller's active Subscriber rows (status=ACTIVE) filtered by `targeted_tier_ids` (when non-empty).
2. Builds the per-recipient HTML + plaintext from the Tiptap JSON.
3. Includes a one-click unsubscribe token per recipient.
4. Sends in batches via the configured provider (SES / Postmark / Resend / Mailgun — Phase 01 substrate). The substrate is already in place; this batch wires the newsletter-specific copy + unsubscribe link generation.
5. Updates `delivered_count` + `bounced_count` as the provider's webhooks fire.

**Honesty rules:**

1. **Send-now confirm is `--warn-soft`, NEVER `--danger`.** The H07 Newsletter Editor surface contract — the confirm modal style is enforced surface-side; here the API just provides the endpoint. But the route's response shape includes a `confirmation_required: true` field to remind the surface this is a deliberate moment.
2. **Once sent, the issue is frozen.** Status → SENT means no more PATCH / DELETE. Recipient counts continue to update from webhooks.
3. **Preview never counts.** `/preview` doesn't touch the issue's status or recipient counts.
4. **Targeting is opt-in inclusion.** Empty `targeted_tier_ids` = ALL active subscribers (matches the H07 Editor's default). Non-empty = only those tiers' subscribers.
5. **Cancel is final.** A CANCELLED issue can be cloned to a fresh draft, but not re-enabled in place.

**Tests (≥ 25):** CRUD + DRAFT-only-edit · status lifecycle (each transition · valid + invalid) · recipient resolution from targeting · preview doesn't change state · cancel only from SCHEDULED · once-SENT immutability · unsubscribe token uniqueness.

**DoD:**

- [ ] Model + migration 0051.
- [ ] Router registered.
- [ ] Delivery pipeline + Celery task.
- [ ] Tests green.

---

## B130 — Public reader + per-vault public page + RSS/Atom/JSON Feed

**Files created:**

- `backend/theourgia/api/routers/v1/public_reader.py`
- `backend/theourgia/api/routers/v1/public_vault.py`
- `backend/theourgia/api/routers/v1/feeds.py`
- `backend/theourgia/core/publishing/rss.py` (RSS / Atom / JSON Feed serializers)
- `backend/tests/test_public_reader.py`
- `backend/tests/test_feeds.py`

**Endpoints (all public · no auth required):**

Reader (the H07 Reader surface):

- `GET /api/v1/reader/{vault_slug}/{publication_slug}` → publication payload for public consumption. For free publications: full body + chapters (when book). For paid: summary + first chapter + paywall flag. For subscriber-only: paywall flag with "Subscribe to read" CTA.
- `GET /api/v1/reader/{vault_slug}/{publication_slug}/chapter/{chapter_id}` → individual chapter (paywalled when paid + not purchased).

Per-vault public page (the H07 Public Vault Page surface):

- `GET /api/v1/vaults/{vault_slug}/public` → returns the publisher's display_name + pronouns + bio + links + license_label + the publications + newsletter info + tiers. Payload shape matches the H07 surface's `vault` / `publications` / `newsletter` / `tiers` props 1:1.

Feeds:

- `GET /vaults/{vault_slug}/feed.rss` → RSS 2.0 feed of LIVE publications.
- `GET /vaults/{vault_slug}/feed.atom` → Atom alternative.
- `GET /vaults/{vault_slug}/feed.json` → JSON Feed.
- `GET /newsletters/{vault_slug}/feed.rss` → newsletter issues RSS (status=SENT).

The feed URLs are unversioned (no `/api/v1/` prefix) so feed readers consume them like any RSS source.

**Honesty rules:**

1. **Sealed publications are NEVER public.** The Reader endpoint rejects when the publication or any of its referenced entries is sealed. (The publish lifecycle already prevents seal-embed at write-time, but the read-time check is the defence in depth.)
2. **Paywall is structural, not promotional.** The paywall response carries `paywall_kind: "purchase" | "subscribe"` + the buy / subscribe URL. No countdown timers, no "limited time" pressure, no recommended-products carousel.
3. **Withdrawn publications are 404.** A withdrawn publication's slug returns 404 from the Reader. The publisher's admin still sees the row (per B126).
4. **Per-vault public-page popular-sort is opt-in.** The publisher's `popular_sort_opt_in` flag (on User or per-publication settings) gates the response. Defaults OFF (matches the H07 surface contract).
5. **AGPLv3 + per-publication license verbatim in feeds.** Every feed item includes both the AGPLv3 footer credit AND the per-publication license slug in the `<rights>` / `rights` field.

**Tests (≥ 22):** Paywall responses per pricing model · sealed-publication 403 · withdrawn 404 · per-vault payload shape matches H07 contract · RSS validates against the spec · Atom validates · JSON Feed validates · feed includes license + AGPLv3 credit · popular-sort opt-in gating.

**DoD:**

- [ ] Three feed routers registered (unversioned).
- [ ] Reader + Public Vault routers registered.
- [ ] RSS/Atom/JSON Feed validators run in CI.
- [ ] Tests green.

---

## B131 — Phase 10 close-out

**Files modified:**

- `CHANGELOG.md` — "Phase 10 Publishing backend COMPLETE".
- `FEATURES.md` — Phase 10 row to ✅.
- `README.md` — Phase 10 row state + next-up.
- `plan/10-publishing-and-monetization.md` — DoD checked for the
  shipped subset.
- Memory: `project_phase_status.md` (test totals · alembic head),
  `project_resume_state.md` (commit history), new
  `project_phase_10_close.md`.

**Run:**

- Full backend test suite — confirm all green, ~2040 tests.
- Full frontend test suite — confirm all green (Cluster B surfaces
  should now produce live payloads via the wired endpoints; admin
  tsc clean).
- Visual + a11y — confirm green.
- Push.

**DoD:**

- [ ] All gates green.
- [ ] Docs reflect Phase 10 complete.
- [ ] Memory reflects the close + the next queue.

---

## What's NOT in Phase 10 backend (this plan)

- Network-level (hub) newsletters.
- Author-managed comments on publications.
- ActivityPub bridging of public posts.
- Federated author profiles.
- Stripe Tax automation.
- EPUB generation.
- Subdomain configuration per vault.

These have clear homes in Phases 12-15 (Federation · ActivityPub ·
Plugin Ecosystem · Hardening) and shouldn't be authored
speculatively now.

---

## Sequencing with the H07 Cluster B frontend (already shipped)

The 10 Cluster B surfaces already exist as presentational shells.
B126-B130 wires them through to live data:

| Surface | Wires to |
|---|---|
| Publications (4) | B126 list + lifecycle |
| Publication Editor (5) | B126 Tiptap body + chapters |
| Publication Settings (6) | B126 PATCH |
| Pricing & Distribution (7) | B127 Stripe Connect + watermark toggle |
| Reader (8) | B130 reader + B127 download tokens |
| Subscription Tiers (9) | B128 tiers CRUD |
| Subscribers (10) | B128 list + refund-link hand-off (B127) |
| Newsletter Editor (11) | B129 issues + send-now |
| Per-Vault Public Page (12) | B130 public payload + B128 subscribe |
| Print Preview (13) | (no backend; client-side) |
