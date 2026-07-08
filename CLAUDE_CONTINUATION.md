# Theourgia — Claude Code continuation kit

**Read this file first on every new session.** It tells you exactly
where prod is, what's shipped, what's next, and every gotcha we've
paid for.

Last updated: **2026-07-08** (session close after b108-2gt → b108-2gz).

---

## State of the world (commit `9b6d4d0`)

### Production

- **🟢 LIVE at https://theourgia.com** (deployed 2026-06-28; re-deployed
  seven times during 2026-07-08 session).
- 8 prod containers under compose project `theourgia-prod`, isolated
  from the `theourgia` dev stack.
- Sophia's vault is the only account (single-operator gate — see
  b108-2gs). Random signups return 403 with a self-host link.
- Sign in at <https://theourgia.com/app/signin> as `Soror Ευ. Α.`.

### Test counts (post b108-2gz)

| Suite | Passing | Notes |
|---|---|---|
| backend | **2696** | alembic head **0071** |
| shared (vitest) | **2944** | admin tsc clean, shared tsc clean |
| admin (route-mount) | **32** | |
| agent-daemon | 198 | alembic head 0002 |
| registry | 34 | alembic head 0001 |

### The 2026-07-08 session (SEVEN batches)

| Batch | What shipped | FEATURES.md flip |
|---|---|---|
| **b108-2gt** | Admin auth lockdown — 51 v1 routers migrated from `OptionalCookieUser` → `CurrentUser`; every POST/PATCH/DELETE + owned GET now 401s without a cookie; SPA `RequireSession` guard on every admin route; landing IA gains "This vault · Soror Ευ. Α." strip above the hero, "Begin the work" → "Start your own instance →" (routes to `/self-host`). +58 auth tests. | §Security |
| **b108-2gu** | Editor: `correspondence` · `calendarStamp` · `voxMagicae` · `voiceRecording` blocks + slash commands `/geomancy` `/runes` `/voce` `/correspondence` `/calendar` `/voice`. DivinationKind widens to `tarot \| iching \| geomancy \| runes`. +8 tests. | §2 `[~]` → `[x]` |
| **b108-2gv** | Publications: in-browser PDF viewer + EPUB reader (pdf.js + epub.js **lazy-loaded** inside ReaderSurface — do NOT re-export from Reader/index.ts, jsdom explodes). `publication.content_format` = html/pdf/epub + `file_url` + `file_size_bytes`. Alembic 0068. Gated behind paywall same as body. +2 tests. | §12 `[ ]` → `[x]` |
| **b108-2gw** | Comments with moderation. `comment` table (pending/approved/rejected/spam) · honeypot `website_ref` field on the form (any non-empty → SPAM) · per-target `comments_enabled` opt-in on Publication + Entry · CommentsSurface + ModerationQueueSurface primitives · admin `/comments-moderation` route · alembic 0069. **Migration lesson: use raw SQL `DO $$ IF NOT EXISTS ...` + `postgresql.ENUM(create_type=False)` on column defs — `sa.Enum(create_type=False)` DOES NOT prevent op.create_table from re-emitting CREATE TYPE.** +9 backend + 5 frontend tests. | §2 + §12 `[ ]` → `[x]` |
| **b108-2gx** | Pilgrimage routes backend. `pilgrimage_route` + `pilgrimage_route_stop` (with UNIQUE(route_id, order_index)); 9 endpoints (CRUD + add/patch/delete stop + reorder). Site references are ownership-checked before adding to a route. Alembic 0070. +7 tests. **Frontend polyline + admin editor STILL QUEUED.** | §13 `[ ]` → `[~]` |
| **b108-2gy** | Recipe builder backend. `recipe` table (kind enum: incense/oil/wash/philtre/other · ingredients + steps + correspondences JSONB · library_source_ids + entity_ids arrays). Full CRUD. Alembic 0071. +8 tests. **Frontend form + list surface STILL QUEUED.** | §10 `[ ]` → `[~]` |
| **b108-2gz** | Multi-language IME primitives. `LanguagePalette` (three script tabs: polytonic Greek breathings + accents + iota subscript · Hebrew letters + sofit + niqud + cantillation · IAST Sanskrit + devanagari reference row). `transliterateIast` (romanization → Unicode IAST: `.rgveda` → ṛgveda · `Kri.s.na` → Kriṣṇa · `Raama` → Rāma · `OM` → oṁ · convention: dot BEFORE the letter for retroflex; `s'` for śa; longest-match first). +7 tests. | §2 + §7 `[ ]` → `[x]` |

