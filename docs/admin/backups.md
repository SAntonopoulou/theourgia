# Backups — what is covered, what is not, and how to know it ran

The pre-launch audit found two gaps in the backup story: user-uploaded
media in object storage had **no copy at all**, and **nothing watched**
whether backups were still running. This documents the whole picture and
the actions that close both.

## What the scheduled backup covers

`run_scheduled_backup` (celery beat) does two things each run:

1. **`pg_dump` the database** into the backup spool, then hand the spool
   plus the deploy-dir include paths to **restic**. The Postgres dump is
   the database's backup — `PGDATA` itself is never file-copied.
2. Applies the retention policy (`DEFAULT_POLICY`) and, on success, pings
   the dead-man's-switch (below). Retention is **tight by design**: 2 most
   recent + 2 daily + 2 weekly (no hourly/monthly/yearly) — at most ~6
   snapshots, reaching back ~2 weeks. There is one backup a day (no sub-daily
   run), since the policy keeps no sub-daily snapshots. Raise the values in
   `core/backups/policy.py` for deeper history.

Restic snapshots **local filesystem paths only** (`THEOURGIA_BACKUP_INCLUDE_PATHS`,
default `/srv/theourgia/prod` — `.env`, compose, manual dumps, the pg
dump).

## What it does NOT cover — user-uploaded media in object storage

Uploaded artifacts live in **object storage (Cloudflare R2)**, not on the
local filesystem. Historically **restic never saw them** — a perfectly
restorable Postgres dump would reference media objects backed up nowhere.

**This is now closed by default.** Each *daily* scheduled backup folds the
object store into the restic spool (`_sync_media_into_spool` in
`tasks/backup.py`) before the snapshot, so media rides the **same** encrypted,
versioned, restore-drill-proven repository as the database dump — one recovery
path, one escrowed password. It needs only the `storage-s3` extra in the
backend image (present) and the `THEOURGIA_STORAGE_S3_*` credentials (set in
production). Copy-only: a delete in the live bucket never removes the
backed-up copy.

Two optional layers harden it further:

- **Belt (in the console, one-time):** enable **R2 object versioning** and a
  lifecycle rule on the media bucket, so an accidental delete or overwrite is
  recoverable from the provider itself even between backups.
- **Braces (a different provider):** `THEOURGIA_MEDIA_BACKUP_BUCKET` is
  reserved for a SECOND copy on a *different* provider, defending against loss
  of the whole storage account (see `cloudflare-spof.md`). Not wired — the
  same-account restic fold already gives media a restorable copy; add this
  only if that is judged insufficient.

## Knowing it ran — the dead-man's-switch

A backup that silently stops is invisible until the day you need it (this
happened once, in July). So a **successful** backup pings
`THEOURGIA_BACKUP_HEARTBEAT_URL`. Point it at an external check
(healthchecks.io or similar) configured to expect a ping within the backup
window:

- backup succeeds → ping arrives → check stays green;
- backup **fails**, the worker dies, or the host goes down → **no ping** →
  the external service **alerts you**.

The ping fires only on success and is best-effort (a dead check endpoint
never fails an otherwise-good backup). Unset = no ping (nothing external
assumed).

## Operator checklist before launch

- [x] Dead-man's-switch: the **Sentry cron monitor** `theourgia-scheduled-backup`
      checks in on each daily backup and alerts if one is missed (done 18 Aug;
      replaces the healthchecks.io heartbeat, which stays as an optional extra
      via `THEOURGIA_BACKUP_HEARTBEAT_URL`).
- [x] Media rides the restic backup (daily fold — no action needed).
- [ ] (optional) Enable R2 versioning + a lifecycle rule on the media bucket.
- [ ] (optional) Provision a second-provider bucket for an off-account media
      mirror only if the same-account restic copy is judged insufficient.
- [x] `RESTIC_REPOSITORY` / `RESTIC_PASSWORD` set and the `RESTIC_PASSWORD`
      **escrowed off-server** (done 18 Aug — `SECRETS.local.md` + KeePassX).
- [ ] Run `scripts/restore-drill.sh` against a scratch target and confirm a
      restore actually reconstitutes the database.
