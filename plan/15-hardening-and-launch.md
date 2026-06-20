# Phase 15 — Hardening & Launch

> The final phase: accessibility audit, performance audit, security audit, ops tooling, onboarding flows, marketing site, tutorial content, the actual public launch. Nothing new is built that hasn't been planned; everything that has been built is polished, tested, documented, and brought to a sustainable steady state.

## Goal

Take Theourgia from "fully featured" to "ready for real-world adoption by serious practitioners." Every cross-cutting concern from PROJECT_PLAN.md §7 is satisfied. Self-hosters can deploy with confidence. New users can onboard without confusion. The project's public face on `theourgia.com` is worthy of what's inside.

## Dependencies

- All previous phases complete

## Deliverables

### 1. Accessibility audit
- Full WCAG 2.2 AA audit by an external accessibility expert
- Screen-reader testing on JAWS, NVDA, VoiceOver
- Keyboard-only navigation pass for every workflow
- Color contrast verified in light, dark, high-contrast modes
- Motion-sensitivity audit
- Color-blind verification (deuteranopia, protanopia, tritanopia)
- Issues filed and triaged; blockers fixed; non-blockers documented
- A11y statement published on `theourgia.com`

### 2. Performance audit
- Core Web Vitals on public surfaces: LCP < 2.5s, INP < 200ms, CLS < 0.1
- Backend P95 response time targets: simple reads < 100ms, search < 500ms, election finder < 5s
- Database query budget: no single endpoint > 50 queries; N+1 audit
- Asset size budgets: JS bundles < 200KB gzip per route; CSS < 50KB gzip
- Image optimization, lazy loading, font subset / preload
- Load testing: 100 concurrent active users on a single Hetzner instance
- Profiling reports filed; regressions blocked in CI

### 3. Security audit
- External penetration test (engaged firm or community bug-bounty)
- Threat model review for every phase
- Crypto review (encryption at rest, zero-knowledge mode, federation signatures)
- Dependency vulnerability sweep; SBOM published
- Sensitive-data audit: confirm no PII or magical-content leakage in logs, error messages, or analytics
- CSP headers, HSTS, COOP/COEP, frame-ancestors, referrer-policy
- Security audit report published (redacted where appropriate)
- `SECURITY.md` updated with disclosed contact and PGP key

### 4. Operations / DevOps
- Production-grade `docker-compose.yml` with reasonable defaults
- Caddyfile reference with TLS via Let's Encrypt (DNS-01 since Cloudflare proxy in front for theourgia.com)
- Traefik reference config as alternative
- Helm chart for Kubernetes deploys (community contribution welcome — ship a basic version)
- Backup tooling already shipped in Phase 01; in this phase, verify a full disaster-recovery drill (provision a fresh host, restore from R2, validate data integrity end-to-end)
- Monitoring stack: Prometheus + Grafana with bundled dashboards for app, DB, queue, federation
- Alerting recipes: PagerDuty / Opsgenie / ntfy templates
- Runbooks: "what to do when X" for the top 20 ops scenarios
- Disaster recovery plan documented and rehearsed

### 5. Onboarding
- First-run wizard: user enters magickal name, tradition(s), location for astrology, preferred calendars, encryption preference, 2FA setup, optional initial library import
- Per-tradition starter packs: opt-in templates, suggested correspondences, suggested ritual templates (without being prescriptive)
- Sample data: optional "give me a populated test vault to play with" (cleared with one click)
- Empty-state UX: every empty surface has a helpful, non-condescending prompt
- Sample integrations: connect a Stripe account in test mode, subscribe to a newsletter, etc.

### 6. Documentation
- User docs: full coverage of every feature, with screenshots and short videos
- Admin docs: full coverage of self-hosting, backup, restore, scaling, troubleshooting
- Developer docs: contribution guide, architecture deep-dives, ADR archive, plugin development
- API reference auto-generated from OpenAPI
- Tutorial series: "Setting up your first vault," "Joining a network," "Designing your first sigil," "Publishing your first book," "Building your first plugin"

