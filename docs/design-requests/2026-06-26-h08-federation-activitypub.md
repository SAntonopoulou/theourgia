# Design Handoff Request — H08 (Tier 6: Phase 12 Federation + Phase 13 ActivityPub)

**Date opened:** 2026-06-26
**Requested by:** Soror Ευ. Α. (build side)
**Status:** Open — awaiting designer pickup
**Scope rationale:** H07 (Tier 5 · Phases 10 + 11) shipped 21 surfaces across three clusters and unblocked six weeks of frontend work. Both phases closed end-to-end (frontend AND backend) within ~36 hours of bundle drop. **H08 takes that to the natural next layer — the federation substrate.** Phase 12 (native Theourgia protocol · hubs · group ritual) and Phase 13 (ActivityPub adapter for the public broadcast layer) are tightly coupled: Phase 13 reuses the Ed25519 keys and the visibility model that Phase 12 standardises, and the SSO model in Phase 12 § 12 deliberately predates the AP `Follow` plumbing in Phase 13. Bundling them keeps the design coherent. Anticipated scope: **21 surfaces across two clusters**, matching H07's footprint and unblocking ~6-8 weeks of build-side work.

**Format expected:** Per-surface `.dc.html` files + `agent_data_and_components_H08.md` supplement + `agent_onboarding_H08.md` supplement, dropped into `/home/sophia/design-handoffs/theourgia/<YYYY-MM-DD>-H08/handoff_H08/`. Same folder convention as H05 / H06 / H07.

---

## How to read this document

This handoff **locks every product decision**. The designer is not asked to choose between alternatives; the designer's job is to render the locked decisions with the project's voice and visual rigor — exactly as H04 + H05 + H06 + H07 filled their locked structure with `.dc.html` surfaces.

Where this document says "the surface holds X", X is required and non-negotiable. Where it says "the editorial voice fills the slot", the designer writes the prose to the project's Style Guide within the slot.

If a question genuinely remains open after this document, raise it back to the build side — **do not pick a direction yourself**.

---

## What just shipped (the context the designer inherits)

Since the H07 request was opened (2026-06-25), the build side closed:

- **Phase 10 Publishing backend** (B126-B131) — publication lifecycle · Stripe Connect (0% application fee CI invariant; refunds via portal hand-off — no `/refund` POST endpoint anywhere) · single-use HMAC download tokens · subscription tiers (amount IMMUTABLE) · double-opt-in subscribers (PENDING_CONFIRMATION default; sticky unsubscribe; FAILED_PAYMENT = `--warn`) · newsletter 5-state lifecycle (once-sent immutability; per-recipient unsubscribe URL; Tiptap → HTML/plaintext renderer XSS-safe) · public reader with **structural** paywall (closed-Literal `paywall_kind`; defensive CI test rejects countdown / view_count / trending fields) · unversioned RSS / Atom / JSON Feed at `/vaults/{id}/feed.{rss,atom,json}` mounted at app-level so subscribers' URLs stay stable across API versioning. Sealed publications NEVER public — defence in depth at publish-time + checkout-time + read-time.
- **Phase 11 Media + Pilgrimage backend** (B132-B136) — media_asset + polymorphic media_link (sealed read NULLS filename/caption/alt/tags/EXIF/dims but PRESERVES size_bytes + link_count + r2_object_key) · R2 upload pipeline with Protocol-isolated EXIF strip (`NullExifStripper` + `PillowExifStripper` lazy) · 5 GB quota guard + 24h session TTL · pilgrimage_site with precision FLOOR one-way ratchet (`is_lower_or_equal_precision`; `apply_precision_floor` shared with B120 autotag) · iCal feed with sealed-day collapse (`SealedDayMarker` dataclass restricted to `{date, count}` → ONE all-day VEVENT "{N} sealed entries today", NO description, NO location; unversioned `/ical/v1/{token}.ics` mounted at app-level).
- **H07 Cluster A · B · C frontend** — all 21 surfaces shipped + wired live against Phase 10 + 11 backends.

**Test counts at H08 open:** 2194 vitest passing · 557/557 visual · 543/557 a11y (97.5%) · **2276 backend tests** · **Alembic at 0055**.

**Repo state to inspect before designing:**

- All tokens in `frontend/shared/src/tokens/theourgia.tokens.css` — including `--seal*` (from H02), `--money*` + `--map-*` (from H07), `--chart-1…6` (from H06).
- H07 Cluster B + C surfaces in Storybook — the Public Vault Page (`PublicVaultPage.dc.html`) is the visual cousin of every public network face surface H08 will produce. The Reader surface drives the "public content broadcast" baseline.
- The H07 Subscribers surface — H08 Federation introduces a SIMILAR primary list shape (members of a hub) but with a fundamentally different relationship semantic. The chrome should rhyme without being conflated.
- The H07 Newsletter Editor + Subscription Tiers surfaces — H08's Network Newsletter Composer borrows the once-sent-immutable + per-recipient-unsubscribe contracts.
- The H07 Pilgrimage Map — H08's Federation Peer Browser uses the same stylised-not-real-GIS chrome (peers on a globe, not a real map).
- The H04 Practice Logs surface — H08's Group Ritual Post-Mortem extends this surface's "collective log" shape across multiple practitioners.

---

## Carry-forward standing rules (numbers 1-17 unchanged from H07)

These survive every sprint and override any later design instinct. See `feedback_match_design_exactly.md` for the locked enforcement.

