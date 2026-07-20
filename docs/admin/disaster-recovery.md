# Disaster recovery runbook

If the Theourgia instance is lost — disk failure, accidental delete, hostile action, data-corrupting bug — this document walks you through restoring service from backups.

**Estimated recovery time (target):** under one hour from "I have backups" to "the site is back up serving requests."

This document assumes you have:

- A backup repository configured (default: Cloudflare R2; see [setting up backups](./backups.md) — to be authored).
- The `RESTIC_PASSWORD` written down somewhere outside this machine. **Without it the backups cannot be decrypted.**
- The S3-compatible credentials (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) for the backup storage.
- A fresh host you can deploy onto (a new Hetzner VPS, a docker-capable laptop, anywhere).

If you do not have the `RESTIC_PASSWORD`, the backups are unrecoverable. Theourgia uses authenticated-encryption-at-source so that compromised storage credentials cannot decrypt backups; the symmetric trade-off is that a lost passphrase is also fatal. **Write the passphrase down on paper, store it in a safe place, share with a trusted person.**

## 0. Triage

Before restoring, confirm the scope of the loss:

- Is the database corrupted, or is the whole instance gone?
- Was the loss recent (last hour) or longer (last day)?
- Is there a partial state worth preserving (recent writes not yet backed up)?

Light corruption — a single bad migration, a misclick in a divination log — is often better fixed forward than rolled back. The full-DR path is for irrecoverable loss of the running instance.

## 1. Provision a fresh host

A small VPS works. Theourgia's compose stack runs comfortably on 4 vCPU / 8 GB RAM. See `Caddyfile.example` and `docker-compose.yml` for the reference deploy.

```bash
# On the new host
git clone https://github.com/SAntonopoulou/theourgia.git
cd theourgia
cp .env.example .env
# Edit .env with: SECRET_KEY, MASTER_ENCRYPTION_KEY, RESTIC_REPOSITORY,
# RESTIC_PASSWORD, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
```

The `SECRET_KEY` and `MASTER_ENCRYPTION_KEY` should be **the same values as the lost instance** — they are how server-side-at-rest encrypted content (Mode A) can be decrypted by the new install. If you lose them, only the bare schema can be restored; all encrypted content stays opaque.

Sealed (Mode B / zero-knowledge) content does not require these keys to restore — it travels as ciphertext and decrypts only in users' browsers with their passphrases. Restoring Mode B does require the users to still remember their passphrases.

## 2. Verify the repository

Before trusting that you can restore, prove that you can read.

```bash
# Inside the running backend container (after docker compose up)
docker compose exec backend python -m theourgia.scripts.backup check
# or directly:
docker compose exec backend restic check
```

A successful `check` confirms the repository is intact and your `RESTIC_PASSWORD` is correct.

## 3. List available snapshots

```bash
docker compose exec backend restic snapshots --json | jq '.[] | {id: .short_id, time, tags}'
```

Snapshots are sorted by time. Identify which one to restore — usually the most recent successful one, but for some corruption scenarios you'll want an older snapshot.

## 4. Stop services

```bash
docker compose down
```

(Or stop just the backend and celery if Postgres needs to stay up for an in-place restore — see "in-place vs full restore" below.)

## 5. Restore

**Full DR — fresh host, no existing data:**

```bash
docker compose up -d postgres
# Wait for Postgres to be ready (a few seconds)
docker compose exec backend python -m theourgia.scripts.restore --snapshot latest
# This restores the Postgres dump + media to their canonical paths,
# then runs `alembic upgrade head` to bring the schema current.
docker compose up -d
```

**In-place — recovering from a recent bad commit / corruption, Postgres still present:**

```bash
# Take a "just in case" snapshot of the broken state first
docker compose exec postgres pg_dumpall -U theourgia > /tmp/broken-state.sql

# Restore Postgres from snapshot to a temp location, then load it
docker compose exec backend restic restore <SNAPSHOT_ID> --target /tmp/restore
docker compose exec postgres psql -U theourgia -d theourgia -f /tmp/restore/postgres/dump.sql
```

## 6. Verify the restore

Smoke-check the restore before declaring done:

```bash
# Liveness + readiness
curl -fs http://localhost:8000/healthz
curl -fs http://localhost:8000/readyz

# Meta endpoint should report the right instance id
curl -fs http://localhost:8000/api/v1/meta | jq .

# Login + read your own latest entry (manual; via the UI or API)
```

If the site is reachable, the instance metadata looks right, and you can read at least one entry you remember writing, the restore succeeded.

## 7. Recreate federation identity (only if you've lost the federation keys)

