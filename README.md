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

**Pre-alpha — Phases 00-11 end-to-end on both frontend and backend (+ Phase 09 solo subset).** Sprint trajectory:

- **H01-H03 sprint** (B50-B75) — Phases 03 · 04 · 05 frontend coverage end-to-end against existing backend.
- **H04 sprint** (B76-B86) — Daily Practice Tracker (Tier 1) + Phase 06 Divination & Practice cluster (Tier 2): Tarot · I Ching · Geomancy · Runes · Pendulum/Bibliomancy/Horary/Scrying · Practice Logs.
- **H05 sprint** (B89-B96) — Phase 07 Workshop frontend (Tier 3): Sigil Generator · Magic Squares · Talisman Designer · Magical Circle · Tool Registry · Voces Magicae.
- **Phase 07 backend** (B103-B107, 2026-06-25) — Five domain models · alembic 0033→0037 · seven routers · 152 new tests · 7 Agrippa planetary squares · 5 PD circle presets · 32 PD voces (PGM + Sefer Yetzirah + Lemegeton + Heptameron + Sanskrit).
- **B108 wiring + H07 sprint** (2026-06-26) — Workshop surfaces persist live · Mode B vault crypto end-to-end · H07 Foundation + Cluster A (3 Workshop modals · closes B108-2e) + Cluster B (10 Publishing surfaces) + Cluster C (8 Media + Pilgrimage surfaces). Phases 10 + 11 frontend ✅ end-to-end.
- **Phase 08 backend** (B110-B115, 2026-06-26) — Cipher catalog (13 PD bundled, byte-for-byte parity with H06-1 client) · gematria_index + cross-journal search (3 match modes · sealed entries never indexed) · studies + frozen snapshots · 8 PD transliteration schemes · voce per-vault state. Alembic 0038→0042; +128 backend tests.
- **H06 ports 2/3/5/6/7/8/9/10** (2026-06-26) — Cross-Journal Search · Per-Study Page · Studies Index · Transliteration Utility · Analytics Dashboard · Query Builder · Synchronicity Log · Synchronicity Quick-Capture.
- **Phase 09 backend** (B120-B124, 2026-06-26) — Synchronicity table + auto-tag (location-precision floor enforced server-side) · QUERY_BUILDER study kind + saved-query DSL · executor (sealed exclusion via JOIN-layer guard + sealed_excluded_count indicator) · `/analytics/query` · timeseries / heatmap / correlation / today aggregates · weekly digest builder (banned-phrase regex blocks modal/oracular headlines; tier-2/3 gated by sample size). Alembic 0043→0047; +146 backend tests.

As of latest commit: **2194 vitest tests · 2331 backend tests · alembic head 0055 · admin tsc clean**. The a11y gate (restored 2026-06-23 in B101) holds at 543/557 (97.5%); remaining 14 are intentional design tradeoffs.

**H06 sprint COMPLETE: 10/10 surfaces shipped + Phase 09 backend solo subset closed.** B120-B125 in. Network-aggregate / differential-privacy / cross-vault federation explicitly deferred to Phase 12+. The defining rule across this phase: **Scientific Illuminism** — every finding shows n, n<10 caveated, n<5 never surfaced; zero gamification; no red anywhere in charts.

**Phase 10 Publishing & Monetization backend ✅ COMPLETE** (2026-06-26 · B126 → B131).

Six batches across Alembic 0048 → 0051: publication lifecycle · Stripe
Connect (0% application fee CI invariant · refunds via portal hand-off
only · NO `/refund` POST endpoint anywhere) · subscription tiers (amount
IMMUTABLE) · double-opt-in subscribers (PENDING_CONFIRMATION default) ·
newsletter delivery (once-sent immutability · per-recipient unsubscribe
URL in every render · Tiptap → HTML/plaintext renderer with `html.escape`
XSS guard) · public reader with structural paywall + per-vault page +
unversioned RSS 2.0 / Atom 1.0 / JSON Feed 1.1 serialisers (every item
carries AGPLv3 site-wide credit + per-publication license slug · sealed
publications NEVER public · defence in depth at publish-time AND checkout-
time AND read-time).

CI honesty invariants pinned this phase:

- 0% application fee on every Stripe checkout session (source-level
  test inspects `create_checkout_session` for the literal `0`).
- No `/refund` POST endpoint anywhere in any router (CI walks every
  route and asserts; refunds are portal hand-off only).
- ReaderResponse schema actively REJECTS countdown-timer / "limited
  time" / view_count / trending / recommended-products fields.
- PublicVaultPublication carries no view_count or trending_score.
- PublicVaultTier carries no subscriber_count (anti-gamification).
- `confirmation_required: True` hard-coded on SendNowResult — the
  H07 `--warn-soft` confirm modal contract.
- Feeds mounted at app-level (NOT `/api/v1`) — subscribers' URLs
  stay stable across API versioning; source-level test enforces.

