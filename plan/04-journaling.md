# Phase 04 — Journaling

> The heart of the practitioner's daily use. Journal entries — written, drawn, sensed, recorded — with multi-calendar stamping, multi-mode search, visibility controls, custom templates, body diagrams, audio attachments, the library catalog, and the `/quote` autocite mechanism.

## Goal

Deliver a fully realized journaling environment that a serious practitioner can use every day for years. Every other phase that records *anything* writes to or extends the structures defined here.

## Dependencies

- Phase 00 (Foundations)
- Phase 01 (Core Architecture) — entry / attachment / tag schema, encryption, RLS
- Phase 02 (Frontend Foundations) — Tiptap editor, design system
- Phase 03 (Time & Cosmos) — astrological + calendar stamping

## Deliverables

### 1. Entry data model
- `entry` table:
  - `id` (UUIDv7), `vault_id`, `author_id`, `parent_id` (for replies/threads), `kind` (discriminator)
  - `title`, `body` (Tiptap JSON), `body_text` (denormalized plaintext for search)
  - `tags` (m2m), `entities` (m2m to magical beings, populated in Phase 05)
  - `visibility`, `encryption_mode`, `encrypted_payload` (when `sealed`)
  - `occurred_at` (when the recorded event actually happened, may differ from `created_at`)
  - `location` (lat/lon optional, redacted for public visibility)
  - `weather_snapshot` (auto-fetched from weather API at `occurred_at`; opt-in)
  - `astro_snapshot` (auto-computed at `occurred_at` using Phase 03)
  - `body_state_id` (fk to body_snapshot)
  - `mood`, `energy` (scalar 1–10), `health_notes`
- `entry_revision` table — full version history with diff browsing
- Discriminator `kind`: `note`, `ritual_log`, `divination`, `dream`, `synchronicity`, `working`, `magical_record`, `pathworking`, `scrying`, `body_practice`, `meeting_note`, `study_note`, `liber_resh`, and plugin-defined

### 2. Editor extensions (Tiptap custom blocks)
- `<chart>` — embedded astrological chart (configurable parameters; static or live)
- `<sensation>` — embedded body sensation diagram
- `<gematria>` — gematria value of an inline phrase (live-computed)
- `<quote>` — quotation block with citation linked to library
- `<correspondence>` — table cell preview from personal correspondence systems
- `<calendar-stamp>` — multi-calendar date display
- `<voice-recording>` — audio block with waveform and transcript (Whisper or similar; opt-in)
- `<sigil>` — embedded sigil (created via Workshop in Phase 07)
- `<entity-ref>` — magical-being mention with hover preview (Phase 05)
- `<divination-result>` — embedded reading (Phase 06)
- `<ritual-step>` — numbered ritual step with optional countdown/timer
- `<vox-magicae>` — chant block with pronunciation hint
- Custom Tiptap marks: `<greek>`, `<hebrew>`, `<latin>`, `<sanskrit>` — for proper typography of inline foreign text

### 3. Templates
- Built-in templates: Magical Record (Crowley structured), Ritual Log, Dream, Divination, Synchronicity, Liber Resh, Banishing, Invocation, Scrying, Tarot Reading, Pathworking, Astrology Reading
- Template designer UI (Themeco-Pro-style drag-and-drop visual composer):
  - Section / row / column layout primitives
  - Block insertion from a palette
  - Per-block configuration (visible labels, prompts, default values, required flag)
  - Save as template (personal, vault-shared, or publishable)
- Template marketplace (deferred to Phase 14 plugin registry, but data structures support it now)
- Templates are JSON-serializable; portable across instances

### 4. Visibility and access controls
- Per-entry visibility selector with explicit warnings when downgrading from `personal` → less private
- Private viewer accounts: vault owner creates an account, shares a credential, named viewer can read entries marked `viewer`
- Default visibility per-entry-kind (e.g., `working` defaults to `personal`; `meeting_note` defaults to `viewer`)
- "Seal entry" action: converts to Mode B zero-knowledge encryption, with explicit warning
- Visibility migration tooling: bulk-change visibility for entries matching a filter

### 5. Search
- Lexical full-text search via Postgres FTS over `body_text` and `title`
- Semantic search via `pgvector`: embeddings computed by a local model (e.g., `nomic-embed-text` via Ollama, or a HuggingFace model behind FastAPI)
- Filter chips: by tag, by entity, by date range (in any calendar), by astrological condition (e.g., "entries written while Mars was in Aries"), by visibility, by kind
- Saved searches (`saved_query`)
- Search results respect RLS — encrypted-search hooks for Mode B sealed entries (client-side decrypt + filter on small candidate set)

### 6. Body sensation diagram
- Front / back / side / palm / sole SVG silhouettes (gender-neutral, multiple morphology options)
- Click-to-place markers with:
  - Sensation type (warmth, pressure, vibration, tingling, pulling, void, electric, expansion, contraction, pain, pleasure — extensible)
  - Intensity (0–10)
  - Color coding
  - Per-marker notes
- Save as `body_snapshot`; embeddable in any entry
- "Body history" view: a timeline scrubber to see how your body record evolved across workings

### 7. Audio attachments
- Recording UI: live waveform, gain control, optional noise gate
- Storage: object storage (Hetzner / S3); per-vault quotas
- Optional transcription via local Whisper (opt-in; user-chosen model size)
- Playback with waveform scrubber

