# Design Handoff Request — H10 (Tier 8: Phase 14 author/reviewer + Phase 15 hardening + Phase 16 AI agent integration)

**Date opened:** 2026-06-27
**Requested by:** Soror Ευ. Α. (build side)
**Status:** Open — awaiting designer pickup
**Scope rationale:** H08 + H09 closed the federation + plugin-platform chrome. **H10 closes the design queue.** Three remaining clusters cover everything that stands between the current state and v1.0.0: the author/reviewer/public side of `plugins.theourgia.com` (which the H09 surfaces consume but do not author into), the Phase 15 hardening surfaces (account deletion, GDPR export, audit log, key rotation, sessions, accessibility settings), and the entire Phase 16 AI-agent integration surface (the trickiest phase for honesty discipline). Anticipated scope: **27 surfaces across three clusters** + **20 net-new cross-cutting honesty rules** (41-60). This handoff is sized to be the **last design package before launch** — anything not in here either lands at v1.1 or doesn't ship.

**Format expected:** Per-surface `.dc.html` files + `agent_data_and_components_H10.md` supplement + `agent_onboarding_H10.md` supplement, dropped into `/home/sophia/design-handoffs/theourgia/<YYYY-MM-DD>-H10/handoff_H10/`. Same folder convention as H05 / H06 / H07 / H08 / H09.

---

## How to read this document

This handoff **locks every product decision**. The designer is not asked to choose between alternatives; the designer's job is to render the locked decisions with the project's voice and visual rigor — exactly as H04–H09 filled their locked structure with `.dc.html` surfaces.

Where this document says "the surface holds X", X is required and non-negotiable. Where it says "the editorial voice fills the slot", the designer writes the prose to the project's Style Guide within the slot.

If a question genuinely remains open after this document, raise it back to the build side — **do not pick a direction yourself**.

The three clusters are independent. The designer can ship them in any order. **Cluster C (AI agents) is the largest and the most honesty-dense** — it is the one where the project's ethical stance is most directly inscribed into chrome. Approach it last, with rules 50-60 in working memory.

---

## What just shipped (the context the designer inherits)

Since the H09 request was opened (2026-06-27 morning), the build side closed:

- **H09 frontend** — all 17 surfaces (Cluster A 9 + Cluster B 8) for Phase 14 (Plugin Ecosystem). 2657 → 2677 vitest passing.
- **H09 Storybook stories** — 17 stories matching the H09 surface set, baselines pending.
- **Phase 14 backend lifecycle routes** — `b108-2n` shipped 9 endpoints + sandbox model + alembic 0061. 2435 → 2454 backend tests passing.
- **Plugin + sandbox audit-event emission** — `b108-2o` wired `AuditLogger` into every state-changing call; failed transitions emit FAILURE audit events.
- **Phase 12.5 (transport) + Phase 13 cross-instance delivery** — going into build NOW (RFC 9421 + Ed25519 + WebFinger + Postgres-backed replay-nonce store + capability tokens behind a `FEDERATION_TRANSPORT_ENABLED=false` env gate until a second test instance + threat model are available).
- **Admin API-wiring conventions chosen** — TanStack Query · skeleton loaders per surface · inline `--warn-soft` error banner at the top of each surface. The H09 routes are wired first as the worked example; the rest of the admin tree back-fills against the same pattern.

**Test counts at H10 open:** **2677 vitest passing** · 17 H09 stories landed (baselines pending) · **2454 backend tests passing** · **Alembic at 0061** · admin tsc clean across every H09 commit.

**Repo state to inspect before designing:**

- The Phase 14 backend routes shipped in `b108-2n` — `backend/theourgia/api/routers/v1/plugins.py` + `sandbox.py`. The H10 author/reviewer cluster (Cluster A) wraps the *registry-host* side of these; the *vault-side* is what H09 already covered.
- The Phase 15 plan at `plan/15-hardening-and-launch.md` § 11 (GDPR), § 13 (memorial mode), § 14 (closed-tradition flag handling), § 15 (crisis-aware nudge). These are the chrome-bearing deliverables; the operational ones (§4 ops, §6 documentation, §7 marketing site) are out of scope for design — they're documentation/devops work.
- The Phase 16 plan at `plan/16-ai-agent-integration.md`. **Read every line before drafting Cluster C.** Rule 50-60 are derived directly from §9 (Privacy & ethical considerations) of the plan.
- The H08 Federation Audit Log surface — Cluster B's PerUserAuditLog reuses the same chrome with different filters.
- The H07 Cluster B Subscription Tiers surface — Cluster A's PluginSubmissionList borrows the per-row state chrome.
- The H05 Tool Registry — Cluster C's AgentMarketplace borrows the per-row card grid, with the agent kind icon family in place of the tool family.

---

## Carry-forward standing rules (numbers 1-40 unchanged from H09)

These survive every sprint and override any later design instinct. See `feedback_match_design_exactly.md` for the locked enforcement. The full text of rules 1-30 is in the H08 design request; rules 31-40 are in the H09 design request. The load-bearing ones for H10 are:

