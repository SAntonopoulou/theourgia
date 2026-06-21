# Phase 02 — Batch 16: Admin ops surfaces (federation, health, wellbeing, bundles, agents)

> **Scope target:** the 5 admin surfaces that operate the running node — Wellbeing (tone-critical opt-in nudge), Health (live node dashboard), Federation (peer browser), Agents (BYO-key AI integration), and the Bundles pair (browser + install wizard).
>
> **Why this group:** these surfaces share the "live ② / ③" pattern — almost nothing here is static. Health rolls up service probes, Federation polls peer reachability + latency, Wellbeing reads on-device signals, Agents tracks token usage in real time. Doing them together keeps the live-data conventions consistent (poll intervals, freshness indicators, error states, no static "operational" badges).
>
> Per `feedback_follow_design_thread_deep.md`: every surface here is a place where the design's gotchas matter more than the layout — Wellbeing especially.

## Surfaces

| Surface | Route | `.dc.html` | Tone-sensitive notes |
|---|---|---|---|
| Wellbeing | `/wellbeing` | `Theourgia Wellbeing.dc.html` | **The most tone-sensitive surface in the entire product.** Off by default. Never modal, never alarming, never red, never logged. Detection runs on-device only — privacy guarantee is literal. Do **not improvise crisis language**; the maintainer reviews the regional resource list before it ships in production. |
| Health | `/health` | `Theourgia Health.dc.html` | Admin-only. Everything is live ②/③ — no static "Operational" badges. Cert/token expiry are real countdowns. Refresh + drill-into-service. |
| Federation | `/federation` | `Theourgia Federation.dc.html` | This-instance card with federation-mode toggle (open/invite/off); pending peer requests; connected-peers list with **real reachability + latency**; trust badges; blocked peers. Block is a real policy change → Confirm. |
| Agents | `/agents` | `Theourgia Agents.dc.html` | **BYO keys** — "your keys never leave your instance" prominently. Browser-extension-style capability consent, granular accept/decline. Cost cap → toast when approaching, modal when at. Install + memory-file editor are TODO. |
| Bundles | `/bundles` | `Theourgia Bundles.dc.html` | Card grid + type filters + tier badges (Official/Community/Unverified — real verification state). Closed-tradition flag from manifest changes available actions (no public-share). |
| Bundle Install | `/bundles/install` | `Theourgia Bundle Install.dc.html` | 6-step wizard: preview → license/attribution → mode (sandbox-first default) → select items (piecemeal allowed) → resolve alias conflicts (default **distinct**) → confirm. |

## Tone-critical Wellbeing rules (from `agent_onboarding.md §`)

These survive into the implementation as code comments + behavior:

1. **Off by default.** First-render of the toggle is unchecked.
2. **On-device only.** No telemetry, no logs, never sends signals anywhere.
3. **Never modal.** The nudge is a small dismissible card. Banner-style at most.
4. **Never alarming.** The icon is a calm vigil-lamp. **Never red.** Care-tone tokens (`--care`, `--care-soft`, `--care-line`) are designed for this — not `--danger`.
5. **Per-display mute.** Mute carries forward to subsequent appearances on the same surface.
6. **"A note, if it's welcome"** framing on the nudge. Not "Are you okay?" Not "We're concerned about you." Get the copy from the maintainer; do not improvise.
7. **Regional resources** — real crisis lines. The list must be maintainer-reviewed before going live in any production deployment. Ship the structure with the demo lines from the `.dc.html`; flag the production review in a code comment.

## Live-data conventions (Health / Federation / Agents)

- Service / peer probes: poll every **15s** in dev; production owners can tune in Settings.
- Latency widget: rolling 1-minute median; show `—` when no recent probe.
- "Stale" state when last probe > 60s ago (line dot turns to ink-mute, label adds "Stale" prefix).
- Refresh button calls the same probe on demand; spinner shows the refresh in flight; the rest of the data stays interactable.
- No fake green badges. If the probe hasn't run yet, show "Checking…" not "Operational".

## Acceptance criteria

1. All 6 routes render against their `.dc.html` per the per-component ritual (Wellbeing has 1 `.dc.html` but is heavily tone-gated — give it extra care).
2. Wellbeing default state: toggle off, nudge preview hidden, mute affordances visible but inert until toggle on.
3. Health + Federation + Agents use placeholder data marked clearly as "Probe pending — wires up with the health-check substrate." No fake green badges shipped.
4. Bundle Install is a real 6-step wizard with back/forward, not a single-page form. Step state survives Cancel→Resume (localStorage).
5. Block-peer + revoke-peer use themed Confirm; no native dialogs.
6. Per-component ritual followed: drift list written before code, `.dc.html` end-to-end, `agent_onboarding.md §` for the surface, sibling cross-references read.

## Out of scope

- **Real live-data wiring** — the health-check / federation-probe / token-meter substrates ship with the wiring pass.
- **Install/consent modal for an Agent** — TODO per the design notes.
- **Memory-file editor for an Agent** — TODO per the design notes.
- **Standalone bundle detail page** — partial in the design; defer the standalone detail to a follow-up.

## Memories the batch should reinforce or add

- `feedback_follow_design_thread_deep.md` (the depth rule — Wellbeing is the showcase)
- `feedback_style_guide_voice_overrides_mockup_jargon.md` (just shipped — sweep for it)
- A new memory if a Wellbeing-specific copy rule emerges from this batch (probably will — the maintainer's exact crisis-line list belongs in memory).
