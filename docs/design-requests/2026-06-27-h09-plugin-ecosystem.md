# Design Handoff Request — H09 (Tier 7: Phase 14 Plugin Ecosystem)

**Date opened:** 2026-06-27
**Requested by:** Soror Ευ. Α. (build side)
**Status:** Open — awaiting designer pickup
**Scope rationale:** H08 (Tier 6 · Phases 12 + 13) shipped 21 surfaces across two clusters and unblocked the federation substrate end-to-end on the frontend in a single sprint. **H09 takes Theourgia from an application to a platform.** Phase 14 (Plugin Ecosystem) is where third-party magicians and bundle authors get a first-class home in the chrome — the registry, the install + capability-review flow, the sandbox-before-commit pattern, and the bundle vs. plugin distinction that separates "code that extends the platform" from "data that populates it." Anticipated scope: **17 surfaces across two clusters**, slightly under H08's footprint, and unblocking ~5-7 weeks of build-side work (the Plugin SDK + registry + reference plugins).

**Format expected:** Per-surface `.dc.html` files + `agent_data_and_components_H09.md` supplement + `agent_onboarding_H09.md` supplement, dropped into `/home/sophia/design-handoffs/theourgia/<YYYY-MM-DD>-H09/handoff_H09/`. Same folder convention as H05 / H06 / H07 / H08.

---

## How to read this document

This handoff **locks every product decision**. The designer is not asked to choose between alternatives; the designer's job is to render the locked decisions with the project's voice and visual rigor — exactly as H04–H08 filled their locked structure with `.dc.html` surfaces.

Where this document says "the surface holds X", X is required and non-negotiable. Where it says "the editorial voice fills the slot", the designer writes the prose to the project's Style Guide within the slot.

If a question genuinely remains open after this document, raise it back to the build side — **do not pick a direction yourself**.

---

## What just shipped (the context the designer inherits)

Since the H08 request was opened (2026-06-26), the build side closed:

- **H08 frontend** — all 21 surfaces (Cluster A 15 + Cluster B 6) across Phase 12 Federation + Phase 13 ActivityPub. 2073 → 2657 vitest passing.
- **H08 Storybook stories** — 21 stories matching the H08 surface set, ready for visual + a11y baseline regeneration.
- **Phase 12 backend B137** (in flight) — extended Phase 01 `Hub` with H08 columns · new `hub_role_capability` matrix table · 9-endpoint `/api/v1/hubs` router · strip-prefix-at-seam adapter for the role enum (DB stores `hub_admin`/`hub_officer`/etc.; wire renders bare `admin`/`officer`/etc.). 2331 → 2363 backend tests passing.
- **Phase 12 backend B138-B141** (queued) — private viewer credential issue · group ritual lifecycle · federation audit-log CSV export · SSO assertion scaffold.
- **Phase 12.5 (transport)** + **Phase 13 backend** explicitly deferred until a second test instance + threat model signoff.

**Test counts at H09 open:** **2657 vitest passing** · 21 H08 stories landed · **2363 backend tests passing** · **Alembic at 0056** · admin tsc clean across every H08 commit.

**Repo state to inspect before designing:**

- The Phase 01 plugin substrate at `backend/theourgia/core/plugins/` — the host-side plugin loader, manifest validator, and capability allowlist already exist (B7-B10 from Phase 01). The H09 chrome wraps the existing primitives — the build side does NOT need new substrate, only routes + surfaces.
- The H07 Subscription Tiers + H07 Subscribers surfaces — H09's Plugin Status Dashboard borrows the "primary list of small things with per-row state" chrome, but for plugins/bundles instead of subscribers.
- The H06 Voces Library Browser — H09's Registry Browser borrows the citation chrome (`‡ from registry.theourgia.com`) and the per-row install affordance.
- The H05 Tool Registry — H09's Bundle Library uses an adjacent card-grid chrome (same primitive, different content), with a clearer distinction from plugins via the icon family.
- The H02 Visibility Selector — H09's Capability Review modal uses the same "permission-grant" chrome rhythm: a list of capability lines with explicit user consent.
- The H07 Cluster C Pilgrimage Map + Media Library — the "trust ledger is matter-of-fact" rule (rule 29 from H08) carries forward: registry tiers (`Official` / `Community` / `Unverified`) render with neutral chrome, NOT red-green.

