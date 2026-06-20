# Phase 06 — Divination & Practice Logs

> The divination workbench (tarot, I Ching, geomancy, runes, pendulum, bibliomancy, horary, scrying) and the practice logs (rituals, dreams, pathworking, asana/pranayama, banishings). Everything you *do* gets recorded here, and the doings link back into entities, library, and entries.

## Goal

Provide deep, faithful implementations of the major divination systems and an extensible model for practice logging. Each divination is a first-class record with full context (question, querent state, conditions, outcome retrospective), not a toy.

## Dependencies

- Phase 00–02, 03 (astrology for horary), 04 (journal entries), 05 (entity links)

## Deliverables

### 1. Tarot engine
- `deck` table: name, creator, license, language, tradition (Marseille / Rider-Waite / Thoth / Etteilla / oracle), reversal convention, art set
- `card` table: deck_id, position (sequence number), suit / arcana, name (per-language), traditional meaning, upright meaning (user-editable), reversed meaning (user-editable), correspondences (planetary, elemental, decan, Hebrew letter, path on Tree of Life), image
- Bundled public-domain decks: Rider-Waite-Smith (CC), Marseille (multiple historical), Etteilla, Sola Busca
- **Custom deck creation:** user-built decks with uploaded art (their own art or fair-use personal copies); per-card editor with all meaning fields; previewable
- Deck sharing: within a network, or publicly (with explicit copyright affirmation at upload time)
- Spread engine: built-in spreads (single card, three-card, Celtic Cross, Tree of Life, Year Ahead, etc.); custom spread designer with drag-and-drop card positions on a canvas, per-position meaning
- Reading session: question, querent (self or other), deck, spread, draw method (mental shuffle / physical / hash-of-question / browser RNG), drawn cards with reversals, position interpretation, overall interpretation, retrospective outcome rating
- Readings linkable to entries, entities, workings
- **Personal Thoth-style deck builder helper** (private use only): a guided flow for digitizing a deck the user owns for personal reference — explicit consent screens, no sharing path, no export, watermarked as personal

### 2. I Ching
- Coin-toss and yarrow-stalk generation methods
- All 64 hexagrams with multiple translations selectable (Wilhelm/Baynes, Cleary, Karcher, public domain Legge)
- Changing lines, transformation hexagrams
- User-editable per-hexagram interpretation notes (accumulate wisdom over readings)
- Reading session log

### 3. Geomancy
- Sixteen figures with rulerships, qualities, attributions
- Generation methods: dot-drawing, RNG, user-marked
- Mothers → daughters → nieces → witnesses → judge generation rules
- Twelve-house chart casting (multiple house systems)
- Interpretation aids: figure dignities, perfection conditions, ways
- Reading session log

### 4. Runes
- Multiple rune sets: Elder Futhark, Younger Futhark, Anglo-Saxon Futhorc, Armanen, Northumbrian — extensible
- Per-rune meanings (upright and reversed where convention allows), per-tradition notes
- Spreads: single rune, three rune, nine rune wyrd, Bind-rune designer
- Reading session log

### 5. Pendulum
- Quick capture: question, response (yes / no / maybe / no-response), confidence
- Calibration log: track accuracy over time when outcomes are knowable
- Optional pendulum-board mode: user draws/uploads a chart, taps where the pendulum landed; persists across readings

### 6. Bibliomancy
- Pick a text from library (must support full-text indexing)
- Random verse / passage selection (configurable: random line, random page, random paragraph)
- Reading log with passage cited and interpretation

### 7. Horary astrology
- Cast a chart at the moment of question; uses Phase 03 astrology engine
- Hellenistic horary interpretation guide UI (sect, signification, perfection conditions)
- Linked to reading session

### 8. Scrying
- Mode selector: water bowl (especially Greek-style black bowl), black mirror, crystal, fire, smoke, ink-in-water, candle flame, other
- Pre-session capture: ambient conditions (light level, sound, time, weather, planetary hour), preparatory ritual, intention, entity invoked
- Active session UI: minimal-chrome "trance mode" — large dark canvas, optional ambient timer, voice memo recording, post-session prompt for sketches and observations
- Post-session: sketch upload, free-form vision notes, symbolic indexing (auto-tagged into a dream-symbol-style index shared with Phase 04 dream journal)
- Linked to entities (e.g., "consulted the beloved dead" links to ancestor registry)

