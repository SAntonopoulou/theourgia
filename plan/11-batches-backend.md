# Phase 11 backend authoring plan (B132 → B136)

**Status:** OPEN — ready to execute.
**Modeled on:** `plan/08-batches-backend.md` · `plan/09-batches-backend.md` · `plan/10-batches-backend.md`.

This document **locks every backend product decision** for Phase 11
(Media Library + Pilgrimage Map + iCal Feed). The implementation
agent does not pick alternatives; the agent renders the locked
decisions across migrations, models, routers, and tests.

**Scope:** the per-vault media + pilgrimage path that wires the
H07 Cluster C frontend (8 surfaces · all shipped) to live data.

**Explicitly out of scope (Phase 12+ or 15+):**

- Real OSM tile rendering on the Pilgrimage Map (the SVG stand-in
  per H07 §S6.3 ships as the v1 surface; Leaflet wiring stays
  optional even later — the precision/sealed/`‡` behaviours are
  the spec).
- Server-side waveform peak extraction for audio (browser-side
  WebAudio for now; precomputed peaks ship in a Phase 15 hardening
  batch).
- Video transcoding pipeline (we accept what the practitioner
  uploads; transcoding is a follow-up when usage demands it).
- Network-shared media (federation hub-scoped galleries) — Phase
  12+.
- Background EXIF stripping retro-active on existing rows (we
  strip on upload only; existing rows keep whatever state they
  were stored in).

Carry-forward backend conventions (proven B103-B131):

- `owner_id: UUID | None` with `ForeignKey("user.id", ondelete="SET NULL")`.
- Inline Pydantic schemas in router files.
- Pagination via `limit: int = 100` (max 500).
- `SoftDeleteMixin` via `deleted_at`.
- Honesty rules enforced at the API layer; DB constraints back
  the most critical ones.
- Federation prep (`canonical_id` + `instance_id`) explicitly
  DEFERRED to Phase 12.

---

## Execution order summary

| Batch | Title | Dependencies | Est. lines | Tests added |
|-------|-------|--------------|-----------:|------------:|
| B132 | Media asset table + sealed substrate + link-count cache | Phase 04 (entry) + B108 (vaultCrypto) | ~850 | ~30 |
| B133 | R2 upload pipeline + presigned URLs + EXIF strip | B132 + Phase 01 (R2 substrate) | ~900 | ~28 |
| B134 | Pilgrimage sites + precision floor + re-quantize | (independent of B132/B133) | ~750 | ~30 |
| B135 | iCal feed serializer | B132 + B134 + Phase 03 (Liber Resh + lunar) | ~600 | ~22 |
| B136 | Phase 11 close-out (CHANGELOG · FEATURES · README · memory) | B132-B135 | (docs) | (none) |

Approximate total: ~3100 lines + ~110 tests.
Backend test count target: 2040 → ~2150 by Phase 11 close.

Alembic chain: 0052 → 0053 → 0054 → 0055 → 0056 (one per batch
B132-B135; B136 ships no migrations).

---

## B132 — Media asset table + sealed substrate + link-count cache

**Files created:**

- `backend/theourgia/models/media.py`
- `backend/alembic/versions/0053_phase11_media.py`
- `backend/theourgia/api/routers/v1/media.py`
- `backend/tests/test_media.py`

**Models:**

