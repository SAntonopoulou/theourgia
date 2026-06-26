# Phase 11 — Media Library

> Images, audio, video, and the pilgrimage / sacred-site map. Media is the texture of practice — altar photos, ritual recordings, lecture videos, the landscape of pilgrimage.

## Goal

A unified, well-organized, secure media library with strong privacy defaults, video integration that respects practitioner needs (private and public), and a sacred-site mapping surface that protects location data while allowing meaningful record-keeping.

## Dependencies

- Phase 00–04
- Phase 02 (frontend) — uploaders, players
- Phase 03 (Time & Cosmos) — auto-tagging media with capture-time data

## Deliverables

### 1. Media asset model
- `media_asset` table: id, vault_id, kind (image, audio, video, document), mime, original_filename, storage_key, size_bytes, width, height, duration, captured_at (from EXIF or user), uploaded_at, alt_text, caption, tags, linked_entries, linked_workings, linked_entities, location_lat, location_lon (privacy-controlled), visibility, encrypted (bool — for sealed media)
- Per-vault storage quota, configurable per instance
- Versions / variants: derived thumbnails, web-optimized variants, captioned variants

### 2. Image gallery
- Upload via drag-drop, paste, or file picker
- **EXIF stripping by default** on upload (privacy); user can opt to retain via per-upload toggle
- Auto-tagging: dominant colors, dimensions, optional alt-text generation (local model, opt-in)
- Album / collection support
- Annotation: caption + free-form notes per image; ability to place markers on images (e.g., "this is where I placed the sigil")
- Lightbox viewer with keyboard nav
- Image manipulation: basic crop, rotate, brightness/contrast (non-destructive, edits saved as variants)
- Per-image visibility controls

### 3. Audio library
- Recording UI from Phase 04 augmented
- Bulk upload of pre-recorded audio
- Categories: ritual recordings, voces magicae, chants, ambient, lectures, dictation, music
- Waveform display + scrubbing
- Optional transcription (local Whisper, opt-in, multiple model sizes)
- Per-audio metadata: recorded_at, location, participants, ritual context

### 4. Video integration
- **YouTube embed support:** paste URL, video metadata fetched, embed rendered (with privacy-enhanced mode by default)
- **Self-hosted video (optional):** integration with Cloudflare Stream or Mux for users who want full sovereignty; per-vault toggle for which backend
- Custom video player wrapper (no third-party trackers when self-hosted)
- Captions / subtitles: upload SRT/VTT; auto-generation via local Whisper (opt-in)
- Chapters and bookmarks
- Per-video visibility (public / private / network / sealed)
- Video pages on the public site (per-vault video index for video-publishing magicians)

### 5. Pilgrimage / sacred site log
- `pilgrimage_site` table: id, vault_id, name, description, lat, lon, location_precision (exact, neighborhood, region — controls how publicly displayed), visited_at (multiple — site can be visited many times), tradition_tags, deities_associated (entity links), photos (m2m), notes (rich text)
- Map view: leaflet with OpenStreetMap tiles
- Privacy-aware rendering:
  - `personal` visibility: exact coords for the owner
  - `viewer`: exact coords for invited viewers
  - `network`: jittered coords (random within a configurable radius)
  - `public`: city-level only, never exact
- Per-site entry log (linked to journal entries when the visit was recorded)
- Pilgrimage routes: ordered sequences of sites with notes (e.g., "Eleusis route")

### 6. Tool / altar photo integration
- Phase 07's tool registry integrates here for photos
- Altar setup snapshots: full-altar photos with marker overlay identifying tools (matched to tool registry)

### 7. Frontend
- Media library surface: filterable grid + list view
- Per-asset detail page (zoom, EXIF if retained, linked entries, edit metadata)
- Map view for pilgrimage sites
- Album surface
- Per-vault public gallery (subset of public-visibility media)

### 8. APIs
- `GET/POST/PATCH/DELETE /api/v1/media`
- `POST /api/v1/media/upload` — chunked upload for large files
- `GET /api/v1/media/:id/download` — token-gated for restricted visibility
- `GET/POST /api/v1/albums`
- `GET/POST /api/v1/pilgrimage-sites`
- `GET /api/v1/calendar-feeds/:vault_slug.ics` — vault iCal feed
- `GET /api/v1/calendar-feeds/hub/:hub_slug.ics` — hub group ritual iCal feed
- `GET/POST /api/v1/calendar-feeds/config` — configure which event categories the feed includes

### 9. iCal / WebCal feed exports
- **Per-vault subscribable iCal feed** for planetary hours, festivals, working windows, scheduled rituals, scheduled publications
- **Per-hub subscribable iCal feed** for scheduled group rituals — each event embeds metadata for participants' timezone-localized planetary hour
- **Subscribable from any iCal client** — Apple Calendar, Google Calendar, Outlook, Fastmail, Thunderbird; one-way read-only export
- **Configurable feed scope** per vault — which event categories to include (planetary hours, lunar phases, festivals only, custom)
- **Token-protected feeds** for non-public schedules (the magician shares the unique URL with trusted readers)
- **Per-feed cache headers** to avoid hammering the server with calendar-client polling
- **iCal extensions** for Theourgia-specific properties (planetary hour metadata, lunar phase, tradition tags) — degrades gracefully in standard clients