---

## Carry-forward standing rules (numbers 1-30 unchanged from H08)

These survive every sprint and override any later design instinct. See `feedback_match_design_exactly.md` for the locked enforcement. The full text of rules 1-30 is in the H08 design request (`docs/design-requests/2026-06-26-h08-federation-activitypub.md`); the load-bearing ones for H09 are:

- **Rule 2 — `--danger` reserved for Visibility → Public.** Phase 14 has its own potential red-flag moments (uninstalling a plugin with data; promoting a sandbox; granting a Tier-3 unverified plugin filesystem access). NONE of these use `--danger`. The unverified-plugin install modal is `--warn-soft` and is the most consequential moment in the phase.
- **Rule 5 — Sealed-content discipline.** Plugins NEVER see sealed content. The Plugin Capability Review modal does NOT include a capability for "read sealed entries" — that capability does not exist. If a designer is tempted to write one, they have misread the substrate.
- **Rule 7 — Citation chrome on every traditional artefact.** Bundles are the obvious case here — the Vedic correspondences bundle, the Liber 777 bundle, the Decanic bundle. EVERY bundle card MUST render the `‡` citation source.
- **Rule 8 — Ritual / committed-make moments.** Promoting a sandbox to main is one (irrevocable). Granting a plugin capability is one. The standard `--warn-soft` confirm-modal pattern applies.
- **Rule 9 — Quiet stats.** Plugin install counts, registry star counts, "1.2K developers using this" — NONE of these appear in H09 chrome. The registry surfaces NO ranking, NO popularity stat, NO recommendation. Phase 14 reuses the H08 rule 19 (no recommendation algorithm) verbatim.
- **Rule 16 — Surface ↔ route contract.** Plugin install / sandbox / promote surfaces all map 1:1 to the backend routes documented in `plan/14-plugin-ecosystem.md § 9`.
- **Rule 29 — Trust ledger is matter-of-fact.** Registry tier badges (`Official` / `Community` / `Unverified`) render with neutral chrome plus a contextual tooltip — NOT red/green, NOT a star rating, NOT a "trust score." Tier-3 (Unverified) has an at-install-time warning, but the badge ITSELF is neutral.

## New cross-cutting rules earned in H09

These are the plugin-ecosystem-specific rules. They are NON-NEGOTIABLE.

31. **Capability review is permission-grant chrome, not consent-theatre.** Every install + every update surfaces EVERY capability the plugin will exercise, in plain English, with the wire key shown next to it. Newly-requested capabilities on an update are highlighted with `--warn-soft` chrome. There is NO "Grant all" shortcut button; the user must scroll through the list and tap Install.

32. **Plugin code is NEVER auto-updated.** Updates require explicit user action — there is no "auto-update plugins" toggle anywhere in the chrome. Vulnerability advisories surface a `--warn-soft` banner with an explicit "Update now" CTA; the user can opt to leave the plugin uninstalled until they review the diff.

33. **Tier-3 (Unverified) install is a deliberate moment.** The install modal for an unverified plugin uses `--warn-soft` chrome (NEVER `--danger`) with a verbatim disclosure: *"This plugin is unverified. The author has not been reviewed by Theourgia maintainers. Install only if you trust the author."* Tier-3 install requires an explicit acknowledgement checkbox before the Install CTA enables.

34. **Bundle preview is data-only.** Bundle preview NEVER runs plugin code — even if the bundle ships a plugin. The bundle preview modal renders the data shape (e.g., "23 correspondences across 4 categories" with sample rows), with a separate **"Install the plugin too?"** sub-section ONLY if the bundle ships one, and the plugin then goes through its own capability review.

