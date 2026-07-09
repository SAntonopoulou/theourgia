# Theourgia — Claude Code continuation kit

**Read this file first on every new session.** It tells you exactly
where prod is, what's shipped, what's next, and every gotcha we've
paid for.

Last updated: **2026-07-09** (session close after b108-2ha → b108-2hr — 19 batches).

---

## State of the world (commit `4caa2f5`)

### Production

- **🟢 LIVE at https://theourgia.com** (deployed 2026-06-28; redeployed
  ~19 times during 2026-07-08→09 session).
- 8 prod containers under compose project `theourgia-prod`, isolated
  from the `theourgia` dev stack.
- Sophia's vault is the only account (single-operator gate).
- Sign in at <https://theourgia.com/app/signin> as `soror-eu-a`
  (the slug form — the allowlist expects that exact string).

### Test counts (post b108-2hr)

| Suite | Passing | Notes |
|---|---|---|
| backend | **2898** | alembic head **0075** |
| shared (vitest) | **2987** | admin tsc clean, shared tsc clean |
| admin (route-mount) | **39** | |
| agent-daemon | 198 | alembic head 0002 |
| registry | 34 | alembic head 0001 |

### 🚨 ACTION ITEMS FOR SOPHIA (on resume)

1. **SET A PASSWORD.** Visit https://theourgia.com/app/settings/password
   The b108-2hl security fix closed the "type magickal name → get the
   session" hole, BUT the fix only kicks in AFTER you set a password.
   Until then, anyone typing `soror-eu-a` can still sign in as you.
2. If you're stuck on stale-chunk 404s: DevTools → Application →
   Service Workers → Unregister → then Ctrl+Shift+R. The b108-2hn
   SW fix (network-first navigation) prevents this class of bug from
   recurring after the next update.

### 2026-07-08→09 session (NINETEEN batches)