### 10. Network group ritual feed
- **Per-hub iCal feed** for upcoming and recently-completed group rituals
- **Localized in each subscriber's timezone** with planetary hour at their location embedded in each event
- **Feed includes**: ritual title, description, materials list, links to shared ritual scripts (network-visibility content)
- **RSVP integration** — subscribing magicians can mark attendance from their client (via webhook to Theourgia)
- **Per-ritual cancellation** propagates through the feed

## Design notes

- Privacy by default. EXIF strip, coordinate obfuscation, visibility downgrade warnings.
- Object storage: Hetzner Storage Box or S3-compatible (MinIO for self-hosters; Hetzner, Backblaze B2, AWS S3 for managed targets). Configurable.
- Large file handling: chunked uploads (TUS protocol or similar), resumable.
- Self-hosted video is expensive in bandwidth. Default to YouTube embeds with a clear migration path for users who want sovereignty later.

## Risks

- **Risk:** Storage costs balloon. **Mitigation:** Per-vault quotas; clear usage dashboard; optional external storage backends.
- **Risk:** Pilgrimage coord leakage on public view. **Mitigation:** Jittering tested with edge cases; coordinate display deliberately fuzzy on public views.
- **Risk:** Video integration becomes a tar pit. **Mitigation:** YouTube embed as the default; self-hosted as a plugin / optional.

## Definition of Done

Status as of 2026-06-26 (B132 → B136 closed). DoD items shipped this
phase are checked; deferred items are scoped to the phase they actually
land in.

- [x] Upload, view, download for media works (begin → complete →
      delete on top of the Phase 01 S3CompatibleBackend; H07
      Cluster C surfaces wire to live endpoints).
- [x] EXIF stripping verified — Protocol-isolated stripper with
      NullExifStripper (CI fallback) + PillowExifStripper (lazy
      import). Strip step records pre/post sizes; fixture-based
      round-trip test runs locally when Pillow is installed.
- [ ] Audio waveform + scrub + optional transcription functional —
      audio precompute + transcription pipeline explicitly deferred
      to Phase 12+ (the H07 Audio Library frontend already pins
      "no play-counts"; backend keeps that contract).
- [ ] YouTube embeds with privacy-enhanced mode — privacy-proxy
      deferred to Phase 14 (plugin ecosystem).
- [ ] Self-hosted video reference integration with Cloudflare
      Stream — deferred to Phase 14.
- [x] Pilgrimage map renders with coordinate FLOORING per
      visibility — precision is a one-way ratchet via the shared
      apply_precision_floor helper; sealed sites STRIPPED from
      list; sealed-cluster is count-only.
- [x] Storage quota enforcement — 5 GB per vault default; 413
      returned on /uploads/begin when used + claimed > quota.
- [ ] Per-vault public gallery — deferred to Phase 15 hardening.

Additional honesty invariants pinned this phase:

- [x] **No play_count anywhere** — source-level CI test asserts
      the literal substring is absent from every Phase 11 router.
- [x] **No view_count anywhere** — same test set.
- [x] **No /forge · /clone · /peek-sealed · /reveal · /unseal
      endpoints** anywhere in Phase 11 routers.
- [x] **No /promote · /sharpen · /refine · /raise-precision
      endpoints** on the pilgrimage router (precision is FLOOR).
- [x] **No /within-radius · /nearest endpoints** on the
      pilgrimage router (would leak precision).
- [x] **Sealed media surfaces as count-only** — defence in depth
      via the schema-level `_to_read` sealed branch + the list
      endpoint's `sealed_count` aggregate.
- [x] **Sealed pilgrimage anniversaries excluded ENTIRELY** from
      iCal feeds (no count-only fallback for these).
- [x] **iCal sealed-day collapse** — `SealedDayMarker` dataclass
      restricted to `{date, count}` by construction; produces
      ONE all-day VEVENT per date with summary
      `"{N} sealed entries today"`, NO description, NO location.
- [x] **iCal feed URL unversioned** — mounted on app, not
      /api/v1, so subscribers' calendar clients stay stable.
- [x] **Sealed-AND-strip rejected at upload begin** — encrypted
      bytes can't be re-stripped server-side; explicit 400.
- [x] **Precision floor is APPLIED at write time** — the stored
      lat/lng IS the quantized value; finer precision is
      irreversibly lost.
- [x] **PATCH cannot mutate location_lat / location_lng /
      stored_precision / kind / sealed** on pilgrimage sites —
      schema omits them by construction.
- [x] **Linked workings must be owned by the caller** —
      sealed entries CAN be linked, but id must match owner_id.
- [x] **Nominatim attribution embedded verbatim** as a schema
      default value on PilgrimageSiteRead + ListResponse.
