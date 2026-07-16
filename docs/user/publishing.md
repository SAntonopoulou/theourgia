# Publishing and Monetization

The publishing tools let you release books, essays, and articles from
your vault — free or paid — plus newsletters for subscribers. Money, when
it changes hands, goes directly to you: Theourgia takes no cut, holds no
funds, and never uses sales pressure on your readers.

## Publications and their lifecycle

At `/publications`. A publication moves through four explicit states:

- **Draft** — visible only to you, editable freely.
- **Scheduled** — set to go live at a chosen time.
- **Live** — publicly readable.
- **Withdrawn** — taken down; public links return "not found."

State changes are deliberate actions (publish, schedule, withdraw,
republish) — never a side effect of an ordinary edit. Withdrawn
publications remain in your own list so your history stays visible to
you.

One hard rule: a publication that references a sealed entry cannot be
published. The vault refuses at publish time (and again at republish),
so sealed content can never leak through an embed.

## Writing and structure

Each publication opens in its editor at `/publications/{id}/edit`. Books
carry chapters, which you can add, edit, and reorder. Publication
settings — metadata, cover, license, comment opt-in — live at
`/publications/{id}/settings`. You pick a license per publication from
the bundled license choices.

## Pricing — Stripe Connect, zero platform fee

At `/publications/{id}/pricing`. Payments run through your own Stripe
account, connected via Stripe Connect: buyers pay you, and the money
lands in your Stripe balance. Theourgia's application fee is fixed at
zero percent — this is enforced in the code and guarded by tests, not
just promised.

Sealed publications cannot be checked out — a second line of defence on
top of the publish-time rule.

### Refunds

Refunds are handled in your Stripe customer portal. Theourgia hands you
the portal link and steps aside; there is deliberately no refund button
inside the vault, so the money path stays entirely between you, your
buyer, and Stripe.

## Downloads and watermarking

Everything you sell is DRM-free. Purchase downloads use single-use
tokens (valid 30 days, up to five downloads), and PDF downloads carry a
light diagonal watermark of the buyer's email — a gentle provenance
mark, not a lock. EPUB files are not watermarked, by design.

## Print-quality book PDF

From `/publications/{id}/print-preview` you can export a true
trade-paperback PDF: 6 by 9 inch trim, mirrored inner and outer margins,
title page, copyright page, and table of contents, chapters opening on
right-hand pages, running headers (publication title on the left page,
chapter title on the right), roman-numeral page numbers in the front
matter and arabic in the body. The license notice in the book reflects
the license you chose. The export is available only to you as the owner.

## Subscription tiers

At `/subscription-tiers`. A tier's monthly amount is immutable — once
created, the price cannot be edited, because a subscriber's agreement
should never change under them. To raise a price, create a new tier and
invite subscribers to move.

## Subscribers — double opt-in

At `/subscribers`. Nobody is subscribed by typing their address alone.
Signing up creates a pending record and sends a confirmation email; the
person is only subscribed after clicking the link. The signup
acknowledgment says exactly that: "Check your email to confirm — you're
not subscribed until you click the link."

Unsubscribes are sticky: once someone unsubscribes, only a fresh signup
of their own can bring them back. A failed payment is shown in a calm
warning tone, never as an alarm.

## Newsletters — sent means sent

At `/newsletter-editor`. An issue moves through draft, scheduled,
sending, and sent (or cancelled while still scheduled). You can preview
an issue by sending it to a single address without touching its status.
Sending for real asks you to confirm first — and once an issue is sent,
it is immutable: no edits, no deletion, because your subscribers'
inboxes already hold it. Every delivered issue carries that recipient's
own unsubscribe link.

## The public reader and the structural paywall

Readers reach your live publications without an account. When a
publication is paid or subscriber-only, the paywall is structural: the
reader sees what kind of gate it is (purchase or subscription) and a
link to proceed — and nothing else. No countdown timers, no
"limited time" banners, no view counts, no trending lists. The reading
surface handles HTML, PDF, and EPUB formats in the browser; gated files
stay behind the paywall exactly as the text does.

Your public vault page shows your publications without follower counts
or popularity mechanics.

## Feeds

Every vault publishes RSS 2.0, Atom 1.0, and JSON Feed 1.1 versions of
its public publications at stable addresses
(`/vaults/{id}/feed.rss`, `.atom`, `.json`) that never change with
software upgrades, so a subscription in any feed reader keeps working.
Each item carries the publication's license, alongside credit to the
AGPL-licensed software.

## Comments and moderation

Comments are off unless you switch them on per publication (or per blog
entry). Every comment starts as pending and is public only after you
approve it, from the queue at `/comments-moderation` — approve, reject,
or mark as spam, with an optional moderator note. A hidden honeypot
field catches most automated spam before you ever see it. Sealed or
private content never accepts comments, even if a setting is misconfigured.