35. **Sandbox promotion is irrevocable** (Phase 14 §11). The sandbox-promote modal carries verbatim: *"Once promoted, the bundle's data merges into your main vault and cannot be cleanly removed. Sandbox contents already referenced by main vault entries will remain after sandbox discard."* `--warn-soft` chrome, single-tap confirm.

36. **Sandbox content NEVER federates.** The Sandbox Browser carries the verbatim disclosure: *"Sandbox content is local to this device. It never federates, never appears in network feeds, never reaches the Fediverse — even if you've enabled federation."* The disclosure is rendered persistently in the topbar of the sandbox surface, not buried in a tooltip.

37. **Plugin author profile is a citation, not a star rating.** The registry author page shows: author DID, declared license, plugin count, first-published date, recent activity (last update). It does NOT show: follower count, star count, "rating," "downloads this week," or any social-media-shaped metric.

38. **No "feature this plugin" / "trending plugins" in the Registry Browser.** Sort options are alpha + recent-update + recently-added — NEVER popularity. The same chrome rule as H06 / H08.

39. **Plugin status dashboard is honest about errors.** When a plugin crashes during a load, the dashboard renders the FULL exception trace (collapsed by default) — not a polished "this plugin had a problem" euphemism. The dashboard is for the practitioner-as-debugger.

40. **Withdraw and tombstone are different states.** A "withdrawn" plugin (author no longer maintains it) renders with the `‡ tombstoned by author` chip and an `--ink-mute` border on its card. Existing installs keep working; new install attempts surface a `--warn-soft` banner with the verbatim deprecation reason. **DELETED is not a state** — plugins withdraw, they don't disappear.

---

## Backend status going in

**Phase 14 backend substrate exists; routes do not.**

`plan/14-plugin-ecosystem.md § 9` enumerates the 8 endpoints H09 surfaces will exercise. The designer is not bound to the plan's exact column list. If a `.dc.html` requires a field the plan did not anticipate, the build side adds it during implementation. Conversely, if the designer's `.dc.html` does not use a field the plan anticipated, the build side drops it.

The architectural choices already locked at backend level:

- **Plugin substrate from Phase 01 (B7-B10)** — host-side loader, manifest validator (TOML per `plan/14-plugin-ecosystem.md § 2`), capability allowlist + per-call check, lifecycle hooks. The designer can assume the substrate exists; H09 wraps it.
- **Registry transport is HTTPS-only.** The designer renders no "fetching from registry…" chrome — the transport is fast (<500ms typical). When it's slow, the standard skeleton loader pattern applies.
- **Manifest schema is locked.** See `plan/14-plugin-ecosystem.md § 2`. The Plugin Detail surface renders fields from this schema verbatim.
- **18 extension points** are formally defined (per § 3). The Plugin Detail surface lists which extension points the plugin USES; the dashboard renders which extension points are ACTIVE in the running instance.
- **Three-tier trust** — `Official` / `Community` / `Unverified`. Surfaces render the badge but the underlying tier-assignment logic is backend.
- **Sandbox model** — a sandbox row carries a UUID + label + plugin/bundle reference + created_at + expires_at (30-day default per § 11). The build side enforces the auto-expiry.
- **Capability scope is enum-bounded.** No free-form capability strings; the wire keys are `read.entries` / `write.entries` / `read.entities` / `ui.editor.add-block` / `ui.divination.add-system` / `db.migrations` / `network.outbound` / `filesystem` (plus the extension-specific ones). The surface renders the wire key in `--font-mono` next to the plain-English label.

---

## What needs design — the 17 surfaces in two clusters

### Cluster A · Plugin ecosystem (9 surfaces)

### 1. `Installed Plugins.dc.html` (full route — `/plugins`)

The home surface of the H09 sprint. Lists every plugin the user has installed.

