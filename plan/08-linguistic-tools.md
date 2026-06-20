# Phase 08 — Linguistic Tools

> Gematria across multiple ciphers, cross-journal gematria search, transliteration between scripts, the voces magicae reference library, pronunciation guides. The tools that let language do magical work.

## Goal

Provide first-class linguistic infrastructure for magical practice: rigorous gematria (multiple traditions and ciphers), faithful transliteration, a community-augmented voces magicae library, and pronunciation aids. Make language a queryable substrate, not just decoration.

## Dependencies

- Phase 00 (Foundations)
- Phase 01 (Core Architecture)
- Phase 02 (Frontend Foundations) — font infrastructure, RTL, input methods

## Deliverables

### 1. Gematria engine
- `cipher` table: id, name, language, mapping (character → integer), notes, source citation
- Bundled ciphers:
  - **Greek isopsephy** (classical, includes digamma, koppa, sampi for full numerical value)
  - **Hebrew gematria** standard, with optional variants (mispar gadol with finals = 500+, mispar katan, mispar siduri, etc.)
  - **English Qabalah** — multiple variants: Crowley's ALW (Liber AL XXXI), New Aeon English Qabalah (NAEQ), Simple English Qabalah, Hebrew-mapped English
  - **Arabic abjad**
  - **Sanskrit Katapayadi** (selectable variants)
  - **Coptic gematria**
- User-extensible: define custom ciphers per vault
- Compute API: `gematria_value(text, cipher) → int` — strips accents/diacritics per cipher rules
- Multi-cipher view: a single phrase displayed simultaneously in multiple selected ciphers
- Notarikon (acronym values), Temurah (letter substitution ciphers like Albam, Atbash), Ziruph — each as cipher transformations

### 2. Cross-journal gematria search
- `gematria_index` table: denormalized per-entry per-cipher value of every phrase the user has marked or that the system has surfaced (configurable indexing depth)
- Query: "show me all entries containing phrases summing to 418 in any cipher"
- Query: "show me entries summing to my magical name's value across English Qabalah"
- Match types: exact, near (configurable Δ), reduced (digit-summed)
- Cross-cipher resonance: phrases that sum to the same number in different ciphers (a uniquely magical query unavailable in any other tool)

### 3. Transliteration
- Greek ↔ Latin (multiple schemes: scholarly polytonic, modern monotonic, ALA-LC, Beta Code)
- Hebrew ↔ Latin (SBL, ISO 259, simplified phonetic)
- Sanskrit ↔ Latin (IAST, ISO 15919, Harvard-Kyoto)
- Arabic ↔ Latin (ALA-LC, DIN 31635, simplified)
- Coptic ↔ Latin
- Round-trip integrity checking (where possible)
- Inline transliteration in editor (hover an inline Greek mark to see the transliteration; same for Hebrew/Sanskrit/Arabic)

### 4. Voces magicae reference library
- `voce_magicae` table: id, name, language (often Greek, sometimes Coptic, sometimes invented), text (in original script), transliteration, pronunciation_guide (IPA + simplified), source (e.g., PGM IV.987–1019), context (purpose, deity invoked), audio_recordings (m2m), notes
- Bundled core set from published sources (Greek Magical Papyri / PGM where translations are public domain; cite Betz translation where it's been incorporated but only where licensing permits, otherwise paraphrase + cite)
- Community-contributable: users submit voces with sources; review process; vetted library shared across networks
- Practitioner audio recordings: multiple recordings per voce (different practitioners, different pronunciations); user can vote/rate accuracy
- Editor integration: `/voce` slash command inserts a voce-magicae block with audio playback

### 5. Pronunciation guides
- IPA-based for accuracy
- Simplified Anglo-phonetic alternative
- Audio playback (community recordings)
- Contribution workflow: any user can submit a recording; community reviews

### 6. UI internationalization framework (deepened)
- Building on Phase 02's i18n scaffolding: full string extraction, locale switcher, RTL flipping
- Input methods: a software keyboard / character palette for Polytonic Greek, Hebrew with niqud, IAST Sanskrit — accessible via editor floating toolbar
- Romanization input helpers: type "Hekate" → editor suggests `Ἑκάτη`
- Font fallback chain documented and tested for each script

### 7. Frontend
- Gematria calculator surface: text input, cipher multi-select, value display + reduction + cross-cipher matches
- Cross-journal gematria search: number input → results across journal
- Transliteration utility: paste source script → see all available transliteration schemes side by side
- Voces magicae library browser: by deity, by purpose, by source text
- Per-voce detail page with recordings, transliterations, contextual notes
- Editor inline integration: hover a marked phrase to see its gematria across enabled ciphers

### 8. APIs
- `POST /api/v1/gematria/compute` — text + ciphers → values
- `POST /api/v1/gematria/search` — value + filters → matching entries
- `POST /api/v1/transliterate` — text + source/target schemes → transliterated text
- `GET/POST /api/v1/voces` — voce magicae CRUD
- `POST /api/v1/voces/:id/recordings` — add audio
- `GET /api/v1/ciphers` — list available, including user-defined

## Design notes

- Greek diacritics (rough breathing, smooth breathing, acute, grave, circumflex, iota subscript) must round-trip correctly. Test edge cases.
- Hebrew niqud (vowel points) must be preserved or strippable based on cipher requirements.
- Cross-cipher resonance is a novel magical query. Surface it elegantly — it may become a defining feature.
- The community voces library has moderation needs. Plan a review queue for hub admins.

## Risks

- **Risk:** Source attribution for voces magicae is murky in the magical literature. **Mitigation:** Require source citation field; surface uncited entries with a warning; encourage practitioner expertise in moderation.
- **Risk:** Transliteration schemes disagree subtly. **Mitigation:** Offer multiple schemes; document which serves which audience; never silently pick one.
- **Risk:** Performance of `gematria_index` on a large vault. **Mitigation:** Materialized view per cipher; incremental updates on entry save.

## Definition of Done

- [ ] All bundled ciphers verified against published reference values
- [ ] Cross-journal gematria search returns correct results across mixed-language phrases
- [ ] All transliteration directions round-trip on a test corpus
- [ ] Voces magicae library populates from a vetted starter set with sources cited
- [ ] Community contribution flow works end-to-end
- [ ] Audio recordings play back across browsers
- [ ] Input methods (Greek polytonic, Hebrew niqud) usable on keyboard and software palette
