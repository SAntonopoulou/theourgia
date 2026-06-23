# Theourgia — Feature Catalog

> **Canonical source of truth for what's in scope.** Every feature in this project has a home here. Status icons indicate current state; phase references link to the implementation plan.

## How to read this document

- **Status**: `[ ]` planned / `[~]` in progress / `[x]` done
- **Phase**: link to the phase plan where the feature is built
- Inline notes capture intent, rationale, or constraints that must survive context loss
- See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the phase index, [ARCHITECTURE.md](ARCHITECTURE.md) for the system design

## Phase Status Snapshot (2026-06-22)

> **🎨 H05 sprint closed today.** Phase-07 Workshop frontend is end-to-end (6 surfaces · 6 SVG engines · 545 storybook baselines). Phase-07 backend (Alembic + REST) is unbuilt by design — the H05 `.dc.html` files informed the schema. Further frontend progress on Phases 08-09 (Linguistic · Analytics) requires the next designer handoff. See [`docs/design-requests/2026-06-22-h05-workshop.md`](docs/design-requests/2026-06-22-h05-workshop.md) (H05 closed) and the pipeline doc for upcoming tiers.

This is the **section-level rollup**; per-checkbox detail still lives below. For granular per-batch status, read the `plan/0X-batch-*.md` files (each batch has its own plan doc with tests + DoD).