### Federation status

- **`THEOURGIA_FEDERATION_TRANSPORT_ENABLED=1`** was flipped in prod
  `.env` at Sophia's request (2026-07-08).
- Backend + celery + celery-beat restarted to pick it up.
- **Webfinger still returns 404** because ActivityPub is a per-vault
  opt-in and Sophia has NOT yet enabled it at `/app/settings/activitypub`.
  This is on Sophia — mention it if she asks why federation isn't live.
- Once she toggles ActivityPub for her vault:
  `acct:<vault-slug>@theourgia.com` resolves via
  `.well-known/webfinger` → `/users/<slug>` actor JSON-LD.

---

## What's next — the remaining Tier plan

The user's directive from 2026-07-08: **"we can do tier 3 do not put
them off we will do them last. Finish the other stuff eventually all
of this needs to get done."** Every item MUST ship.

### Tier 1 (high leverage, ship next)

- **#7 Family tree visualization** (FEATURES §3) — SVG viz over the
  existing entity alias-graph. Ancestors are entities with kind =
  `beloved_dead` + parent/child aliases. NOT a genealogy service
  integration (privacy).
- **#8 Watermark purchase downloads** (FEATURES §12) — hook into the
  existing download token pipeline; when `publication.watermark_enabled`
  is true, overlay buyer email on the PDF at download time (pdf-lib or
  reportlab). Small backend job.
- **#9 Custom deck + spread designer** (FEATURES §4) — backend can
  already store custom decks + spreads. Frontend surfaces are large:
  deck creator (drag-and-drop card art + meanings) + spread designer
  (drag positions on canvas). Two batches probably.
- **Frontend follow-ups** for #4 pilgrimage routes + #5 recipes —
  backend shipped, need admin list + form + the pilgrimage map
  polyline overlay.

### Tier 2 (needs standalone session or external dep)