```python
class MediaKind(str, enum.Enum):
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"


class ExifPolicy(str, enum.Enum):
    RETAINED = "retained"
    STRIPPED = "stripped"


class MediaAsset(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "media_asset"
    owner_id: UUID = Field(foreign_key="user.id", nullable=False, index=True)

    kind: MediaKind = Field(...)
    filename: str = Field(max_length=240, nullable=False)
    # R2 object key. Sealed assets are encrypted client-side before
    # upload (B108 vaultCrypto); the row still has the key but the
    # body is unreadable without the vault passphrase.
    r2_object_key: str = Field(max_length=480, nullable=False, unique=True)
    mime_type: str = Field(max_length=120, nullable=False)
    size_bytes: int = Field(ge=0, nullable=False)
    width_px: Optional[int] = Field(default=None, ge=0)  # images only
    height_px: Optional[int] = Field(default=None, ge=0)  # images only
    duration_seconds: Optional[int] = Field(default=None, ge=0)  # audio/video only

    # The H07 alt-text + caption fields.
    alt_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    caption: Optional[str] = Field(default=None, sa_column=Column(Text))
    tags: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )

    # Sealed = encrypted client-side via B108 vaultCrypto. The
    # r2_object_key is still resolvable; the body is unreadable
    # without the vault passphrase.
    sealed: bool = Field(default=False, nullable=False)

    # EXIF policy. The Upload modal defaults this to STRIPPED for
    # images (H07 rule).
    exif_policy: Optional[ExifPolicy] = Field(default=None)
    exif_metadata: dict = Field(
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )

    # Cached link count (workings / voces / pilgrimage sites that
    # reference this asset). Recomputed on link / unlink. The
    # H07 Library card surfaces this as the "linked to N workings"
    # quiet stat.
    link_count: int = Field(default=0, nullable=False)


class MediaLink(IDMixin, TimestampMixin, table=True):
    """A polymorphic link from a non-media row to a media asset.

    ``ref_kind`` tells the route which table to look up (``entry``,
    ``voce``, ``pilgrimage_site``, ``publication``, etc.). We use a
    polymorphic table rather than per-target columns so adding a
    new linkable kind doesn't require a migration."""

    __tablename__ = "media_link"
    media_id: UUID = Field(foreign_key="media_asset.id", ondelete="CASCADE", nullable=False)
    ref_kind: str = Field(max_length=32, nullable=False)
    ref_id: UUID = Field(nullable=False)

    __table_args__ = (
        UniqueConstraint("media_id", "ref_kind", "ref_id", name="uq_media_link"),
        Index("ix_media_link_media", "media_id"),
        Index("ix_media_link_ref", "ref_kind", "ref_id"),
    )
```

**API:**

- `GET /api/v1/media?kind=&sealed=&limit=100&offset=0` → `list[MediaAssetCard]`. When `sealed=true` filter is set, returns ONLY the count (per the H07 Media Library "sealed = count-only" rule). When omitted, the response carries a separate `sealed_count` field.
- `GET /api/v1/media/{id}` → `MediaAssetRead`. For sealed assets the body URL still resolves but requires the vault passphrase to decrypt client-side; the response includes a `sealed: true` indicator.
- `PATCH /api/v1/media/{id}` → updates alt_text / caption / tags. The r2_object_key + size_bytes + mime_type are immutable.
- `DELETE /api/v1/media/{id}` → soft delete. The R2 object stays for 30 days (lifecycle policy reclaims it); the row's `deleted_at` is set. Restorable within 30 days.
- `POST /api/v1/media/{id}/links` body `{ ref_kind, ref_id }` → create a link, bump link_count.
- `DELETE /api/v1/media/{id}/links/{link_id}` → remove a link, decrement link_count.
- `GET /api/v1/media/sealed-count` → returns just the count of sealed assets in the caller's vault (the H07 Media Library sealed-card data source).

**Honesty rules:**