| Phase | Plan | Status | What landed |
|---|---|---|---|
| 00 | [Foundations](plan/00-foundations.md) | ✅ done | Monorepo, CI scaffolding (pared down until v1), dev env, docs site shell |
| 01 | [Core Architecture](plan/01-core-architecture.md) | ✅ done | DB substrate, auth (sessions + TOTP + WebAuthn), encryption (Mode A + Mode B), backups (Restic + R2), API skeleton, RLS, observability |
| 02 | [Frontend Foundations](plan/02-frontend-foundations.md) | ✅ done | Total design-fidelity rewrite (admin SPA · public site · shared design system · Starlight docs), Storybook + visual regression + axe-core WCAG 2.2 AA gate, PWA (manifest + offline + /capture) |
| 03 | [Time & Cosmos](plan/03-time-and-cosmos.md) | ✅ backend + H01 primitive coverage | Swiss Ephemeris attribution shipped, multi-calendar engine (Hebrew Reingold/Dershowitz, Hijri, Mayan, Julian via Meeus, Thelemic, Coptic, Hellenic), planetary hours, Liber Resh substrate + API, festivals, election finder. B56-B60 primitive coverage complete — see Phase 03 primitives table below. |
| 04 | [Journaling](plan/04-journaling.md) | ✅ backend + H02 primitive coverage | Entry expansion (17 kinds + revisions + visibility + encryption), Postgres FTS + sealed-excluded honesty, templates (12 built-ins), library catalog (BibTeX/RIS), multi-identity + blog + scheduled publication, body/audio substrate. B61-B66 primitive coverage complete · Batch 36 (Print + bulk export) folded in via B66 — see Phase 04 primitives table below. |
| 05 | [Magical Beings](plan/05-magical-beings.md) | ✅ backend + H03 primitive coverage | Entity expansion + alias-graph, offerings + recurring, contracts + obligations, oaths (default sealed), initiations (sealed-only), servitors + tasks, lineage attestations + Ed25519 counter-sign, API CRUD + scheduler. **B67-B75 primitive coverage complete** — BulkActionBar · OfferingTimelineCard · ActivePracticeCard · ContractListItem · ContractStatusPill · OathCard · OathStatusPill · InitiationListItem · InitiationStatusPill · SealedContentsBlock · ServitorListItem · ServitorStatusPill · ServitorTaskCard · EdgeKindLegend · AttestationKindBadge · AttestationListItem · TodayLedgerCards. |
| 06 | [Divination & Practice](plan/06-divination-and-practice.md) | ✅ backend + H04 frontend coverage | Tarot (PD Rider-Waite-Smith + 5 spreads), I Ching (64 King-Wen + coin/yarrow + transformation), Geomancy (16 figures + cascade + 12-house chart), Runes (Elder Futhark + symmetric handling), Pendulum/Bibliomancy/Horary/Scrying, body practice + banishing logs + Tree of Life paths. **B76-B86 H04 sprint complete**: 5 Phase-06 surfaces + Daily Practice Tracker (Tier 1) + Practice Logs cross-cutting surface. OracleTabs nav · new tokens (`--skip*`, `--trance`, `--font-cjk`, `--font-rune`, `--ot-*` family). |
| 07 | [Workshop](plan/07-workshop.md) | 🎨 frontend complete · backend pending | Sigil generator (11 modes incl. Spare · Kamea · Hashed-vector · Harmonograph · sandboxed Parametric formula), magic squares (7 Agrippa planetary fixtures + custom builder), talisman designer (composite with name-rings + kamea embeds + sealed save), magical circle (rings + compass + centre + print-tile), tool registry (14 kinds + altars), voces magicae (recording capture). **B89-B96 H05 sprint complete**: 6 Workshop surfaces + 6 SVG engines (workshop/). Backend authoring (Alembic + REST) lands in a follow-up sprint — Phase 07 was designer-first by design. |
| 08 | [Linguistic Tools](plan/08-linguistic-tools.md) | 🎨 planned · design queued ([request](docs/design-requests/2026-06-22-post-h01-h03-pipeline.md#tier-4--phases-08--09-backend-not-yet-started-design-lands-when-capacity-allows)) | Gematria (multi-cipher), transliteration, voces magicae |
| 09 | [Synchronicity & Analytics](plan/09-synchronicity-and-analytics.md) | 🎨 planned · design queued ([request](docs/design-requests/2026-06-22-post-h01-h03-pipeline.md#tier-4--phases-08--09-backend-not-yet-started-design-lands-when-capacity-allows)) | Tagged capture, query builder, viz; needs 00-06 |
| 10 | [Publishing & Monetization](plan/10-publishing-and-monetization.md) | ⏳ planned | Stripe Connect, subscriptions, print-quality typography |
| 11 | [Media Library](plan/11-media-library.md) | ⏳ planned | Image / audio / video / iCal feeds / pilgrimage map |
| 12 | [Federation](plan/12-federation.md) | ⏳ planned | Native protocol, hubs, group ritual, SSO |
| 13 | [ActivityPub](plan/13-activitypub.md) | ⏳ planned | Fediverse interop |
| 14 | [Plugin Ecosystem](plan/14-plugin-ecosystem.md) | ⏳ planned | SDK + registry + sandbox-before-commit |
| 15 | [Hardening & Launch](plan/15-hardening-and-launch.md) | ⏳ planned | GDPR audit, a11y final pass, perf, inheritance / memorial |
| 16 | [AI Agent Integration](plan/16-ai-agent-integration.md) | ⏳ planned | Daskalos-pattern daemon + MCP, BYO keys |

**Backend tests: 1473 passing · Alembic chain at 0032.**
**Frontend shared tests: 1722 passing · Visual regression: 557/557 (gate restored 2026-06-23 — see B101). · axe-core WCAG 2.2 A+AA: 543/557 — 97.5% (was 286→73→14 after B102 lineage; residual 14 are intentional design tradeoffs — color-mix muted-on-muted fades + brand-colour text labels).**
**H01-H03 sprint: 71 primitives across 22 modules. H04 sprint: 7 designed surfaces + Daily Practice Tracker · 7 headless divination engines · 6 new design tokens. H05 sprint: 6 Workshop surfaces + 6 SVG engines (sigil generators · magic-square constructors · sandboxed evalFormula · nameRingPath · centreSymbol · printTiles).**

### H01-H03 sprint — complete (2026-06-22)

The H01-H03 frontend wiring sprint closes Phases 03/04/05 by shipping the 21 designer surfaces against the existing backend. All four waves landed; the sprint is **closed**.

| Wave | Range | Status | Primitives delivered |
|---|---|---|---|
| Foundation | B50-B55 | ✅ done | BeingsTabs · SealUnlock family · ItemsComposer · ReceptionSelector · AutoStampChip · ObligationTable · BindingKindIcon · Signing family (PublicKeyShort · CanonicalBytes · SignatureRoster · SignDialog · RevokeDialog) · RelationshipStatusPill · KindFunctionFilter · EntityCard · AliasGraph · BodySilhouette · SensationConfig · ExportPreview |
| Phase 03 surfaces | B56-B60 | ✅ done | MultiCalendarCard · LunarPhaseWidget · PlanetaryHourStrip · PlanetaryHourDetail · MonthGrid · FestivalDetail · CitationKindBadge · FestivalTraditionChip · ReshStationCard · ReshStreakGrid · ReshNextAdoration · SunArcDiagram · ProductScoringCallout · ElectionResultCard · ElectionRecipeCard |
| Phase 04 surfaces | B61-B66 | ✅ done | BlockGlyph · TemplateBlockCard · TemplateBlockPalette · TemplateTokenChip (+ 20-kind catalog) · HighlightedText · SearchHitCard · SealedExcludedCallout · VisibilityControl · VisibilityDowngradeDialog · SealEntryDialog · BookRow · BookStatusBadge · QuoteCard · ReadingListCard · SensationTypeGrid · BodyMarkerLegend · ExportFormatPicker · SealedExportNotice |
| Phase 05 cluster | B67-B75 | ✅ done | BulkActionBar · OfferingTimelineCard · ActivePracticeCard · ContractListItem · ContractStatusPill · OathCard · OathStatusPill · InitiationListItem · InitiationStatusPill · SealedContentsBlock · ServitorListItem · ServitorStatusPill · ServitorTaskCard · EdgeKindLegend · AttestationKindBadge · AttestationListItem · TodayLedgerCards (+ TodayLedger types + getTodayLedger endpoint + admin Today.tsx wiring) |

---

## 1. Time, Calendars & Cosmology

Implementation phase: **[03 — Time & Cosmos](plan/03-time-and-cosmos.md)**

- [ ] **Multi-calendar engine** — pluggable `Calendar` interface; built-in calendars: Gregorian, Julian, Hebrew, Hindu (Vikram Samvat, Shaka, regional variants), Coptic, Islamic (Hijri), Thelemic (Anno IVxxx + Old Style / Era Vulgaris), Ancient Greek (Attic with archon years), Mayan (Long Count + Tzolkin + Haab), Egyptian decanic, French Republican; extensible via plugin
- [ ] **Multi-tradition astrology engines** — Swiss Ephemeris bedrock; Western tropical with modern aspects/rulerships; Hellenistic whole-sign with sect, dignities, time-lord techniques (zodiacal releasing, profections, ascensions); Vedic sidereal with selectable ayanāṃśa (Lahiri, Krishnamurti, Fagan-Bradley, Raman, Yukteshwar), vargas, nakshatras, Vimshottari dasha
- [ ] **Multiple house systems** — Placidus, Koch, Regiomontanus, Campanus, Equal, Whole Sign, Porphyry, Alcabitius, Sripati
- [ ] **Planetary hours** — sunrise/sunset based, location-aware, Chaldean order, current + upcoming hour table
- [ ] **Lunar phase + VOC moon** — phase, illumination %, void-of-course detection
- [ ] **Astronomical event stream** — eclipses, ingresses, retrogrades, stations, major aspects; pre-computed ±50yr from current date
- [ ] **Festival overlays** — Wheel of the Year (Sabbats with regional variants), Greek festival calendar (Anthesteria, Thesmophoria, Pyanepsia, Eleusinia, Bouphonia), Hekate's Deipnon + Noumenia, Thelemic feasts, Roman religious calendar (Calendar of Numa), Egyptian decanal feast days, Hindu festivals, custom user-defined
- [ ] **Liber Resh tracker** — sunrise/noon/sunset/midnight at user latitude; transition notifications; streak tracking; tradition-specific formula variants
- [ ] **Astrological election finder** — constraint-based forward search through the ephemeris; multi-tradition scoring; saved electional queries; example pre-built queries for common workings

## 2. Journal, Authoring & Blog

Implementation phase: **[04 — Journaling](plan/04-journaling.md)** (with blog and time-released content extensions)

### Core journaling
- [ ] **Unified entry model** with discriminator: note, ritual_log, divination, dream, synchronicity, working, magical_record, pathworking, scrying, body_practice, meeting_note, study_note, liber_resh, blog_post, plugin-defined
- [ ] **Auto-stamping** of every entry with multi-calendar date, astrological snapshot, weather, location (opt-in), body state
- [ ] **Per-entry visibility**: personal / viewer / network:{hub_id} / public / sealed
- [ ] **Flexible tagging** + tradition tags
- [ ] **Version history** with diff browsing and revision restore
- [ ] **Multi-modal search** — Postgres FTS + pgvector semantic + cross-cipher gematria
- [ ] **Magical Record (Crowley structured)** as a first-class built-in template

### Editor (Tiptap)
- [~] **Custom magical blocks**: `ritualLog` · `quoteCitation` · `gematria` · `sensation` · `entityRef` · `sigil` · `chart` · `divination` shipped live (B97 + B99a); `correspondence` · `calendarStamp` · `voiceRecording` · `voxMagicae` queued (B99b + later substrate batches)
- [~] **Inline foreign-script marks**: `lang` mark with `el` · `he` · `en` scripts shipped (LangMark · B97); `latin` · `sanskrit` · `arabic` · `coptic` are font-token aliases of the same mark
- [~] **Slash commands**: `/sigil` · `/quote` · `/gematria` · `/entity` · `/sensation` · `/ritual` · `/chart` · `/tarot` · `/iching` shipped (B97 + B99a); `/voce` · `/geomancy` · `/runes` queued
- [ ] **Multi-language input methods** — software keyboard for polytonic Greek, Hebrew with niqud, IAST Sanskrit; romanization-to-script autocompletion

### Templates
- [ ] **Built-in templates** — Magical Record, Ritual Log, Dream, Divination, Synchronicity, Liber Resh, Banishing, Invocation, Scrying, Tarot Reading, Pathworking, Astrology Reading
- [ ] **Drag-and-drop template designer** — Themeco-Pro-style visual composer with section/row/column layout, block insertion palette, per-block configuration, save-as-template flow
- [ ] **Template portability** — JSON-serializable, exportable, importable across instances

### Body sensation diagram
- [ ] **Interactive SVG silhouettes** — front/back/side/palm/sole; gender-neutral with multiple morphology options
- [ ] **Marker placement** with sensation type, intensity, color, per-marker notes
- [ ] **Body history view** — timeline scrubber across all snapshots

### Quote & autocite
- [ ] **`/quote` slash command** — inline search across personal library quotes
- [ ] **Inserted quotation blocks** with full citation (book, edition, page, language)
- [ ] **Configurable citation format** (Chicago, MLA, custom)

### Audio attachments
- [ ] **In-app recording** with waveform display
- [ ] **Optional local Whisper transcription** (opt-in, multiple model sizes)
- [ ] **Per-vault storage quotas**

### Blog (distinct from diary)
- [ ] **General blog platform** — regular blog posts separate from magical record entries
- [ ] **Post types**: article, photo, link, quote, video embed
- [ ] **Per-post status**: draft / scheduled / published / archived
- [ ] **Multi-author** (when multiple identities are in use on one vault)
- [ ] **RSS/Atom/JSON Feed** for the blog stream
- [ ] **Comments with moderation** (per-post opt-in)

### Time-released content
- [ ] **Scheduled publication** for any entry / blog post / publication / newsletter issue
- [ ] **Posthumous publication** — entries marked for release after digital-inheritance trigger
- [ ] **Curriculum unlocking** — content unlocks for subscribers on specific dates ("lesson unlocks Beltane 2027")

### Library catalog (entry-anchoring spine)
- [ ] **Books**: title, author, edition, publisher, year, ISBN, holdings (physical/digital/audiobook), shelf location, status (owned/read/reading/want), tags, language(s), tradition tags
- [ ] **Per-book notes** (rich text)
- [ ] **Quote extraction** with page reference and optional page image
- [ ] **Import flows** — BibTeX, RIS, manual, ISBN lookup (Open Library)
- [ ] **Export** — BibTeX, CSV, JSON
- [ ] **Reading queue / curriculum builder** — ordered reading plans with progress, target dates

### Print & export
- [ ] **Per-entry export** — PDF, Markdown, HTML, EPUB
- [ ] **Bulk export** — a year's journal as bound PDF; a tag collection as EPUB
- [ ] **Print-ready ritual sheets** — script + correspondences sidebar + step-by-step instructions
- [ ] **Print-quality book typography** — true print-grade PDF with bleed, crop marks, embedded fonts, drop caps, true small caps, ligatures, oldstyle figures, footnote management, auto-index, auto-glossary, auto-TOC
- [ ] **Print-on-demand format support** — Lulu, BookBaby specifications

## 3. Magical Beings, Relationships, Lineage

Implementation phase: **[05 — Magical Beings](plan/05-magical-beings.md)**

### Entity model — alias-graph approach
- [ ] **Entities as immutable nodes** — id, origin (personal / imported_from_bundle_X / created), tradition_tags, canonical_name; never overwritten by imports
- [ ] **Typed alias relationships** — `same-as`, `aspect-of`, `aspect-includes`, `syncretic-with`, `epithet-of`
- [ ] **Unified-view queries** — user-defined named unions (e.g., `Hekate-all`) showing merged offering history, contracts, sigils across linked entities
- [ ] **Workings/offerings/contracts always attach to specific entity_id** — never to the unified view; write-time intent preserved
- [ ] **Import-time alias prompting** — on import, ask user how to relate to existing same-named entities; default to `distinct`

### Per-entity dossier
- [ ] **Identity**: name + alternate spellings, epithets, pronouns/gender, kind (god/goddess/spirit/daemon/angel/demon/saint/ancestor/familiar/servitor/egregore/beloved-dead/other), tradition tags
- [ ] **Visual**: portrait, seal, generated sigil
- [ ] **Attributions**: planetary, elemental, sphere, decan, day, hour, color, scent, herb, stone, sound, number (cross-references to correspondence tables)
- [ ] **Notes**: summary, description (rich text), notes_private, notes_shareable

### Offerings, contracts, oaths
- [ ] **Offerings ledger** — date, location, items (wine, water, milk, honey, incense, food, flowers, libation, blood, breath, song, dance, money, time, custom), intention, reception perceived, astro/calendar snapshot
- [ ] **Recurring-offering scheduler** (e.g., "Hekate's Deipnon, monthly")
- [ ] **Contracts / pacts** — terms, both-sides obligations with fulfillment status, expiration, witnesses, binding kind, dissolution ritual reference
- [ ] **Oath / vow ledger** — kind (self/tradition/body/deity/partner), text, taken_at, expires, status, accountability checkpoints; **default sealed (zero-knowledge)**
- [ ] **Initiation / grade tracker** — tradition, grade, received_at, location, initiator, oaths taken, experience notes; **default sealed; UI hard-prevents publishing**

### Ancestor / beloved-dead registry
- [ ] **Per-ancestor profile** — name, dates lived, relationship, cause of death (private), burial place, photo
- [ ] **Communication log** — special divination/scrying entries for ancestor contact (Greek folk necromantic practice)
- [ ] **Lightweight family tree visualization** (no integration with genealogy services for privacy)

### Servitors and egregores
- [ ] **Servitor lifecycle** — birth (linked to creation ritual), naming, feeding cadence, feeding method, tasks (with status), lifespan limit, status (active/dormant/retired/decommissioned)
- [ ] **Egregore (group-collaborative)** — kind=egregore, members linking to multiple human collaborators (federated for hub-level group work)
- [ ] **Feeding reminders** (in-app notifications)
- [ ] **Retirement / decommissioning ritual flow**

### Lineage attestation + verification
- [ ] **Per-magician lineage display** — declarable initiations, teachers, granted degrees
- [ ] **Counter-signing** — an authority (e.g., OTO lodge master) can cryptographically sign an attestation about another magician's affiliation; signatures verifiable against authority's public key
- [ ] **Public verification UI** — anyone viewing a magician's lineage can verify signatures
- [ ] **Trust webs without central authorities** — no global registry; verification is peer-to-peer

## 4. Divination

Implementation phase: **[06 — Divination & Practice Logs](plan/06-divination-and-practice.md)**

### Tarot
- [ ] **Bundled public-domain decks**: Rider-Waite-Smith, Marseille (multiple historical), Etteilla, Sola Busca
- [ ] **Per-card data** — deck, position, suit/arcana, name (per-language), traditional meaning, upright/reversed (user-editable), correspondences (planetary, elemental, decan, Hebrew letter, Tree-of-Life path)
- [ ] **Custom deck creation** — user-built decks with uploaded art, per-card editor with all meaning fields, preview
- [ ] **Community deck sharing** — within networks, or publicly (with explicit copyright affirmation)
- [ ] **Built-in spreads** — single card, three-card, Celtic Cross, Tree of Life, Year Ahead, etc.
- [ ] **Custom spread designer** — drag-and-drop card positions on canvas, per-position meaning
- [ ] **Reading sessions** — question, querent, deck, spread, draw method (mental shuffle / physical / hash-of-question / browser RNG), drawn cards with reversals, interpretation, retrospective outcome rating
- [ ] **Readings linkable** to entries, entities, workings
- [ ] **Personal owned-deck helper** — private mode for layering hand-traced art from decks the user owns; not shareable, not exportable, explicit owned-copy confirmation

### Other divination systems
- [ ] **I Ching** — coin-toss + yarrow-stalk generation; all 64 hexagrams with multiple translations (Wilhelm/Baynes, Cleary, Karcher, Legge); changing lines; transformation hexagrams; user-editable interpretation notes
- [ ] **Geomancy** — sixteen figures with rulerships; multiple generation methods; mothers→daughters→nieces→witnesses→judge cascade; twelve-house chart casting; interpretation aids (figure dignities, perfection, ways)
- [ ] **Runes** — Elder Futhark, Younger Futhark, Anglo-Saxon Futhorc, Armanen, Northumbrian; per-rune meanings; spreads incl. bind-rune designer
- [ ] **Pendulum** — quick capture with response (yes/no/maybe/no-response), confidence, calibration log, optional pendulum-board mode
- [ ] **Bibliomancy** — random verse/passage from selected library texts; configurable selection method
- [ ] **Horary astrology** — chart cast at moment of question, Hellenistic interpretation guide

### Scrying
- [ ] **Mode selector** — water bowl (incl. Greek black bowl), black mirror, crystal, fire, smoke, ink-in-water, candle flame, other
- [ ] **Pre-session capture** — ambient conditions (light, sound, time, weather, planetary hour), preparatory ritual, intention, entity invoked
- [ ] **Trance mode UI** — full-screen minimal chrome, low blue light, ambient timer, voice memo recording
- [ ] **Post-session** — sketch upload, vision notes, symbolic indexing (shared with dream symbol index)
- [ ] **Linked to entities** — ancestor consultations link to beloved-dead registry

## 5. Practice & Ritual Logs

Implementation phase: **[06 — Divination & Practice Logs](plan/06-divination-and-practice.md)**

- [ ] **Ritual templates** — name, tradition, type (banishing, invocation, evocation, charging, consecration, etc.), script (rich text), materials, recommended timing, correspondences, references
- [ ] **Working records** — instance of a ritual; template_id (optional), entities invoked, intention, location, participants, datetime, outcome rating, linked entries
- [ ] **Dream journal** — quick capture (mobile-friendly), symbol index (shared with scrying), linked entities, lucidity scale, vividness scale, recurring-dream detection, incubation tracking
- [ ] **Pathworking log** — per-path entry (Lurianic, Golden Dawn, Thelemic, custom Trees), path metadata (Hebrew letter, tarot card per tradition, planet, color, scent, deities), journey log (prep, intention, vision narrative, beings encountered, symbols, integration)
- [ ] **Asana / pranayama tracker** — Liber E style with cumulative timing
- [ ] **Banishing / grounding / centering log** — quick capture, method, pre/post state, streak tracking

## 6. Workshop & Generators

Implementation phase: **[07 — Workshop](plan/07-workshop.md)**

### Sigil generator (all modes)
- [ ] **Spare letter elimination** — classical method with automatic + manual composition
- [ ] **Kamea pathing** — trace intention gematria through chosen planetary magic square; selectable square (Saturn 3×3 through Moon 9×9)
- [ ] **Rose Cross cipher** — map letters to positions on Rose Cross diagram; trace connecting lines
- [ ] **Pythagorean rosette** — number-to-position on labeled rosette wheel
- [ ] **Hebrew letter sigil** — Notarikon style with letterform composition
- [ ] **Greek letter sigil** — isopsephic version with classical Greek shapes
- [ ] **Hashed-vector deterministic** — hash(intention + salt) → seed → parametric curve (Bezier, rose, lissajous, polar)
- [ ] **Harmonograph / Lissajous** — gematria values as oscillator frequencies
- [ ] **User-supplied parametric formula** — sandboxed expression evaluator for `r = f(θ, g, t)`
- [ ] **Freeform vector draw** — pen-tool with pressure sensitivity
- [ ] **Image upload + vectorize** — potrace-based; user refines

### Magic squares (Kamea)
- [ ] **All seven planetary squares** — Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon
- [ ] **Full attribution rendering** — Hebrew gematria labels, planetary sigil derived from path
- [ ] **Custom squares** — user-defined n×n with custom numbering

### Talisman designer
- [ ] **Canvas-based composer** — layered (background, border, central sigils, square embeds, inscriptions, charged image)
- [ ] **Border library** — Hebrew names of God, Greek epithets, planetary glyphs, custom inscription
- [ ] **Snap-to-circle layout**
- [ ] **Color pickers** with traditional planetary schemes
- [ ] **Front + back composition**
- [ ] **Export**: SVG / PDF / DXF

### Magical circle builder
- [ ] **Concentric rings** with configurable count and per-ring content
- [ ] **Per-ring content options** — inscription (multi-script), glyph row (planetary/zodiacal/elemental/custom), single image, blank
- [ ] **Compass-point configuration** — archangels, Greek wind gods, four watchtowers, custom
- [ ] **Real-world scale** with print-tile mode for assembly
- [ ] **Library of preset circles** — LBRP, Heptameron spirit triangle, Goetic triangle of art (where source is PD)
- [ ] **Export**: SVG / PDF (tiled) / DXF

### Tool / altar registry
- [ ] **Per-tool record** — name, kind (wand/athame/chalice/pentacle/censer/bell/sword/lamp/mirror/bowl/statue/cingulum/robe), description, materials, dimensions, photos, provenance, creation date, consecration date + ritual link, history of use, current location
- [ ] **Altar collections** — current arrangements of tools for specific workings or permanent setups; layout diagram, photos
- [ ] **Tool recommendations** — when designing a working, suggest your consecrated tools attributed to relevant entities

### Voces magicae
- [ ] **Recording library** — record and replay voces magicae
- [ ] **Per-ritual / per-entity voce libraries**
- [ ] **Ritual-mode playback** — chant playback during ritual execution (optional)

## 7. Linguistic Tools

Implementation phase: **[08 — Linguistic Tools](plan/08-linguistic-tools.md)**

- [ ] **Gematria engine** with bundled ciphers — Greek isopsephy (incl. digamma/koppa/sampi), Hebrew (standard + mispar gadol with finals 500+, katan, siduri), English Qabalah (Crowley ALW, NAEQ, Simple, Hebrew-mapped), Arabic abjad, Sanskrit Katapayadi, Coptic
- [ ] **Notarikon, Temurah** (Albam, Atbash), **Ziruph** — as cipher transformations
- [ ] **User-extensible ciphers** per vault
- [ ] **Cross-cipher resonance** — phrases summing to the same number across different ciphers
- [ ] **Cross-journal gematria search** — "show me all entries containing phrases summing to 418 in any cipher"
- [ ] **Transliteration** — Greek↔Latin (scholarly polytonic, modern monotonic, ALA-LC, Beta Code); Hebrew↔Latin (SBL, ISO 259, simplified phonetic); Sanskrit↔Latin (IAST, ISO 15919, Harvard-Kyoto); Arabic↔Latin; Coptic↔Latin
- [ ] **Voces magicae reference library** — name, language, text (original script), transliteration, pronunciation (IPA + simplified), source citation, context, audio recordings
- [ ] **Community contribution** to voces library — submission, review, vetting
- [ ] **Pronunciation guides** — IPA-based + simplified Anglo-phonetic + audio recordings (community-rateable)
- [ ] **UI i18n framework** — full string extraction, RTL handling, polytonic Greek, Hebrew with niqud, Arabic shaping verified
- [ ] **Input methods** — character palette for non-Latin scripts, romanization-to-script autocompletion

## 8. Body & State

Implementation phase: **[04 — Journaling](plan/04-journaling.md)** (body sensation diagram); cross-referenced everywhere body data tags workings

- [ ] **Body sensation diagram** (see §2)
- [ ] **Mood / energy / health snapshots** at time of any working — scalars + free-form notes
- [ ] **State data correlated with workings** — feeds into §9 analytics

## 9. Synchronicity & Scientific Illuminism Analytics

Implementation phase: **[09 — Synchronicity & Analytics](plan/09-synchronicity-and-analytics.md)**

- [ ] **Synchronicity log** — global-shortcut quick-capture; auto-tagged with current astro, calendar, planetary hour, lunar phase, weather, location, recent-context suggestions
- [ ] **Multi-axis tagging** — astro snapshot, calendar stamp, entities, tags, tradition tags, mood/energy/health, outcome rating (subjective + manifested + time-to-manifest + confidence)
- [ ] **Query builder UI** — Notion-style chained filter expressions; boolean composition; nested
- [ ] **Saved queries and studies** — named, persistent, with viz config + notes
- [ ] **Visualizations** — time-series, heatmaps, correlation matrix, network graph (entities↔workings↔outcomes), Sankey (intention→working→outcome), calendar heatmap; Tufte-aware design
- [ ] **Pattern detection** — automated weekly digest surfacing statistically interesting recurrences; multi-test correction (Bonferroni/FDR) on automated findings
- [ ] **Cross-magician aggregate analytics** — opt-in network-scoped, anonymized, differential-privacy noise, minimum cohort size before any aggregate shown
- [ ] **Network analytics audit log** — every aggregate query logged and visible to contributors
- [ ] **Cohort comparison** — your data across periods, or across network members in aggregate

## 10. Correspondences & Reference

Implementation phase: distributed across **[04 — Journaling](plan/04-journaling.md)** (library) and **[05 — Magical Beings](plan/05-magical-beings.md)** (entity references)

- [ ] **Personal correspondence tables** — user-created, not pre-filled; CSV import supported for existing systems
- [ ] **Personal grimoire** — writings, spells, rituals, formulae (entry-kind specialization)
- [ ] **Recipe builder** — incense, oils, washes, philtres
- [ ] **Personal materia databases** — herbs, stones, incense, colors, sounds (what's in the cabinet)

## 11. Bundles, Sharing & Magickal Knowledge Distribution

Implementation phase: **distributed across phases**, with bundle format spec landing as a focused sub-effort prior to Phase 12

### Magickal Bundle Format (MBF)
- [ ] **Single typed envelope format** — JSON manifest + typed payloads (pantheon, deck, ritual, tradition, sigil-library, etc.); versioned schema
- [ ] **Manifest declares** — type, name, version, author, license (SPDX + custom tags), source citations, dependencies on other bundles, provenance chain
- [ ] **Bundle types catalog**:
  - **Pantheons** — curated entity sets with attributes, relationships, languages, default offerings, seals
  - **Tradition bundles** — integrated systems (Enochian, Goetic, Heptamerontic, Vedic, Hellenic theurgia, Hekatean, Thelemic, Wiccan variants)
  - **Initiation curricula** — sequenced rituals + study + oaths
  - **Reading curricula** — study programs
  - **Rituals** — scripts, materials, timing, correspondences, audio
  - **Pathworking scripts**
  - **Ritual templates** — reusable structures
  - **Voce magicae libraries**
  - **Servitor patterns / egregore charters**
  - **Tarot decks** + **custom oracle decks** + **tarot spreads**
  - **Sigil libraries** — sets by intention
  - **Talisman designs**
  - **Magical circle designs**
  - **Magic squares** — custom
  - **Symbolism systems / magical alphabets** — Theban, Enochian, Malachim, Celestial, Adamic, custom
  - **Correspondences** — full tables (color/scent/herb/stone/sound/decan)
  - **Recipe books** — incense/oils/washes/philtres
  - **Festival calendars**
  - **Calendars themselves** — new calendar systems via plugin
  - **Cipher definitions** — gematria schemes, transliteration schemes
  - **Astrological techniques** — dignity rules, scoring, time-lord methods
  - **Library collections** — annotated bibliographies
  - **Quote collections** — curated with citations
  - **Election finder query templates**
  - **Saved analytics studies**
  - **Entry templates** — magical record / ritual sheet
  - **Body sensation diagram presets**
  - **Dream symbol dictionaries**
  - **Plugin bundles** — code distributed via the registry (see §17)
- [ ] **Piecemeal sharing** — a magician can pull one component out of a bundle (a single ritual, a single entity, a single deck) rather than importing the whole thing
- [ ] **Bundle signing** — Ed25519-signed by creator; verifiable on import; UI warns on unsigned but does not block

### Sharing modes
- [ ] **Individual ↔ individual** — export as MBF file, send via any channel, recipient imports
- [ ] **Network-curated** — a hub maintains "official" bundles for its members
- [ ] **Public registry** — Theourgia-hosted catalog (see §17)
- [ ] **Federated broadcast** — bundles announce themselves over ActivityPub; subscribers see updates

### Provenance, attribution, licensing
- [ ] **Required attribution** — surfaced prominently in import UI; persisted in bundle metadata; cannot be stripped
- [ ] **Provenance chain** — when a bundle derives from another, the chain is recorded
- [ ] **SPDX-style licenses** + magickal-specific tags: `for-members-only`, `for-initiates-only`, `no-derivatives`, `share-alike`, `public-domain`
- [ ] **GDPR-aware** — bundles cannot contain PII of third parties without explicit consent flags

### Initiation content sharing
- [ ] **Public initiation systems** — self-initiation systems can be freely shared; explicit per-ritual opt-in for public listing
- [ ] **Order/private initiation** — default private to a hub's initiates sub-group; never publicly listable; mintable as one-time-use share-tokens to named recipients only
- [ ] **Closed-tradition flag** — bundles can declare themselves not-for-public-redistribution (e.g., active indigenous practices); default-blocks public sharing on import; surface a respect-source notice

### Conflict resolution on import
- [ ] **Entity merge** — alias-graph model (see §3 for full mechanism); never destructive
- [ ] **Non-entity collisions** — bundle import preview shows what would be added/changed; user confirms per-item

### Versioning & updates
- [ ] **Never auto-merge** — updates from upstream bundles never silently modify user content
- [ ] **Prompt-to-pull with diff preview** — admin panel surfaces "Hekatean Bundle v1.4 available, here's what changed"
- [ ] **Migration assistance** — bundle authors can ship migration scripts that the import preview shows step-by-step; one-click apply with rollback option
- [ ] **Tombstone-not-erasure on withdrawal** — creators can mark bundles deprecated/withdrawn; existing downloaders keep their copy; new fetches see tombstone with reason; user content built on it stays intact

### Sandbox-before-commit
- [ ] **Bundle preview mode** — install into an isolated sandbox vault for exploration; only commit to main vault if it works
- [ ] **Sandbox isolation** — sandbox imports never federate, never affect personal content, never appear in main searches

## 12. Publishing, Monetization & Newsletters

Implementation phase: **[10 — Publishing & Monetization](plan/10-publishing-and-monetization.md)**

- [ ] **Publication catalog** — books, essays, articles, with metadata, cover art, edition, license, price (per-vault Stripe Connect)
- [ ] **In-browser PDF viewer** + **EPUB reader**
- [ ] **DRM-free always** — optional watermarking with buyer email
- [ ] **Stripe Connect (standard accounts)** — magician's sales go to magician's Stripe; Theourgia takes no cut; tax handling via Stripe Tax (opt-in)
- [ ] **Sales dashboard** per vault
- [ ] **Subscription billing** — recurring Stripe products for paid newsletters and patron tiers
- [ ] **Newsletter system** — individual + network-curated; composer pulls from publishable entries; double-opt-in subscriptions; bounce handling; unsubscribes honored
- [ ] **Newsletter delivery backends** — SMTP / Postmark / SES / Resend / Mailgun (plugin slots)
- [ ] **Newsletter web archive** for subscribers
- [ ] **RSS / Atom / JSON Feed** — per-vault, per-hub, per-newsletter
- [ ] **Comments with moderation** — per-publication opt-in
- [ ] **Per-vault public face** — customizable homepage + sections + theming within design-system constraints

## 13. Media Library, Calendar Feeds & Maps

Implementation phase: **[11 — Media Library](plan/11-media-library.md)**

- [ ] **Image gallery** with EXIF stripping by default; opt-in to retain EXIF
- [ ] **Audio library** — chants, voce magicae, ambient, lectures, dictation; optional Whisper transcription
- [ ] **Video integration** — YouTube embeds (privacy-enhanced) + optional self-hosted (Cloudflare Stream / Mux)
- [ ] **Per-video captions/subtitles** + chapter markers
- [ ] **Pilgrimage / sacred site log** — map (Leaflet + OSM), per-site with location-precision controls (exact/neighborhood/region), visited_at multi-entry, deity associations
- [ ] **Privacy-aware map rendering** — jittered coords on `network`, city-level only on `public`, exact only on `personal` / `viewer`
- [ ] **Pilgrimage routes** — ordered sequences with notes (e.g., "Eleusis route")
- [ ] **iCal / WebCal feed exports** — per-vault subscribable feeds for planetary hours, festivals, working windows
- [ ] **Network group ritual feed** — per-hub iCal export of scheduled group rituals, with per-participant timezone-localized planetary-hour metadata
- [ ] **Subscribable from any iCal client** — Apple Calendar, Google Calendar, Outlook, Fastmail, Thunderbird

## 14. Federation, Networks & Group Work

Implementation phase: **[12 — Federation](plan/12-federation.md)** + **[13 — ActivityPub](plan/13-activitypub.md)**

### Native federation protocol
- [ ] **Theourgia federation protocol** — HTTPS + HTTP Signatures (RFC 9421); Ed25519 per-instance keys; capability tokens
- [ ] **Identity** — `did:theourgia:{host}:{slug}`
- [ ] **Operations** — Push, Pull, Mirror, Invite, Accept, Revoke, RitualSchedule, RitualUpdate, Comment, Heartbeat
- [ ] **Versioned protocol** with capability negotiation

### Network hubs
- [ ] **Hubs as first-class** — name, slug, description, tradition tags, visibility, public face, member list with role (admin/officer/member/observer)
- [ ] **Admin permissions panel** — admin-configurable user levels, permissions per role, visible audit
- [ ] **Member management** — invite, approve, suspend, expel with audit log
- [ ] **Hub public face** — curated content surface visible to non-members
- [ ] **Per-content visibility scopes** — vault chooses what to share with which hubs (e.g., "share workings with Hub A, publications with Hub B, synchronicities anonymously with Hub C")

### Single Sign-On (SSO) across networks
- [ ] **Theourgia SSO** — magician can use one identity to join public networks and request access to private networks across instances
- [ ] **Per-network opt-in** — hubs choose whether to accept SSO authentication
- [ ] **Individual sites can use SSO** — for auto-download to private system, subscriber sign-in, comment authentication
- [ ] **Federated identity** — works across multiple Theourgia instances

### Vault ↔ hub sync
- [ ] **Per-entry "publish to network"** with hub selection
- [ ] **Vault retains canonical ownership** — revocable with disclosure about cache persistence
- [ ] **Per-content-type defaults** (e.g., "always offer to push my rituals to OTO Local Body hub")

### Private viewers
- [ ] **Vault-issued credentials** for trusted readers (students, partners, working group members)
- [ ] **Per-viewer access scopes** by tag/kind/specific entries

### Group work
- [ ] **Group ritual coordinator** — cross-timezone scheduling with per-participant local planetary-hour display
- [ ] **Shared script / shared sigils / shared voces** during ritual
- [ ] **Post-ritual collective log** — each participant's fragmentary updates merge into one record
- [ ] **Egregore creation flow** — group ritual can declare itself a servitor/egregore creation event, registering the entity in all participating vaults
- [ ] **Network group ritual feed** — subscribable schedule

### ActivityPub bridge
- [ ] **Public content only** — `viewer`/`network`/`personal`/`sealed` never flows through AP
- [ ] **WebFinger** + NodeInfo 2.0
- [ ] **Custom AP extensions** — `theourgia:Ritual`, `theourgia:Divination`, `theourgia:Sigil`; degrade gracefully to base AP types in vanilla clients
- [ ] **Mastodon/Pleroma/GoToSocial/Akkoma/Friendica** interop tested

## 15. Security, Identity & Compliance

Implementation phase: foundations in **[01 — Core Architecture](plan/01-core-architecture.md)**; ongoing reinforcement in every phase; compliance audit in **[15 — Hardening & Launch](plan/15-hardening-and-launch.md)**

### Encryption
- [ ] **Mode A: Server-side at rest** — AES-256-GCM with per-vault data keys, wrapped by server master key
- [ ] **Mode B: Zero-knowledge client-side** — XChaCha20-Poly1305 via libsodium; key from passphrase via Argon2id; server never sees key
- [ ] **Per-content-item mode selection** — user chooses at write time
- [ ] **Mode B recovery** — backup of derived key under user-chosen recovery passphrase; explicit warnings
- [ ] **Key rotation tooling** for Mode A

### Authentication
- [ ] **Argon2id password hashing** tuned ≥250ms
- [ ] **TOTP 2FA** + backup codes + recovery flow
- [ ] **WebAuthn / passkey** support
- [ ] **Session tokens** — opaque random 256-bit, hashed in DB, with rotation and device-list management
- [ ] **Account lockout** with exponential backoff

### Authorization & visibility
- [ ] **Visibility enum** per content: personal / viewer / network:{hub_id} / public / sealed
- [ ] **PostgreSQL Row-Level Security** policies — defense in depth
- [ ] **API decorators** for scope+visibility checks

### Audit log
- [ ] **Comprehensive audit log** — every read of `sealed` content, every visibility downgrade, every auth event, every federation operation
- [ ] **User-facing audit surface** — magician sees recent activity in their vault
- [ ] **Network-level audit** — hub admins see all admin actions, member changes, content moderation

### GDPR compliance
- [ ] **Right to access** — one-click "export everything we have on you" producing structured archive
- [ ] **Right to erasure** — full erasure honored with documented limits (federated content lives on other parties' sovereignty; tombstones on networks)
- [ ] **Data portability** — all exports in readable JSON / MBF format
- [ ] **Privacy policy templates** for self-hosters
- [ ] **DPIA template** for network hubs
- [ ] **Cookie consent UI** on public surfaces (also keeps the zero-telemetry promise honest)
- [ ] **Breach notification runbook** in admin docs
- [ ] **Data minimization** baked into schema review

### Pseudonymity & identities
- [ ] **Multi-identity per account** — legal name, magickal name(s), order name, ancestor name as distinct identities
- [ ] **Per-content identity selection** — choose which identity authored each entry/post/publication
- [ ] **Selective disclosure** — public profile shows the identity the user picks for each surface

### Cultural sensitivity
- [ ] **Closed-tradition flag** — bundles and content can declare not-for-public-redistribution
- [ ] **Default-block public sharing** of closed-tradition content on import
- [ ] **Respect-source notice** surfaced to importers

### Crisis-aware nudge (opt-in)
- [ ] **Optional gentle nudge** — if body/mood snapshots log sustained severe distress, surface a discreet note about non-magickal resources (therapists, crisis lines in the user's region). Tone-perfect; user can disable.

## 16. AI Agent Integration

Implementation phase: **[16 — AI Agent Integration](plan/16-ai-agent-integration.md)** (new phase, daskalos-pattern adapted)

- [ ] **Fully opt-in** — zero-AI mode is default and fully supported
- [ ] **Daemon + waker + MCP architecture** — modeled on daskalos
- [ ] **Per-purpose agents** — divination companion, scrying journal partner, ritual aide, study tutor, correspondence-research helper
- [ ] **User brings own auth** — Anthropic API key or Claude subscription; Theourgia never holds keys centrally; never bills
- [ ] **MCP server for magician-side agents** — user's own Claude Code in their terminal connects to their vault via MCP with proper auth
- [ ] **Vault-scoped MCP exposure** — daemon exposes only authorized content per agent; read-only by default; write requires explicit per-tool consent
- [ ] **Sealed content** never auto-decrypted for AI
- [ ] **Network-shared content** respects hub visibility rules for AI access
- [ ] **No service-side keys** — self-hosted Theourgia runs the AI daemon locally with user's keys
- [ ] **Resume window** — follow-up agent wakes use `claude --continue` for ~20× input token reduction
- [ ] **Per-purpose scoped memory** — each agent has its own memory directory it reads at spawn and writes before going dormant
- [ ] **Token usage dashboard** — per-agent token + cost tracking; daily/weekly/monthly totals

## 17. Plugin Ecosystem

Implementation phase: **[14 — Plugin Ecosystem](plan/14-plugin-ecosystem.md)**

- [ ] **Plugin SDK** — Python (backend) + TypeScript (frontend); stable manifest schema; test harness
- [ ] **Extension points** — calendars, astrology techniques, divination systems, ciphers, correspondence tables, sigil modes, editor blocks, entry kinds, dashboard widgets, analytics charts, notification channels, exporters, importers, federation message types, AP object types, auth providers, storage backends, email backends
- [ ] **Capability-based sandbox** — plugins declare needed capabilities at manifest; user reviews at install (browser-extension-style)
- [ ] **Signed releases** — Ed25519 signatures verified on install
- [ ] **Reference plugins shipped**:
  - Norse runes extended (Younger Futhark, Anglo-Saxon Futhorc, bind-rune designer)
  - Egyptian decans
  - 777-style correspondences importer (where text rights permit)
  - Day One journal importer
  - Obsidian markdown exporter
  - Matrix notification channel
  - Tea-leaf reading log (demonstrates non-mechanical divination plugin)

### Theourgia Official Registry
- [ ] **Official Theourgia-hosted registry** at `registry.theourgia.com` (or similar)
- [ ] **Three tiers**:
  - **Official** — scanned by Theourgia maintainers for update-friendliness, migration-friendliness, community code practices, security review
  - **Community** — signed releases from known contributors; meets minimum quality bar
  - **User-supplied / unverified** — random GitHub releases; at-your-own-risk; explicit warning surfaced
- [ ] **Install-time capability review** — user sees what the plugin will be allowed to do before activating
- [ ] **Update notifications** with diff-preview
- [ ] **Vulnerability disclosure pipeline** — signed advisories
- [ ] **Sandbox-before-commit** — install into preview environment, evaluate, then commit to main vault
- [ ] **Tombstone on withdrawal** — withdrawn plugins keep installed user copies; new fetches see tombstone

## 18. Self-Hosting, Operations & Lifecycle

Implementation phase: **[00 — Foundations](plan/00-foundations.md)** + **[01 — Core Architecture](plan/01-core-architecture.md)** + **[15 — Hardening & Launch](plan/15-hardening-and-launch.md)**

### Deployment
- [ ] **One-command deploy** — bootstrap installer (`curl ... | bash` or small TUI) for fresh hosts; sets up Docker, secrets, initial config
- [ ] **Web-based first-run wizard** — magical name, tradition(s), location, calendars enabled, encryption preference, 2FA setup, optional library import
- [ ] **Docker Compose primary** — production-grade defaults
- [ ] **Caddy reference config** (host-level shared Caddy supported via `Caddyfile.d/` snippets for multi-tenant boxes)
- [ ] **Traefik supported** as alternative
- [ ] **Helm chart** for Kubernetes (community contribution welcomed)

### Migrations
- [ ] **One-click migration with preview** — admin panel shows "here's what will change, here's what may break"
- [ ] **Migration tests** — every alembic migration round-trips against a populated DB
- [ ] **One-click rollback** to previous version
- [ ] **Plugin migrations** — namespaced per-plugin; transactional

### Updates
- [ ] **Auto-update channels** — stable / beta / dev; user chooses per-instance
- [ ] **Health-check dashboard** in admin
- [ ] **Pre-merge / pre-deploy README freshness check** vs. PROJECT_PLAN and CHANGELOG

### Backups
- [ ] **Restic-based backups** — encrypted, scheduled (daily + 6hr incrementals default), operator-controlled passphrase
- [ ] **Default backend Cloudflare R2** — S3-compatible; alternatives Hetzner Object Storage, Backblaze B2, MinIO, local FS
- [ ] **One-command restore** — `just restore --from <snapshot-id>` recreates a working instance
- [ ] **DR runbook** in admin docs

### Digital inheritance / memorial mode
- [ ] **Designated digital executor** — encrypted key-share with named person, time-locked unlock
- [ ] **Memorial mode** — vault becomes read-only after trigger; public content stays accessible; private content remains sealed; clear "in memoriam" framing
- [ ] **Check-in mechanic** — "if I don't log in for N months, contact [person]"; configurable triggers
- [ ] **Posthumous publication** — entries scheduled to release after the memorial trigger fires

### Network exposure invariants
- [ ] **Redis & Postgres never externally bound** — internal-only; reference compose enforces; CI test verifies
- [ ] **Only port 80/443 publicly bound** (Caddy)
- [ ] **All other services** on Docker internal network or 127.0.0.1

## 19. Documentation, Testing & Sustainability

This category lives alongside every phase — not a one-time deliverable but a continuous commitment.

### Documentation discipline
- [ ] **User docs ship with features** — same PR, never lagging
- [ ] **Developer docs ship with code** — ADRs, API references, architecture diagrams
- [ ] **README is community page** — visual roadmap, status, tech tags, setup, contributing; updated continuously
- [ ] **Onboarding from day one** — first-run wizard introduces new features as they land
- [ ] **Docs detailed enough to resume cold** — a future Claude or contributor reading them should be able to pick up the entire design
- [ ] **Cross-references** between PROJECT_PLAN ↔ ARCHITECTURE ↔ phase plans ↔ FEATURES catalog ↔ ADRs

### Testing discipline (current era: local + on-server-during-dev)
- [ ] **Unit tests** — every component, every function with non-trivial logic
- [ ] **Regression tests** — every previously-fixed bug + every feature interaction known to break
- [ ] **Integration tests** — frontend ↔ backend, federation ↔ AP, plugin ↔ host, agent ↔ MCP
- [ ] **End-to-end tests** — Playwright; critical user flows (login, write, publish, federate, divination, group ritual, deploy)
- [ ] **Property-based tests** — crypto, astronomy, gematria ciphers
- [ ] **Migration tests** — every Alembic migration round-trips against populated DB
- [ ] **Server-side smoke tests** on deploy — health checks, route smoke, fed-protocol round-trips
- [ ] **`just test` runs all locally** in a single command
- [ ] **No PR merges without green tests** (manual enforcement during v0.x; CI-gated post-v1.0)

### Testing discipline (post-1.0: GitHub Actions CI/CD)
- [ ] **Tag-triggered releases** via GitHub Actions
- [ ] **Every PR runs full suite** — lint, type-check, test, build, security scan
- [ ] **Deploys gated on green CI**
- [ ] **Same tests as v0.x; only the harness shifts**

### UX / a11y discipline
- [ ] **Modal-only alerts** — no `window.alert` / `window.confirm` / `window.prompt`; ESLint/Biome rule enforced
- [ ] **WCAG 2.2 AA** — keyboard navigation, screen-reader correctness, color contrast, motion sensitivity, color-blind variants
- [ ] **PWA-fast mobile capture** — dream-on-wake, synchronicity quick-capture, offline-first sync, fast photo capture at altar

### Project sustainability
- [ ] **AGPL-3.0** — free forever, never relicensed
- [ ] **Zero telemetry** — verified by automated test in CI
- [ ] **Maintainer rotation plan** — bus-factor reduction
- [ ] **Funding model documented** — Open Collective / GitHub Sponsors / explicit "no commercial offering" stance
- [ ] **Annual security audit cadence** post-1.0

---

## Maintaining this catalog

This file is the canonical feature catalog. Changes here trigger:
- README roadmap update
- PROJECT_PLAN.md cross-references
- CHANGELOG.md entries when status changes
- Phase plan updates when features move between phases

If you're adding a feature, add it here first, then plan it in. If you're completing a feature, update the checkbox here in the same PR.
