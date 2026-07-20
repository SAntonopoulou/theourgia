# Incident: celery never ran in production — 2026-07-20

Reported by daskalos-claude (note left at repo root, 2026-07-20 ~15:20
UTC): prod celery worker + beat in a restart loop, restart count
15,417. Investigation found the loop had run since the first deploy —
**celery had never executed a single task in production**.

## Impact

- **Zero backups had ever been taken.** The scheduled restic backups
  (daily + 6-hourly) were the only backup mechanism; no restic binary,
  no initialized repository, no snapshot existed. The operator's live
  vault had no recovery path.
- Scheduled entry publishing never promoted (no user-visible harm:
  zero overdue rows at fix time).
- Phase 05 reminders (recurring offerings, servitor feeding) never
  fired.
- Federation delivery drain never ran (moot — transport gated off).
- Separately: the frontend container healthcheck had failed for 10+
  days, and `webauthn_credential` had lost its RLS policy to a
  2026-07-05 out-of-band recovery drop.

## The defect chain (each masked the next)

1. **v1-021** — compose pointed celery at `theourgia.workers.app`, a
   module that never existed in repo history. Worker + beat crashed on
   import, forever. Also: worker lacked `-Q default,backups` (the
   backups queue would have starved), the restic binary was not in the
   image, and the RESTIC_/AWS_ credentials in prod `.env` were passed
   to no container.
2. **v1-021b** — beat crashed writing `celerybeat-schedule` into the
   read-only workdir as the non-root user; pinned `-s /tmp/...`.
3. **v1-022** — first real task runs crashed: the process-wide pooled
   engine binds to one event loop; celery's asyncio.run-per-task
   pattern crosses loops. New `task_session_scope` (loop-local NullPool
   engine); live regression test.
4. **v1-023** — `tasks/__init__` never imported `federation_delivery`
   or `phase05` (beat scheduled tasks no worker registered); BackupRun
   enum columns lacked `values_callable` (persisting the first-ever
   run row failed); snapshots never contained the database (PGDATA is
   a Docker volume outside every include path) — added the pg_dump
   pre-step + spool volume + postgresql-client-16 + ro deploy-dir
   mount.
5. **v1-024** — image uid 1000 vs host deploy-dir owner uid 1008:
   restic could not read the 600-mode `.env` files. Runtime uid is now
   a build arg (`THEOURGIA_UID`), set to the host owner in prod.
6. **v1-025** — frontend `/healthz` respond directive lost to the SPA
   catch-all in Caddy's directive ordering (404 → unhealthy for 10+
   days). Wrapped in a `handle` block.

## Resolution state (2026-07-20 ~15:45 UTC)

- Worker + beat healthy; all six beat entries registered and firing.
- **restic snapshot `1938425f` verified in R2**: deploy dir including
  `.env` + `pg_dump -Fc` of the database. BackupRun row persisted
  `success`. Dailies 03:15 UTC + 6-hourly incrementals now autonomous.
- Protective manual `pg_dump` taken BEFORE any change (prod host
  `/srv/theourgia/prod/backups-manual/` + operator's machine).
- webauthn RLS re-asserted by migration 0078 (verified live).
- Frontend healthy.

## Lessons (encoded as guards)

- "Configured" is not "running": the beat-schedule registration test
  now asserts every scheduled task resolves to a registered task, and
  the enum/loop regressions run against real Postgres.
- The monitoring stack shipped in v1-008 would have surfaced this in
  one glance (celery up, backup_runs_total flatlined at zero). Deploy
  it.
- A restore drill is still owed: restore `1938425f` to a scratch host
  and prove the dump loads (runbook: docs/admin/disaster-recovery.md).

## Follow-ups

- `THEOURGIA_INSTANCE_ID` not passed to the worker → snapshots tagged
  `theourgia.example.com` (cosmetic; fix with the next env-passthrough
  touch).
- Restore drill against the real R2 repo (plan/15 §4 requires it
  before v1.0 tag).
