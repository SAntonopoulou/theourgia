<div align="center">

# Theourgia

**θεουργία** — *god-working*

A magickal journal CMS and full practitioner's toolkit.
Open source, self-hostable, federated. For working magicians.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Status: Active development](https://img.shields.io/badge/status-active_development_(Phase_07_frontend_shipped)-orange.svg)](#status)
[![Telemetry: Zero](https://img.shields.io/badge/telemetry-zero-brightgreen.svg)](#privacy)
[![Federated](https://img.shields.io/badge/federation-native_+_ActivityPub-purple.svg)](FEATURES.md#14-federation-networks--group-work)
[![Plugins](https://img.shields.io/badge/plugins-from_day_one-orange.svg)](FEATURES.md#17-plugin-ecosystem)

</div>

---

## Status

**Pre-alpha — Phases 00-07 frontend complete.** Foundations through Phase 07 are shipped end-to-end (backend complete through Phase 06; Phase 07 frontend ships ahead of its backend by design). Sprint trajectory:

- **H01-H03 sprint** (B50-B75) — Phases 03 · 04 · 05 frontend coverage end-to-end against existing backend.
- **H04 sprint** (B76-B86) — Daily Practice Tracker (Tier 1) + Phase 06 Divination & Practice cluster (Tier 2): Tarot · I Ching · Geomancy · Runes · Pendulum/Bibliomancy/Horary/Scrying · Practice Logs.
- **H05 sprint** (B89-B96) — Phase 07 Workshop (Tier 3): Sigil Generator (11 modes, sandboxed parametric formula) · Magic Squares (7 Agrippa planetary kamea + custom builder) · Talisman Designer (composite name-rings + kamea embeds + sealed save) · Magical Circle (1-6 rings · single-tradition compass · print-tile mode) · Tool Registry (14 kinds + altars) · Voces Magicae Recorder (PD source citation required).

As of close: **1722 vitest tests · 557/557 visual · 271/557 a11y · 1473 backend tests** (a11y gate restored 2026-06-23 in B101 after discovering it was rendering "No Preview" stubs for every story; 286 real WCAG violations now visible, remediation in B102+).

Phase 07 frontend is complete; its backend (Alembic models + `/api/v1/sigils|magic-squares|talismans|circles|tools|altars|voces` + Mode B encryption for sealed talismans) is queued. **Batch 35 wave 1 (B97)** also landed alongside the H05 close: live Tiptap 3 editor + 6 custom block nodes (`ritualLog` · `quoteCitation` · `gematria` · `sensation` · `entityRef` · `sigil`) wired into `frontend/admin/src/routes/Editor.tsx` with full JSON round-trip. Chart + Divination nodes + pickers + persistence to `/api/v1/entries` are queued in B98/B99. The next sprint depends on a designer pass for **Linguistic Tools** (Phase 08) and **Analytics** (Phase 09). The H05 handoff request that just shipped lives at [docs/design-requests/2026-06-22-h05-workshop.md](docs/design-requests/2026-06-22-h05-workshop.md); the broader pipeline is at [docs/design-requests/2026-06-22-post-h01-h03-pipeline.md](docs/design-requests/2026-06-22-post-h01-h03-pipeline.md).

For the canonical feature catalog, see **[FEATURES.md](FEATURES.md)** — the "Phase Status Snapshot" table at the top tracks sprint progress per-batch. For the full plan and phase index, see **[PROJECT_PLAN.md](PROJECT_PLAN.md)**.

## What this is

Theourgia is community infrastructure for practicing magicians across many traditions — Thelemites, chaos magicians, Greek theurgists, witches, Hermeticists, ceremonialists, folk practitioners, and adjacent paths. It treats magical practice as praxis worth recording rigorously, and treats data sovereignty as sacred.

### The vision in one breath

> A practitioner's environment where calendars know their tradition, divinations record themselves with context, entities are tracked across the workings done in their name, sigils generate from intention, networks of magicians can share systems and rituals without surrendering ownership, the data is yours and stays yours, and your record can outlive you on terms you set.

### Feature areas

| Area | Highlights |
|---|---|
| **Time & Cosmos** | Multi-calendar overlays, multi-tradition astrology (Western / Hellenistic / Vedic), planetary hours, election finder |
| **Journal & Authoring** | Tiptap editor with magickal blocks, drag-drop templates, body sensation diagrams, audio attachments, inline foreign-script support, blog platform, time-released content |
| **Magical Beings** | Entities with alias-graph merging, offerings ledger, contracts, oaths (sealed), initiations (sealed), ancestors, servitors, lineage attestation + counter-signing |
| **Divination** | Tarot (custom decks supported), I Ching, geomancy, runes, scrying (with trance mode), pendulum, bibliomancy, horary |
| **Workshop** | Sigil generator (Spare, Kamea, Rose Cross, harmonograph, formula-driven), magic squares, talisman designer, magical circle builder, tool registry |
| **Linguistic** | Multi-cipher gematria, cross-journal gematria search, transliteration, voces magicae library, pronunciation guides |
| **Analytics** | Scientific illuminism — multi-axis tagging, query builder, visualizations, opt-in cross-magician aggregates |
| **Sharing** | Magickal Bundle Format (MBF) — pantheons, traditions, rituals, decks, sigil libraries, all shareable piecemeal or as full systems |
| **Publishing** | Self-published books via Stripe Connect, paid newsletters, print-quality typography, RSS / Atom |
| **Federation** | Native protocol + ActivityPub bridge; networks for orders, covens, sodalities; group ritual coordinator |
| **Security** | User-choice encryption (server-side or zero-knowledge), GDPR-compliant, multi-identity, audit log, closed-tradition flags |
| **AI Integration** | Opt-in per-purpose Claude agents via daskalos-pattern (daemon + MCP); user brings own keys; never required |
| **Plugins** | Full SDK from day one; official Theourgia registry; sandbox-before-commit |

See **[FEATURES.md](FEATURES.md)** for the complete catalog (~200 features across 19 categories).

## Roadmap

Theourgia is built in 17 phases. Each phase is architecturally dependent on prior phases (not feature-priority-ordered). A phase is **done** when its Definition of Done in the corresponding plan is met, including tests, docs, and security review.

| Phase | Title | Status | Plan |
|---|---|---|---|
| 00 | Foundations (repo, CI, dev env, docs infra) | `[x]` | [plan/00-foundations.md](plan/00-foundations.md) |
| 01 | Core Architecture (DB, auth, plugins, encryption, backups) | `[x]` | [plan/01-core-architecture.md](plan/01-core-architecture.md) |
| 02 | Frontend Foundations (Astro, React admin, Tiptap, modals, i18n) | `[x]` (full design-fidelity port; PWA; Storybook + axe-core gate) | [plan/02-frontend-foundations.md](plan/02-frontend-foundations.md) |
| 03 | Time & Cosmos (calendars, astrology, planetary hours, election finder) | `[x]` (Swiss Ephemeris + Hebrew/Hijri/Mayan/Egyptian/Julian + Liber Resh; H01 frontend primitives B56-B60) | [plan/03-time-and-cosmos.md](plan/03-time-and-cosmos.md) |
| 04 | Journaling (entries, blog, library, body diagrams, quotes) | `[x]` (**Batch 35 CLOSED**: B97-B99c3 Tiptap live editor · 8 custom block nodes · 9 slash commands · 3 picker modals · auto-save · visibility chip + sealed toggle · Publish CTA) | [plan/04-journaling.md](plan/04-journaling.md) |
| 05 | Magical Beings (entities, offerings, oaths, lineage attestation) | `[x]` (backend ✓; **H03 frontend primitives + Today ledger complete B67-B75**) | [plan/05-magical-beings.md](plan/05-magical-beings.md) |
| 06 | Divination & Practice (tarot, I Ching, geomancy, scrying, rituals) | `[x]` (backend ✓; **H04 frontend complete B76-B86** — 5 oracle surfaces · Daily Practice Tracker · Practice Logs · OracleTabs nav) | [plan/06-divination-and-practice.md](plan/06-divination-and-practice.md) |
| 07 | Workshop (sigils, talismans, magical circles, tool registry) | `[~]` 🎨 H05 frontend ✓ (B89-B96) · backend pending | [plan/07-workshop.md](plan/07-workshop.md) |
| 08 | Linguistic Tools (gematria, transliteration, voces magicae) | `[ ]` | [plan/08-linguistic-tools.md](plan/08-linguistic-tools.md) |
| 09 | Synchronicity & Analytics (scientific illuminism dashboards) | `[ ]` | [plan/09-synchronicity-and-analytics.md](plan/09-synchronicity-and-analytics.md) |
| 10 | Publishing & Monetization (books, Stripe, newsletters, blog) | `[ ]` | [plan/10-publishing-and-monetization.md](plan/10-publishing-and-monetization.md) |
| 11 | Media Library (images, audio, video, iCal feeds, pilgrimage map) | `[ ]` | [plan/11-media-library.md](plan/11-media-library.md) |
| 12 | Federation (native protocol, network hubs, group ritual, SSO) | `[ ]` | [plan/12-federation.md](plan/12-federation.md) |
| 13 | ActivityPub (Fediverse interop) | `[ ]` | [plan/13-activitypub.md](plan/13-activitypub.md) |
| 14 | Plugin Ecosystem (SDK, official registry, sandbox-before-commit) | `[ ]` | [plan/14-plugin-ecosystem.md](plan/14-plugin-ecosystem.md) |
| 15 | Hardening & Launch (GDPR audit, a11y, performance, security, ops) | `[ ]` | [plan/15-hardening-and-launch.md](plan/15-hardening-and-launch.md) |
| 16 | AI Agent Integration (daskalos-pattern daemon + MCP) | `[ ]` | [plan/16-ai-agent-integration.md](plan/16-ai-agent-integration.md) |

**Legend:** `[ ]` planned · `[~]` in progress · `[x]` done

This README is updated continuously as phases progress. The roadmap reflects the current state of work, not a snapshot at any point in time.

## Tech stack

<table>
<tr>
<td><b>Backend</b></td>
<td>

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-modern_async-009688?logo=fastapi&logoColor=white)
![SQLModel](https://img.shields.io/badge/SQLModel-Pydantic_+_SQLAlchemy-336791)
![Alembic](https://img.shields.io/badge/Alembic-migrations-336791)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7+-DC382D?logo=redis&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-background_jobs-37814A)

</td>
</tr>
<tr>
<td><b>Astrology / Crypto</b></td>
<td>

![Swiss Ephemeris](https://img.shields.io/badge/Swiss_Ephemeris-arcsecond_precision-8E44AD)
![pgvector](https://img.shields.io/badge/pgvector-semantic_search-336791)
![libsodium](https://img.shields.io/badge/libsodium-encryption-0066CC)
![cryptography](https://img.shields.io/badge/cryptography-AES--256_+_Ed25519-0066CC)

</td>
</tr>
<tr>
<td><b>Frontend</b></td>
<td>

![Astro](https://img.shields.io/badge/Astro-6-FF5D01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tiptap](https://img.shields.io/badge/Tiptap-extensible_editor-7B68EE)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3_(PostCSS)-06B6D4?logo=tailwindcss&logoColor=white)
![TanStack](https://img.shields.io/badge/TanStack-Router_+_Query-FF4154)

</td>
</tr>
<tr>
<td><b>Infrastructure</b></td>
<td>

![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)
![Caddy](https://img.shields.io/badge/Caddy-2-1F88C0?logo=caddy&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-DNS_+_R2-F38020?logo=cloudflare&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)

</td>
</tr>
<tr>
<td><b>Standards</b></td>
<td>

![ActivityPub](https://img.shields.io/badge/ActivityPub-Fediverse-F1007E)
![WCAG 2.2 AA](https://img.shields.io/badge/WCAG_2.2-AA_target-0F4C81)
![SemVer](https://img.shields.io/badge/SemVer-2.0-3F4551)
![Conventional Commits](https://img.shields.io/badge/Conventional_Commits-1.0.0-FE5196)

</td>
</tr>
</table>

Full architectural rationale and choices: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Privacy

**Zero telemetry. Ever.** Theourgia does not phone home. No analytics scripts ship. No usage tracking. No "anonymous" data collection. This is a hard guarantee, verified by automated test in CI.

Your practice is yours. The platform helps you record it; it does not surveil it.

Further guarantees and the security model are described in **[ARCHITECTURE.md §5](ARCHITECTURE.md)** and **[SECURITY.md](SECURITY.md)**.

## Design principles

1. **Practitioner-grade depth.** No surface-level "spirituality app" features.
2. **Data sovereignty.** Self-hosted, local-first, user-controlled encryption.
3. **Quality over speed.** No MVP rush. Plan, build, test, document.
4. **Extensible by design.** Plugin architecture from day one.
5. **Security as foundation.** Encryption, auth, and threat modeling are first-class.
6. **Tradition-respectful.** No flattening of distinct practices.
7. **Documentation is product.** Self-hosters and contributors are first-class users.
8. **Premium feel.** Custom modal systems only; never native browser alerts.

## Getting started

Self-hosting instructions land with Phase 00 (Foundations). For now, this section is a placeholder.

When ready, getting Theourgia running will be approximately:

```bash
# (not yet functional — placeholder)
curl -fsSL https://install.theourgia.com | bash
cd theourgia
just dev          # local development
# or
just deploy       # production deploy with backups + monitoring
```

The installation is designed for non-technical magicians as well as developers. One-command deploys, web-based first-run wizard, one-click migrations with preview, one-click rollback.

## Project structure

```
theourgia/
├── README.md              ← this file
├── PROJECT_PLAN.md        ← vision, scope, phase index
├── ARCHITECTURE.md        ← system design, trust model, tech choices
├── FEATURES.md            ← canonical feature catalog (all ~200 features)
├── CHANGELOG.md           ← keep-a-changelog format
├── CODE_OF_CONDUCT.md     ← Contributor Covenant + divergent-practice addendum
├── CONTRIBUTING.md        ← how to land changes
├── SECURITY.md            ← vulnerability disclosure
├── LICENSE                ← AGPL-3.0
├── plan/                  ← per-phase implementation plans (00–16)
├── docs/                  ← will hold user/admin/developer documentation
├── backend/               ← Python 3.12 + FastAPI + SQLModel + Alembic + Celery (1439 tests)
├── frontend/              ← React 19 admin SPA · Astro 6 public site · shared design system
├── docs/                  ← Starlight docs site (theourgia tokens bridged onto Starlight)
└── plugins/               ← will hold reference plugins (Phase 14+)
```

## Contributing

The most valuable contributions during planning phase are reading the plans, reacting to them, and tradition-specific feedback. Once code lands, full contribution workflow opens. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for current ways to help.

All contributors are bound by the **[Code of Conduct](CODE_OF_CONDUCT.md)**, which includes an explicit clause about respect for divergent magickal practice — *"we cannot become a centre of pestilence"*.

## Community

- **Code of Conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **Security**: [SECURITY.md](SECURITY.md) — private vulnerability disclosure via GitHub security advisories
- **License**: [AGPL-3.0](LICENSE) — free forever
- **Issues**: [GitHub Issues](https://github.com/SAntonopoulou/theourgia/issues) — for planning feedback and tradition-specific corrections
- **Discussions**: GitHub Discussions (enabled once code lands)
- **Fediverse / Matrix / forum**: established at Phase 15 launch

## About the creator

Theourgia was conceived and is being built by **Soror Ευ. Α.** ([@SAntonopoulou on GitHub](https://github.com/SAntonopoulou)) — a practicing magician across Thelemic (OTO), chaos magickal, Greek theurgic, and eclectic witchcraft paths. The project comes from her own need for tools that take magickal practice seriously — record-keeping deep enough for serious work, infrastructure sovereign enough to actually trust, design respectful enough to honor many traditions at once.

The intent is community infrastructure, not a product. The license guarantees that intent forever.

If you find Theourgia useful when it ships, that's the purpose. If you want to help shape it before then, see [CONTRIBUTING.md](CONTRIBUTING.md). Magicians of every tradition welcome.

## License

[AGPL-3.0](LICENSE). Free forever. This is community infrastructure, not a product.
