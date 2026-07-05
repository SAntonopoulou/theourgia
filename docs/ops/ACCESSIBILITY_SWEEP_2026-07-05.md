# Accessibility & wiring sweep — 2026-07-05

**Honest inventory of what actually works** in the admin SPA against
real prod backend, after Sophia's escalation about "a wrapper with
non-working parts."

## Method

- Enumerated every `<Route>` in `frontend/admin/src/App.tsx` — 108 routes
  binding to 106 distinct component files.
- Cross-referenced with `VaultNav` (`frontend/shared/src/VaultNav/VaultNav.tsx`)
  — 32 destinations linked from the left rail.
- Grepped each route file for data-fetching signals:
  `apiMethods.*`, `useApiCall`, `useQuery`, `useMutation`, custom
  hooks (`useEntries`, `useAuth`, …), raw `fetch(`.

## Headline numbers

| Category | Count | Notes |
|---|---:|---|
| Total route components | **106** | some routes share a component |
| Fetching real data ("LIVE") | **47** | api or hook signals present |
| No fetch signals ("STATIC") | **57** | render demo/mock state locally |
| Explicit Placeholder chrome | 2 | `/settings/keys`, `/settings/preferences` shim |

## The Sophia-critical finding

**The core journal-writing loop was broken.**

The primary CTA on `/app/journal` ("New entry") opened a
`PromptDialog` — a single-line text prompt — and called
`createEntry({title, excerpt: <the typed string>})`. It never
navigated to the Tiptap editor. Entry rows had no click handler
either — so an existing entry could not be opened for editing at
all. The Tiptap editor (8 block nodes, 3 pickers, slash menu,
toolbar, auto-save, visibility chip) has existed as real code the
whole time (`frontend/shared/src/Editor/TiptapEditor.tsx`); it just
was not reachable from the timeline.

**Fixed 2026-07-05** in commit `642dd46` (b108-2cx):
- "New entry" → creates + navigates to `/editor/<id>`
- Entry rows are keyboard/mouse-clickable → open in editor

This was the single most impactful gap in the whole product. The
sweep only found it because I finally sat with the app the way a
practitioner would.

## Other product-critical gaps

Signalled by the sweep but not yet fixed:

### 1. TOTP has no admin surface (fix in progress)

Backend `core/auth/totp.py` has been complete for months. Zero HTTP
endpoints exposed until b108-2cy (this session); no frontend
surface. Users going to FreeOTP saw "invalid link" because there was
no QR to scan.

**Status:** Backend endpoints shipped in b108-2cy (this session).
Frontend surface still queued.

### 2. Sign-in is a developer debug page

`/app/connection` — titled "Auth context" — was the sole entry
point. Not a signin page; a diagnostic. Practitioners can technically
sign in there (demo signin button or passkey), but the surface reads
as developer chrome.

**Status:** A proper `/app/signin` page is queued as task #208.

### 3. Many nav destinations don't resolve to a proper surface

Nav paths that don't have a matching route (or point to a
demo-content-only route):

- `/audio-library` (nav) → `/audio` (route) — path mismatch
- `/ical-feed` (nav) → `/icalfeed` (route) — path mismatch
- `/transliteration` (nav) → `/transliterate` (route) — path mismatch

These are just typos in the nav that cause 404s. Trivial to fix.

### 4. The 57 STATIC routes

Below is the list of routes whose files contain **no data-fetching
signals**. Some of these are legitimately static (design showcases,
localStorage-only settings). Many render mock content that a
practitioner would expect to be real. Sorted by file size (larger
= more surface, more disappointment):

