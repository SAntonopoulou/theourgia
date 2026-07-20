---
title: Status & roadmap
description: Theourgia is live and self-hostable. The seventeen-phase build is complete and in v1 close-out.
---

Theourgia is **live** at [theourgia.com](https://theourgia.com) and fully self-hostable today.

The platform was built in **17 architecturally-ordered phases**. Each phase was complete only when it met its Definition of Done — tests, docs, security review, and a migration story. All seventeen have landed; the project is now in **v1 close-out**: final hardening, accessibility and performance polish, and the documentation you are reading.

## Roadmap

| #  | Phase                                                                  | Status |
|----|------------------------------------------------------------------------|--------|
| 00 | Foundations (repo, CI, dev env, docs infra)                            | `[x]` |
| 01 | Core Architecture (DB, auth, plugins, encryption, backups, API)        | `[x]` |
| 02 | Frontend Foundations (Astro, React admin, Tiptap, modals, i18n)        | `[x]` |
| 03 | Time & Cosmos (calendars, astrology, planetary hours, election finder) | `[x]` |
| 04 | Journaling (entries, blog, library, body diagrams, quotes)             | `[x]` |
| 05 | Magical Beings (entities, offerings, oaths, lineage attestation)       | `[x]` |
| 06 | Divination & Practice (tarot, I Ching, geomancy, scrying, rituals)     | `[x]` |
| 07 | Workshop (sigils, talismans, magical circles, tool registry)           | `[x]` |
| 08 | Linguistic Tools (gematria, transliteration, voces magicae)            | `[x]` |
| 09 | Synchronicity & Analytics (scientific illuminism dashboards)           | `[x]` |
| 10 | Publishing & Monetization (books, Stripe, newsletters, blog)           | `[x]` |
| 11 | Media Library (images, audio, video, iCal feeds, pilgrimage map)       | `[x]` |
| 12 | Federation (native protocol, network hubs, group ritual, SSO)          | `[x]` |
| 13 | ActivityPub (Fediverse interop)                                        | `[x]` |
| 14 | Plugin Ecosystem (SDK, official registry, sandbox-before-commit)       | `[x]` |
| 15 | Hardening & Launch (GDPR audit, a11y, perf, security, ops, marketing)  | `[~]` |
| 16 | AI Agent Integration (daskalos-pattern daemon + MCP)                   | `[x]` |

**Legend:** `[ ]` planned · `[~]` in progress · `[x]` done

Phase 15 remains `[~]` because hardening is a standing discipline, not a one-time gate — the v1 close-out is where the accessibility sweeps, performance budgets, and security reviews get their final pass before the 1.0 tag.

## Where to read deeper

- **[Theourgia for practitioners](/user/)** — the user guide, by feature area
- **[Self-hosting & operations](/admin/)** — deployment, backups, disaster recovery, compliance
- **[Developer guides](/developer/)** — plugins, bundles, the federation protocol
- **[API reference](/reference/api/)** — the versioned HTTP API and its OpenAPI specification
- **[Feature catalog](/concepts/features/)** — ~200 features across 19 categories
- **[GitHub repository](https://github.com/SAntonopoulou/theourgia)** — source, plan, ADRs, and changelog

## Pace

The project was intentionally never in a rush. Quality, maintainability, and tradition-respectful depth were the priorities — not speed-to-MVP. From the project plan:

> "Theourgia is community infrastructure for practicing magicians. The success metric is **adoption by practitioners**, not revenue."

This page is updated as the close-out progresses toward the 1.0 tag.