- **#10 Whisper transcription** — needs `whisper.cpp` on prod host +
  upload pipeline route + opt-in per-vault. Local + self-hosted
  (matches Sophia's "no paid services" preference).
- **#11 Digital inheritance / memorial mode** — check-in mechanic +
  designated executor key-share + posthumous publication + memorial
  read-only mode after trigger. Multiple new tables + flows.
- **#12 Web-based first-run wizard** — replace CLI + `.env` with a
  signed-out setup surface (magical name · tradition · location ·
  calendars · encryption · 2FA · library import).
- **#13 Reference plugins (7)** — Norse runes extended, Egyptian
  decans, 777 correspondences importer, Day One journal importer,
  Obsidian markdown exporter, Matrix notification channel, tea-leaf
  reading log. Small self-contained plugins each.
- **#14 Content bundles (7)** — pantheons · tradition · initiation
  curriculum · reading curriculum · rituals · pathworkings · sigil
  library. Authored against MBF format (§11).
- **#15 Post-ritual collective log + egregore via group ritual** —
  needs Phase 12 federation transport tested with a second instance
  first (see Tier 3 #16).

### Tier 3 (last, per Sophia — must still ship)

- **#16 Cross-instance federation test** — spin up a second Theourgia
  instance + interop test against Mastodon/Pleroma/GoToSocial/Akkoma/
  Friendica. Also unlocks §14 custom AP extensions
  (`theourgia:Ritual`, `theourgia:Divination`, `theourgia:Sigil`).
- **#17 Video integration + captions** — YouTube privacy-enhanced
  embeds + optional Cloudflare Stream/Mux + per-video captions/
  subtitles + chapter markers.
- **#18 Newsletter delivery plugin slots** — Postmark, SES, Resend,
  Mailgun as delivery plugins on top of existing SMTP.
- **#19 Print-quality book typography** — crop marks, bleed, embedded
  fonts, drop caps, true small caps, ligatures, oldstyle figures,
  footnote management, auto-index, auto-glossary, auto-TOC. Lulu +
  BookBaby specs.
- **#20 Cross-magician aggregate analytics (DP)** — opt-in
  network-scoped anonymized aggregates with differential-privacy
  noise + minimum cohort size + audit log. FEATURES §9 explicitly
  deferred to Phase 12+ during the b108 sprint.
- **#21 Helm chart + Traefik alternative** — K8s Helm chart + Traefik
  reverse-proxy option (only Caddy today).
- **#22 FEATURES.md checkbox audit** — flip `[ ]` → `[x]` for every
  Phase 03–15 feature that actually shipped. Do LAST so the finished
  catalogue tells the truth.

### Task IDs

TaskCreate IDs 243–264 map to items #1–#22. Check `TaskList` on
resume — items 243, 244, 245 done; 246, 247 marked done but with
frontend follow-ups queued; 248 (IME) done; 249–264 still pending.

---

## Migration gotchas (paid tuition, do not repeat)

- **`sa.Enum(create_type=False)` does NOT prevent CREATE TYPE inside
  `op.create_table`.** It only affects `Enum.create()` semantics. The
  op.create_table pathway still re-emits CREATE TYPE. Fix:
  1. Create the enum with `op.execute("DO $$ BEGIN IF NOT EXISTS
     (SELECT 1 FROM pg_type WHERE typname = '...') THEN CREATE TYPE
     ... AS ENUM (...); END IF; END $$;")`
  2. Reference from the column with `postgresql.ENUM(*values,
     name="...", create_type=False)`.
  See `0069_comments.py` + `0071_recipe.py` for the correct pattern.
- **Adding an enum column via `op.add_column` is safer** — SQLAlchemy
  doesn't re-emit CREATE TYPE there. `0068_publication_content_format.py`
  uses `sa.Enum(...)` directly and it Just Works.
- **Migration failures leave partial state.** If a migration fails
  after CREATE TYPE but before create_table, the enum type persists
  even though alembic didn't advance. Recovery: SSH in, `docker exec
  ... psql -c 'DROP TYPE IF EXISTS ... CASCADE;'`, then re-deploy.

## Auth gotchas (b108-2gt sweep)

- **Every new v1 write endpoint MUST use `CurrentUser`** — the b108-2gt
  sweep migrated all 51 existing routers. `OptionalCookieUser` is now
  reserved for exactly three known exceptions:
  - `checkout.create_checkout` (anonymous buyer)
  - `ical_feed.serve_feed` (token-authed feed)
  - `identities.get_identity` when `public_face_enabled=true`
- Public reader / subscribe / webhooks / webfinger / AP inbox use
  their own auth mechanisms — leave them alone.
- New router tests must include an `assert 'get_current_user' in
  names` check for every non-public route (see
  `test_pilgrimage_routes.py::test_every_route_requires_auth`).

## SPA session gate

- Every admin route is wrapped by `RequireSession` in `App.tsx`. If
  you add a route that should be signed-out-accessible (like `/signin`),
  add a matching early-return in `ShellRoutes`.
- The route guard uses `useAuth().status` — status starts as
  `"checking"` and returns a SurfaceSkeleton, then flips to
  `"authenticated"` or `"unauthenticated"`. Unauthenticated navigates
  to `/signin` with `state={ from }` so we can bounce back after sign-in.

## Frontend module gotchas

- **Never re-export heavy client-only libraries from a barrel that's
  in the shared package's root export.** pdf.js + epub.js are lazy
  loaded inside `ReaderSurface.tsx` via `React.lazy` and NOT
  re-exported from `Reader/index.ts`. If you re-export them,
  RouteMountSmoke.test.tsx explodes with `DOMMatrix is not defined`.
- **Vite `?url` import type** — `frontend/shared/src/vite-env.d.ts`
  declares `declare module "*?url" { const src: string; export
  default src; }`. This lets shared tsc pass without `vite/client`
  types in every downstream tsconfig.

---

## Infrastructure cheat-sheet

### Servers + SSH

- **Prod host:** `theourgia@178.105.106.225`
- **SSH key:** `~/.ssh/agent-house-access-theourgia`
- **Prod deploy root:** `/srv/theourgia/prod`
- **Env file:** `/srv/theourgia/prod/.env` (contains
  `THEOURGIA_FEDERATION_TRANSPORT_ENABLED=1`,
  `THEOURGIA_ALLOWED_MAGICKAL_NAMES=soror-eu-a`, R2 credentials,
  Restic password, etc.)

### Restic backup password

- Saved to `/home/sophia/theourgia-restic-password.txt` (chmod 600
  on the laptop).
- **Password:** `wj2Z01AJqy81DtWAvYHGxe2V6GgjneXVPfJUoBr7KL80E9Ma`
- Encrypts backups in the `theourgia-backups` R2 bucket. Lose it and
  no backup is recoverable.

### R2 buckets

- `theourgia-media` — publication files, uploads
- `theourgia-backups` — restic snapshots
- `theourgia-plugins` — registry-hosted plugins

### Deploy commands

```bash
# Full deploy (pulls, builds, migrates, restarts)
ssh -i ~/.ssh/agent-house-access-theourgia theourgia@178.105.106.225 \
  "cd /srv/theourgia/prod && bash scripts/deploy-prod.sh"

# Skip the migrate step (when the batch is frontend-only)
ssh -i ~/.ssh/agent-house-access-theourgia theourgia@178.105.106.225 \
  "cd /srv/theourgia/prod && bash scripts/deploy-prod.sh --skip-migrate"

# Check alembic head
ssh -i ~/.ssh/agent-house-access-theourgia theourgia@178.105.106.225 \
  "docker exec theourgia-prod-postgres-1 psql -U theourgia -d theourgia \
    -c 'SELECT version_num FROM alembic_version;'"

# Backend logs
ssh -i ~/.ssh/agent-house-access-theourgia theourgia@178.105.106.225 \
  "cd /srv/theourgia/prod && \
    docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    logs backend --tail=50"

# Recover from a broken enum from a partial migration
ssh -i ~/.ssh/agent-house-access-theourgia theourgia@178.105.106.225 \
  "docker exec theourgia-prod-postgres-1 psql -U theourgia -d theourgia \
    -c 'DROP TYPE IF EXISTS <name> CASCADE;'"
```

### Verify a deploy landed

```bash
# From this laptop:
curl -sS https://theourgia.com/api/v1/entries -w "\nstatus=%{http_code}\n"
# Should return 401 without a cookie (auth lockdown live).

curl -sS https://theourgia.com/api/v1/blog/feed.rss -w "\nstatus=%{http_code}\n" | head -3
# Should return 200 (public reader still open).
```

---

## Standing conventions (unchanged)

- **Match the design exactly** — every value, every SVG element,
  every transition, every editorial copy verbatim from the `.dc.html`.
- **Total frontend rewrite** — every frontend file rewrites against
  the design system; no shortcuts.
- **Style Guide voice overrides mockup jargon** — expand "a11y" /
  "i18n" / "RTL" to plain language in user-facing labels.
- **README updates ride EVERY commit/push** — every batch bumps the
  "Latest commit" row + test counts + alembic head. Don't skip.
- **No emojis in commits or code** unless Sophia asks.
- **GitHub identity is SAntonopoulou** — pre-push hook enforces the
  allowlist.
- **Co-author trailer on every commit:**
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- **Honesty by construction** — surface what filtered, what was
  refused, what was halted.
- **Single-operator vault** — `THEOURGIA_ALLOWED_MAGICKAL_NAMES=soror-eu-a`
  in prod .env. New magickal-name signups for anyone else 403 with a
  self-host message.

---

## Memory pointers (auto-loaded)

The auto-memory index is at
`~/.claude/projects/-home-sophia-Documents-development-theourgia/memory/MEMORY.md`
and loads on every session. Key entries most relevant to resume:

- `project_resume_state.md` — pointer BACK to this file (updated
  2026-07-08).
- `project_2026_07_08_session_close.md` — this session's shipped
  batches + open threads.
- `feedback_migrate_not_remove.md` — the "don't remove substrate"
  rule that shaped b108-2gt.
- `feedback_match_design_exactly.md` — the most-cited convention.
- `user_magickal_name.md` — CRITICAL: docs use `Soror Ευ. Α.` ONLY.

---

## Resume command

Once you're in the repo root:

```bash
cat CLAUDE_CONTINUATION.md        # THIS FILE — read first
git log --oneline -15             # what's shipped
git status                        # branch state
```

Then use `TaskList` in Claude to see the 22-item Tier plan. Items
243, 244, 245, 248 done; 246, 247 have frontend follow-ups queued;
249–264 pending.

**The work is at a clean pause point.** All tests green, prod live,
seven batches deployed this session. Pick up with **#7 family tree
viz** or **#8 watermark downloads** or the queued frontend
follow-ups for pilgrimage routes + recipes — whichever Sophia
directs.
