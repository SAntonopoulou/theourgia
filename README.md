<div align="center">

# Theourgia

**θεουργία** — *god-working*

A magickal journal CMS and full practitioner's toolkit.
Open source, self-hostable, federated. For working magicians.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Status: Active development](https://img.shields.io/badge/status-active_development_(Phase_11_complete)-orange.svg)](#status)
[![Telemetry: Zero](https://img.shields.io/badge/telemetry-zero-brightgreen.svg)](#privacy)
[![Federated](https://img.shields.io/badge/federation-native_+_ActivityPub-purple.svg)](FEATURES.md#14-federation-networks--group-work)
[![Plugins](https://img.shields.io/badge/plugins-from_day_one-orange.svg)](FEATURES.md#17-plugin-ecosystem)

</div>

---


## Status

**Pre-alpha.** Phases 00-11 end-to-end on both frontend and backend. Phase 12 (Federation) single-vault backend complete + frontend done; cross-instance transport (Phase 12.5) substrate landed behind a feature gate (RFC 9421 + Ed25519 + WebFinger + replay-nonce store + threat model). Phase 13 (ActivityPub) frontend complete + persistence stubbed + WebFinger live; outbound POST + inbox queued. **Phase 14 (Plugin Ecosystem) frontend + backend lifecycle routes complete.** H10 design handoff opened (27 surfaces · rules 41-60) — closes the design queue.

| | |
|---|---|
| **Latest commit** | `d580f50` (a11y sweep 2fy→2gc: 22/22 modals Escape·12 focus-on-open·5 tablists arrow-nav·68 surfaces single-main·prefers-reduced-motion) |
| **Production** | **🟢 LIVE at https://theourgia.com** (deployed 2026-06-28; 8 prod containers, isolated compose project) |
| **vitest** | 2924 passing · admin tsc clean · **zero `as any` casts · zero `@ts-ignore`** |
| **backend** | **2587+ passing** · alembic head **0066** — `/api/v1/agents/*` daemon bridge + `/api/v1/federation/inbox` + `/users/{handle}` AP actor + outbox + collections + `/api/v1/registry/*` author + maintainer signed bridges + `/api/v1/auth/webauthn/*` ceremony endpoints |
| **agent-daemon** | **198 passing** · alembic head **0002** — MCP + JSON-RPC + SSE + launcher + subprocess runner + cost-cap hard halt + audit emission · DB-backed (sinks + repos) · bwrap filesystem sandbox (rule 59 enforced) · install lifecycle CRUD · memory dir read/write with rule-59 path-safety |
| **registry** | 34 passing · alembic head **0001** — DID + Ed25519 auth · author submission lifecycle · maintainer queue/decide/promote · advisory filing |
| **Phase 12.5** | federation inbox + delivery worker (retry queue with 60s→24h backoff · DEAD after 6 attempts · Celery beat every minute) |
| **Phase 13** | ActivityPub bridge — actor JSON-LD · per-actor inbox + outbox · followers (count-private) · following (always-empty by design) · privacy-gated 404 when transport disabled |
| **H10 surfaces wired live** | **26 of 27** — Cluster A 8/8 ✓ · Cluster B 6/7 (B5 is federation-key rotation; WebAuthn credentials live at /settings/webauthn) · Cluster C 12/12 ✓ |
| **WebAuthn ceremony** | ✅ **LIVE in prod** — backend endpoints + credential table + browser hooks + enrolment surface at `/settings/webauthn` + `/connection` passkey sign-in button. Assert/begin returns a real challenge; awaiting first enrolment. |
| **Public footer** | ✅ real pages at `/vault` · `/federation` · `/hubs` · `/self-host` (was homepage anchors) |
| **Perf** | vendor-chunk split lands 36% main-chunk gzip reduction on redeploy; audit at `docs/ops/PERF_AUDIT_2026-07-05.md` |
| **Identity provisioned** | Author + LEAD maintainer registered in prod registry (`did:vault:theourgia.com/soror-eu-a`); server-side Ed25519 signer wires A2-A8 routes end-to-end |
| **Deploy artefacts** | docker-compose.{yml,prod,agent-house} · scripts/deploy-prod.sh + first-run.sh · DEPLOYMENT_RUNBOOK.md · R2 buckets provisioned · agent-house Caddy snippet wired |
| **a11y** | 543 / 557 (97.5%); remaining 14 are intentional design tradeoffs |
| **Sprints shipped** | H01-H03 · H04 · H05 · H06 · H07 · H08 (21/21) · H09 (17/17) · **H10 (27/27) ✓** |
| **Design queue** | **H11 open** — Journal auto-context (moon · weather · calendars auto-captured). Design request at `docs/design-requests/2026-07-05-h11-journal-auto-context.md`. |
| **Next build** | Deploy WebAuthn stack to prod + enrol first passkey · retire demo-signin once every prod user has enrolled · plugins.theourgia.com CNAME · R2 access tokens · route-level React.lazy() (v1.1). **H11 auto-context design request opened** (moon phase · weather · multi-calendar auto-captured on every entry). |

The full per-batch history lives in **[CHANGELOG.md](CHANGELOG.md)**. For the canonical feature catalog and per-phase status snapshot, see **[FEATURES.md](FEATURES.md)**. For the full plan and phase index, see **[PROJECT_PLAN.md](PROJECT_PLAN.md)**.

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
| 07 | Workshop (sigils, talismans, magical circles, tool registry) | `[x]` ✅ backend B103-B107 + H05 frontend + B108 wiring (B108-2e Tool Registry form shipped in H07 Cluster A) | [plan/07-workshop.md](plan/07-workshop.md) · [plan/07-batches-backend.md](plan/07-batches-backend.md) |
| 08 | Linguistic Tools (gematria, transliteration, voces magicae) | `[x]` ✅ backend B110-B115 + H06 surfaces 1/4/6 frontend (cipher catalog · gematria index + search · studies · 8 transliteration schemes · voce per-vault state) | [plan/08-linguistic-tools.md](plan/08-linguistic-tools.md) · [plan/08-batches-backend.md](plan/08-batches-backend.md) |
| 09 | Synchronicity & Analytics (scientific illuminism dashboards) | `[x]` ✅ backend solo subset B120-B125 + all 10 H06 surfaces frontend (synchronicity + autotag · QUERY_BUILDER DSL + executor · timeseries/heatmap/correlation/today · weekly digest with banned-phrase regex). Network-aggregate / DP / cross-vault federation deferred to Phase 12+. | [plan/09-synchronicity-and-analytics.md](plan/09-synchronicity-and-analytics.md) · [plan/09-batches-backend.md](plan/09-batches-backend.md) |
| 10 | Publishing & Monetization (books, Stripe, newsletters, blog) | `[x]` ✅ backend B126-B131 + H07 Cluster B frontend (10 surfaces) — publication lifecycle · Stripe Connect 0% fee + portal-only refund (no `/refund` POST anywhere) · subscription tiers (amount IMMUTABLE) · double-opt-in subscribers · newsletter delivery (once-sent immutability · per-recipient unsubscribe URL) · public reader with structural paywall + unversioned RSS/Atom/JSON feeds carrying AGPLv3 credit + per-pub license | [plan/10-publishing-and-monetization.md](plan/10-publishing-and-monetization.md) · [plan/10-batches-backend.md](plan/10-batches-backend.md) |
| 11 | Media Library (images, audio, video, iCal feeds, pilgrimage map) | `[x]` ✅ backend B132-B136 + H07 Cluster C frontend (8 surfaces) — media_asset + polymorphic media_link · R2 upload pipeline with Protocol-isolated EXIF strip · pilgrimage_site with precision FLOOR (one-way ratchet) · iCal feed with sealed-day collapse + unversioned URL + pure-Python RFC 5545 serializer · anti-gamification CI invariants (no play_count / view_count / forge / unseal endpoints anywhere) | [plan/11-media-library.md](plan/11-media-library.md) · [plan/11-batches-backend.md](plan/11-batches-backend.md) |
| 12 | Federation (native protocol, network hubs, group ritual, SSO) | `[x]` ✅ H08 frontend ✓ · backend B137-B141 ✓ · **Phase 12.5 transport ✓** — inbox (b108-2br · HTTP-sig verifier + replay-nonce + activity persistence) · outbound delivery worker (b108-2bs · 60s→24h backoff · DEAD after 6 attempts · Celery beat every minute) | [plan/12-federation.md](plan/12-federation.md) · [plan/12-batches-backend.md](plan/12-batches-backend.md) |
| 13 | ActivityPub (Fediverse interop) | `[x]` ✅ H08 frontend ✓ · persistence ✓ alembic 0060 · **Phase 13 bridge ✓** — actor JSON-LD · per-actor inbox + outbox · followers (count-private) · following (always-empty) · privacy-gated 404 when transport disabled (b108-2bt) | [plan/13-activitypub.md](plan/13-activitypub.md) |
| 14 | Plugin Ecosystem (SDK, official registry, sandbox-before-commit) | `[x]` ✅ H09 frontend ✓ 17/17 · substrate from Phase 01 B7-B10 ✓ · lifecycle routes b108-2n ✓ alembic 0061 · **Registry deployed + bridge wired end-to-end** — server-side Ed25519 author signer (b108-2ch) + maintainer signer (b108-2cj) · all 8 A-cluster surfaces live in admin SPA · `did:vault:theourgia.com/soror-eu-a` registered as LEAD maintainer in prod | [plan/14-plugin-ecosystem.md](plan/14-plugin-ecosystem.md) |
| 15 | Hardening & Launch (GDPR audit, a11y, performance, security, ops) | `[~]` (Cluster B B1-B4 + B6-B7 wired live ✓ b108-2cl · WebAuthn ceremony end-to-end ✓ b108-2cm/2cn · public footer pages ✓ b108-2co · vendor-chunk perf split ✓ b108-2cp · bwrap sandbox rule 59 ✓ · GDPR export inline ✓ · 30-day deletion grace ✓ · sessions revoke ✓; **remaining**: deploy WebAuthn to prod + enrol first passkey · retire demo signin · federation-key rotation surface at /settings/keys · route-level lazy loading v1.1) | [plan/15-hardening-and-launch.md](plan/15-hardening-and-launch.md) |
| 16 | AI Agent Integration (daskalos-pattern daemon + MCP) | `[x]` ✅ **agent-daemon scaffold complete** — MCP (JSON-RPC + SSE) · launcher + subprocess runner · cost-cap (at-wake + at-spend hard halt) · audit log · DB persistence · bwrap filesystem sandbox (rule 59) · install lifecycle CRUD · memory dir read/write · all 12 C-cluster surfaces live in admin SPA wired to bridge. (Operational: subprocess launch needs the claude CLI logged into Max on the host; no API key required.) | [plan/16-ai-agent-integration.md](plan/16-ai-agent-integration.md) |

**Legend:** `[ ]` planned · `[~]` in progress (backend plan locked but execution still rolling) · `[x]` done

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
├── backend/               ← Python 3.12 + FastAPI + SQLModel + Alembic + Celery (2073 tests)
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
