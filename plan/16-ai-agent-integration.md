# Phase 16 — AI Agent Integration

> Optional, opt-in, user-controlled AI agent layer for Theourgia. Per-purpose Claude agents that a magician can spawn as collaborators — divination companions, scrying journal partners, ritual aides, study tutors, correspondence-research helpers. Modeled on the daskalos pattern (daemon + waker + MCP). User brings their own keys; Theourgia never holds central API credentials; never bills. Agent-free use remains a fully supported first-class path.

## Goal

Deliver a complete AI-agent integration layer that respects practitioner autonomy and platform privacy: agents are an optional capability, not a required one; users supply their own auth; data exposure is bounded by explicit per-agent visibility scopes; sealed content is never auto-decrypted for AI. Where agents are used, they are designed as colleagues — surfacing the magician's own correspondences, finding resonances across their own journal, helping draft notes — not as oracular interpreters or replacements for the practitioner's judgment.

## Dependencies

- Phase 00 (Foundations)
- Phase 01 (Core Architecture) — auth, encryption, plugin substrate, MCP precedents
- Phase 02 (Frontend Foundations) — admin UI for agent management
- Phase 04 (Journaling) — vault data MCP must expose
- Phase 05 (Magical Beings) — entity ledger MCP exposure
- Phase 06 (Divination & Practice) — divination workflows agents can assist
- Phase 09 (Analytics) — agents can leverage saved queries / studies
- Phase 14 (Plugin Ecosystem) — agent capabilities may be exposed via plugin-style manifests

## Deliverables

### 1. Agent daemon
- Python service running alongside the main Theourgia FastAPI app (separate process for fault isolation)
- **MCP server** exposing scoped vault data to authorized agents over MCP/SSE
- Per-agent session management — spawn, attach, resume, terminate
- Token usage tracking per spawn (input + output + cache), persisted per-agent
- Health endpoints; structured logs; metrics

### 2. Host waker
- `systemd --user` service running outside Docker
- Listens for "wake the agent for purpose X" requests from the daemon
- `claude`-spawns a Claude Code process pointed at the scoped agent directory
- **Resume window** (default 30 min): follow-up wakes call `claude --continue` for ~20× input token reduction
- Configurable per-agent: resume window length, max idle time, max session length, cost cap
- Failsafe: terminates runaway sessions exceeding configured limits

### 3. Per-purpose agent types (shipped with the platform)
Each is a separately-scoped agent with its own memory directory and MCP capability allowlist:

- **Divination companion** — assists with reading sessions; surfaces user's own correspondence tables; finds resonances in the user's past readings; never claims oracular authority
- **Scrying journal partner** — assists in post-session symbolic indexing and pattern linking; reads sketch metadata
- **Ritual aide** — helps draft ritual scripts; suggests timing windows from the election finder; surfaces materials from the tool registry
- **Study tutor** — daskalos-style tutor agent for reading curricula (Liber Aleph, PGM, etc.); designs and teaches against curricula
- **Correspondence-research helper** — surfaces patterns across the user's correspondence tables; suggests entries to add; helps reconcile differences between traditions
- **Synchronicity log review** — weekly review of synchronicity capture log; suggests patterns; deferential phrasing always

Agent types are plugin-extensible; new types can be authored and installed.