- Topbar: `"Plugins"` h1 + `"Code that extends Theourgia"` subhead.
- Right of topbar: `[Browse registry]` CTA in `--accent` chrome.
- Per-row card:
  - Plugin icon (16px sprite; H09 introduces a tiny plugin-kind icon family — `divination` / `calendar` / `cipher` / `correspondence` / `editor-block` / `widget` / `exporter` / `importer` / `notification` / `auth` / `storage` / `email` / `federation-event` / `ap-object`. Match by `kind` field in manifest.)
  - Plugin name + version (`v1.2.0` in `--font-mono` `--ink-mute`)
  - Author DID in `--font-mono` `--ink-mute`
  - Short description (one line, truncated)
  - Status chip: `active` (`--peer-ok-soft`) · `disabled` (`--ink-mute` border) · `error` (`--warn-soft`)
  - Per-row kebab: Configure · Deactivate · Update · Uninstall · View capabilities
- Empty state: `"No plugins installed."` + `"Browse the registry to extend Theourgia"` + Browse-registry CTA.
- The list is chronological by `installed_at` descending — no popularity sort.

### 2. `Plugin Detail.dc.html` (full route — `/plugins/:id`)

Detail page for one installed plugin.

- Topbar: breadcrumb `Plugins / {name}` + version + status chip + kebab.
- Body (single column, ~640px):
  - **Manifest summary** — author DID (`--font-mono`) · license SPDX (`--ink-mute`) · homepage link · declared Theourgia version compatibility.
  - **Description** — markdown rendering of the plugin's `description` field.
  - **Capabilities granted** — list of every capability the plugin holds, with the wire key in `--font-mono` next to the plain-English label.
  - **Extension points used** — list of which of the 18 extension points this plugin has registered, with a count if multiple (e.g., "Editor blocks (3): ‘rune-tabular’ · ‘bind-rune’ · ‘futhark-line’").
  - **Migration history** — list of every alembic migration the plugin has applied to the user's DB, with the migration id + date.
  - **Storage footprint** — disk-size summary (`--ink-mute`); never a "you're using X% of your storage" panic chrome.
- Footer: `[Configure]` (if the plugin declares config) · `[Update]` (if registry has newer) · `[Deactivate]` · `[Uninstall]`. Uninstall is `--warn-soft` (consequential edit, not danger).

### 3. `Plugin Capability Review.dc.html` (modal — surfaced on install AND update)

Permission-grant chrome. THE central surface of the phase.

- Title: `"{Plugin name} is requesting:"`
- Below title: author DID in `--font-mono`.
- Body: vertical list of every capability the plugin will exercise. For each:
  - Plain-English label (e.g., "Read all your journal entries")
  - Wire key in `--font-mono` (`read.entries`)
  - One-line consequence: "The plugin can read every entry, but cannot modify or delete them."
  - On an UPDATE: capabilities NEW since the last version are highlighted with `--warn-soft` chrome.
- For a Tier-3 (Unverified) plugin: a `--warn-soft` callout above the capability list with verbatim copy from rule 33.
- For an update: a "Newly-requested capabilities" sub-section appears first, separated from "Already-granted capabilities."
- Footer: `[Cancel]` ghost · `[Install]` / `[Update]` in `--accent`. The `[Install]` button is DISABLED until the user has scrolled the capability list to the bottom (engagement-gate; not a checkbox — the gesture proves intent).
- Tier-3 only: explicit acknowledgement checkbox `"I understand this plugin is unverified."` gates the Install CTA.

### 4. `Plugin Configuration.dc.html` (full route — `/plugins/:id/configure`)

Renders the per-plugin configuration form based on the plugin's declared config schema.

- Topbar: `Plugins / {name} / Configure` breadcrumb.
- Body: form fields rendered from the JSON schema the plugin declared in its manifest. The schema kinds the surface MUST support:
  - `string` (text input · multi-line variant)
  - `integer` / `number` (numeric input with optional min/max)
  - `boolean` (toggle switch)
  - `enum` (radio group)
  - `secret` (password input; never displays the existing value — shows `"••••••••"` with a `[Reset]` link)
  - `url` (text input with validation hint)
