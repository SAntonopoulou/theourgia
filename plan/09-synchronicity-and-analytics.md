# Phase 09 — Synchronicity & Analytics

> The scientific illuminism layer. The synchronicity log, the multi-axis tagging substrate, the query builder, the visualization layer, the network-aggregate analytics. The thing that lets a magician treat their practice as a body of evidence.

## Goal

Make the magician's record genuinely queryable. Surface patterns that no single entry shows. Let networks pool data (opt-in, anonymized) to do the long-arc studies that solo practitioners cannot do alone. This is the heart of what Theourgia is trying to be that no other tool offers.

## Dependencies

- Phase 00 (Foundations)
- Phase 01 (Core Architecture)
- Phase 02 (Frontend Foundations)
- Phase 03 (Time & Cosmos) — all the temporal/astrological axes
- Phase 04 (Journaling) — entries are the primary data
- Phase 05 (Magical Beings) — entities as a tagging axis
- Phase 06 (Divination & Practice) — workings, dreams, divinations as data

## Deliverables

### 1. Synchronicity log
- Quick-capture surface: global keyboard shortcut (configurable) opens a small modal anywhere in the app — type description, hit save
- Auto-tagged on save with:
  - Current astrological snapshot (positions, aspects, planetary hour, lunar phase, void status)
  - Calendar stamp (all enabled calendars)
  - Location (if permitted)
  - Weather (if permitted and configured)
  - Recent context (last entry written, last working performed, last entity invoked) — provided as suggested tags, user confirms
- `synchronicity` table: id, vault_id, occurred_at, description, intensity (1–10), category (number sequence, name occurrence, dream-spillover, animal omen, song lyric, overheard speech, weather, object encounter, electromagnetic, custom), structured_data (e.g., the number itself for number syncs), linked_entries, linked_entities, linked_workings, astro_snapshot, weather_snapshot, location

### 2. Multi-axis tagging substrate
- Every recorded item (entry, working, divination, dream, offering, synchronicity, body snapshot) carries:
  - `astro_snapshot` (Phase 03)
  - `calendar_stamp` (Phase 03)
  - `entities` (Phase 05)
  - `tags` (free)
  - `tradition_tags` (one or more)
  - `mood`, `energy`, `health_notes` (Phase 04 body & state)
  - `outcome_rating` (when applicable): a multi-axis rating — subjective experience (0–10), perceived efficacy (0–10), measurable result (0–10), time-to-manifest (in days), confidence, notes
- All of these are indexable, queryable, and joinable

### 3. Query builder
- UI: Notion-style chained filter expressions
- Axes available: any field on any recorded item; any astrological condition (e.g., "Moon in Cancer," "Mars dignified," "Venus retrograde," "any aspect to natal Sun within 2°"); any calendar feature ("during Anthesteria"); any entity (linked); any tradition; any tag; any free-text match; any body-state condition
- Boolean composition: AND / OR / NOT / NESTED
- Save queries (`saved_query` table); rerun; share with networks
- Query examples to ship: "All Hekate workings during waning moon," "All Mars-hour workings rated > 7," "All synchronicities involving 93 within 7 days of a Thelemic ritual"

### 4. Visualizations
- Time-series view: outcomes across a date range (lines/dots; color by tradition / entity / type)
- Heatmaps: outcome quality by planetary hour × day-of-week; by lunar phase × season
- Correlation matrix: across selected axes, surface Pearson / Spearman correlations
- Network graph: entities ↔ workings ↔ outcomes (force-directed visualization of the practice)
- Sankey: flow from intention → working type → outcome quality
- Calendar heatmap: practice frequency over the year
- All chart components built on top of a custom Tufte-aware visualization layer (avoid garish defaults)

### 5. Saved studies
- A "study" is a named, persistent query + visualization configuration + narrative notes
- Ship template studies: "Hekate workings analysis," "Lunar phase efficacy study," "Planetary hours ranking by my outcomes"
- Studies are publishable to networks for collective consideration

### 6. Cross-magician aggregate (opt-in network analytics)
- Per-vault opt-in toggle per study type
- Anonymization: outcomes flow to the network hub as anonymized records (no user identifier, no entry text, only the structured axes)
- Network-aggregate queries: a hub admin can run aggregate studies across member contributions
- Differential privacy noise (configurable epsilon) added to aggregate counts
- Member opt-in is per-study, per-axis (e.g., "share my outcome ratings but not my entities," "share entity participation but not text")
- Audit log: every aggregate query is logged and visible to contributors
- No data ever leaves the network hub except via explicit publication action by a member

### 7. Pattern detection
- Automated weekly digest: surface statistically interesting patterns from the past week — "your Mars-hour outcomes are markedly higher than the rest"
- Anomaly detection: an unusual cluster of synchronicities, an outlier in a working's outcome
- All inferences are presented with confidence intervals and sample sizes; never as oracular pronouncements

### 8. Frontend
- Synchronicity quick-capture (global)
- Analytics dashboard: today / week / month / year / all-time views
- Query builder surface
- Saved studies index
- Per-study page with viz + notes + share controls
- Network analytics page (when in a hub with aggregate analytics enabled)
- Cohort analysis surface (compare your own data across periods, or compare across network members in aggregate)

### 9. APIs
- `GET/POST /api/v1/synchronicities`
- `POST /api/v1/analytics/query` — run a query (sync) or schedule (async for long ones)
- `GET/POST /api/v1/analytics/studies`
- `GET /api/v1/analytics/digest/weekly`
- Network-aggregate endpoints under `/api/v1/hubs/:id/analytics/*`

## Design notes

- Statistical rigor matters. Display confidence intervals; never overclaim. Magic is patterns observed across many trials, not single anecdotes.
- The Tufte-style approach: high data-ink ratio, small multiples, restrained color, clear axis labels.
- The differential-privacy parameter choice for network aggregates needs documentation and review.
- Quick-capture must be genuinely fast. < 200ms from keystroke to modal appearing.

## Risks

- **Risk:** Spurious correlations dressed up as discovery. **Mitigation:** Multi-test correction (Bonferroni / FDR) on automated digests; always show sample size; documentation on "what a finding actually means."
- **Risk:** Privacy leakage in aggregate analytics. **Mitigation:** DP noise; minimum cohort size before any aggregate is shown; security review of the aggregate pipeline.
- **Risk:** Viz layer becomes uglygenerator. **Mitigation:** Design-system enforcement; visual review of every chart variant.

## Definition of Done

- [ ] Synchronicity quick-capture fast and accurate
- [ ] All axes queryable; query builder fluid
- [ ] All visualization types implemented and accessible (table fallback for each)
- [ ] Pattern detection surfaces real signal in a test dataset
- [ ] Network aggregate end-to-end with DP and audit logging
- [ ] Saved studies portable across vaults
- [ ] Weekly digest delivers via email + in-app
- [ ] Performance: queries against 100,000-entry vault return < 2s for typical filters