### 4. MCP server — scoped vault access
- Per-agent capability allowlist declared at agent activation time (browser-extension-style consent UI)
- Capabilities include: `read.entries`, `read.entities`, `read.divinations`, `read.library`, `read.correspondences`, `read.analytics`, `write.notes`, `write.tags`, `write.entry_drafts`, etc.
- **`personal` content** visible to the user's own agent if explicitly authorized
- **`viewer` / `network` content** visible only if the agent has been authorized for those scopes by the user
- **`sealed` content NEVER auto-decrypted** for AI — even if the user wanted to, the architecture prevents it (sealed is zero-knowledge; the daemon doesn't have the keys)
- Read-only by default; write capabilities require explicit per-tool consent
- Per-MCP-call audit log

### 5. User auth (BYO keys)
- Per-vault Anthropic API key OR Claude subscription auth (modeled on how Sophia authorized tutor)
- Keys stored encrypted at rest (Mode A); never logged; never transmitted except to Anthropic
- Theourgia never has a service-level Anthropic key
- Self-hosted Theourgia: keys configured in admin panel
- (Eventually) hosted Theourgia.com: same — users supply keys; no service-side billing
- Optional rotation flow; revocation immediate

### 6. Magician-side MCP (user's own agent connecting in)
- Theourgia exposes an MCP server endpoint a user's own Claude Code (running on their laptop, terminal, etc.) can connect to
- Authorization via per-magician API token (separate from agent daemon tokens)
- Token scoped to the same capability model
- Documentation explains how to add Theourgia to one's local Claude Code config

### 7. Agent memory
- Per-agent scoped memory directory on disk (`/srv/theourgia/agents/<vault>/<agent-id>/`)
- Agent reads memory at spawn, writes before dormancy
- Memory format is markdown files (human-readable, version-controllable)
- User can read / edit / archive an agent's memory at any time via admin UI
- Memory survives platform updates

### 8. Cost & usage controls
- Per-vault cost cap (daily / weekly / monthly)
- Per-agent cost cap
- Token usage dashboard — input, output, cache tokens per spawn; daily / weekly / monthly totals; fresh-vs-resume breakdown
- Cost alerts (in-app + optional email)
- Hard cutoff at cap — agent declines to wake until next cycle or user lifts the cap

### 9. Privacy & ethical considerations
- Agents never train on user data (Anthropic's terms apply; documented)
- Agents never claim oracular authority — tone-discipline in system prompts; surfaced in user-facing copy
- "Surface the user's own knowledge" — agents help reflect, find, connect what the user has already recorded; they do not interpret on behalf of the practitioner
- Closed-tradition content tagged for AI-exclusion can never be exposed to agents even if the user has authorized broad scope
- Per-agent system prompts authored carefully and reviewed; user can read them in admin

### 10. Frontend
- Admin → "Agents" page
- Per-agent configuration: capabilities, memory directory, model selection (Opus / Sonnet / Haiku), cost cap
- Per-agent activity log (in human-readable terms — "the divination companion read 3 past Hekate readings and noted 2 recurring symbols")
- Token usage dashboard
- BYO-keys configuration

### 11. Documentation
- `docs/user/ai-agents.md` — what they do, how to use them, when to skip them
- `docs/admin/ai-agents.md` — how to configure, key management, cost controls, troubleshooting
- `docs/developer/ai-agents.md` — daemon architecture, waker model, MCP capability spec, authoring custom agent types
- ADR: rationale for the daskalos pattern adoption

### 12. Tests
- Unit tests for MCP server tools (visibility-scope enforcement, sealed-content exclusion, capability-allowlist enforcement)
- Integration tests for daemon ↔ waker ↔ Claude Code agent communication
- Property-based tests for visibility leakage (no `sealed` content path from agent surface)
- End-to-end test of a divination-companion session against a populated test vault
- Cost-cap enforcement test (simulated runaway agent halts at cap)

## Design notes

- **The agent layer must be removable.** A self-hoster who wants no AI should be able to not deploy the agent daemon and have a fully-functioning Theourgia without it. The codebase architecture must support this — agent daemon as an optional service, not a hard dependency.
- **Tone matters.** UI copy and agent system prompts should never imply that the AI knows magic better than the practitioner. Phrasing like "surface" / "suggest" / "find resonance" rather than "interpret" / "decode" / "tell you what it means."
- **The closed-tradition exclusion is non-negotiable.** Content tagged closed-tradition is invisible to agents even when the user has set broad scope. This is enforced at the MCP query layer.
- **No service-side keys.** Even if hosted Theourgia.com offers AI integration, users must supply their own keys. This is not a billing model.
- **Resume window is critical for cost.** Without it, every interaction re-bootstraps an agent from scratch — order-of-magnitude more expensive. The 30-min default reflects practical session continuity for most use cases.
- **Self-host with API key** is the primary use case to design for. Hosted with API key, hosted with subscription, all derive from that baseline.

## Risks

- **Risk:** Agents leak `sealed` content via creative MCP usage. **Mitigation:** Multiple layers — sealed content never reaches the daemon (it has no keys); MCP server has explicit exclusion of sealed entries from any query result; property tests verify; security review specifically for this path.
- **Risk:** Cost runaway. **Mitigation:** Hard cost caps; agent terminates at cap; alerts before hitting cap.
- **Risk:** User dependency on agents replaces practitioner judgment. **Mitigation:** Tone discipline; documentation framing; explicit "agent-free is first-class" stance.
- **Risk:** Anthropic API changes break the integration. **Mitigation:** Versioned client; integration tests; documented fallback paths (model substitution).
- **Risk:** Tradition-specific objections to AI use ("magic should not pass through computers"). **Mitigation:** Opt-in by design; never required; agent-free path fully supported; documentation respectful of the objection.

## Definition of Done

- [ ] Daemon, waker, MCP server all deployed and functional
- [ ] All six shipped per-purpose agent types working against a populated test vault
- [ ] BYO-key flow tested end-to-end (Anthropic API key + Claude subscription paths)
- [ ] Magician-side MCP tested with external Claude Code connecting in
- [ ] Sealed-content exclusion verified by property tests and external security review
- [ ] Cost cap enforcement tested and documented
- [ ] Token usage dashboard accurate
- [ ] Documentation complete (user, admin, developer)
- [ ] ADR filed for the daskalos pattern adoption + adaptations made
- [ ] Agent-free deployment verified — Theourgia fully functional without the agent daemon
- [ ] All tests green; CI integration when post-1.0 CI lands
