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

- [ ] End-to-end purchase: vault owner uploads PDF, sets price, buyer purchases via Stripe, receives download link
- [ ] EPUB and PDF readers display sample books cleanly
- [ ] Newsletter compose, schedule, send, deliver to a real address
- [ ] Network newsletter pulls from multiple member vaults' publishable content
- [ ] RSS feeds validate against `validator.w3.org/feed`
- [ ] Comments moderation queue functional
- [ ] Per-vault public page customization works
- [ ] Sales dashboard accurate against Stripe ledger
- [ ] Stripe webhook delivery and idempotency verified
- [ ] Self-host SMTP and managed-service paths both documented