**Phase 11 backend plan LOCKED** (`plan/11-batches-backend.md` ·
B132→B136 · media asset table with sealed-only count-list rule · R2
direct-upload + EXIF strip on the server hop · pilgrimage sites with
precision floor enforced at write time (never raised) · iCal feed that
collapses sealed entries into "N sealed entries today" markers).

174 new tests across the close-out window; backend total 1899 → **2073**.
Alembic head **0051**.

**B132 + B133 + B134 + B135 SHIPPED** (Phase 11 backend in flight · 2026-06-26).

- **B132** — Media asset table + sealed substrate + link-count cache.
  Alembic 0051 → 0052: `media_asset` (4-kind enum) + `media_link`
  (polymorphic ref_kind/ref_id — no per-target FK). Sealed list
  surfaces count only; read response nulls filename / caption /
  alt_text / tags / EXIF metadata / dimensions / duration but
  PRESERVES size_bytes (storage-quota math) + link_count. Source-
  level CI invariant: no `play_count` anywhere.
- **B133** — R2 upload pipeline + presigned URLs + EXIF strip.
  Alembic 0052 → 0053: `media_upload_session` (4-state PENDING →
  COMPLETED/CANCELLED/EXPIRED · 24h TTL · audit row stays). Three
  endpoints: `/media/uploads/begin` (presigned PUT URL · quota
  guard at 5 GB default · EXIF strip default ON for unsealed
  images), `/media/uploads/{id}/complete` (R2 existence check ·
  EXIF strip step for unsealed images via Pillow-backed
  `ExifStripper` Protocol — `NullExifStripper` fallback so CI
  doesn't need Pillow · `MediaAsset` row created at this step),
  `/media/uploads/{id}` DELETE (cancel · idempotent · refuses
  completed sessions 409). Sealed + EXIF strip is REJECTED at
  begin time (encrypted bytes can't be re-stripped server-side).
  StorageAdapter is the injection seam — production wires the
  existing Phase 01 `S3CompatibleBackend`. Source-level CI
  invariants: no `/retry` / `/refund` / `/force-complete` /
  `/skip-strip` endpoints; sealed-strip rejection AND the quota
  check both live inside `begin_upload`'s source.

- **B134** — Pilgrimage sites + precision floor + re-quantize.
  Alembic 0053 → 0054: `pilgrimage_site` (5-kind enum SACRED /
  ANCESTRAL / WORKING / PILGRIMAGE / OTHER · lat-lng paired
  CheckConstraint · stored_precision restricted to the 5 allowed
  values). Eight endpoints: list (sealed STRIPPED · sealed_count
  surfaced separately), POST sealed-cluster (count-only · no
  ids, no coords · the H07 map-badge data source), CRUD, /seal
  (one-way · unseal is client-side via Mode B), /requantize
  (one-way LOWER ONLY · attempting to raise precision → 400).
  Precision floor applied via the SHARED `apply_precision_floor`
  helper from B120 autotag (same string set: `exact / 1km / 10km
  / country / hidden`). The H07 `‡ Geocoding by Nominatim / ©
  OpenStreetMap contributors.` line is embedded as a default
  string on `PilgrimageSiteRead` and `ListResponse` so the
  surface renders it verbatim without owning the copy. Source-
  level CI invariants: `apply_precision_floor` MUST be called in
  both create + requantize sources; `is_lower_or_equal_precision`
  MUST be referenced in requantize source; no /unseal · /promote
  · /sharpen · /refine · /raise-precision · /within-radius ·
  /nearest endpoints exist.

- **B135** — iCal feed serializer (sealed-day collapse). Alembic
  0054 → 0055: `ical_feed` (per-vault settings · 6 include toggles
  · `private`/`public` visibility CheckConstraint · 32-byte
  url-safe random token + `last_regenerated_at`). Pure-Python
  RFC 5545 serializer at `core/calendar/ical_serializer.py` with
  proper § 3.3.11 text escaping (backslash-first), § 3.1 line
  folding to 75 octets (decode-and-retry so multi-byte UTF-8
  sequences never split), CRLF line endings, and `BEGIN:VEVENT`
  blocks for `CalendarEvent` records. The defining honesty rule:
  `SealedDayMarker` dataclass is exactly `{date, count}` — no
  title field — and each marker becomes ONE all-day VEVENT with
  summary `"{N} sealed entries today"`, NO description, NO
  location. Three settings endpoints (`GET`/`PATCH` `/ical-feed`
  + `POST` `/ical-feed/regenerate` rotates the token) and one
  unversioned delivery endpoint `/ical/v1/{token}.ics` mounted
  at app-level so calendar clients' subscriptions stay stable.
  Private feeds require the auth cookie + caller-must-be-owner
  match. Source-level CI invariants: no `/forge` · `/clone` ·
  `/peek-sealed` · `/reveal` · `/unseal` endpoints anywhere;
  `SealedDayMarker` dataclass remains `{date, count}` only.

203 new tests across the four Phase 11 batches; backend total
2073 → **2276**. Alembic head **0055**.

**Phase 11 Media Library + Pilgrimage backend ✅ COMPLETE**
(B132 → B136). Phases 00-11 are now end-to-end on both frontend AND
backend (with Phase 09's network-aggregate path explicitly deferred
to Phase 12+).

**H08 design request opened** (2026-06-26 · `docs/design-requests/
2026-06-26-h08-federation-activitypub.md` · 767 lines · 21 surfaces
across two clusters · 13 net-new honesty rules pinned).

**Weekly digest tier-2/3 pre-compute wired** (2026-06-26 ·
autonomous follow-up). The Phase 09 digest route now pre-computes
two real-data candidate sources alongside the existing tier-1
counts: (a) synchronicity category frequencies for the period
(`TIER2_CATEGORY_TEMPLATE: "{category} synchronicities led the
week · n={n}"` · top three above the `MIN_SAMPLE_PER_TIER_2 = 10`
threshold) and (b) Spearman correlation between synchronicity
intensity and weekday (`TIER3_INTENSITY_WEEKDAY_TEMPLATE` ·
gated by `MIN_SAMPLE_PER_TIER_3 = 20`). The Phase 09 honesty
rules carry forward in full — the banned-phrase regex audit
runs against the new template + body copy; n<10 NEVER surfaced;
correlation is framed as observation, not causation. Backwards-
compatible: `AnalyticsSnapshot.category_frequencies` defaults to
`[]` so callers that don't pre-compute keep working. 12 new
tests; backend total 2319 → **2331**.

**iCal feed live data walking shipped** (2026-06-26 · autonomous
follow-up). B135 shipped `/ical/v1/{token}.ics` as a VCALENDAR
shell — empty events list — pending the walker. The walker now
lives at `core/calendar/feed_walker.py` (~270 lines) and wires
`include_workings` and `include_pilgrimage_anniversaries` to live
data. Walking window is 4 weeks past + 6 weeks future. The
**sealed-day collapse is enforced at the walker boundary** —
`_collect_workings` filters `encryption_mode != SEALED`;
`_collect_sealed_markers` groups sealed entries by their
`occurred_at` date and emits `SealedDayMarker` records only.
The serializer never sees sealed entry titles. Sealed pilgrimage
sites are EXCLUDED ENTIRELY (no count-only fallback) per the
Phase 11 close memo. Feb-29 anniversaries fall back to March 1
in non-leap years (matches calendar-client convention). The
remaining four toggles (`include_resh`, `include_lunar_events`,
`include_planetary_hours`, `include_custom`) emit no events
today — each carries a TODO comment marking the Phase 03 /
cron-evaluator substrate integration as a future batch. 35 new
walker tests; backend total 2284 → **2319**.

**Phase 09 executor extended — astro.* / calendar.* JSONB axes
materialise on the synchronicity subject** (2026-06-26 ·
autonomous follow-up). The Phase 09 query executor now compiles
cross-cutting DSL axes (`astro.moon_phase` · `astro.planetary_hour`
· `astro.sun_sign` · `astro.moon_sign` · `astro.has_aspect_to_natal`
· `calendar.season` · `calendar.festival` · `calendar.weekday`)
into PostgreSQL `astro_snapshot ->> 'key'` JSONB indexing
expressions when the subject is `synchronicity`. Bool-typed axis
(`astro.has_aspect_to_natal`) auto-casts to Boolean; string axes
keep `.astext`. The Entry table's astro_snapshot is Text-encoded
at B121 (not JSONB) so entry / working / divination subjects
continue to raise `ExecutionError` with a clear "not yet
materialised for subject {kind}" message. Backwards-compat: the
legacy `_column_for_axis(axis)` / `_node_to_sql(node)` signatures
keep working — `subject` is an optional second argument; without
it, cross-cutting axes still raise. Group-by on JSONB axes is
explicitly rejected (the subquery-named-column path needs a
follow-up label hook). 8 new tests · backend total 2276 → **2284**.

**Next:** Awaiting designer pickup on H08. Until then, remaining
deferred follow-ups: weekly digest tier-2/3 pre-compute, Tool
Registry kind-icon folding into the SVG sprite sheet,
custom-square kamea sigil.

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
| 12 | Federation (native protocol, network hubs, group ritual, SSO) | `[ ]` | [plan/12-federation.md](plan/12-federation.md) |
| 13 | ActivityPub (Fediverse interop) | `[ ]` | [plan/13-activitypub.md](plan/13-activitypub.md) |
| 14 | Plugin Ecosystem (SDK, official registry, sandbox-before-commit) | `[ ]` | [plan/14-plugin-ecosystem.md](plan/14-plugin-ecosystem.md) |
| 15 | Hardening & Launch (GDPR audit, a11y, performance, security, ops) | `[ ]` | [plan/15-hardening-and-launch.md](plan/15-hardening-and-launch.md) |
| 16 | AI Agent Integration (daskalos-pattern daemon + MCP) | `[ ]` | [plan/16-ai-agent-integration.md](plan/16-ai-agent-integration.md) |

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
