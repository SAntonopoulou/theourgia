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
| `/app/capture` | `POST /api/v1/entries` | 🚧 | b108-2fx audit: offline-first — appends to `localStorage.theourgia.queue`, drains via `apiMethods.createEntry` on mount + save. Handles offline with pending-count indicator. Navigate-to-editor-after-save is a UX enhancement wish, not a bug. |
| `/app/today` (`/`) | `GET /api/v1/today/ledger` | ✅ | Real ledger; sub-cards vary |

### Editor blocks (Tiptap nodes)

Wiring pattern (b108-2fw audit): admin `Editor.tsx` calls `useEntities()`,
`useBooks()`, and provides `fetchChart` → `apiMethods.getChart(...)`,
threading all three into `EditorDataProvider`. Nodes/pickers consume
via `useEditorData()`. The 5 client-side nodes (Sigil, Gematria,
Divination, RitualLog, Sensation) don't need backend calls — they
render attributes stored in the doc JSON.

| Node | Real function | Backend | Status | Notes |
|---|---|---|---|---|
| `SigilNode` | Renders inline sigil reference from attrs | (none — pure NodeView) | 🚧 | Renders atom node; slash-menu insert path needs a browser save-through test |
| `EntityRefNode` | Entity reference (name/glyph from attrs) | `GET /api/v1/entities` (via `useEntities()`) | 🚧 | `EntityPicker` consumes `useEditorData().entities`; wired live in admin Editor route |
| `ChartNode` | Astro chart snapshot stored in attrs | `POST /api/v1/astro/chart` (via `fetchChart`) | 🚧 | `ChartPicker` calls `ctx.fetchChart(req)`; admin route implements it via `apiMethods.getChart` |
| `GematriaNode` | Cipher calc (client-side) | (none — client-only) | 🚧 | Client-side computation from stored input; renders correctly |
| `DivinationNode` | Reading embed (attrs → figure/spread render) | (none — pure NodeView) | 🚧 | Attrs-based render; no live backend needed |
| `QuoteCitationNode` | Verse citation from Library book | `GET /api/v1/books` (via `useBooks()`) | 🚧 | `LibraryPicker` consumes `useEditorData().books`; wired live in admin Editor |
| `RitualLogNode` | Structured ritual log block | (none — attrs-based) | 🚧 | Client-side block; attributes serialised into doc JSON |
| `SensationNode` | Body-sensation diagram | (none — client-only) | 🚧 | Client-side SVG marker placement, stored in attrs |

## Workshop

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/sigils` | `POST /api/v1/sigils` | ✅ (fixed) | b108-2db · purpose+mode wire mapping fixed; was 422 before |
| `/app/sigil` (legacy) | — | ⛔ | Superseded by /sigils |
| `/app/talismans` | `/api/v1/talismans` | 🚧 | b108-2fv audit: apiMethods calls live (create + list) |
| `/app/talismans/legacy` | — | ⛔ | Superseded |
| `/app/magic-squares` | `/api/v1/magic-squares` | 🚧 | b108-2fv audit: apiMethods calls live |
| `/app/circles` | `/api/v1/circles` | 🚧 | Route wire-mapping audited b108-2ft: all three helpers (`mapRingKind`, `mapCentre`, `mapCompass`) produce backend-valid enum values. Endpoint itself POST 201 curl-verified (see curl table below). Browser end-to-end still needs a real save. |
| `/app/circle` (legacy) | — | ⛔ | Superseded |
| `/app/tools` | `/api/v1/tools` | 🚧 | b108-2fv audit: apiMethods calls live for tools + altars |

## Divination

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/divination` (hub) | — | 🟡 | Landing page; sub-routes below |
| `/app/divination/tarot` | `GET /tarot/readings` + `POST /tarot/cast` | 🚧 | b108-2fv audit: History reads real backend; save Toast-only (surface needs to expose drawn seed for full round-trip) |
| `/app/divination/iching` | `POST /iching/cast` | 🚧 | b108-2fv audit: calls apiMethods.castIching on save with question + method |
| `/app/divination/geomancy` | `POST /geomancy/cast` | 🚧 | b108-2fv audit: calls apiMethods.castGeomancy on save; server casts fresh figure set (drawn-seed round-trip queued) |
| `/app/divination/runes` | `POST /runes/cast` | 🚧 | b108-2fv audit: calls apiMethods.castRunes on save |
| `/app/divination/more` | `POST /bibliomancy/cast` | 🚧 | b108-2fv audit: Bibliomancy live-wired; pendulum/horary/scrying show honest "no data collected" toast |

