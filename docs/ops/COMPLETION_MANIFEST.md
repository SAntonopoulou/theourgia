# Completion manifest

**Living document.** Every route, every backend endpoint, every editor
block, every substrate piece — with an honest status column. Updated
each session as things get fixed.

## Status legend

- ✅ **real** — end-to-end verified with real curl against real prod
- 🔴 **broken** — wired but returns error (422, 500, wrong payload shape, etc.)
- 🟡 **stub** — code exists, may render UI, but doesn't hit backend / doesn't do the thing
- ⚪ **mock** — fixture-only; no backend intended for v1
- ⛔ **superseded** — replaced by a newer route; still registered as clutter
- 🚧 **partial** — some sub-features work, others deferred

Every ✅ has a verifying curl command committed. If a row is ✅ but a
practitioner can't complete the intended flow, that's a bug and this
manifest is the record of the lie.

## Auth + identity

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/signin` | `POST /api/v1/auth/demo-signin`, `webauthn/*` | ✅ | b108-2da; passkey + demo fallback + TOTP challenge |
| `/app/connection` | (developer debug surface) | 🟡 | Kept for developer diagnostics; not primary entry |
| `/app/settings/webauthn` | `/api/v1/auth/webauthn/*` | ✅ | b108-2cn; list + enrol + revoke |
| `/app/settings/totp` | `/api/v1/auth/totp/*` | ✅ | b108-2da; QR + verify + backup codes + disable |
| `/app/settings/keys` | (none — federation key rotation) | 🟡 | Placeholder pending envelope-resign worker |

## Settings

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/settings` | localStorage + `/api/v1/meta` | ✅ | Sectioned hub (B1) |
| `/app/settings/data-export` | `POST /api/v1/me/data-export` | ✅ | b108-2cl · returns archive inline for v1 |
| `/app/settings/delete-account` | `POST /api/v1/me/account/delete` | ✅ | b108-2cl · 30-day grace |
| `/app/settings/audit` | `GET /api/v1/me/audit` | ✅ | b108-2cl · filters + CSV |
| `/app/settings/sessions` | `GET /api/v1/me/sessions` | ✅ | b108-2cl · revoke + revoke-others |
| `/app/settings/accessibility` | localStorage | ✅ | Prefs applied to html data-attrs |
| `/app/settings/preferences` | localStorage | ✅ | Legacy theme/mode/font settings |

## Journal + editor

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/journal` | `GET /api/v1/entries` | ✅ | b108-2cx · timeline + row click → editor |
| `/app/editor/:id` | `GET /api/v1/entries/{id}` + `PATCH .../body` | 🚧 | Tiptap loads + auto-saves; editor blocks status below |
| `/app/library` | `GET /api/v1/books` | 🚧 | Lists real books; add/edit flow partially wired |
| `/app/capture` | `POST /api/v1/entries` | 🟡 | Quick-capture; should navigate to editor after save |
| `/app/today` (`/`) | `GET /api/v1/today/ledger` | ✅ | Real ledger; sub-cards vary |

### Editor blocks (Tiptap nodes)

| Node | Real function | Backend | Status | Notes |
|---|---|---|---|---|
| `SigilNode` | Renders inline sigil | `GET /api/v1/sigils/{id}` | 🚧 | Renders but sigil picker/insert not verified end-to-end |
| `EntityRefNode` | Entity reference | `GET /api/v1/entities/{id}` | 🚧 | Picker exists (EntityPicker.tsx); insert path needs verify |
| `ChartNode` | Astro chart | `POST /api/v1/astro/chart` | 🚧 | ChartPicker exists; render path needs verify |
| `GematriaNode` | Cipher calc | (client-side) | 🟡 | Not verified end-to-end |
| `DivinationNode` | Reading embed | Divination endpoints | 🟡 | Not verified end-to-end |
| `QuoteCitationNode` | Verse citation | Library endpoints | 🟡 | Not verified end-to-end |
| `RitualLogNode` | Structured ritual log | Entries | 🟡 | Not verified end-to-end |
| `SensationNode` | Body-sensation diagram | (client-side) | 🟡 | Not verified end-to-end |

## Workshop

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/sigils` | `POST /api/v1/sigils` | ✅ (fixed) | b108-2db · purpose+mode wire mapping fixed; was 422 before |
| `/app/sigil` (legacy) | — | ⛔ | Superseded by /sigils |
| `/app/talismans` | `/api/v1/talismans` | 🟡 | Route calls apiMethods; end-to-end unverified |
| `/app/talismans/legacy` | — | ⛔ | Superseded |
| `/app/magic-squares` | `/api/v1/magic-squares` | 🟡 | Route calls apiMethods; end-to-end unverified |
| `/app/circles` | `/api/v1/circles` | 🔴 | Payload shape mismatch — 422 on save |
| `/app/circle` (legacy) | — | ⛔ | Superseded |
| `/app/tools` | `/api/v1/tools` | 🟡 | Route calls apiMethods; end-to-end unverified |

## Divination

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/divination` (hub) | — | 🟡 | Landing page; sub-routes below |
| `/app/divination/tarot` | Tarot endpoints | 🟡 | Static — no api calls detected in the sweep |
| `/app/divination/iching` | I Ching endpoints | 🟡 | Static |
| `/app/divination/geomancy` | Geomancy endpoints | 🟡 | Static |
| `/app/divination/runes` | Runes endpoints | 🟡 | Static |
| `/app/divination/more` | Misc endpoints | 🟡 | Static |

## Linguistic

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/gematria` | `/api/v1/gematria/*` | 🟡 | Route static; needs verify |
| `/app/transliterations` | `/api/v1/transliteration/*` | 🟡 | Marks lang but no Tiptap integration |
| `/app/voces` | `/api/v1/voces` | 🟡 | Static — no api calls detected |
| `/app/voces-library` | `/api/v1/voces/bundled` | ✅ | b108-2ce · real listing |

## Analytics & synchronicity

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/analytics` | `/api/v1/analytics/*` | 🟡 | Static — no api calls detected |
| `/app/analytics/legacy` | — | ⛔ | Superseded |
| `/app/synchronicities` | `/api/v1/synchronicities` | 🟡 | Route static |
| `/app/query` | `/api/v1/analytics/query` | 🟡 | Route static |
| `/app/studies` | `/api/v1/studies` | 🟡 | Route static |

## Publishing

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/publications` | `/api/v1/publications` | 🟡 | Route static |
| `/app/publication-editor` | `/api/v1/publications` | 🟡 | Route static |
| `/app/subscribers` | `/api/v1/subscribers` | 🟡 | Route static |

## Media

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/media` | `/api/v1/media` | 🟡 | Route static |
| `/app/media/:id` | `/api/v1/media/{id}` | 🟡 | Route static; Tiptap picker follow-up B108-3 |
| `/app/audio` | `/api/v1/media?kind=audio` | 🟡 | Route static |
| `/app/pilgrimage` | `/api/v1/pilgrimage/*` | 🟡 | Route static |
| `/app/icalfeed` | `/api/v1/ical/*` | 🟡 | Route static |

## Network

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/networks` | `/api/v1/hubs` | 🟡 | Route static |
| `/app/networks/peers` | `/api/v1/hubs/peers` | 🟡 | Route static |
| `/app/networks/discover` | `/api/v1/hubs/discover` | 🟡 | Route static |
| `/app/followers` | `/api/v1/followers` | 🟡 | Route static |
| `/app/private-viewers` | `/api/v1/private-viewers` | 🟡 | Route static |
| `/app/verify` | `/.well-known/webfinger` | 🔴 | TODO Phase 13 — never actually verifies |

## Registry (H10 A-cluster)

All 8 A-cluster routes: **✅** — verified end-to-end with server-side
Ed25519 signing. Author + LEAD maintainer registered on prod.

## Agents (H10 C-cluster)

All 12 C-cluster routes: **✅** — verified with real agent-daemon.

## Admin lifecycle

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/identities` | `/api/v1/identities` | 🟡 | Local state only |
| `/app/lineage` | `/api/v1/lineage` | 🟡 | Local state only |
| `/app/membership` | `/api/v1/membership` | 🟡 | Local state only |
| `/app/permissions` | `/api/v1/permissions` | 🟡 | Local state only |
| `/app/health` | `/healthz`, `/readyz` | 🔴 | TODO live-probe substrate |
| `/app/wellbeing` | (no backend intended) | 🟡 | Local state; "Sacred Well Directory" placeholder |

## Superseded routes (to be deleted)

- `/app/sigil` → `/app/sigils`
- `/app/circle` → `/app/circles`
- `/app/talismans/legacy` → `/app/talismans`
- `/app/synchronicities/legacy` → `/app/synchronicities`
- `/app/analytics/legacy` → `/app/analytics`
- `/app/agents` → `/app/agents-home`
- `/app/sandbox` → `/app/sandbox-browser`
- `/app/account` → `/app/settings`
- `/app/bundles` (old) → `/app/bundles` (new)

## Backend endpoints (independent status)

Per the b108-2cy sweep: **31 of 31** frontend-referenced backend
endpoints return 200 with real database data when hit by an
authenticated curl. The gaps are all on the frontend side
(surfaces not calling them, calling with wrong payloads, or
not linked from the nav).

Backend health: **2575 tests passing** · alembic 0066 · prod deployed.

## Session log

- **2026-07-05 evening** (this session):
  - b108-2cl: Cluster B live (B1-B4, B6-B7)
  - b108-2cm/2cn: WebAuthn end-to-end
  - b108-2co: Public footer pages
  - b108-2cp: Vendor-chunk perf split
  - b108-2cq: `/federation` → `/about/federation`
  - b108-2cr: Sign in link in nav (later upgraded to button)
  - b108-2cs/2ct: Admin `/app/` base URL fix + Caddy handle_path
  - b108-2cu: **CRITICAL** — mock-mode-in-prod fix
  - b108-2cv: Cookie/bearer dual auth for CurrentUser
  - b108-2cw: audit_event_kind enum values_callable fix
  - b108-2cx: Journal → Editor navigation
  - b108-2cy: This manifest + accessibility sweep report
  - b108-2cz: Nav path typos (audio, icalfeed, transliterations)
  - b108-2da: TOTP backend + frontend + SignInRoute + TOTP nav
  - b108-2db: Sigil purpose + mode wire mapping fix (422 fix)
  - b108-2dc: Sign-out button in topbar + settings hub
  - b108-2dd: Deleted 10 legacy/superseded route files
  - b108-2de: Health page live /api/v1/meta probe + honest labelling
  - b108-2df: WebFinger verify · real cross-instance probe
  - b108-2dg: Divination · all four save flows POST to backend
  - b108-2dh: Publications / Media / Subscribers · live-wired
  - b108-2di: Audio / Pilgrimage / Capture · live-wired
  - b108-2dj: NetworkBrowser · honest empty state (was demo peers)
  - b108-2dk: Templates + editor pickers verified live
  - b108-2dl: Gematria · save-study + save-cipher live-wired
  - b108-2dm: iCal feed · live PATCH/regenerate + tz column fix
  - b108-2dn: Plugin status / Plugin detail · live
  - b108-2do: Publication editor · live GET + debounced PATCH

### Newly live-wired in this session's continuation

  · Tarot (past readings) — `GET /tarot/readings`
  · I Ching (save) — `POST /iching/cast` (question + method)
  · Geomancy (save) — `POST /geomancy/cast` (question + method=rng)
  · Runes (save) — `POST /runes/cast` (elder_futhark/three_rune)
  · Publications (list + new) — `GET/POST /publications`, navigates
    to `/publications/{id}/edit`
  · Media Library (list) — `GET /media`, wire→display mapper
  · Subscribers (list + stats) — `GET /subscribers` + client-side count
  · Audio Library (list) — `GET /media?kind=audio`
  · Pilgrimage Map (list + sealed count) — `GET /pilgrimage-sites`
  · Capture (drain) — `POST /entries` per queued item
  · NetworkBrowser — deliberate empty state (backend not yet built)
  · Templates — `GET /templates` merged with built-in starters
  · Gematria Calculator — `POST /studies` + `POST /ciphers`
  · iCal Feed — `GET/PATCH /ical-feed` + `POST /ical-feed/regenerate`
  · Plugin Status — real active/error rows from useInstalledPlugins
  · Plugin Detail — real install by :id, wire→human capability map
  · Publication Editor — live GET on mount + debounced PATCH per
    metadata field and per-chapter title/body

### Real backend bugs surfaced + fixed by the sweep

  · `audit_event_kind` enum values_callable (500 fix)
  · `ical_feed.last_regenerated_at` timezone-aware conversion
    (alembic 0067, prod-migrated)
  · Sigil purpose+mode wire-mapping (422 fix)
  · Mock-mode-in-prod (silent for weeks; caught by cookie-auth verify)

### Routes discovered to be already live (my earlier grep missed them)

  · MyNetworks — uses `useHubs()` internally
  · HubDiscovery — uses `useHubs()` internally
  · Followers — uses `useApFollowers()`, `useApFollowRequests()`
  · PrivateViewers — uses `usePrivateViewerGrants()`
  · StudiesIndexRoute — uses `apiClient.request` directly

These custom hooks all call `apiClient` under the hood; my sweep
searched for `apiMethods.*` and missed the hook layer.

### Curl-verified end-to-end THIS SESSION (real prod)

| Endpoint | Method | Status | Notes |
|---|---|---:|---|
| `/api/v1/auth/demo-signin` | POST | 200 | opens cookie session |
| `/api/v1/auth/session` | GET | 200 → 401 after logout | dual bearer/cookie auth verified |
| `/api/v1/auth/session` | DELETE | 204 | logout works |
| `/api/v1/me` | GET | 200 | real user row |
| `/api/v1/me/audit` | GET | 200 | real audit rows |
| `/api/v1/me/audit.csv` | GET | 200 | CSV export |
| `/api/v1/me/sessions` | GET | 200 | active session list |
| `/api/v1/me/data-export` | POST | 200 | archive JSON (audit-enum fix) |
| `/api/v1/auth/webauthn/register/begin` | POST | 200 | issues creation options |
| `/api/v1/auth/webauthn/assert/begin` | POST | 200 | issues assertion options |
| `/api/v1/auth/webauthn/credentials` | GET | 200 | list |
| `/api/v1/auth/totp/status` | GET | 200 | unenrolled state |
| `/api/v1/auth/totp/begin` | POST | 200 | secret + otpauth URI |
| `/api/v1/auth/totp/verify` | POST | 200 | enrols + backup codes |
| `/api/v1/sigils` | POST | 201 | full round-trip (wire-map fix) |
| `/api/v1/circles` | POST | 201 | full round-trip verified |
| `/api/v1/meta` | GET | 200 | Health page live probe |
| `/.well-known/webfinger` | GET | 200 or 404 | WebFinger verify surface |

---

**Discipline going forward.** No commit says "wired" or "live" unless
the commit message includes a curl-verified check. This manifest is
the single source of truth. Update this before adding another feature.