- Each field renders its `description` field as helper text below the input.
- Footer: `[Discard changes]` ghost · `[Save]` in `--accent`. Save runs validation against the plugin's schema before persisting.

### 5. `Plugin Status Dashboard.dc.html` (full route — `/plugins/status`)

Admin-facing dashboard showing the running plugin state.

- Topbar: `"Plugin status"` + `"Active plugins · errors · performance"` subhead.
- Three sections:
  - **Active** — table of currently-running plugins with: name · version · load-time-ms · extension points active count. Sort: alphabetical default.
  - **Errors** — list of plugin load failures or runtime exceptions. Each row expands to reveal the FULL exception trace (`--font-mono` in a `<pre>`, NOT a polished euphemism). Per rule 39.
  - **Performance** — quiet stats: total plugin load time, total memory footprint (rough). NO percentile charts, NO leaderboards.
- No real-time refresh — the surface reloads on focus, not via push.

### 6. `Vulnerability Advisory Banner.dc.html` (banner — appears on `/plugins` and `/plugins/:id`)

When a plugin has a published advisory.

- Banner chrome: `--warn-soft` background · `--warn-border` border · warn icon.
- Body: `"{Plugin name} has a published vulnerability advisory."` + advisory severity (low/medium/high) + advisory date.
- Per-advisory expandable detail: the full advisory text + the recommended remediation (`Update to v{X}`).
- Affordances: `[Update now]` (`--accent`) · `[View advisory]` (link out) · `[Dismiss]` (ghost — dismisses for this session only, NEVER permanently).
- Tier-3 plugin advisories use the SAME chrome — vulnerability disclosure is the same regardless of trust tier.

### 7. `Registry Browser.dc.html` (full route — `/plugins/registry`)

Browse the community registry.

- Topbar: `"Plugin registry"` h1 + `"Three tiers of trust"` subhead.
- Below topbar: tier filter chips (`All` default · `Official` · `Community` · `Unverified`) + tradition filter (multi-select chip group) + sort (alpha default · recent-update · recently-added — NEVER popularity).
- Card grid (responsive 2-3 col):
  - Plugin icon (kind-sprite)
  - Name + version
  - Tier badge — `Official` (`--peer-ok-soft`) · `Community` (`--network-soft`) · `Unverified` (`--ink-mute` border, neutral background)
  - Author DID
  - Description (2-line truncate)
  - `[View]` CTA
- Empty state for filter no-matches: `"No plugins match your filter."` + `"Try widening the tier or tradition selection"`.
- No "Featured" section. No "Trending." No "1.2K developers using this."

### 8. `Registry Plugin Detail.dc.html` (route — `/plugins/registry/:id`)

The pre-install detail page.

- Topbar: breadcrumb `Registry / {name}` + tier badge + `[Install]` CTA in `--accent`.
- Body:
  - **Header**: name + version + author DID (`--font-mono`) + license SPDX + homepage link.
  - **Description** — full markdown.
  - **Capabilities the plugin will request** — same list as the Capability Review modal, but read-only (no Install gate yet).
  - **Extension points the plugin uses** — same as Plugin Detail surface 2.
  - **Version history** — last 5 releases with date + release-notes excerpt; no download counts.
  - **Author profile link** — `[View author profile]`.
- Tier-3 plugins: persistent `--warn-soft` banner at the top with rule 33's verbatim disclosure.
- Tombstoned plugins: persistent `--warn-soft` banner with the verbatim withdrawal reason + `‡ tombstoned by author` chip.

### 9. `Plugin Author Profile.dc.html` (route — `/plugins/authors/:did`)

The author's registry page.

- Topbar: author DID (`--font-mono`) + breadcrumb.
- Body:
  - **About** — declared name + bio + URL.
  - **License preferences** — the license(s) this author publishes under.
  - **First published** — date.
  - **Last activity** — date (most recent plugin update).
  - **Plugins** — card grid of every plugin this author maintains.