| Batch | What shipped | FEATURES.md flip |
|---|---|---|
| **b108-2ha** | Family tree viz. Kinship on entity_alias (parent-of · sibling-of · spouse-of) + `ancestor_profile` JSONB + `/entities/{id}/family-tree` + admin `/family-tree` route with generational-lane SVG. Alembic 0072. +10 backend + 11 shared + 1 admin route-mount. | §3 `[ ]` → `[x]` (per-ancestor + tree viz) |
| **b108-2hb** | Watermark purchase downloads. pypdf + reportlab · `apply_email_watermark` diagonal grey stamp · `/api/v1/purchases/{id}/asset` streaming endpoint (idempotent · sealed = 403 · EPUB skipped by design). Pillow-12 exif_stripper migration (`getdata()` → `paste()`). +17 backend. | §12 `[ ]` → `[x]` |
| **b108-2hc** | Deck + spread designer. Card CRUD (POST/PATCH/DELETE) + Spread GET/PATCH endpoints. `DeckDesignerSurface` + `SpreadDesignerSurface` primitives. Admin `/deck-designer` route with tabs. Uses `PromptDialog` + `ConfirmDialog` (no native prompts). +8 backend + 11 shared + 1 admin. | §4 `[ ]` → `[x]` |
| **b108-2hd** | SECURITY: tarot list endpoints auth-gate. `list_decks` + `list_spreads` + `get_deck` + `/tarot/cast` now require auth + filter to `(is_builtin OR owner_id=current_user.id)`. Anonymous callers could previously enumerate user custom decks. +4 backend. | Security |
| **b108-2he** | Frontend follow-ups #4 + #5. `RecipesSurface` (kind chips + ingredients + steps) + `PilgrimageRoutesSurface` (SVG polyline over site coordinates). Admin `/recipes` + `/pilgrimage-routes`. +13 shared + 2 admin. | §10 + §13 `[~]` → `[x]` |
| **b108-2hf** | Web-based first-run wizard. Public `GET /api/v1/setup/status`. Admin `/setup` route with 5-step wizard (welcome · magickal name · tradition · calendars · review). SignInRoute auto-redirects to `/setup` on fresh installs. Backend router named `first_run.py` because pytest treats `setup_module` as an xUnit fixture. +5 backend + 1 admin. | §12 `[ ]` → `[x]` |
| **b108-2hg** | Memorial mode v1. `memorial_config` table (per-user; cadence + warning + executor + posthumous flag + memorialized_at). Alembic 0073. 5 endpoints (config · check-in · trigger · reactivate). `MemorialModeSurface` with state-toned status card. Admin `/memorial-mode`. Copy warm + matter-of-fact. +17 backend + 8 shared + 1 admin. | §18 memorial + check-in `[ ]` → `[x]`; executor + posthumous `[~]` |
| **b108-2hh** | Reference plugin 1/7: Egyptian decans (36) + Liber 777 (32 rows). Read-only `/api/v1/reference/{egyptian-decans,correspondences-777}` endpoints. Chaldean-order rulers · PGM refs where documented · sephiroth + paths. +14 backend. | §13 (2 of 7 shipped) |
| **b108-2hi** | Reference plugin 3/7: Obsidian markdown exporter. `/api/v1/exports/obsidian` streams ZIP of `.md` files with YAML frontmatter + Tiptap→markdown renderer (paragraphs · headings · lists · code · marks · custom nodes preserved as YAML fences). Sealed entries filtered in SQL (regression guard). +20 backend. | §13 (3 of 7) |
| **b108-2hj** | Reference plugin 4/7: Tea-leaf reading log. `tea_leaf_reading` table (question · tea_variety · symbols_observed JSONB · interpretation · intuitive_notes · occurred_at). Alembic 0074. 41-symbol dictionary. `intuitive_notes` first-class so non-mechanical divination is honored in the model. +15 backend. | §13 (4 of 7) |
| **b108-2hk** | Reference plugin 5/7: Day One importer. `POST /api/v1/imports/day-one` accepts Day One JSON export → creates Entry rows. Lenient parser handles 10+ years of schema drift. Title from first non-empty body line (markdown hashes stripped). Photos/audios/videos noted in body (counts) but NOT imported. **Raw lat/lng NEVER emitted** (precision floor applies to imports). +15 backend. | §13 (5 of 7) |
| **b108-2hl** | SECURITY FIX: password required at sign-in. `demo_signin` now verifies `password_hash` when set. Before this: anyone typing magickal name got the account's session. `GET /auth/password` + `PUT /auth/password` (current-password check + 8-char min). SignInRoute password field. Admin `/settings/password` route with care-toned banner when no password is set. +11 backend + 1 admin. | Security |
| **b108-2hm** | FIX: publish + auto-save endpoints. Editor's Publish CTA + auto-save called `/entries/{id}/publish` + `/entries/{id}/body` — neither existed. Adds `entry.published_at` column (alembic 0075) + both endpoints (publish idempotent + sealed-refusal; body 2MB cap + sealed-refusal). `EntryRead` now surfaces `published_at` + `sealed`. +8 backend. | Fix |
| **b108-2hn** | FIX: SW navigations now network-first. Was pinning stale chunks (`Placeholder-Dk3fNKXU.js not found`) after every deploy because SW served cached `index.html` referencing chunks that had been rotated out. Network-first navigation makes this class of bug impossible. VERSION bumped v3-2026-07-09. | Fix |
| **b108-2ho** | Reference plugin 6/7 part 1: Younger Futhark Long Branch (16 runes c. 800-1100 CE). Diacritics preserved (Þurs · Ísa · Sól · Týr · Ýr). Unicode Runic block glyphs. 3-aett distribution (6+5+5). +11 backend. | §13 (6/7 partial) |
| **b108-2hp** | Reference plugin 6/7 part 2: Anglo-Saxon Futhorc (33 runes). 24 Elder base + 5 OE additions (Ac/Æsc/Yr/Ior/Ear) + 4 Northumbrian additions (Cweorð/Calc/Stan/Gar). Meanings from the *Anglo-Saxon Rune Poem* c. 8th-10th c. +12 backend. | §13 (6/7 more done) |
| **b108-2hq** | Reference plugin 6/7 part 3: Armanen runes (18). Guido von List 1902 modern reconstruction. Description honestly flags "modern reconstruction, NOT historical" + acknowledges racialist-movement misuse without endorsement (regression guards). +10 backend. | §13 (6/7 nearly done) |
| **b108-2hr** | DP analytics substrate. `core/analytics/differential_privacy.py`: Laplace mechanism using `secrets.SystemRandom` (not stdlib random). `noisy_count` · `noisy_sum` · `noisy_mean` with input-clipping enforced before aggregation. `CohortTooSmall` blocks queries below threshold BEFORE noise is added. `NoisyAggregate` surfaces value+epsilon+cohort_size+noise_scale for trust. Cross-vault endpoints land with Phase 12+ federation. +25 backend. | §9 aggregate analytics `[~]` |

### Federation status (unchanged from 2026-07-08)

