# v1.0 close plan — consolidated gap analysis and batch order

> Written 2026-07-16 at the start of the "complete it to version 1" run.
> Source: four deep audits (federation/AP · plugins/registry/daemon ·
> hardening/GDPR/ops · docs/tests/release) against plan/15-hardening-and-launch.md
> and the 22-item Tier plan in CLAUDE_CONTINUATION.md.
>
> Baseline at start (commit `ea521b1`): backend suite running · shared 3039 ✓ ·
> admin route-mount 40 ✓ · registry 34 · agent-daemon 198.

## Scope rule for v1

H10 was **the last design package before v1.0** (design queue empty). Therefore
v1 = every *designed* surface wired to a real backend + every Tier-plan item +
every automatable Phase-15 deliverable. No new designed surfaces are invented.
Deliverables that require external humans (pen-test firm, external a11y audit,
non-technical user testing, community channels, launch announcement, PyPI/npm
publishing credentials) are documented in the launch report as post-tag actions
for Sophia — not silently dropped.

## Batch order (dependencies → sequence)

### Wave 1 — substrates
1. **W1a Closed-tradition flag** (Phase 15 §14; task #24) — model + import
   notice + public-share hard-block + operator slug list consumed by the AI
   filter layer. Prerequisite of MBF.
2. **W1b MBF core** (Tier #14 first half; task #6) — envelope schema, manifest,
   Ed25519 sign/verify (warn-not-block unsigned), SPDX + magickal tags,
   provenance chain, piecemeal import through existing `/sandbox/import`,
   export; ADR-0011 (flagged for Sophia review). GDPR export gains MBF flavor.
3. **W1c Content bundles ×7** (Tier #14 second half) — pantheon, tradition,
   ritual set, correspondences, festival calendar, spread/deck, voces — shipped
   as MBF payloads with citations.

### Wave 2 — plugin ecosystem + agents
4. **W2a Plugin loader wiring + install-time Ed25519 verify** (task #16) —
   loader executes ACTIVE plugins at startup; registry download/release
   endpoint; backend fetch-and-install bridge; registry SSO bridge.
5. **W2b Agent daemon completion** (task #15) — vault-side MCP JSON-RPC
   (`read.*` + `meta.closed_tradition_slugs` served by backend), runs DB
   persistence, 6 per-purpose agent definitions, cost aggregation endpoint,
   sealed-exclusion property tests. Waker/`--continue` resume window if time
   allows, else documented v1.1.

### Wave 3 — federation
6. **W3a Transport wiring** (task #23) — producers enqueue, inbox handlers
   (PENDING→PROCESSED), capability tokens wired, `/federation/peers` backend.
7. **W3b AP completion** — AP inbox signature verification, inbound Follow →
   FollowRequest → outbound Accept, NodeInfo 2.0, outbound Create(Note) on
   publish, Undo/Like/Announce/reply-to-comment handling.
8. **W3c Hub content flows** — push-to-hub, network feed, hub curation
   newsletter backend, hub public face, federated comments, remote embed
   (all surfaces exist honestly-disabled; wire them).
9. **W3d Twin-instance federation test** (task #7) — two local compose stacks;
   handshake, push/pull, follow round-trip; record in docs/ops.
10. **W3e Group ritual cross-instance + egregore flow** (task #8).
11. **W3f DP aggregate endpoints** (task #11) — hub-scoped, opt-in, cohort
    minimum, audit-logged; wires b108-2hr substrate.

### Wave 4 — hardening features
12. **W4a Memorial completion** (task #4) — Celery-beat auto-trigger,
    per-entry posthumous flag + release job, Shamir key-share (GF(256) SSS)
    with threat-model doc, executor notification, docs/user/digital-inheritance.md.
13. **W4b B5 key rotation backend** (task #13) — rotate + re-wrap job +
    endpoints; wire KeyRotationSurface.
14. **W4c Whisper transcription** (task #3) — faster-whisper optional extra,
    Celery task, endpoints, Editor wiring.
15. **W4d Email delivery backends** (task #9) — Postmark, SES, Mailgun.
16. **W4e Self-hosted video slots** (task #10) — Cloudflare Stream + Mux
    providers, BYO credentials, never-autoplay invariant.
17. **W4f Crisis nudge** (task #25) — settings persistence, sustained-distress
    trigger, resource registry. Designer copy only; no improvised strings.
18. **W4g Bind-rune designer + Northumbrian bundle** (task #5).

### Wave 5 — ops + compliance
19. **W5a GDPR remainder** (task #14) — cookie consent on public surfaces,
    DPIA template, breach runbook, privacy policy template.
20. **W5b Ops** (task #17) — scripts/install.sh one-command installer, health
    aggregation endpoint + admin dashboard route, Prometheus/Grafana bundle,
    top-20 runbooks, DR drill executed + recorded.
21. **W5c Helm chart** (task #12) — lint + template validated.

### Wave 6 — quality + docs + release
22. **W6a E2E flows** (task #19) — playwright.config.ts + sign-in / entry
    write-autosave-publish / blog read / divination / settings specs.
23. **W6b Docs** (task #18) — full user docs, wire docs/{user,admin,dev} into
    Starlight, static API reference from OpenAPI, plugin tutorial, ai-agents
    docs. Kill "planning phase" stubs.
24. **W6c Release engineering** (task #20) — CI full suite re-enabled (from
    `6afc51a`) + nightly cron, versions → 1.0.0 everywhere, CHANGELOG [1.0.0]
    cut, release.yml builds all four images + real CI gate, README v1 refresh.
25. **W6d FEATURES.md audit** (task #21) — every checkbox against reality;
    honest v1.1 deferral notes. DO LAST before tag.
26. **W6e Tag v1.0.0 + prod deploy + launch report** (task #22).

## Explicit v1.1 deferrals (honest, documented in FEATURES on audit)
- Live Mastodon/Pleroma interop testing (needs external instances; shapes +
  signatures validated against spec + twin test instead)
- 10k-follower fan-out perf run · 100-user load test at scale
- External security pen-test, external WCAG audit, non-technical user testing
- Auto-update channels + migration preview/one-click rollback UX
- SDK publishing to PyPI/npm (credentials + consent)
- Community channels (forum/Matrix room), showcase/sponsors pages
- Native mobile apps (already post-1.0 per PROJECT_PLAN)

## Standing rules for every batch in this run
- Tests run before claiming green; README counters ride every commit.
- Conventional commits; no emojis; co-author trailer per harness.
- No improvised user-facing copy on designed surfaces; care palette rules.
- Every new write endpoint uses `CurrentUser`; reads on multi-user data filter
  `is_builtin OR owner_id`. Migration gotchas per CLAUDE_CONTINUATION.md.