### 9. Ritual templates and workings
- `ritual_template` table: name, tradition, type (banishing, invocation, evocation, charging, consecration, etc.), script (rich text), required materials, recommended timing (planetary/lunar conditions), correspondences, references
- Built-in templates (publicly documented historical rituals only — LBRP, Star Ruby (with appropriate attribution per OTO copyright considerations — confirm public availability before bundling; if unclear, ship description and let user supply text), Stele of Jeu opening, Bornless Ritual outline, Hekate's Supper outline, etc.)
- `working` table: instance of a ritual — `template_id` (optional), entities invoked, intention, location, participants (if group), datetime, outcome rating, linked entries
- Group workings link multiple participants (used in Phase 12 federation)

### 10. Dream journal
- Quick capture (mobile-friendly, no friction)
- Symbol index: extracted symbols become tags, browseable across all dreams
- Linked entities (entity mentions in dreams)
- Lucidity scale, vividness scale
- Recurring-dream detection (auto-clusters similar dreams)
- Dream-incubation tracking: a dream linked back to a deliberate incubation working

### 11. Pathworking (Tree of Life journeys)
- Per-path entry (with predefined paths on multiple Trees: Lurianic, Golden Dawn, Thelemic, custom)
- Path metadata: Hebrew letter, tarot card (per tradition), planet, color, name, scent, deity associations
- Journey log: preparatory ritual, intention, vision narrative, beings encountered, symbols received, retrospective integration notes

### 12. Asana / pranayama tracker
- Liber E style: posture name, duration, breaks, observation notes
- Cumulative time per posture
- Pranayama: pattern (4-4-4-4, 4-8-4-8, etc.), duration, observations

### 13. Banishing / grounding log
- Quick capture (low friction)
- Method (LBRP, Star Ruby, simple ground, breath, water, salt, etc.)
- Pre / post state
- Streak tracking for daily practice

### 14. Frontend
- Divination workbench: a launcher with each system as a tile; clicking opens that system's session UI
- Reading history with cross-system search
- Per-deck card-browser surface for tarot (zoomable art, per-card edit)
- Scrying trance mode (full-screen, minimal chrome, low blue light option)
- Ritual library and working composer
- Dream journal with quick-capture and symbol browser
- Pathworking surface with selectable Tree visualization

### 15. APIs
- Reading endpoints per system
- `GET/POST/PATCH /api/v1/workings`
- `GET/POST /api/v1/dreams`
- `GET/POST /api/v1/pathworkings`
- `GET/POST /api/v1/decks`, `GET/POST /api/v1/decks/:id/cards`

## Design notes

- Divination randomness must be cryptographically sound (system RNG, not Math.random). Mental shuffles should produce identical results given identical seeds for reproducibility when the user wants it.
- Tarot art licensing is the most fraught area. Bundle only verified public-domain decks; for everything else, user uploads with copyright affirmation.
- Scrying trance mode should genuinely minimize cognitive load and visual noise. Test with practitioners.
- Pathworking visualizations should default tradition-neutral but offer specific Tree variants (Kircher, Lurianic, etc.) as toggles.

## Risks

- **Risk:** Copyright complaints over uploaded tarot art. **Mitigation:** Clear takedown process; user attestation at upload; never bundle non-PD decks; per-user storage isolation.
- **Risk:** Symbol-index becomes noisy. **Mitigation:** User curates indexing; auto-suggestions reviewed before becoming tags.
- **Risk:** Divination engines feel like toys. **Mitigation:** Each system should pass review by a practitioner of that system before merge.

## Definition of Done

- [ ] All bundled tarot decks display correctly with full meanings
- [ ] Custom deck creation end-to-end
- [ ] All other divination systems functional with session logs
- [ ] Scrying trance mode passes review by a practicing scryer
- [ ] Pathworking traversal records persist with full structure
- [ ] Ritual templates round-trip; workings link cleanly to entities and entries
- [ ] Dream symbol index emerges naturally from logged dreams
- [ ] All systems pass practitioner review
