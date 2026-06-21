# Phase 04 — Batch 33: Scheduled / time-released publication

> Celery beat task promotes entries when `scheduled_publish_at` falls in the past. Admin endpoint shows the queue. Posthumous + curriculum-unlock variants pencil-out behind this substrate for Phase 15 (digital inheritance).

## Substrate

`backend/theourgia/core/tasks/scheduler.py`:
- `promote_scheduled_entries(session, *, now=None)` — async pure function that selects every entry with `scheduled_publish_at <= now` (and `deleted_at IS NULL` and `encryption_mode == none`), promotes to its target visibility, clears the schedule field, commits. Returns the count.
- `_target_visibility(entry)` — blog posts promote to `public`; other kinds preserve the user-chosen visibility (the schedule is just a "release at this moment" gate, orthogonal to visibility).
- `run_promote_scheduled_entries` — the Celery task wrapper. Async DB session bridged via `session_scope()`.

`backend/theourgia/core/tasks/app.py`:
- Beat-schedule entry added: `theourgia.scheduler.promote_scheduled_entries` at `crontab(minute="*")`. Every minute is fine — the SQL query is indexed (`ix_entry_scheduled_publish_at`) and the result set is small in steady state.

`backend/theourgia/core/tasks/__init__.py`:
- Side-effect import of `scheduler` so the task registers with the Celery app at worker startup.

## API

`backend/theourgia/api/routers/v1/schedule.py`:
- `GET /api/v1/schedule/upcoming` — entries with a future `scheduled_publish_at`, scoped to the caller's own entries.
- `DELETE /api/v1/schedule/{entry_id}` — cancel a scheduled release (sets `scheduled_publish_at = NULL` without changing visibility). 409 if not scheduled; 403 for non-owner.

## Tests

`backend/tests/test_scheduler.py` — 5 tests:
- Scheduler module imports without error (side-effect registration).
- Celery beat schedule includes the new entry.
- `_target_visibility` promotes blog posts to public.
- `_target_visibility` preserves other kinds' visibility.
- Schedule router registers both endpoints.

**Full backend suite: 1175 tests pass** (+5 new).

## How "missed releases" are handled

Per `plan/04-journaling.md` §14: "missed releases caught up on next run." The implementation is the simple SQL predicate — every entry with `scheduled_publish_at <= now()` is selected, regardless of how long ago the schedule was. If the worker is paused for 6 hours, the next tick promotes all backlogged entries. No retry logic needed; the query IS the catch-up mechanism.

## Deferred

- **Posthumous publication** — entries scheduled to release after a digital-inheritance trigger fires. The Entry model already carries `scheduled_publish_at`; the *trigger* (Phase 15) plus the operator-supplied attestation flow is its own substrate.
- **Curriculum unlocking** — content unlocks for subscribers on a specific date or after a grade is attained. Same substrate; needs the membership / attainment columns from Phase 14.
- **Per-vault scheduler queue UI** — the admin Scheduler surface (`/scheduler` in the design hand-off) is shipped at the surface level; its data wiring lands once the user-supplied schedule input flows through it. Designer-side .dc.html already exists.
- **In-band schedule conflicts** — if two entries share a schedule slot and only one queue tick can run them, there's no conflict (Celery handles ordering). If a user double-schedules the same entry, the latest write wins.

## Phase 04 DoD status after this batch

| Item | Status |
|---|---|
| All entry kinds round-trip through API and editor | 🟡 API ready; editor wire in Batch 35 |
| All custom blocks implemented and Storybooked | ⏳ Batch 35 |
| Templates | 🟡 Built-ins ✅; designer hand-off |
| Search | ✅ |
| Body sensation | ⏳ Batch 34 |
| Audio | ⏳ Batch 34 |
| Library catalog | ✅ |
| `/quote` autocite | 🟡 Data layer; UI in Batch 35 |
| Print export | ⏳ Batch 36 |
| Visibility downgrade flow | 🟡 Schema ready; UI hand-off |
| Encryption | 🟡 Column ready |
| Performance benchmark | 🟡 Indexes added |
| **Scheduled publication** | **✅ (this batch — Celery beat + cancel API)** |
