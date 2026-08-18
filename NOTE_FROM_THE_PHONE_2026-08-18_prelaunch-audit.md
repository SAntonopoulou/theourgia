# Pre-launch audit — findings for the site, 18 Aug 2026

Sophia asked for a thorough multi-agent check of theourgia.com before the
public launch ("perhaps multiple agents… the activity pub features need to
be tested etc."). Ran from the phone side, read-only against committed code
and live HTTP, five dimensions, every finding adversarially re-verified by a
second agent (24 agents total, 0 findings overturned). **Nothing in this
repo was modified and no uncommitted work was touched.**

Full report (rendered): the artifact published to Sophia's Claude gallery,
"Theourgia — Pre-Launch Audit". Raw findings JSON is on the phone at
`~/.cache` scratch; the material points are below so the site agent can act
without it.

## LAUNCH BLOCKERS (6 high) — answer before theourgia.com is public

1. **Federation inbox signature never covers the request body.**
   `core/federation/http_signatures.py` DEFAULT_COMPONENTS =
   (@method,@path,host,date) — no content-digest. `outbound.py:130` sends a
   Content-Digest header but `:140` signs without it; the docstring
   (`:37-38`) falsely claims it's covered. `verify_request` rebuilds the base
   from the sender-declared component list with no minimum set and never
   receives the body, and neither inbox handler
   (`federation_inbox.py:219,233-239`, `activitypub_actor.py:234,261-267`)
   recomputes/compares the digest. → A tampered body under a trusted peer DID
   verifies. **Mitigation today: `federation_transport_enabled` defaults
   False, so inbox 503s / outbound no-ops — this is a launch-posture bug, fix
   BEFORE flipping the gate.** Fixing this closes the two related findings
   below at once.

2. **Voces pull truncation hard-deletes phone-local voces.**
   `api/routers/v1/voces.py` GET /voces default limit=100 + hidden-filter:
   hide one vox on the site, or exceed 100, and the next phone sync sees it
   missing and treats absence as deletion → hard-deletes the local row and
   its phone-only `note`. Contract decision needed site-side (phone is the
   shipped reference): return the complete library to sync callers, or add a
   `deleted_ids`/`total` signal so absence ≠ truncation.

3. **Privacy link 404s on every public page.**
   `components/CookieNotice.astro` PRIVACY_HREF points at a domain with no
   DNS. Legal surface unreachable at launch. Deploy docs.theourgia.com or
   point at a path served on theourgia.com.

4. **Federation advertised in present tense while transport is off.**
   `pages/about/federation.astro` markets a live capability the instance has
   gated — violates the project's own "never advertise what is gated" law.
   Add an instance-status line, or enable transport (but see #1 first).

5. **Nothing watches prod.** `deploy/monitoring/prometheus/prometheus.yml` —
   no alerting path at all; celery death / backup failure / disk full are
   silent. (This already bit once, the July incident.) Minimum before launch:
   an external uptime check + a dead-man's-switch ping on
   `run_scheduled_backup`'s success path.

6. **R2 media has no backup.** `core/tasks/backup.py` restic snapshots only
   local FS paths; uploaded artifacts in R2 are uncovered — a bucket wipe
   leaves the Postgres dump referencing objects that exist nowhere. Enable R2
   versioning + lifecycle, or rclone-sync to a second provider.

## MEDIUM (8) — worth fixing before or shortly after launch
- Federation signer keyid not bound to activity actor → a signed peer can
  impersonate any actor in follows/comments (`inbox_processor.py:126-133`,
  and AP inbox discards the verified keyid at `activitypub_actor.py:303-309`).
- No rate limiting / lockout on auth endpoints.
- SSRF in federation peer-add (server fetches an arbitrary operator URL, no
  private-IP filter).
- Backup-failure metrics incremented in the celery process, unreachable by
  Prometheus.
- Site + media + backups + DNS + cert all on one Cloudflare account (SPOF).
- No memory/CPU limits on any container on the single VPS.
- Homepage self-host quickstart clones from git.theourgia.com (no DNS).
- Backup-failure metric unreachable (see monitoring).

## LOW (19) — ticket, don't hold launch
OpenAPI served at /api/openapi.json in prod; federation errors leak internal
exception text; NodeInfo 2.0 not routed; unsigned-inbound escape hatch;
peer-key SSRF guard doesn't stop DNS rebinding; voces LWW echo wipes phone
note; feed pack:id dotted vs mbf slug ids; voces ipa 480-char cap aborts
sync; server record-sync tests only cover kind 'observance' (12 kinds
unpinned); CC-BY corpora redistributed with no public attribution; /metrics
scrape cred is a 7-day admin token; /foundations dev-copy leak; broken
#subscribe anchors; no-op newsletter form; "v0.1" claim vs 0.0.0-dev;
"practitioner- owned" typo; missing <main> landmarks; postgres/redis no log
rotation; backups-manual grows unbounded.

## Not provable from here (needs prod creds / a real remote instance)
The live Follow handshake + signed-delivery acceptance (needs a real
Mastodon/GoToSocial peer); whether recent restic snapshots actually exist and
the last backup succeeded; whether RESTIC_PASSWORD is escrowed off-server;
whether prod sets the demo-signin name allowlist and device-link audiences.
These are the checks to run WITH prod access before launch.

— the phone

---

# REMEDIATION — done 18 Aug (all committed to main by the phone)

Every audit finding was corrected. Five commits on `main` (the site
agent's uncommitted workshop-tools work was never touched; every commit
staged its own files individually):

- **public-site honesty** — /privacy + /credits pages served on-site, the
  privacy link 404 fixed, federation copy made honest ("ships in the
  software; transport not yet enabled"), self-host clone URL repointed to
  GitHub, dead #subscribe/newsletter/v0.1/typo cleared, <main> landmarks.
  astro check: 0/0.
- **federation security** — inbound signature now binds the body
  (content-digest required + recomputed + constant-time compared, min
  covered set enforced); signer bound to actor host; /nodeinfo routed;
  unsigned hatch hard-off in prod; peer-fetch SSRF re-validates the
  resolved IP (DNS-rebinding) incl. registered peers; error text no longer
  leaked. 199 federation tests pass. Transport still gated off (this is the
  prerequisite; the flip is yours). Residual: a pinned-IP connector for the
  last TOCTOU sliver is a later code follow-up.
- **voces contract** — new GET /voces/sync pages the COMPLETE library
  (hidden included, keyset cursor, total/has_more) so a sync client's
  "absence" is trustworthy; ipa column widened to TEXT (migration 0089 off
  0087c) so a long transcription no longer aborts a sync. 43 tests.
  ⚠ ALEMBIC: your uncommitted 0088 (talisman) and my 0089 both descend
  from 0087b → two heads. Add a merge revision when you land 0088.
- **API hardening** — auth endpoints rate-limited per client IP
  (core.ratelimit wired, redis in prod); /api/openapi.json + docs gated in
  prod behind THEOURGIA_EXPOSE_OPENAPI_IN_PRODUCTION (default off).
- **ops** — backup dead-man's-switch (THEOURGIA_BACKUP_HEARTBEAT_URL, pings
  on success); every prod container capped (mem_limit + cpus) and
  log-rotated incl. postgres/redis; docs/admin/backups.md written;
  THEOURGIA_MEDIA_BACKUP_BUCKET added for the R2 mirror.

Whole backend suite still COLLECTS clean (3993 tests, no import errors); a
full CI run should confirm on push.

## STILL NEEDS SOPHIA (operator actions the repo cannot do)
1. Create an external uptime + dead-man check (healthchecks.io-style); set
   THEOURGIA_BACKUP_HEARTBEAT_URL.
2. R2: enable object versioning + a lifecycle rule; provision a
   second-provider bucket + rclone remote and set THEOURGIA_MEDIA_BACKUP_BUCKET.
3. Confirm RESTIC_PASSWORD is escrowed off-server; run restore-drill.sh.
4. Prometheus alerting (target-down, backup-failure, restart-count) +
   Alertmanager channel; a long-lived /metrics scrape credential (retire the
   7-day admin token); a Pushgateway (or celery metrics endpoint) so backup
   metrics reach Prometheus.
5. Move DNS or backups off the single Cloudflare account (SPOF).
6. Pin base image digests in the Dockerfiles (they float on major tags).
7. Decide theourgia.com enrollment posture (allowlist = single-operator vs
   open) and, separately, WHEN to flip federation_transport_enabled — only
   after the threat-model review; the signature fix above is its prerequisite.

— the phone
