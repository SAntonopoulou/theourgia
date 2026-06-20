# Phase 05 — Magical Beings

> The relational layer. Gods, spirits, angels, demons, saints, ancestors, servitors, beloved dead. Plus the oath/vow ledger, initiation tracker, and the extended library catalog functions that connect texts to entities.

## Goal

Make the magician's network of relationships first-class data. Every working, offering, contract, and synchronicity ties back here. The entity ledger should feel like a personal Boswell — a record of who you've worked with, what they've asked, what they've given, and where you stand.

## Dependencies

- Phase 00 (Foundations)
- Phase 01 (Core Architecture)
- Phase 02 (Frontend Foundations)
- Phase 03 (Time & Cosmos) — for timing offerings, festival days, election of contact
- Phase 04 (Journaling) — entries link to entities

## Deliverables

### 1. Entity model
- `entity` table:
  - `id`, `vault_id`, `name` (with alternate spellings as JSON array), `epithets` (array)
  - `kind` (god, goddess, spirit, daemon, angel, demon, saint, ancestor, familiar, servitor, egregore, beloved dead, other)
  - `tradition_tags` (Hellenic, Thelemic, Hermetic, Goetic, Heptamerontic, Vedic, Egyptian, Folk, Personal, etc.)
  - `attributions` (planetary, elemental, sphere, decan, day, hour, color, scent, herb, stone, sound, number — all references to correspondence tables)
  - `seal_id` (fk to attachment; or generated sigil)
  - `portrait_id` (fk to attachment)
  - `pronouns` / `gender` (where applicable; entity-determined)
  - `summary`, `description` (rich text)
  - `relationship_status` (open, active, dormant, severed, contracted, observing)
  - `first_contact_at`, `last_contact_at`
  - `notes_private`, `notes_shareable`
  - `visibility` (defaults to `personal`)
- Linkable to: entries, offerings, contracts, workings, divinations
- Plug-in extension point: traditions can register additional metadata fields

### 2. Offerings ledger
- `offering` table:
  - `id`, `vault_id`, `entity_id`, `working_id` (optional)
  - `offered_at`, `location`
  - `items` (structured: wine, water, milk, honey, incense, food, flowers, libation, blood, breath, song, dance, money, time — extensible)
  - `intention`
  - `reception_perceived` (none / faint / clear / strong / overwhelming)
  - `outcome_notes`
  - `astro_snapshot`, `multi_calendar_stamp`
- UI:
  - Per-entity offering history timeline
  - Recurring-offering scheduler (e.g., "Hekate's Deipnon, monthly")
  - Quick-offer flow from entity card

### 3. Contracts / pacts
- `contract` table:
  - `id`, `vault_id`, `entity_id`
  - `terms` (rich text)
  - `our_obligations` (structured items with status: pending / in-progress / fulfilled / overdue / waived)
  - `their_obligations` (same structure)
  - `effective_at`, `expires_at`, `renewable` flag
  - `witness_entities` (other beings invoked as witnesses)
  - `binding_kind` (verbal, written, blood, breath, item-bound, name-bound, etc.)
  - `dissolution_ritual_id` (optional reference)
- UI:
  - Active contracts dashboard
  - Obligation reminders (in-app and email)
  - "Mark fulfilled" workflow with reflection prompt

### 4. Beloved dead / ancestor registry
- Extension of entity model with `kind=ancestor` or `kind=beloved_dead`
- Additional fields: `relationship` (parent, grandparent, ancestor-generation, unrelated mentor, unknown), `dates_lived`, `cause_of_death` (optional, private), `burial_place`, `photo`
- Communication log: a special-cased divination/scrying log type for ancestor contact (Greek folk necromantic practice)
- Genealogy view (lightweight family tree; no integration with genealogy services to preserve privacy)

### 5. Oath / vow ledger
- `oath` table:
  - `id`, `vault_id`
  - `kind` (vow to self, tradition, body/order, deity, partner, community)
  - `recipient_entity_id` (optional)
  - `recipient_text` (when not an entity — e.g., "OTO Minerval initiation oath")
  - `text` (the vow itself, full)
  - `taken_at`, `expires_at` (optional), `renewal_cadence` (optional)
  - `status` (active, fulfilled, broken, renounced, lapsed)
  - `accountability_checkpoints` (scheduled self-reviews)
- Defaults to zero-knowledge encryption (`sealed`)
- Renewal flow with reflection journal entry created automatically