## Linguistic

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/gematria` | `/api/v1/gematria/*` | 🚧 | b108-2fv audit: apiMethods calls live |
| `/app/transliterations` | `/api/v1/transliteration/*` | 🚧 | b108-2fv audit: apiClient hits /schemes + /schemes/{slug}; Tiptap insertion still deferred (b108-2fk moved sample-text to placeholder) |
| `/app/voces` | `/api/v1/voces` | 🚧 | b108-2fv audit: apiMethods.listVoces + createVoce live |
| `/app/voces-library` | `/api/v1/voces/bundled` | ✅ | b108-2ce · real listing |

## Analytics & synchronicity

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/analytics` | `/api/v1/analytics/*` (today, timeseries, heatmap) | 🚧 | b108-2fv audit: apiClient calls to /today + /timeseries × 2 + /heatmap × 2 + /studies live |
| `/app/analytics/legacy` | — | ⛔ | Superseded |
| `/app/synchronicities` | `/api/v1/synchronicities` | 🚧 | b108-2fv audit: apiClient calls live |
| `/app/query` | `/api/v1/analytics/query` | 🚧 | b108-2fv audit: apiClient calls live |
| `/app/studies` | `/api/v1/studies` | 🚧 | b108-2fv audit: apiClient fetches study list |

## Publishing

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/publications` | `/api/v1/publications` | 🚧 | b108-2fv audit: 6 apiMethods calls live |
| `/app/publication-editor` | `/api/v1/publications` | 🚧 | b108-2fv audit: 6 apiMethods calls live (auto-save + fetch) |
| `/app/subscribers` | `/api/v1/subscribers` | 🚧 | b108-2fv audit: 4 apiMethods calls live |

## Media

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/media` | `/api/v1/media` | 🚧 | b108-2fv audit: 4 apiMethods calls live |
| `/app/media/:id` | `/api/v1/media/{id}` | 🚧 | b108-2fv audit: 3 apiMethods calls live; Tiptap picker follow-up B108-3 |
| `/app/audio` | `/api/v1/media?kind=audio` | 🚧 | b108-2fv audit: 4 apiMethods calls live |
| `/app/pilgrimage` | `/api/v1/pilgrimage/*` | 🚧 | b108-2fv audit: 4 apiMethods calls live (b108-2fs also flipped default precision to ~1km) |
| `/app/icalfeed` | `/api/v1/ical/*` | 🚧 | b108-2fv audit: 7 apiMethods calls live |

## Network

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/networks` | `/api/v1/hubs` | 🚧 | b108-2fv audit: uses `useHubs()` hook (indirect wiring through ../lib/hubs) |
| `/app/networks/peers` | `/api/v1/hubs/peers` | 🚧 | b108-2fv audit: 1 apiClient call live |
| `/app/networks/discover` | `/api/v1/hubs` | 🚧 | b108-2fv audit: uses `useHubs()` hook |
| `/app/followers` | `/api/v1/followers` | 🚧 | b108-2fv audit: uses hook-based wiring through ../lib/ |
| `/app/private-viewers` | `/api/v1/private-viewers` | 🚧 | b108-2fv audit: uses hook-based wiring through ../lib/ |
| `/app/verify` | `/.well-known/webfinger` | 🚧 | Route hits real WebFinger + actor JSON-LD; follows self-link, computes SHA-256 key fingerprint, reports honest pass/fail (b108-2fu audit). Cross-instance CORS may still block key-fetch step — handled honestly with a partial-success message. Sophia's magickal-name handle seed also scrubbed to empty. |

## Registry (H10 A-cluster)

All 8 A-cluster routes: **✅** — verified end-to-end with server-side
Ed25519 signing. Author + LEAD maintainer registered on prod.

## Agents (H10 C-cluster)

All 12 C-cluster routes: **✅** — verified with real agent-daemon.

## Admin lifecycle

| Route | Backend | Status | Notes |
|---|---|---|---|
| `/app/identities` | (Persona table Phase 02/03) | 🚧 | b108-2fh gated: fabricated DEMO_IDENTITIES only render behind `?demo=1` or env flag; default view is honest empty state until Persona table lands |
| `/app/lineage` | `/api/v1/attestations` | 🚧 | b108-2fv audit: apiClient hits attestations endpoint live |
| `/app/permissions` | `/api/v1/permissions` | 🟡 | Local state only — backend not built |
| `/app/health` | `/healthz`, `/readyz` | 🚧 | b108-2fv audit: apiMethods calls to /healthz + /readyz + /meta live via Connection route pattern |
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
  - b108-2em: **ToolRegistry displays real tools + altars.**
    ToolRegistryRoute mounted the surface without ``tools`` or
    ``altars`` props, so the shared package's DEMO_TOOLS + DEMO_ALTARS
    rendered on every deploy — five fabricated tools (Black-handled
    athame · Olive-wood wand · Bronze chalice · Brass censer · Small
    brass bell) plus altar fixtures presented as the practitioner's
    real registry. Now fetches GET /tools + GET /altars on mount,
    maps wire → surface, and passes real data. Curl-verified 200/200.
  - b108-2fb: **Sigil + talisman default text · culture leaks scrubbed.**
    Five hardcoded Thelemic/Hebrew/Greek defaults ("It is my Will
    to walk unseen." · "Hekate" · Hebrew+Greek transliteration
    seeds · "Sigil of the Unseen Walk") pre-filled sigil generator
    inputs. Talisman's "To increase the means of the household"
    purpose seed also scrubbed. All → empty.
  - b108-2fc: **Circle + talisman · Hebrew inscription defaults scrubbed.**
    "אל אב גבור עולם" (traditional Jewish blessing) pre-filled ring
    inscription inputs on every fresh magical circle + talisman;
    swapped to empty defaults. Preview renderings carried the
    specific angelic invocations ("יהפיאל · הסמאל" · "יהפיאל · אל
    · צדקיאל") — swapped to neutral placeholders until per-layer
    text is threaded through the state model.
  - b108-2g0: **a11y sweep · aria-hidden on 8 ICON_PROPS
    decorative-SVG spread objects.** Decorative icons inside
    tablists / nav rails were being announced by screen readers
    redundantly with their surrounding text labels. Added
    `"aria-hidden": true` to the shared `*_PROPS` object in each of
    BeingsTabs · MethodTablist · ScryingPanel (MEDIUM) ·
    AnalyticsTabs · VaultNav · LinguisticTabs · OracleTabs ·
    LogTypeTablist. Each object fans out to ~5-8 icon SVGs → ~50-60
    redundant announcements silenced across the tab surfaces.
  - b108-2fz: **a11y sweep · Escape closes the final 6 modals.**
    Continuation of b108-2fy — the six surfaces whose `role="dialog"`
    sat on inline sub-modals without matching open/onClose at the
    top-level component. Handled each in place: GematriaCalculator's
    two inline modals · AgentCapabilityReviewSurface (onCancel is
    optional — wrapped) · NewsletterEditorSurface confirm modal ·
    NewsletterComposerSurface ConfirmSendModal ·
    PrivateViewersSurface NewViewerModal · QueryBuilderSurface save
    modal. **Task #209: 22 of 22 shared modals with `role="dialog"`
    now support Escape-to-close.** Zero remaining a11y gaps of this
    class.
  - b108-2fy: **a11y sweep · Escape closes 17 modals/drawers + 1
    labelling fix.** Task #209 substantive attack. 22 shared modals
    rendered `role="dialog"` without any Escape-key close handler —
    a violation of the standard modal a11y pattern. Introduced a
    small `hooks/useEscapeToClose(open, onClose)` hook and wired
    it into 17 modals (all those with a matching open/onClose
    prop pair). Also fixed `PluginUpdateDiffModal` which had
    `role="dialog"` + `aria-modal` but no accessible label — added
    `aria-labelledby` pointing at the h2 title. Six surfaces
    skipped as follow-ups: their `role="dialog"` sits on an inline
    sub-modal whose parent owns the open state internally
    (NewsletterEditor/Composer, AgentCapabilityReview,
    QueryBuilder, PrivateViewers, GematriaCalculator) — fix
    requires component extraction.
  - b108-2fu: **WebFingerVerify · Sophia's magickal-name handle scrubbed
    + manifest correction.** initialHandle="@soror-eu-a@theourgia.com"
    pre-filled the verify surface with Sophia's identity on every
    fresh open. Scrubbed to empty; the existing placeholder
    "@you@instance.tld" carries the guidance. Also corrected the
    manifest table: the route was flagged 🔴 "TODO Phase 13 — never
    actually verifies" but the code already implements the full
    verification chain (WebFinger → self-link → actor JSON-LD →
    SHA-256 key fingerprint) with honest partial-success handling
    for cross-instance CORS. Status → 🚧.
  - b108-2ft: **/app/circles wire-mapping audited; endpoint verified.**
    The circles row was flagged 🔴 with "Payload shape mismatch — 422
    on save" but the same manifest's curl-verified section already
    showed /api/v1/circles POST → 201. Audit resolved: mapRingKind
    (glyphs → glyph_row, multi → multi_glyph), mapCompass (winds →
    greek_winds, dikpalas → vedic_dikpalas), mapCentre (solomonic →
    solomonic_seal, square → kamea_trace) all produce backend-valid
    enum values. Status → 🚧 (browser end-to-end still needs a save
    through the UI; endpoint itself is proven live).
  - b108-2fs: **PilgrimageMap default precision now ~1km, not exact.**
    The surface defaulted `initial_precision='exact'`, rendering
    every pin at raw recorded coordinates on the first paint. H07
    Cluster C locked "precision default ~1km not exact" as a
    location-honesty rule; the surface must never reveal raw
    coordinates by default. Default flipped to '1km'; callers opt
    into 'exact' only when practitioner has explicitly recorded
    at that level. Rail-rows test updated to pass 'exact'
    explicitly.
  - b108-2fr: **PendulumPanel opens with 'not yet asked' state.**
    The Pendulum panel opened with initialAnswer='Yes' shown on the
    dial and as a big --accent label — reading as if the pendulum
    had already answered Yes on every fresh open. Now
    initialAnswer defaults to null; the type widens to
    `PendulumAnswer | null`. The dial renders at rest (angle 0,
    bob in --ink-mute, aria-label 'Pendulum at rest — no answer
    yet'). The answer text renders as '—' in --ink-mute; the note
    swaps to 'Ask a question above to see the pendulum's answer.'
  - b108-2fq: **App.tsx · ActingAsProvider no longer seeds 'aspasia'.**
    App.tsx wrapped its providers with
    `<ActingAsProvider initial={ACTING_AS_DEFAULT_ID}>`. The constant
    value was "aspasia" — a fabricated identity from DEMO_IDENTITIES.
    Since actingIdentities is now built from real auth.session,
    "aspasia" never matched a real id, but the string still landed
    in localStorage on first mount, keeping the leak alive across
    reloads. Dropped the initial prop entirely — the provider now
    falls through to null, and the switcher's existing
    `authorable.find(...) ?? authorable[0]` fallback selects the
    session's own identity naturally.
  - b108-2fp: **MagicalCircle initial defaults scrubbed.**
    The surface opened with a fully-composed circle every time:
    3 rings (glyphs · glyphs · inscription), archangel compass
    (Uriel · Raphael · Michael · Gabriel), and a hexagram centre —
    read as if the practitioner had already begun designing.
    Scrubbed to structural minimum: `initialRings=['blank']` ·
    `initialActiveRing=0` · `initialCompass='custom'` (cardinals
    "North · East · South · West") · `initialCentre='blank'`.
  - b108-2fo: **DefinePracticeDrawer · pre-fills scrubbed.**
    The 'Define a practice' drawer pre-filled three fields from the
    H04 mockup state on every fresh open: name "Evening banishing"
    · cadence "before-sleep" · intention "Clear the room before
    rest." — read as if the practitioner had already begun
    composing a specific evening banishing practice. Now all →
    empty, cadence → neutral canonical "daily".
  - b108-2fn: **GematriaCalculator · custom-cipher Name field scrubbed.**
    The 'Define a custom cipher' modal pre-filled its Name field with
    "My English cipher" — the possessive 'My' read as if the
    practitioner had already named it. Scrubbed to empty;
    GC_CUSTOM_NAME_PLACEHOLDER carries the example as a placeholder
    attribute; GC_CUSTOM_NAME_FALLBACK ("Untitled custom cipher")
    only triggers if Save is pressed with the field blank.
  - b108-2fm: **MagicSquares fallback name + SigilGenerator glyph
    decoration cleaned.** DEMO_CUSTOM_NAME "Square of binding" —
    the fallback shown when the surface couldn't match a custom
    square by id — read like a real user creation on empty-vault
    deploys. Now "Untitled custom square". SigilGenerator
    CarriesPanel showed LINKED_BEING_GLYPH_DEFAULT '☽' as a
    right-aligned decoration next to the empty Linked-being input;
    the glyph now renders only when both name AND glyph are set.
  - b108-2fl: **Talisman Designer · fabricated Jupiter-hour seeds
    scrubbed.** Three misleading pre-fills on every fresh talisman:
    MATERIALS_DEFAULT seeded 'Cast in tin; the obverse engraved,
    the reverse stamped.' into the materials-notes textarea as if
    the practitioner had written it (→ empty; MATERIALS_PLACEHOLDER
    carries the example); ELECTION_PREVIEW_WHEN/DETAIL/GLYPH
    ('24 Jun 2026 · 13:42' / 'Hour of Jupiter · Hellenic' / '♃')
    rendered as if a Jupiter-hour election were already linked
    (→ honest "No election linked yet" / "Choose one from the
    Election Finder" / '' in --ink-mute); TALISMAN_LAYERS layer-row
    summaries seeded a full composition ('parchment · names of God
    · ♃ Jupiter · 2 sigils · 2 · none') as if the practitioner had
    already built the talisman (→ all "empty" by default).
  - b108-2fk: **Transliteration utility · sample text moved to placeholder.**
    Pre-filled the input textarea with a per-script cultural
    specimen (ἀγαθὸς δαίμων · שלום · अग्नि · كتاب · ⲁⲗⲫⲁ · lux)
    and swapped in a fresh one on script change. Now the input
    starts empty; the sample only appears as a greyed
    ``placeholder="e.g. …"`` hint. Surface accepts a new
    `input_placeholder` prop that threads through cleanly.
  - b108-2fj: **Bibliomancy · default library scrubbed.**
    The 'source · from your library' dropdown defaulted to four
    fabricated texts (Chaldean Oracles · Liber AL vel Legis ·
    Picatrix · Marcus Aurelius) as if they were the practitioner's
    Library holdings. Scrubbed BIBLIO_DEFAULT_SOURCES to []; added
    BIBLIO_DEMO_SOURCES for stories + tests. Empty state disables
    the select and shows "Your Library is empty — add a book first"
    as the placeholder option.
  - b108-2fi: **Connection · Demo signin button gated.**
    /app/connection is the public-site hero-CTA target. Its "Demo
    signin" button sat next to "Sign in with passkey" by default —
    end users landing here saw a magickal-name-only bypass they
    weren't meant to see. Gated with the same
    VITE_THEOURGIA_ENABLE_DEMO_SIGNIN + ?demo=1 pair used on the
    dedicated SignInRoute (b108-2ey).
  - b108-2fh: **Identities route · fabricated DEMO_IDENTITIES gated
    behind ?demo=1.** The five demo identities (Aspasia,
    Theophrastos, Frater Sub Rosā V°, null.priest, V.) rendered as
    if they were the practitioner's real author identities on
    /app/identities/. Now default view is an honest empty state
    ("Identities are not built yet.") with copy explaining the
    Persona table is deferred to a later phase. The fabricated
    preview only renders behind VITE_THEOURGIA_ENABLE_DEMO_IDENTITIES=1
    or ?demo=1 — same pattern as SignInRoute.
  - b108-2fg: **Gematria + voce + magical-circle seeds scrubbed.**
    Three more pre-filled cultural specimens: GC_DEFAULT_INPUT
    "ἀγαθοδαίμων" (Greek "good spirit") pre-filled the gematria
    calculator input; VM_NEW_DEFAULT_TEXT "ΦΩΡ ΦΩΡΒΑ" (PGM magical
    name) + its transliteration "phōr phōrba" pre-filled the New
    Voce modal; MULTI_DEMO_SEQUENCE "☉ ☽ ♃ ♀ ☿" rendered as if it
    were the user's composed multi-glyph ring sequence. All →
    empty / honest placeholder. Tests updated.
  - b108-2ff: **Divination · default question seeds scrubbed.**
    Every divination surface (Tarot · IChing · Geomancy · Runes)
    pre-filled its Question input with a specific mockup phrase that
    rendered as if it were the user's own: "Should I bring the working
    forward to the solstice?" (Tarot + IChing) · "Will the lineage
    petition be granted before the equinox?" (Geomancy) · "What stands
    before me, and what walks beside it?" (Runes). All → empty. Fresh
    casts now show a blank question field.
  - b108-2fe: **Practice logs · dream/pathwork/asana/banish seeds scrubbed.**
    PracticeLogs/copy.ts shipped extensive fabricated defaults
    rendered as if they were the practitioner's own past work: fake
    wake-time "06:48", a 3-line invented dream ("shelves run downward
    into water · a woman with a lamp"), five dream symbol chips
    (library / descending water / lamp-bearer / a name withheld /
    Hekate?), lucid=true default, three past dream snippets, an
    invented pathworking vision, Asana notes "Seat held without
    shifting", three past asana sessions, banishing time "14:23",
    five past banishing entries. All scrubbed to empty defaults.
    Kept as DEMO_* exports for Storybook + tests only. PATH_DEFAULT
    stays 25 (Samekh) as a structural Tree-of-Life default. 45
    PracticeLogs vitests updated + pass.
  - b108-2fd: **Topbar names + asana stats · no more fabricated seeds.**
    MagicalCircle + TalismanDesigner topbar defaults ("Circle of
    the Sphere of Jupiter" · "Talisman of Jupiter for Increase")
    → "Untitled circle" / "Untitled talisman". Asana panel's
    "Siddhāsana" · "1 : 4 : 2" breath ratio · 12:07 paused-timer
    seed all cleared. Fabricated cumulative practice stats
    ("41.5 hours cumulative · 88 sessions kept") zeroed — no more
    pretending the user has a practice history they don't.
  - b108-2fa: **Registry extension-point tiles · dead href="#" links removed.**
    RegistryPublicHomeSurface's "Browse by extension point" tiles
    rendered as `<a href="#">` — announced as links but jumping to
    the top of the page. Converted to non-interactive `<div>` tiles;
    per-category endpoints haven't shipped on the registry yet. When
    they do, this switches back to real anchors.
  - b108-2ez: **Skip links · WCAG 2.4.1 bypass blocks.**
    Screen-reader / keyboard users on theourgia.com and the admin SPA
    had no way to bypass the header/nav on first Tab. Added a "Skip
    to main content" affordance that appears only when focused,
    slides into view, and jumps to #om-main. Admin AppShell tags its
    main region and renders the skip link. Public site's
    PublicChrome injects the same; every non-PublicChrome public
    page got id="om-main" on its <main>. Closes WCAG 2.4.1 gap on
    both surfaces.
  - b108-2ey: **Demo signin gated · tasks #204 + #208 closed.**
    Demo-signin UI affordance now gated behind
    ``VITE_THEOURGIA_ENABLE_DEMO_SIGNIN=1`` at build time OR
    ``?demo=1`` on the URL. Production shows only the WebAuthn CTA;
    local dev, preview deploys, and emergency access still work via
    the flag. Public /vault "Sign in" CTA repointed at /app/signin
    (was /app/connection dev diagnostic). Fixture attestation
    "Frater Lykourgos · Minerval in the Lyceum tradition" swapped to
    generic "Sample signer · Sample attestation for mock-mode
    preview". Task #204 (retire demo signin) + Task #208 (proper
    sign-in page) now complete.
  - b108-2ew: **VaultNav default identity → neutral chrome.**
    VaultNav's identity prop default was `{ name: "Aspasia", role:
    "Adeptus Minor" }` — the shared package would leak the demo
    persona if a consumer forgot to pass the prop. Admin app already
    passes a real session-derived identity (b108-2ef), so unreachable
    in production, but the leak sat in the public API. Now
    `{ name: "Practitioner", role: "This vault" }`.
  - b108-2ex: **Last magickal-name leaks in placeholders + fixtures.**
    Four surfaces still had "Soror Ευ. Α." baked in: Connection.tsx
    PromptDialog placeholder, SignInRoute input placeholder,
    admin/mocks/today.ts MOCK_IDENTITY export (orphan; removed), and
    shared/api/fixtures.ts session display_name + magickal_name
    (opt-in mock mode only). All swapped to neutral "Practitioner" /
    "Your magickal name". 2924 shared vitests pass.
  - b108-2eu: **Public /blog · fake Theophrastos posts scrubbed.**
    theourgia.com/blog rendered six hardcoded fabricated posts as if
    they were the practitioner's real published essays (featured "On
    the discipline of the magical record" · "The kingfisher, and
    reading omens honestly" · Ἓν τὸ πᾶν · "Planetary hours for people
    who don't believe in them" · "The Warburg Institute digitises its
    iconography archive" · "A year of Liber Resh, charted" · "Hekate
    at the crossroads of three traditions"). Now client-side fetches
    /api/v1/blog/posts and shows honest empty state when 0 posts.
    RSS/Atom links repointed at backend feed URLs.
  - b108-2ev: **Public site · orphan demo pages purged.**
    Deleted eleven fabricated-identity demo pages that were unlinked
    from the homepage but cross-linked from each other: essay,
    book, memorial, lineage, profile, ritual, trance, sso,
    hub/[slug], print/ritual-sheet, print/talisman-sigil. Every
    one carried invented editorial output attributed to
    Theophrastos / Aspasia / Demetra / Philon / Diotima /
    "Sub Rosā Lodge" / "Aurora Lodge". Newsletter page rewritten:
    17-issue "Theurgist's Almanac by Theophrastos" fabricated
    archive → honest empty state; subscribe form surfaces the
    real endpoint-queue status instead of pretending to subscribe.
    Public-site builds green (9 real pages remain — all either
    documentation, design references, or honest empty states).
  - b108-2es: **Final DEMO_* defaults purged.**
    AltarsList `altars = DEMO_ALTARS` → `= []`; consumers pass real
    altars. ElectionPickerModal `elections = DEMO_ELECTIONS` → `= []`
    with an honest "No saved elections yet" placeholder (Election
    Finder pipeline queued). Every remaining shared component now
    defaults to empty; no `DEMO_*` fallback path can leak into a
    consumer route by accident. 2924 shared vitests pass.
  - b108-2et: **PrivateViewers · magickal-name leak.**
    The new-viewer modal's label field initialised to "Student —
    Aspasia" (Sophia's magickal name pre-filled on every deploy),
    and the label/email placeholders leaked her name into the
    chrome. Label default → `""`; placeholders → generic
    "A private label only you see" / "name@example.com".
  - b108-2ep: **Magic squares · display real custom squares.**
    Surface used to default customSquares to a single fabricated
    "Square of binding · order 5". Route now fetches
    GET /api/v1/magic-squares (200), maps MagicSquareRecord →
    CustomSquareEntry, refreshes on save from both save paths.
  - b108-2eq: **Pendulum session log demo entries scrubbed.**
    PendulumPanel seeded its session log with three fabricated
    Q/A pairs ("Is now the time to send the petition?" ·
    "Should I add the second sigil?" · "Will Diotima reply
    before the dark moon?" with fake 14:19/14:24/14:30
    timestamps) — appearing as if the user's own past
    consultations. Now defaults to empty with a "No sessions yet"
    placeholder; new "Ask" clicks still append normally.
  - b108-2er: **Editor docstring synced with b108-2eh behaviour.**
  - b108-2eo: **Sigil library + surface defaults → empty.**
    SigilLibraryPanel defaulted to twelve fabricated sigils ("Unseen
    Walk", "Saturn Bind", "Venus Draw", "Hermes Road", "Brigid
    Flame", "Threshold", "Quiet Mind", "Open Way", "Dark Moon",
    "Clear Sight", "Safe Return", "Steady Hand") rendering every
    time a practitioner opened the library. SigilGeneratorRoute now
    fetches GET /sigils, maps records into the surface's library
    prop, and refreshes on save. ToolRegistrySurface tools/altars
    defaults + VocesMagicaeSurface voces default all switched to
    `= []` (from DEMO_*) — defence in depth so no future consumer
    can accidentally leak demo data. 2923 shared vitests pass.
  - b108-2en: **Shared surface demo defaults → empty.**
    Talisman DEMO_ELECTIONS (three Jupiter windows with fabricated
    scores 0.92/0.78/0.69), DEMO_LAYER_SIGILS ("Sigil of Yophiel" +
    "Sigil of Increase"), DEMO_INSCRIPTIONS ("Increase · multiply" +
    "אמן") all scrubbed to empty. VocesMagicaeRoute now fetches
    GET /voces and passes real records instead of the default
    DEMO_VOCES fixture (fabricated ΙΑΩ / ABRASAX / ABLANATHANALBA
    specimens). 2923 shared vitests all pass after test updates.
  - b108-2el: **Scrying / bibliomancy / horary demo content scrubbed.**
    Three DivinationMisc panels shipped with fabricated defaults
    rendered on every visit as if they were the user's real past
    work — three "past scrying" snippets ("A doorway with no lintel",
    "widdershins lights", "old brass key"), a Chaldean-Oracles fr. 153
    bibliomancy passage, a five-line Hellenistic horary reading
    ("Saturn intervenes; a qualified yes") over five hardcoded
    Sect/Querent/Quesited/Perfection/Reception steps. All three
    replaced with empty defaults + honest "no past sessions" /
    "Cast a chart to fill this reading" / "Open a passage first"
    placeholders. All 2923 shared vitests pass after test updates.
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