If the federation keypair (`/var/lib/theourgia/federation.key` and `.pub`) is gone:

- Other Theourgia instances will not recognize signatures from this rebuilt instance until you re-establish identity.
- The new instance generates a fresh keypair on first start (per `core/federation/keys.py`).
- You will need to notify peer instances and re-issue any capability tokens.
- ActivityPub followers may need to re-follow.

This is unavoidable — federated cryptographic identity intentionally cannot be reissued without per-peer trust re-establishment.

## 8. Rotating vault data keys (Mode A)

Real rotation tooling ships as of v1-027 (Phase 15 B5) — the earlier "no tooling exists" caveat no longer applies to vault data keys.

**The key hierarchy, briefly:** `MASTER_ENCRYPTION_KEY` (env) wraps per-vault data keys (DEKs) stored in the `vault_key` table. Every Mode A envelope embeds the ID of the DEK that encrypted it, and retired DEKs are **never deleted**, so old content stays readable throughout and after a rotation.

**How to rotate:**

1. In the UI: Settings → Keys (`/settings/keys`) → Begin rotation. Or via the API (authenticated, `key.rotate` scope):

```bash
curl -fs -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/keys/rotate
```

2. The new DEK becomes active immediately — new writes use it from that moment. A background Celery task then re-encrypts existing Mode A content from the retired key(s) to the new one, in committed batches.

3. Watch progress and history:

```bash
curl -fs -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/keys/rotation-status
curl -fs -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/keys/history
```

**Guarantees and failure behavior:**

- A blob is only ever replaced in the same database transaction that writes its re-encrypted form. A crash mid-sweep leaves every blob decryptable under either the old or the new key — there is no lossy intermediate state.
- A master key that cannot unwrap the current DEK fails the rotation **before anything changes**, marks it `failed`, and records an audit event (`kind=security`, `key.rotation.failed`).
- The sweep is resumable and convergent: it migrates envelopes under **any** retired key, so an interrupted sweep is finished by re-dispatching `theourgia.core.tasks.key_rotation.run_key_rotation_sweep` with the rotation ID — or simply by the next rotation's sweep.
- Start, finish, and failure are all audited (`key.rotation.started` / `.finished` / `.failed`).
- Only one rotation per vault runs at a time (the API returns 409 while one is pending/running).

**What this does NOT do:**

- It does not rotate `MASTER_ENCRYPTION_KEY` itself. Re-wrapping the stored DEKs under a new master key remains a manual maintenance-window procedure — see the [breach notification runbook](./breach-notification-runbook.md) §6. After a master-key event, also rotate each vault's data key through this tooling to retire possibly-exposed DEKs.
- It never touches Mode B (sealed) content — the server does not hold those keys.

## 9. Post-incident

After restore:

- File a post-mortem (even informally) noting what was lost, what was restored, and how long it took.
- If the cause was anything other than hardware failure, decide whether anything in the code or process needs to change.
- Verify the next scheduled backup succeeds.

## Tabletop drill cadence

This runbook is exercised, not just written. The Phase 15 hardening pass includes a tabletop drill: provision a fresh host, restore from current backups, confirm the restored instance is functional. Drill failures are bugs.

Recommended cadence post-1.0:

- **Quarterly:** end-to-end restore drill against a clean VPS.
- **Annually:** include the drill in the project's annual security audit.

## Common failure modes

| Symptom | Cause | Action |
|---|---|---|
| `restic check` reports errors | Repository corruption or partial upload | `restic rebuild-index` then retry; if it persists, restore from the prior snapshot |
| `RESTIC_PASSWORD` rejected | Wrong passphrase | Double-check; if truly lost, repository is unrecoverable |
| Postgres restore fails on schema mismatch | Newer code, older snapshot | Restore the dump, then run `alembic upgrade head` |
| Key rotation stuck in `running` | Celery worker died mid-sweep | Re-dispatch `run_key_rotation_sweep` with the rotation ID (see §8); no data was lost — old envelopes remain decryptable |
| Sealed content unreadable after restore | User passphrases not entered | Ask user to log in and enter their sealed-content passphrase; nothing for the operator to do |
| Federation peers won't accept signatures | Lost federation keypair | See §7 above |

## Escalation

If you've followed this runbook and the restore isn't working:

1. File an issue with `disaster-recovery` label on the GitHub repository.
2. Include the output of `restic check`, `restic snapshots --json | head`, the .env values you have (with secrets redacted), and the steps you've already tried.
3. Tag `@SAntonopoulou` in the issue.
4. Do not destroy the broken-state snapshot you took in §5 — it may contain forensic information.
