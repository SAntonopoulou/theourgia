# Phase 04 — Batch 34: Body sensation + audio (substrate only)

> Data layer for the body sensation diagram + audio attachments. The UI halves — SVG silhouettes (designer art) and the MediaRecorder waveform UI (designer .dc.html) — are queued in `designer_handoff_02.handoff §6 + §7`. This batch ships the schema so the data is in place when the designs land.

## Why ship substrate now

Both shapes are **design-independent**:
- `BodySnapshot.markers_json` stores marker coordinates in normalised `(0..1, 0..1)` silhouette space + sensation type + intensity + colour + per-marker note. Swapping in different silhouette art later doesn't invalidate existing snapshots — the coords are abstract.
- `AudioAttachment` stores a duration / mime / optional transcript / optional waveform thumbnail URL. Doesn't depend on the recording UI choice or the transcription engine choice.

## Substrate

`backend/theourgia/models/body.py`:
- `BodySnapshot` model — `markers_json` (JSON-as-text), `notes`, `body_morphology` (silhouette-set key), `label`, soft-delete, owner FK.

`backend/theourgia/models/audio.py`:
- `AudioAttachment` model — composes with the existing `Upload` substrate via `upload_id` FK. Carries `duration_seconds`, `mime_type`, optional `transcript` + `transcript_engine` for provenance, optional `waveform_thumbnail_url`, optional `entry_id` (NULL while drafting before attachment), `label`.

## Migration

`backend/alembic/versions/0021_body_audio.py`:
- `body_snapshot` table.
- `audio_attachment` table.
- Real FK on `entry.body_snapshot_id` (the column was added unconstrained in 0017 because the body_snapshot table didn't exist yet).

## Tests

`backend/tests/test_body_audio_substrate.py` — 8 tests:
- BodySnapshot constructs empty + with marker set.
- Default `body_morphology = "default"`; plugin morphology accepted.
- AudioAttachment minimal + full metadata round-trip.
- `entry_id` nullable (draft recordings before attachment).
- Marker JSON shape (silhouette/x/y/sensation/intensity/color/note).

**Full backend suite: 1183 tests pass** (+8 new).

## What the designer handoff WILL change

When the designer's silhouettes + audio-recording-UI .dc.html files ship:
- A frontend `<BodyDiagram>` primitive renders the SVG + maps clicks back to `(silhouette, x, y)` coords matching the schema.
- A frontend `<AudioRecorder>` primitive uses MediaRecorder + uploads to the Upload substrate + writes the `AudioAttachment` row.
- Neither changes the schema; the data this batch persists is exactly what the designed UI will read.

## Deferred (separate batches)

- The two API routers (`/api/v1/body-snapshots`, `/api/v1/audio-attachments`) — trivial CRUD wrappers; land when the frontend renderers are ready.
- S3 / object-store backend wiring for audio blobs — composes with the existing `Upload` substrate; operator-config-driven.
- Whisper / wav2vec transcription pipeline — the `transcript_engine` field is ready; the Celery task lands when the operator picks the engine.

## Phase 04 DoD status after this batch

| Item | Status |
|---|---|
| All entry kinds round-trip through API + editor | 🟡 API ✅; editor in Batch 35 |
| All custom blocks Storybooked | ⏳ Batch 35 |
| Templates | 🟡 Built-ins ✅; UI hand-off |
| Search | ✅ |
| **Body sensation diagram** | **🟡 Data layer ✅; UI hand-off** |
| **Audio: record, play, store, transcribe** | **🟡 Data layer ✅; UI hand-off** |
| Library catalog | ✅ |
| /quote autocite | 🟡 Data ✅; UI in Batch 35 |
| Print export | ⏳ Batch 36 (deferred — PDF library choice coupled to print stylesheet design) |
| Visibility downgrade flow | 🟡 Schema ✅; UI hand-off |
| Encryption | 🟡 Column ✅ |
| Scheduled publication | ✅ |