### 8. Library catalog
- `book` table: title, author, edition, publisher, year, ISBN, holdings (physical/digital/audiobook), shelf location, status (owned/read/reading/want), tags, language(s), tradition tags
- `book_note`: per-book free-form notes
- `quote`: extracted quotations with page reference, optional image of the page
- Import flows: BibTeX, RIS, manual entry, ISBN lookup (Open Library)
- Export: BibTeX, CSV, JSON
- Reading queue / curriculum builder: ordered lists ("Liber Aleph reading plan"), progress, target dates
- Per-book correspondence to the magician's traditions (a Vedic text might be referenced from a Thelemic working)

### 9. `/quote` autocite mechanism
- Slash command in editor opens a popover with full-text search across the library's quotes
- Selecting a quote inserts a `<quote>` block with citation, page reference, language tags
- Citation format configurable (Chicago, MLA, custom)
- "Cite this entry's source" hover for any quote block

### 10. Print and export
- Per-entry export: PDF, Markdown, HTML, EPUB
- Bulk export: a year's journal as a bound PDF; a tag's collection as an EPUB
- Print-ready ritual sheets: a special print layout with script + correspondences sidebar + ritual instructions
- All exports respect visibility (sealed entries excluded unless decrypted)

### 11. Multi-calendar / astro auto-stamping
- On entry creation, the system populates `astro_snapshot` and computes a multi-calendar representation
- The user can override `occurred_at` to backfill historical entries; auto-stamp recomputes
- Time zone of `occurred_at` stored alongside UTC

### 12. APIs
- `GET/POST/PATCH/DELETE /api/v1/entries`
- `GET /api/v1/entries/:id/revisions`
- `POST /api/v1/entries/:id/restore-revision`
- `GET /api/v1/search` — unified search (lexical + semantic)
- `GET/POST /api/v1/templates`
- `POST /api/v1/entries/:id/seal` — convert to zero-knowledge
- `GET/POST /api/v1/library/books`
- `GET/POST /api/v1/library/quotes`
- `GET/POST /api/v1/body-snapshots`
- `GET/POST /api/v1/blog-posts`, `GET/POST /api/v1/blog-posts/:id/schedule`
- `GET/POST /api/v1/identities`, `GET /api/v1/me/identities/default`

### 13. Blog platform (distinct from diary)
- General blog functionality alongside the magical record / journal — for magicians who want a public-facing writing surface separate from their practice log
- **Post types**: article, photo, link, quote, video embed
- **Per-post status**: draft / scheduled / published / archived
- **Multi-author support** when multiple identities are configured on a single vault
- **RSS / Atom / JSON Feed** for the blog stream
- **Per-post comments with moderation** (opt-in per post)
- Blog data shares the entry model (kind = `blog_post`) but has its own visibility default (`public`) and its own rendering on the public site

### 14. Time-released / scheduled content
- **Scheduled publication** for any entry, blog post, publication, newsletter issue
- **Posthumous publication** — entries scheduled to release after a digital-inheritance trigger fires (see plan/15)
- **Curriculum unlocking** — content unlocks for subscribers on specific dates ("Lesson 7 unlocks Beltane 2027")
- **Time-released bundles** — within a tradition bundle, individual rituals can be marked "available after [date / initiation grade attained / etc.]"
- Background scheduler (Celery beat) handles releases; missed releases caught up on next run
- Admin UI surfaces upcoming scheduled releases with edit / cancel controls; "what's queued" view per vault

### 15. Multi-identity authoring (pseudonymity)
- A vault supports 1+ author **identities** (legal name, magickal name(s), order name, ancestor name, ritual-context names)
- Each entry, post, publication has an `authored_by_identity` field set at write time
- **Identity picker in editor** — default identity per entry kind configurable in settings
- Public displays show the chosen identity for each piece of content
- **Identity-scoped private notes on entities** — different identities can keep separate `notes_private` on the same entity (e.g., your initiation-context name's notes on Hekate are separate from your daily-practice name's notes)
- Default convention: built-in copy and platform-managed text always refer to the maintainer by their chosen magickal name

## Design notes

- The editor is the most-used surface. Optimize it ruthlessly for keyboard fluency.
- Templates must be portable across instances; shape them with that in mind.
- The library catalog feels mundane but is the spine of the autocite feature, and indirectly the scholarship layer of the project.
- Sealed entries cannot be full-text searched server-side. Be honest about this in UX. Encrypted search libraries exist but bring complexity; defer.

## Risks

- **Risk:** Embedding model dependencies bloat the install. **Mitigation:** Make semantic search opt-in; ship without an embedding model and let the user choose.
- **Risk:** Audio storage costs balloon. **Mitigation:** Per-vault quotas; transparent storage usage UI; optional external storage backend.
- **Risk:** Tiptap custom blocks proliferate and become inconsistent. **Mitigation:** A `MagicalBlock` design system with shared chrome (selector, visibility, edit/view toggle).

## Definition of Done

- [ ] All entry kinds round-trip through API and editor
- [ ] All custom blocks implemented and Storybooked
- [ ] Templates: built-ins ship, designer works, save/load works
- [ ] Search: lexical + semantic + filter chips all functional
- [ ] Body sensation diagram: full picker, save, embed, replay
- [ ] Audio: record, play, store, transcribe (when enabled)
- [ ] Library catalog: import/export tested with sample BibTeX
- [ ] `/quote` autocite works end-to-end
- [ ] Print export produces a beautiful PDF on a representative ritual log
- [ ] Visibility downgrade flow has clear confirmations
- [ ] Encryption: sealed entries verified zero-knowledge end-to-end
- [ ] Performance: 5,000-entry vault searchable in < 200ms
