# Changelog

All notable changes to Theourgia will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — 2026-06-27 (Phase 15 hardening backend + federation outbound + reaper · `be6b3db` → `3a20dc4`)

H10 Cluster B backend prerequisites land ahead of the designer's surface package.

- **b108-2ab `be6b3db`** — Phase 15 hardening backend. Three new routers: `user_audit.py` (GET /me/audit + .csv export · per-user filterable audit log), `user_account.py` (GET /me · POST /me/data-export · POST /me/account/delete · POST /me/account/reactivate). Account deletion uses a NEW column `user.scheduled_for_deletion_at` (alembic 0063 · indexed) with a HARDCODED 30-day grace period (rule 46). Data export runs the existing GDPRService inline + returns the JSON archive; async-with-email pipeline (rule 45) is a v1.1 enhancement on the same endpoint shape. Every state change emits a SECURITY-kind audit event.
- **b108-2ac `3471304`** — Per-device session lifecycle (H10 Cluster B6). `user_sessions.py` with GET /me/sessions + DELETE /me/sessions/:id + POST /me/sessions/revoke-others. Rule 48 verified: `SessionRead` carries device-friendly fields only — NO `token_hash`, NO raw `user_agent`. Device labels derived server-side ("Laptop · Firefox" / "Phone · Chrome" / etc.) from the User-Agent + mobile heuristic. `is_current` flagged by hashing the incoming bearer token + comparing against the stored hash.
- **b108-2ad `3a20dc4`** — Federation outbound primitive + reaper script. `core/federation/outbound.py` is the lowest-level signed-POST attempt (composes RFC 9421 signer + httpx AsyncClient · canonical-JSON body so the verifier never rejects on digest mismatch · NEVER raises on transport failure — returns `DeliveryResult` · no-op when transport is disabled · rejects non-HTTPS URLs). `scripts/reaper.py` is operator-runnable cleanup for federation nonces (past `expires_at`) + scheduled-for-deletion users (LOGS candidates for v1 until the integration test exercises the destructive path end-to-end).

**2464 → 2490 backend pass · alembic head 0063 · 26 new tests.**

### Added — 2026-06-27 (Admin API-wiring sweep · 14 surfaces live · `9b20fc0` → `fb34338`)

Continued the admin sweep through 8 more surfaces past the worked example. Each commit adds a new resource library; the established convention (TanStack Query + skeleton + `--warn-soft` error banner + per-resource lib hook file) holds across all 14:

- **b108-2v `a4732b5`** — PrivateViewers · introduces one-time plaintext-credential reveal pattern (transient component state · `--peer-ok-soft` banner with monospace code block · never persisted).
- **b108-2w `fefc405`** — HubDiscovery + MyNetworks · `lib/hubs.ts`. Discovery filters non-private membership policies; MyNetworks shows the hubs the user can see (invitations pane queued with transport).
- **b108-2x `c8213ed`** — RolesPermissionsEditor · capability-matrix GET/PATCH. Bidirectional mapping between bare role keys and Set<HubCapabilityKey>; defensive filter on incoming capability strings.
- **b108-2y `4e59f85`** — GroupRitualScheduler · POST /group-rituals. `lib/groupRituals.ts` covers the whole ritual lifecycle. Both onSaveDraft + onScheduleInvite funnel through the same create mutation.
- **b108-2z `08a9208`** — GroupRitualCoordination + PostMortem · GET ritual + GET/POST fragments + GET/POST reflections. Backend RitualStatus → surface vocabulary mapping is defensive.
- **b108-2aa `fb34338`** — HubPublicFace · slug-filtered hub lookup. Featured-items pane queued.

Sweep paused at 14 routes. Remaining ~6 routes (HubAdminDashboard · HubMemberDashboard · HubNewsletterComposer · NetworkBrowser · WebFingerVerify · PluginDetail · RegistryPluginDetail) are blocked on backend endpoints that don't exist yet — hub curation queue, federation peer list, hub-level newsletter sender, single-plugin GET (manifest schema not exposed), cross-instance WebFinger proxy, the entire plugins.theourgia.com host.

### Added — 2026-06-27 (Admin API-wiring sweep · 6 surfaces live · `9b20fc0` → `c108e1d`)

Six admin routes wired to live backend endpoints under the chosen convention (TanStack Query · skeleton loaders · inline `--warn-soft` error banners with retry CTAs · per-resource lib hooks). Each commit introduces a new pattern on top of the established convention:

- **b108-2q `9b20fc0`** — `InstalledPlugins` is THE worked example. Lib scaffolding (`api.ts` · `queryClient.ts` · `SurfaceError.tsx` · `SurfaceSkeleton.tsx` · `plugins.ts`). `QueryClientProvider` mounted at the top of the App provider tree. Simple list + per-row mutation pattern.
- **b108-2r `026ffb2`** — `SandboxBrowser` + `PluginConfiguration`. Derived display fields from ISO timestamps · mutation-only surfaces (configure has no list of its own).
- **b108-2s `2b7c51f`** — `FederationAuditLog`. Time-range refetch + client-side filter + CSV export via browser navigation. Action vocabulary mapped `federation.*` → surface `FalEventKey`.
- **b108-2t `725cfda`** — `ActivityPubSettings`. GET/PATCH pattern with bidirectional camelCase ↔ snake_case mapping (`toDraft` / `fromDraft`). Discard refetches from server (re-seeds the draft).
- **b108-2u `c108e1d`** — `Followers`. Dual-query pattern (followers + pending requests) with shared error/loading state. Approve / decline mutations invalidate both caches.

Conventions established that the remaining sweep will follow: `lib/<resource>.ts` per resource (one file per backend router · `use*` query hooks + `use*` mutation hooks · invalidate-on-success) · `SurfaceSkeleton rowCount={N}` while `isLoading` · `SurfaceError` for fetch errors with retry · second `SurfaceError` rendered above the surface for mutation errors (dismiss-only). Admin tsc clean across every commit.

### Added — 2026-06-27 (Federation transport scaffold · b108-2p · `0d58da6`)