### 6. Initiation / grade tracker
- `initiation` table:
  - `id`, `vault_id`
  - `tradition` (OTO, Golden Dawn descendants, Wiccan covens, Hellenic mystery, personal self-initiation, etc.)
  - `grade_or_degree` (free-form to accommodate all traditions)
  - `received_at`, `location` (optional, encrypted)
  - `received_from` (initiator name, optional, encrypted)
  - `received_with` (other initiates present, optional, encrypted)
  - `oaths_taken` (m2m to `oath`)
  - `experience_notes` (rich text)
  - `verifications_received` (any tokens, names, signs, etc.)
- **Default to zero-knowledge encryption (`sealed`)**
- Explicit privacy explainer on first use; reminds the user that grade information may be sworn-to-secrecy
- No public view of initiation records ever (UI prevents publishing)

### 7. Servitors and egregores (chaos magic specific)
- `servitor` table:
  - `id`, `vault_id`, `name`, `sigil_id`, `purpose`
  - `created_at`, `creation_ritual_id`
  - `feeding_cadence` (daily / weekly / lunar / as-needed)
  - `feeding_method` (energy, attention, sigil-gaze, offering, etc.)
  - `last_fed_at`
  - `tasks` (m2m to a `servitor_task` table with status)
  - `lifespan_limit` (date, after which planned retirement)
  - `status` (active, dormant, retired, decommissioned)
- Egregores: same model with `kind=egregore`, `members` field linking to multiple human collaborators (used by hubs in Phase 12)
- Feeding reminder notifications
- Retirement ritual flow with reflection

### 8. Extended library catalog (entity-linked)
- Books referenced by entity (e.g., "Hekate" links to the Chaldean Oracles, Hesiod, Apuleius)
- Per-quote entity tagging (a quotation can reference the entity it discusses)
- "Read about Hekate" view: aggregate of all library entries tagged with Hekate, plus all your highlighted quotes about her

### 9. Frontend
- Entity browser: filterable by tradition, kind, planetary/elemental attribution
- Entity profile page with tabs: Overview, Offerings, Contracts, Workings, Synchronicities, Library, Notes
- Quick-link inserts entity refs into entries via `/entity` slash command
- Oath dashboard with active oaths and accountability check-in prompts
- Initiation dashboard (zero-knowledge by default; passphrase prompt on entry)
- Servitor dashboard with feeding reminders

### 10. APIs
- `GET/POST/PATCH/DELETE /api/v1/entities`
- `GET /api/v1/entities/:id/aggregate` — full relational dashboard data
- `GET/POST /api/v1/offerings`
- `GET/POST/PATCH /api/v1/contracts`
- `POST /api/v1/contracts/:id/fulfill-obligation`
- `GET/POST /api/v1/oaths`
- `GET/POST /api/v1/initiations` — requires `sealed` mode handshake
- `GET/POST /api/v1/servitors`
- `POST /api/v1/servitors/:id/feed`

## Design notes

- The entity model must not impose a single tradition's ontology. A god in one tradition might be a demon in another; the user's tagging is canonical.
- Offerings to ancestors are common; the UI must not assume entities are mythic.
- Initiation data is the most sensitive content in Theourgia. Treat the UI accordingly — even loading the page should be a deliberate, authenticated action.
- Servitors blur the line between "thing the user made" and "entity" — design the UI to honor that ambiguity without being precious about it.

## Risks

- **Risk:** Tradition wars in defaults (whose Goetia hierarchy, whose angel list?). **Mitigation:** Ship empty; let users add their own. CSV import of common lists as optional plugins (Phase 14).
- **Risk:** Initiation data exposure. **Mitigation:** Default sealed; UX hard-prevents publishing; document the threat model explicitly.
- **Risk:** Servitor data crossing the line into "Tamagotchi" mode. **Mitigation:** Tone all UI copy to be serious and quiet; no "your servitor is hungry!" gamification.

## Definition of Done

- [ ] Entity CRUD with all metadata fields and m2m relationships
- [ ] Offerings, contracts, oaths, initiations, servitors — full lifecycles tested
- [ ] Initiation records default sealed; impossible to publish
- [ ] Entity profile aggregates correctly from all linked sources
- [ ] `/entity` slash command inserts references that render with hover preview
- [ ] Feeding reminders fire reliably for servitors
- [ ] Contract obligation reminders work
- [ ] Library catalog entity-tagging round-trips
- [ ] Privacy review specifically for this phase signed off
