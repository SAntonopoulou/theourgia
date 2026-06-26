# Phase 10 — Publishing & Monetization

> Books, articles, newsletters, comments, RSS. The author's surface — what gets to the world and how. Stripe integration for self-publishers selling their own work directly. Networks running newsletters curated from member contributions.

## Goal

Let magicians publish their own work — books, essays, newsletters — under their own brand, on their own terms, with their own Stripe account taking payment. Let networks publish curated newsletters from member contributions. Make the public face of every vault a thing the magician is proud of.

## Dependencies

- Phase 00–04 (foundations through journaling)
- Phase 02 (Astro public site) — the publishing surface

## Deliverables

### 1. Publication data model
- `publication` table: id, vault_id (or hub_id for network publications), kind (book, essay, post, page), title, slug, authors (m2m), summary, body (Tiptap JSON or PDF file ref), cover_image, publication_date, language, license (per-publication: CC, all rights reserved, public domain), price, currency, stripe_product_id, free_download_url (if not paid), pdf_url, epub_url
- `purchase` table: id, publication_id, buyer (email + optional vault_id), stripe_payment_intent_id, amount, currency, paid_at, download_token, download_token_expires_at, download_count
- Per-vault catalog page (the vault owner's "books" surface)

### 2. Book / PDF / EPUB delivery
- In-browser PDF viewer (using PDF.js or similar) for previews and reading
- EPUB reader (online + downloadable; epub.js)
- Downloadable archives with cryptographically signed, single-use download tokens
- DRM-free always (philosophical alignment with project ethos)
- Optional watermarking with buyer email on PDF (visible footer; not "DRM," just a polite reminder)

### 3. Stripe integration
- Per-vault Stripe account connection (Stripe Connect: standard accounts)
- Each magician's sales go to their own Stripe account; Theourgia takes no cut
- Products, prices, checkout sessions managed via Stripe API
- Webhooks for payment confirmation; on success, mint download token, email the buyer
- Refund and dispute handling
- Tax handling: Stripe Tax integration (user opts in if they need it)
- Customer portal links for buyers to manage subscriptions / refunds
- Sales dashboard for the vault owner
- Reference implementation uses Stripe Projects best practices (per the stripe-best-practices guidance)

### 4. Newsletter system
- `newsletter` table: id, vault_id (or hub_id), name, description, slug
- `newsletter_issue` table: id, newsletter_id, title, body (Tiptap or markdown), published_at, scheduled_for, status
- `subscription` table: id, newsletter_id, subscriber_email, subscribed_at, confirmation_token, confirmed_at, unsubscribed_at, double-opt-in confirmed
- Composer UI: write an issue, schedule it, preview as recipients will see it
- Issue can pull content from existing publications and entries (one-click "include this entry")
- Network newsletters (hub-scoped): hub admin selects publication-marked entries from member vaults; composes weekly/monthly digest; sends to network subscribers
- Delivery via:
  - Direct SMTP (for self-hosters with their own mail server)
  - Postmark / Amazon SES / Resend / Mailgun (configurable via plugin)
  - Self-host friendly: deliverability advice in docs
- Recipient handling: bounces tracked, unsubscribes honored, list hygiene
- RSS feed of newsletter issues
- Per-subscriber web archive (subscribers can read past issues)

### 5. RSS / Atom / JSON Feed
- Per-vault RSS for public entries
- Per-vault Atom alternative
- Per-vault JSON Feed for modern clients
- Per-hub RSS for network's public stream
- Per-newsletter RSS for subscribers who prefer feed readers over email
- Auto-discovery `<link rel="alternate">` on relevant pages

### 6. Comments (moderation included)
- Per-publication comment threads (opt-in per publication)
- Identity options: anonymous (with name/email), federated (Theourgia user from another instance), GitHub login (for documentation comments), email-only
- Moderation queue: hub or vault admin reviews before publication
- Spam filtering: Akismet-compatible plugin slot; default rules + rate-limiting
- Comment threading (depth-limited)
- "Disable comments on this publication" toggle

### 7. Per-vault public face
- Each vault has a public page at a configurable path (subdomain optional, requires extra DNS work — defer subdomain config to Phase 15)
- Customizable: homepage layout, sections (latest entries, books, newsletter signup, about), theming within design-system constraints
- Author bio, social links, links to other Theourgia networks they're part of
- About page, contact page, "Magickal Record (public excerpts)" page

### 8. Frontend
- Astro renders all public-facing publication, newsletter, RSS, and per-vault pages
- React admin includes:
  - Publication editor (PDF/EPUB upload, metadata, pricing, distribution)
  - Stripe configuration
  - Sales dashboard
  - Newsletter composer
  - Subscriber list manager
  - Comment moderation queue

### 9. APIs
- `GET/POST/PATCH/DELETE /api/v1/publications`
- `POST /api/v1/publications/:id/purchase` — initiates Stripe checkout
- `GET /api/v1/publications/:id/download` — token-gated
- Stripe webhook endpoint
- `GET/POST /api/v1/newsletters`, `GET/POST /api/v1/newsletters/:id/issues`
- `POST /api/v1/newsletters/:id/subscribe`, `POST /api/v1/newsletters/:id/confirm`, `POST /api/v1/newsletters/:id/unsubscribe`
- `GET/POST /api/v1/publications/:id/comments`
- `GET/POST /api/v1/subscriptions` — Stripe-backed recurring billing
- `POST /api/v1/subscriptions/:id/cancel`, `POST /api/v1/subscriptions/:id/portal-link`

### 10. Subscription billing (recurring)
- **Stripe Connect recurring products + prices** — magicians offer paid newsletters and patron tiers
- **Per-newsletter subscription tier configuration** — free, single paid, multi-tier
- **Subscriber portal links** — for managing subscription, updating payment method, cancellation
- **Stripe webhook integration** for the full subscription lifecycle (active, past_due, canceled, etc.)
- **Renewal notifications + dunning** — automatic Stripe-handled retries; failure surface in admin
- **Subscriber-only vs. free-tier issues** — clearly distinguished in newsletter composer; access enforced at delivery + web archive
- **Stripe Tax integration** (opt-in) for VAT / sales tax handling

### 11. Print-quality typography (book-grade)
- **True print-grade PDF** — bleed, crop marks, embedded fonts, proper imposition
- **Typography**: drop caps, true small caps, ligatures, oldstyle figures, proper kerning, hanging punctuation
- **Footnotes + endnotes** with chapter-scoped numbering and proper layout
- **Auto-generated index** (with `<index-key>` markers in source content)
- **Auto-generated glossary** (with `<glossary-term>` markers in source content)
- **Auto-generated table of contents**
- **Multi-language typesetting** — preserves polytonic Greek, Hebrew with niqud, etc.
- **Print-on-demand format specs** — Lulu, BookBaby, IngramSpark specifications supported
- Implementation: a typesetting layer (likely LuaTeX or weasyprint with significant CSS) that compiles the structured entry content into book-grade PDF

### 12. Blog platform integration (Phase 04 §13)
- The blog data layer lives in [plan/04-journaling.md](04-journaling.md) §13
- This phase provides the **publishing surface**: blog homepage, post pages, RSS, comment moderation
- Per-vault blog at vault's public root path or configurable subdomain
- Blog can also be a hub-published blog (network publishes curated posts from member contributions)

## Design notes

- Stripe Connect with standard accounts means buyers see the magician's brand on receipts and bank statements, not Theourgia's. This is the right model.
- Email deliverability is genuinely hard. Strong documentation on SPF/DKIM/DMARC; reasonable defaults for the hosted reference setup.
- Newsletter composition should make it easy to pull from existing journal entries with `publishable` visibility flag.
- Comments are an optional feature. Many magicians won't enable them. That's fine.

## Risks

- **Risk:** Stripe Connect onboarding friction for small sellers. **Mitigation:** Clear documentation; possibly a "Stripe Express" alternative for ultra-light onboarding.
- **Risk:** Email deliverability hurts newsletter authors. **Mitigation:** Plugin slots for managed services; documentation on best practices.
- **Risk:** PDF watermarking misperceived as DRM. **Mitigation:** Make watermarking opt-in per publication; document the philosophy.

## Definition of Done

Status as of 2026-06-26 (B126 → B131 closed). DoD items shipped this
phase are checked; deferred items are scoped to the phase they actually
land in.

- [x] End-to-end purchase: vault owner uploads PDF, sets price, buyer
      purchases via Stripe, receives download link — B126 (lifecycle)
      + B127 (Connect + checkout + signed download tokens).
- [ ] EPUB and PDF readers display sample books cleanly — EPUB explicitly
      out of scope for this phase (see CHANGELOG). PDF is handled via
      the signed download link.
- [x] Newsletter compose, schedule, send, deliver to a real address —
      B129 (5-state lifecycle + Tiptap → HTML/plaintext + per-recipient
      unsubscribe URL).
- [ ] Network newsletter pulls from multiple member vaults' publishable
      content — deferred to Phase 12 (federation).
- [x] RSS feeds validate (XML 2.0 well-formed; Atom namespace correct;
      JSON Feed 1.1) — B130 has tests for all three formats.
- [ ] Comments moderation queue functional — deferred to Phase 14
      (plugin ecosystem) per scope decision.
- [x] Per-vault public page works — B130 (`GET /api/v1/vaults/{id}/public`
      matches the H07 Public Vault Page surface payload 1:1).
- [x] Sales dashboard accurate against Stripe ledger — B127 (`/sales`
      endpoint reads from the local Purchase table which is the
      idempotent webhook projection of Stripe's ledger).
- [x] Stripe webhook delivery and idempotency verified — B127
      (signature verified; idempotent on `stripe_payment_intent_id`
      unique constraint).
- [ ] Self-host SMTP and managed-service paths both documented — defer
      to Phase 15 hardening; the Phase 01 email substrate handles the
      actual send.

Additional honesty invariants pinned this phase:

- [x] **0% application fee on every Stripe checkout session** —
      source-level CI invariant in `test_billing_invariants.py`.
- [x] **No `/refund` POST endpoint anywhere in any router** — CI walks
      every registered route and asserts.
- [x] **Sealed publications NEVER public** — defence in depth at
      publish-time (B126) + checkout-time (B127) + read-time (B130).
- [x] **Paywall is STRUCTURAL** — closed Literal `paywall_kind` +
      URLs only; ReaderResponse schema test enumerates banned
      promotional field names.
- [x] **PublicVault payload carries no view_count / trending /
      subscriber_count** — anti-gamification CI invariant.
- [x] **Tier amount IMMUTABLE** — TierUpdate schema omits the price
      fields.
- [x] **Double-opt-in mandatory** — Subscriber default state +
      verbatim acknowledgment copy.
- [x] **Failed-payment is `--warn`, never `--danger`** — own enum state.
- [x] **Once-sent newsletter immutability** — non-DRAFT PATCH/DELETE
      rejected.
- [x] **Per-recipient unsubscribe URL in every render** — HTML +
      plaintext footers.
- [x] **Feed items carry AGPLv3 credit + per-publication license** —
      RSS `<dc:rights>` + Atom `<rights>` + JSON Feed `_theourgia.rights`.
- [x] **Feeds unversioned** — mounted on `app`, not `/api/v1`.