- `THEOURGIA_FEDERATION_TRANSPORT_ENABLED=1` is on.
- Webfinger still returns 404 because ActivityPub is a per-vault
  opt-in and Sophia hasn't toggled it at `/app/settings/activitypub`.

---

## What's next

Sophia's directive on this session's autonomous run: **"Please continue
working through the planned tasks."** She stepped away and I picked up
Tier 2 #13 partials + one Tier 3 substrate item. Every item MUST still
ship.

### Tier 1 — ✅ ALL COMPLETE (9/9)

### Tier 2 — status

- **#10 Whisper transcription** — needs `whisper.cpp` on prod host.
  **Blocked on infra** — Sophia authorization required.
- **#11 Digital inheritance / memorial mode** — ✅ v1 shipped (b108-2hg).
  Follow-ups: cryptographic executor key-share (needs threat-model
  review), automatic Celery-beat trigger, per-entry publish-on-death
  gate.
- **#12 Web-based first-run wizard** — ✅ shipped (b108-2hf).
- **#13 Reference plugins (7)** — partial:
  - ✅ Egyptian decans (b108-2hh)
  - ✅ Liber 777 correspondences (b108-2hh)
  - ✅ Obsidian markdown exporter (b108-2hi)
  - ✅ Tea-leaf reading log (b108-2hj)
  - ✅ Day One journal importer (b108-2hk)
  - ~ Norse runes extended (b108-2ho + 2hp + 2hq: Younger + Futhorc
    + Armanen done; bind-rune designer surface still open)
  - ⏳ Matrix notification channel — last remaining plugin. Needs
    outbound HTTP client + credentials substrate.
- **#14 Content bundles (7)** — needs the MBF (Magickal Bundle
  Format) schema substrate first. See FEATURES §11 — a lot of
  unchecked structural boxes there. Sophia should weigh in on the
  schema before I ship data.
