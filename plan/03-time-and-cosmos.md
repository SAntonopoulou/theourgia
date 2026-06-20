# Phase 03 — Time & Cosmos

> The temporal and astronomical engine. Calendars, ephemerides, planetary hours, lunar data, electional search. Everything from "what time is it really?" to "find me a good window to invoke Venus this autumn."

## Goal

Provide a complete, multi-tradition temporal and astronomical foundation that other phases consume. The journal stamps entries with it. The entity ledger correlates offerings with it. The synchronicity log auto-tags from it. The analytics layer queries against it.

## Dependencies

- Phase 00 (Foundations)
- Phase 01 (Core Architecture) — DB schema for charts and events
- Phase 02 (Frontend Foundations) — UI primitives for date/time/chart display

## Deliverables

### 1. Calendar engine
- Pluggable calendar system with `Calendar` interface: `to_native(timestamp, locale, location) → CalendarDate`
- Built-in calendars at launch:
  - Gregorian (with regional locale conventions)
  - Julian (for historical references)
  - Hebrew (with proper leap-month rules)
  - Hindu / Vedic (Vikram Samvat, Shaka, with multiple regional variants)
  - Coptic
  - Islamic / Hijri (lunar + tabular)
  - Thelemic (Anno IVxxxv, with Old Style /  Era Vulgaris)
  - Ancient Greek (Attic, with archon years and month names)
  - Mayan (Long Count + Tzolkin + Haab)
  - Egyptian decanic (civil + decanal hours)
  - French Republican (because someone will ask)
- Each calendar provides:
  - Native date representation
  - Forward / backward conversion to UTC instant
  - Locale-aware formatting (long, short, numeric, with-day-name)
  - Festival/event metadata (per-calendar, see §4)
- Calendar registry is extensible via plugin

### 2. Astrology engine (Swiss Ephemeris)
- `pyswisseph` integration with ephemeris files included (1800–2400 range)
- Chart calculation primitives: planets, asteroids (Chiron, Ceres, Pallas, Juno, Vesta), nodes, parts (Fortuna et al.), midheaven, ascendant, fixed stars
- House systems: Placidus, Koch, Regiomontanus, Campanus, Equal, Whole Sign, Porphyry, Alcabitius, Sripati
- Zodiacs: Tropical, Sidereal (Lahiri, Krishnamurti, Fagan-Bradley, Raman, Yukteshwar)
- Dignity systems: essential dignities (rulership, exaltation, triplicity, term, face), accidental dignity scoring (Hellenistic and modern variants)
- Aspect engines: Ptolemaic, harmonic, midpoints
- **Multi-tradition presentation layer:**
  - Western tropical: signs, modern aspects, modern rulerships
  - Hellenistic: whole-sign houses, sect, traditional rulerships, sect light, time-lord techniques (zodiacal releasing, profections, ascensions)
  - Vedic: sidereal with selectable ayanāṃśa, vargas (divisional charts D1, D9, D10, etc.), nakshatras, dashas (Vimshottari at minimum)
- Saved chart storage with rendering metadata

### 3. Planetary hours
- Algorithm: sunrise/sunset based, dividing the daylight and nighttime arcs into 12 hours each
- Location-aware (latitude + longitude required; default from user profile)
- Day ruler + hour ruler with traditional Chaldean order
- Current planetary hour widget; upcoming planetary hour table for the day/week
- API: "next 3 Mars hours within the next 7 days at my location"

### 4. Astronomical events
- Pre-computed event stream: new/full moon, quarter moons, lunar VOC start/end, planet ingresses, planet stations (retrograde / direct), eclipses (solar + lunar), conjunctions, oppositions, squares, trines, sextiles between major planets
- Stored in `event` table; precomputed on first start for a range, lazily extended
- Subscription model: users subscribe to event categories for in-app or email notifications
- Festival overlays:
  - Wheel of the Year (Sabbats) — extensible to regional variants
  - Greek festival calendar (Anthesteria, Thesmophoria, Pyanepsia, Eleusinia, Bouphonia, etc.) — with reconstructions noted where sources are partial
  - Hekate's Deipnon (each dark moon) + Noumenia (first crescent)
  - Thelemic feast days (Equinoxes, Solstices, Crowley's birthday, the founding of the OTO, etc.)
  - Roman religious calendar (Calendar of Numa with Nundinal cycle, for Hellenic/Roman folk)
  - Egyptian decanal feast days
  - Hindu festivals
  - User-defined custom festivals
- Each festival entry has provenance notes and a reading list (linked to library catalog in Phase 04)

### 5. Election finder
- Constraint engine: a user specifies dignity rules, lunar conditions, planetary hour requirements, aspect requirements, void-of-course avoidance, latitude window, time window
- Searches forward through the ephemeris in time slices, scores each window, returns top-N matches
- Saved election queries (`election_query` table) — rerunnable, schedulable as background tasks
- Example pre-built queries: "consecrate a Venus talisman," "consult Mercury before correspondence," "do an Hekate working"
- Multi-tradition: same UI, different scoring engines (Hellenistic dignity vs. modern symbolic vs. Vedic strength)

### 6. Liber Resh tracker
- Computes sunrise / noon / sunset / midnight per user location
- Notifications at each transition
- Streak tracking, completion log, configurable variants (different formulae for different traditions)
- Integrates with journal: each adoration creates a log entry

### 7. Frontend
- Multi-calendar today widget (shows current day in all enabled calendars stacked)
- Planetary hours strip (current + next several)
- Lunar phase indicator
- Astrological chart renderer (SVG, multi-tradition theming, accessible markup)
- Calendar surface with festival overlays
- Election finder UI (constraint builder + ranked results)
- Liber Resh dashboard

### 8. APIs
- `GET /api/v1/calendar/today` — multi-calendar today
- `GET /api/v1/astro/chart` — compute and return a chart
- `GET /api/v1/astro/now` — current sky state
- `GET /api/v1/astro/planetary-hours` — for date range + location
- `POST /api/v1/astro/election/search` — election finder
- `GET /api/v1/events` — astronomical and festival events stream

## Design notes

- Time-zone handling is famously error-prone. Use UTC internally everywhere; convert at the edges.
- Swiss Ephemeris files are ~400MB; ship a slimmed-down range (1800–2400) and document how to extend.
- Festival reconstructions (especially Ancient Greek) require careful sourcing. Cite primary and secondary sources in the event metadata. Note where scholarship is contested.
- The election finder's scoring function is itself an extension point; plugins can register custom scorers.

## Risks

- **Risk:** Swiss Ephemeris licensing requirements within AGPL project. **Mitigation:** Document compliance: we are AGPL, we comply with SwissEph terms. Bundle license texts.
- **Risk:** Festival data quality / cultural appropriation concerns. **Mitigation:** Cite sources; consult practitioners from each tradition where possible (Hindu, Egyptian, etc.); prefer "documented practice" framing over reconstruction.
- **Risk:** Performance of forward search across years. **Mitigation:** Precompute event streams; cache aggressively; expose progress for long-running election searches.

## Definition of Done

- [ ] All built-in calendars round-trip and render with locale awareness
- [ ] Astrology engine validated against reference charts (Astrodienst, Solar Fire)
- [ ] Multi-tradition house calculations cross-checked
- [ ] Planetary hours validated against published tables at multiple latitudes
- [ ] Event stream populated for ±50 years from current date
- [ ] Election finder returns sensible results on canonical queries
- [ ] Liber Resh transitions fire at correct local times across DST boundaries
- [ ] Frontend chart renderer accessible (semantic SVG, alt text, table fallback)
- [ ] All festival entries cite at least one primary or scholarly source