1. **Token-first.** Every value comes from `theourgia.tokens.css`. New tokens added only when the existing palette genuinely cannot express a need; new tokens land in the H08 supplement with a one-line rationale.
2. **`--danger` is reserved for the Visibility → Public downgrade rung — nothing else.** Phase 12 has many potential red-flag moments (kicking a member; revoking a federation peer; blocking an instance; deleting a group ritual). These use **`--warn` family**, NOT `--danger`. The user has been emphatic for every prior sprint. The Visibility → Public moment in Phase 13 (publishing a public entry to the Fediverse for the first time) IS allowed `--danger` chrome — it's the canonical instance of "data leaves your machine in a way that can't be undone."
3. **Tradition-neutrality at the chrome level.** Theme tokens (`hellenic`, `thelemic`, base + dark/light) override the palette. Network hubs are explicitly multi-tradition — the chrome must support a Greek-leaning hub and a Thelemic-leaning hub side-by-side without privileging either.
4. **`.dc.html` is the source of truth.** Match exactly per the per-component ritual (section inventory · CSS var cross-check · verbatim editorial copy · default state · variant completeness · `--danger` audit). Expand dev numeronyms in user-facing labels.
5. **Sealed-content discipline.** Anything backed by encryption defaults sealed and shows count only — zero plaintext leak. **CRITICAL FOR H08:** sealed content NEVER federates. Not to a hub. Not to the AP layer. Not even as a count on the network face. The federation layer treats sealed entries as if they don't exist. Backend will enforce this server-side; the design must NOT introduce surface chrome that implies a sealed entry could be "shared with the network" or "pushed to a hub."
6. **Wellbeing copy is verbatim from designer.** Never red even for "negative" states. Opt-in only, off by default.
7. **Citation chrome on every traditional artefact.** When a federated post / network newsletter includes text/imagery the practitioner did not author, the source surfaces via the `‡` `CitationKindBadge` from B54.
8. **Ritual / committed-make moments.** Publishing-public (`--danger`-rung visibility downgrade) IS such a moment. So is "accept this federation peer" (irrevocable in cache terms). So is "schedule this group ritual" (members get notified). The chrome treats these as deliberate — a one-handed CTA is wrong; the standard pattern is a `--warn-soft` confirm modal with verbatim consequences.
9. **Quiet stats.** Where a surface shows accumulated work or numerical findings ("12 hubs you're a member of", "47 followers on Mastodon", "8 group rituals this year"), the chrome is muted: small number + `--ink-mute` label. No celebration, no badges, no streaks. **Doubly important on Phase 12 — networks are the most common trigger of social-platform gamification.**
10. **Honesty rules** (H08-specific elaborations spelled out per surface).
11. **WCAG 2.2 target-size floor.** Every interactive element ≥ 24×24 px.
12. **Body color inherits.** The body rule in `theourgia.shared.css` establishes `color: var(--ink); background: var(--bg)`. Surfaces should NOT rely on element-level `color` declarations to "fix" black-on-dark.
13. **Editor block embed parity.** Where any H08 surface produces an artefact that can also appear *inside* the Editor's body, there is already a Tiptap node for the block form. The "@mention a remote actor" affordance does this — see surface 18.
14. **Scientific illuminism stance, not oracular.** Network analytics (member activity counts; cross-hub correlations) follow the same n-shown / no-gamification rules as Phase 09. **CRITICAL CARRY-FORWARD:** the Phase 09 banned-phrase regex on weekly digest headlines also applies to network newsletter headlines.
15. **Mode B encryption is now a substrate.** Sealed artefacts in a hub context (a sealed group-ritual script; a sealed group oath) use the existing `vaultCrypto.ts` substrate. Hubs DO NOT introduce a separate encryption story.
16. **Surface ↔ route contract.** Every save callback emits a payload that maps 1:1 to the backend `Create<Domain>Input`. Federation surfaces are no exception — even when the operation crosses an instance boundary, the local route is a thin mapper.
17. **Real money is sober.** Carried forward — network subscriptions / hub dues (if a hub charges) follow the same anti-celebration chrome as Phase 10.

## New cross-cutting rules earned in H08

These are the federation-specific rules. They are NON-NEGOTIABLE.

18. **No engagement metrics in the home surface.** No follower-count chip on the dashboard. No "you reached X followers" notification. No streak badges for "days in a row you've posted." The follower count exists in the Followers Pane (surface 17) AND ONLY THERE; it is quiet stat. Boost / like counts appear ONLY on the per-entry view (surface 20) — never aggregated to a profile-level "your top post." The plan calls federation "magical infrastructure, not social media" — chrome enforces this.

19. **No recommendation algorithm. Period.** The network feed is chronological. The hub feed is chronological. The "what's happening today" cross-hub aggregator is chronological. There is no "popular this week," no "trending in your hubs," no "suggested for you." A future plugin (Phase 14) MAY introduce ranking; the core never does.

20. **Consent-first follows.** Every actor — vault OR hub — can flip "auto-accept follows" to "manual approval." Default is **manual approval** for vaults; **auto-accept** for hubs. The Settings surface (16) renders this prominently.

21. **Network revocation is opt-in, never silent.** When a vault revokes content from a hub, the explicit disclosure "content already mirrored may persist in caches" is verbatim from the plan. The designer renders this on the Push Content modal (surface 15) AND on the Hub Member Dashboard when the member elects to "Withdraw from network."

22. **Group ritual lifecycle is once-final, then frozen.** Like Phase 10's once-sent newsletter, once a `group_ritual` enters COMPLETED state, the script + voces + correspondences are FROZEN. The Post-Mortem surface (10) is the only mutable view, and it accepts only NEW participant entries — never edits to the original script. The designer renders the frozen state with the same chrome as a sent newsletter.

23. **Cross-timezone display is THREE-pinned.** The Group Ritual Scheduler (8) AND the in-ritual surface (9) always show the time in: (a) the participant's local clock, (b) UTC, (c) the participant's local planetary hour at that moment. Three are mandatory — never fewer. The Style Guide locks the format.

24. **AP only sees Visibility=public.** Hard-prevented at the data-fetch layer (the build side mirrors the Phase 10 sealed-publication defence in depth). The designer must NOT introduce ANY chrome that implies a viewer-visible or network-visible entry could "show up on Mastodon." The toggle wording for AP integration on the Visibility selector is: "Publishing also shares this entry on the Fediverse (Mastodon, etc.)" with the disclosure "Only entries set to Public reach the Fediverse." The toggle is a child of the existing Visibility selector — it is NOT a separate top-level toggle.

25. **Federation never auto-DMs.** No "welcome to the Fediverse" auto-message on a new follower. No "thanks for joining" auto-message on a new hub member. Welcome touches are practitioner-initiated.

26. **No central SSO server.** Identity resolves through the home instance. The SSO Authorize / Consent surface (13) renders THIS instance authorising THIS user to a target hub — never "log in with Theourgia.com."

27. **The Federated Comments stream marks source.** Every federated comment carries a small `‡ from @user@instance.tld` chip in `--ink-mute`. Local comments DON'T need this chip — only federated ones. The chrome makes the federation source visible without making it loud.

28. **Per-network opt-in for everything.** Joining a hub doesn't auto-subscribe to its newsletter. Joining a network doesn't auto-share your entries. EVERY sharing dimension is its own opt-in toggle in the My Networks surface (1). The "Push to network" modal (15) makes each push deliberate.

29. **The instance trust ledger is matter-of-fact.** A surface lists known peer instances. It does NOT label them "trusted" or "untrusted" in red/green — it shows handshake status (`successful`/`pending`/`refused`/`blocked`) with neutral chrome. The community-maintained blocklist is OPT-IN — the design renders the subscription affordance as a deliberate choice, not a default.

30. **The Theourgia network is NOT a walled garden.** The design must NOT introduce features that lock practitioners into a specific Theourgia instance or hub. "Export everything" is one click away from anywhere in Federation chrome.

---

## Backend status going in

**Phase 12 backend unbuilt.** **Phase 13 backend unbuilt.**

`plan/12-federation.md` and `plan/13-activitypub.md` enumerate the tables and the protocol. The designer is not bound to the plan's exact column list. If a `.dc.html` requires a column the plan did not anticipate, the build side will add it during implementation. Conversely, if the designer's `.dc.html` does not use a column the plan anticipated, the build side drops it.