- **#15 Group ritual + egregore** — needs Phase 12 federation
  transport tested with a second instance (Tier 3 #16).

### Tier 3 — status

- **#16 Cross-instance federation test** — needs second instance.
  Blocked on infra.
- **#17 Video integration + captions** — YouTube privacy-enhanced
  embeds. Doable purely in code — pick this up next.
- **#18 Newsletter delivery plugin slots** — Postmark/SES/Resend/
  Mailgun as delivery plugins. Needs MBF plugin substrate.
- **#19 Print-quality book typography** — reportlab-based book
  layout. Substantial, doable purely in code.
- **#20 Cross-magician aggregate analytics (DP)** — substrate ✅
  shipped (b108-2hr). Endpoints land with Phase 12+ federation.
- **#21 Helm chart + Traefik alternative** — needs K8s to test.
- **#22 FEATURES.md checkbox audit** — DO LAST.

---

## Migration gotchas (paid tuition, do not repeat)

- **`sa.Enum(create_type=False)` does NOT prevent CREATE TYPE inside
  `op.create_table`.** Fix:
  1. Create the enum with `op.execute("DO $$ BEGIN IF NOT EXISTS
     (SELECT 1 FROM pg_type WHERE typname = '...') THEN CREATE TYPE
     ... AS ENUM (...); END IF; END $$;")`
  2. Reference with `postgresql.ENUM(*values, name="...", create_type=False)`.
  See `0069_comments.py` + `0071_recipe.py`.
- **Adding an enum column via `op.add_column` is safer** — SQLAlchemy
  doesn't re-emit CREATE TYPE there.
- **Migration failures leave partial state.** Recovery: SSH in,
  `docker exec ... psql -c 'DROP TYPE IF EXISTS ... CASCADE;'`.
- **ALTER TYPE ADD VALUE** must run in `op.get_context().autocommit_block()`.
  See `0072_family_tree.py`.

## Backend gotchas

- **`sa_type=datetime` is wrong** — use `sa_type=DateTime(timezone=True)`.
  See `models/memorial.py` fix.
- **NEVER name a backend router module `setup.py`** — pytest treats a
  module-level `setup_module` symbol as an xUnit setup hook and tries
  to CALL IT. Rename to `first_run.py` etc. See b108-2hf.
- **Never import a router module in tests with the alias `setup_module`**
  for the same reason. Use `first_run_module` or similar.

## Auth gotchas

- **Every new v1 write endpoint MUST use `CurrentUser`** — b108-2gt
  sweep. `OptionalCookieUser` reserved for three exceptions:
  `checkout.create_checkout`, `ical_feed.serve_feed`,
  `identities.get_identity(public_face_enabled)`.
- **b108-2hd** — even READ endpoints on multi-user data (tarot decks,
  spreads, entities) MUST filter to `is_builtin OR owner_id=caller`.
  Anonymous listing = data leak.
- **b108-2hl** — `demo_signin` MUST verify `password_hash` when set.
  Existing pre-b108-2hl accounts (Sophia's) with `password_hash=NULL`
  are still open until they set a password.

## Editor gotchas

- **b108-2hm** — the Editor auto-save calls `PATCH /entries/{id}/body`
  and Publish CTA calls `POST /entries/{id}/publish`. Both must exist
  on the backend. `EntryRead` MUST surface `published_at` + `sealed`.

## Frontend gotchas

- **Never re-export heavy client-only libraries** (pdf.js, epub.js)
  from a barrel that reaches shared/index.ts. Lazy-load via
  `React.lazy` inside surfaces. jsdom explodes otherwise.
- **Vite `?url` import type** — `frontend/shared/src/vite-env.d.ts`
  declares `declare module "*?url" { const src: string; export
  default src; }`.
- **`SpreadPosition` name collision** — the divination engine already
  has one. Any new spread-position type must use a different name.
  Deck designer uses `SpreadDesignerPosition`. See b108-2hc.

## Service worker gotchas

- **b108-2hn** — SW navigations are now network-first. Do NOT revert
  to cache-first for `request.mode === "navigate"` — pinning stale
  chunks after every deploy is exactly what broke Sophia's session.
- **Bump `VERSION` in `frontend/admin/public/sw.js`** on any deploy
  that changes SW behaviour. Cache keys embed VERSION so old caches
  get cleared on activate.

---

## Infrastructure cheat-sheet

### Servers + SSH

- **Prod host:** `theourgia@178.105.106.225`
- **SSH key:** `~/.ssh/agent-house-access-theourgia`
- **Prod deploy root:** `/srv/theourgia/prod`

### Restic backup password

- Saved to `/home/sophia/theourgia-restic-password.txt` (chmod 600).
- **Password:** `wj2Z01AJqy81DtWAvYHGxe2V6GgjneXVPfJUoBr7KL80E9Ma`

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
curl -sS https://theourgia.com/api/v1/entities -w "\nstatus=%{http_code}\n"
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
  "Latest commit" row + test counts + alembic head.
- **No emojis in commits or code** unless Sophia asks.
- **GitHub identity is SAntonopoulou** — pre-push hook enforces the
  allowlist.
- **Co-author trailer on every commit:**
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- **Honesty by construction** — surface what filtered, what was
  refused, what was halted.
- **Single-operator vault** — `THEOURGIA_ALLOWED_MAGICKAL_NAMES=soror-eu-a`.
- **UI modals only** — no native `window.alert/confirm/prompt`. Use
  shared `PromptDialog` + `ConfirmDialog`.

---

## Memory pointers (auto-loaded)

The auto-memory index is at
`~/.claude/projects/-home-sophia-Documents-development-theourgia/memory/MEMORY.md`
and loads on every session. Key entries most relevant to resume:

- `project_resume_state.md` — pointer BACK to this file.
- `project_2026_07_08_session_close.md` — the 2026-07-08 session.
- `feedback_migrate_not_remove.md` — the "don't remove substrate"
  rule.
- `feedback_match_design_exactly.md` — the most-cited convention.
- `user_magickal_name.md` — CRITICAL: docs use `Soror Ευ. Α.` ONLY.

---

## Resume command

Once you're in the repo root:

```bash
cat CLAUDE_CONTINUATION.md        # THIS FILE — read first
git log --oneline -25             # what's shipped
git status                        # branch state
```

**The work is at a clean pause point.** All tests green (2898 backend
/ 2987 shared / 39 admin route-mount), prod live at commit `4caa2f5`,
19 batches deployed this session. Pick up with the operator's next
directive.

## What Sophia should test on resume

1. **/settings/password** — set your password. This closes the auth
   hole.
2. **/editor** — try creating a journal entry. Auto-save should now
   persist (it wasn't before b108-2hm). Publish should now work.
3. **/deck-designer** — build a custom tarot deck. Custom deck
   creation + custom spread designer both work end-to-end.
4. **/family-tree** — build a family tree over your entity kinship
   graph.
5. **/memorial-mode** — configure a check-in cadence and set an
   executor email.
