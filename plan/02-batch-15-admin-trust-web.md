# Phase 02 — Batch 15: Admin trust-web + identity surfaces

> **Scope target:** the 5 admin surfaces that compose the trust web — Identities, Lineage (admin), Membership, Permissions, Account. After this batch every identity / lineage / membership / role decision the rest of the product depends on has its admin form built against the designer's `.dc.html` source.
>
> **Why this group:** these surfaces all touch the same shared model (Identity + attestations + memberships + roles). Doing them together keeps the cross-references straight — Identities feeds Lineage feeds Membership feeds Permissions — and lets each surface link cleanly to the others before any of them ships.
>
> Per `feedback_follow_design_thread_deep.md`: each surface follows the per-component ritual with the deep thread (`.dc.html` + `agent_onboarding.md` § + sibling cross-references + interaction patterns + drift list before code).

## Surfaces

| Surface | Route | `.dc.html` | Notes |
|---|---|---|---|
| Identities | `/identities` | `Theourgia Identities.dc.html` | Multi-identity selector + per-identity card + keypair management + archive. Acting-as is **global state**. |
| Lineage admin | `/lineage` (admin variant) | `Theourgia Lineage.dc.html` | Admin half (issue / revoke / counter-sign attestations). The public `/lineage` page in Batch 14 is the read view. |
| Membership | `/membership` | `Theourgia Membership.dc.html` | Hub admin — petitions to read, degree-filtered roster, dues / standing rail. Gated by perms. |
| Permissions | `/permissions` | `Theourgia Permissions.dc.html` | Role rail + grouped permission matrix (~30 perms × roles) + preview-as-role + templates. Server-side enforcement; this only edits policy. |
| Account | `/account` | `Theourgia Account.dc.html` | Security devices, passkeys, sessions, account closure. |

## Acting-as state (cross-cutting)

Per `agent_onboarding.md` § Identities: **acting-as is global state** consumed by the Editor, Blog, Profile, memberships, SSO. This batch establishes the acting-as store so subsequent batches don't reinvent it.

- Store: a small context that holds `{ acting_as: IdentityId | null }`, persisted to `localStorage` (so reloads survive), exposed via `useActingAs()` hook.
- Topbar slot: identity-picker chip in `VaultTopbar` (when there's > 1 identity).
- Default: per-surface default-by-surface mapping (Identities surface lets users set "default for Journal", "default for Blog", etc.).

## Unlinkability rules (`feedback_follow_design_thread_deep.md`)

The Identities and SSO designs both call out: **never leak that two identities share a vault**. Per-identity preview must be an owner-only affordance; the public route only ever sees one identity. The acting-as store carries the *owner's* current acting-as, not the *visitor's* — visitors see whichever identity authored the surface they're on.

## Real signature checks (deferred to wiring pass)

The Lineage admin surface's "issue attestation" / "revoke" actions sign / revoke real ed25519 signatures (§10.5). This batch ships the UI; signing wires up with the keypair primitives the backend already has (`core/federation/keys.py`). Buttons are stubbed and clearly labelled "Endpoint pending" until then — same pattern as Batch 14's verify-signature stubs.

## Out of scope (later batches)

- **Authoring tools** (Editor, Templates, Newsletter Composer, Scheduler, Book Preview) — Batch 17
- **Ops surfaces** (Federation, Health, Wellbeing, Bundles, Agents) — Batch 16
- **Workshop tools** (Workshop, Sandbox, Oracle, Transliterate) — Batch 18
- **Real cryptographic wiring** — multi-week wiring pass

## Acceptance criteria

1. All 5 surfaces render against their `.dc.html` (per-component ritual followed end-to-end for each).
2. Acting-as context + hook + topbar chip wired; persistence survives reload.
3. Identities surface lets owner switch acting-as identity and set per-surface defaults.
4. Lineage admin issue / revoke buttons are clearly marked as endpoint-pending stubs.
5. Membership admit / decline petition buttons fire themed Confirm dialogs (no native confirm).
6. Permissions preview-as-role visibly recomputes the rendered affordances (the existing UI shows / hides actions per granted scopes).
7. Account session-revoke fires a themed Confirm.
8. Drift lists from the per-component ritual were written before code; saved in the per-file frontmatter where they uncovered a non-obvious constraint.
9. No native `window.alert / confirm / prompt`.
10. Memories saved for any reusable rule that emerged.

## Memories the batch is expected to reinforce

- `feedback_follow_design_thread_deep.md` (the new depth rule)
- `feedback_match_design_exactly.md`
- `feedback_interactions_per_design_outline.md`
- `feedback_ui_modals_only.md`
- `feedback_split_setter_state_contexts.md` (if acting-as context grows a `{ state, set }` shape, split it)