The architectural choices already locked at backend level:

- **Native federation transport is HTTPS + HTTP Signatures (RFC 9421 preferred).** No raw TCP, no custom binary protocol. The designer renders no "transport layer" chrome — federation surfaces never show "encrypting…" or "negotiating…" because handshake is sub-second.
- **Identity DID format: `did:theourgia:{host}:{slug}`.** The designer renders the full DID where audit-relevant; renders the `slug` only where the audience is the practitioner.
- **Message types are an enum: `Push` / `Pull` / `Mirror` / `Invite` / `Accept` / `Revoke` / `RitualSchedule` / `RitualUpdate` / `Comment` / `Heartbeat`.** Audit log uses these as filter chips.
- **Group ritual times are stored UTC; rendered per the rule 23 three-pin format.**
- **Roles are admin / officer / moderator / member / observer (default bundles).** Hubs may extend; the designer renders the default chrome assuming these five and provides extension affordances.
- **Permissions panel uses a checkbox matrix.** Rows are roles; columns are permission flags. Per the plan's "preview as role X" feature.
- **ActivityPub is an adapter, not a substrate.** AP runs alongside the native protocol; nothing in the native protocol is reshaped to accommodate AP.
- **AP follower-approval defaults to manual for vaults, auto for hubs.** Per rule 20.
- **Federated comments default to moderation queue.** Approved comments display inline; pending comments invisible to the public. The Phase 10 Newsletter moderation chrome is the closest parallel.
- **WebFinger resolves to `did:theourgia:{host}:{slug}` AND to AP actor URL.** Both records ship from one endpoint. No separate endpoint for each.

---

## What needs design — the 21 surfaces in two clusters

### Cluster A · Phase 12 Federation (15 surfaces)

The native Theourgia protocol surfaces. The conceptual primary is the **hub** — a community of practitioners on potentially-separate instances. Vaults belong to hubs; hubs federate with each other and with vaults on remote instances.

---

### 1. `My Networks.dc.html` (full route — `/networks`)

**Why this surface exists:** A practitioner needs a single home for "every hub I'm a member of + every pending invitation." This is the entry point to Phase 12 — without it, the federation features are unreachable from the dashboard.

**Layout:** Full-route page composed within `VaultNav`. Three-section vertical stack:

- **Header band** — title "My networks", subtitle "Hubs you're a member of and pending invitations.", a single ghost-CTA "+ Discover hubs" routing to surface 3.
- **Active hubs** — section card list. Each row is a `HubMembershipCard` (designer composes from existing `EntityCard` + `RelationshipStatusPill` palette): hub avatar + name + tradition-tag pill + role pill (`admin` / `officer` / `moderator` / `member` / `observer`) + "Last activity {n} days ago" in `--ink-mute` + a small chevron to the Hub Member Dashboard (surface 6).
- **Pending invitations** — section card list. Each row is a `HubInvitationCard`: hub avatar + name + "Invited by {actor DID}" + invitation note (free text, may be empty) + two CTAs side-by-side: `Accept` (primary, `--warn-soft` chrome because it's a commitment) and `Decline` (ghost).

**Default state (empty):** "You don't belong to any hubs yet. Hubs are how practitioners federate selectively — see Discover hubs to find one to join, or set up your own."

**Variants:** Anonymous read (this surface requires auth — anon hits a 401 redirect; the designer renders the auth-required state matching B130's reader pattern).

**Honesty rules pinned at this surface:**

- The "Last activity" stat is quiet. NO red dot for "high activity," no green dot for "thriving."
- Pending invitations DO NOT show "this hub has X members" (that would be social-platform bait).
- Per-hub visibility scopes (the per-content-type opt-in toggles from rule 28) live on surface 4 (Hub Member Dashboard), NOT here. THIS surface lists memberships; the per-hub sharing settings are inside the hub.

**Editorial voice slot:** Header title + subtitle as above. Empty state as above. The "Last activity" copy formats as "Last activity 3 days ago" (not "3d" — see the H07 dev-numeronym rule).

---

### 2. `Network Browser.dc.html` (full route — `/networks/peers`)

**Why this surface exists:** Every Theourgia instance maintains a list of known peer instances. This surface lets the practitioner see which peers their instance has handshaked with — and surfaces the optional community directory.

**Layout:** Full route, two-pane.

- **Left pane (~35%)**: Filter rail. Filter chips for handshake status (`successful` / `pending` / `refused` / `blocked`), instance tradition tag, "shows my instance" (the local instance always pinned at the top regardless of filters).
- **Right pane (~65%)**: Peer list. Each row is a `PeerInstanceCard` (new primitive — borrows visual language from `BookRow` but tuned for instance metadata): instance domain + tradition tag(s) + handshake status pill + last-heartbeat timestamp in `--ink-mute` + a kebab menu (Open instance · Refresh handshake · Block instance).
- **Trust ledger affordance** — footer band: "Subscribe to a community blocklist (opt-in)" with a `Configure` ghost CTA. Default state: not subscribed.

**Default state (empty):** "Your instance has not yet handshaked with any peers. Theourgia's federation protocol discovers peers via well-known endpoints + DNS + manual addition. See Settings → Federation to add a peer manually."

**Variants:** The local instance row is visually pinned at the top with a `--ink-mute` "This is your instance" chip.

**Honesty rules pinned at this surface:**

- Status chrome is **neutral**. No green/red — "successful" is `--ok-soft` (the same chip used for SubscribeAck on H07's Subscribers). "Pending" is `--warn-soft`. "Refused" / "blocked" are `--warn` (NOT `--danger` — rule 2).
- The trust ledger subscription is OPT-IN. The designer renders the subscription affordance as deliberate; NOT prefilled.

**Editorial voice slot:** Title "Network browser". Footer copy as above.

---

### 3. `Hub Discovery.dc.html` (full route — `/networks/discover`)

**Why this surface exists:** A practitioner needs a way to find hubs. The Discovery surface is the "browse all public hubs across known peers" affordance.

**Layout:** Full route, single-column.

- **Search band**: full-width search input + tradition-tag filter pills (hellenic · thelemic · chaos · hermetic · folk · ceremonial · independent · multi-tradition).
- **Hub grid**: 2-column card grid (single-column on narrow viewports). Each card is a `HubDiscoveryCard`: hub banner image (or generated swatch if none) · hub name · hub motto (single line, max 120 chars) · tradition pills · member count (quiet stat — "12 members") · public-or-private chip · a single primary CTA "Request to join" (or "Already a member" disabled state).
- **Empty-state band** (if 0 results): "No hubs match that search. Hubs choose whether to appear in the directory — many private hubs are joinable only by invitation."

**Honesty rules pinned at this surface:**

- Member count is QUIET. No "127 members" with a celebratory ring. Just text.
- No "popularity" sort. Order is alphabetical by default; a secondary sort offers "recently active" (timestamp-based, not engagement-based).
- "Request to join" sends an `Invite` message in REVERSE — the hub admin sees it as a join-request. The designer's CTA wording is precise.

**Editorial voice slot:** Title "Discover hubs". Search placeholder "Search hub names, traditions, or keywords". Empty state as above.

---

### 4. `Hub Admin Dashboard.dc.html` (full route — `/hubs/{hub_id}/admin`)

**Why this surface exists:** The hub-admin's primary control surface. Surfaces all member management, the curation queue, the public-face config, and the audit feed entry point.

**Layout:** Full route, tabbed. The designer adds a new `HubAdminTabs` primitive (4 tabs):

- **Members** (default) — the member list table.
- **Curation queue** — submissions awaiting review.
- **Public face** — config for what shows on the hub's public page.
- **Settings** — analytics opt-in defaults, content acceptance rules, role definitions, audit log link.

**Members tab:**

- Filter rail at top: role chips (admin / officer / moderator / member / observer / pending invite), search by name/DID.
- Member table: row = avatar + display name + DID + role pill + joined-at + last-activity (`--ink-mute`) + kebab menu (Change role · Suspend · Expel · View audit).
- Bulk action bar: select multiple members → bulk change role / bulk suspend / bulk expel. Bulk operations use the H07 `--warn-soft` confirm modal pattern.
- Empty state: "This hub has no members yet. Invite practitioners from the Settings tab."

**Curation queue tab:**

- Submission list. Each row is a `CurationItemCard`: contributor DID + content type pill (entry / divination / publication) + submitted-at + a short preview + three CTAs: `Approve` (ghost-primary) · `Send back with note` (ghost) · `Reject` (`--warn` — NOT `--danger`).
- Approved items don't disappear — they get a `--ok-soft` pill that says "Approved · {timestamp}".
- Empty state: "No items awaiting curation. Members can submit content via Push to network on their entries."

**Public face tab:**

- Editor view that previews how the hub's public page appears to non-members. Composes the H07 PublicVaultPage layout, but for hub data.
- Sections: hub banner image (upload) · hub motto (single line) · longer description (Tiptap-lite — paragraph + link + emphasis nodes only) · pinned featured items (list with manual reorder) · public membership policy.

**Settings tab:**

- Analytics opt-in default (radio: opt-in by default / opt-out by default / always require explicit).
- Content acceptance rules (per content type checkboxes).
- Role definitions (link to Roles & Permissions Editor — surface 12).
- Audit log (link to surface 14).

**Honesty rules pinned at this surface:**

- The audit timestamp in the member table is QUIET (`--ink-mute`).
- Bulk operations have explicit consequences in the confirm modal — never silent.
- The public-face editor PREVIEWS — it doesn't push to public on every keystroke. A single "Publish public face changes" CTA at the bottom commits.

**Editorial voice slot:** Tab labels as above. Empty states as above. Reject CTA copy "Reject" not "Decline" (deliberate firmness — but in `--warn` chrome, not `--danger`).

---

### 5. `Hub Public Face.dc.html` (public route — `/hub/{slug}`)

**Why this surface exists:** Non-members visit a hub's public-facing page. This is the SEO-friendly, ActivityPub-discoverable surface a hub presents to the world.

**Layout:** Mirrors the H07 PublicVaultPage shape but with hub-flavoured chrome.

- Hero band: banner image + hub name + motto + tradition pills + "Established {date}" quiet stat.
- About section: the longer description (rendered Tiptap-lite output).
- Featured items: the pinned items from the admin's public-face editor. Each renders as a `PublicVaultPublication`-style card.
- Membership policy band: "Public — anyone may join with one click" / "Open with approval — submit a request, admins review" / "Private — invitation only" with the matching CTA (Join · Request to join · This hub is invitation-only).
- Footer: `‡ Powered by Theourgia (AGPLv3)` verbatim + the hub's local "tradition voice" footer (member-supplied copy, or default if not).

**Default state:** A hub with motto, description, featured items, membership policy.

**Variants:**

- Anonymous viewer: sees all of the above.
- Member viewer (auth'd, is a member): a small `--ok-soft` chip in the hero band: "You're a member."
- Pending viewer: small `--warn-soft` chip: "Your join request is pending review."

**Honesty rules pinned at this surface:**

- NO follower / member count on this surface. The hub's member count is internal — public viewers don't see it (anti-gamification rule 18).
- NO "join the conversation" CTA — only the explicit Join CTA matching the membership policy.

**Editorial voice slot:** Membership policy CTA copy as above. Footer copy as above.

---

### 6. `Hub Member Dashboard.dc.html` (full route — `/hubs/{hub_id}`)

**Why this surface exists:** The member's view INTO a hub. This is the chronological network feed + the per-hub sharing settings + the current curation status of the member's submitted content.

**Layout:** Full route, tabbed. New `HubMemberTabs` (3 tabs):

- **Feed** (default) — chronological list of all pushed content + hub events.
- **My submissions** — the member's pushed content + curation status of each.
- **Sharing settings** — per-content-type opt-in toggles for "automatically push X to this hub."

**Feed tab:**

- Chronological infinite-scroll list. Each item is a `NetworkFeedItemCard` (new primitive): contributor DID + timestamp + content-type pill + content preview + reactions (only on the per-entry view, NOT inline here — rule 18 enforced).
- Day separators (the H04 OracleTabs pattern's day-stamping) keep the feed scannable.
- Empty state: "This hub's feed is empty. Be the first to push content."

**My submissions tab:**

- Table list. Each row = content title + submitted-at + status pill (Pending review · Approved · Sent back · Rejected · Withdrawn) + a small CTA "Withdraw from network" (always available — see rule 21).

**Sharing settings tab:**

- A list of content-type toggles ("Push my workings here" / "Push my synchronicities here" / "Push my publications here" / etc.). Each toggle is OFF by default (rule 28).
- An additional toggle "Announce my membership to other members" — quiet (no notification fan-out, just a small badge on the member's row).

**Honesty rules pinned at this surface:**

- The feed is **CHRONOLOGICAL** — no algorithm. The Storybook story includes a fixture proving items are sorted by `created_at desc`.
- Per-content-type toggles are OFF by default; every share is opt-in.
- Withdraw from network surfaces the verbatim disclosure: "Content already mirrored may persist in caches" (rule 21).

**Editorial voice slot:** Tab labels as above. Empty state as above.

---

### 7. `Network Newsletter Composer.dc.html` (full route — `/hubs/{hub_id}/newsletter`)

**Why this surface exists:** Hub officers curate a newsletter from member submissions. This is the curator-side composition tool.

**Layout:** Borrows the H07 Newsletter Editor heavily, with two key differences:

- A left "Source picker" pane shows approved curation items. Officer drags items from this pane into the newsletter body.
- The Tiptap editor is the same; the source-picker pane is the new piece.

**Sections:**

- Settings band (issue title · scheduled send time · target tier — for hubs, the "tiers" are member roles).
- Source picker (left pane, ~30%): scrollable list of approved curation items, each as a small card that drags into the editor.
- Tiptap editor (right pane, ~70%): the existing editor primitives + a new "embed curation item" node that renders the source-picker card inline.
- Footer: `Preview` ghost · `Send now` `--warn-soft` (the H07 confirm-modal rule applies).

**Honesty rules pinned at this surface:**

- Once SENT, the newsletter is FROZEN (carry forward rule 22 + Phase 10's once-sent immutability).
- The per-recipient unsubscribe URL (Phase 10 contract) is embedded in EVERY rendered issue — the composer surface displays a footer reminder of this.
- The Phase 09 banned-phrase regex (no modal / oracular headlines) applies to network newsletters (rule 14).

**Editorial voice slot:** Section titles as above. Footer copy "Preview" and "Send now" verbatim.

---

### 8. `Group Ritual Scheduler.dc.html` (full route — `/group-rituals/new` and the same route at `/group-rituals/{id}/edit`)

**Why this surface exists:** A hub officer (or any practitioner organizing an invited-friends ritual) schedules a group working with a fixed UTC time and invites participants. This is the canonical example of rule 23 (three-pinned cross-timezone display).

**Layout:** Full route, single-column form.

- Header: title "Schedule group ritual" (new) or "Edit ritual" (edit).
- Section 1: Basics (title · ritual template picker · description Tiptap-lite).
- Section 2: Time. THREE pinned displays: (a) the organiser's local clock (date + time + timezone), (b) UTC, (c) the organiser's local planetary hour at that time. The organiser sets the time in (a); (b) and (c) auto-update. The designer renders all three in a single horizontal trio: local | UTC | planetary hour.
- Section 3: Location (radio: physical · virtual · dispersed). Physical reveals an address picker (free text, no map). Virtual reveals a URL field. Dispersed shows "Each participant works from their own space" verbatim.
- Section 4: Participants (multi-select from the hub's member list OR a free-form DID input for invited-friends rituals).
- Section 5: Required correspondences (a free-form list of items each participant should have ready — e.g., "Lapis pendant," "candles in colour Mercury Wednesday").
- Section 6: Shared script (Tiptap-lite).
- Section 7: Shared sigils + voces (link existing items from the practitioner's vault).
- Footer: `Save draft` ghost · `Schedule + invite` `--warn-soft` (deliberate moment per rule 8).

**Honesty rules pinned at this surface:**

- Time display is THREE-pinned (rule 23). Two-pinned is not acceptable. One-pinned is failing.
- The "invited-friends" mode lets the organiser invite people NOT in any hub — this is the canonical case of cross-network sharing.
- Required correspondences are a checklist for the participant's prep, NOT a "lock-in" — a participant who doesn't have one of the items can still attend.

**Editorial voice slot:** "Schedule + invite" CTA verbatim. The dispersed-location copy "Each participant works from their own space" verbatim.

---

### 9. `Group Ritual Coordination.dc.html` (full route — `/group-rituals/{id}/run`)

**Why this surface exists:** The in-the-moment surface participants land on during a scheduled ritual. Shared script + per-participant timing + a fragment-post stream.

**Layout:** Full route, single-column, optimised for narrow viewports (participants may use phones).

- Header band: ritual title + countdown to the scheduled UTC time (if pre-start) OR "Ritual in progress" badge (if started) OR "Ritual completed" badge (if completed).
- Time trio (rule 23): local | UTC | planetary hour — pinned at the top.
- Participant rail: avatars + status pills (Joined · In ritual · Completed individually · Not yet present). Quiet — no celebration on "completed."
- Shared script: rendered Tiptap content from the schedule.
- Fragment-post stream: each participant can post short fragments during the ritual. Each fragment shows participant DID + timestamp + body. The stream is APPEND-ONLY — fragments cannot be edited or deleted by the participant after a 60-second window.
- Footer: a single sticky-bottom input box "Post a fragment…" with a small "Mark me as completed" CTA.

**Honesty rules pinned at this surface:**

- Fragment posts are time-locked. The 60-second window mirrors the Phase 10 once-sent newsletter rule — fragments become permanent quickly because the post-mortem (surface 10) treats them as primary sources.
- "Mark me as completed" is one-way. A participant cannot un-complete.
- The ritual stays in COMPLETED state once the LAST participant marks completed OR the scheduled end time arrives.

**Editorial voice slot:** Status pill copy. Empty-fragment-stream state "No fragments yet — the first posts appear here as participants arrive."

---

### 10. `Group Ritual Post-Mortem.dc.html` (full route — `/group-rituals/{id}`)

**Why this surface exists:** After a ritual completes, participants log their experience. The post-mortem is the collective record — frozen, but extensible (per rule 22).

**Layout:** Full route, single-column.

- Header band: ritual title + completed-at + a quiet "Closed" badge.
- Time trio (rule 23) for the COMPLETED timestamp.
- Participant rail (same as surface 9): avatars + completion status.
- Shared script: rendered Tiptap content (frozen).
- Fragment-post stream: all fragments from the ritual itself, frozen.
- Participant contributions section: each participant has a NEW write-only entry below — "Your reflection on this ritual" (Tiptap-lite, max 4000 chars). A participant who has already written one sees their entry in read mode with no edit affordance (FROZEN once written — per the once-final rule).
- Footer: a link "Open as an entry in your journal" — creates a personal entry referencing the ritual.

**Honesty rules pinned at this surface:**

- The ritual is FROZEN — script + voces + correspondences cannot change.
- Each participant's reflection is WRITE-ONCE — once submitted, frozen.
- Egregore creation: if the ritual schedule declared itself an egregore creation event, the surface shows a `‡` chip pointing to the resulting entity in the practitioner's vault.

**Editorial voice slot:** "Your reflection on this ritual" placeholder. Quiet "Closed" badge.

---

### 11. `Private Viewer Management.dc.html` (full route — `/private-viewers`)

**Why this surface exists:** The vault owner mints private-viewer credentials — for sharing with a student, partner, or working group member not on the same instance. The viewer gets a read-only view of scoped content.

**Layout:** Full route, two-section.

- Header band: title + "+ New viewer" CTA.
- Viewer list: each row is a `PrivateViewerCard`: viewer email/handle + label (free-text vault-owner label) + access scope chip (full vault / by tag / by kind / specific entries) + last-used timestamp (quiet) + kebab menu (Revoke access · View audit · Edit scope).

**New viewer modal** (composed within this surface):

- Email/handle input.
- Free-text label (e.g., "Student — Aspasia").
- Access scope picker (radio): Full vault · Tag-scoped · Kind-scoped · Specific entries.
- Each scope reveals its picker UI inline.
- Credential delivery (radio): "Email a signed-link to the viewer" OR "Generate a passphrase the viewer enters with the email I provide". Default is signed-link.
- Save CTA "Issue credential" with a follow-on success state showing the one-time credential (if passphrase mode) — verbatim "This credential is shown ONCE. Save it now."

**Honesty rules pinned at this surface:**

- The credential is shown ONCE. The verbatim copy enforces this.
- Revoking access is FREE and immediate. Revoked viewers stay in the list (for audit) but the row shows a `--ink-mute` "Revoked at {timestamp}" chip.
- Per-scope access is the default — Full vault is the explicit choice, not the default.

**Editorial voice slot:** "Issue credential" CTA. Verbatim "This credential is shown ONCE. Save it now." Empty-state copy.

---

### 12. `Roles & Permissions Editor.dc.html` (full route — `/hubs/{hub_id}/admin/roles`)

**Why this surface exists:** Per Phase 12 § 13, hubs need an admin-configurable role × permission matrix.

**Layout:** Full route, single-column.

- Header band: hub name breadcrumb + title "Roles & permissions" + a small `Preview as role` dropdown (lists every role).
- Role table: rows are roles, columns are permission flags. Cells are checkboxes. Each row has a label (admin / officer / moderator / member / observer / custom) + a kebab menu (Duplicate · Rename · Delete · Export as template).
- Permission matrix columns: Edit hub content · Moderate submissions · Manage members · Send newsletters · Run analytics queries · Accept federation peers · Edit role definitions · Manage permission matrix · View audit log · Schedule group rituals · Approve curation submissions. Designer adds new permission columns ONLY with build-side coordination.
- Add custom role CTA: opens a small modal (label + base role to copy from).
- Templates band at the bottom: "Apply a template" picker with options "Coven · Lodge · Study group · Scholarly working group."
- Footer: `Save changes` ghost · `Save + apply` `--warn-soft`.

**Honesty rules pinned at this surface:**

- Permission-denied actions surface with the verbatim copy: "You cannot do {action} because you lack permission {permission}." (per the plan). This is rendered globally as a toast — design as a small `--warn-soft` toast with a link "How to request this permission."
- Preview-as-role is read-only — switching roles in the preview does NOT mutate the matrix.
- Every change to the matrix is logged. The surface displays a small "Last changed {timestamp} by {actor}" in `--ink-mute`.

**Editorial voice slot:** Permission-denied copy verbatim. Template names verbatim.

---

### 13. `SSO Authorize / Consent.dc.html` (modal — surfaced when an external hub requests SSO from the practitioner's vault)

**Why this surface exists:** Per Phase 12 § 12. When a practitioner clicks "Request to join" on a remote hub's public face, the remote hub calls back to the practitioner's home instance with an SSO request. This modal is the consent moment.

**Layout:** Centered modal (~560px wide).

- Header: "{Hub name} is requesting access" + a small `‡` chip showing the requesting hub's instance.
- Body: structured presentation of the requested scope:
  - What the hub wants to verify ("Your identity DID: did:theourgia:{home}:{slug}")
  - What the hub will receive ("Your display name · your tradition tag(s) · nothing else")
  - What this assertion authorizes ("Joining this hub. Specifically THIS join request. The assertion expires in 24 hours and can be revoked any time from Settings → SSO.")
- Body callout: a `--warn-soft` info chip "This is NOT a login. Your home instance never sees the hub's pages directly — only this consent moment."
- Footer: `Decline` ghost · `Approve` primary (NOT `--warn`/`--danger` — SSO consent is explicit but not destructive).

**Honesty rules pinned at this surface:**

- The scope copy is VERBATIM. The designer does NOT improvise the "what the hub will receive" line.
- No central SSO server — the modal renders THIS instance as the authoritative source (rule 26). The modal NEVER says "log in with Theourgia.com."
- The assertion is time-limited (24h). The modal displays the expiry verbatim.

**Editorial voice slot:** Body copy as above. Approve / Decline CTA verbatim.

---

### 14. `Federation Audit Log.dc.html` (full route — `/hubs/{hub_id}/admin/audit`)

**Why this surface exists:** Per Phase 12 § 14. The audit log is exportable for GDPR / DPIA / compliance reviews.

**Layout:** Full route, single-column.

- Header band: hub name breadcrumb + "Audit log" title + filter rail.
- Filter rail: actor picker (all hub members + officers + admins) · event-type chips (every message-type enum value) · time range picker · "Show only my actions" toggle.
- Event table: row = timestamp + actor DID + event-type chip + target (a structured "did X to Y" line) + details disclosure caret (revealing the full JSON envelope).
- Export band at the bottom: "Export filtered view" CTA → CSV download. The export contract is GDPR-compliant.

**Honesty rules pinned at this surface:**

- Every row is matter-of-fact. NO "alert" / "warning" / "incident" labels.
- The export ships the filtered view — never the whole log without consent.
- Per the plan, hub members can see events affecting them; non-member compliance auditors get a filtered view.

**Editorial voice slot:** Title verbatim. Filter labels.

---

### 15. `Push Content to Hub.dc.html` (modal — surfaced from the Entry / Publication / Divination detail kebab)

**Why this surface exists:** The per-entry "publish to network" action. Per Phase 12 § 3.

**Layout:** Centered modal (~520px wide).

- Header: "Push to network" + entry/publication title.
- Body: hub multi-select (only hubs the practitioner is a member of are listed). Each hub row shows: hub name + the practitioner's role in that hub + a small `--warn-soft` callout "This hub auto-curates" or `--ok-soft` "This hub reviews submissions."
- Visibility band: a read-only chip showing the current entry's visibility — "Your entry is set to Network. Pushed copies are scoped to the selected hubs." If the entry is Sealed, the modal IS DISABLED with the verbatim "Sealed entries cannot be pushed. Sealed content never federates." (rule 5).
- Disclosure band at the bottom: verbatim "Content already mirrored may persist in caches" (rule 21).
- Footer: `Cancel` ghost · `Push` `--warn-soft`.

**Honesty rules pinned at this surface:**

- Sealed entries CANNOT be pushed. The modal is disabled with the verbatim copy.
- The cache-persistence disclosure is verbatim — never paraphrased.
- The hub list excludes hubs that don't accept the entry's content type.

**Editorial voice slot:** Disclosure copy verbatim. Sealed copy verbatim.

---

### Cluster B · Phase 13 ActivityPub (6 surfaces)

The Fediverse adapter. The conceptual primary is **public broadcast** — entries marked `public` flow out as ActivityPub `Note` / `Article` / `Event` objects; follows / boosts / likes / comments flow back in.

---

### 16. `ActivityPub Settings.dc.html` (route — `/settings/activitypub`)

**Why this surface exists:** The vault-owner's control panel for the AP integration. The single switch + per-content-type follower visibility + the auto-accept-vs-review toggle.

**Layout:** Full route, single-column.

- Header band: title "Fediverse (ActivityPub) integration" + a subtitle "How your public content reaches Mastodon, Pleroma, and other AP platforms."
- Master switch: toggle "Enable Fediverse integration" — OFF by default. When OFF, all subsequent sections are disabled.
- Profile band: WebFinger handle preview (`@{slug}@{instance}`), avatar selector, display name override, bio override.
- Follower approval: radio "Auto-accept follows (recommended for hubs)" / "Manually approve follows (recommended for vaults)" — defaults to MANUAL for vaults.
- Per-object-type pickers: which content types broadcast as which AP object types. The defaults are locked per the plan; this surface lets the practitioner OVERRIDE.
- Outbound activity selector: which actions emit `Create` / `Update` / `Delete`. Default ALL outbound activities. Lets the practitioner suppress `Delete` if they want tombstones-only semantics.
- Save band at the bottom.

**Honesty rules pinned at this surface:**

- Master switch defaults OFF. AP is OPT-IN.
- "Manual approval" is the default for vaults (rule 20).
- The Visibility → Public downgrade rung (`--danger`) is the only `--danger`-using interactive — and ONLY on the master-switch first activation (rule 2 carry-forward).
- The "recommended for…" copy in the radio choices is verbatim.

**Editorial voice slot:** Subtitle copy. Recommended-for parenthetical copy verbatim.

---

### 17. `Followers Pane.dc.html` (route — `/followers`)

**Why this surface exists:** The single home for "who follows my vault on the Fediverse." Includes the approval queue if manual-approval mode is on.

**Layout:** Full route, two-tab.

- **Followers** tab — list. Each row is `RemoteFollowerCard`: avatar + display name + WebFinger handle + tradition tag (if discoverable) + follow-since timestamp (quiet) + kebab menu (Block · Mute · View profile).
- **Pending approvals** tab — list (only visible if manual-approval mode is on). Same shape as Followers, but with `Approve` / `Decline` per row.
- Quiet follower count: a small "{n} followers" tagline in the page header — `--ink-mute` chrome (the ONLY place follower-count appears per rule 18).

**Honesty rules pinned at this surface:**

- Follower count is QUIET. Single place. `--ink-mute`.
- NO "followed back" CTA — Theourgia practitioners deliberately do not follow remote actors (the focus is broadcast, not consumption).
- Blocking a follower is irreversible from this side — surface chrome makes that clear.

**Editorial voice slot:** Empty state. Follower count format "47 followers" not "47 fans" / "47 people."

---

### 18. `Remote Content Embed.dc.html` (Tiptap node + the rendered chip — appears anywhere a remote ActivityPub post is referenced inside a Theourgia entry)

**Why this surface exists:** Per rule 13 (Editor block embed parity). Practitioners may reference a Mastodon post inside their journal entry. This node renders the embed gracefully.

**Layout:** Inline Tiptap node. The rendered output is a `RemoteActivityPubPostCard`: author avatar + WebFinger handle + post body (truncated to 280 chars in the inline view; full view on click) + a small `‡ from {instance}` chip.

**Variants:**

- Resolvable (post still exists at source): full chrome.
- Unresolvable (post deleted at source, tombstone received): same chrome but body greyed `--ink-mute` with "Original post no longer available" verbatim copy.
- Loading: a small inline skeleton.

**Honesty rules pinned at this surface:**

- The `‡` source chip is mandatory. Federated content is ALWAYS attributed.
- Truncation is editorial, not algorithmic — the H07 PublicVaultPage truncation rule applies.

**Editorial voice slot:** "Original post no longer available" verbatim.

---

### 19. `WebFinger Verification.dc.html` (full route — `/verify` and a smaller in-context preview)

**Why this surface exists:** Practitioners often need to prove "yes, this Mastodon handle is me" — for cross-instance trust. This surface walks them through the WebFinger verification.

**Layout:** Full route, single-column.

- Header: title "Verify your Theourgia identity" + a subtitle "Confirm that a Fediverse handle resolves to your vault."
- Step 1: an input "Paste a Fediverse handle to verify" with placeholder `@user@instance.tld`.
- Step 2: a "Run check" CTA. Loading state shows a small spinner + "Querying WebFinger…"
- Step 3: result panel — verified (`--ok-soft`) or unverified (`--warn-soft`). Verified shows the resolved actor URL + the matching key fingerprint. Unverified shows the specific failure (no WebFinger record · key mismatch · DNS failure · etc.) with troubleshooting copy.

**Honesty rules pinned at this surface:**

- The unverified state uses `--warn-soft`, NOT `--danger` (rule 2 — this is informational, not destructive).
- Troubleshooting copy is technical-but-friendly. The designer composes per the Style Guide.

**Editorial voice slot:** Subtitle copy. Step labels verbatim.

---

### 20. `Federated Comments Stream.dc.html` (the rendered comment list — appears on every public entry / publication page)

**Why this surface exists:** Comments from AP-compatible platforms (Mastodon reply, Pleroma reply, etc.) appear here inline with local comments. Per rule 27.

**Layout:** Comment list. Each comment is a `FederatedCommentCard`:

- Local comments: avatar + display name + body + timestamp + kebab (Reply · Hide · Flag).
- Federated comments: avatar + WebFinger handle + body + timestamp + `‡ from {instance}` chip + kebab (Reply · Hide · Flag).

The comment list is split into three sub-sections (collapsible):

- **Approved** (default expanded): all approved comments.
- **Pending moderation**: visible only to the vault owner; shows pending federated comments.
- **Hidden**: visible only to the vault owner; shows blocked / spam comments.

**Honesty rules pinned at this surface:**

- Every federated comment carries the `‡` source chip (rule 27).
- Pending moderation default — federated comments require approval (per the H08 backend lock).
- Local comments and federated comments use the SAME card shape (with the chip the only differentiator) — federation is normalised into the existing comment substrate.

**Editorial voice slot:** Section labels verbatim. Empty-state copy for each section.

---

### 21. `Cross-Post Preview.dc.html` (modal — surfaced before publishing a public entry / publication / newsletter)

**Why this surface exists:** When a practitioner publishes-public, they may opt to cross-post to the Fediverse. This modal previews how the post will look on Mastodon.

**Layout:** Centered modal (~640px wide).

- Header: "Cross-post to the Fediverse?" + entry/publication title.
- Body (left side, ~50%): a faithful Mastodon-style preview of the post — including the AP `summary` field (which Mastodon renders as a content warning) for ritual content, the body truncated to Mastodon's 500-char visible window with a "Read more" link, and the link back to the original Theourgia URL.
- Body (right side, ~50%): a small disclosures band: "Only entries set to Public reach the Fediverse" (rule 24) + "Custom Theourgia extensions render as plain Notes / Articles in Mastodon (graceful degradation)" + "You can edit how this post appears in Settings → Fediverse."
- Footer: `Skip cross-post` ghost · `Cross-post` primary.

**Honesty rules pinned at this surface:**

- The "Only entries set to Public reach the Fediverse" copy is verbatim.
- The preview is FAITHFUL — it renders exactly what Mastodon will receive (including truncation).
- The "graceful degradation" disclosure is verbatim — never paraphrased.

**Editorial voice slot:** Body disclosure copy verbatim.

---

## Token additions expected (`agent_data_and_components_H08.md`)

The designer is expected to introduce ONLY these new tokens (or fewer; tokens not used in any `.dc.html` are dropped):

- `--network-*` family for hub-affiliated chrome (mirrors `--map-*` from H07 but tuned for community).
- `--peer-*` for the four handshake states (`--peer-ok` / `--peer-pending` / `--peer-refused` / `--peer-blocked`) — all `--warn` family for the two negative states, none `--danger` (rule 2).
- `--planetary-hour-now` for the in-the-moment planetary-hour chip on group ritual surfaces.
- `--remote` for the chrome of federated / AP-sourced content (the `‡ from {instance}` chip).

Tokens NOT to introduce:

- ANY engagement-flavoured token (no `--follow-button-color`, no `--engagement-warm`, no "boost" colour).
- ANY recommendation-feel token (no `--trending`, no `--featured-warm`).
- ANY DM / notification-spam-feel token (federation is NOT a notifications-driven UX).

---

## Component additions expected

New primitives that emerge from the surfaces above. The designer is welcome to consolidate where multiple surfaces share a shape.

- `HubMembershipCard` (surface 1)
- `HubInvitationCard` (surface 1)
- `PeerInstanceCard` (surface 2)
- `HubDiscoveryCard` (surface 3)
- `HubAdminTabs` (surface 4)
- `CurationItemCard` (surface 4)
- `HubMemberTabs` (surface 6)
- `NetworkFeedItemCard` (surface 6)
- `GroupRitualTimeTrio` (surfaces 8 + 9 + 10 — the three-pinned cross-timezone display per rule 23)
- `GroupRitualParticipantRail` (surfaces 9 + 10)
- `GroupRitualFragmentCard` (surfaces 9 + 10)
- `PrivateViewerCard` (surface 11)
- `RolePermissionMatrix` (surface 12)
- `AuditLogRow` (surface 14)
- `WebFingerHandleChip` (surfaces 16 + 17 + 18 + 19 + 20 + 21)
- `RemoteFollowerCard` (surface 17)
- `RemoteActivityPubPostCard` (surface 18)
- `FederatedCommentCard` (surface 20)
- `MastodonStylePreviewPanel` (surface 21 — composed only for the Cross-Post Preview; designer renders the preview as a faithful copy of Mastodon's chrome, NOT branded as Theourgia)

---

## Per-component ritual reminder

For every surface above, before declaring it shipped, the designer runs the pre-ship drift checklist (`feedback_pre_ship_drift_checklist.md`):

1. **Section inventory** — every section listed above is present + named.
2. **CSS var cross-check** — every value resolves through a `var(--token)`. Raw hex / rgba / non-token values are rejected.
3. **Verbatim editorial copy** — every quoted-string in this document appears in the `.dc.html` exactly, including punctuation.
4. **Default state** — the default state matches what this document describes. No "this is the empty state" hand-wave.
5. **Variant completeness** — every variant called out above (anonymous viewer, pending member, etc.) renders correctly.
6. **`--danger` audit** — `--danger` appears ONLY on the explicit Visibility → Public downgrade rung. Every other negative-state chrome uses `--warn` family.

The build side will run a re-audit on every surface as it lands — if the drift checklist is not visibly passed, the build side bounces the surface back.

---

## Out of scope for H08 (explicit deferrals)

These items appear in the plan but are deferred. Designer SHOULD NOT include them.

- **Hub-level analytics dashboards** — Phase 12 has "officers can run analytics queries"; the surface is deferred to a follow-up after H08 ships. The Roles & Permissions Editor (surface 12) does include the "Run analytics queries" permission column so the matrix is future-proof.
- **Cross-network bundle discovery** — the Magickal Bundle Format (MBF) story spans Phases 12 + 13 + 14; the cross-network browser is Phase 14's job.
- **Direct messages / Mastodon DMs** — rule 25 (no auto-DMs); even practitioner-initiated DMs are deferred to a future request because they'd need a whole-surface comms model.
- **Bridgy-Fed-style cross-protocol bridging** — Phase 13 § 5 lists Mastodon compatibility but explicitly NOT bridging to non-AP protocols. Designer doesn't render any bridging chrome.
- **Per-instance hub block discovery / community blocklist subscription UI** — surface 2 (Network Browser) renders the affordance as a deliberate single CTA; the deep flow (browsing community blocklists, comparing, selecting) is deferred.
- **Per-hub paid memberships / Stripe integration for hubs** — Phase 10's Stripe Connect is per-vault, not per-hub. Hubs that want to charge dues use the practitioner-level Phase 10 substrate; H08 surfaces don't render any hub-level Stripe chrome.

---

## What the designer can leave for follow-up

If H08 is too large to ship in one bundle, the designer may split into two waves:

- **Wave A (foundation + Phase 12 native):** Cluster A's 15 surfaces. This is the bulk and the higher-impact half.
- **Wave B (Phase 13 ActivityPub):** Cluster B's 6 surfaces. Smaller, can land 1-2 weeks after Wave A.

The cross-cutting tokens + new primitives should ship with Wave A — Wave B reuses them.

---

## Test counts going in

- Frontend shared: **2194 vitest** (all green).
- Backend: **2276 tests** (all green). Alembic at **0055**.
- Storybook: **557 visual baselines** · **543/557 axe a11y at WCAG 2.2 A+AA (97.5%)**.

---

## When this document is "done"

The designer is done with H08 when:

- All 21 `.dc.html` files land in `/home/sophia/design-handoffs/theourgia/<YYYY-MM-DD>-H08/handoff_H08/`.
- `agent_data_and_components_H08.md` enumerates: new tokens (with one-line rationale each) · new primitives (with their composition rationale) · new editorial-copy entries (every verbatim string from this document confirmed as adopted).
- `agent_onboarding_H08.md` walks a fresh build-side agent through the bundle (the same way `agent_onboarding_H07.md` did).
- Every surface passes the per-component pre-ship drift checklist (sections + CSS var + verbatim copy + default state + variants + `--danger` audit).

When all three drop into the handoff folder, the build side picks up.

---

## Maintainer override

Anything in this document that the maintainer (Sophia / Soror Ευ. Α.) flags as "I no longer want this" overrides the document. The designer raises any maintainer-override touch-points back to the build side BEFORE coding around them.

---

**End of H08 request.** Net new tokens, primitives, surfaces, and rules will unblock 6-8 weeks of build-side work and close Phases 12 + 13 end-to-end.