1. **Sealed assets are count-only in the list endpoint.** The default `/media` response carries `sealed_count` separately + a `MediaAssetCard[]` of UNSEALED assets only. Even with `include_sealed=true`, sealed cards omit `filename`, `caption`, `alt_text`, `exif_metadata`, `width_px`, `height_px`, `duration_seconds`, `tags` — only `{ id, kind, sealed: true, size_bytes }` is surfaced. The bytes are needed for storage-quota math; everything else is hidden.
2. **Link counts are exact, never inflated.** The cached `link_count` is recomputed deterministically from `media_link` rows; a test asserts no drift after add/remove/soft-delete-restore cycles.
3. **No play counts.** Audio assets do NOT get a play_count column. (H07 rule for Audio Library + the broader anti-gamification stance.)
4. **EXIF metadata storage is opt-in.** When `exif_policy=STRIPPED`, the `exif_metadata` JSONB is `{}`. When `RETAINED`, it carries the practitioner's choice of fields — never automatically populated. The upload pipeline strips by default; retain is the explicit opt-in.
5. **Link counts never reveal sealed-target counts.** When the linked `ref_kind` is a sealed entry, the `link_count` increments (we know there's a link), but the asset's read response doesn't enumerate sealed-target ids — only the count.

**Tests (≥ 30):** CRUD · sealed-list filter behaviour · sealed-count endpoint · link create + remove + count recomputation · no play_count column anywhere · EXIF metadata defaults `{}` · soft delete + 30-day window state · per-kind validation (image without size_bytes rejected · audio with duration_seconds, etc).

**DoD:**

- [ ] Models + migration 0053.
- [ ] Router registered.
- [ ] Sealed list honesty rule wired.
- [ ] No play_count column anywhere — CI asserts this.
- [ ] Tests green.

---

## B133 — R2 upload pipeline + presigned URLs + EXIF strip

**Files created:**

- `backend/theourgia/core/media/__init__.py`
- `backend/theourgia/core/media/r2_uploader.py` (presigned-URL issuer)
- `backend/theourgia/core/media/exif_stripper.py` (Pillow-based EXIF strip)
- `backend/theourgia/api/routers/v1/media_uploads.py`
- `backend/tests/test_media_uploads.py`
- `backend/tests/test_exif_stripper.py`

**Upload flow:**

The H07 Upload modal phases are: Pick → Configure → Upload.
The backend supports this via four endpoints + the upload itself
goes directly to R2 (presigned PUT).

1. `POST /api/v1/media/uploads/begin` body `{ kind, filename, size_bytes, mime_type, sealed, exif_policy?, location_precision? }` →
   Returns:
   - `upload_id` — short-lived (24h) handle.
   - `presigned_put_url` — R2 PUT URL the client uses.
   - `presigned_put_headers` — required headers (Content-Type, etc).
   - For sealed uploads: a `vault_salt_b64` so the client can derive the key (mirrors B108 vault crypto).
2. The client PUTs the bytes (sealed assets are encrypted client-side first).
3. `POST /api/v1/media/uploads/{upload_id}/complete` body `{ width_px?, height_px?, duration_seconds?, alt_text?, caption? }` →
   - Server verifies the R2 object exists + size matches.
   - For unsealed images with `exif_policy=stripped`, server fetches the object, runs Pillow's EXIF strip, re-uploads in place.
   - Creates the `media_asset` row.
   - Returns `MediaAssetRead`.
4. `DELETE /api/v1/media/uploads/{upload_id}` → cancels an in-flight upload; deletes the R2 object if it already exists.

**EXIF stripper:**

```python
def strip_exif(image_bytes: bytes, mime_type: str) -> bytes:
    """Remove EXIF metadata from JPEG/PNG/WebP image bytes.

    Pure: takes bytes in, returns bytes out. Uses Pillow's
    save-without-exif idiom. Other mime types pass through
    unchanged (we don't transcode)."""
```

The stripper handles JPEG (the dominant case), PNG (less common
EXIF use but supported), and WebP. HEIC/HEIF/TIFF pass through
unchanged with a server warning — the practitioner is told their
EXIF was NOT stripped, and the upload modal surfaces a `--warn`
note. Future batch ships a fuller stripper.

**Honesty rules:**

1. **EXIF strip default is ON for images** (matches the H07 Upload modal default). The `begin` endpoint sets `exif_policy=STRIPPED` when the caller omits the field for image uploads.
2. **The strip step is verified.** The `complete` endpoint hashes the original (pre-strip) + post-strip object sizes and records both; a test asserts the post-strip size differs (no-op strip on a no-EXIF image is allowed but tracked).
3. **Sealed uploads bypass the EXIF strip.** Encrypted bytes are unreadable to the server; stripping would corrupt them. The route raises an explicit 400 when `sealed=true` AND `exif_policy=stripped` are both set — the client must pre-strip BEFORE encrypting.
4. **Direct-to-R2 uploads minimise the server hop.** Bytes never traverse the FastAPI process for the upload itself (only the strip step, which is reverse-fetch from R2 → strip → re-PUT).
5. **Quota enforcement at begin time.** The `begin` endpoint checks the caller's `size_bytes + already-stored-bytes` against a per-vault quota (default 5 GB; configurable in user settings). Over-quota returns 413 (Payload Too Large) with a clear "raise your quota" message.

**Tests (≥ 28):** begin → complete handshake (mocked R2) · presigned-URL TTL · sealed + strip rejection · EXIF stripper round-trip on a real JPEG fixture · HEIC pass-through warning · quota enforcement · cancellation cleans up · `complete` rejects when R2 object missing.

**DoD:**

- [ ] Pipeline modules.
- [ ] Router registered.
- [ ] EXIF stripper tested against fixture files.
- [ ] Quota wired.
- [ ] Tests green.

---

## B134 — Pilgrimage sites + precision floor + re-quantize

**Files created:**

- `backend/theourgia/models/pilgrimage_sites.py`
- `backend/alembic/versions/0055_phase11_pilgrimage.py`
- `backend/theourgia/api/routers/v1/pilgrimage_sites.py`
- `backend/theourgia/core/pilgrimage/__init__.py`
- `backend/theourgia/core/pilgrimage/precision.py` (the floor enforcement — reused with B120 autotag)
- `backend/tests/test_pilgrimage_sites.py`

**Model:**

```python
class SiteKind(str, enum.Enum):
    SACRED = "sacred"
    ANCESTRAL = "ancestral"
    WORKING = "working"
    PILGRIMAGE = "pilgrimage"
    OTHER = "other"


class PrecisionLevel(str, enum.Enum):
    EXACT = "exact"
    KM_1 = "1km"
    KM_10 = "10km"
    COUNTRY = "country"
    UNMAPPED = "unmapped"


class PilgrimageSite(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "pilgrimage_site"
    owner_id: UUID = Field(foreign_key="user.id", nullable=False, index=True)

    kind: SiteKind = Field(...)
    name: str = Field(max_length=240, nullable=False)
    story: Optional[str] = Field(default=None, sa_column=Column(Text))

    # The lat/lng AS STORED. They're already quantized to the
    # row's precision — finer precision can never be recovered.
    location_lat: Optional[float] = Field(default=None)
    location_lng: Optional[float] = Field(default=None)
    # The stored precision IS the floor. Re-quantize can only lower.
    stored_precision: PrecisionLevel = Field(default=PrecisionLevel.HIDDEN)

    sealed: bool = Field(default=False, nullable=False)
    # The H07 Sacred Site surface's "Linked workings" rail.
    linked_working_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    # Linked media via the polymorphic media_link table from B132.
```

**Endpoints:**

- `GET /api/v1/pilgrimage-sites?kind=&sealed=&limit=100`
- `POST /api/v1/pilgrimage-sites` body `{ kind, name, location_lat?, location_lng?, location_precision, story?, sealed? }` →
  - Server applies the precision floor BEFORE persisting (the location stored is already quantized).
  - Returns `PilgrimageSiteRead`.
- `GET /api/v1/pilgrimage-sites/{id}`
- `PATCH /api/v1/pilgrimage-sites/{id}` — name / story / linked_working_ids editable. **Location + precision are NOT editable via PATCH** — only via `/requantize` (which can only LOWER precision).
- `DELETE /api/v1/pilgrimage-sites/{id}` → soft delete.
- `POST /api/v1/pilgrimage-sites/{id}/requantize` body `{ next_precision }` →
  - Rejects if `next_precision` is FINER than the current `stored_precision`.
  - Applies the new floor; the previous coordinates are DISCARDED (overwritten with the quantized values).
  - Returns `PilgrimageSiteRead`.
- `POST /api/v1/pilgrimage-sites/{id}/seal` → flips `sealed=true`. The lat/lng stays in the row but the read response only surfaces the `sealed: true` + `kind` flag (per the H07 sealed-cluster pattern). Unseal requires the vault passphrase (Mode B substrate from B108).
- `POST /api/v1/pilgrimage-sites/sealed-cluster` body `{ map_bounds }` →
  - Returns the count of sealed sites within bounds (NO ids, NO coordinates). The H07 Pilgrimage Map's count-only badge data source.

**Honesty rules:**

1. **Precision is a floor — never raise.** Re-quantize can lower precision (exact → 1km → 10km → country → unmapped) but never the reverse. Once the finer coordinates are discarded, they're gone. The `/requantize` endpoint rejects fining requests with 400.
2. **PATCH cannot change location or precision.** Only `/requantize` mutates these fields. The schema doesn't even declare them.
3. **Sealed sites are NEVER plotted.** The `/pilgrimage-sites` list response filters out sealed rows from the map data (the `sealed-cluster` endpoint is the only way to know they exist).
4. **The H07 `‡` Nominatim attribution applies to ALL responses that surface lat/lng.** The schema includes a `nominatim_acknowledgement` constant string the surface renders verbatim.
5. **Site colours come from `--map-{kind}` tokens.** The API returns the `kind` enum value; the frontend maps it to the token. (Backend doesn't ship colour strings.)
6. **Linked workings must be in the caller's vault.** Validation step on POST + PATCH — sealed entries CAN be linked from a pilgrimage site (they're the caller's own private references), but the linked-id must resolve to the caller's owner_id.

**Tests (≥ 30):** precision floor at write time (each level) · re-quantize lower-only (each invalid combination rejected) · stored coordinates match the floor exactly (drift assertion) · sealed sites absent from map list · sealed-cluster count endpoint · PATCH rejects location / precision · linked_working_ids ownership check.

**DoD:**

- [ ] Model + migration 0055.
- [ ] Router registered.
- [ ] Precision floor helper shared with B120 autotag.
- [ ] Tests green.

---

## B135 — iCal feed serializer

**Files created:**

- `backend/theourgia/models/ical_feed.py`
- `backend/alembic/versions/0056_phase11_ical_feed.py`
- `backend/theourgia/api/routers/v1/ical_feed.py`
- `backend/theourgia/core/calendar/ical_serializer.py` (RFC 5545 serializer)
- `backend/tests/test_ical_feed.py`

**Model:**

```python
class ICalFeed(IDMixin, TimestampMixin, table=True):
    __tablename__ = "ical_feed"
    owner_id: UUID = Field(foreign_key="user.id", nullable=False, unique=True, index=True)

    name: str = Field(default="My practice calendar", max_length=240)
    # The H07 iCal Feed surface's six toggles.
    include_resh: bool = Field(default=True, nullable=False)
    include_workings: bool = Field(default=True, nullable=False)
    include_pilgrimage_anniversaries: bool = Field(default=False, nullable=False)
    include_lunar_events: bool = Field(default=True, nullable=False)
    include_planetary_hours: bool = Field(default=False, nullable=False)
    include_custom: bool = Field(default=False, nullable=False)
    custom_cron: Optional[str] = Field(default=None, max_length=120)

    visibility: str = Field(default="private", max_length=16)  # "private" | "public"
    # The unique token in the feed URL. Rotating it via /regenerate
    # invalidates existing subscribers without taking the feed
    # offline.
    url_token: str = Field(max_length=64, nullable=False, unique=True)
    # The visibility "public" mode lets anyone with the URL subscribe;
    # "private" requires the auth cookie.
    last_regenerated_at: Optional[datetime] = Field(default=None)

    # The H07 surface's "Connected calendars" stat (clients
    # subscribed in the last 30 days). Recomputed from access logs
    # at read time.
    connected_count_30d: int = Field(default=0, nullable=False)
```

**Endpoints:**

- `GET /api/v1/ical-feed` → caller's settings (creates the row on first GET).
- `PATCH /api/v1/ical-feed` body `{ name?, include_*?, visibility? }` → update toggles. Visibility flip from public → private DOES invalidate the URL.
- `POST /api/v1/ical-feed/regenerate` → rotates `url_token`; the old URL stops working immediately.
- The feed itself: `GET /ical/v1/{token}.ics` (unversioned URL — calendar clients subscribe to a stable, RFC-5545-formatted endpoint).

**Serializer:**

The serializer walks each enabled include + emits one VEVENT per item:

- Liber Resh: VEVENTs for each enabled station within the next 6 weeks.
- Workings: VEVENTs for entries with `entry_type=working` AND `occurred_at` in the future (or the past 4 weeks for recent context).
- Pilgrimage anniversaries: VEVENTs on the yearly recurrence of `pilgrimage_site.created_at`.
- Lunar events: VEVENTs on full moons + new moons in the next 6 weeks (Phase 03 substrate).
- Planetary hours: VEVENTs per hour of each day if enabled (high-cardinality; off by default).
- Custom cron: if `custom_cron` is set, VEVENTs at those times.

**Honesty rules (CRITICAL):**

1. **Sealed entries are EXCLUDED ENTIRELY.** The serializer NEVER emits a VEVENT for an entry with `encryption_mode=SEALED`. Instead, for each calendar day that contains one or more sealed entries, a SINGLE VEVENT with summary "{N} sealed entries today" is emitted — count-only, no other detail. The H07 iCal Feed surface's notice copy is verbatim.
2. **Sealed pilgrimage sites are EXCLUDED from anniversaries entirely.** No count-only fallback for these — they're invisible.
3. **Private feeds require the cookie.** A request to `/ical/v1/{token}.ics` for a private feed without the caller's auth cookie returns 401. Public feeds skip this check.
4. **The feed URL is per-vault unguessable.** Tokens are 32-byte random URL-safe strings; regenerate rotates them. A test asserts the entropy and the rotation behaviour.
5. **iCal output is RFC 5545 compliant.** A test validates output against `icalendar` library's parse.

**Tests (≥ 22):** Settings CRUD · regenerate invalidates the old URL · feed serializer emits sealed-day "N sealed entries today" markers when sealed entries exist on a day · sealed pilgrimage anniversaries excluded entirely · private + no cookie = 401 · public = no auth · RFC 5545 validates · token entropy + uniqueness.

**DoD:**

- [ ] Model + migration 0056.
- [ ] Routers registered.
- [ ] Sealed-day collapse honesty rule wired.
- [ ] RFC 5545 validation passes.
- [ ] Tests green.

---

## B136 — Phase 11 close-out

**Files modified:**

- `CHANGELOG.md` — "Phase 11 Media + Pilgrimage backend COMPLETE".
- `FEATURES.md` — Phase 11 row to ✅.
- `README.md` — Phase 11 row state + next-up.
- `plan/11-media-library.md` — DoD checked.
- Memory: `project_phase_status.md`, `project_resume_state.md`,
  new `project_phase_11_close.md`.

**Run:**

- Full backend test suite — confirm all green, ~2150 tests.
- Full frontend test suite — confirm all green (Cluster C
  surfaces should now produce live payloads via the wired
  endpoints; admin tsc clean).
- Visual + a11y — confirm green.
- Push.

**DoD:**

- [ ] All gates green.
- [ ] Docs reflect Phase 11 complete.
- [ ] Memory reflects the close + the next queue.

---

## What's NOT in Phase 11 backend (this plan)

- Real OSM tile rendering (Pilgrimage Map ships with the SVG
  stand-in per H07 §S6.3).
- Server-side waveform peak extraction.
- Video transcoding.
- Network-shared media (federation).
- Retroactive EXIF stripping on existing rows.

These have clear homes in Phases 12-15 (Federation · Hardening)
and shouldn't be authored speculatively.

---

## Sequencing with the H07 Cluster C frontend (already shipped)

The 8 Cluster C surfaces already exist as presentational shells.
B132-B135 wires them through to live data:

| Surface | Wires to |
|---|---|
| Media Library (14) | B132 list + sealed-count |
| Media Detail (15) | B132 read + B133 EXIF metadata |
| Upload modal (16) | B133 begin → complete pipeline |
| Audio Library (17) | B132 list filtered to kind=AUDIO |
| Pilgrimage Map (18) | B134 list + sealed-cluster count |
| Sacred Site (19) | B134 read + `/requantize` + linked workings |
| Add Place (20) | B134 POST with precision floor enforced |
| iCal Feed (21) | B135 settings + the `.ics` endpoint |