- NO follower count. NO star rating. NO "downloads this month." Per rule 37.

### Cluster B · Bundles + Sandbox (8 surfaces)

### 10. `Bundle Library.dc.html` (full route — `/bundles`)

Lists installed bundles (data-only extensions).

- Topbar: `"Bundles"` h1 + `"Data that fills Theourgia"` subhead + `[Browse registry]`.
- Per-bundle card:
  - Bundle "scroll" icon (visually distinct from plugin "code" icon — the H09 supplement names the divergence).
  - Bundle name + version
  - Author DID + `‡` citation badge (the bundle's origin — e.g., `‡ Liber 777` for the Crowley correspondence bundle)
  - Short description
  - **Data summary** — e.g., "23 correspondences across 4 categories" or "147 ritual templates."
  - Per-bundle kebab: Preview · Update · Remove
- Bundles don't have an "active" state — they're either installed or not.

### 11. `Bundle Detail.dc.html` (full route — `/bundles/:id`)

Detail page for one installed bundle.

- Topbar: breadcrumb `Bundles / {name}` + `[Update]` (if newer in registry).
- Body:
  - **About** — author DID · license SPDX · `‡` citation source (where this content came from) · install date.
  - **Data shape** — table of: entity_kind · count · sample. E.g., "Correspondences" → 23 → "Saturn ↔ lead · Saturn ↔ Saturday · Saturn ↔ Cybele …".
  - **References from your vault** — count of entries / entities that reference content from this bundle. (Important for rule 35 — the user sees what they'd lose visibility of on removal.)
- Footer: `[Remove]` ghost (consequential — rule 35 verbatim warning if any references exist).

### 12. `Bundle Install Preview.dc.html` (modal — surfaced from Registry → Bundle "Preview" action)

THE bundle install moment. Data preview, NO code execution (rule 34).

- Title: `"Preview: {bundle name}"`
- Body:
  - **What this bundle adds** — table of data shapes the bundle will create (entity kinds + counts).
  - **Sample rows** — first 5 entries of the largest data shape, rendered in their normal chrome (e.g., entity cards for a beings bundle).
  - **License** — SPDX + plain-English summary.
  - **Plugin sub-section** (only when bundle ships a plugin) — separated by a `--line-2` border, with `[Review plugin capabilities]` CTA that opens surface 3.
- Footer: `[Cancel]` ghost · `[Install into sandbox]` (`--accent`) · `[Install directly]` (`--warn-soft` — bypasses sandbox, irrevocable per rule 35).

### 13. `Sandbox Browser.dc.html` (full route — `/sandbox`)

Lists active sandboxes.

- Topbar: `"Sandbox"` h1 + persistent verbatim disclosure (rule 36) in the topbar `--ink-soft` text: *"Sandbox content is local to this device. It never federates, never appears in network feeds, never reaches the Fediverse — even if you've enabled federation."*
- Below: list of active sandboxes. Each row:
  - Sandbox label (user-set; default `"{Bundle name} preview"`).
  - Origin chip: bundle name + version.
  - Created at + expires at (e.g., "Expires in 23 days" `--ink-mute`).
  - Per-row affordances: `[Open]` · `[Promote to main]` (`--warn-soft`) · `[Preserve]` (extends expiry) · `[Discard]`.
- Empty state: `"No active sandboxes."` + `"Install a bundle into a sandbox to preview it without affecting your main vault"`.

### 14. `Sandbox Detail.dc.html` (full route — `/sandbox/:id`)

Open a sandbox.

- Topbar: breadcrumb `Sandbox / {label}` + persistent rule-36 disclosure + `[Promote to main]` + `[Discard]`.
- Body: the sandbox contents rendered with the normal Theourgia chrome — but every card has a `--remote` border + a small `‡ in sandbox` chip in the upper-right corner. The chip makes it visually impossible to confuse sandbox content with main-vault content.
- A practitioner can BROWSE every interaction the bundle would normally provide (clicking entity cards, opening rituals, etc.), but write actions go into the sandbox's isolated state — never the main vault.
- An `--accent-soft` callout at the bottom: `"This sandbox expires {date}. Promote to main vault or preserve before then."`

### 15. `Sandbox Promote.dc.html` (modal — surfaced from Sandbox Detail "Promote to main")

Sandbox promotion is irrevocable (rule 35).

- Title: `"Promote sandbox to main vault?"`
- Body:
  - Verbatim copy from rule 35: *"Once promoted, the bundle's data merges into your main vault and cannot be cleanly removed. Sandbox contents already referenced by main vault entries will remain after sandbox discard."*
  - Summary of what will merge: counts of each data shape.
  - List of any main-vault references the sandbox already accumulated (e.g., "3 entries in your main vault reference content from this sandbox").
- Footer: `[Not yet]` ghost · `[Promote]` (`--warn-soft`, NEVER `--danger`).
- Esc + scrim → cancel.

### 16. `Bundle Discard.dc.html` (modal — surfaced from Sandbox Discard)

Quick confirm — but explicit about main-vault references.

- Title: `"Discard sandbox?"`
- Body: count of sandbox-local rows that will be deleted + count of main-vault references that survive (rule 35 carry-forward).
- Footer: `[Not yet]` ghost · `[Discard]` (`--warn-soft`).

### 17. `Plugin Update Diff Preview.dc.html` (modal — surfaced from Plugin / Vulnerability Update CTAs)

Update diff preview before applying (Phase 14 § 10).

- Title: `"Update {plugin name} v{old} → v{new}"`
- Body:
  - **Changelog** — markdown render of the release notes.
  - **New capabilities** — list of capabilities requested in the new version that the old version did NOT have. `--warn-soft` chrome on each row.
  - **Removed capabilities** — list of capabilities the new version no longer needs. `--peer-ok-soft` chrome (this is good — surface area reduction).
  - **Migration steps** — list of alembic migrations the new version will apply to the user's DB.
- Footer: `[Cancel]` ghost · `[Apply update]` (`--accent` if no new capabilities; `--warn-soft` if new capabilities exist).
- Tapping `[Apply update]` when there are new capabilities re-opens the Capability Review modal (surface 3) gated on the new capabilities only.

---

## Token additions expected (`agent_data_and_components_H09.md`)

The H08 token block already covers most of what H09 needs. Anticipated NEW tokens:

- `--plugin-active` / `--plugin-active-soft` — for the "active" plugin chip; can be aliased to `--peer-ok` if the designer prefers.
- `--plugin-error` / `--plugin-error-soft` — for the error chip on the dashboard; `--warn` family rhyme.
- `--plugin-disabled-line` — neutral grey for the deactivated plugin card border.
- `--sandbox-frame` — the `--remote`-adjacent border for sandbox-content cards.
- `--tombstone-soft` — `--ink-mute` family for tombstoned-plugin badge background.

The designer may opt to alias all of the above to existing tokens; the supplement names the alias.

---

## Component additions expected

- **`PluginKindIcon`** — sprite family for the 14 plugin kinds. Add as `<symbol>`s in `tokens/theourgia-icons.svg`.
- **`BundleScrollIcon`** — single sprite (visually distinguished from plugin code icon).
- **`CapabilityRow`** — repeated row across surfaces 2, 3, 8, 17. Renders: label + `--font-mono` wire key + one-line consequence.
- **`TierBadge`** — three-state badge for `Official` / `Community` / `Unverified`. Neutral chrome (rule 29).
- **`SandboxFrame`** — wrapper that adds the `--sandbox-frame` border + `‡ in sandbox` chip.
- **`AuthorDidChip`** — `--font-mono` `--ink-mute` chip for author DIDs across surfaces 1, 2, 7, 8, 9, 10.
- **`ScrollGate`** — primitive that disables an Install CTA until the parent capability list has been scrolled to the bottom (rule 31's engagement-gate). Re-used between surfaces 3 + 17.

---

## Per-component ritual reminder

Every `.dc.html`:

1. **Section inventory** — list every section the design carries; cross-check against this document.
2. **CSS var cross-check** — every value sourced from `theourgia.tokens.css` (the H08 set, plus H09 additions named in the supplement).
3. **Verbatim editorial copy** — every user-facing string in this document that says "verbatim" appears character-for-character. The strict ones for H09: rule 33 (Tier-3 disclosure), rule 35 (sandbox-promote warning), rule 36 (sandbox topbar disclosure).
4. **Default state** — what the surface shows on first open (empty, populated, mid-flow).
5. **Variant completeness** — every state mentioned (`active` / `disabled` / `error` for plugins; `Official` / `Community` / `Unverified` for registry; the sandbox lifecycle states).
6. **`--danger` audit** — zero uses across the entire H09 sprint. Uninstall / Discard / Tier-3 install / Sandbox promote / new-capability update — ALL `--warn-soft`. The Visibility-becoming-Public rung from H02 is unaffected.

---

## Out of scope for H09 (explicit deferrals)

- **Plugin SDK reference docs** (the `theourgia-plugin-sdk` Python + TypeScript packages) — they ship as build-side artefacts alongside the H09 surfaces, but the SDK docs themselves live in `docs/developer/plugin-sdk/`, not in any user-facing surface.
- **Bundle authoring UI** — Phase 15 hardening. H09 is install-and-consume only; authoring a bundle uses the SDK CLI.
- **Cross-plugin dependency resolution UI** — Phase 14.5. H09 surfaces an error if a plugin's dependency is missing, but does NOT auto-install dependencies.
- **Plugin-to-plugin communication** — not in the substrate yet. The surfaces never imply two plugins can call each other.
- **Per-plugin telemetry / usage analytics** — never. Per memory: zero telemetry.
- **AI-assisted plugin generation** — Phase 16 (AI Agent Integration).

---

## What the designer can leave for follow-up

The H09 design package is genuinely complete for the build side to land Phase 14 frontend + the substrate routes. Open follow-ups the designer may choose to defer to H10:

- The `PluginKindIcon` sprite family (14 sprites) can ship with just a "tag-with-text" fallback for icons not yet drawn — the build side handles the placeholder chrome.
- Per-extension-point detail pages (e.g., "Editor blocks added by this plugin") — H09 surface 2 lists them; a deeper drill-in is optional.
- The author profile page (surface 9) is intentionally minimal; richer author chrome (verified-author badge, signed-key chip) is Phase 14.5.

---

## Test counts going in

- **2657 vitest passing** (H08 frontend complete; H08 stories landed; 21 H08 storybook entries available for visual + a11y baseline regeneration this sprint).
- **2363 backend passing** (B137 model + router shipped; B138-B141 + Phase 13 backend queued).
- **Alembic at 0056.**

---

## When this document is "done"

The H09 design package is ready to merge when:

- 17 `.dc.html` files cover every surface above.
- `agent_data_and_components_H09.md` names every new token + component + sprite.
- `agent_onboarding_H09.md` references the carry-forward rules 1-30 verbatim and the new H09-only rules 31-40 verbatim.
- The folder lands at `/home/sophia/design-handoffs/theourgia/<YYYY-MM-DD>-H09/handoff_H09/`.
- A short cover note (3-5 lines) in the folder root acknowledges the locked structure was respected.

---

## Maintainer override

If the designer encounters a constraint that genuinely cannot be respected — e.g., a verbatim copy that doesn't fit a surface's space, or a rule that conflicts with another — flag it back to the build side BEFORE shipping. The locked structure is non-negotiable, but exceptions exist; surface them rather than silently break them.

The trust is mutual. The rules earned in prior sprints are load-bearing. The chrome is the contract.

— Soror Ευ. Α.