### 7. Marketing site
- `theourgia.com` landing page with the project's actual pitch (scientific illuminism, rebuilding the lost arts, full magical infrastructure, free forever)
- Showcase / gallery of what practitioners are doing with it (consent-based)
- Documentation entry point
- Download / self-host CTA
- GitHub / forum / Matrix / Mastodon links
- Manifesto page (long-form articulation of the project's intent)
- Sponsors / supporters page (if applicable)
- A `theourgia.com/projects` directory if the project wants to surface other related work

### 8. Community
- Forum (Discourse instance, or self-hosted Lemmy, or a Theourgia hub doing double duty)
- Matrix room
- Optional Mastodon presence
- Code of conduct enforced
- Maintainer rotation plan; bus-factor reduction
- Roadmap published with community input

### 9. Launch
- Press kit (small): logo, screenshots, project description, FAQ
- Launch announcement on relevant magical / Fediverse / programming communities (consent-based and tasteful — no spam)
- Tag a `v1.0.0` release with full changelog
- Public retrospective: what was built, what was learned, what's next

### 10. Post-launch sustainability
- Funding model documented (Open Collective / GitHub Sponsors / explicit "no commercial offering" stance)
- Maintenance cadence: cadence of security updates, dependency updates, point releases
- Triage process for issues and PRs
- Mentor-program scaffolding for new contributors
- Annual security audit cadence

### 11. GDPR compliance audit
- **Right-to-access export** end-to-end tested — produces correct, complete archive of all user data in JSON + MBF format
- **Right-to-erasure** end-to-end tested — full erasure with documented limits (federated content lives on per other parties' sovereignty; tombstones propagate; legal-hold exceptions documented)
- **Data portability** export validated against importing into another tool (Day One, Obsidian, etc.)
- **DPIA template** in `docs/admin/dpia-template.md` reviewed against current GDPR / EDPB guidance
- **Breach notification runbook** rehearsed via tabletop exercise
- **Cookie consent UI** verified on all public surfaces; zero-telemetry promise verified by automated CI test (no outbound calls except user-action-triggered)
- **Privacy policy template** for self-hosters published; localized for major jurisdictions where feasible
- **Data minimization audit** — schema review confirms no PII collected without specific purpose

### 12. One-command deploys + one-click migrations
- **Bootstrap installer** (`curl -fsSL https://install.theourgia.com | bash`) verified on fresh boxes — Hetzner, DigitalOcean, Vultr, Linode, OVH; both x86_64 and aarch64
- **Web-based first-run wizard** validated with non-technical user testing (real magicians, not developers)
- **Migration preview UX** — magician sees "here's what will change, here's what may break" with diff display before applying
- **One-click rollback** to previous version tested across schema-changing migrations
- **Auto-update channel selection** (stable / beta / dev) functional; channel switching tested
- **Health-check dashboard** in admin surfaces real-time service health, recent errors, pending updates

### 13. Digital inheritance / memorial mode
- **Designated digital executor** flow tested end-to-end:
  - Encrypted key-share creation (Shamir's secret sharing or similar)
  - Time-locked unlock mechanism tested
  - Executor handoff verified — executor receives notification, follows guided unlock
- **Check-in mechanic** ("if I don't log in for N months, notify [person]") — scheduler tested; notification dispatch verified across email + Matrix + custom channels
- **Memorial mode transition** — vault becomes read-only after trigger; public content stays accessible; private content remains sealed (impossible to decrypt without keys); in-memoriam framing in UI ("This vault is in memoriam for [identity]. Content is preserved per the magician's wishes.")
- **Posthumous publication** — entries scheduled to release after trigger fires; tested end-to-end with confirmable release
- **Configurable triggers** — time-based (N months inactivity), manual (designated executor declares), or hybrid
- **Documentation**: `docs/user/digital-inheritance.md` — gentle, complete, tone-conscious guide; includes "have this conversation with your designated executor" prompts

### 14. Closed-tradition flag handling
- Bundle import flow correctly surfaces respect-source notice with citation back to the source-tradition's preference
- Public-share UI hard-blocks attempts to publicly share closed-tradition content; informative explanation
- AI agent layer (Phase 16) verifies closed-tradition exclusion via property tests — no path from agent surface to flagged content regardless of granted scope
- Documentation: explain the closed-tradition flag philosophy and how to set it on user-created content

### 15. Crisis-aware nudge (opt-in)
- **Opt-in toggle** in settings; off by default
- **Trigger conditions** carefully tuned (sustained severe distress in body/mood snapshots over multiple sessions; one-off ratings never trigger)
- **Regional resource list** curated; community-maintained registry of crisis lines / therapists familiar with magickal practice / supportive resources
- **Tone discipline** — UI copy reviewed by mental-health-literate readers AND practicing magicians to avoid pathologizing magick or being dismissive of practitioner state
- **Easy dismissal** — user can mute the nudge category indefinitely without nag
- **Never invasive** — surfaces as a small dismissible note, never a modal interrupt

### 16. Audit and synchronization of all documentation
- README.md reflects all phase statuses correctly
- FEATURES.md status indicators accurate
- ARCHITECTURE.md reflects shipped reality
- All phase plans' Definition of Done checkboxes accurate
- CHANGELOG.md complete for all releases up to 1.0.0
- All ADRs filed for non-obvious decisions
- API documentation auto-generated from OpenAPI is published at `docs.theourgia.com/api`
- User documentation has no `TODO` headers; covers every user-visible feature
- Admin documentation covers every operational procedure

## Design notes

- Launch is a beginning, not an end. Every deliverable here is something that will be revisited; do not optimize for "ship and forget."
- Onboarding is the single biggest determinant of whether a non-technical magician adopts the tool. Invest disproportionately there.
- The marketing site sets tone for newcomers. The writing must be confident, quiet, exact — same as the product voice.

## Risks

- **Risk:** Launch attention overwhelms infrastructure. **Mitigation:** Pre-launch load test; Cloudflare caching tuned; capacity buffer in Hetzner sizing.
- **Risk:** Hostile reception from segments of the magical community ("don't put magic in computers"). **Mitigation:** Tone of voice; documentation framing magic as record-keeping, not augmenting; consultation with respected practitioners pre-launch.
- **Risk:** Single-maintainer burnout. **Mitigation:** Funding model; maintainer rotation; clear contribution onboarding.

## Definition of Done

- [ ] WCAG 2.2 AA audit signed off
- [ ] All performance targets met
- [ ] Security audit report filed; all criticals and highs resolved
- [ ] Self-hosting documented and verified by a third party from scratch
- [ ] Backup/restore drill executed successfully
- [ ] Monitoring stack deployed on theourgia.com
- [ ] First-run wizard validated with non-technical user testing
- [ ] All documentation surfaces have content; no `TODO` headers
- [ ] Marketing site live at theourgia.com
- [ ] `v1.0.0` tagged and announced
- [ ] Community channels operational; CoC in place
- [ ] Funding / sustainability plan published
- [ ] Roadmap for post-1.0 published