- **Rule 2 — `--danger` reserved for Visibility → Public.** H10 has many tempting "danger" moments — account deletion, agent capability grant, key rotation, vulnerability disclosure. NONE of these use `--danger`. They all use `--warn-soft` chrome. The single exception remains Visibility → Public on a publication.
- **Rule 5 — Sealed-content discipline.** Agents NEVER see sealed content (rule 53). The data export NEVER includes sealed content in plaintext (the export is the zero-knowledge ciphertext + a note about the user's key). The audit log NEVER renders sealed content excerpts.
- **Rule 7 — Citation chrome.** Plugin author profile in the registry, vulnerability advisory submission, bundle references — all carry `‡` citation chrome where they reference an external source.
- **Rule 8 — Ritual / committed-make moments.** Account deletion · key rotation · agent first-activation · publishing a plugin to the official tier — these are all committed-make moments. Standard `--warn-soft` confirm-modal pattern applies.
- **Rule 9 — Quiet stats.** Agent token usage charts · cost meters · audit-event totals — render with quiet numerals + `--font-mono`, NOT a celebratory dashboard. The registry public home renders ZERO plugin counts on landing — the surface is browse-first, not stat-first.
- **Rule 19 — No recommendation algorithm.** The agent activity log NEVER includes "suggestions for what to do next." The marketplace NEVER includes "trending agents." The data export NEVER includes "people you might know."
- **Rule 27 — Federated content sovereignty.** Account deletion documents the limit: "Content you've federated to other instances may persist on those instances — we cannot delete it for you." This is verbatim in the AccountDeletion surface.
- **Rule 29 — Trust ledger is matter-of-fact.** Tier badges in the registry · agent capability badges · audit-event outcomes (success/failure/denied) — all neutral chrome.
- **Rule 31 — Permission-grant chrome.** Agent capability review IS the H10 expansion of this rule. Same ScrollGate pattern, same per-capability disclosure, same "no shortcut button."
- **Rule 35 — Irrevocability.** Account deletion grace period · sandbox promotion · plugin tombstone — these all carry verbatim irrevocability copy.

---

## New cross-cutting rules earned in H10

These are the registry-author / hardening / agent-integration-specific rules. They are NON-NEGOTIABLE.

### Registry side (rules 41-44)

41. **Registry submissions are never auto-promoted.** Tier 1 (Official) requires explicit maintainer review. The author chrome NEVER offers a self-promotion path — there is no "promote to Official" button on the author dashboard. Promotion is initiated from the *maintainer's* review queue, not the author's submission.

42. **License must be SPDX-validated at submission.** Non-AGPL-compatible licenses surface a `--warn-soft` block before submission proceeds. The validation list lives in the surface's copy.ts; designer renders the list inline so the author sees their license is acceptable BEFORE they click submit. The list itself is open for designer review — initial list: AGPL-3.0-only, AGPL-3.0-or-later, GPL-3.0-or-later, LGPL-3.0-or-later, MPL-2.0, MIT, BSD-2-Clause, BSD-3-Clause, Apache-2.0, CC-BY-SA-4.0 (data-only), Unlicense.

43. **Vulnerability advisories carry severity but render neutral.** Severity (Low / Medium / High) is shown as a CHIP — `--peer-ok-soft` (low) · `--ink-mute` (medium) · `--warn-soft` (high). NEVER `--danger`. The severity is just a category, not a panic button.

44. **Maintainer review chrome shows the diff.** No "approve blind" affordance — the review surface ALWAYS shows the diff against the previous version (capabilities added/removed/unchanged · file listing · migration steps). A first-submission renders "no previous version — full code review required."

### Hardening side (rules 45-49)

45. **Data export is asynchronous AND emailed.** No "click and wait 10 minutes" — the request returns immediately with a confirmation that the export will arrive via email within 24 hours. The H10 DataExportRequest surface has NO progress bar, NO polling chrome — it's a single submit, then a confirmation banner, then the magician closes the surface.

46. **Account deletion has a 30-day grace period.** The UI calls it "scheduled for deletion" not "deleted." A reactivation banner appears at every login during the grace period: *"Your account is scheduled for deletion on {date}. To keep your vault, tap Reactivate."* Reactivation is one-tap; deletion happens silently at the 30-day mark with a final email confirmation.

47. **Memorial mode is opt-in at account creation, not at end of life.** The setup happens calmly upfront, in AccountSettings under a dedicated "Digital inheritance" section. The user designates an executor (by email or by Theourgia user-handle), chooses the trigger (time-based inactivity threshold, manual executor-declaration, or hybrid), and runs through the executor-handoff flow. The chrome NEVER renders end-of-life euphemisms — "memorial," "in memoriam," "executor" are the actual words used.

48. **Session revocation is per-device, not per-token.** The SessionsAndDevices surface lists "this laptop · Athens · last seen 14 minutes ago" · "your phone · Berlin · last seen yesterday" — NOT raw token IDs. Revoke means "sign out from this device." Tokens are an implementation detail and never surfaced.

49. **Audit log NEVER shows substrate UUIDs.** Per-user audit-log entries render the action name and a human-readable actor — "you" / "the system" / "your agent: divination-companion" — NOT raw `actor_id=8d3a-…`. UUIDs are debug-only and live behind a "view raw" toggle on each row.

### Agent side (rules 50-60 · the largest section · read all of them before designing Cluster C)

50. **AI agents are OFF by default.** Even if the magician has installed an agent plugin, the agent CANNOT run until the user has BOTH granted capabilities AND added their API key. NO "first-run enable" flow. The AgentsHome surface in a fresh install renders an empty state with an editorial paragraph framing the agent layer as optional, calm, and non-required.

51. **The agent NEVER speaks first.** All agent output is in response to a magician-initiated action. There is no "your divination companion has new insights" notification, ever. No `notif.send` capability for agents at all in v1. The activity log shows agent runs; there is no inbound "the agent wants to tell you something" affordance.

52. **Closed-tradition content is invisible to agents.** This is enforced at the MCP query layer — but the UI also surfaces it verbatim in the AgentCapabilityReview modal: *"This agent will never see content tagged closed-tradition, even with broad scope. Closed-tradition exclusion is non-negotiable."* The line is rendered as plain copy, not a tooltip.

53. **Sealed content never reaches the agent.** The AgentCapabilityReview modal makes this explicit, also as plain copy: *"Sealed content is zero-knowledge. The agent's daemon has no keys to decrypt it, even at your request."* This is a *capability of the architecture*, not an opt-out — there is no toggle to override it.

54. **Agent tone is "surface" not "interpret."** UI copy uses "surface," "suggest," "find resonance," "draw attention to" — NEVER "interpret," "decode," "tell you what it means," "the answer is." This rule applies to every editorial slot in Cluster C — Style Guide voice + this tone discipline.

55. **Agent activity is logged in human-readable terms.** "The divination companion read 3 past Hekate readings and noted 2 recurring symbols." NOT raw MCP call traces. The raw-trace toggle exists for debugging but defaults to closed; the human-readable summary is what the surface leads with.

56. **Cost caps are HARD.** When the cap is hit, the agent declines to wake — the AgentRunMonitor surface shows a `--warn-soft` banner: *"This agent has reached its monthly cost cap. It will not run again until {date} or until you raise the cap."* There is NO "just this once" override that bypasses the cap silently; raising the cap is a deliberate edit in AgentByoKeySettings.

57. **BYO keys are user-supplied always.** The AgentByoKeySettings surface ONLY has "paste your Anthropic API key" or "connect your Claude subscription" — there is NEVER a "use Theourgia's key" option, not even on hosted theourgia.com. The chrome reflects this with a calm sentence in the surface header: *"Theourgia holds no API keys on your behalf. Bring your own, and you control where the cost lives."*

58. **Token usage is broken down per-agent and per-session.** No aggregate-only display. AgentCostDashboard shows: per-agent total · per-session breakdown · fresh-vs-resume split (a critical signal because resume is ~20× cheaper). The magician must always know which agent cost what.

59. **The agent's memory directory is human-editable.** AgentMemoryReader NEVER hides anything; it lists the markdown files in the agent's memory dir and lets the magician open / edit / archive any of them. The chrome surfaces the directory path in `--font-mono` so power users can find it on disk: `/srv/theourgia/agents/<vault>/<agent-id>/`.

60. **Agent-free is first-class.** The AgentsHome surface is reachable from the Platform section but carries NO "try the agent layer!" promotional chrome. The empty state is editorially neutral — it explains what agents can do, why a magician might want one, and equally why a magician might choose to never use them. The agent layer is OPTIONAL FOREVER; the chrome must reflect this in every line of copy.

---

## Backend status going in

**Phase 14 backend** — lifecycle routes shipped (`b108-2n`). The author/reviewer side of the registry is a SEPARATE backend project living at `plugins.theourgia.com`, not in the main monorepo. Cluster A surfaces are admin UI for the *registry host*, not for vault admins. The build side will scaffold the registry backend after this handoff; the API contract is locked by the surfaces in Cluster A.

**Phase 15 backend** — the audit log (Phase 01 substrate), the data export (a new background job), the account-deletion grace-period (a new background job), the key-rotation flow (Phase 01 substrate) and the sessions-and-devices view (Phase 01 substrate) are largely existing substrate work. New backend pieces: data-export job (~3 days), deletion-grace-period job (~2 days), per-user audit-log query endpoint (~1 day).

**Phase 16 backend** — the agent daemon + waker + MCP server + per-agent memory directory model are a large net-new backend project (~6-8 weeks). Cluster C surfaces lock the wire contract; the build side implements against it. The daemon runs as a separate process; the FastAPI app talks to it over a Unix socket.

The architectural choices already locked at backend level:

- **Registry is host-isolated.** `plugins.theourgia.com` is a separate FastAPI app with its own DB. The main Theourgia monorepo's `/api/v1/plugins/registry/search` proxies through. Registry author authentication uses the same WebAuthn / Ed25519 keypair as vault auth — single sign-on between the two sides.
- **Severity vocabulary for vulnerability advisories** — `low` / `medium` / `high`. No `critical` — rule 43 says severity is a category, not a panic button. A "high" advisory is sufficient to trigger admin alerts; nothing higher is needed.
- **Data export format** — JSON archive + Markdown Bundle Format (MBF). Sealed content is included as ciphertext + a note that the user needs their key. Export is generated by a background job; the user's email gets a download link that expires in 7 days.
- **Account deletion grace period** — 30 days, hardcoded. No per-instance override. The grace period IS the rule.
- **Per-user audit log** — same `audit_event` table as the federation audit log, filtered by `actor_id = current_user.id`. CSV export is a forensic artefact at the same shape as the federation one.
- **Agent daemon process model** — `theourgia-agent-daemon` runs alongside the FastAPI app. MCP server bound to a Unix socket; `claude` subprocess spawned by the daemon. Per-agent memory dir is on disk.
- **Per-agent cost cap** — a hard limit enforced at the daemon level; the daemon declines to spawn `claude` when the cap is hit. The cap value lives in the agent's config row.
- **Token usage tracking** — per-spawn (input / output / cache); per-agent (rollup); per-vault (rollup). All three live in the same `agent_session` table with rollup views.

---

## Cluster A — Registry author + reviewer + public (8 surfaces)

**Where this cluster lives:** `plugins.theourgia.com` — a separate host, separate DB, separate FastAPI app. The main monorepo's admin UI does NOT include these surfaces; they are an *adjacent* admin tree for plugin authors and Theourgia maintainers. Some surfaces are public (the home page) — the rest require author or maintainer authentication.

**Visual language for Cluster A** — same design system, same tokens. The chrome diverges from the main vault chrome ONLY in that the topbar reads `‡ plugins.theourgia.com` (rule 7) instead of the vault display name. Otherwise: same VaultNav substrate (with a different section list — Submissions / Reviews / Browse / Settings), same primitives, same `.dc.html` discipline.

### Surface A1 — `RegistryPublicHome` (PUBLIC · landing page at `plugins.theourgia.com`)

**Route:** `/` (no auth)
**What it is:** The public-facing landing page of the registry. Browse-first, NOT stat-first (rule 9 + rule 38). Anyone visiting `plugins.theourgia.com` lands here.

**Sections (top to bottom):**

1. **Header** — `‡ plugins.theourgia.com` + the project's one-line manifesto rendered verbatim. NO tagline that gestures at "the official Theourgia plugin marketplace" — the surface is the marketplace; the words don't need to assert it.
2. **The three trust tiers explained** — a calm three-column block. Each column has the tier name (Official / Community / Unverified), one paragraph explaining the trust contract, and the badge chip rendered inline.
3. **Browse by extension point** — a grid of the 18 extension points (per `plan/14-plugin-ecosystem.md § 3`). Each tile shows the extension-point name + a single-sentence description + the count of plugins in that category (the ONE place a count appears — it's load-bearing for navigation, not for ranking).
4. **Recently updated** — a small list, max 10 entries. Sort: most recent update first. NEVER popularity.
5. **Recently added** — a small list, max 10 entries. Sort: most recent first.
6. **For authors** — a calm callout linking to the PluginSubmissionForm. Editorial slot: explain that submission is open, that AGPL-compatible licenses are required, and that the review pipeline is human-driven.
7. **Footer** — link to Theourgia main site · link to plan/14 doc · link to the SDK docs · link to the code of conduct.

**Locked decisions:**

- NO "Trending this week" section (rule 38).
- NO download counters anywhere (rule 9 · rule 37).
- The three-tier explainer block is editorial-slot — designer writes the explainer text against the H09 honesty rules (rule 33 verbatim for Tier 3).
- The footer's "For authors" callout uses `--accent-soft`, NOT `--accent-soft-strong`. The registry is open but quiet.

**States:** Default · empty (registry has no plugins yet — editorial slot for "Be the first to publish" with rule-50-tone caveat that this is a calm invitation, NOT a growth-hack).

### Surface A2 — `PluginSubmissionForm` (AUTHOR · `plugins.theourgia.com/submit`)

**Route:** `/submit` (author auth)
**What it is:** The form an author fills to submit a new plugin or a new version of an existing plugin.

**Sections (top to bottom):**

1. **Page header** — "Submit a plugin" + a calm two-sentence editorial explaining the review pipeline. NO sales pitch.
2. **Manifest source** — a file picker for `plugin.toml`, with a `--font-mono` preview of the parsed manifest below. The preview re-renders on file change.
3. **Identity** — read-only fields from the parsed manifest: name, version, author DID, license. License renders with a `--peer-ok-soft` chip if SPDX-validated (rule 42), or a `--warn-soft` block stating which licenses are acceptable.
4. **Source distribution** — radio between "GitHub release" (input the tag URL) and "PyPI" (input the package + version). The chrome explains that registries hold metadata + signature, not the code itself — the code lives where the author publishes it.
5. **Signature** — Ed25519 signature input (textarea, `--font-mono`). The matching public key is fetched from the author's DID document; the surface shows the fingerprint of the key that will be used to verify.
6. **Capability summary** — the parsed capabilities from the manifest, rendered as the same chip family the H09 install modal uses. Each capability is shown with its plain-English label + wire key in `--font-mono` — exactly the same chrome as PluginCapabilityReview.
7. **Submit** — single `--accent-soft` button. Submission triggers the review pipeline and redirects to PluginSubmissionDetail.

**Locked decisions:**

- License validation is BLOCKING — a non-acceptable license disables Submit and shows the `--warn-soft` block with the accepted list (rule 42).
- The DID of the author is taken from the authenticated session — the form does NOT let the author claim a different DID.
- Capability changes from the previous version (if any) are highlighted with `--warn-soft` chrome — same rule as H09's update review.
- NO "save draft" affordance — submission is atomic. If the author wants to iterate, they iterate on their local manifest.

**States:** Default · invalid manifest (parser error, surfaced as `--warn-soft` inline) · invalid license · invalid signature.

### Surface A3 — `PluginSubmissionList` (AUTHOR · `plugins.theourgia.com/submissions`)

**Route:** `/submissions` (author auth)
**What it is:** The author's dashboard of their own submissions — pending / under review / accepted / rejected / withdrawn. NOT a public view; only the author and the maintainer see this.

**Sections (top to bottom):**

1. **Topbar** — author identity + sub-nav (Submissions · Browse · Settings).
2. **Per-row card** for each submission. Card shows: plugin name + version · submission date · current state chip · `‡` reviewer note count (zero if none).
3. **State chip vocabulary** (rule 43-adjacent · all neutral chrome):
   - `Pending review` — `--ink-mute` chip
   - `Under review` — `--accent-soft` chip
   - `Accepted (Community)` — `--peer-ok-soft` chip
   - `Accepted (Official)` — `--peer-ok-soft` chip + a small Tier-1 dot indicator
   - `Changes requested` — `--warn-soft` chip
   - `Rejected` — `--ink-mute` chip with strikethrough version (the row stays in the list for record-keeping; submissions never silently disappear)
   - `Withdrawn` — `--ink-mute` chip with the `‡ tombstoned by author` chip from H09
4. **Sort:** Most recent submission first. NO popularity / no rank.

**Locked decisions:**

- NO "promote to Official" affordance — rule 41. Promotion is initiated by the maintainer, not the author.
- "Withdraw" is the author's only state-change affordance. Withdrawing a Community-tier plugin tombstones it (rule 40 from H09) — existing installs keep working.
- The card surface is the same width as the H09 InstalledPlugins per-row card — visual consistency across the platform.

**States:** Default · empty (editorial slot: "No submissions yet. Once you submit a plugin, it will appear here.").

### Surface A4 — `PluginSubmissionDetail` (AUTHOR · `plugins.theourgia.com/submissions/:id`)

**Route:** `/submissions/:id` (author auth · scoped to the submission's author)
**What it is:** A single submission's full status, including any reviewer notes.

**Sections (top to bottom):**

1. **Header** — plugin name + version + state chip (same vocabulary as A3).
2. **Timeline** — a vertical timeline of state changes: `Submitted on … · Under review by {maintainer-handle} on … · Changes requested on … · Resubmitted on … · Accepted on …`. Each entry carries a timestamp + the actor (system / author / specific maintainer handle). NO substrate UUIDs (rule 49).
3. **Reviewer notes** — a `--font-mono` rendering of any notes the maintainer left. If the state is `Changes requested`, the notes section is the primary surface of the page (rendered above the timeline, with an editorial slot framing "What needs to change before this can be accepted").
4. **Capability listing** — same chip family as A2. If this is an update, the diff against the previous version is highlighted (rule 44).
5. **Withdraw** — only present if the submission is in `Pending review` or `Under review`. `--warn-soft` button with a confirmation modal carrying the rule-40 withdrawal copy verbatim.

**Locked decisions:**

- The "Resubmit" affordance lives elsewhere (back at A2 with a "this is a resubmission of #X" preset). The detail page is read-only EXCEPT for Withdraw.
- The reviewer note rendering preserves the maintainer's exact text — no editorial transformation, no auto-formatting beyond minimal Markdown.

**States:** Default · changes-requested (notes section primary) · accepted · rejected · withdrawn.

### Surface A5 — `RegistryReviewQueue` (MAINTAINER · `plugins.theourgia.com/review/queue`)

**Route:** `/review/queue` (maintainer auth only)
**What it is:** The maintainer-facing dashboard of all pending submissions. Single-maintainer at v1 (Soror Ευ. Α.); multi-maintainer later.

**Sections (top to bottom):**

1. **Topbar** — maintainer identity + sub-nav (Queue · Browse public · Tier promotion · Settings).
2. **Filters** — by tier-target (Community / Official) · by extension-point category · by date submitted.
3. **Per-row card** — same chrome as A3 but with the author's handle shown (since the maintainer needs to know who submitted), the manifest-parse status, and a `Start review` `--accent-soft` button.
4. **Sort:** Oldest pending first (FIFO). The maintainer's job is to clear the queue, not pick favorites.

**Locked decisions:**

- The card surface shows: author handle · plugin name + version · target tier · submission date · capability count · whether the manifest parses cleanly.
- NO "feature this submission" affordance — the maintainer doesn't promote; they review (rule 41 stays clean even on the maintainer side).

**States:** Default · empty ("No pending submissions. Queue is clear.").

### Surface A6 — `RegistryReviewDetail` (MAINTAINER · `plugins.theourgia.com/review/:submission-id`)

**Route:** `/review/:submission-id` (maintainer auth only)
**What it is:** The maintainer reviews a single submission. THE core surface of the registry maintenance experience.

**Sections (top to bottom):**

1. **Header** — plugin name + version + author handle + current state.
2. **Verification panel** — automatic checks: signature verified (Ed25519 against author's DID document) · license SPDX-validated · capability list parsed cleanly · extension points recognized. Each check renders as a `--peer-ok-soft` chip when pass and `--warn-soft` chip when fail. The panel is read-only — the maintainer cannot bypass a failing check.
3. **Diff against previous version** — rule 44. If this is an update, render: capabilities added (with `--warn-soft` chrome) · capabilities removed · capabilities unchanged (rendered quietly). If this is a first submission, the section reads "First submission — full review required" and lists every capability.
4. **Manifest preview** — `--font-mono` rendering of the parsed manifest.
5. **Source download** — link to the GitHub release or PyPI package. The maintainer downloads and reviews the code OUTSIDE the surface — the chrome doesn't try to embed a code viewer.
6. **Reviewer notes textarea** — the maintainer types feedback here. The text is shown verbatim to the author on PluginSubmissionDetail.
7. **Decision** — three buttons (rule 44):
   - `Request changes` (`--warn-soft`) — sends notes to author, state goes to `Changes requested`
   - `Accept as Community` (`--peer-ok-soft`)
   - `Accept as Official` (`--peer-ok-soft` + Tier-1 dot indicator) — but ONLY enabled if the verification panel is all-green AND there's a maintainer-acknowledgement checkbox

**Locked decisions:**

- "Accept as Official" requires an explicit acknowledgement checkbox: *"I have reviewed the source code, the migration history, the capability declarations, and the test coverage. This plugin meets the Official-tier bar."* The checkbox label is verbatim above.
- "Reject" is NOT a top-level button — the maintainer either requests changes (giving the author a path) or accepts. A persistent stuck submission can be tombstoned by the maintainer manually after long inactivity, but that's a separate operations action, not a primary review affordance.

**States:** Default · verification-fail (decision buttons hidden until checks pass) · accepted · changes-requested.

### Surface A7 — `TierPromotion` (MAINTAINER · `plugins.theourgia.com/review/tier-promotion`)

**Route:** `/review/tier-promotion` (maintainer auth only)
**What it is:** A standalone surface for promoting a Community-tier plugin to Official, AFTER initial review. Separate from A6 because a plugin may live in Community for months before earning Official.

**Sections (top to bottom):**

1. **Header** — "Promote to Official."
2. **Plugin picker** — autocomplete of all Community-tier plugins. The picker shows: plugin name + version · author · time-in-Community (e.g., "in Community for 4 months").
3. **Promotion checklist** — a manual checklist the maintainer steps through:
   - Time-in-Community ≥ 90 days (auto-checked from DB)
   - No outstanding vulnerability advisories (auto-checked)
   - At least one community-reported success-story or use-case (manual)
   - Migration history is clean (manual)
   - Test coverage ≥ 80% on the maintained branch (manual review)
   - License remains AGPL-compatible (auto-checked)
4. **Justification textarea** — the maintainer writes the public-facing rationale for promotion. This text appears on the plugin's RegistryPluginDetail page (from H09 surface 8) under a `‡ Promoted to Official on {date}` line.
5. **Promote** — `--accent-soft` button enabled only when every checklist item is satisfied.

**Locked decisions:**

- Auto-checks are read-only; the maintainer cannot override them.
- Manual checks are explicit checkboxes that the maintainer ticks.
- Promotion is logged as an audit event (`registry.tier_promotion`) — the audit log carries the maintainer handle + the justification text.

**States:** Default · checklist-incomplete (Promote disabled) · promote-success (toast + redirect to A4's detail view).

### Surface A8 — `VulnerabilityAdvisorySubmit` (AUTHOR or MAINTAINER · `plugins.theourgia.com/security/advisory`)

**Route:** `/security/advisory` (any authenticated user — authors file advisories for their own plugins; maintainers for any plugin)
**What it is:** The form for filing a vulnerability advisory. The downstream of this surface is the `VulnerabilityAdvisoryBanner` shown in H09 surface 6.

**Sections (top to bottom):**

1. **Header** — "File a security advisory."
2. **Affected plugin picker** — autocomplete (authors see only their own plugins; maintainers see all).
3. **Affected version range** — two version inputs ("from X.Y.Z to X.Y.Z inclusive") + an "all versions" checkbox.
4. **Severity selector** — three radio buttons (Low / Medium / High) with each rendering its rule-43 chip color (`--peer-ok-soft` / `--ink-mute` / `--warn-soft`). NO `--danger`. The selector ALSO carries a calm editorial line explaining each tier — what kind of vulnerability earns each level.
5. **Advisory body** — textarea for the advisory text. The text appears verbatim in the H09 banner (surface 6). The editorial slot in copy.ts frames "Be exact. Be calm. Use plain English."
6. **Remediation version** — version input for the patched release. If "no patched version available" is checked, the advisory still ships but the banner renders without a remediation line.
7. **Disclosure timing** — radio between "publish immediately" and "schedule disclosure for {date}". The default is "publish immediately."
8. **Submit** — `--warn-soft` button (mid-severity action). Submission triggers the banner being broadcast to all installed instances (the substrate side handles that).

**Locked decisions:**

- The advisory text appears VERBATIM in the H09 banner — no editorial transformation, no auto-formatting beyond Markdown.
- The author's identity (who filed the advisory) appears in the banner's `‡ filed by …` line. NOT the maintainer (unless the maintainer filed it for the author).
- NO `critical` severity. Three tiers, period.

**States:** Default · scheduled (advisory submitted but not yet visible — chrome confirms the date) · published (advisory live; the surface redirects to a read-only view).

---

## Cluster B — Hardening (7 surfaces)

**Where this cluster lives:** main monorepo, under the vault's admin UI. Reachable from the existing AccountSettings hub.

**Visual language** — calm, deliberate, ritual-make. These surfaces are the magician's relationship with their own infrastructure — they should feel like respectful machinery, not anxiety-inducing config screens.

### Surface B1 — `AccountSettings` (`/settings`)

**Route:** `/settings`
**What it is:** The hub of all account-level settings. NOT a flat preferences page — a sectioned hub that links to specialized surfaces (B2-B7 + existing ones).

**Sections (top to bottom):**

1. **Identity** — display name, magickal name, persona summary. Link to existing Persona surface (Phase 02).
2. **Security** — link to B5 (KeyRotation) · link to B6 (SessionsAndDevices) · WebAuthn enrollment.
3. **Privacy** — link to B2 (DataExportRequest) · link to B4 (PerUserAuditLog).
4. **Accessibility and motion** — link to B7 (AccessibilityAndMotion).
5. **Digital inheritance** — opt-in toggle + setup CTA. The setup launches a multi-step flow (executor designation · trigger configuration · executor-handoff rehearsal). Rule 47 applies — calm, upfront, real words.
6. **Account lifecycle** — link to B3 (AccountDeletion). Standard `--warn-soft` chrome for the link itself; the actual deletion lives on B3.
7. **About this Theourgia instance** — operator handle · version · instance URL · link to source repository. Calm chrome — this is a "footer-ish" block but rendered explicitly.

**Locked decisions:**

- Each section is a collapsible card. Default state: collapsed except Identity.
- NO "advanced settings" toggle that hides anything. Every setting is reachable from this hub.
- Digital inheritance is rule-47 — chrome says "executor," not "next of kin."

**States:** Default · loading (skeleton per section).

### Surface B2 — `DataExportRequest` (`/settings/data-export`)

**Route:** `/settings/data-export`
**What it is:** The GDPR Article 15 right-to-access export request. Rule 45 — async, emailed, no spinner.

**Sections (top to bottom):**

1. **Header** — "Export your vault."
2. **What's included** — a quiet list:
   - All entries (markdown + structured JSON)
   - All entities (Beings ledger)
   - All divination sessions and results
   - All library items + correspondences
   - All publications (drafts + published versions)
   - All media file metadata + URLs (the files themselves remain in R2 — link list rather than embedded blobs)
   - Sealed content as **ciphertext only** with a note that the user must hold the key to decrypt
   - All audit events the magician is the actor of
3. **What's NOT included** — equally quiet:
   - Other users' content (even if you're in shared hubs together)
   - Sealed content in plaintext (you have the key; we don't)
   - Federated content originated by other vaults
4. **Format** — radio: JSON archive (zip) · Markdown Bundle Format (zip) · both (separate downloads).
5. **Delivery** — read-only: "An email with download links will arrive at {email} within 24 hours." NO progress bar. NO polling.
6. **Submit** — `--accent-soft` button. Submission triggers a confirmation toast and the surface transitions to the "requested" state.

**Locked decisions:**

- NO spinner / NO polling chrome (rule 45).
- The download links expire in 7 days; the surface mentions this verbatim in the delivery section.
- An export request cannot be cancelled once submitted — the job will run. The chrome states this calmly.

**States:** Default · requested (the surface shows "Request received. Email pending.") · existing pending request ("You already have an export request in flight from {date}. The link will arrive at your email by {date+24h}.").

### Surface B3 — `AccountDeletion` (`/settings/delete-account`)

**Route:** `/settings/delete-account`
**What it is:** The 30-day grace-period account deletion flow (rule 46).

**Sections (top to bottom):**

1. **Header** — "Delete your account."
2. **What this does** — a calm, factual list:
   - All your vault data is scheduled for deletion in 30 days
   - During the grace period, you can reactivate from any login screen
   - At day 30, your data is irreversibly deleted (with the exception of audit-log entries we are legally required to retain)
   - Content you've federated to other instances may persist on those instances — we cannot delete it for you (rule 27)
   - Content you've published publicly may have been archived by readers — we cannot delete it for them
3. **Memorial mode interaction** — IF the user has set up digital inheritance, surface this verbatim: "You have an executor designated for memorial mode. Deletion cancels the memorial mode designation. If you instead want your vault preserved per your inheritance plan, do not delete — let the inactivity trigger fire."
4. **Confirmation** — three-step:
   - Type your magickal name verbatim
   - Type the date you started this account (we render it inline so the user can see it)
   - Tap "Schedule deletion"
5. **Schedule deletion** — `--warn-soft` button (NOT `--danger` — rule 2). Confirmation modal carries the verbatim copy from rule 46.

**Locked decisions:**

- Three-step confirmation is non-negotiable — accidents are the enemy here.
- The grace-period banner appears on every login during the 30 days; the chrome for that banner lives in B1 (AccountSettings) but is mentioned here.
- The audit-log entries we retain are listed: which events, how long, why (legal). Editorial slot for the precise list.

**States:** Default · in-grace-period ("Your account is scheduled for deletion on {date}." + "Reactivate" button) · final-day ("Your account will be deleted today. Reactivate now or your data will be gone.").

### Surface B4 — `PerUserAuditLog` (`/settings/audit`)

**Route:** `/settings/audit`
**What it is:** The magician's view of their own audit events. NOT the federation-side audit log (that's H08 surface 14); this is the personal one.

**Sections (top to bottom):**

1. **Header** — "Your audit log."
2. **Editorial preamble** — one calm paragraph explaining what's here, what isn't, and why this log exists at all (rule 49 + transparency).
3. **Filters** — same chrome as the H08 federation audit log: actor (always "you" or "your agents" or "the system") · event-kind · time range.
4. **Event list** — chronological, most recent first. Each row:
   - Human-readable action ("you signed in" / "your divination companion read 3 past Hekate readings" / "the system processed your data export request")
   - Timestamp (local timezone with hover-to-UTC)
   - Outcome chip (success / failure / denied · neutral chrome)
   - Expand for detail (full event payload, but UUIDs hidden by default behind a "view raw" toggle per rule 49)
5. **CSV export** — same as the federation audit log. Forensic artefact.

**Locked decisions:**

- The substrate UUIDs are HIDDEN by default (rule 49). The "view raw" toggle is per-row, not page-wide.
- The event-kind vocabulary is the same as the existing audit-log vocabulary: `auth · visibility · sealed_read · federation · plugin · admin · backup · security · system`. The H10 cluster adds `agent` (Phase 16) — see Cluster C surfaces.

**States:** Default · empty (editorial slot: "Nothing's happened yet. As soon as you do something, it'll appear here.").

### Surface B5 — `KeyRotation` (`/settings/keys`)

**Route:** `/settings/keys`
**What it is:** Rotate the magician's signing keys (Ed25519 used for federation envelopes + ActivityPub + capability tokens).

**Sections (top to bottom):**

1. **Header** — "Your signing keys."
2. **Current key** — fingerprint in `--font-mono` · created date · last used.
3. **Rotation flow** — a four-step wizard:
   - Generate the new key (client-side, never leaves the browser)
   - Re-sign all your existing federation envelopes with the new key (a background job)
   - Publish the new public key to your DID document
   - Retire the old key (kept in a "trusted history" list so federation peers can still verify older messages)
4. **Trusted key history** — list of previous keys with retirement dates. NEVER deleted from this list — federation peers may reference them.
5. **Emergency revoke** — `--warn-soft` button for the case where a key was compromised. Verbatim copy: *"If you believe your key has been compromised, revoke immediately. Revocation propagates to your federation peers within 24 hours."*

**Locked decisions:**

- Rotation is ritual-make — the four-step wizard cannot be skipped.
- The new key is generated client-side; the substrate NEVER touches the private key (rule 5-adjacent — zero-knowledge for keys too).
- Revocation is one-button; the user types their magickal name to confirm.

**States:** Default · in-rotation (wizard in progress) · revoked (banner with "Your last key was revoked on {date}. Generate a new one to resume federation.").

### Surface B6 — `SessionsAndDevices` (`/settings/sessions`)

**Route:** `/settings/sessions`
**What it is:** List of active sessions per device. Rule 48 — the chrome speaks of devices, not tokens.

**Sections (top to bottom):**

1. **Header** — "Your active sessions."
2. **Current session card** (highlighted) — device name (e.g., "this laptop · Firefox · Athens") · IP geo · last seen · "this session" badge.
3. **Other active sessions** — list of cards, each with: device name · IP geo · last seen · `Sign out` button.
4. **Sign out everywhere else** — `--warn-soft` button at the bottom that ends every session except the current one.

**Locked decisions:**

- NO token IDs ever shown (rule 48).
- Device name is derived from User-Agent + IP geo; the chrome doesn't expose raw UA strings.
- Sign-out of an active session takes effect immediately; the user on that device gets a one-time toast explaining they were signed out from another location.

**States:** Default · single-session ("This is your only active session. No other devices are signed in.").

### Surface B7 — `AccessibilityAndMotion` (`/settings/accessibility`)

**Route:** `/settings/accessibility`
**What it is:** A11y + motion + autoplay opt-outs. The Phase 15 plan's §1 + §15 surface.

**Sections (top to bottom):**

1. **Header** — "Accessibility and motion."
2. **Reduced motion** — toggle. Default: respect `prefers-reduced-motion` system pref.
3. **Increased contrast** — toggle. Default: respect `prefers-contrast` system pref.
4. **Larger text** — slider, 0.875× → 1.5× of baseline. Default 1.0×.
5. **Autoplay** — toggle for "auto-play audio recordings of voces magicae and meditation prompts." Default: OFF.
6. **Crisis-aware nudge (opt-in)** — toggle for the rule from `plan/15-hardening-and-launch.md` § 15. Default: OFF. Editorial slot for what this nudge is, when it surfaces, how to dismiss. Care palette only, NEVER `--danger`. The "Sacred Well Directory" placeholder is referenced per the `feedback_wellbeing_copy_never_improvise.md` memory.

**Locked decisions:**

- Every toggle has a "what this does" line in `--ink-mute` below the control.
- The crisis-aware nudge section is editorial — designer drafts the copy with deep care, and the verbatim text gets reviewed by mental-health-literate readers AND practicing magicians (per the memory). DO NOT improvise.

**States:** Default · all-respecting-system ("Your system preferences will guide the chrome. Override here if you want different settings within Theourgia.").

---

## Cluster C — AI Agent Integration (12 surfaces · the largest · honesty-densest)

**Where this cluster lives:** main monorepo, under a new top-level Platform section nav item: `Agents`. Reachable only when the agent daemon is present (the daemon is an OPTIONAL deployment per rule 60).

**Visual language** — careful, deferential, quiet. Rule 54 governs every editorial slot in this cluster. The chrome must reflect rule 60 (agent-free is first-class) — NO promotional tone, NO "you should try this" anywhere. The cluster is a calm doorway, not a marketing funnel.

**Important architectural note for the designer:** The agent layer is OPTIONAL. A self-hoster who has not deployed the agent daemon will not see Cluster C surfaces at all. The chrome must NOT presume the daemon is present — every entry-point check happens at the route level (the build side handles this), but the surfaces themselves should not contain copy like "your agent daemon is running" — they assume daemon presence as given because they're only rendered when it's present.

### Surface C1 — `AgentsHome` (`/agents`)

**Route:** `/agents`
**What it is:** The landing surface of the agent layer. Rule 60 — calm, non-promotional, agent-free-first.

**Sections (top to bottom):**

1. **Topbar** — "Agents" + sub-nav (Agents · Marketplace · Memory · Cost · Settings).
2. **Editorial intro** — one calm paragraph (Style Guide voice + rule 54). The editorial slot frames: agents are an optional companion layer · they help the magician surface their own knowledge · they never speak first · they never see sealed or closed-tradition content · the magician is always the ground truth. The paragraph references rules 50-53 in plain English without naming them.
3. **Active agents** — list of agents the magician has installed. Each row: agent name · kind icon · last-active · status chip (active / paused / cost-capped). NEVER a "start now" affordance directly on the row — running an agent goes through AgentTaskComposer.
4. **Installed-but-disabled agents** — same chrome, different section heading. Editorial slot reminds the user that disabled agents preserve their memory.
5. **Install an agent** — link to AgentMarketplace.

**Locked decisions:**

- The active-agent list NEVER shows token-usage numbers or cost — those live on AgentCostDashboard. Rule 9 — quiet stats.
- NO "agent of the day" or featured-agent chrome — rule 60.
- The empty state (no agents installed) carries a careful editorial paragraph explaining what agents are and are not. The chrome doesn't push the user to install one.

**States:** Default · empty (no agents installed — editorial slot framing the calm invitation, NOT growth-hacking).

### Surface C2 — `AgentMarketplace` (`/agents/marketplace`)

**Route:** `/agents/marketplace`
**What it is:** Browse the available agent types (Phase 16 §3 lists six shipped per-purpose agents). Plugin-extensible per Phase 16 §3.

**Sections (top to bottom):**

1. **Topbar** — same nav.
2. **Per-agent card** — grid of cards. Each card:
   - Agent name + kind icon
   - One-sentence description (Style Guide voice + rule 54 tone — "surface" not "interpret")
   - Capability summary chip count (e.g., "5 capabilities, read-only")
   - Source badge (Official / Community / Unverified — same tier vocabulary as the plugin registry; rule 29)
   - `View detail` link
3. **Filters** — by source tier · by capability category (read-only · read-write · read-write-with-network).
4. **Sort:** Alpha · most-recently-added. NEVER popularity (rule 38).

**Locked decisions:**

- Cards do NOT have an `Install` button — install goes through AgentInstall (C3) which carries the capability review.
- NO "trending agents" or "featured agents" — rule 60.

**States:** Default · empty (no agents available — only happens on a fresh instance with no agent registry — editorial slot for "The agent layer is plugin-driven; once you install agent plugins, they'll appear here.").

### Surface C3 — `AgentInstall` (`/agents/install/:type-id`)

**Route:** `/agents/install/:type-id`
**What it is:** The install-flow for a chosen agent type. Mirrors the H09 PluginCapabilityReview pattern with the agent-specific honesty rules layered in.

**Sections (top to bottom):**

1. **Header** — "Install the {agent name}."
2. **What this agent does** — editorial paragraph (rule 54 tone).
3. **Hard exclusions** — a sharp, calm block listing what this agent will NEVER see:
   - Sealed content (rule 53 verbatim line)
   - Closed-tradition content (rule 52 verbatim line)
   - The user emphasizes these are architectural guarantees, not preferences.
4. **Capabilities requested** — the same scroll-gated capability review chrome from H09 (ScrollGate primitive). Each capability with plain-English label + wire key + consequence text.
5. **Memory directory** — `--font-mono` rendering of the path on disk: `/srv/theourgia/agents/<vault>/<agent-id>/`. Editorial line explaining that the user can read/edit memory in C9 (AgentMemoryReader).
6. **Cost cap** — required input: monthly USD cap. The chrome explains that this is a HARD cap (rule 56) — at the cap, the agent declines to wake.
7. **BYO key check** — if the user has not yet configured their API key in C4, a `--warn-soft` block: "An API key is required before this agent can run. Configure your key after install." The install can complete WITHOUT a key (the agent stays in `inactive` state), but the warning is clear.
8. **Install** — `--accent-soft` button, gated by the ScrollGate AND by the cost-cap input being filled.

**Locked decisions:**

- The exclusions block is rendered BEFORE the capability list — the user reads what's never visible first, then what is.
- The cost-cap input has a sensible default placeholder (e.g., `$10.00`) but the user MUST type a value; default doesn't auto-fill.
- NO "Grant all capabilities" shortcut (rule 31).

**States:** Default · no-byo-key (warning block shown) · key-configured (warning hidden).

### Surface C4 — `AgentCapabilityReview` (modal · used from C3 and on update prompts)

**Route:** modal, no route
**What it is:** Standalone modal renderable from C3 (install) and from update prompts when an agent's capabilities change. SHARED chrome — primary use lives in C3, but the modal is also surfaced when an update modifies capabilities.

**Sections (top to bottom):**

1. **Header** — "Capability review."
2. **Agent identity** — name + author DID + version.
3. **Capability list** — the ScrollGate-protected list. New-on-this-update capabilities highlighted with `--warn-soft` chrome.
4. **Hard exclusions** — same block as C3.
5. **Confirm** — `--accent-soft` button, gated by ScrollGate.

**Locked decisions:**

- This modal IS the surface that rule 31 governs. Same ScrollGate, same per-capability disclosure, same "no shortcut button."

**States:** Default · update-mode (new-capabilities highlighted) · cancelled.

### Surface C5 — `AgentByoKeySettings` (`/agents/settings/keys`)

**Route:** `/agents/settings/keys`
**What it is:** The BYO-keys configuration surface. Rule 57.

**Sections (top to bottom):**

1. **Header** — "Your API keys."
2. **Editorial preamble** — rule 57 verbatim: *"Theourgia holds no API keys on your behalf. Bring your own, and you control where the cost lives."*
3. **Anthropic API key** — a secret field (same as the H09 plugin secret-field pattern — render `••••••••••••` + [Reset]; never display the existing value).
4. **Claude subscription auth** — alternative path: a single button "Connect your Claude subscription" that walks through OAuth. The chrome explains this is equivalent to the API key but uses subscription-tier rate limits.
5. **Per-agent override** — table of installed agents with an optional per-agent override key (some users may want one agent on a different account). Default: shared key from the top of the surface.
6. **Rotation note** — calm sentence: "To rotate your key, paste the new one. The old key is replaced and stops being used immediately."

**Locked decisions:**

- The existing key value is NEVER displayed (rule 57 + rule from H09 secret-field).
- NO "use Theourgia's key" option, ever (rule 57).
- The rotation chrome is one-step — there's no two-key window. New key replaces old, full stop.

**States:** Default · no-key-set (the surface defaults to this when fresh — editorial slot: "No key configured. Agents installed before a key is set will remain inactive.") · key-set.

### Surface C6 — `AgentTaskComposer` (`/agents/:agent-id/compose`)

**Route:** `/agents/:agent-id/compose`
**What it is:** The surface for starting a new agent task. Rule 51 — agent never speaks first, the magician initiates.

**Sections (top to bottom):**

1. **Header** — agent name + kind icon + status chip.
2. **Editorial preamble** — agent-type-specific. The divination companion's preamble is different from the study tutor's. Each is a calm, brief framing of what kind of task this agent is good at.
3. **Task description textarea** — the magician types what they want the agent to do. Editorial-slot placeholder text demonstrates the rule-54 tone — examples like "Find resonances between my last 5 Hekate readings" rather than "Tell me what my readings mean."
4. **Scope** — what content the agent will see for THIS task. Defaults to the agent's installed capabilities, but the user can narrow further per-task (e.g., "for this task, only look at entries from the last 30 days").
5. **Start task** — `--accent-soft` button.

**Locked decisions:**

- The task textarea placeholder demonstrates rule-54 tone — designer's editorial slot.
- The scope narrower NEVER widens — it can only restrict the installed capabilities for this task. Widening requires going back to C4 capability review.

**States:** Default · over-cost-cap (button disabled with rule-56 explanation) · agent-disabled-no-key (button disabled with link to C5).

### Surface C7 — `AgentRunMonitor` (`/agents/:agent-id/runs/:run-id`)

**Route:** `/agents/:agent-id/runs/:run-id`
**What it is:** Live view of a running task. Streaming output + kill switch.

**Sections (top to bottom):**

1. **Header** — agent name + task description (snippet) + status chip (running · completed · halted-by-user · halted-by-cap · errored).
2. **Live activity** — streaming list of what the agent is doing IN HUMAN-READABLE TERMS (rule 55): "Reading entries tagged #hekate from the last 30 days…" "Surfacing 3 entries that mention the lunar phase…" NEVER raw MCP traces by default.
3. **View raw activity** — toggle that switches the activity stream to raw MCP call traces. Defaults OFF.
4. **Token usage so far** — live counter, `--font-mono` numerals. Fresh / resume split visible.
5. **Halt** — `--warn-soft` button. Halts the agent immediately. Confirmation modal asks if the magician wants to keep the partial output.

**Locked decisions:**

- The live activity stream uses rule-55 human-readable language as the DEFAULT — raw traces are a debug toggle.
- Halt is one-tap with a single confirmation — no nested modals.
- Cost-cap halts (rule 56) surface a `--warn-soft` banner: "This agent reached its monthly cost cap mid-task. Output up to this point is preserved."

**States:** Default · running · completed · halted-by-user · halted-by-cap · errored.

### Surface C8 — `AgentTranscriptViewer` (`/agents/:agent-id/runs/:run-id/transcript`)

**Route:** `/agents/:agent-id/runs/:run-id/transcript`
**What it is:** The full transcript of a past agent session. Read-only, archived.

**Sections (top to bottom):**

1. **Header** — agent name + task description + run timestamp.
2. **Transcript** — the agent's actions and outputs rendered as a chronological list. The chrome uses two distinct rows:
   - **Magician initiation** — the original task description and any mid-run nudges.
   - **Agent action / output** — what the agent did and what it said. Rendered with the agent name + kind icon as a "speaker" label.
3. **Per-row metadata toggle** — each row can expand to show: tokens used · model variant · timestamp · MCP calls made.
4. **Export** — `--accent-soft` button. Exports the transcript as Markdown. Useful for the magician's own record-keeping and for filing bug reports.

**Locked decisions:**

- The transcript is IMMUTABLE after the run completes — no editing, no deleting.
- The agent's output is rendered VERBATIM — no post-hoc editorial cleanup.
- Rule 55 applies — the human-readable summary lives on AgentActivityLog (C11); the transcript is the full text.

**States:** Default · partial-transcript (run was halted; chrome shows "Run halted at {timestamp}. Transcript ends here.") · transcript-unavailable (rare — only when the daemon crashed mid-write).

### Surface C9 — `AgentMemoryReader` (`/agents/:agent-id/memory`)

**Route:** `/agents/:agent-id/memory`
**What it is:** Read / edit / archive the agent's memory directory. Rule 59.

**Sections (top to bottom):**

1. **Header** — agent name + memory directory path in `--font-mono`.
2. **File list** — the markdown files in the memory dir. Each row: filename · size · last-modified.
3. **File viewer** — selecting a file opens it inline. Read by default; an `Edit` button toggles to a textarea.
4. **Edit chrome** — when editing, a `Save` button + a `Cancel` button. Saving writes back to disk. Editorial slot for the warning: "The agent reads this on its next wake. Treat it as your record of what the agent should know."
5. **Archive** — `Archive file` per-row action. Archived files are moved to a `.archived/` subdirectory; the agent stops reading them but they're not deleted.
6. **Add file** — `--accent-soft` button to create a new memory file. The user picks a name and writes the content.

**Locked decisions:**

- The memory dir path is shown verbatim (rule 59).
- NO automatic formatting / re-rendering — the textarea is plain markdown.
- Archive is reversible; delete is NOT offered through the UI (delete is a manual operation on disk if the user really wants it).

**States:** Default · empty-memory (no files yet — editorial slot: "The agent hasn't written any memory yet. It will write its first notes after the next wake.") · file-open-readonly · file-open-editing.

### Surface C10 — `AgentCostDashboard` (`/agents/cost`)

**Route:** `/agents/cost`
**What it is:** Per-agent, per-session, per-vault cost + token usage. Rule 58.

**Sections (top to bottom):**

1. **Topbar** — same agent nav.
2. **Vault total** — current month's total cost · current month's total tokens (input + output + cache, broken down).
3. **Per-agent breakdown** — table:
   - Agent name + kind icon
   - This-month cost
   - This-month tokens
   - Fresh-vs-resume split (rule 58 critical)
   - Cap (with chip indicating proximity — `--peer-ok-soft` <60% · `--ink-mute` 60-85% · `--warn-soft` >85% · `--warn` at-cap)
4. **Per-session detail** — selecting an agent expands to its individual session list with per-session cost.
5. **History** — line chart of cost over the last 12 months, per agent. Quiet chrome — `--font-mono` numerals, no gradient fills, no celebratory color.

**Locked decisions:**

- The fresh-vs-resume split is FIRST-CLASS chrome (rule 58) — not hidden behind an expand toggle.
- NO aggregate-only display — there's always a per-agent breakdown (rule 58).
- NO "your cost is trending up!" growth-hack alerts — only the calm `--warn-soft` chip when approaching the cap (rule 56).

**States:** Default · empty (no agents have run yet — editorial slot: "No cost yet. Once your agents run, their cost will appear here.").

### Surface C11 — `AgentActivityLog` (`/agents/:agent-id/activity`)

**Route:** `/agents/:agent-id/activity`
**What it is:** The agent's full activity log, in human-readable terms (rule 55). Distinct from the transcript (C8) — the activity log is summarized; the transcript is verbatim.

**Sections (top to bottom):**

1. **Header** — agent name + kind icon + total runs.
2. **Filters** — time range · outcome (completed / halted / errored).
3. **Activity stream** — chronological list of runs. Each row:
   - Run timestamp
   - One-sentence summary of what the agent did (rule 55 — "The divination companion read 3 past Hekate readings and noted 2 recurring symbols.")
   - Outcome chip (completed · halted · errored)
   - Tokens used (quiet `--font-mono` number)
   - Link to the transcript (C8) for verbatim detail
4. **CSV export** — like the audit log, a forensic artefact.

**Locked decisions:**

- The activity-summary text is GENERATED BY THE BUILD SIDE from MCP-call patterns — it's not editorial. The agent doesn't write its own summary; the substrate does. This avoids any oracular framing in the summary (rule 54).
- The transcript link is the way to drill in — the activity log is the dashboard, the transcript is the detail.

**States:** Default · empty.

### Surface C12 — `AgentTrustReview` (`/agents/:agent-id/trust`)

**Route:** `/agents/:agent-id/trust`
**What it is:** The renewal / revocation surface for a trusted agent. Some magicians may want to periodically re-approve their agent's capabilities; this surface supports that ritual.

**Sections (top to bottom):**

1. **Header** — agent name + version + days-active.
2. **Current capabilities** — list of capabilities the agent currently has. Same chrome as C4.
3. **Capability diff since install** — if the agent's capabilities have changed since install (via updates), the diff is shown with `--warn-soft` chrome.
4. **Renew approval** — `--accent-soft` button. Confirms the magician is still comfortable with the current set. Logs an audit event.
5. **Revoke specific capabilities** — per-capability toggle. The user can turn off individual capabilities without uninstalling.
6. **Uninstall** — `--warn-soft` button. Memory is preserved (rule 59) unless the user explicitly checks "also delete this agent's memory."

**Locked decisions:**

- Capability changes since install carry the rule-44 diff chrome.
- Uninstall preserves memory by default — the chrome makes this explicit.
- "Renew approval" is a no-op functionally (the approval doesn't expire), but the ritual of renewing is meaningful to the magician — the surface honors that.

**States:** Default · capability-diff (`--warn-soft` chrome surfaces changes) · post-uninstall (editorial slot: "This agent is uninstalled. Its memory remains at {path} — install again to resume.").

---

## Shared editorial moments across all three clusters

These are the editorial slots the designer fills with care, with cross-cluster relevance:

- **The three-tier explainer** (registry side) — appears on the public home (A1), the submission detail (A4), the review queue (A5). Same explainer, same words, three contexts. Write it once, render it everywhere.
- **The "what's not included" disclosures** (hardening + agent) — the data export's exclusions (B2) · the agent's hard exclusions (C3) · the account-deletion limits (B3). Same calm, factual tone across all three.
- **The empty states** (all clusters) — every surface in H10 has an empty state. None of them are growth-hack. None of them try to onboard the magician into doing something. They acknowledge the empty state calmly and tell the magician what would fill it.

---

## What's deliberately deferred to v1.1

These came up during planning but the build side concluded they should NOT be in v1.0:

- **Multi-maintainer registry** — v1 is single-maintainer (Soror Ευ. Α.). The chrome anticipates multi-maintainer but the surface (A5/A6) is built for one reviewer.
- **Agent → agent communication** — agents do not call other agents in v1. The MCP server is the only inter-process boundary. Removes a class of capability-leakage concerns.
- **Service-side AI key** — never (rule 57). This is not a deferral; it's a permanent stance.
- **Federation transport UI** — the federation transport ships in code first (Phase 12.5 backend). The "transport health" surface is v1.1 once we have a second test instance to demonstrate against.
- **Plugin SDK author UI** — submitting a plugin is in H10 (A2-A8); building one is in the SDK docs. No "scaffold a new plugin in your browser" surface.

---

## Test-coverage expectations

Per the established pattern from H07/H08/H09:

- Every surface ships with a `.test.tsx` unit test alongside the surface (component tests for default state + every variant).
- Every surface ships with a Storybook story (one or more variants).
- Visual + a11y baselines are regenerated at sprint close.
- Backend tests cover every new endpoint (Cluster A registry routes are the largest net-new test surface — minimum 60 tests).
- The agent layer's sealed-content-exclusion + closed-tradition-exclusion are verified by **property-based tests** (per Phase 16 §12) — the test suite generates arbitrary vault content and verifies no path from agent surface to sealed/closed-tradition content.

---

## Folder structure expected back

```
2026-06-27-H10-{registry,hardening,agents}/handoff_H10/
├── README.md
├── agent_onboarding_H10.md
├── agent_data_and_components_H10.md
├── cluster_A_registry/
│   ├── A1_RegistryPublicHome.dc.html
│   ├── A2_PluginSubmissionForm.dc.html
│   ├── A3_PluginSubmissionList.dc.html
│   ├── A4_PluginSubmissionDetail.dc.html
│   ├── A5_RegistryReviewQueue.dc.html
│   ├── A6_RegistryReviewDetail.dc.html
│   ├── A7_TierPromotion.dc.html
│   └── A8_VulnerabilityAdvisorySubmit.dc.html
├── cluster_B_hardening/
│   ├── B1_AccountSettings.dc.html
│   ├── B2_DataExportRequest.dc.html
│   ├── B3_AccountDeletion.dc.html
│   ├── B4_PerUserAuditLog.dc.html
│   ├── B5_KeyRotation.dc.html
│   ├── B6_SessionsAndDevices.dc.html
│   └── B7_AccessibilityAndMotion.dc.html
└── cluster_C_agents/
    ├── C1_AgentsHome.dc.html
    ├── C2_AgentMarketplace.dc.html
    ├── C3_AgentInstall.dc.html
    ├── C4_AgentCapabilityReview.dc.html
    ├── C5_AgentByoKeySettings.dc.html
    ├── C6_AgentTaskComposer.dc.html
    ├── C7_AgentRunMonitor.dc.html
    ├── C8_AgentTranscriptViewer.dc.html
    ├── C9_AgentMemoryReader.dc.html
    ├── C10_AgentCostDashboard.dc.html
    ├── C11_AgentActivityLog.dc.html
    └── C12_AgentTrustReview.dc.html
```

The `agent_onboarding_H10.md` and `agent_data_and_components_H10.md` files follow the convention from H06/H07/H08/H09 — they're the designer's notes about how to consume the package on the build side.

---

## Anticipated turnaround

Based on the H08 (21 surfaces · same-week turnaround) and H09 (17 surfaces · same-day turnaround) cadence, H10's 27 surfaces is **the largest package to date**. The build side is not asking for same-week turnaround — H10 is sized to be the final design package before launch, so it's reasonable to expect 2-3 weeks of designer time. If the designer wants to ship in clusters (A first, B second, C last) so the build side can start wiring while the rest is in flight, that works for us.

If the designer hits an open question during drafting, raise it back. Otherwise: **lock the structure**, fill it with the project's voice, ship.

---

— Soror Ευ. Α. (build side · 2026-06-27 · main branch HEAD `7eaf767` at H10 open)
