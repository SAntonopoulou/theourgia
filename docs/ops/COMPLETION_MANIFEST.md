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
  - b108-2dp: Media Detail live · Federation honest empty state
  - b108-2dq: Scheduler / Membership / LineageAdmin fixtures emptied
  - b108-2dr: Dead Hubs.tsx removed (unused since MyNetworks landed)
  - b108-2ds: Hub-admin batch (HubAdminDashboard + HubMemberDashboard live)
  - b108-2dt: Registry browse/detail/author-profile · live-wired
  - b108-2du: Bundles honest empty state · NewsletterComposer removed
  - b108-2dv: PublicationSettings live · Permissions.tsx removed
  - b108-2dw: **Fixture routes swept.** SubscriptionTiers +
    PricingDistribution + PublicationEditor + NewsletterEditor —
    every remaining `makeFixture()` scrubbed. All four now GET on
    mount, POST/PATCH on interaction, and DELETE where the surface
    exposes it. Curl-verified end-to-end:
      · `POST/PATCH/DELETE /newsletter-issues` — 201 / 200 / 204.
      · `POST/DELETE /subscription-tiers` — 201 / 204.
      · `GET /stripe-connect/account` — 200 (pending state).
      · `GET /publications` — 200.
    Publication Editor now auto-creates a draft when opened without
    an id (`POST /publications`) and navigates to `/publications/{id}/edit`.
    "Add chapter" hits `POST /publications/{id}/chapters` — no more
    ghost chapters. "Open settings" navigates to
    `/publications/{id}/settings` (was a Toast stub).
  - b108-2dx: **RitualFeed / SandboxDetail live · BundleInstall removed.**
    RitualFeed was a 1064-line illustrative surface with a fabricated
    Solstice Vigil, hardcoded UPCOMING array, fake comments + hub
    members + iCal rail. Replaced with a minimal-honest list against
    `GET /api/v1/group-rituals` + `POST /:id/respond` for RSVP.
    SandboxDetail's hardcoded decan cards replaced with a real fetch
    from `/api/v1/sandbox`; promote/discard hit
    POST /sandbox/:id/promote and DELETE /sandbox/:id. The 6-step
    BundleInstall wizard (pinned to a fabricated "Hellenic Theurgy"
    bundle) was removed entirely — the bundle install flow now goes
    through the registry-backed plugin store.
  - b108-2dy: **DivMisc bibliomancy live · Plugin configure schema-aware.**
    `POST /api/v1/bibliomancy/cast` wired via `onSaveBibliomancy`;
    pendulum/horary/scrying save callbacks stop claiming "saved" and
    now say "no data collected" (tone=info) — the panels don't yet
    capture the fields those backends need. PluginConfiguration
    reads the plugin's real name + `manifest.config_schema` (added to
    PluginInstallRead) and shows a truthful "no configurable fields"
    empty state when the schema is absent — no more hardcoded
    ephemeris/Planetary Hours example. Identities got a dashed
    "Preview surface" banner acknowledging the Persona table is Phase
    02/03.
  - b108-2ea: **Orphan mockups removed · HubNewsletter live.**
    Deleted three unlinked route files that were showing fabricated
    numbers as real data: Membership.tsx (fake "47 Initiates · 3
    Officers" stats · dead), Scheduler.tsx (573-line visual mockup ·
    dead), Federation.tsx (fake "vault.demo.theourgia.net" instance +
    "scriptorium.adeptus.org" pending peer + "node.blacklodge.onion"
    blocked peer · dead). None of the three appeared in the admin
    nav; the real functionality lives at /hubs/:id/admin (member
    admin), Publications (scheduling), NetworkBrowser +
    FederationAuditLog (federation). HubNewsletterComposer now
    fetches the hub name from `GET /hubs/:id` instead of hardcoding
    "Crossroads Coven"; recipient count is 0 with an honest tone=info
    toast until the hub-newsletter backend ships.
  - b108-2ed: **AccountSettings operator + ActivityPub webfinger.**
    AccountSettings "Operator" label was hardcoded to Sophia's
    magickal name and would appear on every self-hosted deploy
    regardless of owner. Now derived from `useAuth().session`
    (magickal_name → display_name → fallback). ActivityPub Settings
    webFingerHandle now derives from `useSession()` + browser
    `window.location.host` — every user sees their real
    @handle@instance instead of a placeholder.
  - b108-2ee: **Divination workbench CTAs route to real per-tool pages.**
    The tabbed /divination surface had disabled Shuffle/Draw/Cast
    buttons with "engine pending" tooltips — but /divination/tarot
    · iching · geomancy · runes · more all exist as fully-wired
    routes. Buttons now show "Open <Tool> →" and navigate to the
    real per-tool page.
  - b108-2ef: **Magickal-name leaks scrubbed · Workshop hrefs fixed.**
    VaultNav footer showed "Aspasia · Adeptus Minor" by default
    (the shared package's demo fallback) — now takes an `identity`
    prop from the real session. ActingAsSwitcher was passing the
    fabricated DEMO_IDENTITIES array; now passes a single-identity
    list built from the session (multi-identity returns with the
    Persona table). ActivityPubSettings default display name +
    bio ("Aspasia of the Crossroads" · "Theurgist. Keeper of a
    magical record.") wiped to empty. ChartNode placeholder
    "Natal — Aspasia, 1980-03-14" → generic. Workshop builder
    hrefs `/sigil` and `/circle` → `/sigils` and `/circles`
    (both were 404'ing).
  - b108-2ei: **Agent install + task composer honesty.**
    AgentInstallRoute passed a hardcoded pair of DEFAULT_CAPABILITIES
    (read.entries + read.entities) as if they were the agent's real
    caps — displayed on every install regardless of the agent.
    Removed; the preamble now says "the agent's declared capabilities
    aren't yet returned by the marketplace endpoint; you'll be
    prompted at first run". AgentTaskComposerRoute was calling
    startAgentRun with `agent_slug=installId` (wrong), granted_caps=
    ["read.entries"] hardcoded, and monthly_cap_usd="10.00" — all
    invented. Now fetches GET /agents/installs/:id and uses the
    real agent_id and monthly_cost_cap_usd from the install.
  - b108-2ej: **Silent console.info stubs → honest Toasts.**
    Six action buttons (Agent BYO key save/reset/subscription/
    override · Agent memory archive · Bundle library action ·
    Hub member Withdraw + Sharing toggle · Plugin submission
    Replace manifest · Plugin submission Withdraw) were logging
    "endpoint queued" to console.info while showing the CTA as if
    it worked. Replaced with tone=info Toasts that explicitly say
    what's not wired. Also swapped the AgentMemoryReader Add file
    `window.prompt` for the shared PromptDialog.
  - b108-2ek: **Native window.confirm/prompt swept.**
    TotpEnrollmentRoute's "Disable TOTP" `window.confirm` replaced
    with ConfirmDialog (tone=destructive). The shared Editor
    Toolbar Link button's `window.prompt("URL", …)` replaced with
    PromptDialog. Two remaining native browser dialogs were the
    last violations of the UI-modals-only feedback rule; both gone.
  - b108-2eh: **Editor `/editor` auto-creates a draft.**
    Loading /editor with no :id previously rendered a fabricated
    "Invocation of the Agathos Daimon" specimen (fake ritual log ·
    Greek quote · PGM citation · gematria · sensation map). Save
    status read "Demo · not saved". Multiple links routed users
    here (Oracle "Open as entry" · Templates "Start new entry" ·
    GroupRitualPostMortem "Open as entry"). Now POSTs a real draft
    (`Untitled entry`, type=observation) and replace-navigates to
    /editor/:id. The 70-line DEMO_DOC constant + `"demo"` SaveStatus
    variant deleted.
  - b108-2eg: **BookPreview orphan removed.**
    772-line print-preview surface pinned to a fabricated
    "Bornless Working · Theophrastos" specimen — chapter opener,
    index entries, cover byline all invented. Never linked from
    the admin nav; the real per-publication print preview will
    live at /publications/:id/print-preview when the print
    pipeline substrate ships.
  - b108-2ec: **Settings · encryption-per-content-type table removed.**
    The Settings page's Journal=standard / Workings=zero-knowledge /
    Divination=standard / Sigils=zero-knowledge table hardcoded a
    security posture that nothing on the backend actually enforces —
    a reader was being told "your Workings are zero-knowledge" with
    no truth behind it. Removed and replaced with a link to the
    dedicated /settings/accessibility page. High-contrast / Reduced-
    motion / Larger-text toggles now persist to localStorage
    (`theourgia.a11y.prefs`) and apply live to
    `document.documentElement`. Stub sections now show an "Open
    <section> →" link to each section's real dedicated route (Account
    · Security · Networks · Plugins · Accessibility · Billing).
  - b108-2eb: **Lineage attestations live.**
    LineageAdmin now fetches `GET /api/v1/attestations` on mount and
    derives state (verified / self-declared / revoked) from the
    signature + revoked_at columns. Empty list renders a dashed
    "declaring requires §10.5 keypair signing (not yet wired)"
    placeholder instead of a silent zero-row list.
  - b108-2dz: **Safety-critical false-green checks removed.**
    RegistryReviewDetail's four "automatic" verification checks were
    rendering `ok=true` even though the registry never emits real
    per-submission audit results — combined with the surface's
    `allChecksPass = checks.every(c => c.ok)` gate, a maintainer
    could green-light "Accept official" without any real check.
    Flipped to `ok=false` with "not yet run" labels. Same class of
    bug fixed in TierPromotion (auto_signed / auto_no_advisories
    now `satisfied=false`). Templates.tsx also had fabricated
    `used 131×` counters — zeroed + hidden when zero, and dropped
    the divergence-prone `blocks: N` field in favour of
    `structure.length`.

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
  · Media Detail — GET /media/{id} + PATCH on every field change
  · Federation status — honest empty state (no more fake peers)
  · Scheduler, Membership, LineageAdmin — fixture arrays emptied
    to honest empty states (backends not yet built)

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
| `/api/v1/newsletter-issues` | POST | 201 | draft created |
| `/api/v1/newsletter-issues/{id}` | PATCH | 200 | subject edited |
| `/api/v1/newsletter-issues/{id}` | DELETE | 204 | soft-deleted |
| `/api/v1/subscription-tiers` | POST | 201 | tier created |
| `/api/v1/subscription-tiers/{id}` | DELETE | 204 | soft-deleted |
| `/api/v1/stripe-connect/account` | GET | 200 | pending onboarding state |
| `/api/v1/publications` | GET | 200 | own drafts + published |
| `/api/v1/group-rituals` | GET | 200 | empty for me — expected |
| `/api/v1/sandbox` | GET | 200 | list surface |
| `/api/v1/bibliomancy/cast` | POST | 201 | source_text + label |
| `/api/v1/attestations` | GET | 200 | LineageAdmin live |
| `/api/v1/hubs/{id}` | GET | 200 | HubNewsletter hub-name fetch |

---

**Discipline going forward.** No commit says "wired" or "live" unless
the commit message includes a curl-verified check. This manifest is
the single source of truth. Update this before adding another feature.
