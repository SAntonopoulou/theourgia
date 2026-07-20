---
title: Privacy
description: Theourgia ships zero telemetry. Ever. This page explains what we do and do not collect.
---

## Zero telemetry. Ever.

Theourgia does not phone home. No analytics scripts ship. No usage tracking. No "anonymous" data collection.

This is a hard guarantee, verified by an automated test in CI: any change that introduces an unauthorized outbound network call would fail the build.

## What this means specifically

When you run Theourgia (self-hosted or on theourgia.com), the platform does not:

- Send any usage metrics to any third party, ever
- Include third-party analytics scripts (Google Analytics, Plausible, Fathom, Posthog, etc.) by default
- Track which pages you visit, which features you use, or how long you stay
- Generate "anonymous" usage IDs and report them anywhere
- Include opt-in telemetry (we don't even offer it — it would be a slippery slope)

The only outbound network calls Theourgia makes are explicitly user-initiated:

- **Federation messages** to other Theourgia instances you have networked with
- **ActivityPub messages** to instances you have public-broadcast subscriptions with
- **Stripe API calls** when a user makes a purchase (and only between the user's Stripe account and Stripe)
- **Email delivery** when you send a newsletter or notification
- **Cloudflare R2** (or your chosen backup target) when scheduled backups run
- **Cloudflare DNS API** for TLS certificate renewal (DNS-01 challenge)
- **Anthropic API** if and only if you have opted into the AI agent integration (Phase 16)

If we ever add a new outbound destination, it is documented and gated behind explicit user action.

## What happens to your magickal record

Your journal, your entities, your divinations, your sigils, your rituals — all of it lives on the server you chose. If you self-host, that is your server. If you use the hosted theourgia.com, that is our server, and you can export everything and leave at any time.

The platform offers two encryption modes per content item:

- **Server-side at rest** — encrypted in the database; the server has the keys; supports full-text search
- **Zero-knowledge client-side** — encrypted in your browser; the server has only ciphertext; even the server operator cannot read your content. Used for `initiation` records, `oath` ledger entries, and anything you explicitly mark `sealed`.

See [Architecture §5](https://github.com/SAntonopoulou/theourgia/blob/main/ARCHITECTURE.md) for the full trust model.

## GDPR

Theourgia is GDPR-compliant by design for self-hosted use:

- **Right to access** — one-click export of all your data
- **Right to erasure** — full deletion (with documented limits for federated content that has propagated to other parties' sovereignty)
- **Data portability** — exports in standard JSON / MBF format
- **Privacy by design** — minimal collection, encryption at rest, no third-party trackers

For network hub operators, the project provides DPIA templates and breach-notification runbooks to support their own GDPR posture.

## Cookies

The platform sets minimal session cookies for authenticated users. No third-party cookies are set. No tracking pixels. No fingerprinting.

A cookie *notice* is shown on public surfaces. Because the only cookie is the essential first-party session cookie, there is nothing to accept or reject — the notice simply states what the one cookie is and links here.
