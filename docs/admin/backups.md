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
   the dead-man's-switch (below).

Restic snapshots **local filesystem paths only** (`THEOURGIA_BACKUP_INCLUDE_PATHS`,
default `/srv/theourgia/prod` — `.env`, compose, manual dumps, the pg
dump).

## What it does NOT cover — user-uploaded media in object storage

Uploaded artifacts live in **object storage (Cloudflare R2)**, not on the
local filesystem, so **restic never sees them**. A perfectly restorable
Postgres dump would then reference media objects that exist nowhere. Close
this gap in two layers:

- **Belt (in the console, one-time):** enable **R2 object versioning** and
  a lifecycle rule on the media bucket, so an accidental delete or
  overwrite is recoverable from the provider itself.
- **Braces (a second destination):** set `THEOURGIA_MEDIA_BACKUP_BUCKET`
  to an `rclone` remote (e.g. a bucket on a *different* provider) and wire
  an `rclone sync` of the media bucket into the backup schedule. The
  config field is present; the rclone remote + credential is an operator
  action (a leaked storage key or account lockout is exactly the case a
  *second provider* defends against — see the Cloudflare single-point note
  in the audit).

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

- [ ] Set `THEOURGIA_BACKUP_HEARTBEAT_URL` and create the external check.
- [ ] Enable R2 versioning + a lifecycle rule on the media bucket.
- [ ] Provision a second-provider bucket, set `THEOURGIA_MEDIA_BACKUP_BUCKET`
      and the rclone remote, and confirm one sync runs.
- [ ] Confirm `RESTIC_REPOSITORY` / `RESTIC_PASSWORD` are set and the
      `RESTIC_PASSWORD` is **escrowed off-server** (a repo you cannot
      decrypt is not a backup — see `disaster-recovery.md`).
- [ ] Run `scripts/restore-drill.sh` against a scratch target and confirm a
      restore actually reconstitutes the database.