| Component | Lines | Route | Status |
|---|---:|---|---|
| Foundations | 1292 | `/foundations` | ✅ Legit static — design showcase |
| RitualFeed | 1064 | `/feed` | ⚠ Renders demo feed items; no /feed endpoint yet |
| Identities | 966 | `/identities` | ⚠ Local state only |
| Talismans (legacy) | 951 | `/talismans/legacy` | 🗑 Superseded by TalismanDesignerRoute (LIVE) |
| CircleBuilder | 949 | `/circle` | 🗑 Superseded by MagicalCircleRoute (LIVE) |
| Wellbeing | 863 | `/wellbeing` | ⚠ Local state only; no backend for wellbeing tracking |
| Settings | 834 | `/settings/preferences` | ✅ localStorage-only preferences (theme, mode) |
| BookPreview | 770 | `/book/preview` | ⚠ Static demo — book publishing wired elsewhere |
| BundleInstall | 735 | `/bundles/install` | ⚠ Local state — bundle install flow not wired |
| SigilStudio | 639 | `/sigil` | 🗑 Superseded by SigilGeneratorRoute (LIVE) |
| Scheduler | 619 | `/scheduler` | ⚠ Local state — should call /api/v1/schedule |
| Account | 602 | `/account` | 🗑 Superseded by AccountSettingsRoute (LIVE) |
| Permissions | 577 | `/permissions` | ⚠ Local state — hub permissions surface |
| Workshop | 571 | `/workshop` | ⚠ Workshop hub; sub-routes are LIVE |
| Federation | 570 | `/federation` | ⚠ Local state — federation status not fetched |
| Analytics (legacy) | 569 | `/analytics/legacy` | 🗑 Superseded by AnalyticsDashboardRoute (LIVE) |
| Oracle | 564 | `/oracle` | ⚠ Local state — divination hub, sub-routes are LIVE |
| Divination | 517 | `/divination` | ⚠ Divination hub — nav destination lands here |
| Bundles | 501 | `/bundles` | 🗑 Superseded by BundleLibrary route (LIVE) |
| NewsletterComposer | 496 | `/newsletter/compose` | ⚠ Superseded by NewsletterEditorRoute (LIVE) |
| Agents | 477 | `/agents` | 🗑 Superseded by AgentsHomeRoute (LIVE) |
| Membership | 446 | `/membership` | ⚠ Local state — membership admin |
| Templates | 427 | `/templates` | ⚠ Local state — template picker; no /templates endpoint |
| Sandbox | 388 | `/sandbox` | 🗑 Superseded by SandboxBrowserRoute (LIVE) |
| LineageAdmin | 319 | `/lineage` | ⚠ Local state — lineage attestation admin |
| Capture | 300 | `/capture` | ⚠ Quick-capture; should navigate to Editor on save |
| Transliterate | 255 | `/transliterate` | 🗑 Superseded by TransliterationUtilityRoute |
| Health | 210 | `/health` | ⚠ Should hit /healthz + /readyz + report status |
| PluginDetail | 114 | `/plugins/:id` | ⚠ Static — should fetch installed-plugin detail |
| WebFingerVerify | 48 | `/verify` | ⚠ Should POST to /api/v1/federation/verify |

Legend:
- 🗑 **Superseded**: an older route from an earlier design cycle. Nav no longer points at it. Should be deleted or explicitly deprecated.
- ⚠ **Not wired**: rendering local demo state where a backend call was implied by the design.
- ✅ **Legitimately static**: no backend needed by design (design system, localStorage prefs).

## Orphan routes (registered but not linked from any nav)

64 routes exist in `App.tsx` that no VaultNav item points at. Some
are legitimate deep-links (e.g. `/editor/:id` — you get here by
clicking an entry). Others are sub-pages that need explicit inbound
links from parent pages. Many are the "legacy" duplicates listed
above.

The full list is in this doc's raw sweep output; I've highlighted
only the ones that surprised me.

## What I'll fix before v1.0 (in priority order)

1. ✅ **Journal → Editor wiring** (done in b108-2cx)
2. **TOTP frontend surface** — task #207 in progress
3. **`/app/signin` proper page** — task #208
4. **Nav path typos** — 3-line fix to VaultNav
5. **Delete or deprecate the 8 SUPERSEDED routes** — they're
   confusing duplicates
6. **Health page live** — small, high-value: shows real container
   status
7. **PluginDetail live** — points at real installed plugins
8. **WebFingerVerify live** — actually verifies

Everything else I'll list explicitly in a "known gaps" doc that
ships with v1.0 so no practitioner discovers a mock surface by
surprise.