Cross-instance federation substrate landed behind a feature gate. RFC 9421 HTTP Signatures + Ed25519 keys + capability tokens already shipped in earlier batches; this adds the missing infrastructure: **Postgres-backed replay-nonce store** (`federation_nonce` table · alembic 0062 · `record_nonce()` / `purge_expired()` / `ReplayDetectedError` · 5-minute window per RFC 9421 guidance · unique-constraint-as-detection-mechanism) · **WebFinger endpoint** at `.well-known/webfinger` (RFC 7033 actor discovery · only `acct:` resources · defence-in-depth 404 when host doesn't match · 404 when transport disabled) · **`FEDERATION_TRANSPORT_ENABLED` feature gate** (env-controlled · default FALSE · cross-instance federation OFF until external review signs off) · **threat model doc** at `docs/architecture/federation-transport-threat-model.md` (T1-T10 + pre-enablement checklist + open questions for reviewer). 10 new schema-level tests · 2464 backend pass · alembic head 0062. Outbound POST scheduler + inbox + per-peer pubkey cache queued for the next batch (queue-worker design choice pending).

### Added — 2026-06-27 (H10 design handoff opened · `b45aae8`)

Closes the design queue. 884-line handoff covering 27 surfaces across three clusters: **Cluster A** registry author/reviewer/public on `plugins.theourgia.com` (8 surfaces) · **Cluster B** hardening (7 surfaces) · **Cluster C** AI agent integration (12 surfaces · honesty-densest). **20 new cross-cutting honesty rules (41-60)** — Registry (41-44): never auto-promoted · SPDX-validated · severity neutral chrome · diff mandatory. Hardening (45-49): export async-emailed · 30-day grace · memorial-mode opt-in at creation · per-device revocation · UUIDs hidden in audit log. Agents (50-60): OFF by default · NEVER speaks first · closed-tradition invisible · sealed unreachable · "surface" not "interpret" · human-readable activity · HARD cost caps · BYO keys always · per-agent usage breakdown · memory is human-editable · agent-free is first-class forever. Sized to be the final design package before v1.0; designer turnaround estimate 2-3 weeks.

### Added — 2026-06-27 (Plugin + sandbox audit-event emission · b108-2o · `294bd7d`)

Every state-changing endpoint in the Phase 14 routers now emits an `AuditEvent` row. The substrate's `AuditLogger` + the existing `AuditEventKind.PLUGIN` (whose docstring already named plugin install / uninstall / activate / deactivate / config change as its remit) are reused; sandbox lifecycle differentiates through the action string (`sandbox.import` · `sandbox.promote` · `sandbox.discard`). Configure intentionally audits only the keys touched — the H09 "secret" field kind may carry credentials, and the audit log is a defence-in-depth artefact, not a debug trace. Failed state transitions now commit a `FAILURE` audit event before raising the 409, so forensic review surfaces denied install attempts the same way denied federation actions already do. **2454 backend pass · alembic 0061.**

### Added — 2026-06-27 (Phase 14 backend lifecycle routes · b108-2n · `0e06f35`)

The Phase 14 frontend (H09) consumes a lifecycle API; this commit wires it. Nine endpoints land — seven plugin lifecycle (`GET /plugins/installed` · `POST /plugins/install` · `POST /plugins/{id}/activate` · `POST /plugins/{id}/deactivate` · `DELETE /plugins/{id}` · `GET /plugins/registry/search` (stable empty contract until the registry is hosted — deliverable 10) · `POST /plugins/{id}/configure`) and four sandbox lifecycle (`GET /sandbox` · `POST /sandbox/import` · `POST /sandbox/{id}/promote` (irrevocable) · `DELETE /sandbox/{id}` (discard)). The substrate from Phase 01 B7-B10 (`plugin_install` · `plugin_capability_grant` · `plugin_setting` · the manifest / capability / loader / state machine in `core/plugins/`) is the foundation — only the sandbox table is net-new (migration `0061_phase14_sandbox.py`). The capability-review surface (H09 worked example) POSTs the install body once the magician has scrolled through every capability; the router parses each capability string through the `Capability` vocabulary (rejects unknown ones with a clear 400) and writes one `plugin_capability_grant` row per declared capability. State transitions go through `allowed_transition()` — invalid moves return 409 with the offending states named. Configure stores arbitrary JSON-ish settings per key; a non-dict primitive value is wrapped in `{"value": ...}` so the JSONB column contract is stable. Sandbox content lives inside its own isolation envelope (`owner_id` + `vault_id`) so that H09 invariants land in the database — sandbox content never federates, never appears in main searches, never affects main vault content. Auto-expires in 30 days unless promoted (irrevocable) or discarded. **13 new schema-only tests · 2454 backend pass · alembic head 0061.**

### Added — 2026-06-27 (H09 Storybook stories · 17/17 · `26b9edc`)

One story per H09 surface, mirroring the H08 story pattern shipped at `0b520aa`. Stories cover the default state plus the variants that exercise the worked-example logic — Install / Update / Tier3 capability review; NoNewCaps / WithNewCaps update-diff; NoReferences bundle-discard; Tombstoned registry detail; severity tiers (high / medium / low / collapsed) on the vulnerability banner. **2677 shared vitest pass · admin tsc clean.**

### Added — 2026-06-27 (H09 sprint COMPLETE · Phase 14 Plugin Ecosystem frontend · 17/17)

The H09 frontend sprint closed the same day the designer returned the package. All 17 surfaces against the H09 bundle at `/home/sophia/design-handoffs/theourgia/2026-06-27-H09/handoff_H09/` shipped — nine Cluster A (Plugin ecosystem) + eight Cluster B (Bundles + Sandbox). Phase 14 frontend is end-to-end against the design corpus. Backend (Phase 14 routes — substrate from Phase 01 B7-B10 already exists) queued.

**Foundation — `7b3332e`**:

- Five H09 token aliases (all aliases of existing families per rule 1 — no new hues):
  - `--plugin-active` / `-soft` → `--peer-ok` family
  - `--plugin-error` / `-soft` → `--warn` family
  - `--plugin-disabled-line` → `--line-2`
  - `--sandbox-frame` / `-soft` → `--remote` family ("from elsewhere, not yet yours")
  - `--tombstone-soft` → `--bg-3`
- VaultNav extension: new `Platform` section appended after `Network`. Three keys — `plugins` · `bundles` · `sandbox`. Three new SVG icons (puzzle/socket · single scroll · bordered tray).

**Cluster A — Plugin ecosystem (9 surfaces · `2ad0e2e → 2af1e68`)**:

- **Installed Plugins** (`/plugins`) — Per-row PluginCard with PluginKindIcon (14-kind sprite family) · status chips in --plugin-active / --ink-mute / --plugin-error (NEVER --danger) · tombstone chip on --tombstone-soft for withdrawn plugins (rule 40 — withdraw ≠ delete; row still functional). Sort chronological by installed_at desc (rule 38).
- **Plugin Detail** (`/plugins/:id`) — Six sections (Manifest · Description · Capabilities granted · Extension points used · Migration history · Storage footprint quiet --ink-mute). Update CTA --accent-soft · Uninstall --warn-soft (NEVER --danger).
- **Plugin Capability Review modal** — **THE worked example.** Permission-grant chrome with the new **ScrollGate primitive** (rule 31): the Install CTA stays disabled until the user has scrolled the capability list to the bottom (`scrollTop + clientHeight >= scrollHeight - 6`). Footer note flips "Scroll through every capability to continue" → "Reviewed". UPDATE scenario adds "Newly-requested capabilities" in --warn-soft above "Already-granted." Tier-3 (Unverified) adds a verbatim --warn-soft callout + ack checkbox that gates Install on top of the scroll-gate.
- **Plugin Configuration** (`/plugins/:id/configure`) — JSON-schema-driven form with 7 field kinds (string · text · number · boolean · enum radio · secret · url). Secret fields NEVER show the existing value — render `••••••••••••` + [Reset].
- **Plugin Status Dashboard** (`/plugins/status`) — Three sections: Active table · Errors (expand for FULL exception trace per rule 39 · --font-mono <pre>) · Performance (two quiet tiles · NO charts NO leaderboards).
- **Vulnerability Advisory Banner** — Component-only banner that pins atop /plugins. --warn-soft chrome NEVER --danger. Severity badge: dot + label word; NEVER a red alarm. Tier-3 advisories use the SAME chrome (rule 32). Dismiss is SESSION-ONLY — verbatim disclosure: "Dismiss hides it until your next session — never permanently."
- **Registry Browser** (`/plugins/registry`) — Tier chips (All / Official / Community / Unverified) with neutral TierBadge chrome (rule 29 — no red/green/score). Sort: alpha (default) · recent-update · recently-added — NEVER popularity (rule 38). Verbatim citation framing: `‡ from registry.theourgia.com`.
- **Registry Plugin Detail** (`/plugins/registry/:id`) — Tier-3 → persistent --warn-soft banner with verbatim rule-33 disclosure. Tombstoned → persistent --warn-soft banner with verbatim withdrawal reason + `‡ tombstoned by author` chip; Install CTA flips to "Install anyway" (--warn-soft). Capabilities rendered read-only — full review at install via the Capability Review modal.
- **Plugin Author Profile** (`/plugins/authors/:did`) — Citation, not star rating (rule 37). Stat tiles: Plugins · First-published · Last-activity · License. NO follower count, NO stars, NO downloads, NO rating chrome.

**Cluster B — Bundles + Sandbox (8 surfaces · `752bf57 → ee065c9`)**:

- **Bundle Library** (`/bundles`) — Per-card BundleScrollIcon (visually divergent from puzzle/socket plugin family). `‡ {citation}` chip in --remote chrome on every card (rule 7). Verbatim count tail: "Bundles are installed datasets — they hold no code and request no capabilities."
- **Bundle Detail** (`/bundles/:id`) — About (Author · License · Source citation chip · Installed date) · Data shape table · References-from-vault count BEFORE Remove (rule 35 irrevocability disclosure). Footer warn-line surfaces the affected count verbatim.
- **Bundle Install Preview modal** — **HONESTY RULE 34 — DATA ONLY. Never runs plugin code.** Even when the bundle ships a plugin, the preview renders only the data shape + sample rows. Default install path is `Install into sandbox` (--accent); `Install directly` is --warn-soft (bypasses sandbox, irrevocable per rule 35).
- **Sandbox Browser** (`/sandbox`) — **Persistent rule-36 disclosure band** below the topbar (NOT a tooltip): "Sandbox content is local to this device. It never federates, never appears in network feeds, never reaches the Fediverse — even if you've enabled federation." Expiry pill flips --warn when close to expiry, --ink-mute otherwise.
- **Sandbox Detail** (`/sandbox/:id`) — Same persistent rule-36 disclosure. **Every content card wrapped in NEW SandboxFrame primitive** (--sandbox-frame border + `‡ in sandbox` chip upper-right) — visually impossible to confuse with main-vault content.
- **Sandbox Promote modal** — Rule 35 VERBATIM body: "Once promoted, the bundle's data merges into your main vault and cannot be cleanly removed. Sandbox contents already referenced by main vault entries will remain after sandbox discard." Promote CTA --warn-soft NEVER --danger.
- **Bundle Discard modal** — Two-row body: `--warn-soft` "{N} sandbox-local rows will be permanently deleted" + `--peer-ok-soft` "{N} references already in your main vault will survive — they were copied when you used them, and remain after the sandbox is gone."
- **Plugin Update Diff modal · FINAL** — Changelog · NEW capabilities (--warn-soft) · REMOVED capabilities (--peer-ok-soft — surface-area reduction is GOOD) · Migration steps. Apply CTA: --accent "Apply update" when no new caps; --warn-soft "Review & apply" when new caps exist (re-opens the Capability Review modal gated on the new caps only).

**Six new shared primitives across the sprint**:

- **PluginKindIcon** — 14-sprite family for plugin kinds.
- **BundleScrollIcon** — single scroll, distinct from plugin family.
- **CapabilityRow** — label + wire-key chip + one-line consequence. Used in 4 surfaces.
- **ScrollGate** — rule 31's engagement gate (hook + component variants). Used in 2 surfaces (3, 17).
- **TierBadge** — neutral three-tier chrome (rule 29). Used in 3 surfaces.
- **SandboxFrame** — --sandbox-frame border + `‡ in sandbox` chip. Used in surface 14 + reusable.

**Cross-cutting H09 rules wired across all 17 surfaces (31-40)**:

1. **No "Grant all" shortcut** — every capability surfaced individually; ScrollGate proves intent.
2. **Plugins NEVER auto-update** — vulnerability advisories surface explicit "Update now."
3. **Tier-3 install is a deliberate moment** — verbatim disclosure + ack checkbox on top of scroll-gate.
4. **Bundle preview is data-only** — NEVER runs plugin code.
5. **Sandbox promotion is irrevocable** — rule-35 verbatim warning.
6. **Sandbox content NEVER federates** — persistent topbar disclosure.
7. **Author profile is citation, not star rating** — no follower/star/download stats.
8. **NO "trending" / "featured"** — alpha + recent-update sort only.
9. **Status dashboard is honest about errors** — full exception traces in --font-mono <pre>.
10. **Withdraw and tombstone are different states** — plugins never "disappear."

**The `--danger` audit is CLEAN — zero uses across all 17 surfaces.** Uninstall · Deactivate · Remove · Discard · Tier-3 install · Sandbox promote · new-capability update — ALL --warn-soft.

**Sprint totals**: 17 surfaces · 5 commits (`7b3332e → ee065c9`). Admin tsc clean across every commit. Backend tests unchanged (2435 passing).

**Followups noted in commits**:

- Phase 14 backend routes (8 endpoints in `plan/14-plugin-ecosystem.md § 9`) — substrate from Phase 01 B7-B10 already exists; routes pending.
- Storybook stories for the 17 surfaces (follow-on quality batch, mirror of the H08 story sprint).
- Visual + a11y baselines for the 17 surfaces.

### Added — 2026-06-27 (H09 design request opened · Tier 7 Phase 14 Plugin Ecosystem)

412-line handoff at `docs/design-requests/2026-06-27-h09-plugin-ecosystem.md`. **17 surfaces across two clusters** — 9 plugin + 8 bundle/sandbox — targeting Phase 14 Plugin Ecosystem. Carry-forward rules 1-30 from H08 unchanged; ten new H09-only honesty rules earned:

- **31** Capability review is permission-grant chrome — no "Grant all" shortcut; CTA gated on scroll-to-bottom (no checkbox theatre).
- **32** Plugins NEVER auto-update; vulnerability advisories surface explicit "Update now."
- **33** Tier-3 (Unverified) install is a deliberate moment — `--warn-soft` chrome, verbatim disclosure, explicit acknowledgement checkbox.
- **34** Bundle preview is data-only — NEVER runs plugin code.
- **35** Sandbox promotion is irrevocable — verbatim warning.
- **36** Sandbox content NEVER federates — persistent topbar disclosure.
- **37** Plugin author profile is citation, not star rating.
- **38** NO "trending" / "featured" — alpha + recent-update sort only (carries forward H06/H08 anti-popularity rule).
- **39** Plugin status dashboard is honest about errors — full exception traces, not polished euphemisms.
- **40** Withdraw and tombstone are different states — plugins never "disappear."

Cluster A — Plugin ecosystem (9): Installed Plugins · Plugin Detail · Plugin Capability Review · Plugin Configuration · Plugin Status Dashboard · Vulnerability Advisory Banner · Registry Browser · Registry Plugin Detail · Plugin Author Profile.

Cluster B — Bundles + Sandbox (8): Bundle Library · Bundle Detail · Bundle Install Preview · Sandbox Browser · Sandbox Detail · Sandbox Promote · Bundle Discard · Plugin Update Diff Preview.

Substrate from Phase 01 B7-B10 already exists (plugin loader · manifest validator · capability allowlist). `plan/14-plugin-ecosystem.md § 9` documents the 8 backend routes the surfaces will exercise. Anticipated to unblock 5-7 weeks of build-side work.

### Added — 2026-06-27 (Phase 12 single-vault backend COMPLETE · B137 → B141)

Eight commits across five batches (`e2c617e` → `6ba8649`). Alembic chain 0056 → 0057 → 0058 → 0059. Backend tests 2331 → **2423** (+92 over the phase). Admin tsc clean across every commit.

- **B137 — Hub + role-capability matrix.** Extended Phase 01 `Hub` table with H08 columns (tagline · owner_id · membership_policy enum · accepts_sso · auto_curates · public_banner_url · public_tradition_tags JSONB · deleted_at) via non-destructive ALTER TABLE. New `hub_role_capability` join table with the canonical 11-capability matrix per H08 surface 12. **Strip-prefix-at-seam adapter** for the role enum: DB stores `hub_admin`/`hub_officer`/etc. (Phase 01 `MembershipRole` shape); wire renders bare `admin`/`officer`/etc. via Pydantic `Literal` + `bare_to_role`/`role_to_bare` helpers — no data migration needed. 9-endpoint router (`/api/v1/hubs/*`) with audit-event emission per mutation. Honesty rules wired: owner is auto-admin via Membership row written in the same transaction as `POST /hubs` · private hubs return 403 to non-members · owner cannot be demoted from admin (409) or removed · every PATCH /roles cell diff generates an op=grant/revoke audit entry. 32 tests.

- **B138 — Private viewer grant.** New `private_viewer_grant` table — distinct from the Phase 01 `PrivateViewer` — for the H08 surface 11 flow where a credential is issued to an email-or-handle holder who is NOT a Theourgia user. **PBKDF2-HMAC-SHA256 credential primitives** at 100k iterations, 16-byte salt, 32-byte digest. The plaintext is returned exactly ONCE at issue time in `PrivateViewerGrantIssued.plaintext_credential`; the read shape `PrivateViewerGrantRead` carries NO credential fields (defence-in-depth against accidental leak via list endpoint). 3-endpoint router. Default scope is `TAG` — never `FULL` — per H08 rule 11. `revoked_at` is immutable once set (409 on re-revoke). 24 tests.

- **B139 — Group ritual lifecycle.** Four new tables: `group_ritual` · `group_ritual_participant` · `group_ritual_fragment` · `group_ritual_reflection`. Status state-machine `DRAFT → INVITED → IN_PROGRESS → COMPLETED`. **`GroupRitualReflection` is write-once per (ritual, author)** via `UniqueConstraint uq_reflection_ritual_author`; router catches `IntegrityError` + returns 409. **`GroupRitualFragment` is append-only** — no `SoftDeleteMixin`, no PATCH/DELETE handlers. PATCH on the ritual refuses if `status != DRAFT` per H08 rule 22 (once-final lock). 11-endpoint router covering the full lifecycle. 23 tests.

- **B140 — Federation audit-log query + CSV export.** Reuses the existing Phase 01 `audit_event` table — no migration. `GET /api/v1/hubs/{id}/audit` returns paginated JSON; `GET /api/v1/hubs/{id}/audit.csv` returns a forensic CSV of signed envelopes (10k internal cap). Both gated on `VIEW_AUDIT_LOG` capability. **Append-only invariant verified by route inspection** — the router has only GET handlers. Time-range floors render in tz-aware UTC. 7 tests.

- **B141 — SSO assertion scaffold.** New `sso_assertion` table — issuer_user_id · target_did · scope_payload (JSONB) · expires_at_utc · revoked_at · signature_b64 (nullable until Phase 12.5 fills it). 3 endpoints: list, `POST /sso/authorize` (server fixes `expires_at_utc = now + 24h` per H08), `POST /sso/assertions/{id}/revoke` (immutable). 6 tests.

**Phase 12.5 (HTTP Signatures + capability tokens) and Phase 13 cross-instance delivery remain queued.** The substrate they need (audit_event, hub model, sso_assertion with nullable signature_b64, AP follower + follow-request tables) is in place.

### Added — 2026-06-27 (Phase 13 ActivityPub adapter STUB · persistence layer)

Three new tables wiring the H08 Cluster B surfaces (16-21) to persistence; cross-instance HTTP delivery + signed inbox processing remain queued. Migration 0060. 12 tests.

- **`activitypub_settings`** — per-vault: `enabled` (default **FALSE** per H08 rule 28 · per-network opt-in) · `display_name_override` · `bio_override` · `follower_approval` (default **MANUAL** for vaults per H08 rule 20) · `broadcast_creates`/`_updates` (default TRUE) · `broadcast_deletes` (default **FALSE** per H08 rule 32 carry-forward — user explicitly opts in given the cache caveat) · `object_type_mapping` (JSONB, plugin-extensible).

- **`activitypub_follower`** — confirmed followers · `follower_did` (canonical AP actor URL) · `follower_handle` · `follower_inbox_url` · `last_delivery_at`. Unique on `(owner_id, follower_did)`.

- **`activitypub_follow_request`** — Pending / Accepted / Rejected state machine. `resolved_at` fills on accept/reject.

Settings router · WebFinger endpoint · follower-management routes · outbound delivery queue land as follow-on commits once the cross-instance transport (Phase 12.5) is ready to test.

### Added — 2026-06-27 (H08 Storybook stories · 21 surfaces covered)

One Storybook story file per H08 surface (`0b520aa`). Cluster A 15 + Cluster B 6. Each story renders the surface against the same fixture data the test files use, so the visual baseline lines up with the unit-test baseline. Multiple stories per surface where states are rule-level (RemoteContentEmbed: resolvable/loading/unresolvable · WebFingerVerify: idle/pass/fail · PushToHub: network-entry/sealed-blocked · CrossPostPreview: with-CW/no-CW · HubPublicFace: anonymous/member/invitation-only). `pnpm build-storybook` builds clean in 36s; `@storybook/addon-a11y` axe runner is wired for in-browser a11y baseline regeneration.

### Added — 2026-06-27 (H08 sprint COMPLETE · Phase 12 Federation + Phase 13 ActivityPub frontend · 21/21)

The H08 frontend sprint closed today. All 21 surfaces against the H08 design package at `/home/sophia/design-handoffs/theourgia/2026-06-27-H08/handoff_H08/` shipped — fifteen Cluster A (Federation) + six Cluster B (ActivityPub). Phase 12 + Phase 13 frontends are end-to-end against the design corpus. Backend (single-vault subset plus the ActivityPub adapter) lands as a follow-on under `plan/12-batches-backend.md`.

**Foundation — `ef2d968`**:

- H08 token block in `theourgia.tokens.css`: `--network*` (peer network framing), `--peer-{ok|pending|refused|blocked}*` (handshake states), `--planetary-hour-now*` (current-hour highlight on the group-ritual time trio), `--remote*` (off-instance origin), `--seal-border` (modal chrome for sealed-blocked callouts). Four themed variants (base · hellenic · thelemic · light).
- VaultNav extension: `hubs` key renamed `networks`; added `followers` + `privateviewers` items.
- Admin App.tsx route registration + nav-key mapping.

**Cluster A — Federation networks (15 surfaces · `21e2dd3 → 8a87800`)**:

- **My Networks** (`/networks`) — HubMembershipCard + HubInvitationCard. Accept-invitation chrome `--warn-soft`. Verbatim empty-state copy.
- **Network Browser** (`/networks/peers`) — peer list with local-pinned in `--network` framing. `pillTokens()` centralises `--peer-{ok|pending|refused|blocked}` mapping. Status counts memoized over FULL peer set (not the filtered view).
- **Hub Discovery** (`/networks/discover`) — `HubDiscoverySort = "alpha" | "recent"`; NEVER popularity. CTA matrix: public/owa → "Request to join" enabled; private → invitation-only disabled; isMember → "Already a member" disabled.
- **Hub Admin Dashboard** (`/hubs/:hubId/admin`) — 4 tabs (Members default · Curation queue · Public face · Settings). Reject CTA `--warn-soft`; Approve `--network-soft`; Send back ghost. Analytics opt-in radiogroup (opt-in/opt-out/require-explicit).
- **Hub Public Face** (`/hub/:slug`) — PUBLIC route, no VaultNav. Verbatim `‡ Powered by Theourgia (AGPLv3)` footer. **No member count.** CTA matrix 6 combinations.
- **Hub Member Dashboard** (`/hubs/:hubId`) — 3 tabs (Feed default · My submissions · Sharing settings). Chronological feed with day separators, **no inline reactions**. Verbatim cache-persistence disclosure. Sharing toggles DEFAULT OFF.
- **Network Newsletter Composer** (`/hubs/:hubId/newsletter`) — Two-pane source picker + Tiptap-lite editor + ConfirmSendModal. Verbatim "Send to {N} members?" + "Once sent, a newsletter cannot be recalled." Distinct from Phase 10 publication newsletter.
- **Group Ritual Scheduler** (`/group-rituals/new`) — THE H08 worked example. 6 sections (Basics · Time · Location · Participants · Correspondences · Script). Location radio defaults dispersed. Verbatim correspondences helper: "A prep checklist for each participant — not a lock-in." "Schedule + invite" CTA `--warn-soft`.
- **Group Ritual Coordination** (`/group-rituals/:id/run`) — Narrow ~600px. Compact TimeTrio (shared primitive). Presence pills (in-ritual → `--peer-ok`, joined → `--network`, completed/not-present → `--ink-mute`). Fragment stream with `--network-line` border-left. **No edit affordances per fragment.** Sticky footer with input + "Mark me as completed" one-way CTA.
- **Group Ritual Post-Mortem** (`/group-rituals/:id`) — "Closed" badge neutral chrome. Frozen script/fragments (`--ink-soft` + `--line-2` border-left). Egregore chip conditional render. Write-once reflection form (4000-char limit). Verbatim "Open as an entry in your journal" footer.
- **Private Viewer Management** (`/private-viewers`) — Active rows + revoked rows persist together at `opacity .55` with verbatim `Revoked at {ts}` chip in `--ink-mute` (NEVER `--danger`; audit trail is the point). New-viewer modal defaults to **tag-scoped + signed-link delivery** — Full vault is explicit opt-in, never default. Verbatim shown-once warning in `--warn`: **"This credential is shown ONCE. Save it now."**
- **Roles & Permissions Editor** (`/hubs/:hubId/admin/roles`) — 11-capability × 5-role matrix. Save changes vs **Save + apply** (`--warn-soft` chrome, the propagation edge). Verbatim permission-denied banner template: **"You cannot do {action} because you lack permission {permission}."** Add custom role defaults to least-privilege (zero caps). `Preview as role` is read-only — never mutates.
- **SSO Authorize / Consent modal** — Three MANDATORY sections in fixed order: identity DID (`--font-mono`) · what the hub receives · what the assertion authorizes (scope + 24h expiry + revoke path). Verbatim `--warn-soft` callout: **"This is NOT a login. Your home instance never sees the hub's pages directly — only this consent moment."** Esc + scrim click → DECLINE. No credential inputs.
- **Federation Audit Log** (`/hubs/:hubId/admin/audit`) — Append-only ledger. Every row expands to reveal its signed envelope JSON in `--font-mono`. Tone families: Revoke → `--warn` (NEVER `--danger`); Heartbeat / Mirror / Comment → `--remote`; Accept → `--peer-ok`; rest → `--network`. Filters compose. **"Show only my actions" OFF by default.** CSV export hands the filter triple to the consumer.
- **Push Content to Hub modal** — Two states. Network: hub checkboxes ("you're {role}") + auto-curating warning chip vs reviewing peer-ok chip. Sealed: `--seal-soft` block with verbatim **"Sealed entries cannot be pushed."** + **"Sealed content never federates."** Push CTA `--warn-soft` NEVER `--accent`/`--danger`. Cache caveat verbatim: **"Content already mirrored may persist in caches."**

**Cluster B — ActivityPub (6 surfaces · `0c4bb60 → 932fe6d`)**:

- **ActivityPub Settings** (`/settings/activitypub`) — Master switch OFF by default. First activation requires `--danger` alertdialog (rule 2: `--danger` reserved for Visibility-becoming-Public moments — this is the matching irreversible-feeling step). Verbatim title **"Open your public actor to the wider web"** + sub **"This is the one irreversible-feeling step in Theourgia."** ON→OFF single tap. Body dims to `opacity .42 · pointer-events:none` when disabled. Delete-broadcast outbound switch defaults OFF with verbatim cache caveat.
- **Followers Pane** (`/followers`) — Two tabs. **No engagement metrics** beyond count — verbatim disclosure: **"Listed in the order they followed — newest first. Theourgia keeps no engagement metrics beyond this count."** Consent-first follows: Decline `--warn-soft` (refusing is protective, NOT punitive — NEVER `--danger`). Pending count chip `--warn-soft`. Verbatim pending callout. WebFinger handles in `--font-mono` `--remote`.
- **Remote Content Embed primitive** (Tiptap node) — Three states: resolvable / loading (`aria-busy`) / unresolvable. **Citation preserved even when origin is gone** — `{handle} · ‡ from {instance}` survives the post's disappearance. `--remote` border + chip + handle + `View original →` link.
- **WebFinger Verification** (`/verify`) — Three-step lookup. **Failures never blame** (rule 25): verbatim fail subtitle **"The handle did not resolve to your vault. This is a configuration issue, not an error on your part."** Failure card `--warn-soft` NEVER `--danger`. Pass card surfaces full SHA256 key fingerprint in `--peer-ok` `--font-mono`.
- **Federated Comments Stream** — Three sections (Approved default open · Pending owner-only · Hidden owner-only). Federated comments mark their source via `--font-mono` `--remote` handle + `‡ from {instance}` chip. **Layout identical to local replies otherwise.** Hide/Unhide flips with section. Flag hidden inside Hidden section. **No engagement metrics anywhere** — only per-section count.
- **Cross-Post Preview modal** — Mastodon preview rendered in **Mastodon's actual colour palette** (literal hex tokens, NOT `var(--…)` Theourgia tokens — the user sees what the audience sees, dishonest preview would be a branded preview). Three "Before you post" disclosures in fixed order: public-only reach (rule 27 verbatim) · graceful degradation (verbatim "never broken markup") · Settings → Fediverse pointer. CW preserved by default. Footer disclosure verbatim: **"Posts once, now. Edits sync if you enable Update activities."**

**Cross-cutting H08 honesty rules honoured across all 21 surfaces**:

1. **`--danger` reserved.** Only Visibility-becoming-Public moments (rule 2) — both the ActivityPub first-activation confirm and the entry-publication downgrade banner. **No other surface uses `--danger`.** Revoke / Decline / Reject / sealed-callouts use `--warn-soft` or `--seal-soft`.
2. **No central SSO authority** (rule 23) — point-to-point consent moment; no broker, no Theourgia ID. Identity DID rendered in `--font-mono` so the user reads the wire key.
3. **Per-network opt-in** (rule 28) — every federation surface gates on explicit opt-in. ActivityPub master is OFF by default. Push-to-Hub picks hubs one-by-one, no "push to all" shortcut.
4. **Consent-first follows** (rule 19) — pending list is explicit Approve / Decline.
5. **No engagement metrics** (rule 18) — no likes, reposts, view counts, rankings. The follower count is the ONLY number across the federation chrome.
6. **Federated comments mark source** (rule 24) — handle + `‡ from {instance}` chip; layout identical to local otherwise.
7. **AP only sees Visibility=public** (rule 27) — re-stated verbatim in three places (settings intro, settings confirm body, cross-post preview disclosure).
8. **Failures never blame** (rule 25) — WebFinger Verify fail subtitle verbatim: "This is a configuration issue, not an error on your part."
9. **Three-pin time display** (rule 23) — local + UTC + planetary-hour ruler for every group-ritual time render.
10. **Federation is NOT a walled garden** — Hub Public Face is reachable without VaultNav; remote content embed renders verbatim; comments stream treats federated equals to local.
11. **Audit is append-only** — Federation Audit Log renders no edit/delete affordances; rows persist with signed envelopes inspectable inline.
12. **Restrictive defaults** (rule 11) — Private Viewer modal defaults tag-scoped not full-vault; ActivityPub Delete-broadcast outbound defaults OFF; Sharing toggles in Hub Member dashboard default OFF.
13. **Cache-persistence disclosed** at every push moment — verbatim "Content already mirrored may persist in caches."

**Sprint totals**: 21 surfaces. **2657 vitest tests** (2073 → 2657; **+584** over the sprint). Admin tsc clean across every commit. The five new H08 design tokens are wired through every relevant surface.

**Followups noted in commits**:

- Phase 12 backend (B137-B141) — single-vault hubs/membership/private-viewers/group-rituals/SSO scaffolding. Plan locked at `plan/12-batches-backend.md`.
- Phase 12.5 (federation transport) — HTTP Signatures sender + receiver, replay-nonce store, capability-token issuance. Lands when a second test instance is available + threat model is signed off.
- Phase 13 backend (ActivityPub adapter) — WebFinger endpoint, AP actor + outbox + inbox, federated comments wire, Mastodon-compat note/article rendering. Follows Phase 12 transport.
- Storybook stories for the 21 surfaces (follow-on quality batch).
- Visual + a11y baselines for the 21 surfaces.

### Added — 2026-06-26 (Phase 11 Media Library + Pilgrimage backend COMPLETE · B132 → B136)

Phase 11 backend is fully shipped. Four new tables across Alembic
0051 → 0055 (media_asset · media_link · media_upload_session ·
pilgrimage_site · ical_feed). 2276 backend tests passing (+203 vs
Phase 10 close).

Explicitly OUT of scope (Phase 12+ / 14 / 15):
- Audio waveform precompute + transcription pipeline
- Privacy-enhanced YouTube embed proxy + Cloudflare Stream reference
- Per-vault public gallery (deferred to Phase 15 hardening)
- Pilgrimage-anniversary push-notification fan-out (Phase 12 network)
- Multi-tenant storage quota plans (single 5 GB default for v0.x)
- Live VEVENT data-walking (B136 shells the route; the data assembly
  lands when the integration harness comes online in Phase 15)

What landed across the five execution batches:

- **B132 (media asset table + sealed substrate + link cache)** —
  ``MediaAsset`` (4-kind enum image/audio/video/document) with a
  polymorphic ``MediaLink`` (ref_kind/ref_id; no per-target FK so
  adding a new linkable kind doesn't require a migration). Sealed
  read response NULLS filename / caption / alt_text / tags /
  exif_metadata / dimensions / duration but PRESERVES size_bytes
  (storage-quota math) + link_count (the H07 "linked to N
  workings" stat) + r2_object_key (the bytes still resolve;
  client decrypts after fetching) + kind/mime. List endpoint
  surfaces sealed assets as a ``sealed_count`` aggregate only —
  never individual cards. /media/sealed-count standalone endpoint
  for the H07 Library card. ``MediaUpdate`` schema omits
  r2_object_key / size_bytes / mime_type / kind / owner_id by
  construction. CI source-level invariant: no ``play_count``
  anywhere.

- **B133 (R2 upload pipeline)** — Protocol-isolated EXIF stripper
  with ``NullExifStripper`` (CI fallback) + ``PillowExifStripper``
  (lazy PIL import). Three endpoints: ``/begin`` (quota guard at
  5 GB default · sealed-AND-strip explicit 400 because encrypted
  bytes can't be re-stripped server-side · EXIF strip default ON
  for unsealed images via ``_effective_exif_policy``), ``/complete``
  (R2 existence check · strip step records pre/post sizes ·
  creates MediaAsset row · flips session COMPLETED),
  ``DELETE /uploads/{id}`` (idempotent on CANCELLED; 409 on
  COMPLETED — use ``DELETE /media/{id}`` to soft-delete a
  completed asset). ``MediaUploadSession`` 4-state lifecycle
  with 24h TTL. Source-level invariants: no /retry · /refund ·
  /force-complete · /skip-strip endpoints.

- **B134 (pilgrimage sites + precision FLOOR)** — 5-kind
  ``PilgrimageSite`` (sacred/ancestral/working/pilgrimage/other
  with ck_pilgrimage_lat_lng_paired + ck_pilgrimage_precision
  CheckConstraints). Eight endpoints. The defining rule: precision
  is a FLOOR — never raise. ``/requantize`` uses
  ``is_lower_or_equal_precision`` against ``PRECISION_RANK`` to
  reject any transition where target rank < current rank. The
  shared ``apply_precision_floor`` helper from B120 autotag does
  the rounding — same string set: exact / 1km / 10km / country /
  hidden. PATCH does NOT touch location_lat / location_lng /
  stored_precision / kind / sealed. Sealed sites are STRIPPED
  from the map list; ``/sealed-cluster`` returns ONLY a count
  (no ids, no coords) even with map bounds. ``‡ Geocoding by
  Nominatim / © OpenStreetMap contributors.`` embedded as a
  schema default. Source-level invariants: ``apply_precision_floor``
  called in create AND requantize sources;
  ``is_lower_or_equal_precision`` referenced in requantize
  source; no /unseal · /promote · /sharpen · /refine ·
  /raise-precision · /within-radius · /nearest endpoints.

- **B135 (iCal feed serializer)** — per-vault ``ICalFeed`` (6
  include toggles + visibility CheckConstraint + 32-byte
  url-safe token + last_regenerated_at). Pure-Python RFC 5545
  serializer at ``core/calendar/ical_serializer.py``: § 3.3.11
  text escape (backslash-first), § 3.1 line folding to 75 octets
  (decode-and-retry boundary check so multi-byte UTF-8 never
  splits), CRLF discipline, PRODID ``-//Theourgia//Practitioner
  Calendar 1.0//EN``. The CRITICAL rule: ``SealedDayMarker``
  dataclass is restricted to ``{date, count}`` — no title field
  by construction. Each marker becomes ONE all-day VEVENT with
  summary ``"{N} sealed entries today"``, NO description, NO
  location. Three settings endpoints + ``/ical/v1/{token}.ics``
  delivery endpoint mounted at app-level (NOT /api/v1) so
  subscribers' URLs stay stable across API versioning. Private
  feeds require auth cookie + owner match. Source-level
  invariants: no /forge · /clone · /peek-sealed · /reveal ·
  /unseal endpoints; ``SealedDayMarker`` dataclass remains
  exactly ``{date, count}``.

- **B136 (close-out)** — this commit. Docs + memory.

Honesty rules added or strengthened (vs Phase 10):

- Sealed media surfaces as count-only in the list endpoint
  (defence in depth on top of B130's structural paywall).
- Pre-strip / post-strip sizes recorded so callers can assert
  non-passthrough on EXIF-bearing fixtures.
- Precision floor is a one-way ratchet — finer precision is
  irreversibly lost the moment a site is saved or re-quantized.
- Sealed pilgrimage anniversaries are EXCLUDED ENTIRELY from
  iCal feeds (no count-only fallback for these).
- iCal sealed-day collapse keeps the count visible (the
  practitioner knows their own commitments) without ever
  leaking the underlying entry titles to a calendar client.
- Anti-gamification carried forward: no play_count, no
  view_count, no /retry, no /forge, no /unseal endpoints
  anywhere in Phase 11 routers.

Backend test count: 2073 → 2276 (+203 across B132 → B135).
Alembic chain: 0051 → 0055 (head).

### Added — 2026-06-26 (Phase 10 Publishing & Monetization backend COMPLETE · B126 → B131)

Phase 10 backend is fully shipped. Four new tables across Alembic
0048 → 0051 (publication · publication_chapter · stripe_connect_account
· purchase · subscription_tier · subscriber · newsletter_issue).
2073 backend tests passing.

Explicitly OUT of scope (Phase 12-15 or 14):
- Network-level (hub) newsletters
- Author-managed comments on publications (Phase 14 plugin)
- ActivityPub bridging (Phase 13)
- Stripe Tax automation
- EPUB generation
- Subdomain per-vault config (Phase 15)

What landed across the six execution batches:

- **B126 (publication lifecycle)** — Publication + PublicationChapter
  models. 4-state lifecycle (DRAFT/SCHEDULED/LIVE/WITHDRAWN) with
  explicit `/publish` `/schedule` `/withdraw` `/republish` endpoints.
  Withdrawn rows STAY (audit). Slug auto-derivation kebab-cases the
  title; collision-safe via numeric suffix. Sealed entries CANNOT
  be embedded — `/publish` and `/republish` walk the Tiptap body
  and reject 400. Generic PATCH refuses `state`/`kind`/`owner_id`/
  `published_at` at the Pydantic layer. 9-license picker (CC family
  + ARR + CC0 + PD). Chapters book-only with two-step reorder.

- **B127 (Stripe Connect substrate)** — Protocol-isolated
  StripeClient with NullStripeClient fallback (production misconfigured
  raises clearly) + RealStripeClient (lazy `stripe` SDK import; CI
  never requires it). **0% application fee invariant** — hard-coded
  literal in `create_checkout_session`; source-level test enforces
  drift catches before merge. Refunds via Stripe Customer Portal
  HAND-OFF ONLY — `/refund-link` returns the portal URL; **no
  `/refund` POST endpoint exists in any router** (CI walks every
  route and asserts). Single-use download tokens (32-byte url-safe,
  HMAC-SHA256 signed, constant-time compare, 30-day TTL, 5-download
  limit). Idempotent webhook processor with 4 event types
  (checkout.session.completed, charge.refunded, account.updated,
  + the B128 additions invoice.payment_failed, customer.subscription.deleted).

- **B128 (subscription tiers + subscribers)** — Tier amount IMMUTABLE
  (TierUpdate schema omits `monthly_amount_cents` / `currency` /
  `stripe_price_id`; Stripe prices don't change in place). Mandatory
  double-opt-in — Subscriber.status defaults PENDING_CONFIRMATION;
  route never auto-confirms. Acknowledgment copy verbatim: "Check
  your email to confirm — you're not subscribed until you click
  the link." FAILED_PAYMENT is its own enum state (H07 surface
  renders `--warn`, never `--danger`). Sticky unsubscribe — re-
  subscribing rotates BOTH tokens. Per-publisher email uniqueness
  via composite unique constraint. 1/min resend rate limit.

- **B129 (newsletter issues + delivery)** — 5-state lifecycle
  (DRAFT/SCHEDULED/SENDING/SENT/CANCELLED). Once SENT is frozen
  forever (PATCH + DELETE refuse non-DRAFT). NewsletterIssueUpdate
  schema rejects status/sent_at/recipient_count/delivered_count/
  bounced_count — server-only fields. **SendNowResult always
  carries `confirmation_required: true`** — surface contract for
  the `--warn-soft` confirm modal; source-level test asserts the
  hard-coded `True`. Cancel only from SCHEDULED. Tiptap → HTML
  + plaintext renderer with `html.escape` on text content
  (XSS-safe). Per-recipient unsubscribe URL in EVERY render
  (HTML footer + plaintext footer). Empty `targeted_tier_ids` =
  ALL active subscribers.

- **B130 (public reader + per-vault page + feeds)** — Public reader
  endpoint with structural paywall (`paywall_kind: "none" |
  "purchase" | "subscribe"`). ReaderResponse schema actively
  REJECTS countdown-timer / "limited time" / view_count / trending
  / recommended-products fields — a defensive CI test enumerates
  banned field names. Sealed publications NEVER public (defence
  in depth — read-time walker checks every entry_id ref against
  the publisher's SEALED entries). Withdrawn 404s. Per-vault
  public page payload doesn't carry view_count / trending /
  subscriber_count (anti-gamification). Unversioned RSS 2.0 /
  Atom 1.0 / JSON Feed 1.1 serializers at `/vaults/{id}/feed.{rss,atom,json}`
  — feeds mounted at app level (NOT /api/v1) so subscribers'
  URLs stay stable. Every feed item carries the per-publication
  license slug AND the AGPLv3 site-wide credit. XSS-safe
  escaping in all three formats.

- **B131 (close-out)** — This commit. Docs + memory updates.

Honesty rules added or strengthened (vs Phase 09):

- 0% application fee invariant on every Stripe checkout session.
- Refunds via Stripe portal hand-off only; no `/refund` POST
  endpoint anywhere in any router.
- Sealed publications never reach public surfaces — defence in
  depth at publish-time AND checkout-time AND read-time.
- Paywall is STRUCTURAL — closed-Literal kind + URLs only; no
  promotional escape hatches.
- Failed-payment subscribers are `--warn` (never `--danger`).
- Once-sent newsletter immutability.
- Per-recipient unsubscribe URL in every newsletter render.
- Feeds carry AGPLv3 credit + per-publication license.
- Anti-gamification: no view-count / trending / subscriber-count
  / popularity-rank fields on public surfaces.

Backend test count: 1899 → 2073 (+174 across B126-B130).
Alembic chain: 0047 → 0051 (head).

### Added — 2026-06-26 (Phase 09 Synchronicity & Analytics backend [solo subset] COMPLETE · B120 → B125)

Phase 09's solo-magician analytics path is fully shipped. Five new
tables across Alembic 0042 → 0047 (synchronicity ·
study_kind extended with QUERY_BUILDER · digest · digest_item +
the cross-cutting analytics module). 1899 backend tests passing.

Explicitly OUT of scope (Phase 12+): network aggregates,
differential-privacy noise, anonymized cross-vault contribution,
federated study sharing, email digest delivery, automated
pattern-detection ML. Documented forward in `plan/09-batches-backend.md`.

What landed across the six execution batches:

- **B120 (synchronicity + auto-tag)** — Synchronicity table with
  10 closed-enum categories · intensity 1-10 · auto-tag pipeline
  with AstroProvider / CalendarProvider / WeatherProvider protocols
  + dependency injection. The location-precision floor (Pilgrimage
  Map substrate) is enforced BEFORE providers see lat/lng so they
  cannot leak precision. Sealed entries cannot be linked.

- **B121 (QUERY_BUILDER + DSL)** — StudyKind extended with
  QUERY_BUILDER (Postgres `ALTER TYPE … ADD VALUE`). Pure DSL
  parser + validator covering 4 subjects · 11 comparators · 4
  aggregates · cross-cutting astro/calendar axes. Strict: extra
  keys rejected, empty AND/OR rejected, value type enforced per
  axis type.

- **B122 (executor + /analytics/query)** — DSL → SQLAlchemy
  translator. Sealed entries' body text NEVER enters a result
  when the filter tree touches `entry.body_text`; a separate
  `sealed_excluded_count` indicator reports the structural count
  without leaking content. Owner-scoped at every base statement.
  1000-row cap. Loud failure on axes that haven't been
  materialised yet (astro.*, working.outcome_rating) — silent
  zero rows are worse.

- **B123 (analytics aggregates)** — Four endpoints: timeseries,
  heatmap, correlation, today. Every aggregate response carries
  sample_size + small_sample flag. Minimums: timeseries ≥ 5 ·
  heatmap ≥ 10 · correlation ≥ 20. Pearson + Spearman pure
  helpers handle constant series (zero variance) by returning
  0.0 — no divide-by-zero crash.

- **B124 (weekly digest)** — Pure-where-possible digest builder
  with tier-1 counts always present + tier-2/tier-3 patterns
  gated by sample size (≥ 10 / ≥ 20). Banned-phrase regex blocks
  modal language (must/will/should work/guaranteed) AND oracular
  framing (destiny/fated/"the gods favor"/conviction without
  sample size). The check runs at draft emission AND at test
  time against the shipped templates. Four routes:
  GET /weekly · GET /weekly/{period_start} · PATCH /items/{id}
  (dismissed only) · POST /rebuild (idempotent).

- **B125 (close-out)** — This commit. Docs + memory updates.

Honesty rules added or strengthened (vs Phase 08):

- Location precision is a per-vault floor. The DB row never holds
  finer precision than the floor allows; the autotagger applies
  it BEFORE any provider sees lat/lng.
- Sealed body-text NEVER enters a query result. Sealed structural
  filters (date / type) DO match — the protection is on the
  content, not the shape. `sealed_excluded_count` surfaces the
  structural count without leaking content.
- Aggregate responses ALWAYS carry sample_size + small_sample.
  Sub-threshold means the data still returns but the surface
  flag fires.
- Personal-cipher provenance carries through the executor for
  any gematria-axis filter (mirrors the B111 invariant).
- Digest headlines NEVER use modal or oracular language. The
  banned-phrase regex is tested against every shipped template.
- Study queries + digest items are immutable history. Only the
  `dismissed` flag on a digest item changes after creation.

H06 frontend porting also complete this session (10/10 surfaces):

- 2/10 Cross-Journal Search · 3/10 Per-Study Page ·
  5/10 Studies Index · 6/10 Transliteration Utility ·
  7/10 Analytics Dashboard · 8/10 Query Builder ·
  9/10 Synchronicity Log · 10/10 Quick-Capture.

(Surfaces 1/10 Gematria Calculator + 4/10 Voces Library Browser
shipped earlier in 2026-06-25's H06 wave.)

Backend test count: 1753 → 1899 (+146 across B120-B124).
Alembic chain: 0042 → 0047 (head).
Frontend shared tests: 2071 → 2194 across the eight H06 ports.

### Added — 2026-06-26 (Phase 08 Linguistic Tools backend COMPLETE · B110 → B115)

Phase 08 backend is fully shipped. Five new tables ship across
Alembic 0038 → 0042 (cipher · gematria_index · study · study_snapshot ·
transliteration_scheme · voce_per_vault_state). 1753 backend tests
passing.

What landed across the five execution batches:

- **B110 (cipher catalog)** — `cipher` table with 13 PD-cited
  bundled fixtures across six language families (Greek · Hebrew ·
  English · Coptic · Arabic · Sanskrit). The seven ciphers shipped
  client-side in H06-1 have byte-for-byte identical mappings on
  the server — verified by per-cipher parity tests. Six
  endpoints: `GET /bundled` (public) + per-vault CRUD with 409
  on PATCH/DELETE for bundled rows. Bundled rows are immutable.

- **B111 (gematria index + cross-journal search)** — Pure indexer
  in `core/linguistic/indexer.py` (`compute_index_rows` builds
  1/2/3-gram phrase candidates and computes their value per
  cipher). Sealed entries are NEVER indexed; the search router
  surfaces a separate `sealed_match_count` indicator. Three match
  modes: exact (`=N`) · near (`BETWEEN N-δ AND N+δ`) · reduced
  (digit_sum equality). CSV export. Owner-scoped 401.

- **B112 (studies)** — Saved gematria queries + frozen snapshots.
  The Study `query` field is IMMUTABLE after first save (the
  StudyUpdate schema doesn't declare it). Snapshots are equally
  frozen: only `notes` is editable. Every `/run` creates a new
  snapshot row, never replaces. Nine endpoints (CRUD + run +
  snapshot list/read/annotate).

- **B113 (transliteration schemes)** — 8 PD-cited reference
  tables: Beta Code · ALA-LC · IAST · Harvard-Kyoto · SBL
  Hebrew · ISO 233 · DIN 31635 · SBL Coptic. Each verified by a
  canonical-input test (अग्नि→agni for IAST, θ→q for Beta Code,
  etc.). Round-trip status surfaced explicitly (lossless ·
  normalises · lossy). No write routes — schemes ship as
  Python constants.

- **B114 (voce per-vault state)** — A practitioner can attach a
  private note ("Why I learned this voce") to any voce AND hide
  individual entries from their own library without affecting
  the canonical row. New `voce_per_vault_state` table with
  unique (voce_id, owner_id). The `/voces` list endpoint now
  honours hidden state by default; `?include_hidden=true` opts
  back in.

Honesty rules added or strengthened:

- Sealed entries NEVER leak phrase content. The B111 indexer
  skips sealed entries entirely; the search router double-defends
  at the JOIN layer; `sealed_match_count` is a separate query
  against entry counts.
- Personal-cipher provenance: every gematria search result
  carries `cipher_personal=true|false` so the frontend can flag
  matches that come from a vault's custom cipher only.
- Bundled cipher / scheme citations are mandatory (≥10 chars,
  CI gate enforced).
- Study queries are immutable after first save (H06 §8 ritual
  rule); snapshots are frozen.

Backend test count: 1625 → 1753 (+128 across the five batches).
Alembic chain: 0037 → 0042 (head).

### Added — 2026-06-25 (Phase 07 Workshop backend COMPLETE · B103 → B108-2d)

Phase 07 backend is now fully shipped. Five domains live across Alembic
0033 → 0037 (sigil · magic_square · talisman · circle · tool · altar ·
voce_magicae · voce_recording). 1625 backend tests passing; 1735 shared
frontend tests passing. Workshop frontend persistence wired live for
five of six surfaces; Tool Registry create form is the only remaining
designer follow-up.

- **B103 (Workshop foundation)** — Sigil + MagicSquare models · the 7
  Agrippa planetary squares as immutable Python constants (Saturn 3×3
  through Moon 9×9, all verified valid) · routers with 6 endpoints each
  · 40 tests. Migration 0033.
- **B104 (Talismans + Mode B encryption)** — Talisman model reusing the
  `entry_encryption_mode` Postgres enum via `create_type=False` (same
  pattern as Oath). 8 endpoints: list / create / get / patch / delete /
  seal / unseal / fork. The seal endpoint atomically: stores ciphertext
  + IV, switches mode to SEALED, nulls plaintext columns (defence in
  depth: `_to_read` omits plaintext even if columns are populated). 23
  tests. Migration 0034.
- **B105 (Magical Circles + preset library)** — Circle model with
  rings array (1-6 entries, kinds bounded) · compass tradition enum ·
  centre element with restricted kinds. Five PD preset templates:
  LBRP, Heptameron Solar, Goetic Solomonic, Picatrix Venus, Greek
  defixio — every preset cites a verifiable PD source. 7 endpoints
  (presets is public). 28 tests. Migration 0035. Also fixed the B104
  router-registration omission (talismans was imported but not
  included in `register_routers`).
- **B106 (Tools + Altars)** — Tool + Altar models, two routers (15
  endpoints between them). Consecration is a sub-resource:
  `consecration_date` and `consecration_working_entry_id` are not in
  ToolUpdate; only POST `/tools/{id}/consecrate` sets them (requires a
  real working entry in the same vault). The unconsecrate sub-resource
  is separate so the audit trail stays honest while permitting
  correction. 32 tests. Migration 0036.
- **B107 (Voces Magicae + bundled corpus)** — VoceMagicae +
  VoceRecording models. 32-entry PD bundled corpus drawn from PGM
  (Preisendanz 1928-31 / Betz 1986 line numbers), Sefer Yetzirah,
  Lemegeton, Heptameron, and Vedic/Tantric Sanskrit bīja mantras.
  Every entry cites a verifiable PD source — the corpus invariant
  test fails CI if anyone tries to ship an improvised voce. 9
  endpoints. 29 tests. Migration 0037.

#### B108 — Frontend wiring

- **B108-1** — Shared API contract: 378 lines of TypeScript types
  mirroring every Phase-07 Pydantic schema · 452 lines of typed
  endpoint methods · re-exported via the shared barrel. Four wire
  types renamed to avoid collision with H05 surface demo types
  (`PlanetarySquare → PlanetarySquareWire`, `ToolRecord →
  ToolRecordWire`, `AltarRecord → AltarRecordWire`, `VoceRecord →
  VoceRecordWire`).
- **B108-2a** — Sigil end-to-end live save (`POST /api/v1/sigils`).
  Surface contract extension: SigilPreview forwards a ref;
  SigilGeneratorSurface serialises the live preview SVG and emits
  mode-specific parameters + deterministic seed. Workshop fixtures
  for all 8 endpoint groups so mock-mode dev keeps round-tripping.
- **B108-2b** — Live save wired for Magic Squares, Voces, and
  Magical Circle. Surface enums map to the backend's wire enums
  (e.g. `glyphs → glyph_row`, `winds → greek_winds`,
  `solomonic → solomonic_seal`). MagicSquaresSurface gained an
  `onSaveCustomSquare` callback (the Build mode "Save" button was
  previously unwired). Voces' name field is synthesised from the
  first line of `source_text`; the H05 honesty rule (non-empty
  `source_citation`) is enforced server-side.
- **B108-2c** — Mode B vault crypto utility in shared (`crypto/`).
  PBKDF2-SHA256 @ 600_000 iterations (OWASP 2023 baseline) +
  AES-256-GCM with random 96-bit IV. 7 round-trip / tamper /
  wrong-key tests.
- **B108-2d** — Talisman live save end-to-end including the full
  Mode B sealed flow. SealedSaveDialog gained an in-dialog
  passphrase input (Save button disabled until supplied);
  TalismanCanvas forwards a ref; the surface renders the inactive
  face into a visually + AT-hidden block at zero size so both faces
  are captured atomically. Envelope helpers
  (`encryptVaultPayloadWithSalt`) embed a fresh per-row salt in the
  first 16 bytes of the ciphertext — each sealed row carries
  everything needed to decrypt it given the passphrase, no per-vault
  salt fetch required.

Backend: 1473 → 1625 tests (+152). Alembic head: 0032 → 0037.
Shared frontend: 1722 → 1735 tests (+13 crypto + dialog tests).
Admin tsc: clean throughout.

**Queued (B108-2e):** Tool Registry create form. ToolRegistrySurface
today emits only `onNew(view)` — an intent signal — with no
in-surface fields for tool/altar field capture. Designer follow-up
(form composition was not in scope of the H05 handoff).

### Fixed — 2026-06-23 (B102e · A11y comprehensive sweep · 73 → 14 failures · 97.5% pass rate)

One comprehensive sweep covering every known a11y category at once, replacing the earlier batch-by-batch approach. From 73 → 14 failing stories (286 → 14 since the gate was restored in B101 — **95% reduction**).

**Token changes**:
- `--ink-mute` lifted further: dark `#958b77` → `#a09680`; hellenic `#86907f` → `#909a8a`; thelemic `#998964` → `#a39073`. Now clears 4.5:1 on `--accent-soft` chip backgrounds (active list rows in Magical Circle, Slash menu, etc.) where it previously only cleared on `--bg-2`.
- `--danger` lifted across 3 themes (dark `#d76a55`, hellenic `#cf6e57`, thelemic `#de553f`). Closes "Revoked" and other danger pills against dark surfaces.

**Component changes**:
- `Chip` (role="switch"): dropped `aria-pressed` (ARIA prohibits it on switch); kept `aria-checked`. `theourgia.shared.css` now matches both states so the active background still renders.
- `SquareView` (build mode): conditionally spreads `onClick` so the SVG `<g>` only has the handler when actually clickable — fixes `nested-interactive` violation.
- `EntityCard` unread-dot span: dropped `title` (prohibited on roleless span) and added `role="status"` so aria-label is admitted.
- `TalismanDesigner` snap-grid switch, `OwnedDeckOverlay` checkbox, `RitualLogNode` remove button — all got `aria-label`s.
- `RitualLogNode` × remove button: `minWidth/minHeight: 24` for WCAG 2.2 target-size.
- `OperationsToolbar` colour swatches: 17×17 → 24×24.
- `TemplateBlockCard` move/remove buttons: 26×22 → 28×26.
- `SensationTypeGrid.cellStyle`: `minWidth/minHeight: 24` floor on the aspect-1 cells.
- `Editor/SlashMenu` description + command columns: `--ink-mute` → `--ink-soft` so contrast holds on the `--accent-soft` active row.

**CSS additions**:
- `theourgia.shared.css` `.tiptap.ProseMirror` gets `min-height: 28px` so an empty editor surface clears WCAG 2.2 target-size.
- `TiptapEditor` configures `editorProps.attributes` to inject `aria-label="Entry body — Tiptap editor"` on the ProseMirror element so its 5 axe rules (aria-input-field-name, name, etc.) pass.

**Tests / gates**:
- Vitest: 1722 / 1722 passing (Chip test updated to expect aria-checked-only).
- Visual: 557 / 557 passing — baselines refreshed for the ink-mute + danger token shifts (visual change is real but design-neutral; the muted-tone character is preserved).
- A11y: **543 / 557 passing (97.5%)**, was 286 / 557 (51%) at the start of B102. Net rule-level: target-size + target-offset + aria-required-parent + aria-allowed-attr + aria-input-field-name + non-empty-placeholder + presentational-role + implicit-label / explicit-label / label all at zero.

**14 residual failures, all design tradeoffs**:
- `color-contrast` × 41 node instances. Mostly `color-mix(--ink-mute, …)` derivatives (`#837a68` etc.) rendering 4.2:1 instead of 4.5:1 — these are the design's "fades" (muted-on-muted) that are intentional. Plus 4 instances of `--fire` / `--c-working` brand colour as text labels (consecration timestamps, working dot labels) where the brand colour is the meaning.
- `nested-interactive` 1, `no-focusable-content` 1, plus a handful of vendored-element rules — would need per-call-site `axe-ignore` overrides.

These remaining items would each need a design conversation ("is this brand-colour text label acceptable below AA?") rather than a code fix. Per the user's direction, B102 lineage closes here at 97.5% pass rate. Higher gain available later in a dedicated batch.

### Fixed — 2026-06-23 (B102 · A11y debt — first pass · 286 → 73 failures)

**Two token-layer fixes that closed 213 of the 286 a11y failures surfaced in B101.**

- **`--ink-mute` lifted to `#958b77`** (was `#897f6b`) across dark + hellenic + thelemic + light themes. The previous value measured 4.11:1 against `--bg-2 #1c1812`, just under WCAG AA's 4.5:1 floor. New values:
  - Dark base: `#897f6b` → `#958b77` (4.47 → 5.25 on `--bg-2`)
  - Hellenic: `#7c8474` → `#86907f` (4.49 → 5.24)
  - Thelemic: `#8c7b5e` → `#998964` (4.50 → 5.39)
  - Light: `#867b66` → `#665d4f` (3.67 → 5.69 — light mode was the worst offender)

- **Body `color` + `background` added to `theourgia.shared.css`**. The body rule had no `color` declaration, so any element that didn't explicitly inherit from a parent `color: var(--ink)` fell back to the browser default (`#000000`). This is how `festival-detail` and `resh-station-card` rendered with black headings on dark backgrounds (42 violations alone). Now the body establishes `color: var(--ink)` + `background: var(--bg)` so the cascade always has theme colours to inherit.

**Visual baselines re-captured** to reflect the new ink-mute (334 of 557 baselines materially regenerated; the rest had subtle anti-aliasing changes).

**Residual a11y failures (73 stories, B102b queue):**
- `color-contrast` — 98 remaining instances. Hardest cases: ink-mute on deeper chip backgrounds (`--bg-3` overlays computing to ~4.14), the `--fire` brand colour as text (4.08-4.33), and color-mix-derived greys (3.71-3.92).
- `aria-allowed-attr` — 83 (ARIA attributes on wrong roles).
- `target-size` — 74 (click targets < 24×24 px).
- `aria-required-parent` — 72 (`listitem` outside `list`).
- `target-offset` — 63.
- `non-empty-title` / `aria-label` / `aria-labelledby` — 54 each (icon buttons without accessible names).
- `presentational-role` / `non-empty-placeholder` / `implicit-label` / `explicit-label` — 43 each (form fields without explicit `<label>`).
- `label` — 15. `aria-input-field-name` — 5. `has-visible-text` — 3.

These are component-level fixes — each needs touching individual stories/components, not just tokens. Tracked as B102b+.

### Fixed — 2026-06-23 (B101 · Tool icons in sprite · TEST INFRA FIX — visual + a11y gates were broken)

**Critical infrastructure finding while refactoring tool icons.** While folding the 14 Tool Registry icons into the engraving sprite, I discovered every story screenshot in `tests/visual/storybook.spec.ts-snapshots/` was a render of Storybook's "No Preview · Sorry, but you either have no stories or none are selected somehow…" placeholder. The visual + a11y suites have been **non-functional for an unknown number of commits**: both passed because every story rendered the same blank stub.

**Root cause**: `npx serve`, used in both `playwright.visual.config.ts` and `playwright.a11y.config.ts`, performs a clean-URL redirect that strips `.html` AND the query string. So Playwright's request to `/iframe.html?id=X&viewMode=story` got `301 → /iframe`, and Storybook then rendered "No Preview" because no story id was selected.

**Fix**: swapped `serve` → `http-server` (doesn't redirect / rewrite). Added sprite injection to `.storybook/preview.tsx` so `<use href="#theo-*">` references resolve inside the Storybook iframe (the host applications inline the sprite via Vite + Astro plugins; Storybook had no equivalent).

**Now the gates are real**:
- **Visual**: 557 / 557 stories pass. Baselines for every story have been regenerated to reflect actual rendered content. Editor / Tarot / Chart / pickers / tool icons / hex stones all render correctly now.
- **A11y**: **286 / 557 stories fail axe-core.** This is real accessibility debt that was masked by the broken gate. Dominant rule violations:
  - `color-contrast` — ~1122 node instances. Many trace to `--ink-mute` (`#897f6b`) on `--bg-2` (`#21201e`), measuring 4.11:1 vs. WCAG AA's 4.5:1 floor. A token tweak likely closes most of these.
  - `non-empty-title` / `aria-label` / `aria-labelledby` — ~37 each. Mostly icon buttons + svg without accessible names.
  - `presentational-role` / `non-empty-placeholder` / `implicit-label` / `explicit-label` — ~28 each. Form fields without explicit `<label>` association.
  - `target-size` — ~20. Click targets <24×24 px.
  - `aria-allowed-attr` — 11. ARIA attributes on roles that don't permit them.

**Per the user's direction**, this commit ships the infra fix + the B101 tool-icon refactor; remediating the 286 a11y failures is its own batch lineage (B102+). The a11y suite is **expected red** going forward until B102+ closes it.

**B101 — Tool Registry icons folded into sprite**:
- 14 new `<symbol id="theo-tool-{kind}">` entries added to `tokens/theourgia-icons.svg`.
- `ToolKindIcon.tsx` rewritten from 14 inline switch arms (153 lines) to a single `<svg><use href="#theo-tool-{kind}" /></svg>` shell (50 lines). Stroke-width 1.3 + currentColor preserved on the outer SVG so the icons inherit caller styling consistently.
- The Glyph component (existing) follows the same pattern; tool icons are now first-class sprite citizens that any future surface can reuse.

### Added — 2026-06-23 (B100 · Cross-surface state for "Save as sigil")

**The B92 → B91 handoff carries the user's exact trace.** Clicking "Save as sigil" from the Magic Squares Trace mode now navigates to `/sigils?from=square&square=X&cells=N,N,N…`; the SigilGeneratorRoute reads the URL params and opens the surface directly in Kamea mode with the cell sequence honoured. The Toast copy adjusts to confirm the trace landed.

- `SigilPreview` gains an `cellSequenceOverride?: readonly number[]` prop. When supplied, Kamea mode draws this exact path instead of deriving one from the intention seed.
- `SigilGeneratorSurface` accepts `initialCellSequence?`. The override is cleared the moment the user touches the mode or intention — the trace is a starting hint, not a lock.
- `MagicSquaresRoute` builds the URL params on the way out. Custom squares show a `--warn` Toast and stay on the page (Kamea mode only accepts the 7 planetary squares; custom-kamea support is a follow-up).
- `SigilGeneratorRoute` reads + validates `from` / `square` / `cells` params via `useSearchParams`.
- New visual baseline: `SigilGeneratorSurface · kamea arrived from Magic Squares (cell sequence honoured)`.

Tests: 1722 / 1722 shared vitest passing (unchanged — no new test, behaviour covered by the existing kamea preview + new visual baseline). 557 / 557 visual + a11y baselines (+1).

### Added — 2026-06-23 (B99c3 · Interactive visibility chip + Sealed toggle · Live ChartPicker · CLOSES BATCH 35)

**Live `getChart` client method + admin wiring**: the ChartPicker now actually computes. `apiMethods.getChart({ when, latitude, longitude, house_system? })` hits `GET /api/v1/astro/chart` and returns the placements + houses + aspects + attribution. The admin Editor route provides a `fetchChart` to TiptapEditor that adapts the response into the `ChartSnapshot` shape stored on the chart node. Backend endpoint exists (live since Phase 03). The fixture returns a deterministic 7-body sample chart so dev/mock mode also draws a real wheel.

System options aligned: ChartPicker drops `"equal"` (backend supports `placidus | whole-sign` only). New endpoint test verifies the chart fixture returns the expected shape.



**The Visibility chip in the Editor topbar is now interactive end-to-end.** Click opens a popover containing the existing `VisibilityControl` (Personal · Viewer · Hub · Public) plus a Sealed toggle. Visibility changes optimistically update local state and PATCH `/entries/{id}` in the background. Raising to a more-public level opens `VisibilityDowngradeDialog` for confirmation; sealing opens `SealEntryDialog`.

- **Wire format alignment**: `EntryDetailRecord.visibility` now uses the shared `EntityVisibility` enum (`personal | viewer | hub | public`) — was previously a bespoke 3-value tuple. `CreateEntryInput` gains optional `visibility?` + `sealed?` so PATCH `/entries/{id}` accepts them. Fixture handler persists both into a per-entry meta store so subsequent detail reads see the new values; `publishEntry` likewise persists `published_at` so the chip stays consistent after publish.
- **`frontend/shared/src/api/index.ts`** — barrel exports `EntityVisibility`.
- **`frontend/admin/src/routes/Editor.tsx`** — replaces the static `VisibilityChip` with a live one composed of:
  - `<VisibilityControl>` (existing shared primitive)
  - `<VisibilityDowngradeDialog>` (existing shared primitive)
  - `<SealEntryDialog>` (existing shared primitive)
  - The dropdown is keyboard-accessible (`role="menu"` · closes on outside click)
  - Demo mode (no `:id`) disables the chip + cursor
- New endpoint test confirming `updateEntry({ visibility, sealed })` round-trips through `getEntryDetail`.

Tests / gates (all green):
- 1721 / 1721 shared vitest passing (+1 from new endpoint test).
- admin tsc --noEmit clean.
- 556 / 556 visual baselines (unchanged — no new stories).
- 556 / 556 a11y baselines.

**Batch 35 — Tiptap live integration — is now CLOSED.** Seven commits, B97 → B99c3. The Editor surface lives, persists, has 8 custom block nodes, 9 slash commands, 3 picker modals, an interactive visibility chip, sealed toggle, and Publish CTA with toast — all wired against the existing entries API.

### Added — 2026-06-23 (B99c · Entity + Library + Chart pickers · Publish toast)

**Three picker modals + Publish success/error toasts.** The Tiptap custom block NodeViews now summon their own pickers; data flows via the new `EditorDataProvider` context (admin populates `entities[]` + `books[]` + `fetchChart` from the API client).

- **`frontend/shared/src/Editor/EditorContext.tsx`** — `EditorDataProvider` + `useEditorData()` hook. Surfaces `entities` (for the EntityPicker), `books` (for the LibraryPicker), and `fetchChart(req): Promise<ChartSnapshot>` (for the ChartPicker). The TiptapEditor takes these as props and wraps its children in the provider.
- **`EntityPicker.tsx`** — modal opened from the EntityRefNode's "Pick entity…" / "Change entity" button. Search by name or alias; filter chips per kind; click row to populate `entityId / displayName / kind`. Empty-state copy when no entities are loaded yet.
- **`LibraryPicker.tsx`** — modal opened from the QuoteCitationNode's "Pick from library" button. Search by title / author / ISBN; filter chips per tradition. On select, formats `Author, *Title*, (Year)` and writes the citation into the node.
- **`ChartPicker.tsx`** — modal opened from the ChartNode placeholder. Form: kind (natal / horary / election) · datetime (UTC) · latitude · longitude · house system (placidus / whole-sign / equal). On Compute, calls `useEditorData().fetchChart(req)`; the returned `ChartSnapshot` is written into the chart node's `snapshot` attr. When `fetchChart` is undefined, the modal renders a `--warn` note + disabled Compute CTA so the form still mounts in tests / dev with no live wiring.
- **`useEntries.ts`** — admin gains `useEntities()` + `useBooks()` hooks that wrap the existing `listEntities` + `listBooks` API client methods.
- **Admin Editor route** — passes `entities = useEntities().data` + `books = useBooks().data` to TiptapEditor. ChartPicker's `fetchChart` is unset for now (live astro endpoint client method arrives in a later batch); the picker still mounts and shows its warn note.
- **Publish toast** — `Toast.push({tone:"success"})` on a successful publish; `tone:"error"` with the underlying message on failure. Replaces the earlier silent error path.

Tests / gates (all green):
- 1720 / 1720 shared vitest passing (+2 from `formatCitation` cases).
- admin tsc --noEmit clean.
- 556 / 556 visual baselines (+4: EntityPicker_Open · EntityPicker_Empty · LibraryPicker_Open · ChartPicker_Open).
- 556 / 556 a11y baselines (axe-core WCAG 2.2 A + AA).

Still queued for B99c-final (visibility chip):
- VisibilityChip becomes an interactive popover with `RungUpModal` (raise to Public) + `SealUnlock` (seal entry). The entry's `visibility` + `sealed` fields update via `updateEntry`. Currently the chip is static "Personal · Sealed".

### Added — 2026-06-23 (B99b · Editor persistence wiring)

**The Editor surface persists end-to-end.** Admin route `/editor/:id` mounts `TiptapEditor` against an existing entry's body, debounces auto-save (~1 s), and surfaces save status in the topbar (`Saving…` · `Saved · just now` · `Save failed · {reason}`). `/editor` (no id) stays in demo mode against the static seed document.

- **`frontend/admin/src/data/useEntries.ts`** — new hooks: `useEntryDetail(id | null)` (skips when null), `updateEntryBody(id, { body })`, `publishEntry(id)`.
- **`frontend/admin/src/App.tsx`** — adds `/editor/:id` route alongside the existing `/editor` demo route.
- **`frontend/admin/src/routes/Editor.tsx`** — rewritten to:
  - Read entry id from URL params.
  - Fetch detail via `useEntryDetail` (loading / error / data states).
  - Mount `TiptapEditor` with `initialDoc = JSON.parse(detail.body)` once loaded.
  - Debounce `updateEntryBody` on every editor change.
  - `SaveStatusIndicator` in topbar reflects the live state.
  - `PublishCta` calls `publishEntry(id)`; disabled when already published.
- **`frontend/shared/src/api/index.ts`** — barrel exports `EntryDetailRecord` + `UpdateEntryBodyInput`.

Tests: 1718 / 1718 shared vitest passing (+4 from B99a's 1714 — the increment comes from the new endpoint tests in `endpoints.test.ts`; admin route has no separate test suite per the existing pattern).

Still queued for B99c (final wave of Batch 35):
- Entity picker modal · Library picker modal · Chart picker modal.
- Visibility chip popover (Personal / Friends / Public · RungUpModal for public · SealUnlock for sealed).
- Toast on Publish success.

### Added — 2026-06-23 (B98 + B99a · Editor polish · chart + divination nodes)

**B98 — Block-kind dropdown.** Replaces the static "Paragraph" chip with a real `BlockKindMenu` (Paragraph · Heading 1/2/3 · Quotation · Code). `detectBlockKind` + `applyBlockKind` exported. Active row marked with `--accent`; closes on outside click + Escape.

**B99a — Chart + Divination Tiptap nodes.** Per the design decisions confirmed for B99 (parametric over reference · static result attrs · modal pickers later · auto-save + Publish):

- **`chart` Tiptap node** — stores `{ title, description, snapshot: { placements, houses, aspects } | null }`. When the snapshot is present, renders via the existing shared `<Chart>` component (Phase 03). When `null`, renders a friendly placeholder explaining that the picker arrives in B99b. Title + description are inline-editable.
- **`divination` Tiptap node** — stores `{ kind, seed, question, spread?, cards?, lines? }`. The reading is **immutable history**: the result is generated once at insert time, stored as static attrs, and never re-derived. Tarot body renders the drawn cards as a position-labeled row; I Ching body renders the cast hexagram as SVG lines (solid for yang, broken for yin) plus the King-Wen number + English name + Chinese name + pinyin.
- **3 new slash commands**: `/chart` (inserts empty) · `/tarot` (3-card spread with random deterministic seed) · `/iching` (six-line cast with random deterministic seed). The two divination commands compute the snapshot inline at insert time so the inserted block is already populated.
- **`pickTarotSnapshot(spread, seed)`** + **`pickIchingSnapshot(seed)`** — exported helpers (used by the slash commands today; the future pickers in B99b will use the same surface).
- Tests: 5 new vitest cases (tarot determinism · tarot variance across seeds · iching range + count · iching determinism · chart snapshot round-trip).

**Tests** at B99a close: 1714 / 1714 shared vitest · 552 / 552 visual + a11y baselines · admin tsc clean. Pre-existing typed-test errors in `ReceptionSelector.stories.tsx`, `SealUnlock.stories.tsx`, `Signing.test.tsx` predate this batch.

**Design decisions locked for B99b** (next batch):
- **Wire format**: `EntryDetailRecord` returned by `GET /api/v1/entries/{id}`. Lean `EntryRecord` stays on list endpoints.
- **Picker UX**: modal (matches `ElectionPickerModal` family from B93).
- **Node depth**: static result attrs (already in place for divination; chart picker will compute snapshot once + store).
- **Persistence cadence**: debounced auto-save (~1 s) + explicit Publish CTA for state transitions.

### Added — 2026-06-23 (B97 · Tiptap live integration · Batch 35 wave 1)

The Editor surface (`Theourgia Editor.dc.html`) lifts from a design-fidelity static port to a **live Tiptap 3 editor** with six custom block nodes wired end-to-end. Custom blocks shipped: `ritualLog` · `quoteCitation` · `gematria` · `sensation` · `entityRef` · `sigil`. Chart + Divination nodes + Library/Entities pickers + `/api/v1/entries` persistence are queued for B98/B99.

- **`frontend/shared/src/Editor/`** new shared module:
  - `TiptapEditor.tsx` — composes Toolbar + EditorContent + SlashMenu; surfaces `initialDoc` + `onChange` for round-trip via Tiptap JSON.
  - `Toolbar.tsx` — Paragraph/Heading chip · Bold · Italic · Small-caps · Link · inline language chip (EN · ΕΛ · עב) · Insert-block CTA. Marks fire live against `editor.chain()`.
  - `SlashMenu.tsx` — popover positioned at the typed `/`, arrow-key + Enter + click navigation, query filter against title + key.
  - `slashCommands.ts` — six commands (`/sigil` · `/quote` · `/gematria` · `/sensation` · `/entity` · `/ritual`). Each `run()` deletes the slash range and inserts the corresponding node with default attrs.
  - `extensions.ts` — `buildExtensions({ placeholder })`: StarterKit (with link config) + Placeholder + LangMark + SmallCapsMark + the 6 custom block nodes.
  - `lang.ts` — `LangScript` + `LANG_FONT` token map (extracted to keep the dependency graph one-way).
  - `nodes/` — six React-NodeView Tiptap nodes (ritualLog · quoteCitation · gematria · sensation · entityRef · sigil). Each has `parseHTML` + `renderHTML` for round-trip, an `addNodeView` returning a `ReactNodeViewRenderer` view, and inline editing UI when `editor.isEditable`.
  - `Editor.test.tsx` — 14 tests covering catalog shape · filter behaviour · schema registration · slash-command insertion of every kind · gematria Greek + Hebrew sums · JSON round-trip preservation (ritualLog entries · gematria word + script · `lang` mark).
  - `Editor.stories.tsx` — 5 visual baselines (seeded doc · empty placeholder · read-only · slash menu open · slash menu filtered).

- **`frontend/shared/src/index.ts`** — barrel exports the new `Editor/` module.

- **`frontend/admin/src/routes/Editor.tsx`** — replaces the static design-fidelity port with `TiptapEditor` composed against the same `Invocation of the Agathos Daimon` seed document so the surface still reads like the designer's example, but every block is now live and editable. CSS lives inline to scope the ProseMirror typography to `.theourgia-editor`.

- **Gematria computation utility** — `gematriaBreakdown(word, script)` + `gematriaSum(word, script)` exported. Greek isopsephy + Hebrew gematria value tables; final-form letters normalised (ך → 20, ם → 40, etc.); diacritics stripped before lookup; characters not in the table are skipped.

- **Round-trip story** — every Tiptap JSON document containing the 6 custom blocks survives `getJSON()` → `setContent()` with attrs intact. Inline `lang` marks on text spans round-trip with the script attribute preserved.

- **Dependencies added**: `@tiptap/react@3` · `@tiptap/core@3` · `@tiptap/pm@3` · `@tiptap/starter-kit@3` · `@tiptap/extension-placeholder@3` · `@tiptap/suggestion@3`. `@tiptap/extension-link` was added then dropped in favour of StarterKit's bundled link extension to avoid the duplicate-extension warning.

**Tests**: 1705 / 1705 shared vitest passing (+14). Visual + a11y baselines for the 5 new Editor stories ship with the commit.

**Follow-ups**:
- B98 (next) — wire the slash menu's `/` trigger to live keyboard input (currently the catalog exists + insertion works; the "/" trigger logic in TiptapEditor still needs polishing for nested-block scenarios).
- B99 — Chart + Divination nodes; entity / library pickers; persistence to `/api/v1/entries`; live Publish CTA.
- The 14 Template-Designer block kinds beyond the editor's 8 (`calendar-stamp` · `vox-magicae` · `voice-recording` · `correspondence` · `heading` / `paragraph` / `list` / `quote` / `code` already handled by StarterKit · script chips for greek / hebrew / latin / sanskrit handled by the LangMark) are queued as the Template Designer surfaces them, not the Editor's own slash menu.

### Added — 2026-06-22 (H05 sprint COMPLETE · Phase 07 Workshop frontend · Tier 3 closed)

The H05 frontend sprint closed today. Eight batches (B89-B96) against the H05 designer handoff at `/home/sophia/design-handoffs/theourgia/2026-06-22-H05/handoff_H05/` ported the six Phase-07 Workshop surfaces. Phase 07 was designer-first by design: the `.dc.html` files inform the schema; backend (Alembic + `/api/v1/sigils|magic-squares|talismans|circles|tools|altars|voces`) lands in a follow-up sprint.

**Foundations — B89-B90** (`757b7e9`, `c193875`):

- **B89 — VaultNav extension + scaffolding**: Renamed `sigil` → `sigils`, `circle` → `circles`; relabelled `talismans` → "Talisman Designer"; added 3 new nav keys (`magicsquares` · `tools` · `voces`) with verbatim H05 SVG glyphs. Admin route placeholders for the new keys. 13 new VaultNav tests + 6 new storybook stories.
- **B90 — Workshop SVG engines**: 6 pure-TS modules under `frontend/shared/src/workshop/`:
  - `magicSquares.ts` — 7 Agrippa 1531 planetary fixtures in sacred Saturn→Moon order + Siamese (odd) + doubly-even (n%4=0) constructors + `magicConstant(n) = n(n²+1)/2` + `isValidMagicSquare`.
  - `hebrew.ts` — `hebNum(n)` with the traditional scribal substitutions for 15 (טו, not יה) and 16 (טז, not יו).
  - `evalFormula.ts` — sandboxed expression evaluator for the Sigil Generator's parametric mode. **No eval, no Function, no property reads, no subscripts.** Tiny tokenizer + recursive-descent parser. Whitelist: sin · cos · tan · sqrt · pow · log · abs · exp · floor · ceil · round · min · max · π · e · g · θ · t. Returns `{ ok, value } | { ok: false, error }` — never throws. Verified rejects: window · alert · Math.PI · arr[0] · eval · Function · setTimeout · require.
  - `sigil.ts` — `hashSeed(text, salt)` (SHA-256 via SubtleCrypto with deterministic fallback) · `mulberry32` PRNG · `sigilCurve({ family, seed, points })` for 4 parametric families (rose · lissajous · harmonograph · polar) · `spareLetters(intention)` (Austin Osman Spare vowel-strip + dedup) · `sigilGlyph(intention)` (polyline through letter centroids) · `sigilKamea(cells, valueSequence)` (polyline through magic-square cell centres).
  - `geometry.ts` — `nameRingPath(radius)` returns `d` + `circumference = 2π·r` (the textLength gotcha solved) · `centreSymbol(kind, cx, cy, r)` for pentagram · hexagram · unicursal hexagram · solomonic seal · blank · `printTiles(widthMm, heightMm)` decomposes into A4 portrait tiles with 5mm bleed + 10cm calibration flag.
  - `workshop.test.ts` — 71 tests covering fixture verification + sandbox safety + curve determinism + Hebrew substitutions + geometry helpers.

**Surfaces — B91-B96**:

- **B91 — Sigil Generator** (`c58ffee`): Three-pane composition (240px mode rail · centre with config + 480 preview + operations toolbar · 300px "What this sigil carries" rail). 11 modes in fixed order. ChargeSaveDialog · SigilLibraryPanel · OwnedDeckOverlay (verbatim `--warn` "never shareable, never exportable; cleared on reload" copy). Citation chrome (`‡`) per mode for PD sources (Spare 1913 · Agrippa 1531 · Golden Dawn · Mispar Hechrachi · Greek isopsephy). 51 tests · 20 storybook stories.
- **B92 — Magic Squares** (`b611852`): Two-pane (260px planetary + custom rail · main with View/Trace/Build toolbar + square SVG + Agrippa citation card). The seven planetary squares are **immutable fixtures**; Build mode disabled when active. Trace mode's "Save as sigil" forks to B91 Kamea mode (never mutates source). Composes B90 `PLANETARY_SQUARES` + `magicSquare(n)` + `hebNum`. 28 tests · 11 stories.
- **B93 — Talisman Designer** (`42053c9`) — **the H05 §E worked example**: Four-zone (topbar with Front/Back tablist · 280px layer rail · 600 canvas with snap guides + grid · 340px metadata rail). 6 layer kinds. ElectionPickerModal (composes B60 saved windows) + SealedSaveDialog with `--seal` switch (B54 client-side encryption discipline; defaults on when Initiation working is linked). Composes B92 Jupiter kamea + B90 nameRingPath via `<textPath textLength={2π·r} lengthAdjust="spacing">` for even Hebrew name-ring distribution. 40 tests · 18 stories.
- **B94 — Magical Circle** (`06cced3`): Three-zone (rings/compass rail · live circle SVG · ring-config + centre + footer rail). 1-6 rings × 5 ring kinds (Inscription · Glyph row · Single image · Blank · Multi-glyph). **Single-tradition compass** (Archangels · Greek winds · Watchtowers · Vedic dikpalas · Custom) — Watchtowers colour cardinals via `--earth/--air/--fire/--water`; other traditions render `--ink`. 7 centre elements via B90 `centreSymbol`. Print-tile mode overlays A4 crop marks + 10cm calibration. PD preset library (LBRP · Heptameron · Goetic · Picatrix · Greek defixiones) loads as mutable copies with no back-link. 39 tests · 14 stories.
- **B95 — Tool Registry**: List-and-detail composition mirroring B65 Library. 14 fixed tool kinds (`ToolKindIcon` component — fold-into-sprite tagged for follow-up). Tools card grid + Altars list view toggle. ToolDetailDrawer (560px) with 7 sections (Photos · Identity · Materials & dimensions · Provenance · Consecration · Use history · Current location). Consecration pill uses `--care*` palette only. Load-bearing honesty copy verbatim: *"Status follows the record — a tool is consecrated by linking the working where it happened, never by a switch."* No decoupled "Mark consecrated" toggle. 29 tests · 9 stories.
- **B96 — Voces Magicae Recorder**: Vertical list (not card grid). Tradition filter (8 options). VoceDetailDrawer with hero text + transliteration + IPA + ‡ citation + Associations + Recordings + Used-in-workings sections. Verbatim wellbeing copy when no recording: *"No recording yet — sound it when you are ready, in your own voice."* NewVoceModal with 8-step form. **Save disabled until citation is non-empty** (honesty rule); citation-empty chrome uses `--accent` border (NEVER `--danger`); verbatim footer note: *"A voce cannot be saved without its source citation."* 6 PGM-era demo voces (ΙΑΩ · ΑΒΛΑΝΑΘΑΝΑΛΒΑ · ΒΡΙΜΩ · ΑΣΚΕΙ ΚΑΤΑΣΚΕΙ · ΣΕΜΕΣΕΙΛΑΜ · ΦΩΡ ΦΩΡΒΑ). 31 tests · 8 stories.

**Cross-cutting H05 rules honoured across all six surfaces**:

1. **Everything renders SVG.** PNG/PDF/DXF/audio are export formats only.
2. **Committed-make + read-only-on-reopen.** Charge & save dialog on Sigil + Talisman; "Edit a new version" forks a new row (preserved via parentSigilId / parentTalismanId).
3. **Derived-not-stored geometry.** The talisman is a composition of references (squareId + sigilId[]) — never a flattened bitmap. The name-ring textPath uses textLength to distribute Hebrew names evenly (the recurring gotcha solved at the engine layer in B90).
4. **Citation chrome on traditional artefacts.** ‡ badge on Spare 1913 · Agrippa 1531 · Golden Dawn · PGM · Heptameron 1496 · Picatrix · Apollonius Argonautica III. Custom artefacts carry none.
5. **Honesty rules** (Workshop equivalent of H04's symmetric-rune rule):
   - Tool consecration set ONLY by linking a working — no decoupled toggle.
   - Seven planetary squares immutable — Build disabled; "Save as sigil" forks.
   - Voce Save gated on non-empty citation — required note rendered verbatim.
   - PD presets load as mutable copies with NO back-link.
6. **Quiet stats.** "Used in N workings" everywhere is muted `--ink-mute`; no celebration, no badges.
7. **`--danger` audit clean.** Zero uses across the entire H05 sprint. Required-citation chrome uses `--accent` border; consecration pills use `--care*` care palette; sealed talismans use `--seal*`; the formula evaluator's invalid-formula error uses `--warn` (already promoted from H02 inline use).

**Sprint totals**: 8 batches (B89-B96). 1691 vitest tests (1389 → 1691; **+302** over the sprint). Storybook visual + a11y baselines grow ~+90 (final count locks at sprint close). Backend unchanged at 1473.

**Follow-ups noted in commits**:
- Fold the 14 Tool Registry kind icons into `tokens/theourgia-icons.svg` as `<symbol>`s (designer's §S6 note #2).
- Add a true "bezier" curve generator to `sigilCurve()` — B91 currently maps the design's "Bézier" picker chip to `polar` at render.
- Phase 07 backend (Alembic models + REST routes + Mode B encryption for sealed talismans). Surface chrome promises ciphertext-only; the storage layer needs authoring.
- Cross-surface state for the B92 → B91 "Save as sigil" handoff (currently navigates; should also pre-fill the Kamea mode with squareId + cellSequence).

**Next**: docs alignment (this commit), then either Batch 35 (Tiptap live integration — unblocked) or the next designer handoff queue (H06 — Tier 4 Linguistic + Analytics).

### Added — 2026-06-22 (H04 sprint COMPLETE · Phase 06 frontend + Daily Practice Tracker · Tier 1 + Tier 2 closed)

The H04 frontend wiring sprint closed today. Every Phase-06 backend engine shipped in B44-B49 now has its designed surface, and the cross-cutting Daily Practice Tracker (Tier 1) ships in the same arc. Eleven batches (B76-B86) against the 24-file H04 designer handoff at `/home/sophia/design-handoffs/theourgia/2026-06-22-H04/handoff_H04/`.

**Foundations — B76-B77** (commits `13189ee`, `58592da`):

- **B76 — Tokens + OracleTabs**: New tokens added to `tokens/theourgia.tokens.css` — `--skip` / `--skip-soft` (care palette for the Daily Practice "skip is information" channel) · `--trance` (with `hellenic`/`thelemic`/`light` overrides for the Scrying trance link) · `--font-cjk` (I Ching · Wilhelm/Baynes hexagram names) · `--font-rune` (rune labels) · `--ot-*` family for OracleTabs (tarot · iching · geomancy · runes · more). New `OracleTabs` primitive (5 horizontal tabs; `LinkComponent` prop adapted via `NavLinkAdapter` per the existing BeingsTabs pattern) lives at `frontend/shared/src/OracleTabs/`. 16 tests, 7 stories.
- **B77 — VaultNav extension**: Added `dailypractice` + `practicelogs` NavKeys + SVG glyphs (verbatim from `.dc.html` lines 26-27 of each surface). Practice section is now `today · journal · synchronicities · dailypractice · practicelogs`. Divination route repointed: `/divination` → `/divination/tarot` (the surface picks an oracle by default rather than landing on a hub). 6 new regression tests.

**Headless engines — B78-B79** (commits `dea3e36`, `932e2e0`, `abc182b`, `93439d8`, `6db2ebb`):

- **B78a — Geomancy engine**: `GEO_FIGURES` (16 keys), `GEO_MEANINGS`, `GEO_ATTRIBUTIONS`, `figureName()`, `combine()`, `deriveShield()`, `generateMothers()`. 22 tests. The worked-example discipline ("only Mothers are state; daughters/nieces/witnesses/judge are derivations") is enforced by tests; deriving on every render avoids the cascade-drift bug from §E of the H04 supplement.
- **B78b — Runes engine**: `ELDER_FUTHARK` (24 staves), `SYMMETRIC_RUNES` (9 — Gebo · Hagalaz · Isa · Jera · Eihwaz · Sowilo · **Mannaz** · Ingwaz · Dagaz; the design supplement enumerates 8 but the mockup dataset marks Mannaz as the 9th rotationally symmetric stave; **data wins** per the "port the accurate mockups; don't re-derive" rule), `drawRunes()`, `layoutForSize()` (1/3/5/9 spreads). 20 tests, including the H04 §S3.5 honesty test (merkstave forced false for every symmetric stave; symmetric callout always rendered).
- **B78c — I Ching engine**: `TRIGRAMS`, King Wen 8×8 matrix, `HEX_NAMES_CN` / `HEX_NAMES_PINYIN` / `HEX_NAMES_EN`, `hexagramNumber()`, `transformation()` (changing lines → second hexagram), `castLine()` with distinct coin/yarrow odds (yarrow's 5/16 · 7/16 · 3/16 · 1/16 vs coin's flat 4ths). 33 tests.
- **B78d — Tarot engine**: 78-card Rider-Waite-Smith deck (Pamela Colman Smith 1909, PD), 5 built-in spreads (single · three-card · Celtic Cross · Tree of Life · Year Ahead), `drawSpread()`. 21 tests.
- **B79 — Misc + Practice helpers**: `divination/pendulum` (calibration interface + 4-state PendulumAnswer), `divination/bibliomancy` (`BIBLIOMANCY_METHODS` + `bibliomancyOpen()`), `divination/horary` (`HoraryChart` + `HORARY_STEP_ORDER` string union: sect · querent · quesited · perfection · reception), `practice/treeOfLife.ts` (22 paths verbatim + 10 sephiroth layout), `practice/streak.ts` (`streak(history, todayStatus)` + `countKept()` — pending counts toward the prior streak, never resets it). 51 new tests.

**Tier 1 — Daily Practice Tracker** (commit `5ec138a`):

- **B80 — Daily Practice Tracker**: 7 components under `frontend/shared/src/DailyPractice/` — `StreakGrid35` · `Last7DaysDots` · `PracticeStatusIcon` · `TodayStatusChip` · `PracticeCard` · `DefinePracticeDrawer` · `DailyPracticeTracker`. The load-bearing wellbeing copy ships verbatim: `PRACTICE_STATUS_SUB.skipped = "A skip is information, not a failure. The record holds it plainly."` Admin route wired at `/daily-practice` via `DailyPracticeRoute.tsx` with deterministic 35-day mock history until the API endpoints land. 34 tests.

**Tier 2 — Phase 06 Divination surfaces — B81-B85**:

- **B81 — Tarot surface** (commit `26a9317`): `TarotCardFace` · `SpreadBoard` · `DeckPicker` · `SpreadPicker` · `QuestionBanner` · `CardReadingRail` · `TarotHistoryRow` · `TarotSurface`. Reading-rail pattern shared across Tarot · I Ching · Runes (two states: drawn vs ready/empty). Reversed cards use the gentle ⟲ glyph, **never red**. 40 tests, 17 stories.
- **B82 — I Ching surface** (commit `3177d8d`): `HexagramColumn` (yang solid bar / yin split / changing dot) · `MethodPicker` (coin vs yarrow) · `HexagramHeading` · `ChangingLinesPanel` · `IChingSurface`. Subtitle "易經 · the Book of Changes — cast six lines, read what moves" via `--font-cjk`. Wilhelm/Baynes 1923 citation surfaces via the ‡ badge from B54's Signing primitives (cross-cutting citation chrome pattern). 34 tests.
- **B83 — Geomancy surface** (commit `66e63e4`): `GeoFigureView` · `MotherCell` · `GeoShield` · `GeoHouseChart` · `GeoVerdict` · `GeomancySurface`. The H04 §E worked example: only the four Mothers are state; `deriveShield()` runs on every render — daughters · nieces · witnesses · judge · reconciler · 12-house chart are all derivations. **Carcer · Rubeus · Cauda Draconis render NEUTRAL** — the difficulty lives in the meaning text, never in the chrome. 30 tests.
- **B84 — Runes surface** (commit `ed289aa`): `RuneTile` · `RuneBoard` · `RuneSizePicker` · `RuneReadingRail` · `RunesSurface`. The symmetric-stave honesty callout — `"A symmetric stave — it reads the same upright or turned. It has no merkstave; none is shown."` — ships verbatim. **Nauthiz/Hagalaz render NEUTRAL** (difficulty in the meaning, not the chrome). Old English + Norwegian rune poems cited via ‡ badge. 33 tests.
- **B85 — Divination Misc** (commit `44853e5`): The four lighter methods (`pendulum` · `bibliomancy` · `horary` · `scrying`) clustered under the OracleTabs "More" entry via an in-page `role="tablist"` (§S7.2 design decision). `MethodTablist` · `PendulumDial` (SVG rotated per answer: Yes 22° · No -22° · Maybe 6° · Unclear 0°) · `HoraryWheel` (12-house whole-sign chart; "Hellenistic horary · whole-sign houses" caption) · `Speculum` (180×180 scrying disc with per-medium radial gradient) · 4 sub-panels + surface. Pendulum calibration note + horary's 5-step provisional verdict + scrying's "Don't interpret yet" placeholder all verbatim. 44 tests.

**Tier 2 — Practice Logs cross-cutting surface — B86** (commit `984c3ff`):

- **B86 — Practice Logs**: Four practice logs clustered under the Practice nav section (NOT under OracleTabs — these are not divinations). In-page `role="tablist"` switches between Dream · Pathworking · Āsana & breath · Banishing. `DreamPanel` (textarea + symbol/figure chips + Felt sense + Lucid switch + recent rail) · `PathworkingPanel` (10-sephiroth + 22-path Tree of Life SVG with click-to-select edges; Hebrew letter · Tarot trump · attribution · route; composes B79's `TREE_OF_LIFE_PATHS`) · `AsanaPanel` (āsana + breath ratio + 46px monospace timer with `useEffect` interval ticker; quiet stats "41.5 hours · 88 sessions kept" never gamified) · `BanishingPanel` (rite select + time + **Seal toggle** + note + recent log; the Seal toggle is the cross-cutting client-side-signing UX from H01-H03). The two help-text copies are load-bearing:
  - **OFF**: "Banishing entries are stored as plain text by default. Turn on Seal for any you want kept encrypted."
  - **ON**: "This entry will be encrypted on this device. The server stores only ciphertext — it cannot read the rite or the note."
  Care palette throughout (`--seal*`); **zero `--danger` uses** on this surface — opting into encryption is a positive affordance, not a danger. Admin route wired at `/practice-logs`. 45 tests.

**Cross-cutting H04 rules honored across all surfaces**:

1. **Divination tone** — Tower · Hexagrams 23/36 · Carcer/Rubeus/Cauda · Nauthiz/Hagalaz all render neutral; difficulty lives in the meaning text only. Verified by explicit per-surface tests.
2. **Ritual-draw moment** — no "click to flip" mechanics; the spread / cast / draw produces a single committed moment.
3. **Citation chrome** — Wilhelm/Baynes (I Ching) · Waite 1911 (Tarot) · Old English & Norwegian rune poems (Runes) all surface as ‡-badged PD citations.
4. **Quiet streaks** — practice tracking shows cumulative numbers but never compares to peers, never grades, never gamifies.
5. **Symmetric-rune honesty** (§S3.5) — engine forces merkstave false for the 9 rotationally symmetric staves; surface always renders the callout.
6. **Client-side signing UX** — surfaced via the Banishing Seal toggle; ciphertext-only promise copy verbatim.

**Sprint totals**: 11 batches (B76-B86). 1389 vitest tests (960 → 1389; **+429** over the sprint). 460 visual + 460 a11y baselines (360 → 460; **+100**) — all green. Six new tokens. 7 headless engines + Tree of Life + streak helpers. 7 designed surfaces. Backend unchanged at 1452.

**Next**: docs + memory alignment (this commit). Then either Batch 35 Tiptap (still pending) or the next designer handoff queue (H05 — Phase 07 Workshop, Phase 08 Linguistic, Phase 09 Analytics) when capacity allows.

### Documentation — 2026-06-22 (design handoff request opened)

With the H01-H03 sprint closed, the next sprint is design-blocked. Opened a single comprehensive design request enumerating every surface that needs designer pickup before further frontend work can land:

- **Tier 1 — Daily Practice Tracker** — self-designed ritual companion to Liber Resh. Composes existing B59 primitives (ReshStreakGrid, ReshStationCard, ReshNextAdoration, SunArcDiagram).
- **Tier 2 — Phase 06 Divination & Practice** — 6 `.dc.html` surfaces covering 9 backend engines already shipped in B44-B49 (Tarot · I Ching · Geomancy · Runes · Pendulum/Bibliomancy/Horary/Scrying cluster · Practice logs cluster).
- **Tier 3 — Phase 07 Workshop** — 6 surfaces (Sigil generator · Magic squares · Talisman designer · Magical circle builder · Tool registry · Voces magicae recorder). Backend not yet started — design lands first, build follows.
- **Tier 4 — Phases 08 + 09** — 5 + 5 surfaces (Linguistic Tools · Synchronicity & Analytics). Design queued when capacity allows.
- **Tier 5 — Phases 10-16** — long arc, scoped for awareness.

Full request: [`docs/design-requests/2026-06-22-post-h01-h03-pipeline.md`](docs/design-requests/2026-06-22-post-h01-h03-pipeline.md). Cross-cutting standing rules carried forward (token-first, `--danger` reserved for Visibility → Public only, tradition-neutrality, sealed-content discipline, wellbeing tone). Open questions for the designer captured in §"Open questions" of that doc.

README + FEATURES updated to mark Phases 06-09 as 🎨 design-blocked with links into the relevant tier of the request.

### Added — 2026-06-22 (H01-H03 sprint COMPLETE · Phase 05 primitive coverage closes the sprint)

The H01-H03 frontend wiring sprint closed today. Phases 03 / 04 / 05 frontend coverage is end-to-end against the existing backend. 71 shared primitives across 22 modules; 960 vitest tests; 360/360 visual regression + 360/360 axe-core WCAG 2.2 A+AA — all green.

**Phase 05 cluster — B67-B75** (commits `54cdcbe`, `1f39983`, `0c5d590`, `ab9e84f`, `7023c34`, `75e8eff`, `d7753bf`, `78bbd43`, `389057e`):

- **B67 Entities REBUILT** — `BulkActionBar` (sticky pill bar with `role="region"`, aria-live count; reusable on Library + Visibility + Aliases surfaces).
- **B68 Offerings** — `OfferingTimelineCard` (time + entity + reception pill + item chips + intention + AutoStamp; activates as `role="button"` when `onOpen` provided), `ActivePracticeCard` (label + cadence + due chip + pause switch + Record), `OFFERING_ITEM_META` (14 kinds in liquid / solid / body / time), `RECEPTION_META` (5 levels), `offeringCategoryColor()`.
- **B69 Contracts** — `ContractListItem` (with bindingGlyph slot + status dot + optional nextDue footer), `ContractStatusPill` (6 states; **breached uses `--cs-breached`, NOT `--danger`**).
- **B70 Oaths** — `OathCard` (sealed-by-default with `onRequestUnlock` + `unlockedForSession` props; SealedCTA when locked, italic vow text when unlocked; optional checkpoint footer), `OathStatusPill` (5 statuses; broken + renounced use care palette).
- **B71 Initiations** — `InitiationListItem` (sparse sidebar with lock glyph + tradition + Sealed sublabel + status chip + optional Disclosed footer), `InitiationStatusPill` (4 statuses), `SealedContentsBlock` (full-bleed CTA with verbatim default editorial body: "The grade, the date received, the place, who gave and witnessed it, and your notes are encrypted with a key only your client holds. The server cannot read or recover them.").
- **B72 Servitors** — `ServitorListItem` (caller-supplied sigil slot + name + kind label + status chip + optional feed-elapsed footer with `--warn` clock when overdue), `ServitorStatusPill` (4 statuses; decommissioned in muted lavender, NEVER red), `ServitorTaskCard` (4 task statuses; abandoned uses `--ts-abandoned`).
- **B73 Aliases** — `EdgeKindLegend` (rail legend for the five `AliasEdgeKind` variants; uses metadata-driven label + description + directional glyph; supports `kinds` subset prop). `AliasGraph` was already shipped in B55.
- **B74 Attestations** — `AttestationKindBadge` (24×24 small / 40×40 large; colour drawn from `--at-*` token mixed 15% into transparent), `AttestationListItem` (sidebar row with kind badge + uppercased kind label + Revoked pill + subject + description + footer with sig-count + visibility + granted-at). Seven new tokens: `--at-initiation` · `--at-grade-granted` · `--at-membership` · `--at-teacher-student` · `--at-ordination` · `--at-authorship` · `--at-other`. Revoked uses `--revoke`, NEVER `--danger`.
- **B75 Today ledger** — `TodayLedgerCards` (composes the four Phase-05 Today rail cards from a `TodayLedger` payload: active practices · obligations · servitor feeding · attestation activity). Sealed-checkpoint count surfaces as `--seal-soft` callout with zero plaintext leak. Empty states are calm prose. **Wired into admin Today.tsx via `useApiCall(getTodayLedger)`.** Also: `TodayLedger` + 10 supporting types added to `api/types.ts`; `getTodayLedger()` method on `endpoints.ts`; realistic fixture in `defaultFixtures` (Hekate + Brigid practices, one contract obligation + sealed checkpoints, overdue servitor feed, recent counter-sign).

**Cross-cutting rule reinforced**: `--danger` is reserved formally at code level for Visibility → Public (B63). Every other "negative" state in Phases 04 + 05 uses care-palette tokens: severed, broken, dissolved, abandoned, lent-out, decommissioned, breached, revoked — all NEVER red.

**Sprint totals**: 71 primitives shipped across 22 modules. 960 vitest tests (339 → 960; +621 over the sprint). 360 visual + 360 a11y baselines, all green. Backend unchanged at 1452.

**Next**: Daily Practice Tracker (awaits designer handoff), Phase 06 frontend surfaces (engines already shipped in B44-B49), Batch 35 Tiptap (unblocked by B61).

### Added — 2026-06-22 (H01-H03 sprint · Phase 04 primitive coverage complete)

Phase 04 primitive coverage closed today with B66 Export — folds in the long-pending **Batch 36 (Print + bulk export)**, which the new ExportFormatPicker + SealedExportNotice + ExportPreview trio now supplies the load-bearing atoms for.

**Phase 04 surfaces — B61-B66** (commits `47f5a3a`, `aaf8147`, `c937494`, `8897d2b`, `073c8f9`, `4de41cb`):

- **B61 Template Designer** — `BlockGlyph`, `TemplateBlockCard`, `TemplateBlockPalette`, `TemplateTokenChip` + the 20-kind block catalog (magick / format / mark, with `--magick` / `--format` / `--mark` token families added). Unblocks the long-deferred **Batch 35 (Tiptap live integration)** which can now wire against a finalised block taxonomy instead of moving targets.
- **B62 Search** — `HighlightedText`, `SearchHitCard`, `SealedExcludedCallout` + `highlightSegments()` helper. The sealed-excluded callout is the canonical UI for "sealed entries weren't searched — the server can't read their contents."
- **B63 Visibility** — `VisibilityControl` (4-pill segmented control with `onChange` for raising privacy + `onRequestDowngrade` for lowering), `VisibilityDowngradeDialog` (severity escalates by target — viewer = constructive, hub = warn, public = danger), `SealEntryDialog` (type-to-confirm zero-knowledge sealing). This batch formalises the cross-cutting rule: **`--danger` is reserved for the Visibility → Public step.** No other negative state in Phase 04 / 05 uses red.
- **B64 Library REBUILT** — `BookRow`, `BookStatusBadge`, `QuoteCard`, `ReadingListCard` + the editorial constants (`BOOK_STATUS_META` / `traditionSpineColor` / `readingListProgress`). Replaces the original B31 catalog work per the H03 supplement.
- **B65 Body Sensation surface** — `SensationTypeGrid` (the 12-cell picker extracted as its own atom; surfaces compose it in both the marker-config panel and the no-selection "Place a sensation" prompt) and `BodyMarkerLegend` (right-rail legend list with view chip + intensity + truncated note).
- **B66 Export** — `ExportFormatPicker` (2×2 radiogroup of PDF / Markdown / HTML / EPUB with editorial captions; supports `EXPORT_BOUND_FORMATS` subset for bound-volume mode) and `SealedExportNotice` ("Sealed entries are never exported" — distinct phrasing from B62's "may also match" because Export omits them, intentionally).

**Phase 03 surfaces — B56-B60** (commits `587a6e5`, `c347181`, `8fc9663`, `99e9f74`, `11325e5`, `beb60eb`):

- **B56 Today Widgets** — `MultiCalendarCard` (family-grouped collapsible widget with normal / loading / empty / error states) and `LunarPhaseWidget` (parametric SVG moon with terminator-ellipse math in `moonPath.ts`, 8-cell phase cycle rail, hemisphere toggle). Today.tsx wiring landed in `c347181` — replaces the simpler `LunarPhaseCard` with the bigger embed.
- **B57 Planetary Hours** — `PlanetaryHourStrip` (proportional 24-cell strip where each cell's flex-grow is its true length in minutes) and `PlanetaryHourDetail` (selected-hour card with color strip + ordinal + favours chips + verbatim rulership notes). The strip's NOW marker positions at the sunrise-anchored fractional time; polar fallback uses even 60-minute hours from midnight.
- **B58 Calendar** — `MonthGrid` (pure 5×7 layout with today highlight + single-day festival chips + multi-day bar overlays in a reserved lane), `FestivalDetail` (selected-festival card with tradition-color strip + citation chain), `CitationKindBadge` (‡ / ❖ / ✦ for primary / scholarly / community sources), `FestivalTraditionChip` (filter pill with `soon` state for Hindu / Egyptian).
- **B59 Liber Resh** — `ReshStationCard`, `ReshStreakGrid` (heatmap-style record, never red), `ReshNextAdoration` (hero card), `SunArcDiagram` + the canonical Liber CC adorations data (`resh.ts` — verbatim Crowley 1911 PD).
- **B60 Election Finder** — `ProductScoringCallout` (the "every constraint is decisive — one fail → zero" explainer, verbatim copy), `ElectionResultCard` (collapsible result with rank chip + score bar + per-constraint breakdown), `ElectionRecipeCard` (recipe gallery tile). New `--fail` token (aliases `--danger`, distinct semantic name for "this election failed the constraint").

**EntityKind type consolidation** (commit `60d941f`): backend already had all 17 entity kinds since B37; frontend `api/types.ts` was stale at the 6-kind Phase 02 snapshot. Widened the canonical type to match the backend, and added `EntityRelationshipStatus` / `EntityAliasKind` / `EntityVisibility` as string-literal unions matching the backend enums. B55's temporary `EntityKindUI` alias is collapsed.

**B54 visual baselines committed** (`aa5906e`): 11 Storybook stories for the Signing UX family that shipped without gates in the prior session.

**Tokens added this sprint** (cumulative): `--moon-light` / `--moon-dark` (B56) · `--arc-day` / `--arc-night` already existed · `--sun-warm` / `--sky` (B59) · `--fail` (B60, aliases `--danger`) · `--magick` / `--format` / `--mark` (B61). The full B50 sweep (`--st-*`, `--g-*`, `--fest-*`, `--paper-*`, `--skin-*`, `--edge-*`, `--c-entity`, `--hit-*`, `--vis-*`) was already in place.

**Test counts**: backend unchanged at 1452. Frontend shared: 808 (+433 vs. session open). Visual regression + a11y: 310/310 on both gates. Admin tsc clean.

**Remaining sprint queue**: B67 (Entities REBUILT) → B68 Offerings → B69 Contracts → B70 Oaths → B71 Initiations → B72 Servitors → B73 Aliases → B74 Attestations → B75 Today ledger wiring. Most Phase 05 primitives already shipped in B52-B55 (BeingsTabs, SealUnlock family, ItemsComposer, ReceptionSelector, AutoStampChip, ObligationTable, BindingKindIcon, Signing family, EntityCard, RelationshipStatusPill, KindFunctionFilter, AliasGraph) — the surface batches will be lighter than Phases 03-04.

### Added — 2026-06-21 (H01-H03 designer handoffs returned · frontend wiring sprint opens)

Designer agent returned the 33-file bundle responding to designer
handoffs 01 + 02 + 03 (Phase 03/04/05 surfaces). Unpacked at
`/home/sophia/design-handoffs/theourgia/2026-06-21-H01-H03/`.

**Foundation work (commits `b9a4b86`, `58143a2`, `7f87186`):**
- `frontend/shared/src/tokens/theourgia.tokens.css` — extended with
  the new H01-H03 token families: `--st-*` / `--cs-*` / `--ob-*` /
  `--os-*` / `--is-*` / `--ss-*` / `--ts-*` (status families),
  `--seal*` / `--verify*` / `--revoke*` (sealing + signing),
  `--g-*` / `--cat-*` / `--rc-*` / `--fest-*` / `--pl-*` /
  `--moon-light/dark` (category + planetary), `--hit*` / `--vis-*` /
  `--paper*` / `--skin*` / `--edge*` / `--bind-blood` / `--warn*`
  (affordances). Per-theme overrides under `[data-theme]` +
  `[data-mode]` + the two `[data-theme][data-mode]` combinations.
- Tailwind preset (`frontend/shared/src/tokens/tailwind.preset.cjs`)
  extended to expose every new family as utility classes.
- New backend endpoint `GET /api/v1/search` carries
  `sealed_excluded_count` — the count of sealed entries matching the
  metadata filters but excluded because the server can't read their
  plaintext. Surfaces in the UI as a calm note, never red.
- New `Adoration` model + Alembic 0031 + `GET /api/v1/resh/today` +
  `POST /api/v1/resh/adorations` — Liber Resh API endpoint that
  composes `core/resh/` for transition computation + streak math.
- New `GET /api/v1/today/ledger` aggregator for the four Phase-05
  Today cards (active practices · obligations · servitor feeding ·
  attestation activity). Care-palette discipline encoded in payload
  shapes — sealed checkpoints surface as `sealed_checkpoint_count`
  with `prompt: null`.
- New shared component `BeingsTabs` (8-tab secondary nav for the
  Phase-05 cluster; scrollable on mobile; per-tab `--bt-*` icon hue
  tokens added).
- New shared SealUnlock family: `SealedBadge` (inline pill),
  `SessionLockIndicator` (topbar pill — locking is the safe action,
  no confirm), `SealUnlock` dialog (two policies: `session` for
  Oaths with stay-toggle ON, `per-read` for Initiations with
  "Stay 5 min" opt-in OFF by default).

**Test counts**: 1452 backend (+13 from H01-H03 gap-fills), 375
frontend shared (+36 from BeingsTabs 15 + SealUnlock 21), 143/143
visual regression (no drift from token additions), 143/143
axe-core WCAG 2.2 A+AA.

**Remaining sprint queue**: B53 (compose/record primitives) → B54
(signing UX) → B55 (entity/body/export primitives) → 5 Phase 03
surfaces → 6 Phase 04 surfaces → 8 Phase 05 surfaces + Today
wiring. Per-component ritual on each surface
(`memory/feedback_read_dc_html_before_building.md`).

### Added — 2026-06-21 (Phase 06 — Divination & Practice backend)

Six batches closing Phase 06 backend (commits `7cd59bd` Tarot opener,
`5bf0243` I Ching + Geomancy + Runes, `2a3ab55` lightweight engines
+ practice logs):

- **Batch 44 — Tarot engine**: `Deck` / `Card` / `Spread` / `Reading`
  models, deterministic `tarot_cast(seed)` via SHA-256-seeded
  `random.Random`, bundled public-domain Rider-Waite-Smith (78 cards
  with Waite *Pictorial Key* correspondences + Hebrew letter /
  planet / zodiac / Tree-of-Life paths), 5 built-in spreads. Alembic
  0025. 40 tests.
- **Batch 45 — I Ching engine**: `Hexagram` + `IChingReading`
  models. `cast_three_coins` (P=1/8, 3/8, 3/8, 1/8) +
  `cast_yarrow_stalks` (P=1/16, 5/16, 7/16, 3/16). King Wen binary
  table for all 64 hexagrams. Transformation hexagram after
  changing-line flips. Bundle covers all 64 with pinyin + English
  names + derived trigram pair + judgment + image summaries from
  PD sources (Legge 1899). Alembic 0026. 37 tests.
- **Batch 46 — Geomancy engine**: 16 Latin canonical figures
  (`FigureName` enum). `combine()` is per-line XOR (single=True,
  double=False) — commutative + associative + Populus identity +
  self-cancellation. Mother → daughter (transpose) → niece →
  witness → judge → reconciler cascade. 12-house chart. Bundle
  carries Agrippa attributions (planet / zodiac / element /
  mobility / meaning) for all 16. Alembic 0027. 30 tests.
- **Batch 47 — Runes engine**: Multi-set schema (Elder Futhark /
  Younger Futhark / Anglo-Saxon Futhorc / Armanen / Northumbrian).
  Symmetric-rune handling: `reversible_flags` forces 6 symmetric
  runes (Gebo / Hagalaz / Isa / Jera / Ingwaz / Dagaz) upright
  regardless of the RNG roll. Elder Futhark bundle with all 24
  runes + Unicode glyphs + aett membership + per-rune meanings
  from PD sources. 3 built-in spreads (single / three_rune /
  nine_rune_wyrd). Alembic 0028. 30 tests.
- **Batch 48 — Pendulum + Bibliomancy + Horary + Scrying**: four
  lightweight engines in one bundle. Pendulum: 4-outcome capture +
  per-user accuracy calibration log. Bibliomancy: deterministic
  passage picker with line / sentence / paragraph granularity +
  whole-source fallback. Horary: composes Phase 03 `compute_chart`
  + persists compact chart snapshot. Scrying: two-phase
  start/end session lifecycle + cross-session symbol index.
  Alembic 0029. 30 tests.
- **Batch 49 — Practice logs (Phase 06 closer)**:
  `BodyPracticeSession` (asana / pranayama / other with Liber-E-style
  `breaks_count` refinement metric) + `BanishingLog` (10-method
  enum, `days_with_banishing` cadence ratio rather than a "streak"
  per tone discipline). Tree of Life paths catalog: 22 paths × 3
  traditions (Lurianic / Golden Dawn / Thelemic) with the
  Heh↔Tzaddi Tarot swap honored per Liber AL II:24. Alembic 0030.
  20 tests.

### Added — 2026-06-21 (Phase 05 — Magical Beings backend)

Seven batches shipping the full relational ledger (commit
`7cd59bd`):

- **Batch 37 — Entity expansion + alias-graph**: `EntityKind` 6→17,
  `EntityRelationshipStatus` / `EntityVisibility` / `EntityAliasKind`
  enums, 14 new Entity columns (epithets / tradition_tags /
  attributions / relationship_status / contact timestamps /
  notes_private+shareable / visibility / origin / etc.).
  `entity_alias` (typed directed edges) + `entity_view` (saved
  unified views). Alembic 0022.
- **Batch 38 — Offerings + recurring offerings**: cadence vocabulary
  (`daily` / `weekly` / `monthly` / `lunar:deipnon` /
  `festival:samhain` / `cron:0 6 * * 1`). Alembic 0023.
- **Batch 39 — Contracts**: structured `our/their_obligations`
  JSONB, `BindingKind` enum, witnesses, dissolution_ritual_id FK.
- **Batch 40 — Oaths + Initiations**: both default sealed.
  Initiations show only `tradition` + `status` in plaintext; the
  rest lives in `encrypted_payload`.
- **Batch 41 — Servitors + tasks + egregores**: matter-of-fact
  tone — no Tamagotchi gamification.
- **Batch 42 — Lineage attestations + Ed25519 counter-signing**:
  `Attestation` + `AttestationSignature` with role =
  `self`/`counter-sign`/`revocation`. Append-only signature chain.
  Alembic 0024.
- **Batch 43 — Phase 05 API CRUD cleanup**: 7 ledger routers
  (offerings · contracts · oaths · initiations · servitors ·
  entity-aliases · attestations) + entity Phase-05 column exposure
  + `GET /entities/:id/aggregate` resolver + `core/federation/
  signing.py` (Ed25519 canonical-bytes signing). Celery reminder
  tasks for oath checkpoints / contract obligations (auto-flips
  overdue) / servitor feeding / recurring offerings. 25 tests.

### Added — 2026-06-21 (Phase 04 — Journaling backend)

Seven batches shipping the journaling substrate (commit `7cd59bd`):

- **Batch 28 — Entry expansion**: 17 entry kinds (5 legacy + 12
  Phase 04), visibility / encryption / occurred_at / mood / energy /
  parent_id / scheduled_publish_at / authored_by_persona_id columns,
  `entry_revision` history table. Alembic 0017.
- **Batch 29 — Search substrate**: Postgres FTS via stored
  `search_tsvector` generated column + GIN index. Filter chips +
  the sealed-excluded honesty pattern. Alembic 0018.
- **Batch 30 — Templates**: 12 built-ins (magical-record /
  ritual-log / dream / divination / synchronicity / liber-resh /
  banishing / invocation / scrying / tarot-reading / pathworking /
  astrology-reading), personal / vault-shared / publishable scopes.
  Alembic 0019.
- **Batch 31 — Library catalog**: `Book` extended (status /
  holding / shelf_location / cover) + `BookNote` + `Quote` +
  `ReadingList` + BibTeX + RIS parsers. Alembic 0020.
- **Batch 32 — Multi-identity + blog**: `authored_by_persona_id`
  wired, `/identities` + `/blog/{posts,feed.xml,feed.rss,feed.json}`
  endpoints.
- **Batch 33 — Scheduled publication**: Celery beat
  `promote_scheduled_entries` every minute + auto-catch-up via SQL
  `<= now()` predicate.
- **Batch 34 — Body / audio substrate**: `BodySnapshot` (markers
  with normalized coords + 8-swatch palette colour) +
  `AudioAttachment`. Alembic 0021.

Frontend wiring for Phase 04 surfaces (Search · Visibility ·
Template Designer · Library · Body Sensation · Export) is the
H02-driven slice of the active H01-H03 sprint above.

### Added — 2026-06-21 (Phase 03 — Time & Cosmos)

Six batches (commit `7cd59bd`):

- Swiss Ephemeris (`pyswisseph`) with the mandatory AGPL
  attribution baked into every `ChartResult.attribution` string +
  Astro tests asserting the credit is rendered.
- Multi-calendar engine: Hebrew (Reingold/Dershowitz, HEBREW_EPOCH
  -1373428), Hijri, Mayan (Long Count + Tzolkin + Haab), Julian
  via Meeus astronomical algorithms, Thelemic with Old Style + Era
  Vulgaris dual form, Coptic, Hellenic.
- Planetary hours (Chaldean order, proportional / unequal hours).
- Lunar phase (terminator geometry + N/S hemisphere mirror).
- Election finder with product scoring (one fail → zero).
- Liber Resh four-station tracker (sunrise / noon / sunset /
  midnight).
- Festivals catalog with citation-kind enum (primary / scholarly /
  community).

Frontend wiring for Phase 03 surfaces (Calendar · Planetary Hours
· Liber Resh · Election Finder · Today Widgets) is the H01-driven
slice of the H01-H03 sprint.

### Added — 2026-06-20 (Phase 02 — Frontend Foundations · total design-fidelity rewrite)

Per the maintainer's "every frontend file rewrites against the
design system" directive (memory:
`feedback_total_frontend_rewrite.md`):

- **Admin SPA** (`frontend/admin/`): every nav surface
  ported against its `.dc.html` source from the original 50-surface
  design system — Today · Journal · Synchronicities · Entities +
  Profile · Library · Calendar · Divination · Sigil Studio · Circle
  Builder · Talismans · Analytics · Ritual Feed · Hubs · Scheduler
  · Templates · Settings · Foundations · Workshop · Quick Capture.
- **Public site** (`frontend/public-site/`, Astro 6.4.8): Landing,
  Blog, Essay, Profile, Hub, Memorial, Lineage, SSO, Newsletter,
  Book, Style Guide, plus specialized modes (Trance, Ritual) and
  print sheets (Ritual Sheet, Talisman & Sigil).
- **Shared design system** (`frontend/shared/`): VaultNav,
  VaultTopbar + TopbarContext, AppShell grid with the
  scroll-convention fix, the overlay/dialog family (Confirm /
  Alert / Prompt / Toast / Banner / Drawer / Tooltip / Popover /
  Menu), every primitive (Button / IconButton / Field / Switch /
  SegmentedControl / Chip / Card / Badge / Stat / Progress /
  EmptyState / Avatar / Medallion / StatusDot), i18n catalogs
  (English + Modern Greek + Hebrew RTL spot-check), `Chart.tsx` +
  `ChartLegend.tsx` (SVG natal chart with Swiss Ephemeris
  attribution).
- **Docs site** (`docs/site/`): Starlight 0.40 with theme tokens
  bridged onto Starlight's `--sl-color-*` API.
- **Storybook 8.6**: 128 stories on launch.
- **Visual regression** via Playwright + locally-served Storybook
  (no SaaS): 128 stories with committed PNG baselines.
- **axe-core a11y gate**: WCAG 2.2 A + AA passing across 128
  stories.
- **PWA** (admin): `manifest.webmanifest` + service worker +
  `/capture` mobile-first quick-capture route.

### Added — 2026-06-20 (Phase 01 — Core Architecture backend)

Foundational backend substrate (commit lineage prior to `7cd59bd`):

- DB substrate with SQLModel + SQLAlchemy + Alembic; ULID/UUID
  id mixin; soft-delete + timestamp mixins; RLS for tenant
  isolation.
- Auth: session tokens (cookie + bearer), TOTP, WebAuthn, backup
  codes, lockout policy.
- Authorization substrate (`core/authz/`): policy + scope +
  resource + decision + audit; per-resource and global gates.
- Encryption: Mode A (server-side AES-256-GCM with wrapped DEKs)
  + Mode B (zero-knowledge XChaCha20-Poly1305 via libsodium /
  PyNaCl); shared versioned envelope; per-content-type config.
- Backup substrate: Restic + R2 / S3-compatible; Celery-scheduled
  daily full + 6-hourly incremental; policy + restore tooling.
- Storage: pluggable backends (filesystem / R2) + Upload model
  + validators.
- Notifications: multi-channel substrate (in-app / email /
  web-push stub) + template registry + per-user preferences.
- Email substrate: pluggable backends + Jinja templates.
- Events bus, ratelimit + idempotency, cache (in-memory + Redis),
  GDPR substrate (export + deletion), federation key management,
  observability (structlog + request context).

### Added — 2026-06-20 (initial planning corpus + scope expansion)

**Planning corpus:**
- [PROJECT_PLAN.md](PROJECT_PLAN.md) — vision, 19-category feature overview, **17-phase index**, resolved decisions, glossary
- [ARCHITECTURE.md](ARCHITECTURE.md) — system design, trust model, federation protocol, plugin substrate, AI integration layer, GDPR provisions, multi-identity, closed-tradition handling, testing strategy
- [FEATURES.md](FEATURES.md) — **canonical feature catalog** (~200 features across 19 categories with status tracking)
- [plan/](plan/) — **seventeen per-phase implementation plans (00 through 16)**, each detailed enough to resume work cold after context loss
- [plan/16-ai-agent-integration.md](plan/16-ai-agent-integration.md) — new dedicated phase for AI agent integration via the daskalos pattern

(Design briefs for the design team are maintained as external handoff documents — see project archives — and are not part of the public repository.)

### Added — 2026-06-20 (Swiss Ephemeris licensing pre-flight)

- [NOTICE](NOTICE) — third-party attribution file at repo root, listing Swiss Ephemeris (Astrodienst AG) and JPL DE441 planetary ephemeris (NASA/JPL) with required attribution text
- [plan/03-time-and-cosmos.md](plan/03-time-and-cosmos.md) — explicit "Swiss Ephemeris licensing" section replacing the prior brief risk-note; documents AGPL path, obligations, what is and is not restricted, implementation deliverables, risk mitigations
- [ARCHITECTURE.md](ARCHITECTURE.md) §2 — Swiss Ephemeris row expanded with licensing context

Status confirmed: Theourgia qualifies for the free AGPL-3.0 path with Swiss Ephemeris. Paid SaaS / commercial-use scenarios remain on the free path as long as Theourgia stays AGPL.

### Added — 2026-06-20 (SaaS posture committed explicitly)

- PROJECT_PLAN.md §8 item 4 — explicit commitment that any future hosted SaaS keeps the code AGPL-3.0 forever; revenue model is hosting fees + small profit margin only; no proprietary forks ever; competing hosted instances by other operators are by design.

### Added — 2026-06-20 (Phase 00, Batch 1 — project skeleton + tooling)

Phase 00 (Foundations) opens. First batch lays the monorepo skeleton and tooling configurations such that `just install` + `just check` will work end-to-end once dependencies are installed.

**Top-level configuration:**
- `.gitattributes` — line-ending normalization, binary classification, linguist hints
- `.python-version` (3.12) and `.nvmrc` (Node 22)
- `.env.example` — fully documented environment variable template
- `justfile` — task runner with recipes for install, dev, lint, format, typecheck, test, migrate, build, docs, security, identity verification
- `pyproject.toml` — root workspace with Ruff, mypy, pytest, and coverage configuration shared across the Python parts of the monorepo
- `package.json` + `pnpm-workspace.yaml` — Node workspaces (frontend + docs)
- `tsconfig.json` — strict TypeScript baseline shared by frontend workspaces
- `biome.json` — JS/TS lint+format with a11y rules and the `useSortedClasses` Tailwind helper
- `.pre-commit-config.yaml` — pre-commit hooks (gitleaks, ruff, biome, hadolint, markdownlint, conventional-commit message check)
- `.markdownlint.json` — markdown lint config

**Backend skeleton:**
- `backend/pyproject.toml` — package manifest with planned dependencies (FastAPI, SQLModel, Alembic, asyncpg, Redis, Celery, cryptography, pyswisseph, etc.) and dev group (pytest, hypothesis, mypy, ruff, pip-audit)
- `backend/theourgia/__init__.py`, `__about__.py`, `__main__.py` — package skeleton with version metadata
- `backend/tests/__init__.py`, `conftest.py`, `test_smoke.py` — pytest discovery + initial smoke tests
- `backend/README.md` — package documentation

**Frontend skeleton:**
- `frontend/shared/` — design system / shared components / i18n package skeleton
- `frontend/public-site/` — Astro public site package skeleton
- `frontend/admin/` — React admin SPA package skeleton
- `frontend/README.md` and per-package READMEs

**Docs scaffolding:**
- `docs/README.md` — directory map
- `docs/adr/README.md` + `docs/adr/template.md` — MADR-style ADR template ready for Batch 2 ADR authoring
- `docs/user/`, `docs/admin/`, `docs/developer/` directories scaffolded with `.gitkeep`

**Other:**
- `plugins/README.md` — reference plugin directory map
- `scripts/verify-identity.sh` — git identity guard (runnable via `just verify-identity`)

### Added — 2026-06-20 (Phase 00, Batch 2 — containers + dev environment)

Phase 00 Batch 2 lands the container + devcontainer story. End state: a contributor with VS Code + Dev Containers extension can clone the repo, "Reopen in Container," and have a fully-installed dev environment within minutes. `just dev` brings up the full stack (Postgres, Redis, backend with hot reload, Astro public-site dev server, React admin dev server). `just up-prod` is the production analogue.

**Container images:**
- `backend/Dockerfile` — multi-stage Python image (`base` → `deps` → `dev` → `prod`); uv-based dep install with build-cache mounts; non-root user in prod; tini for PID 1; healthcheck via curl
- `frontend/Dockerfile` — multi-stage Node + Caddy image (`base` → `deps` → `build` → `public-site-dev` / `admin-dev` / `prod`); pnpm with cache mounts; production target serves built static files via internal Caddy
- `frontend/Caddyfile.internal` — internal frontend container Caddy config; routes `/api/*` + `/federation/*` + `/.well-known/*` + `/users/*` + `/ws/*` to backend; admin SPA at `/app/*` with client-side routing; public site at `/`; security headers baked in
- `.dockerignore` (top-level) + `backend/.dockerignore` + `frontend/.dockerignore` — exclude secrets, build artifacts, VCS, editor configs, plan/docs from images

**Docker Compose:**
- `docker-compose.yml` — base stack: postgres + redis + backend + celery + celery-beat + frontend; internal `theourgia-internal` bridge network; named volumes for postgres + redis data; required env vars enforced via `${VAR:?msg}` syntax
- `docker-compose.dev.yml` — dev overrides: hot reload, source volume mounts, postgres + redis exposed on `127.0.0.1`, public-site (Astro dev) on port 4321, admin (Vite dev) on port 5173, dev-only sentinel secrets, prod frontend profiled out
- `docker-compose.prod.yml` — prod overrides: multi-worker uvicorn, no host ports for postgres/redis, internal frontend Caddy bound to `127.0.0.1:8190` (or `THEOURGIA_FRONTEND_HOST_PORT` override), JSON-file logging with size+rotation, no dev fallbacks for secrets

**Self-hoster reference:**
- `Caddyfile.example` — example host-level Caddyfile for single-tenant self-hosters (Cloudflare DNS-01, apex + www redirect, reverse-proxy to `127.0.0.1:8190`, security headers, optional docs subdomain stub)

**Devcontainer + editor:**
- `.devcontainer/devcontainer.json` — VS Code Dev Containers spec: composes the dev stack, adds a `devcontainer` workspace service, features for Python 3.12 / Node 22 / uv / pnpm / just / pre-commit / GitHub CLI / docker-outside-of-docker; recommended extensions; per-language formatter settings; forwarded ports
- `.devcontainer/docker-compose.devcontainer.yml` — workspace container override that mounts the source and the host Docker socket
- `.devcontainer/post-create.sh` — first-run setup: `uv sync`, `pnpm install`, `pre-commit install`, identity-guard check
- `.vscode/settings.json` — editor formatter / linter / interpreter settings aligned with project conventions
- `.vscode/extensions.json` — recommended extension list; `unwantedRecommendations` blocks Prettier / black to avoid conflicts with Biome / Ruff
- `.vscode/launch.json` — debug configurations for backend uvicorn and pytest (current file / all)
- `.vscode/tasks.json` — `just` recipe shortcuts as VS Code tasks

After this batch: cloning the repo and choosing "Reopen in Container" gets you a working environment with no manual dependency installation.

**Governance:**
- [AGPL-3.0 license](LICENSE)
- [Code of Conduct](CODE_OF_CONDUCT.md) — Contributor Covenant 2.1 with project-specific addendum on respect for divergent magickal practice
- [Contributing guide](CONTRIBUTING.md) (planning-phase scoped)
- [Security policy](SECURITY.md) with private vulnerability disclosure via GitHub Security Advisories
- README.md as community front page with visual roadmap, tech badges, About-Creator section
- Project hygiene: `.gitignore`, `.editorconfig`, pre-push identity guard hook

**Scope expansions confirmed:**
- **Magickal Bundle Format (MBF)** — comprehensive shareable artifact catalog (pantheons, tradition bundles, rituals, decks, sigil libraries, calendars, ciphers, symbolism systems, etc.); piecemeal sharing supported
- **Entity alias-graph merge model** — multi-source entities coexist without overwriting; user-curated relationships; unified views for display-time merge
- **AI agent integration** as Phase 16 — opt-in daskalos-pattern (daemon + waker + MCP); BYO Anthropic keys; never required
- **GDPR compliance** built in from architecture
- **Multi-identity / pseudonymity** per vault
- **Lineage attestation with cryptographic counter-signing**
- **Blog platform** distinct from magickal journal
- **Time-released content** (scheduled, posthumous, curriculum-unlock)
- **Single Sign-On across networks**
- **Admin permissions panel** with configurable user levels per hub
- **iCal/WebCal feed exports** including network group ritual feeds
- **Subscription billing** for newsletters and patron tiers
- **Print-quality book typography**
- **Closed-tradition flags** with default-block public sharing
- **Digital inheritance / memorial mode**
- **Sandbox-before-commit** for bundles and plugins
- **Official Theourgia plugin/bundle registry** with three trust tiers

**Architectural commitments:**
- Zero telemetry (verified by CI test)
- Modal-only alerts (no native browser dialogs; ESLint-enforced)
- Documentation from day one (synced with product, not retrofitted)
- User onboarding from day one (built alongside features)
- Testing discipline at every phase (unit, regression, integration, E2E, property-based)
- Cloudflare R2 backups from day one
- One-command deploys + one-click migrations with diff preview
- README continuously current as community page

### Added — 2026-06-20 (Phase 00, Batch 3 — CI workflows + GitHub templates)

Phase 00 Batch 3 lands the CI/CD scaffolding and GitHub contributor templates. During v0.x these workflows are **informational, not merge-blocking** (per PROJECT_PLAN §8); branch protection will require green CI after v1.0.

**CI workflows** (`.github/workflows/`):
- `ci.yml` — identity guard, Python lint+test, TS lint+typecheck, markdown lint, gitleaks, dep audit, Docker build smoke, no-telemetry placeholder
- `nightly.yml` — daily deep dep audits, AGPL license compatibility check, CycloneDX SBOM
- `release.yml` — tag-triggered multi-arch image publish to GHCR with provenance + SBOM; GitHub Release with notes from CHANGELOG

**Contributor templates** (`.github/`):
- `ISSUE_TEMPLATE/{config,bug_report,feature_request,tradition_feedback}.yml` — structured forms; security routed to private channels
- `pull_request_template.md` — type, phase, tests, docs/catalog updates, security, tradition-respectful review
- `CODEOWNERS` — @SAntonopoulou as default reviewer; governance docs explicit
- `dependabot.yml` — weekly Python + JS, monthly Actions + Docker

### Added — 2026-06-20 (Phase 00, Batch 4 — initial ten ADRs)

Phase 00 Batch 4 lands the ten initial Architecture Decision Records in `docs/adr/`. Each ADR captures a decision made during planning that contributors should understand without conversational context.

- [ADR-0001](docs/adr/0001-record-architecture-decisions.md) — Record architecture decisions (the meta-ADR)
- [ADR-0002](docs/adr/0002-license-agpl-3-0.md) — License is AGPL-3.0-only (with maintainer's copyleft commitment)
- [ADR-0003](docs/adr/0003-backend-python-fastapi-sqlmodel-alembic.md) — Backend stack: Python 3.12 + FastAPI + SQLModel + Alembic
- [ADR-0004](docs/adr/0004-frontend-astro-react.md) — Frontend split: Astro for public site + React 19 admin SPA
- [ADR-0005](docs/adr/0005-postgresql-only.md) — PostgreSQL is the only supported database
- [ADR-0006](docs/adr/0006-swiss-ephemeris-over-skyfield.md) — Swiss Ephemeris over Skyfield (reproducibility with established astrology tools)
- [ADR-0007](docs/adr/0007-tiptap-editor.md) — Tiptap as the rich-text editor foundation
- [ADR-0008](docs/adr/0008-caddy-reverse-proxy.md) — Caddy as the reference reverse proxy
- [ADR-0009](docs/adr/0009-monorepo.md) — Single monorepo organization
- [ADR-0010](docs/adr/0010-conventional-commits.md) — Conventional Commits + Semantic Versioning

ADRs are MADR-format, never edited after acceptance — to change a decision, write a superseding ADR.

### Added — 2026-06-20 (Phase 00, Batch 5 — Astro Starlight docs site scaffold)

Phase 00 Batch 5 lands a working Astro Starlight documentation site at `docs/site/`. The site builds, has the right sidebar shape (Start, User Guide, Admin Guide, Developer Guide, Concepts), and contains placeholder content that grows as phases land. Eventually deploys to `docs.theourgia.com`.

**Site scaffolding:**
- `docs/site/package.json` — `@theourgia/docs` workspace package; Astro 4.16 + Starlight 0.30
- `docs/site/astro.config.mjs` — Starlight integration with GitHub social link, edit-link to repo, last-updated timestamps, multi-locale-ready (English at launch), zero third-party scripts in head (point of pride)
- `docs/site/tsconfig.json` — extends `astro/tsconfigs/strict`
- `docs/site/src/content.config.ts` — content collections via Starlight's loader/schema

**Initial content (placeholders growing as phases land):**
- `src/content/docs/index.mdx` — splash homepage with hero, tagline, CTAs, four-card overview, status banner
- `src/content/docs/start/status.md` — current status + 17-phase roadmap table
- `src/content/docs/start/privacy.md` — explicit zero-telemetry commitment with detail, GDPR commitments, encryption modes
- `src/content/docs/concepts/architecture.md` — short overview pointing at canonical ARCHITECTURE.md
- `src/content/docs/concepts/features.md` — 19-category feature overview pointing at canonical FEATURES.md
- `src/content/docs/user/index.md`, `admin/index.md`, `developer/index.md` — placeholder index pages

**Workspace wiring:**
- `pnpm-workspace.yaml` updated — `docs/site` (was `docs`)
- `package.json` scripts — `docs:dev` / `docs:build` filter `@theourgia/docs`
- `justfile` — `docs-dev` / `docs-build` recipes use the filter
- `docs/README.md` updated to mention the Starlight site location

## Phase 00 complete (2026-06-20)

All five batches of Phase 00 (Foundations) are landed:

- **Batch 1:** Project skeleton + tooling configs ([commit 2c177a2](https://github.com/SAntonopoulou/theourgia/commit/2c177a2))
- **Batch 2:** Containers + dev environment ([commit 70586ed](https://github.com/SAntonopoulou/theourgia/commit/70586ed))
- **Batch 3:** CI workflows + GitHub templates ([commit cad065e](https://github.com/SAntonopoulou/theourgia/commit/cad065e))
- **Batch 4:** Initial ten ADRs + changelog catch-up ([commit 10b51f0](https://github.com/SAntonopoulou/theourgia/commit/10b51f0))
- **Batch 5:** Astro Starlight docs site scaffold ([commit 2d3f504](https://github.com/SAntonopoulou/theourgia/commit/2d3f504))

Phase 00 status: **done.** Phase 01 (Core Architecture) is next — database schema, authentication framework, encryption layer, plugin substrate, federation primitives, API contract.

### Status

Project remains in **planning phase** with **Phase 00 complete**. No runnable application code yet — the next phase produces the data layer and security foundation everything else builds on.

### Added — 2026-06-20 (Phase 01, Batch 1 — data layer foundations)

Phase 01 (Core Architecture) opens. First batch establishes the data layer foundations: settings, async DB engine, base model mixins, identity tables, audit log, the first Alembic migration with PostgreSQL extensions and RLS policy scaffolding, plus a stack of smoke + property tests.

**Core infrastructure:**
- `backend/theourgia/core/config.py` — `Settings` via `pydantic-settings`; secrets required in non-test environments enforced by `require_secrets_or_raise`; `get_settings` cached for process lifetime
- `backend/theourgia/core/ids.py` — UUIDv7 generator per RFC 9562 (time-ordered primary keys until stdlib ships v7)
- `backend/theourgia/core/timeutil.py` — timezone-aware helpers (`utcnow`, `utc_from_iso`, `to_iso`) that refuse naive datetimes
- `backend/theourgia/core/db.py` — async engine + sessionmaker via SQLAlchemy 2.x + asyncpg; FastAPI `get_session` dependency + standalone `session_scope` context manager

**Models:**
- `backend/theourgia/models/base.py` — `IDMixin` (UUIDv7), `TimestampMixin` (tz-aware created_at/updated_at), `SoftDeleteMixin`
- `backend/theourgia/models/identity.py` — `User`, `Session`, `Vault`, `Hub`, `Membership` (with `MembershipRole` enum: 3 vault roles + 5 hub roles), `PrivateViewer`
- `backend/theourgia/models/audit.py` — `AuditEvent` (append-only by app convention) with `AuditEventKind` and `AuditOutcome` enums

**Migration infrastructure:**
- `backend/alembic.ini` — Alembic config; reads URL from `theourgia.core.config`; post-write hook runs Ruff format on generated migrations
- `backend/alembic/env.py` — async-aware Alembic env; uses migration-role URL if set, falls back to app-role URL
- `backend/alembic/script.py.mako` — migration file template

**First migration** (`0001_initial_extensions_and_identity.py`):
- Enables PostgreSQL extensions: pgcrypto, citext, pg_trgm, unaccent, vector
- Creates enums (`membership_role`, `audit_event_kind`, `audit_outcome`)
- Creates identity tables (`user`, `session`, `vault`, `hub`, `membership`, `private_viewer`)
- Creates `audit_event` with an immutability trigger that raises on UPDATE/DELETE (DB-level enforcement of append-only convention)
- Enables Row-Level Security on all identity tables
- Defines RLS policies: user self-access, vault owner-write + member-read, hub member-read, membership self-read, private viewer owner+self-read, audit_event scoped read (own actor, own vault as owner, own hub as admin/officer)
- Foundation for content-table RLS policies that land in subsequent migrations

**Tests:**
- `test_uuid7.py` — version + variant bits, uniqueness, time-ordering, Hypothesis property test
- `test_timeutil.py` — UTC enforcement, ISO round-trip, naive-datetime rejection
- `test_config.py` — Settings defaults, cache behavior, secret-enforcement contract
- `test_models_identity.py` — round-trip instantiation of all identity + audit models, enum coverage, tz-awareness checks
- `conftest.py` — autouse fixture forcing `THEOURGIA_ENV=test` for the session

**README roadmap** updated: Phase 01 now `[~]` in-progress.

### Added — 2026-06-20 (Phase 01, Batch 2 — encryption layer)

Phase 01 Batch 2 lands the cryptographic foundation: both encryption modes, key management, KDF parameters, and a comprehensive test suite. **This is the most security-critical batch in the project.** Crypto review is part of Phase 01's Definition of Done; this code is written with that future review in mind.

**Two encryption modes:**
- **Mode A** — server-side AES-256-GCM. Per-vault data keys (DEKs) wrapped by a server master key derived from `THEOURGIA_MASTER_ENCRYPTION_KEY`. Server can decrypt; supports server-side search.
- **Mode B** — zero-knowledge XChaCha20-Poly1305 (libsodium). Key derived in the browser from a passphrase the server never sees. Production encrypt/decrypt happens client-side; the Python implementation is reference + test oracle + admin diagnostics.

**Crypto package** (`backend/theourgia/core/crypto/`):
- `types.py` — `EncryptionMode` enum, `EncryptionError` / `DecryptionError` / `InvalidEnvelopeError`
- `envelope.py` — versioned self-describing binary envelope: `[ver][mode][key_id 16B][nonce_len][nonce N][ciphertext+tag]`. Version byte allows future algorithm migration.
- `keys.py` — `MasterKey` (derived from secret via SHA-256, repr-safe), `DataKey`, `generate_data_key`, `wrap_data_key`, `unwrap_data_key`. Wrap uses deterministic nonce derived from key_id (single key per id, makes wrapping stable).
- `mode_a.py` — `encrypt`/`decrypt` API for server-side AES-GCM with optional AAD binding.
- `mode_b.py` — Python reference for libsodium XChaCha20-Poly1305 (frontend matches this contract).
- `kdf.py` — Argon2id (RFC 9106 hybrid) parameter generation and key derivation. INTERACTIVE-grade defaults (time_cost=3, memory_cost=64 MiB, parallelism=4). Strict validation.

**Models** (`backend/theourgia/models/crypto.py`):
- `VaultKey` — per-vault data key in wrapped form; `active` flag with partial unique index ensuring at most one active key per vault; rotation never deletes (old keys retained for old blobs).
- `SealedKdfParams` — Argon2id params per (user, scope); recovery fingerprint column for opt-in recovery flow.

**Migration** (`0002_encryption_tables.py`):
- Creates `vault_key` with partial unique index `uq_vault_key_one_active` (`UNIQUE ... WHERE active = true`)
- Creates `sealed_kdf_params` with unique `(user_id, scope)`
- Enables RLS on both tables with scope-appropriate policies (vault_key owner-write + member-read; sealed_kdf_params owner-only)

**Tests** (5 files, ~30 test functions including Hypothesis property tests):
- `test_crypto_envelope.py` — round-trip, version/mode rejection, length validation, property test across modes + sizes
- `test_crypto_keys.py` — master key from secret, repr leak-prevention, wrap/unwrap round-trip, tampering detection
- `test_crypto_mode_a.py` — round-trip, fresh nonce per encryption, wrong-key/tampered/AAD-mismatch rejection, empty + large plaintexts, property test
- `test_crypto_mode_b.py` — same shape as Mode A
- `test_crypto_kdf.py` — determinism, salt variance, parameter validation, key-length variants

**Security properties verified by tests:**
- Master / data keys never appear in `repr` or `str` output
- AEAD failures produce indistinguishable `DecryptionError` (key, tamper, AAD mismatch all surface the same way at the boundary)
- Nonce reuse impossible (random per encryption, distinct outputs verified)
- AAD binding prevents cross-row ciphertext swap
- Wrong envelope version is rejected
- Truncated / oversized inputs are rejected

### Added — 2026-06-20 (Phase 01, Batch 3 — authentication)

Phase 01 Batch 3 lands the authentication primitives: password hashing, TOTP 2FA + backup codes, opaque session/reset tokens, account lockout with exponential backoff.

**Auth package** (`backend/theourgia/core/auth/`):
- `passwords.py` — Argon2id password hashing (PHC format); INTERACTIVE-grade parameters; `verify_password` constant-time; `needs_rehash` for parameter upgrades on next login
- `tokens.py` — opaque random tokens (256 bits entropy via `secrets.token_urlsafe(32)`); stored as SHA-256 hex; `tokens_match` constant-time
- `totp.py` — RFC 6238 / RFC 4226 implementation using only stdlib (`hmac`, `hashlib`, `struct`); 160-bit base32 secrets; `otpauth://` provisioning URI for QR display; ±1 step skew tolerance on verify; **RFC 4226 §D test vector verified**
- TOTP backup codes — 10 codes per set, `XXXX-XXXX` format, hash-stored (SHA-256 of normalized form), constant-time match across all stored hashes
- `lockout.py` — exponential backoff ladder: 5 failures → 60s, 10 → 5min, 15 → 30min, 20 → 1h, beyond → up to 24h cap

**Models** (`backend/theourgia/models/auth.py`):
- `BackupCode` — one row per code; `code_hash` unique; `used_at` timestamp for one-time-use enforcement
- `PasswordResetToken` — single-use, short-lived; `token_hash` unique; explicit `expires_at`; `requested_from_ip` for audit

**Migration** (`0003_auth_tables.py`):
- Creates `backup_code` and `password_reset_token` tables
- Enables RLS with self-only policies on both (a user sees only their own codes/tokens)

**Tests** (4 files, ~50 test functions):
- `test_auth_passwords.py` — PHC format, round-trip, empty/malformed rejection, fresh salt per hash, rehash detection, property test
- `test_auth_totp.py` — secret length, code format, time-step verification, skew tolerance, provisioning URI fields, RFC 4226 test vector, backup code generation + normalization + constant-time verification
- `test_auth_tokens.py` — entropy, hash determinism, constant-time match
- `test_auth_lockout.py` — ladder monotonicity, threshold transitions, cap behavior, `is_locked` boundary conditions

**Security properties verified by tests:**
- Empty / malformed inputs never pass verification
- Each password hash uses a fresh salt
- Backup code verification is constant-time across all stored hashes (no early-exit timing leak)
- RFC 4226 known-answer test vector passes
- Lockout escalates monotonically and is bounded by `MAX_LOCKOUT`

Note: WebAuthn / passkey support is deferred to Batch 10 per the Phase 01 plan; TOTP is the 2FA path landed here.

### Added — 2026-06-20 (Phase 01, Batch 4 — authorization)

Phase 01 Batch 4 lands the application-layer authorization primitives: visibility model, scope vocabulary, pure permission checks, RLS GUC setter, and the audit log writer.

**Authz package** (`backend/theourgia/core/authz/`):
- `visibility.py` — `Visibility` enum (SEALED=5, PERSONAL=1, VIEWER=2, NETWORK=3, PUBLIC=4) with `is_private` / `is_publishable_outbound` / `is_sealed` predicates; `AT_LEAST_INTERNAL` and `PUBLISHABLE` convenience sets
- `scopes.py` — `Scope` string-enum with ~40 dotted scope names across 12 domains (entry, entity, vault, hub, session, user, key, sealed, plugin, federation, backup, audit, agent)
- `checks.py` — pure permission functions: `can_read_with_visibility` (full decision table across all 5 visibilities + ownership + private viewer + hub membership) and `can_write_with_visibility` (owner or vault collaborator only)
- `rls.py` — `set_current_user_id(session, user_id)` and `clear_current_user_id(session)` — set the `theourgia.current_user_id` GUC via `SET LOCAL` so RLS policies see the current viewer. Bound parameter (not string interpolation). Rejects non-UUID input defensively.
- `audit.py` — `build_audit_event` pure factory + `AuditLogger` session-wrapping persister. Validates field lengths (action ≤128 chars, ip_address ≤45 chars), clamps overlong user-agent strings rather than rejecting, deep-copies the detail dict so caller mutations don't affect the persisted row.

**Test infrastructure additions:**
- Recording-session doubles in `test_authz_rls.py` and `test_authz_audit.py` so the RLS setter and audit logger can be tested without a live database. Full integration with PostgreSQL + RLS policies lands when the postgres-test-fixture infrastructure is set up in a subsequent batch.
- `anyio` added to dev deps for async test execution

**Tests** (5 files, ~50 test functions):
- `test_authz_visibility.py` — enum value stability (persisted integers must never change), private/publishable/sealed predicates, convenience set membership
- `test_authz_checks.py` — exhaustive decision table for `can_read_with_visibility` (public ↔ everyone, personal ↔ owner only, sealed ↔ owner only, viewer ↔ private viewer credential, network ↔ hub membership intersection, network ↔ private viewer override, anonymous ↔ public only); write checks (owner or collaborator)
- `test_authz_scopes.py` — dotted-lowercase format, domain namespacing, uniqueness, critical scopes present
- `test_authz_rls.py` — GUC name format, SET LOCAL emitted with bound parameter, non-UUID rejection
- `test_authz_audit.py` — minimal + full event construction, detail dict copy semantics, all `AuditEventKind` values supported, all `AuditOutcome` values supported, action/ip_address length validation, user-agent clamping, AuditLogger persistence via session double

**Authorization architecture (now explicit):**
1. Application checks via `can_read_with_visibility` / `can_write_with_visibility` at the API boundary (Phase 01 Batch 5 will wire these into FastAPI dependencies)
2. Database checks via Row-Level Security policies (declared in earlier migrations, activated per-request via `set_current_user_id`)
3. Audit log via `AuditLogger` for security-relevant events (sealed reads, visibility downgrades, federation operations, plugin lifecycle)
4. Defense in depth: a bug in any single layer does not produce a security failure on its own.

### Added — 2026-06-20 (Phase 01, Batch 5 — FastAPI app + API contract)

**The platform exists as a runnable HTTP server.** Phase 01 Batch 5 lands the FastAPI application factory, lifespan, error handling, middleware, dependency injection, and the first endpoints (health, readiness, metadata).

**API package** (`backend/theourgia/api/`):
- `app.py` — `create_app()` factory and module-level `app` singleton. Customizes OpenAPI with bearer security scheme, license, contact, servers; exposes Swagger UI at `/api/docs` and OpenAPI JSON at `/api/openapi.json`. Production hides Swagger by default (machine clients still get the JSON).
- `lifespan.py` — startup validates required secrets (refuses to start without them in non-test envs); shutdown disposes the SQLAlchemy engine cleanly.
- `errors.py` — RFC 7807 `application/problem+json` translator. Defines `APIError` base + `UnauthorizedError` / `ForbiddenError` / `NotFoundError` / `ConflictError` / `ValidationFailedError` / `RateLimitedError` / `ServiceUnavailableError`. Catch-all handler logs full traceback but emits a generic Problem to clients (never leaks internals). Translates FastAPI `RequestValidationError` into a Problem with field-level summaries.
- `schemas.py` — `Problem` (RFC 7807 with `request_id` extension) and `Meta` (instance metadata response).
- `middleware.py` — `RequestIDMiddleware` (generates UUIDv7 if absent; accepts inbound if sane; echoes in `X-Request-ID`); CORS configured per-env (dev allows localhost frontend origins, production locked to `BASE_URL`).
- `deps.py` — dependency injection:
  - `get_db_session` (request-scoped async session)
  - `get_current_user` (extracts bearer, hashes via `hash_token`, looks up session row, checks revoked/expired, fetches user, **sets the RLS GUC on the session**)
  - `get_optional_current_user` (returns `None` on no/bad auth instead of raising)
  - `require_scope(scope)` factory (current impl: any authenticated user; tightens as resource routers land)
  - Convenience `Annotated` aliases: `DBSession`, `CurrentUser`, `OptionalCurrentUser`
- `routers/health.py` — `/healthz` (liveness, no deps) and `/readyz` (readiness, checks DB connectivity); both emit `Problem` on failure.
- `routers/v1/meta.py` — `/api/v1/meta` returning instance_id, version, api_version, environment, `telemetry: none`, license, source URL.
- Updated `__main__.py` to actually run uvicorn (replaces the planning-phase placeholder).

**Tests** (3 files, ~25 test functions using `httpx.ASGITransport`):
- `test_api_app.py` — app constructs; healthz returns ok; request-ID propagation (inbound passes, malformed dropped, absent generates UUIDv7); meta endpoint shape; OpenAPI schema with bearer security scheme; docs UI in non-prod; 404 returns Problem; CORS preflight allowed in dev.
- `test_api_errors.py` — every APIError subclass maps to the right HTTP status with `application/problem+json` content-type; Retry-After header preserved; **unhandled exceptions return generic 500 Problem without leaking internals**; FastAPI validation errors render as Problem with field summaries.
- `test_api_deps.py` — auth dependency: rejects missing/bad/revoked/expired tokens; accepts valid; **sets RLS GUC on success**; optional variant returns None instead of raising; scope dependency requires authentication.

**You can now:**
- Build and inspect the OpenAPI schema (`curl /api/openapi.json`)
- Probe liveness / readiness (`curl /healthz`, `/readyz`)
- Discover the instance via `/api/v1/meta`
- Raise project-defined error types and have them render as RFC 7807 Problems
- Authenticate any future endpoint via bearer-token dependencies with automatic RLS GUC setting

**Deferred to Batch 5b:** rate limiting (Redis-backed counter + sliding window) and idempotency-key middleware. These need Redis fixtures we don't have yet; the foundation here makes them drop-in additions.

**Phase 01 progress:** 5 of 10 batches done — *the halfway mark*. The runnable backend application now exists; subsequent batches add features (plugins, federation, backups, observability).

### Added — 2026-06-20 (Phase 01, Batch 6 — plugin substrate)

Phase 01 Batch 6 lands the plugin extension framework: manifest schema + parser, capability vocabulary, extension point taxonomy, in-process extension registry, plugin lifecycle state machine, sandboxed plugin context, and the discovery + activation loader.

**Plugin package** (`backend/theourgia/core/plugins/`):
- `manifest.py` — Strict Pydantic schema for `plugin.toml`. Validates name format (lowercase-hyphen, 2–64 chars), SemVer 2.0 version, entrypoint shape (`module:callable`), license string, theourgia-version range. Cross-field validators: `db.migrations` capability requires `entrypoint.migrations` path; duplicate caps / extension points rejected; `extra='forbid'` so typos fail loudly. Accepts both flat array and nested sub-section TOML styles for capabilities / extension_points / allowed_hosts.
- `capabilities.py` — `Capability` enum with 23 dotted-domain values (read, write, ui, db, network, fs, notif, federation, agent). `from_string` for round-trip parsing; `domain` property for grouping.
- `extension_points.py` — `ExtensionPoint` enum with 22 named hooks across time/cosmology, divination, linguistic, reference, workshop, UI, integrations, federation domains. Stable slug values; new points require ADR.
- `state.py` — `PluginState` enum + `allowed_transition` lookup. INSTALLED → ACTIVE/ERROR/UNINSTALLING; ACTIVE → INACTIVE/ERROR/UNINSTALLING; INACTIVE → ACTIVE/ERROR/UNINSTALLING; ERROR → recovery paths; UNINSTALLING is terminal.
- `registry.py` — Thread-safe `ExtensionRegistry` keyed by (plugin, point, name); singleton via `get_registry()`; tests use `reset_registry()` for isolation. Methods: `register`, `unregister_plugin`, `implementations_for`, `all_registrations`, `plugin_count`, `clear`.
- `context.py` — `PluginContext` capability-scoped sandbox passed to plugin setup. Exposes identity, granted capabilities (frozenset), namespaced logger (`theourgia.plugin.<name>`), settings, `register_extension`, `require_capability` / `has_capability`. Custom `CapabilityDeniedError`. `repr` never leaks settings.
- `loader.py` — `PluginLoader.activate(manifest, granted_capabilities)` imports the module, calls setup with a context, records teardown function if returned. Effective capabilities = granted ∩ manifest-requested (host cannot widen). Partial registrations rolled back if setup raises. `deactivate` calls teardown (logs but does not propagate teardown exceptions — gone means gone), unregisters extensions. `discover_manifests(root)` recursively finds `plugin.toml` files, sorted for determinism.

**Models** (`backend/theourgia/models/plugins.py`):
- `PluginInstall` — installed plugin per-vault; lifecycle state; manifest_json snapshot; signature + public_key for future Phase 14 verification
- `PluginCapabilityGrant` — explicit capability grants per plugin install; `granted_by_user_id` for audit
- `PluginSetting` — JSONB key/value per plugin install

**Migration** (`0004_plugin_tables.py`):
- Creates `plugin_state` and `plugin_capability` Postgres enums (must stay in sync with Python enums)
- Creates three tables with appropriate FKs, indexes, unique constraints
- RLS enabled on all three with policies routing through vault ownership

**Tests** (6 files, ~50 test functions):
- `test_plugin_manifest.py` — parse minimal + full; sub-section style accepted; bad capability/extension-point/SemVer/name rejected; duplicate detection; `db.migrations` requires migrations path; backend entrypoint format validation; load from file/directory; missing-file FileNotFoundError; extra field rejected
- `test_plugin_capabilities.py` — dotted-lowercase format, round-trip parsing, unknown rejection, domain property, uniqueness, critical caps present
- `test_plugin_state.py` — self-transitions forbidden, allowed transitions parameterized, UNINSTALLING terminal, INSTALLED→INACTIVE skip-forbidden, ACTIVE→INSTALLED reverse-forbidden
- `test_plugin_registry.py` — register + retrieve, duplicate (plugin,point,name) raises, same-name-different-plugins allowed, same-name-different-points allowed, unregister_plugin removes all, unknown unregister returns 0, all_registrations across points, clear empties, singleton + reset_registry
- `test_plugin_context.py` — identity, frozen capabilities (cannot mutate), `has_capability` / `require_capability`, logger namespace, settings retrieval, `register_extension` writes through, repr never leaks settings, error message contents
- `test_plugin_loader.py` — discover empty/nested/missing, activate imports + registers, granted capabilities clipped to manifest-requested, activate-twice rejected, missing module/callable raise, partial-registration rollback on setup exception, deactivate calls teardown + unregisters, deactivate-unknown raises, teardown exceptions logged but don't block removal

**Architectural posture:**
- Plugin contracts (manifest schema, extension point taxonomy, capability vocabulary) are stable now even though enforcement (process isolation, signed-release verification) finalizes in Phase 14
- Plugin authors can write against this API today; what hardens between now and Phase 14 is the runtime, not the surface
- Defense in depth applies here too: capabilities clipped at context construction, checked at use, RLS on persisted plugin tables, planned process isolation for high-risk caps

**Phase 01 progress:** 6 of 10 batches done.

### Added — 2026-06-20 (Phase 01, Batch 7 — federation primitives)

Phase 01 Batch 7 lands the cryptographic substrate for the Theourgia native federation protocol: per-instance Ed25519 keypair, HTTP message signatures (focused RFC 9421 subset), capability tokens (EdDSA-signed JWTs), DID identity helpers, and the ``.well-known/theourgia/actor`` publication endpoint. The full federation operations (Push, Pull, Mirror, Invite, RitualSchedule, …) land in Phase 12; this batch lands the primitives Phase 12 will compose.

**Federation package** (`backend/theourgia/core/federation/`):
- `identity.py` — DID syntax (``did:theourgia:host`` for instances, ``did:theourgia:host:vault:slug`` and ``did:theourgia:host:hub:slug`` for actors). ``make_instance_id``, ``make_actor_id``, ``parse_actor_id``, ``ActorKind`` enum. Strict regex validation of host + slug; lowercases hosts; rejects ``ActorKind.INSTANCE`` from ``make_actor_id`` (use the dedicated builder).
- `keys.py` — Ed25519 keypair management. ``generate_keypair``, ``load_or_create_keypair`` (idempotent; generates on first call, reuses thereafter; writes private key as PKCS8 PEM with mode 0600 via ``os.open(O_EXCL)``; recreates public-key file if absent). ``serialize_public_key`` / ``deserialize_public_key`` produce URL-safe base64 (no padding) of the 32-byte raw key — what we expose in ``.well-known/theourgia/actor``. ``InstanceKeypair`` repr never leaks key bytes. Permissive permissions on the private key file produce a logged warning. Loading a non-Ed25519 key raises.
- `http_signatures.py` — RFC 9421 focused subset. Covered components: ``@method``, ``@path``, ``host``, ``date``, ``content-digest``. Algorithm: Ed25519 only. Single signature label ``sig``. ``sign_request`` / ``verify_request`` / ``build_signature_base`` / ``content_digest_header``. Replay protection via ``SIGNATURE_MAX_AGE_SECONDS=300`` and ``SIGNATURE_MAX_FUTURE_SKEW_SECONDS=60``. Verifier rejects: missing signature headers, malformed signature input, unsupported algorithm, too-old or too-future signatures, keyid mismatch (when expected), tampered method / path / host / body (via Content-Digest), wrong public key.
- `capability_tokens.py` — EdDSA-signed JWTs. ``issue_capability_token`` / ``verify_capability_token`` / ``CapabilityToken`` dataclass. Claims: ``iss`` / ``sub`` / ``aud`` / ``cap`` / ``iat`` / ``nbf`` / ``exp`` / ``jti``. Issuance validates: all three actor fields parse as DIDs, capabilities list non-empty, TTL positive and ≤ 30 days. Verification validates: signature, expiry, not-before, audience (if expected), issuer (if expected), all claims present, all DIDs parseable, required capability (if specified). Default TTL = 1 hour. Replay-cache bookkeeping (``jti``) is the caller's responsibility — lands with federation operations in Phase 12.

**API endpoint:**
- `api/routers/well_known.py` — ``GET /.well-known/theourgia/actor`` returns ``{did, public_key, public_key_algorithm, api_base, software, software_version, protocol_versions}``. Unauthenticated (federation peers need to read this to verify signatures). Lazy-loads the instance keypair on first access; ``ServiceUnavailableError`` if key file unreadable.
- ``register_routers`` wires the well-known router under the ``federation`` tag.

**Tests** (4 files, ~50 test functions):
- `test_federation_identity.py` — instance/vault/hub DID construction and parsing, lowercase normalization, port allowance, rejection of bad hosts and slugs, round-trip
- `test_federation_keys.py` — keypair generation determinism, randomness, repr no-leak, serialize / deserialize round-trip, ``load_or_create`` idempotence, restrictive private-key permissions (no group/other), public-key recreation when missing, rejection of non-Ed25519 keys
- `test_federation_http_signatures.py` — sign / verify round-trip, tampered method / path / host / body detection, wrong public key, unsupported algorithm, too-old / too-future signatures, keyid mismatch, missing / malformed signature headers, signature base composition, body integrity via Content-Digest
- `test_federation_capability_tokens.py` — issue/verify round-trip, fresh ``jti`` per issue, wrong key fails, expired fails, audience / issuer mismatch fails, required-capability check, empty-capabilities / non-positive / absurd-TTL rejection, invalid-DID issuer rejection, empty-token rejection, iat / nbf / exp relationship

**Security properties verified by tests:**
- Key material never appears in ``repr`` / ``str``
- Replay window enforced (signatures > 5 min old refused)
- Future-skew bounded (signatures > 60 s ahead refused)
- AAD-equivalent guarantee for HTTP: tampering with any covered component (including body via Content-Digest) breaks the signature
- Algorithm pinning at verifier (no RSA / HMAC / "none" downgrade attacks)
- Capability tokens enforce structural validity of all DID claims before trusting them
- 30-day TTL ceiling on capability tokens (defense against indefinite-lifetime tokens leaking)

**Phase 01 progress:** 7 of 10 batches done. Remaining: backup tooling, observability, WebAuthn + scale tests + zero-telemetry verifier.

### Added — 2026-06-20 (Phase 01, Batch 8 — backup tooling)

Phase 01 Batch 8 lands the Restic-based backup substrate: CLI wrapper, retention policy, run-history model, and the disaster-recovery runbook. The actual scheduled job-runner (Celery beat) wires up in Batch 9 / Observability where Celery is configured.

**Backup package** (`backend/theourgia/core/backups/`):
- `policy.py` — `RetentionPolicy` dataclass mapping to Restic's `--keep-*` flags. Defaults: 5 latest + 24 hourly + 7 daily + 4 weekly + 12 monthly + 5 yearly. Negative values rejected; zero-rules omitted from argv; tags supported (`--keep-tag`). `keeps_anything` predicate guards `prune` against accidentally deleting all snapshots.
- `restic.py` — `ResticClient` subprocess wrapper around the `restic` binary. **Subprocess runner is dependency-injected** so tests run without the binary present. Builds env (`RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, `AWS_*`) per call so credentials never live longer than they need to. Methods: `init` / `check` / `backup` / `snapshots` / `restore` / `prune`. `backup` parses Restic's JSON line-delimited output, surfaces a typed `BackupSummary` even on failure (outcome=FAILURE), tags each snapshot with `trigger:<source>`.
- `status.py` — `BackupOutcome` enum + `BackupSummary` dataclass returned by `ResticClient.backup`.

**Models** (`backend/theourgia/models/backups.py`):
- `BackupRun` — one row per backup attempt with started_at / finished_at / status / trigger / snapshot_id / bytes_transferred / files_new / files_changed / duration_seconds / error_message / tags_csv.
- `BackupRunStatus` enum (running / success / failure / skipped) and `BackupTrigger` enum (scheduled / manual_api / manual_cli / pre_migration).

**Migration** (`0005_backup_run.py`):
- Creates `backup_run_status` and `backup_trigger` Postgres enums plus the `backup_run` table with indexes on `(started_at)` and `(status, started_at)`.
- RLS: admin-only read (hub_admin or hub_officer membership required).

**Documentation:**
- `docs/admin/disaster-recovery.md` — full DR runbook covering passphrase importance, fresh-host provisioning, repo verification, snapshot listing, in-place vs full restore, post-restore smoke checks, federation key re-establishment, post-incident, drill cadence, common failure modes, and an escalation path.

**Tests** (2 files, ~25 test functions):
- `test_backups_policy.py` — defaults, all-zero rejection via `keeps_anything`, negative-value rejection, tag-only policy allowed, restic-args composition, frozen dataclass
- `test_backups_restic.py` — fake subprocess runner records every call. Verifies: env includes repository + credentials, every command emits the right argv, snapshot JSON parsed correctly (including ISO-8601 with nanoseconds + 'Z' suffix), summary JSON parsed with both `data_added` and `total_bytes_processed` fallback, non-summary messages ignored, failure produces a typed summary (not an exception), restore rejects empty snapshot_id, prune refuses all-zeros policy, invalid JSON raises ResticError

**Why subprocess (not a binding):** Restic ships no stable Python binding and is a single static binary that's trivial to include in the Docker image. Subprocess invocation is the canonical pattern; we just type-wrap it.

**Encryption posture (recap from NOTICE):** Restic encrypts every snapshot under `RESTIC_PASSWORD` before any bytes leave the process. The R2/S3 backend stores opaque ciphertext; a leaked storage credential cannot decrypt backups. The trade-off — a lost passphrase is also fatal — is documented in the DR runbook.

**Phase 01 progress:** 8 of 10 batches done. Remaining: observability (logging, metrics, Celery beat wiring), WebAuthn + zero-telemetry verifier + integration test fixtures.

### Added — 2026-06-20 (Phase 01, Batch 9 — observability)

Phase 01 Batch 9 lands the operability substrate: structured logging with request-ID correlation, Prometheus metrics, opt-in Sentry, and the Celery app + beat schedule that finally wires up scheduled backups.

**Observability package** (`backend/theourgia/core/observability/`):
- `context.py` — `bind_request_id` / `bind_user_id` / `clear_observability_context` over :mod:`contextvars`. Propagates per-request identifiers through every `await` boundary into logs and metrics without explicit threading.
- `logging.py` — structlog over stdlib `logging`. **Idempotent** `configure_logging()` (no duplicate handlers on repeated calls). JSON in production / test, pretty / colorized in development; format choice automatic from `THEOURGIA_LOG_FORMAT` (`auto` resolves per-env). Custom processor pulls `request_id` and `user_id` off the contextvars onto every line. Stdlib root logger routes through structlog's `ProcessorFormatter` so libraries that log via stdlib (SQLAlchemy, uvicorn) join the same JSON stream. `uvicorn.access` and `sqlalchemy.engine` quieted to WARNING in JSON mode.
- `metrics.py` — six initial collectors registered against a **dedicated `CollectorRegistry`** (not the prometheus_client default — keeps test isolation clean and prevents bleed from libraries that register defaults): `theourgia_http_requests_total` (counter, labels: method/path_template/status), `theourgia_http_request_duration_seconds` (histogram with tuned buckets 5ms..10s), `theourgia_backup_runs_total` (counter, labels: outcome), `theourgia_backup_run_duration_seconds` (histogram, buckets 1s..1h), `theourgia_backup_bytes_transferred_total` (counter), `theourgia_plugin_active` (gauge). `render_metrics()` returns `(body, content_type)` for the HTTP endpoint.
- `sentry.py` — **opt-in** Sentry initialization. Empty DSN → silent no-op (preserving Theourgia's zero-telemetry default). DSN-set + sentry-sdk-missing → single warning + continue (operator misconfiguration must not crash startup). DSN-set + sentry-sdk-present → init with `send_default_pii=False`, configurable traces sample rate (default 0.0), env + release tags. FastAPI + Celery integrations loaded lazily and best-effort.

**Tasks package** (`backend/theourgia/core/tasks/`):
- `app.py` — `build_celery_app()` factory + module-level `celery_app` singleton. Configures: Redis broker + backend from `REDIS_URL`, **JSON-only serialization (no pickle)**, `task_acks_late=True`, `task_reject_on_worker_lost=True`, `worker_prefetch_multiplier=1`, `broker_connection_retry_on_startup=True`, UTC timezone, per-route queue assignments (`backups` queue for backup tasks).
- `app.py` — beat schedule declared in source: `theourgia.backup.daily` at 03:15 UTC daily (full retention tag), `theourgia.backup.hourly_incremental` every 6 hours (incremental tag).
- `backup.py` — `run_scheduled_backup(*, incremental: bool=False)` Celery task. Sync wrapper that uses `asyncio.run()` to call `ResticClient`; persists each run as a `BackupRun` row; emits Prometheus counters/histograms; applies retention via `DEFAULT_POLICY` after success. **Returns failure as a `BackupRun` row, not an exception** — config mistakes shouldn't burn Celery retries.

**Metrics endpoint** (`backend/theourgia/api/routers/metrics.py`):
- `GET /metrics` returns Prometheus exposition-format text. **Admin-scoped** (`admin.observe` scope) — deliberate departure from unauthenticated-`/metrics` convention to avoid fingerprinting a practitioner instance. Operators with a metrics sidecar build their own scrape with an admin token.

**Wiring:**
- `RequestIDMiddleware` now also calls `bind_request_id()` so every log line emitted during the request carries the same UUIDv7 in `request_id`. Clears observability context in a `finally` block at end-of-request to prevent bleed.
- `get_current_user` dependency calls `bind_user_id()` after the bearer token resolves; downstream log lines and metrics carry the authenticated user id.
- `create_app()` calls `configure_logging()` before anything else can emit a stdlib log line.
- `lifespan` calls `init_sentry()` at startup; emits a structured `theourgia.api.starting` event with `telemetry="none"` (or `"operator_opt_in"` when Sentry was activated).
- `register_routers()` now mounts the metrics router under operations tags.

**Scopes:**
- New scope `admin.observe` added to `Scope` enum for the `/metrics` endpoint and future observability surface.

**Settings additions** (`core/config.py`):
- `THEOURGIA_LOG_FORMAT` (`json` / `pretty` / `auto`) with a `resolved_log_format` property that resolves `auto` per environment.
- Restic / S3 backup settings: `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, plus `THEOURGIA_BACKUP_INCLUDE_PATHS` and `THEOURGIA_BACKUP_EXCLUDE_PATTERNS`.
- Observability: `THEOURGIA_SENTRY_DSN` (default empty = no Sentry, preserves zero-telemetry promise) and `THEOURGIA_SENTRY_TRACES_SAMPLE_RATE` (default 0.0).

**Dependencies** (`backend/pyproject.toml`):
- Core: added `prometheus-client >=0.21,<1.0`.
- Optional `[sentry]`: `sentry-sdk[fastapi,celery] >=2.20,<3.0`. **Off the default install path** so a stock Theourgia has no Sentry code present at all.

**Documentation:**
- `docs/admin/observability.md` — runbook covering log format/levels, metrics catalog with sample Prometheus scrape config, Sentry opt-in, Celery beat schedule + worker commands, common log lookups, and "when something is wrong" walkthrough.

**Tests** (4 files, ~28 functions):
- `test_observability_logging.py` — `configure_logging` is idempotent; JSON output is parseable; `request_id` and `user_id` appear in lines when bound; absent when not; pretty mode emits something; log-level filtering works
- `test_observability_metrics.py` — render returns (bytes, content-type); all six metrics appear in output; counter / histogram / gauge increments visible; **registry is not the prometheus_client default** (isolation invariant); precise counter-value parsing skips `_created` lines and labelled lines
- `test_observability_sentry.py` — empty DSN = silent no-op (the zero-telemetry-default guarantee); missing sentry-sdk = warn + continue, never crash; present DSN + fake sdk = init called with right shape (DSN, traces sample rate, `send_default_pii=False`, environment)
- `test_tasks_celery.py` — broker is Redis; JSON-only serialization (pickle explicitly absent); reliability flags set; UTC enforced; beat schedule includes both daily + hourly_incremental with correct task names + kwargs + queue routing; `run_scheduled_backup` registered with the app via import side-effect

**Phase 01 progress:** 9 of 10 batches done. One remaining: WebAuthn + zero-telemetry verifier + integration test fixtures.

### Added — 2026-06-20 (Phase 01, Batch 10 — WebAuthn, zero-telemetry verifier, fixtures)

Phase 01 Batch 10 closes Phase 01 (Core Architecture). WebAuthn passkey substrate, a CI-enforceable zero-telemetry verifier, and the conftest fixtures that future integration tests will build on.

**WebAuthn substrate** (`core/auth/`):
- `challenges.py` — `ChallengeStore` Protocol (runtime-checkable) with `InMemoryChallengeStore` (tests / single-process dev) and `RedisChallengeStore` (production, SETEX + GETDEL for atomic write-with-ttl + read-and-delete). 5-minute default TTL (`DEFAULT_CHALLENGE_TTL_SECONDS`). Namespaced keys (`reg:<user>` vs `auth:<session>`) so a stolen registration challenge can't be replayed as authentication.
- `webauthn.py` — `WebauthnService` orchestrating both ceremonies. **Sign-count regression detection** — if the authenticator reports a count ≤ the stored count (after the first non-zero observation), raises `VerificationFailedError("possible clone")`. Lazy imports of `py-webauthn` so the wrapper module is importable without the library (tests use a stubbed module). Distinct error taxonomy: `WebauthnError` → `ChallengeExpiredError` / `VerificationFailedError`. Library errors are wrapped, never leaked.

**WebauthnCredential model** (`models/webauthn.py`):
- Per-user, multi-credential. Fields: credential_id (LargeBinary, unique), public_key (LargeBinary), sign_count, transports_csv, aaguid, attestation_format, credential_device_type, credential_backed_up, label, last_used_at, revoked_at.
- Attestation set to `NONE` at registration — practitioners may consider attestation collection intrusive; the model accepts whatever the library returns but the policy is don't-collect.

**Migration 0006** (`0006_webauthn_credential.py`):
- Table + unique index on `credential_id` + per-user index. RLS policy: `user_id = current_setting('theourgia.current_user_id')` for ALL operations.

**Zero-telemetry verifier** (`backend/theourgia/scripts/verify_zero_telemetry.py`):
- Three CI-enforceable checks:
  1. `/api/v1/meta` route source contains literal `telemetry="none"` (the public claim).
  2. `init_sentry(stock settings) → False` (Sentry is opt-in only).
  3. Telemetry SDK blocklist (`mixpanel`, `posthog`, `amplitude`, `segment_analytics`, `rudderstack`, `datadog`, `newrelic`, `rollbar`, …) not importable in default install.
- CLI entry point: `python -m theourgia.scripts.verify_zero_telemetry` (exits 0 on PASS, non-zero with diagnostics on FAIL).
- `VerifierResult` dataclass with `passed` + `failures` for programmatic use.

**Integration test fixtures** (`tests/conftest.py` — extended):
- New fixtures: `anyio_backend` (asyncio), `reset_settings` (clears cache around test), `stock_env` (no operator opt-ins — clears SENTRY_DSN, RESTIC_*, AWS_*), `app` (fresh FastAPI app per test), `async_client` (`httpx.AsyncClient` over `ASGITransport`), `postgres_url` (env-driven, None when not set so tests can `pytest.skip` gracefully).
- Existing session-scoped `_set_test_environment` (THEOURGIA_ENV=test) preserved.

**Documentation:**
- `docs/dev/testing.md` — testing guide: layout, runner commands, fixtures table, async pattern, endpoint pattern, DB-skip pattern, third-party-library-wrapper pattern (stub the library, test the wrapper), zero-telemetry verifier instructions, coverage targets, slow-test discipline.
- `plan/01-status.md` — **Phase 01 closing summary** (cold-start reference). Lists every batch with its deliverables, what was deliberately deferred, the test-enforced invariants, and the cold-start sequence for picking up Phase 02 after the design system lands.

**Tests** (3 files, ~35 functions):
- `test_challenges.py` — round-trip; single-use take semantics; TTL honored; Protocol satisfaction; Redis store uses SETEX + GETDEL; handles both async and sync Redis clients; decodes str values; custom prefix
- `test_webauthn.py` — fake `webauthn` module via `sys.modules` injection (autouse); registration round-trip; challenge stored + consumed; no-begin → ChallengeExpiredError; second finish without re-begin → expired (single use); library errors wrapped as VerificationFailedError; authentication happy path; sign-count regression → VerificationFailedError("clone"); zero-count history accepted; registration / authentication key namespaces are distinct
- `test_zero_telemetry.py` — CLI verifier passes on this repo; blocklist contains known SDKs; meta endpoint returns telemetry: "none"; Sentry off without DSN; verifier returns structured result; verifier detects a simulated blocklist violation; `main([])` exits 0

**Phase 01 progress:** **10 of 10 batches done. Phase 01 complete.**

### Phase 01 closing notes — 2026-06-20

Phase 01 (Core Architecture) is closed. Ten batches landed across the data layer, encryption, auth, authorization, API substrate, plugin host, federation primitives, backup tooling, observability, and WebAuthn + verifier infrastructure. See [plan/01-status.md](plan/01-status.md) for the cold-start reference.

**Next: Phase 02 (Frontend Foundations).** Blocked on the designer's design system handoff. When that lands, the cold-start sequence is documented in `plan/01-status.md`.

### Added — 2026-06-20 (Substrate sweep S1 — email)

First of a five-batch substrate sweep landing between Phase 01 and Phase 02 (while waiting for the designer's design-system handoff). See [plan/substrate-sweep.md](plan/substrate-sweep.md) for the full plan. The "scaffold-now, real-impl-per-batch-later" pattern — same shape the Batch 8 Restic substrate had before Batch 9 wired it up.

**`core/email/` package:**
- `message.py` — `EmailMessage`, `EmailAddress`, `Attachment` frozen dataclasses. Construction-time validation (RFC 5322-ish email shape, attachment size cap at 25 MiB, at-least-one-body invariant).
- `templates.py` — `EmailTemplate` + `TemplateRegistry`. `string.Template` `$key`/`${key}` substitution — predictable, no Jinja-style logic. Missing keys raise `KeyError` by default (with `safe_substitute=True` opt-in for partial rendering). `default_registry` module-level singleton; features register their templates at import time.
- `service.py` — `EmailService` orchestrator. Renders template, builds message with operator-configured default sender, dispatches to backend, persists to `EmailLog`, returns `EmailSendResult`. Supports `dry_run=True` for staging where you want to behave like production but skip actual delivery.
- `factory.py` — `build_email_service(settings)` and `build_backend_from_settings(settings)`. Selects backend from `THEOURGIA_EMAIL_BACKEND` (console / null / smtp / resend); enforces required env vars per backend.
- `backends/` — four backends shipped, more to follow:
  - `console.py` — dev: pretty-prints to stderr
  - `null.py` — tests: records sends + `find_by_template` / `find_by_recipient` helpers for assertions
  - `smtp.py` — stdlib `smtplib` via `asyncio.to_thread`; full MIME construction including HTML alternate, attachments, custom headers
  - `resend.py` — Resend API; lazy import so the module is importable even without the `[email-resend]` extra installed

**Celery task** (`core/tasks/email.py`):
- `send_email_async` — fire-and-forget delivery for non-critical-path sends. Automatic retry with exponential backoff (max 5 attempts, capped at 10 min). JSON-serializable arguments only (Celery's serializer).

**Models** (`models/email.py`):
- `EmailLog` table — one row per send attempt. `template_name` / `sender_email` / `recipient_csv` / `subject` / `provider` / `provider_message_id` / `status` (sent | failed | queued) / `error_message` / `tags_csv`. RLS: admin-only read.

**Migration `0007_email_log.py`** — table + `email_log_status` enum + RLS policy.

**Settings** (`core/config.py`):
- `THEOURGIA_EMAIL_BACKEND`, `THEOURGIA_EMAIL_DEFAULT_FROM`, `THEOURGIA_EMAIL_DEFAULT_FROM_NAME`, `THEOURGIA_EMAIL_DRY_RUN`
- Resend: `THEOURGIA_RESEND_API_KEY`
- SMTP: `THEOURGIA_SMTP_HOST` / `PORT` / `USERNAME` / `PASSWORD` / `USE_STARTTLS` / `USE_SSL`

**Documentation:**
- `docs/admin/email.md` — operator runbook: backend selection table, required settings, Resend setup, SMTP setup, dry-run for staging, audit / diagnostics, failure-handling, "adding a template" pointer.
- `docs/dev/email.md` — developer guide: substrate map, register-a-template pattern, send-from-a-feature pattern, sync-vs-async trade-off, testing pattern with `NullEmailBackend`, style notes (no embedded tracking — zero-telemetry promise extends to outbound mail), add-a-provider checklist.

**Tests (5 files, ~70 functions):**
- `test_email_message.py` — EmailAddress validation + formatting (with quote escaping); Attachment validation + size cap; EmailMessage invariants
- `test_email_templates.py` — substitution, missing-key raises, safe_substitute, registry duplicate-rejection + overwrite flag
- `test_email_backends.py` — protocol satisfaction; console writes to stream; null records + helpers; resend builds payload + wraps errors + lazy import; smtp full MIME construction + stub smtplib + error wrapping
- `test_email_service.py` — render + send; default sender; explicit sender override; list recipients; cc/bcc; tags; missing template; missing context var; dry_run short-circuits backend
- `test_email_factory.py` — console/null/resend/smtp selection from settings; required-env enforcement; SecretStr handling; unknown backend rejection; dry_run flag propagation

**Tooling fix:**
- `pyproject.toml` — added `ignore::pytest.PytestUnraisableExceptionWarning` to filterwarnings. `asyncio.to_thread` triggers internal-pipe resource warnings that pytest attributes to nearby tests; not actionable (the resources are inside CPython's asyncio scaffolding, not our code).

**Test discipline:** ran `pytest -q` to green (528 passed, 0 failed) before commit.

**Substrate sweep progress:** 1 of 5 (email ✓ → i18n → events → notifications → uploads).

### Added — 2026-06-20 (Substrate sweep S2 — i18n)

Second of the five-batch substrate sweep. Babel-backed translator with contextvar-driven locale resolution. Every user-facing string from this point onward should flow through `_()`; the retrofit of Phase 01 hardcoded strings comes alongside the features that own them.

**`core/i18n/` package:**
- `locale.py` — `bind_locale` / `get_current_locale` / `clear_locale` over a `ContextVar`. Same propagation pattern as the observability context: survives `await` boundaries, propagates into spawned tasks.
- `negotiation.py` — `parse_accept_language` + `negotiate_locale`. RFC 7231-style parsing with permissive whitespace handling (some clients send `q = 0.5`). Negotiation matches exact tag first, then language-only prefix (`en-US` → `en`), then falls back to default. Malformed `q=` values silently degrade rather than 500.
- `catalog.py` — `Catalog` Protocol + `InMemoryCatalog` (tests, programmatic use) + `BabelCatalog` (production, wraps `babel.support.Translations`).
- `translator.py` — `Translator` Protocol + `InMemoryTranslator` + `BabelTranslator`. Per-locale catalog cache (load-once, lock-free reads). Process-wide singleton via `configure_translator()` / `get_translator()`; tests reset between runs.
- `lazy.py` — `LazyString` for module-level constants. Resolves at `str()` coercion time, not at import time. Equality with both `LazyString` and plain `str`; concatenation works in both directions; intentionally **unhashable** (would compare equal to different strings in different locales).
- `middleware.py` — `LocaleMiddleware` (raw ASGI). Negotiation order: `?locale=xx` query override → `Accept-Language` header → default. Defensive header-length cap at 200 chars (clients sometimes send pathologically long Accept-Language values).
- `factory.py` — `build_translator_from_settings()`.

**Convenience aliases at the package root:**
- `_` = `gettext` — the canonical call point inside request handlers
- `_lazy` = `gettext_lazy` — for module-level strings (CRITICAL — direct `_()` at module scope freezes the translation to import-time locale)
- `_n` = `ngettext` — pluralization
- `_n_lazy` = `ngettext_lazy` — lazy plural

**Settings** (`core/config.py`):
- `THEOURGIA_DEFAULT_LOCALE` (default: `en`)
- `THEOURGIA_SUPPORTED_LOCALES` (comma-separated list; default: `[en]`)
- `THEOURGIA_LOCALES_PATH` (Babel catalog directory; default: `backend/locales`)

**Wiring:**
- `create_app()` calls `build_translator_from_settings()` after `configure_logging()` so the translator is ready before any user-facing string is produced.
- `register_middleware()` mounts `LocaleMiddleware` inside `RequestIDMiddleware` so error responses constructed during request-ID processing already see the negotiated locale.
- CORS: added `Accept-Language` to allowed request headers and `Content-Language` to exposed response headers (the latter for when Phase 02 starts emitting it).

**Babel infrastructure:**
- `backend/babel.cfg` — message-extraction configuration for `pybabel extract`.
- `backend/locales/en/LC_MESSAGES/messages.po` — initial empty source catalog with proper PO headers, including `Plural-Forms: nplurals=2; plural=(n != 1);`.

**Dependencies:**
- Added `babel >=2.13,<3.0` to core dependencies.

**Documentation:**
- `docs/admin/i18n.md` — operator runbook: configuration, adding a translation (extract / init / translate / compile cycle), negotiation rules, what happens on miss, diagnostics.
- `docs/dev/i18n.md` — developer guide: substrate map, canonical call points, lazy-vs-eager pattern with the import-time freeze gotcha, marking strings for extraction, pluralization, testing pattern, style rules ("would a user ever see this?"), common gotchas (no sentence-splitting across `_()` calls, Babel formatters for numbers/dates/currency).

**Tests (4 files, ~50 functions):**
- `test_i18n_negotiation.py` — parse empty / single / multi-locale / quality / case / whitespace / malformed-q / out-of-range-q; negotiate exact-match / quality-priority / prefix-match / case-preservation / realistic headers
- `test_i18n_catalog.py` — protocol satisfaction; empty + populated; plural singular/plural/fallback
- `test_i18n_translator.py` — passthrough when unconfigured; gettext per-locale; default-locale fallback; unsupported-locale fallback; missing-message passthrough; substitution; ngettext singular + plural + localized; LazyString resolves at str-time; LazyString updates with locale rebinding; LazyString equality both directions; LazyString concatenation both directions; LazyString unhashable
- `test_i18n_middleware.py` — default when no header; negotiate from header; fallback when no match; prefix match; query-param override; query-param ignored when unsupported; locale cleared after request; pathologically long header doesn't crash; locale bound during request body

**Test discipline:** ran `pytest -q` to green (584 passed, 0 failed) before commit.

**Substrate sweep progress:** 2 of 5 (email ✓, i18n ✓ → events → notifications → uploads).

### Added — 2026-06-20 (Substrate sweep S3 — domain events + transactional outbox)

Third of the five-batch substrate sweep. The integration spine — plugins, federation, AI agents, notifications, and email digests all consume from the same bus. Without this, every feature inlines its own hooks for each subscriber type.

**`core/events/` package:**
- `event.py` — `DomainEvent` frozen dataclass with type tag, payload, id, occurred_at, actor_id, request_id, metadata. Construction-time validation (type must be dotted). `to_dict` / `from_dict` round-trip for outbox persistence.
- `registry.py` — `EventType` + `EventTypeRegistry` with `register_event_type()` convenience. Names are stable identifiers (same discipline as `Scope` and `Capability`); duplicate registration raises at import time.
- `bus.py` — `EventBus` for in-process synchronous fan-out. Subscription patterns: exact (`"entry.created"`), prefix wildcard (`"entry.*"`), catch-all (`"*"`). Handlers run in registration order; exception in one handler doesn't prevent later handlers from running. Strict-registry mode (default on) raises for unregistered event types — caught at publish, not in production.
- `outbox.py` — `enqueue_event()` writes a row inside the caller's transaction; `OutboxDispatcher.tick()` drains pending rows, fans out via the bus, retries with backoff on failure, marks `dead` after `max_attempts` (default 10).

**Models** (`models/events.py`):
- `OutboxEvent` table — event_id (unique, mirrors `DomainEvent.id` for dedup), event_type, payload_json, status (pending / delivered / dead), scheduled_for, delivered_at, attempts, last_error, actor_id.
- `OutboxStatus` enum.

**Migration `0008_outbox_event.py`** — table + `outbox_status` enum + indexes (`(status, scheduled_for)` and `event_type`) + RLS (admin-only read).

**When to use which:**
- **In-process (`EventBus.publish`)** — synchronous reactions inside the current request: plugin hooks, in-memory cache invalidation.
- **Outbox (`enqueue_event`)** — durable side-effects: federation delivery, email sending, notification dispatch, webhooks. Survives process death; supports retry; at-least-once delivery.
- Most events use **both** — feature publishes once, durable subscribers see the outbox row, synchronous subscribers see the bus event.

**At-least-once delivery contract:** documented in `docs/dev/events.md`. Outbox-routed subscribers must be idempotent (typically keyed on `event.id` for dedup). In-process publication is exactly-once within the process boundary.

**Documentation:**
- `docs/dev/events.md` — developer guide: substrate map, in-process vs outbox decision, declare-an-event pattern, publish patterns (both), subscribe pattern, testing pattern, at-least-once contract, dispatcher loop.

**Tests (3 files, ~34 functions):**
- `test_events_event.py` — construction, payload, frozen, dotted-type validation, to_dict / from_dict round-trip including UUID + tz-aware timestamp + `Z` suffix
- `test_events_registry.py` — register / get / has / all / by_owner / overwrite / duplicate-rejection / convenience helper
- `test_events_bus.py` — subscribe / unsubscribe; exact / dot-star / wildcard pattern matching; multiple subscribers; registration order; strict-registry rejection; strict-registry off; handler exceptions don't prevent later handlers but first exception re-raises; sync handlers via wrapper AND directly; handlers_for introspection; clear all

**Test discipline:** ran `pytest -q` to green (618 passed, 0 failed) before commit.

**Substrate sweep progress:** 3 of 5 (email ✓, i18n ✓, events ✓ → notifications → uploads).

### Added — 2026-06-21 (Substrate sweep S4 — notifications)

Fourth substrate. Multi-channel user notifications with per-user preference gating. Pattern: `notification_service.send_to_user(user_id=..., template=..., context={...})`.

**`core/notifications/`** package — `NotificationMessage` + `DeliveryChannel` (in_app / email / web_push); `NotificationTemplate` registry with `string.Template`-style substitution; `PreferenceSet` + `PreferenceResolver` Protocol; `NotificationService` orchestrator with `RecipientLookup`; channel implementations (`InAppChannel` writes Notification rows; `EmailChannel` bridges to S1 email substrate; `WebPushChannel` is a stub until the frontend ships a service worker in Phase 02+).

**Models + migration `0009`** — `Notification` (owner-RW RLS, kind, read_state enum, action_url) + `NotificationPreferenceRow` (per-(user, kind) channel allowlist + `fully_muted` flag). Both tables owner-RW RLS.

**Tests** (5 files, ~46 functions) — message invariants, template substitution + validation + registry CRUD + by_kind, preferences (defaults + per-kind restrict + unspecified-kind fallback + empty=disabled + fully_muted + intersection-with-defaults), channels (web_push stub, email bridging with `notif.` prefix + action URL appended to text+HTML), service end-to-end (default dispatch, preferences restrict, muted, unknown recipient, missing template, one-failure doesn't block others, all-failures re-raises, channel-not-installed silently skipped).

**Substrate sweep progress:** 4 of 5 (email ✓, i18n ✓, events ✓, notifications ✓ → uploads).

### Added — 2026-06-21 (Substrate sweep S5 — object storage)

**Final substrate.** User uploads — avatars, sigil images, ritual photos, audio recordings, divination screenshots. Pluggable backends; provider-key choice is per-operator.

**`core/storage/`** package:
- `validators.py` — filename-based content-type detection via stdlib `mimetypes`, size guard with `DEFAULT_MAX_SIZE=50 MiB`, `ValidationError` (extends ValueError).
- `service.py` — `StorageService` orchestrator. `put` / `get` / `delete` / `exists` / `stat` / `presigned_get_url` / `presigned_put_url`. Validates size, wraps backend, persists `Upload` row when a `db_session` is supplied; on delete flips row status to DELETED rather than removing (audit trail retention). `presigned_put_url` caps `max_size` at the service's configured limit.
- `factory.py` — `build_storage_service(settings)` + `build_backend_from_settings(settings)`.
- `backends/base.py` — `StorageBackend` Protocol + `StorageObject` + `StorageDeliveryError`.
- `backends/null.py` — `NullStorageBackend` for tests (in-memory; records `stored`, `deletions`, `presigned_get_calls`, `presigned_put_calls`).
- `backends/local.py` — `LocalFSBackend`. Stores under a root directory. **Refuses path traversal** (`..`, absolute paths, anything that resolves outside root). SHA-256 etag. `put`/`get`/`delete` via `asyncio.to_thread` so the event loop doesn't block on disk I/O. Presigned PUT explicitly unsupported (raises `StorageDeliveryError`).
- `backends/s3.py` — `S3CompatibleBackend` with `S3Config` dataclass. **Lazy import of boto3** so the module is importable without the `[storage-s3]` extra (raises a clear `StorageDeliveryError` only when an operator actually selects this backend without installing boto3). Works against any S3 API (R2, B2, Hetzner, MinIO, AWS S3). Single-shot async client construction protected by `asyncio.Lock`. Generates presigned GET + PUT URLs via boto3.

**Models** (`models/uploads.py`):
- `Upload` table — storage_key (unique), content_type, size_bytes, etag, backend, status, owner_id (FK to user, ON DELETE SET NULL so deleted users don't orphan rows).
- `UploadStatus` enum (active / deleted / failed).

**Migration `0010_upload.py`** — table + indexes (owner, storage_key unique, status) + RLS (owner reads own rows; admins read all).

**Settings** (`core/config.py`):
- `THEOURGIA_STORAGE_BACKEND` (default: local)
- `THEOURGIA_STORAGE_LOCAL_PATH` (default: /var/lib/theourgia/storage)
- `THEOURGIA_STORAGE_MAX_UPLOAD_SIZE` (default: 50 MiB)
- S3: `THEOURGIA_STORAGE_S3_BUCKET` / `_ENDPOINT` / `_REGION` / `_ACCESS_KEY` / `_SECRET_KEY` / `_USE_SSL`

**Dependencies:**
- New optional `[storage-s3]` extra: `boto3 >=1.35,<2.0`.

**Documentation:**
- `docs/admin/storage.md` — operator runbook: backend selection table, required settings, local-FS, S3-compatible setup, common providers (R2, B2, Hetzner, AWS, MinIO), CORS, lifecycle, IAM, backup notes.
- `docs/dev/storage.md` — developer guide: substrate map, small-upload pattern (`service.put`), large-upload pattern (presigned PUT), deletion pattern (soft-delete via status flip), testing with `NullStorageBackend`, key-naming convention, content-type sniff-vs-trust ("re-validate bytes before processing"), service-vs-backend (always through the service).

**Tests (4 files, ~37 functions):**
- `test_storage_validators.py` — `detect_content_type` known + unknown extensions; `validate_size` happy path, oversize rejection, negative rejection, custom max; ValidationError extends ValueError
- `test_storage_backends.py` — NullStorageBackend protocol satisfaction + round-trip + missing-get raises + idempotent delete + exists + stat + presigned URLs record calls; LocalFSBackend round-trip + subdir creation + **path traversal rejection** + absolute-path rejection + missing-get raises + idempotent delete + SHA-256 etag verification + presigned PUT raises + empty-root rejection
- `test_storage_service.py` — put stores via backend; size validation; get/delete/exists forward correctly; presigned URLs forward; **presigned PUT caps max_size to service limit** (prevents callers from exceeding the operator's configured upload limit)
- `test_storage_factory.py` — local + null + s3 selection; S3 requires bucket + endpoint; unknown backend rejection; max-size propagation

**Test discipline:** ran `pytest -q` to green (705 passed, 0 failed) before commit.

**Substrate sweep progress: 5 of 5 COMPLETE.** All substrates landed: email ✓, i18n ✓, events ✓, notifications ✓, uploads ✓. Phase 02 (Frontend Foundations) can now resume once the designer's design-system handoff lands.
