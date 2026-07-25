<div align="center">

# Theourgia

**θεουργία** — *god-working*

A magickal journal CMS and full practitioner's toolkit.
Open source, self-hostable, federation-ready. For working magicians.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Status: Live](https://img.shields.io/badge/status-live_(one_vault_in_production)-orange.svg)](#status)
[![Telemetry: Zero](https://img.shields.io/badge/telemetry-zero-brightgreen.svg)](#privacy)
[![Federated](https://img.shields.io/badge/federation-built,_gated_off_by_default-purple.svg)](FEATURES.md#14-federation-networks--group-work)
[![Plugins](https://img.shields.io/badge/plugins-from_day_one-orange.svg)](FEATURES.md#17-plugin-ecosystem)

</div>

---


## Status

**Live, for one practitioner.** Theourgia runs in production at https://theourgia.com as the working practice environment of its operator — a single vault, deployed and used daily. All seventeen build phases (00-16) have shipped code end-to-end. On 2026-07-25 the platform was reshaped around the operator's own practice — Greek theurgy under Hekate, the Order of the Keybearers — with practice surfaces first and the publishing/federation/plugin platform intact in a secondary wing.

That is the honest shape of the project: **one practitioner's instrument first, community infrastructure second.** Everything in the platform wing exists in code and is tested, but several subsystems are deliberately **dormant by configuration** until they have users and review:

- **Cross-instance federation transport** — built (RFC 9421 signatures, Ed25519, inbox, delivery worker, replay guard) but the gate defaults to `false`; inbox answers 503 and outbound delivery is a no-op until an external threat-model review signs off (`THEOURGIA_FEDERATION_TRANSPORT_ENABLED`).
- **ActivityPub outbound** — the bridge (actor, inbox/outbox, followers) is implemented; per-vault `enabled` defaults to `false` and has not been switched on.
- **Agent daemon and plugin registry** — both services exist with their own test suites and databases, parked behind compose profiles (`agents`, `marketplace`); a plain `docker compose up` starts neither.
- **Registry/marketplace content** — the machinery is live, the catalog is empty beyond the operator's own identity.

| | |
|---|---|
| **Latest commit** | `v1-064` — the iCal feed speaks the operator's rite: preset-threaded four-station events + Attic observance events (Deipnon · Noumenia · Agathos Daimon) |
| **Production** | 🟢 LIVE at https://theourgia.com (first deployed 2026-06-28 · H12 reshape deployed 2026-07-25 · alembic head **0087** · service worker **v6**) |
| **The 2026-07-25 reshape (H12, v1-054 → v1-064)** | Practice-first **PracticeNav** (two wings: practice by default, platform behind a named switcher) · **Today dashboard** on the Attic lunar calendar (`GET /api/v1/events/today-context`) · **four-station daily rite** — configurable stations, shipped Hellenic preset carrying the operator's liturgy byte-exact, HOME/XENOS modes, dusk-minimum streak · **astragaloi divination** (56-cast corpus, two-channel readings) · **two-gate covenant** on workings (sealed intent · verdicts · awaiting-judgment queue) · **install-by-proof** practice states · **tetraktys curriculum ladder** at `/order/ladder` · **profections + transits** endpoints · preset-threaded iCal feed |
| **Honesty passes** | `v1-054` wired real astro providers + implemented the iCal toggles that were stubbed; `v1-055` deleted the fake Oracle/Workshop/stale-Divination routes outright — surfaces that don't work don't ship |
| **Infrastructure** | compose profiles park agent-daemon + registry (kept, optional) · deploy script trimmed (`scripts/deploy-prod.sh`, profile-aware) · **tested restore drill** (`scripts/restore-drill.sh` — a backup that has never been restored is not a backup) · Helm chart archived untested to `.attic/helm/` |
| **Earlier eras** | Phases 00-11 end-to-end (both ends) · Phase 12/13 federation + ActivityPub built behind gates · Phase 14 plugin lifecycle + registry bridge · Phase 15 hardening rolling · Phase 16 agent-daemon scaffold · design sprints H01-H12 · full per-batch history in [CHANGELOG.md](CHANGELOG.md) |
| **Remaining before `v1.0.0`** | responsive sweep of the new H12 surfaces · release engineering (version bump + `[1.0.0]` changelog cut) · tag + launch report |

For the canonical feature catalog, see **[FEATURES.md](FEATURES.md)** — its top now carries a dated reality audit distinguishing shipped / partial / dormant. For the full plan and phase index, see **[PROJECT_PLAN.md](PROJECT_PLAN.md)**.

## What this is

Theourgia is a magickal journal CMS and practitioner's toolkit, built and run by one practitioner for her own daily practice — Greek theurgy under Hekate — and offered as community infrastructure for practicing magicians across many traditions: Thelemites, chaos magicians, Greek theurgists, witches, Hermeticists, ceremonialists, folk practitioners, and adjacent paths. It treats magical practice as praxis worth recording rigorously, and treats data sovereignty as sacred. The order of those clauses is deliberate: the tool is used before it is offered, and nothing ships that its operator does not practice against.

### The vision in one breath

> A practitioner's environment where calendars know their tradition, divinations record themselves with context, entities are tracked across the workings done in their name, sigils generate from intention, networks of magicians can share systems and rituals without surrendering ownership, the data is yours and stays yours, and your record can outlive you on terms you set.

### Feature areas

| Area | Highlights |
|---|---|
| **Daily practice (Hellenic core)** | Attic lunar calendar with observance days (Deipnon · Noumenia · Agathos Daimon), Today dashboard, four-station daily rite (configurable stations · Hellenic preset · HOME/XENOS modes · dusk-minimum streak), annual profections + live transits |
| **Order & curriculum** | Tetraktys curriculum ladder (spheres · items · gates), two-gate covenant on workings (sealed intent → verdict → immutable finalize), awaiting-judgment queue, install-by-proof practice trials |
| **Time & Cosmos** | Multi-calendar overlays (incl. Attic, Hebrew, Hijri, Mayan, Julian, Thelemic), Swiss Ephemeris astrology, planetary hours, election finder, festival calendar with attestation chains |
| **Journal & Authoring** | Tiptap editor with magickal blocks, templates, body sensation diagrams, audio attachments, inline foreign-script support, blog platform, auto-stamped astro/calendar context |
| **Magical Beings** | Entities with alias-graph merging, offerings ledger, contracts, oaths (sealed), initiations (sealed), ancestors + family tree, servitors, lineage attestation + counter-signing |
| **Divination** | Astragaloi (56-cast corpus, two-channel readings), tarot (custom decks + spread designer), I Ching, geomancy, runes, pendulum, bibliomancy, horary, tea leaves |
| **Workshop** | Sigil generator (Spare, Kamea, harmonograph, formula-driven), magic squares, talisman designer, magical circle builder, bind-runes, tool registry |
| **Linguistic** | Multi-cipher gematria, cross-journal gematria search, transliteration schemes, voces magicae library, polytonic Greek / Hebrew / IAST input |
| **Analytics** | Scientific illuminism — multi-axis tagging, query builder, visualizations, synchronicity log; DP substrate for cross-magician aggregates (endpoints await federation) |
| **Sharing** | Magickal Bundle Format (MBF) — pantheons, traditions, rituals, decks, sigil libraries; sandbox-before-commit |
| **Publishing** | Self-published books via Stripe Connect (0% platform fee), paid newsletters, print-quality book PDF, RSS / Atom / JSON Feed |
| **Federation** *(built · dormant by config)* | Native protocol + ActivityPub bridge; hubs, group ritual coordinator; transport gate defaults off pending external review |
| **Security** | User-choice encryption (server-side or zero-knowledge), GDPR tooling, multi-identity, audit log, closed-tradition flags, WebAuthn + TOTP |
| **AI Integration** *(parked behind compose profile)* | Opt-in per-purpose Claude agents via daskalos-pattern (daemon + MCP); user brings own keys; never required |
| **Plugins** *(registry parked behind compose profile)* | SDK + lifecycle routes; official registry service exists, catalog not yet populated; sandbox-before-commit |

See **[FEATURES.md](FEATURES.md)** for the complete catalog (~200 features across 19 categories) and its dated reality audit.

## Roadmap

Theourgia was built in 17 phases, each architecturally dependent on prior phases (not feature-priority-ordered). All seventeen have shipped code. The statuses below distinguish **shipped and in daily use**, **shipped but dormant by configuration**, and **still rolling**. The 2026-07-25 practice reshape (sprint H12, `v1-054` → `v1-064`) sits on top of the phase work rather than inside it — see [Status](#status).

| Phase | Title | Status | Plan |
|---|---|---|---|
| 00 | Foundations (repo, CI, dev env, docs infra) | `[x]` shipped | [plan/00-foundations.md](plan/00-foundations.md) |
| 01 | Core Architecture (DB, auth, plugins, encryption, backups) | `[x]` shipped — auth (sessions + TOTP + WebAuthn), RLS, restic backups verified by a tested restore drill | [plan/01-core-architecture.md](plan/01-core-architecture.md) |
| 02 | Frontend Foundations (Astro, React admin, Tiptap, modals, i18n) | `[x]` shipped — design-fidelity port · PWA · Storybook + axe-core gate | [plan/02-frontend-foundations.md](plan/02-frontend-foundations.md) |
| 03 | Time & Cosmos (calendars, astrology, planetary hours, election finder) | `[x]` shipped — Swiss Ephemeris · multi-calendar engine now including the Attic lunar calendar (v1-058) · profections + transits | [plan/03-time-and-cosmos.md](plan/03-time-and-cosmos.md) |
| 04 | Journaling (entries, blog, library, body diagrams, quotes) | `[x]` shipped — Tiptap live editor · custom blocks · auto-save · publish · astro/calendar auto-stamp | [plan/04-journaling.md](plan/04-journaling.md) |
| 05 | Magical Beings (entities, offerings, oaths, lineage attestation) | `[x]` shipped | [plan/05-magical-beings.md](plan/05-magical-beings.md) |
| 06 | Divination & Practice (tarot, I Ching, geomancy, scrying, rituals) | `[x]` shipped — plus astragaloi (56-cast corpus, v1-057/060/062), the operator's own oracle | [plan/06-divination-and-practice.md](plan/06-divination-and-practice.md) |
| 07 | Workshop (sigils, talismans, magical circles, tool registry) | `[x]` shipped | [plan/07-workshop.md](plan/07-workshop.md) |
| 08 | Linguistic Tools (gematria, transliteration, voces magicae) | `[x]` shipped | [plan/08-linguistic-tools.md](plan/08-linguistic-tools.md) |
| 09 | Synchronicity & Analytics (scientific illuminism dashboards) | `[x]` shipped (solo subset) — cross-vault DP aggregates await federation enablement | [plan/09-synchronicity-and-analytics.md](plan/09-synchronicity-and-analytics.md) |
| 10 | Publishing & Monetization (books, Stripe, newsletters, blog) | `[x]` shipped — Stripe Connect 0% fee · structural paywall · unversioned feeds | [plan/10-publishing-and-monetization.md](plan/10-publishing-and-monetization.md) |
| 11 | Media Library (images, audio, video, iCal feeds, pilgrimage map) | `[x]` shipped — iCal feed now preset-threaded with the daily rite + Attic observances (v1-064) | [plan/11-media-library.md](plan/11-media-library.md) |
| 12 | Federation (native protocol, network hubs, group ritual, SSO) | `[x]` built · **dormant by config** — twin-instance test passed live 2026-07-20; transport gate defaults `false` (inbox 503, outbound no-op) pending external threat-model review | [plan/12-federation.md](plan/12-federation.md) |
| 13 | ActivityPub (Fediverse interop) | `[x]` built · **dormant by config** — bridge complete; per-vault opt-in defaults `false` and is not enabled on the production vault | [plan/13-activitypub.md](plan/13-activitypub.md) |
| 14 | Plugin Ecosystem (SDK, official registry, sandbox-before-commit) | `[x]` built · **registry parked** behind the `marketplace` compose profile; lifecycle routes + signing live, catalog not yet populated | [plan/14-plugin-ecosystem.md](plan/14-plugin-ecosystem.md) |
| 15 | Hardening & Launch (GDPR audit, a11y, performance, security, ops) | `[~]` rolling — GDPR export · deletion grace · sessions · WebAuthn · restore drill done; remaining: H12 responsive sweep · release engineering · `v1.0.0` tag | [plan/15-hardening-and-launch.md](plan/15-hardening-and-launch.md) |
| 16 | AI Agent Integration (daskalos-pattern daemon + MCP) | `[x]` built · **parked** behind the `agents` compose profile; subprocess launch needs the claude CLI on the host | [plan/16-ai-agent-integration.md](plan/16-ai-agent-integration.md) |

**Legend:** `[x]` shipped · `[~]` in progress · **dormant by config / parked** — code and tests exist; the subsystem is off until deliberately enabled

This README is updated continuously. The roadmap reflects the current state of the code, not aspiration.

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

**Self-hosting (production).** The bootstrap installer lives in this repository at [`scripts/install.sh`](scripts/install.sh). It takes a fresh Linux host to a running stack: installs Docker if missing, clones the repo, mints `.env` secrets via `scripts/first-run.sh`, builds and starts the compose stack, runs migrations, and waits for the backend health probe. Download it, **read it**, then run it — we do not ask you to pipe the network straight into your shell:

```bash
curl -fsSL https://raw.githubusercontent.com/SAntonopoulou/theourgia/main/scripts/install.sh -o install.sh
less install.sh
bash install.sh
```

Then complete the web-based first-run wizard at `/app/setup`. The full production path — DNS, Caddy, secrets, deploys, backups, and the monthly restore drill — is documented in [`docs/ops/DEPLOYMENT_RUNBOOK.md`](docs/ops/DEPLOYMENT_RUNBOOK.md). Routine updates are one command: `scripts/deploy-prod.sh`. The agent daemon and plugin registry are optional and stay off unless you enable their compose profiles (`agents`, `marketplace`).

**Local development:**

```bash
git clone https://github.com/SAntonopoulou/theourgia.git
cd theourgia
just dev          # dev stack
just test         # backend + frontend suites
```

## Project structure

```
theourgia/
├── README.md              ← this file
├── PROJECT_PLAN.md        ← vision, scope, phase index
├── ARCHITECTURE.md        ← system design, trust model, tech choices
├── FEATURES.md            ← canonical feature catalog (all ~200 features) + reality audit
├── CHANGELOG.md           ← keep-a-changelog format
├── CODE_OF_CONDUCT.md     ← Contributor Covenant + divergent-practice addendum
├── CONTRIBUTING.md        ← how to land changes
├── SECURITY.md            ← vulnerability disclosure
├── LICENSE                ← AGPL-3.0
├── plan/                  ← per-phase implementation plans (00–16)
├── docs/                  ← user/admin/developer/ops docs + Starlight docs site
├── backend/               ← Python 3.12 + FastAPI + SQLModel + Alembic + Celery
├── frontend/              ← React 19 admin SPA · Astro 6 public site · shared design system
├── agent-daemon/          ← Phase 16 agent daemon (optional; `agents` compose profile)
├── registry/              ← Phase 14 plugin registry (optional; `marketplace` compose profile)
├── plugins/               ← example plugin (theourgia-plugin-example-cipher)
├── scripts/               ← install.sh · first-run.sh · deploy-prod.sh · restore-drill.sh
└── .attic/                ← archived, untested artefacts (Helm chart)
```

## Contributing

The code has long since landed; the most valuable contributions now are running the software, filing what breaks, tradition-specific corrections to the calendars/festivals/correspondences, and review of the dormant subsystems (the federation transport threat model in particular — external review is what gates it on). See **[CONTRIBUTING.md](CONTRIBUTING.md)** for how to land changes.

All contributors are bound by the **[Code of Conduct](CODE_OF_CONDUCT.md)**, which includes an explicit clause about respect for divergent magickal practice — *"we cannot become a centre of pestilence"*.

## Community

- **Code of Conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **Security**: [SECURITY.md](SECURITY.md) — private vulnerability disclosure via GitHub security advisories
- **License**: [AGPL-3.0](LICENSE) — free forever
- **Issues**: [GitHub Issues](https://github.com/SAntonopoulou/theourgia/issues) — for planning feedback and tradition-specific corrections
- **Discussions**: GitHub Discussions (enabled once code lands)
- **Fediverse / Matrix / forum**: established at Phase 15 launch

## About the creator

Theourgia was conceived and is being built by **Soror Ευ. Α.** ([@SAntonopoulou on GitHub](https://github.com/SAntonopoulou)) — a practicing magician whose daily work is Greek theurgy under Hekate, with roots across Thelemic (OTO), chaos magickal, and eclectic witchcraft paths. The project comes from her own need for tools that take magickal practice seriously — record-keeping deep enough for serious work, infrastructure sovereign enough to actually trust, design respectful enough to honor many traditions at once. She runs the production instance as her own vault; the platform is shaped by daily use before it is offered to anyone else.

The intent is community infrastructure, not a product. The license guarantees that intent forever.

If you find Theourgia useful when it ships, that's the purpose. If you want to help shape it before then, see [CONTRIBUTING.md](CONTRIBUTING.md). Magicians of every tradition welcome.

## License

[AGPL-3.0](LICENSE). Free forever. This is community infrastructure, not a product.
