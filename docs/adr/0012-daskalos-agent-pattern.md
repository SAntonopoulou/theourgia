# ADR-0012: Daskalos pattern for the AI agent layer

- **Status:** accepted
- **Date:** 2026-07-20
- **Deciders:** Soror Ευ. Α., Claude
- **Tags:** #agents, #privacy, #architecture, #phase-16

## Context and problem statement

Phase 16 promises optional per-purpose AI agents — a divination
companion, a study tutor, a synchronicity reviewer — that work
against a magician's vault without ever becoming a requirement, a
billing model, or a privacy hole. The operator already runs a working
precedent: the *daskalos* tutor agent (daemon + waker + MCP) used in
her own study practice. The question was whether to adopt that
pattern for Theourgia or to embed an agent runtime inside the
backend.

Three constraints are non-negotiable and predate the design (rules
50-60, locked 2026-06-28): agents are OFF by default and agent-free
use is first-class forever; sealed content must be *structurally*
unreachable, not policy-filtered; keys are always the user's own.

## Decision drivers

- Sealed (zero-knowledge) content must be impossible to expose to a
  model even by a buggy or compromised agent path.
- The agent layer must be removable — deploy Theourgia without the
  daemon and nothing else changes.
- Cost runaway on the user's own API key must be impossible past a
  user-set cap.
- Closed-tradition exclusion must hold regardless of what scopes the
  user grants (rule 52 is not user-overridable).
- The pattern should be one the operator has already lived with,
  not a speculative architecture.

## Considered options

1. **In-backend agent runtime** — an async task inside the FastAPI
   app calls the model API directly with ORM access.
2. **Daskalos pattern: separate daemon + waker + MCP** — an optional
   companion process supervises `claude` subprocesses; all vault
   access goes through a scoped MCP endpoint over HTTP.
3. **Fully external agents only** — document how to point a personal
   Claude Code at a vault MCP endpoint; ship no daemon.

## Decision

Selected option: **Option 2 — the daskalos pattern**, adapted:
a separate `agent-daemon` process (own DB, own alembic chain, own
systemd-user unit), a subprocess-per-run waker, and MCP on both hops
— the subprocess dials the daemon, the daemon dials the vault's
`POST /api/v1/mcp`. Option 3 survives inside it: the vault-side MCP
endpoint is the same one a future magician-side client will use.

## Rationale

- **Sealed content is structurally unreachable.** Three independent
  layers: the vault's MCP SELECT excludes sealed rows in SQL (the
  authority); the daemon's second-pass filter strips any sealed or
  closed-tradition record that somehow arrives; and the daemon holds
  no decryption keys at all — sealed payloads are ciphertext minted
  on the client. No configuration reaches any of the three.
- **Removability falls out of process separation.** The daemon is a
  separate deployable; the vault's only coupling is an HTTP client
  behind a nullable setting (503 with honest copy when unset).
- **Fault + cost isolation.** A runaway subprocess can be SIGTERMed
  by its supervisor; the at-wake reservation plus at-spend hard halt
  bound spend on the user's key even if the model loops.
- **Credential scoping is structural.** The daemon authenticates to
  the vault with a dedicated per-run bearer (`agent_mcp_token`, hash
  stored, 12 h TTL) that resolves ONLY on the read-only MCP endpoint
  — never a session token, so a leaked token cannot reach the
  general API. The vault authenticates to the daemon with the
  control-plane token on loopback.
- **Proven shape.** The daemon/waker/MCP split is the operator's own
  working tutor setup; adopting it kept the design reviewable
  against lived experience rather than speculation.

BYO keys follow from the licensing ethos (AGPL, no service-side
billing): the daemon stores keys Mode-B passphrase-encrypted,
decrypts in memory at spawn, and exports them only into the
subprocess environment.

## Consequences

- Two more schemas to migrate (daemon alembic chain; `agent_mcp_token`
  vault-side) and one more process to supervise — accepted as the
  price of removability.
- Every vault read costs an extra localhost HTTP hop; acceptable for
  agent workloads (tens of calls per run, not thousands).
- The non-oracular tone rule lives in code (`agents/definitions.py`,
  `NON_ORACULAR_RULE` embedded in every shipped prompt,
  regression-tested) mirroring the analytics digest's banned-phrase
  discipline — prompts cannot silently drift into oracle-speak.
- The waker's `--continue` resume window (~20× input-token saving on
  follow-up wakes) is deferred to v1.1; until then every wake is a
  fresh spawn and the cost caps carry the load. Documented in
  `docs/dev/ai-agents.md`.
