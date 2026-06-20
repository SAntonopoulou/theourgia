# Theourgia — Project Plan

> *Theourgia* (Greek: θεουργία, "god-working") — a magickal journal CMS and full practitioner's toolkit. Open-source, self-hostable, federated. Built for working magicians by a working magician.

---

## 1. Vision

Theourgia is community infrastructure for practicing magicians. It is not a "spiritual app." It is a serious, professional-grade platform that meets practitioners where they actually work — across calendars, traditions, languages, and modes of inquiry. It treats magic as praxis worth recording rigorously, and treats data sovereignty as sacred.

The success metric is **adoption by practitioners**, not revenue. Theourgia is AGPL-3.0 and will remain free forever.

The project's secondary thesis is **scientific illuminism**: that systematic recording of magical practice — entities, timing, conditions, outcomes — yields insight when analyzed across time, across magicians, and across traditions. Theourgia provides the substrate for that work.

## 2. Project Identity

- **Name:** Theourgia
- **Domain:** theourgia.com (Squarespace-registered, Cloudflare-proxied, origin on Hetzner-class server)
- **License:** AGPL-3.0
- **Repository:** [github.com/SAntonopoulou/theourgia](https://github.com/SAntonopoulou/theourgia)
- **Primary maintainer:** [Soror Ευ. Α.](https://github.com/SAntonopoulou)
- **Audience:** Practicing magicians — Thelemites, chaos magicians, Greek theurgists, witches, Hermeticists, ceremonialists, folk practitioners, and adjacent traditions

## 3. Guiding Principles

1. **Practitioner-grade depth.** Every feature must be deep enough that a serious practitioner won't outgrow it in a year.
2. **Data sovereignty.** The magician owns their data, period. Local-first sync, user-choice encryption, exportable everything.
3. **No deferred features.** All features in scope are planned upfront. Phases reflect *architectural dependencies*, not feature triage.
4. **Quality over speed.** No MVP rush. Spec, build, test, document. Then move.
5. **Extensible by design.** Plugin architecture from day one. Other magicians will fork, extend, and contribute.
6. **Security as foundation.** Encryption, auth, and threat modeling are first-class deliverables, not afterthoughts.
7. **Tradition-respectful.** Terminology, structures, and defaults respect tradition-specific practice. The product does not flatten Thelema, theurgia, chaos magic, and witchcraft into a generic stew.
8. **Documentation is product.** Self-hosters and contributors are first-class users. Docs exist from day one and stay in sync with code.
9. **Testing is foundational.** Unit, regression, integration, and end-to-end tests at every phase — never deferred to a "testing pass."
10. **Premium feel everywhere.** No native browser alerts. Custom modal systems only. The product respects the seriousness of the practice.

## 4. Scope — Feature Catalog Overview

The full canonical feature catalog with statuses and cross-references is **[FEATURES.md](FEATURES.md)** (~200 features across 19 categories). This section is a narrative overview; FEATURES.md is the source of truth for what's in scope.

Every feature in FEATURES.md has a home in a phase plan. **No features are deferred from initial scope**; phases reflect architectural dependencies, not feature triage.

### Categories at a glance

1. **Time, Calendars & Cosmology** — multi-calendar overlays (Gregorian / Thelemic / Hellenic / Vedic / Coptic / Hebrew / Mayan / Egyptian / French Republican), multi-tradition astrology (Western tropical / Hellenistic / Vedic sidereal), planetary hours, festival overlays, Liber Resh tracker, electional search engine
2. **Journal, Authoring & Blog** — Tiptap editor with magickal blocks, drag-drop templates, body sensation diagrams, audio attachments, multi-language scripts, library catalog, `/quote` autocite, **separate blog platform**, **time-released content**, **multi-identity authoring**
3. **Magical Beings, Relationships & Lineage** — entity tracker with **alias-graph merging** (multi-source entities coexist without overwriting), offerings, contracts, oaths (sealed), initiations (sealed), ancestors, servitors/egregores, **lineage attestation with cryptographic counter-signing**
4. **Divination** — tarot (custom decks + community sharing), I Ching, geomancy, runes, scrying (trance mode), pendulum, bibliomancy, horary
5. **Practice & Ritual Logs** — ritual templates, dream journal, pathworking, asana/pranayama, banishings, servitor lifecycles
6. **Workshop & Generators** — sigil generator (Spare / Kamea / Rose Cross / hashed-vector / harmonograph / **formula-driven** / freeform), magic squares, talisman designer, magical circle builder, tool/altar registry, voce magicae recordings
7. **Linguistic Tools** — multi-cipher gematria, **cross-journal gematria search**, transliteration, voces magicae library, pronunciation guides (community-contributable), full i18n framework
8. **Body & State** — sensation diagrams, mood/energy/health snapshots, state correlation in analytics
9. **Synchronicity & Analytics ("Scientific Illuminism")** — quick-capture log, multi-axis tagging, query builder, Tufte-aware visualizations, opt-in cross-magician network aggregates with differential privacy
10. **Correspondences & Reference** — user-defined correspondence systems, CSV import, personal grimoire, recipe builder, materia databases
11. **Bundles, Sharing & Magickal Knowledge Distribution** — **Magickal Bundle Format (MBF)** with all magickal artifacts portable (pantheons, tradition bundles, rituals, decks, sigil libraries, calendars, ciphers, symbolism systems, …), **four sharing modes** (P2P / network-curated / public registry / federated), **piecemeal sharing** (pull one ritual from a tradition bundle), bundle signing, **sandbox-before-commit** preview, tombstone-not-erasure, **closed-tradition flags**
12. **Publishing, Monetization & Newsletters** — Stripe Connect for own-book sales, **subscription billing**, **print-quality typography** (book-grade PDF with drop caps, footnotes, index, glossary), RSS / Atom / JSON Feed, comments with moderation
13. **Media Library, Calendar Feeds & Maps** — image gallery (EXIF-stripped), audio library, video (YouTube + optional self-hosted), pilgrimage map (privacy-aware), **iCal/WebCal feeds** for planetary hours and festivals, **network group ritual feeds**
14. **Federation, Networks & Group Work** — native federation protocol (Ed25519-signed), network hubs for orders / covens / sodalities, **single sign-on across networks**, **admin permissions panel with configurable user levels**, group ritual coordinator with timezone-aware planetary hours, ActivityPub bridge to Fediverse
15. **Security, Identity & Compliance** — user-choice encryption (server-side at rest OR zero-knowledge client-side), TOTP + WebAuthn + backup codes, Row-Level Security at DB layer, comprehensive audit log (user + network surfaces), **full GDPR compliance** (right to access / erasure / portability + DPIA templates + breach runbook), **multi-identity per account** (pseudonymity), **closed-tradition flags**, optional crisis-aware nudge
16. **AI Agent Integration** — **opt-in** per-purpose Claude agents via the daskalos-pattern (daemon + waker + MCP); user supplies own API keys or Claude subscription; visibility-aware exposure; never required; agent-free path is first-class
17. **Plugin Ecosystem** — Python + TypeScript SDK, capability-based sandbox, signed releases, **official Theourgia registry** with three quality tiers (Official / Community / Unverified), sandbox-before-commit, tombstone on withdrawal
18. **Self-Hosting, Operations & Lifecycle** — **one-command deploys**, **one-click migrations with diff preview**, auto-update channels, R2 backups from day one, host-shared-Caddy multi-tenant pattern documented, **digital inheritance / memorial mode** (designated executor, check-in mechanic, posthumous publication, read-only memorial state)
19. **Documentation, Testing & Sustainability** — user + dev docs from day one (synced with code), **unit + regression + integration + E2E + property-based tests at every phase** (local + dev-server during v0.x, GitHub Actions CI/CD post-1.0), **modal-only alerts** (no native dialogs), README continuously current as community page

See **[FEATURES.md](FEATURES.md)** for the detailed feature catalog with status tracking and cross-references to phase plans.

## 5. Phasing Philosophy

Phases reflect **architectural dependencies**, not feature priority. Every feature in FEATURES.md has a home. Phases ship sequentially; each phase produces working, tested, documented code before the next begins.

A phase is **done** when it meets its Definition of Done (in the phase plan), including:

- All code reviewed, typed, tested (unit + regression + integration + relevant E2E)
- Documentation written (user + developer + ADRs for non-obvious decisions)
- Security implications addressed
- Migration story clear and tested
- README roadmap + FEATURES.md status updated to reflect new state
- Definition of Done signed off by the maintainer

## 6. Phase Index

| # | Phase | Depends on | Plan |
|---|-------|-----------|------|
| 00 | Foundations (repo, CI/CD, docs, dev env) | — | [plan/00-foundations.md](plan/00-foundations.md) |
| 01 | Core Architecture (DB, auth, plugins, encryption, backups, API) | 00 | [plan/01-core-architecture.md](plan/01-core-architecture.md) |
| 02 | Frontend Foundations (Astro, React admin, Tiptap, modals, i18n) | 00, 01 | [plan/02-frontend-foundations.md](plan/02-frontend-foundations.md) |
| 03 | Time & Cosmos (calendars, astrology, planetary hours, election finder) | 00, 01 | [plan/03-time-and-cosmos.md](plan/03-time-and-cosmos.md) |
| 04 | Journaling (entries, blog, templates, body diagrams, library, quote insert) | 00–03 | [plan/04-journaling.md](plan/04-journaling.md) |
| 05 | Magical Beings (entities + alias-graph, offerings, oaths, lineage attestation, ancestors) | 00–04 | [plan/05-magical-beings.md](plan/05-magical-beings.md) |
| 06 | Divination & Practice Logs (tarot, I Ching, geomancy, runes, scrying, servitors) | 00–05 | [plan/06-divination-and-practice.md](plan/06-divination-and-practice.md) |
| 07 | Workshop (sigils, magic squares, talismans, circles, tool registry) | 00–02 | [plan/07-workshop.md](plan/07-workshop.md) |
| 08 | Linguistic Tools (gematria, transliteration, voces magicae) | 00–02 | [plan/08-linguistic-tools.md](plan/08-linguistic-tools.md) |
| 09 | Synchronicity & Analytics (capture, tagging, query builder, viz) | 00–06 | [plan/09-synchronicity-and-analytics.md](plan/09-synchronicity-and-analytics.md) |
| 10 | Publishing & Monetization (books, Stripe, subscriptions, newsletters, print-quality, blog) | 00–04 | [plan/10-publishing-and-monetization.md](plan/10-publishing-and-monetization.md) |
| 11 | Media Library (images, audio, video, iCal feeds, pilgrimage map) | 00–04 | [plan/11-media-library.md](plan/11-media-library.md) |
| 12 | Federation (native protocol, network hubs, group ritual, SSO, admin permissions) | 00–11 | [plan/12-federation.md](plan/12-federation.md) |
| 13 | ActivityPub (Fediverse interop, public broadcast) | 12 | [plan/13-activitypub.md](plan/13-activitypub.md) |
| 14 | Plugin Ecosystem (SDK polish, official registry, sandbox-before-commit, docs) | 00–13 | [plan/14-plugin-ecosystem.md](plan/14-plugin-ecosystem.md) |
| 15 | Hardening & Launch (GDPR audit, a11y, perf, security, inheritance, ops, marketing) | all | [plan/15-hardening-and-launch.md](plan/15-hardening-and-launch.md) |
| 16 | AI Agent Integration (daskalos-pattern daemon, per-purpose agents, MCP exposure) | 00–15 | [plan/16-ai-agent-integration.md](plan/16-ai-agent-integration.md) |

## 7. Cross-Cutting Concerns

These threads run through every phase and are reviewed continuously:

- **Security.** Threat models updated per phase; private content flows reviewed; cryptographic choices documented in ADRs.
- **Privacy & GDPR.** Right to access / erasure / portability honored across all data surfaces. Zero telemetry verified by automated test. No third-party trackers ever. EXIF stripped on upload. Map coordinates obfuscated for public views. DPIA templates maintained for network hubs.
- **Accessibility.** WCAG 2.2 AA at minimum. Keyboard navigation, screen reader support, color contrast (light/dark/high-contrast modes), motion sensitivity, color-blind variants.
- **Internationalization.** UI strings extracted from day one. Polytonic Greek, Hebrew with niqud, Arabic with shaping, Devanagari, Coptic all rendered correctly. RTL layouts honored where needed.
- **Performance.** Page weight budgets; database query budgets; image/asset optimization; PWA-fast mobile capture.
- **Premium feel & UX.** Modal-only alerts (no `window.alert` / `confirm` / `prompt`); custom dialog components for all confirmations and prompts; consistent design tokens; print stylesheets that match screen quality.
- **Documentation.** User docs + developer docs ship in the same PR as features. README, FEATURES.md, CHANGELOG.md, and ADRs stay continuously synced with reality. Onboarding flows built alongside features, not retrofitted.
- **Testing.** Unit + regression + integration + E2E + property-based tests at every phase. Local + dev-server during v0.x. GitHub Actions CI/CD gating after v1.0. Definition of Done includes green tests on both surfaces.
- **Operations.** One-command deploys; one-click migrations with diff preview; one-click rollback; auto-update channels; backups from day one (Cloudflare R2 default, S3-compatible alternatives).
- **Decision records.** Non-obvious decisions captured as ADRs in `docs/adr/`.

## 8. Resolved Decisions

These are firm constraints. Cross-references to the canonical detail are inline.

1. **Internationalization:** **Full i18n from day one.** Every string extractable; every script supported (polytonic Greek, Hebrew with niqud, Arabic shaping, Sanskrit, Coptic, …); RTL-correct; locale-aware date/number/currency formatting. No "English first, translate later."
2. **Mobile strategy:** Responsive web + installable PWA with fast mobile quick-capture. Native mobile apps planned for post-1.0 roadmap, not initial scope.
3. **Telemetry:** **Zero telemetry, ever.** Not at install time, not at runtime, not opt-in, not "anonymized." The privacy posture is treated as a marketable feature — surfaced on README and theourgia.com. No analytics scripts ever ship.
4. **Hosted SaaS:** Likely future feature; AGPL hosting monetization needs design work. Out of initial scope. Revisit after federation matures.
5. **Backups, hosting, CDN:**
   - **Cloudflare R2** (or S3-compatible) backups ship from day one — foundational, not polish.
   - Cloudflare CDN recommended for theourgia.com; self-hosters who avoid Cloudflare use Caddy's built-in caching with internal Redis (Redis never externally exposed).
6. **Code of Conduct:** Contributor Covenant 2.1 with explicit clause respecting divergent magickal practice (per Crowley, *"we cannot become a centre of pestilence"*). CoC moderates behavior, not belief.
7. **Repository organization:** Single monorepo. Frontend + backend + docs + reference plugins.
8. **GitHub:** Repo at `SAntonopoulou/theourgia`. All commits, PRs, issues attributed via the `SAntonopoulou` GitHub identity. **Maintainer named in all documentation as Soror Ευ. Α.** (magickal name) only — never legal name.
9. **Entity merge model:** Alias-graph approach. Entities are immutable nodes; relationships between them are mutable and user-curated. Imports never overwrite personal content. Workings always attach to a specific entity, never to a unified aggregate. See [memory/project_entity_merge_model.md](#) for full reasoning.
10. **AI agent integration:** Opt-in only. Daskalos-pattern (daemon + waker + MCP) adapted. User brings their own API keys or Claude subscription. Theourgia never holds keys centrally; never bills. Agent-free use is first-class.
11. **GDPR compliance:** Built in from the architecture layer, not retrofitted. Theourgia itself is compliant for self-hosted use; tooling provided to help network hubs comply (DPIA templates, breach runbooks, cookie consent UI).
12. **Testing discipline:** Unit + regression + integration + E2E + property-based tests at every phase. Local + dev-server during v0.x; GitHub Actions CI/CD post-1.0. Tests written when feature is built, not after.
13. **Documentation discipline:** Docs ship with features. README is the community page and stays continuously current. FEATURES.md is the canonical feature catalog. ADRs for non-obvious decisions.
14. **UX discipline:** No native browser dialogs (`alert` / `confirm` / `prompt`) anywhere; custom modal/toast/banner components only. Enforced by lint rule.
15. **Lifecycle features from day one:** Digital inheritance / memorial mode, one-command deploys, one-click migrations with preview, closed-tradition flags. Not "Phase 15 polish" items.
16. **Magickal Bundle Format:** Single typed envelope format; piecemeal sharing supported; bundle signing optional but recommended; tombstone-not-erasure on withdrawal.
17. **Single Sign-On across networks:** First-class for federated networks; per-hub opt-in; individual vault sites can use it too.

## 9. Glossary

- **Vault:** A single magician's personal data and instance. The default unit of Theourgia.
- **Hub:** A network / group / sodality / order's shared instance. Aggregates and curates content from member vaults.
- **Network:** A federated group of vaults and a hub. Has shared identity, member access controls, optional newsletter, optional public face.
- **Instance:** A running Theourgia deployment, which may host one or more vaults and/or hubs.
- **Working:** A magical operation — ritual, invocation, sigil casting, etc. The atomic unit of magical activity tracked in the journal.
- **Magical Record:** A formal structured journal in the Thelemic tradition (after Crowley's `Liber Magick`).
- **Scientific illuminism:** Crowley's term for applying rigorous methodology to magical practice. The analytics layer of Theourgia is built in this spirit.
- **Voces magicae:** "Magical voices" — barbarous names of power used in ritual.
- **Kamea:** Hebrew word for "amulet" — used in Western magic for the planetary magic squares.
- **MBF (Magickal Bundle Format):** Theourgia's portable, typed format for sharing magickal artifacts (pantheons, traditions, rituals, decks, sigil libraries, etc.).
- **Alias-graph (entity model):** Theourgia's approach to multi-source entities — same-named entities from different bundles coexist as separate nodes with typed alias relationships (same-as / aspect-of / syncretic-with / epithet-of); user-defined unified views merge for display without merging the underlying data.
- **Sealed entry:** Content stored under zero-knowledge encryption (Mode B); decrypted only client-side with the user's passphrase.

## 10. Companion Documents

- [**FEATURES.md**](FEATURES.md) — canonical feature catalog with status tracking (the source of truth for what's in scope)
- [**ARCHITECTURE.md**](ARCHITECTURE.md) — system architecture, trust model, data flow, federation protocol, plugin substrate, AI integration layer, deployment topology, technology choices
- [**README.md**](README.md) — community-facing front page (roadmap, tech stack, getting started)
- [**CHANGELOG.md**](CHANGELOG.md) — release history (Keep a Changelog format)
- [**CODE_OF_CONDUCT.md**](CODE_OF_CONDUCT.md) — Contributor Covenant + divergent-practice addendum
- [**CONTRIBUTING.md**](CONTRIBUTING.md) — contribution guide
- [**SECURITY.md**](SECURITY.md) — vulnerability disclosure policy
- Per-phase plans in [**plan/**](plan/) — seventeen architectural-dependency-ordered phase plans (00–16)

Design briefs for the design team are maintained as external handoff documents and are not part of the public repository.
