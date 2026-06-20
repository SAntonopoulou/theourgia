# Theourgia — Project Plan

> *Theourgia* (Greek: θεουργία, "god-working") — a magickal journal CMS and full practitioner's toolkit. Open-source, self-hostable, federated. Built for working magicians by a working magician.

---

## 1. Vision

Theourgia is community infrastructure for practicing magicians. It is not a "spiritual app." It is a serious, professional-grade platform that meets practitioners where they actually work — across calendars, traditions, languages, and modes of inquiry. It treats magic as praxis worth recording rigorously, and treats data sovereignty as sacred.

The success metric is **adoption by practitioners**, not revenue. Theourgia is AGPL-3.0 and will remain free forever.

The project's secondary thesis is **scientific illuminism**: that systematic recording of magical practice — entities, timing, conditions, outcomes — yields insight when analyzed across time, across magicians, and across traditions. Theourgia provides the substrate for that work.

## 2. Project Identity

- **Name:** Theourgia
- **Domain:** theourgia.com (Squarespace-registered, Cloudflare-proxied, origin on Hetzner)
- **License:** AGPL-3.0
- **Repository:** GitHub (org/repo TBD)
- **Primary maintainer:** [@SAntonopoulou](https://github.com/SAntonopoulou)
- **Audience:** Practicing magicians — Thelemites, chaos magicians, Greek theurgists, witches, Hermeticists, ceremonialists, folk practitioners, and adjacent traditions

## 3. Guiding Principles

1. **Practitioner-grade depth.** Every feature must be deep enough that a serious practitioner won't outgrow it in a year.
2. **Data sovereignty.** The magician owns their data, period. Local-first sync, user-choice encryption, exportable everything.
3. **No deferred features.** All features in scope are planned upfront. Phases reflect *architectural dependencies*, not feature triage.
4. **Quality over speed.** No MVP rush. Spec, build, test, document. Then move.
5. **Extensible by design.** Plugin architecture from day one. Other magicians will fork, extend, and contribute.
6. **Security as foundation.** Encryption, auth, and threat modeling are first-class deliverables, not afterthoughts.
7. **Tradition-respectful.** Terminology, structures, and defaults respect tradition-specific practice. The product does not flatten Thelema, theurgia, chaos magic, and witchcraft into a generic stew.
8. **Documentation is product.** Self-hosters and contributors are first-class users.

## 4. Scope — Full Feature Catalog

This is the complete agreed feature set. Every feature listed here has a home in a phase plan. None are deferred.

### Time, Calendars & Cosmology
- Multi-calendar overlays (Gregorian, Ancient Greek, Thelemic, Hindu/Vedic, Coptic, Hebrew, Mayan, Egyptian decanic — extensible)
- Astrological positioning notation for all entries and ritual planning
- Multi-tradition astrology engines (Western tropical, Hellenistic whole-sign, Vedic sidereal with ayanāṃśa selection)
- Planetary hours with location awareness
- Lunar phases, void-of-course moon, eclipses, ingresses, retrogrades
- Wheel of the year (Sabbats), Greek festival calendar (Anthesteria, Thesmophoria, Pyanepsia, etc.)
- Liber Resh tracker (4× daily adorations at sunrise / noon / sunset / midnight, per latitude)
- Hekate's Deipnon (monthly dark-moon offering)
- Tradition-specific reminders (festivals, saints' days, founders' days, planetary days)
- **Astrological election finder:** "find me the best 3-hour window in the next 90 days for a Venus invocation, weighted by my dignity rules, avoiding void Moon"

### Journal & Authoring
- Rich-text editor (Tiptap-based) with custom magical content blocks
- Drag-and-drop entry templates (Themeco-Pro-style visual composition)
- Multi-calendar / astrological auto-stamping on every entry
- Per-entry visibility: public / network-shared / private viewer-only / personal-private
- Flexible tagging
- Multi-modal search (full-text + semantic + gematric)
- Body sensation diagram (interactive SVG silhouette)
- Audio recording attached to entries (chants, voces magicae, ambient)
- Image upload, annotation, embedding
- `/quote` slash command — inline search and auto-cite from personal library catalog
- Magical Record (Crowley-style structured journal) as a built-in template
- Version history on entries
- Markdown / PDF / EPUB / print-ready export per entry or selection
- Print-ready ritual sheet generator (script + correspondences sidebar)

### Magical Beings & Relationships
- Spirit / god / demon / angel / saint tracker
- Per-entity: portraits, seals, attributions (planetary, elemental, sphere, decan), epithets, languages
- Offerings ledger (date, item, intention, perceived reception)
- Contracts / pacts (terms, expiration, fulfillment status — both parties)
- Invocation history (linked entries, success rating)
- Signs and synchronicities received
- **Beloved dead / ancestor registry** (names, dates, relationships, offerings, communications — for Greek necromantic and ancestor work)
- **Oath / vow ledger** (separate from entity contracts — vows to self, traditions, bodies, deities; renewal dates)
- **Initiation / grade tracker** (default zero-knowledge encrypted; tradition-aware; for OTO and other initiatory bodies)
- **Library catalog** (books owned, shelf location, reading status, personal notes, page-level highlights)
- **Reading queue / curriculum builder** ("I'm working through Liber Aleph this year")

### Divination
- Tarot engine: multiple bundled public-domain decks (Rider-Waite-Smith, Marseille, Sola Busca, Etteilla)
- User-created decks with uploadable art, custom card meanings, custom suits
- Community deck sharing (network and public registries)
- Custom spread builder (drag-and-drop card layouts with positional meanings)
- Reading sessions: question, deck, spread, drawn cards, interpretation, retrospective rating
- Readings linkable to entries, entities, and workings
- I Ching (hexagram generation, lookup, personal interpretations over time)
- Geomancy (four-element divination with formal generation rules and figure interpretations)
- Runes (Elder Futhark, Younger Futhark, Anglo-Saxon, Armanen — extensible)
- Pendulum tracker (questions, answers, accuracy retrospective)
- Bibliomancy (random verse from selected texts in library)
- Horary astrology (chart cast for the moment of question)
- **Scrying log** (water-bowl, black mirror, crystal, fire, smoke, ink-in-water — with ambient conditions, sketch upload, optional trance-mode UI)

### Practice & Ritual Logs
- Ritual template library (built-in classics + custom)
- Dream journal with symbol indexing (linked to entities, themes)
- Pathworking log (Tree of Life journeys, paths walked, notes)
- Asana / pranayama tracker (Liber E style timing and notes)
- Banishing / grounding / centering log
- Servitor & egregore management (birth, naming, feeding schedule, task assignment, retirement)

### Workshop & Generators
- **Sigil generator** with multiple modes:
  - Spare letter-elimination (classic)
  - Kamea pathing (intention traced through planetary magic square)
  - Rose Cross cipher / Pythagorean rosette / custom letter wheels
  - Hashed-vector deterministic (hash → seed → parametric curve)
  - Harmonograph / Lissajous (gematria values as oscillator frequencies)
  - User-supplied parametric formula (`r = f(θ, gematria, time)`)
  - Freeform vector drawing + upload
- All sigils SVG-exportable for carving, printing, etching
- Magic squares (Kamea) for the seven traditional planets
- Talisman designer (combine seal + square + names + colors + bordering script)
- **Magical circle builder** (concentric rings, multi-language script around the rim, planetary glyphs, names of God, quarter symbols, custom seals, scale-accurate SVG)
- Tool / altar registry (every magical tool: consecration date, materials, history, photos)
- Audio recording for voces magicae and chants, linked to rituals

### Linguistic Tools
- Gematria across ciphers (Greek isopsephy, Hebrew gematria, English Qabalah, ALW, etc.) — extensible cipher library
- **Cross-journal gematria search** ("show me all entries containing phrases summing to 418")
- Transliteration (Greek ↔ Latin, Hebrew ↔ Latin, Sanskrit ↔ Latin, etc.)
- Voces magicae reference library
- Pronunciation guides with audio (community-contributable)
- UI internationalization framework (English at launch; community translations welcome)

### Body & State
- Body sensation diagram (clickable front/back/side SVG with marker placement, sensation type color-coding, timestamped notes)
- Mood / energy / health snapshots at time of ritual
- State data correlated with workings in analytics

### Synchronicity & Analytics ("Scientific Illuminism")
- **Synchronicity log:** quick-capture entries auto-tagged with current astrological / planetary / lunar / weather data
- Multi-axis tagging: entity, intention, planetary hour, lunar phase, location, weather, body/mood, outcome (subjective, manifest, time-to-manifest)
- Query builder UI (Notion-style filter chains)
- Visualizations (charts, heatmaps, timelines, correlation matrices)
- Pattern detection (statistical surfacing of recurrences)
- **Cross-magician aggregate analytics** (opt-in, anonymized, network-scoped) — for collective study

### Correspondences & Reference
- Personal correspondence tables (user-created, not pre-filled)
- CSV import for existing correspondence systems (777, Skinner, etc.)
- Personal grimoire (writings, spells, rituals, formulae)
- Recipe builder (incense, oils, washes, philtres)
- Personal databases for herbs, stones, incense, colors, sounds — "what I have in my cabinet" view

### Publishing & Monetization
- Book catalog (metadata, cover art, editions)
- PDF / EPUB display + download (in-browser reader)
- **Stripe integration** for paid distribution (user's own books, user's own Stripe account)
- Free distribution option per title
- **Newsletter system** (individual newsletters, network-curated newsletters)
- Subscriber management
- RSS / Atom feeds
- Comments with moderation on public content
- Self-hosted blog under each magician's vault subdomain or path

### Media Library
- Image gallery with EXIF stripping for privacy
- Audio library (chants, recordings, ambient)
- Video integration: YouTube embeds + optional self-hosted (Cloudflare Stream / Mux)
- Per-asset visibility controls
- **Pilgrimage / sacred site log with map** (privacy-gated; coordinates obfuscated on public view)

### Federation & Networks
- **Theourgia native federation protocol** (signed HTTP messages, capability tokens) — practitioner-private layer
- **Network hubs:** group/order/sodality shared spaces with their own public face
- One instance can host vaults (personal) and hubs (group) simultaneously
- Selective per-entry sync between vaults and hubs
- Multi-network membership per magician
- Private viewer accounts (magician-issued credentials for trusted readers)
- Network curation tools (admins/officers can review submitted content, compile newsletters, manage member access)
- **Group ritual coordinator** (cross-timezone scheduling with local planetary hours displayed per participant; shared logs and recordings post-ritual)
- **ActivityPub integration** for public broadcast layer (Fediverse interop) — public content can be followed from Mastodon and other AP servers

### Security & Identity
- User-choice encryption per content item: server-side at rest OR zero-knowledge client-side
- Explicit warnings + recovery flows for zero-knowledge mode
- TOTP 2FA with QR code provisioning + backup codes
- Optional WebAuthn / passkey support
- Granular access control (per-entry, per-collection, per-viewer)
- Session management with device list and revocation
- Comprehensive audit log (per-vault, viewable by owner)
- Threat-modeled API surface
- Regular security review process

### Plugin Ecosystem
- Plugin SDK with stable API contract
- Plugin sandboxing (capability-restricted)
- Plugin registry (community submissions, signed releases, vulnerability disclosure process)
- Examples covering all major extension points (new divination systems, new calendars, new ciphers, new sigil modes, new exporters)
- Documentation: tutorials, API reference, design patterns

### Self-Hosting & Operations
- Docker Compose primary deployment
- Hetzner-optimized reference configs
- Caddy reverse proxy reference config (Traefik supported as alternative)
- Database backup / restore tooling
- Migration tooling (zero-downtime where feasible)
- Monitoring stack (Prometheus + Grafana reference dashboards)
- Health checks and operational runbooks

## 5. Phasing Philosophy

Phases reflect **architectural dependencies**, not feature priority. Every feature in §4 has a home. Phases ship sequentially; each phase produces working, tested, documented code before the next begins.

A phase is **done** when it meets its Definition of Done (in the phase plan), including:
- All code reviewed, typed, tested
- Documentation written
- Security implications addressed
- Migration story clear
- ADRs filed for non-obvious decisions

## 6. Phase Index

| # | Phase | Depends on | Plan |
|---|-------|-----------|------|
| 00 | Foundations (repo, CI/CD, docs, dev env) | — | [plan/00-foundations.md](plan/00-foundations.md) |
| 01 | Core Architecture (DB, auth, plugins, encryption, API) | 00 | [plan/01-core-architecture.md](plan/01-core-architecture.md) |
| 02 | Frontend Foundations (Astro, React admin, Tiptap, theming) | 00, 01 | [plan/02-frontend-foundations.md](plan/02-frontend-foundations.md) |
| 03 | Time & Cosmos (calendars, astrology, planetary hours, election finder) | 00, 01 | [plan/03-time-and-cosmos.md](plan/03-time-and-cosmos.md) |
| 04 | Journaling (entries, templates, search, body diagram, library, quote insert) | 00–03 | [plan/04-journaling.md](plan/04-journaling.md) |
| 05 | Magical Beings (entities, offerings, contracts, ancestors, oaths, initiations) | 00–04 | [plan/05-magical-beings.md](plan/05-magical-beings.md) |
| 06 | Divination & Practice Logs (tarot, I Ching, geomancy, runes, scrying, servitors) | 00–05 | [plan/06-divination-and-practice.md](plan/06-divination-and-practice.md) |
| 07 | Workshop (sigils, magic squares, talismans, circles, tool registry) | 00–02 | [plan/07-workshop.md](plan/07-workshop.md) |
| 08 | Linguistic Tools (gematria, transliteration, voces magicae) | 00–02 | [plan/08-linguistic-tools.md](plan/08-linguistic-tools.md) |
| 09 | Synchronicity & Analytics (capture, tagging, query builder, viz) | 00–06 | [plan/09-synchronicity-and-analytics.md](plan/09-synchronicity-and-analytics.md) |
| 10 | Publishing & Monetization (books, Stripe, newsletters, RSS) | 00–04 | [plan/10-publishing-and-monetization.md](plan/10-publishing-and-monetization.md) |
| 11 | Media Library (images, audio, video, pilgrimage map) | 00–04 | [plan/11-media-library.md](plan/11-media-library.md) |
| 12 | Federation (native protocol, network hubs, group ritual coordinator) | 00–11 | [plan/12-federation.md](plan/12-federation.md) |
| 13 | ActivityPub (Fediverse interop, public broadcast) | 12 | [plan/13-activitypub.md](plan/13-activitypub.md) |
| 14 | Plugin Ecosystem (SDK polish, registry, docs, examples) | 00–13 | [plan/14-plugin-ecosystem.md](plan/14-plugin-ecosystem.md) |
| 15 | Hardening & Launch (a11y, perf, security audit, ops, marketing) | all | [plan/15-hardening-and-launch.md](plan/15-hardening-and-launch.md) |

## 7. Cross-Cutting Concerns

These threads run through every phase and are reviewed continuously:

- **Security.** Threat models updated per phase; private content flows reviewed; cryptographic choices documented.
- **Accessibility.** WCAG 2.2 AA target. Keyboard navigation, screen reader support, color contrast, motion sensitivity.
- **Internationalization.** UI strings extracted from day one. Right-to-left support for Hebrew/Arabic content. Greek and Hebrew typography correctness.
- **Performance.** Page weight budgets; database query budgets; image/asset optimization.
- **Privacy.** No third-party trackers ever. No telemetry by default. EXIF stripped on upload. Map coordinates obfuscated for public views.
- **Documentation.** Every phase ships with user docs, admin docs, and developer docs.
- **Testing.** Unit, integration, and end-to-end coverage. Property-based tests for cipher and astronomy code.
- **Decision records.** Non-obvious decisions captured as ADRs in `docs/adr/`.

## 8. Resolved Decisions

The initial open questions have been answered. These are now firm constraints.

1. **Internationalization:** **Full i18n from day one.** Every string extractable, every script supported, RTL-correct, locale-aware date/number/currency formatting. No "English first, translate later." See [plan/02-frontend-foundations.md](plan/02-frontend-foundations.md) and [plan/08-linguistic-tools.md](plan/08-linguistic-tools.md).
2. **Mobile strategy:** Responsive web + installable PWA. Native mobile apps are **planned for after launch** (post-1.0 roadmap), not initial scope.
3. **Telemetry:** **Zero telemetry, ever.** Not at install time, not at runtime, not opt-in, not "anonymized." The privacy posture is treated as a **marketable feature** — surfaced explicitly on theourgia.com, in the README, and in docs. No analytics scripts ever ship with Theourgia.
4. **Hosted SaaS:** Likely future feature; AGPL hosting monetization is non-trivial and needs design work. Out of initial scope. Revisit after federation matures.
5. **Backups, hosting, and CDN:**
   - **Cloudflare R2 (or S3-compatible) backup integration must ship from day one** — not deferred to launch hardening. Backups are foundational, not polish.
   - Cloudflare is the recommended CDN for theourgia.com.
   - **Self-hosters who do not want Cloudflare** get a fully local stack: Caddy reverse proxy with built-in caching, internal Redis. **Redis must never be externally exposed** — internal network bind only, enforced in the reference docker-compose.
   - CDN strategy is a first-class launch concern, documented for both paths.
6. **Code of Conduct:** Contributor Covenant 2.1 adapted to the project's tone — protective of contributors, but with an **explicit clause respecting divergent magickal practice**. Per Crowley, "we cannot become a centre of pestilence" — diverse traditions, methods, and opinions must coexist. The CoC moderates behavior, not belief; we will not pass judgment on others' magick. (Within human-decency limits and applicable law.)
7. **Repository organization:** **Single monorepo.** Frontend + backend + docs + reference plugins. Easier for self-hosters; easier for contributors.
8. **GitHub:** Repo created under user **`SAntonopoulou`**. Project name confirmed: **`theourgia`**. All commits, PRs, and issues attributed to SAntonopoulou.

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

## 10. Companion Documents

- [ARCHITECTURE.md](ARCHITECTURE.md) — system architecture, trust model, data flow, deployment topology, technology choices
- [note_to_design_claude.md](note_to_design_claude.md) — design system handoff
- Per-phase plans in [plan/](plan/)