## Deferred-work markers in the codebase

Grep across all TS/TSX/PY/Astro (excluding tests + stories) for
"lands in a follow-up" / "later batch" / "TODO" / "coming soon" /
"queued for" — **125 markers across 93 files**.

The biggest concentrations:

| File | Markers | Nature |
|---|---:|---|
| `backend/theourgia/core/calendar/feed_walker.py` | 8 | Toggle-family iCal features (Hebrew, Hijri, Liber Resh) — return empty until wired |
| `frontend/admin/src/routes/HubAdminDashboard.tsx` | 4 | Phase 12 hub member/curation actions — no PATCH backend |
| `frontend/admin/src/routes/MediaDetailRoute.tsx` | 3 | "Tiptap editor handoff lands in B108-3" — actual gap; the media detail can't be edited |
| `frontend/admin/src/routes/TransliterationUtilityRoute.tsx` | 3 | Back-transliteration + Tiptap integration — surface renders forward-only |
| `backend/theourgia/core/tasks/phase05.py` | 3 | Cron / lunar cadence tasks — daily-only for now |
| `frontend/admin/src/App.tsx` | 2 | Topbar per-route follow-up wording |
| `frontend/admin/src/routes/HubNewsletterComposer.tsx` | 2 | Phase 12 curation embed + POST send |
| `frontend/admin/src/routes/NetworkBrowser.tsx` | 2 | Phase 12 blocklist subscription + kebab menu |
| `frontend/admin/src/routes/PluginDetail.tsx` | 2 | Phase 14 configure route + update-diff modal |
| `frontend/admin/src/routes/Wellbeing.tsx` | 2 | "Sacred Well Directory is a designer-named placeholder" |
| `frontend/admin/src/routes/HubMemberDashboard.tsx` | 2 | Phase 12 withdraw + sharing-settings PUT |
| `frontend/admin/src/routes/PracticeLogsRoute.tsx` | 2 | Sealed-content client-side encryption |
| `backend/theourgia/core/analytics/executor.py` | 2 | Soft timeout cap + DSL rename |
| Divination bundles (I Ching / Tarot / Geomancy) | 6 | Long-form per-line + per-house interpretation tables not seeded |
| `backend/theourgia/api/routers/v1/checkout.py` | 2 | Asset pipeline + gated content follow-up |

**By severity (my honest classification):**

- **Structural gaps** (feature is not usable without them):
  MediaDetailRoute picker (can't attach entities to media entries),
  TransliterationUtility Tiptap integration (marks staged but never
  applied), WebFingerVerify (never actually verifies), Health page
  (no live probe), PluginDetail configure/diff, HubAdminDashboard
  Phase 12 actions.
- **Content gaps** (feature works but is thin without more data):
  Divination bundles' long-form interpretation tables, Ephemeris
  toggles in iCal for Hebrew/Hijri/Liber Resh.
- **Design placeholders that need real content decisions**:
  Wellbeing "Sacred Well Directory" (designer note explicitly says
  "needs maintainer review pre-production").
- **Honest engineering markers** (small technical follow-ups; do
  not block user-facing flows): timeout caps, DSL renames, cron
  cadences.

I will not pretend any of these are done. They will each appear in
the **v1.0 known gaps** doc that ships alongside the release, with
a clear "user-visible impact" line for each.

## What I got wrong that led to this

I've been marking work "done" when the *code existed and looked
structurally correct*, not when *a practitioner could complete the
intended flow end-to-end*. That's a serious defect in how I verify
work. Going forward, "done" means:

- Real curl against real prod hits a real backend endpoint
- Route is reachable from the nav (or documented as an orphan)
- User-facing action completes without hitting demo/mock state
- Verified in a browser, not just typechecked

The Batch 35 "CLOSED" claim in the memory was factually wrong — the
Tiptap editor was built but not linked from the entry point. The
memory entry needs correcting.

---

**Author:** Claude Opus 4.7 (1M context)
**Reviewed by:** Soror Ευ. Α.
**Batch:** `b108-2cy`
