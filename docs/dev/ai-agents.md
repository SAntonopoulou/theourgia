# AI agents — developer guide

The Phase 16 layer: an optional agent daemon that wakes per-purpose
Claude agents against a magician's vault, with BYO keys, hard cost
caps, and structurally unreachable sealed content. A deployment
without the daemon is a fully functional Theourgia (rule 60).

See also `docs/adr/0012-daskalos-agent-pattern.md` (why this shape)
and `agent-daemon/README.md` (the locked honesty rules 50-60).

## The pieces

```
backend/theourgia/
├── api/routers/v1/agents.py      # vault → daemon HTTP bridge (/api/v1/agents/*)
├── api/routers/v1/vault_mcp.py   # daemon → vault MCP endpoint (POST /api/v1/mcp)
├── core/agents/daemon_client.py  # httpx client for the daemon control plane
├── core/agents/mcp_tokens.py     # dedicated MCP bearer mint + resolve
└── models/agents.py              # agent_mcp_token (alembic 0083)

agent-daemon/theourgia_agent/     # separate process · own DB · own alembic chain
├── agents/definitions.py         # the six shipped agent kinds
├── api/routers/runs.py           # runs control plane (start / snapshot / halt / SSE)
├── api/routers/costs.py          # GET /costs/summary (C10 dashboard read side)
├── mcp/                          # JSON-RPC + SSE transport, capability gate,
│                                 #   vault client, rule-52/53 second-pass filter
└── runs/persistence.py           # DB write-through for run accounting (alembic 0003)
```

## Data flow of one run

1. The admin SPA POSTs `/api/v1/agents/runs` with the magician's
   session. The vault resolves the DID, **mints a dedicated MCP
   bearer token** (`core/agents/mcp_tokens.py`, 12 h TTL, hash stored
   in `agent_mcp_token`), commits, and forwards to the daemon with
   the plaintext as `vault_session_token`.
2. The daemon evaluates the cost cap (at-wake reservation), registers
   an MCP session, **persists the run row** (`runs/persistence.py` →
   `agent_run`, keyed by `run_key`), then spawns the `claude`
   subprocess with `THEOURGIA_MCP_URL` + a run-scoped MCP token.
3. The subprocess calls the daemon's MCP tools (`read.entries`, …).
   For each call the daemon dials the vault's `POST /api/v1/mcp`
   (JSON-RPC 2.0) presenting the minted bearer.
4. Cost samples stream to `POST /runs/{id}/cost`; totals write
   through to the run row on every report. Terminal outcomes persist
   via the runner's `on_terminal` hook.

## The vault MCP endpoint (the authority)

`POST /api/v1/mcp` serves exactly the methods the daemon's
`VaultClient` dials: `read.entries`, `read.entities`,
`read.divinations`, `read.library`, `read.correspondences`,
`read.synchronicities`, `meta.closed_tradition_slugs`.

Invariants, in decreasing order of load-bearing:

- **Sealed rows never leave the vault (rule 53).** The entries SELECT
  excludes `encryption_mode = 'sealed'` in SQL — sealed rows are not
  fetched. A serializer-level guard additionally refuses to emit any
  sealed row (regression belt). The daemon holds no keys either way;
  three independent layers.
- **Closed-tradition rows are excluded server-side (rule 52)** via
  the operator-curated list (`theourgia.core.traditions`).
- **Every record carries `sealed` + `tradition_tags`** so the
  daemon's second-pass filter (`mcp/filters.py`) has its keys. The
  daemon pass is defence in depth, not the mechanism.
- **Read-only.** No write methods exist in v1 — the plan requires
  explicit per-tool consent for writes, which is not built. Unknown
  methods get JSON-RPC `-32601`.
- **Location fields are never serialized** (pilgrimage-precision
  caution applies to agents wholesale).

Auth: only `agent_mcp_token` rows resolve here — a browser-session
token is rejected, and an MCP token presented on any other endpoint
resolves nowhere. Both directions of that scoping are structural, not
policy.

`read.divinations` v1 serves the four casting systems that share the
question + retrospective-notes shape (tarot, I Ching, geomancy,
runes); pendulum / bibliomancy / horary / scrying / tea-leaf logs are
a v1.1 extension. `read.correspondences` serves the magician's own
entity attribution tables ("surface the user's own knowledge");
bundled PD reference tables stay on `/api/v1/reference`.

## Dual filtering, stated plainly

The same two exclusions run twice, on purpose:

| Layer | Where | Failure it covers |
|---|---|---|
| Vault (authority) | SQL predicate + server-side strip in `vault_mcp.py` | everything |
| Daemon (second pass) | `mcp/filters.py` before records reach the subprocess | a compromised or buggy vault-side plugin leaking a record |

## Run persistence and restart

`runs/persistence.py` defines the `RunPersistence` protocol with two
implementations: `DbRunPersistence` (production — composes
`DbRunRepo` + `DbInstallRepo`; rows keyed by `run_key`, alembic 0003)
and `InMemoryRunPersistence` (tests + keyless dev; selected when
`THEOURGIA_AGENT_ENV=test`).

Write-through points: run start (before spawn — a run the daemon
cannot account for must not wake), every cost report, terminal
outcome. After a daemon restart, `GET /runs/{id}` falls back to the
persisted row (empty `session_token` — the MCP session died with the
process) and `DELETE` of an orphaned running run settles it as
`halted`. `run_key` is the control-plane run id; the control plane
reuses the install id, so keyed lookups resolve to the latest row
while history keeps one row per run.

## Cost caps and the dashboard

- At-wake reservation (`core/cost_cap.py`): estimated max-spend held
  back from the monthly cap; refused wakes return the daemon's
  verbatim refusal (rule 49).
- At-spend hard halt: a cost report pushing the accumulator past the
  reservation terminates the run (409 `cost_exceeded`).
- `GET /costs/summary?vault_id=…&window=day|week|month` aggregates
  persisted run rows per install, joined to install metadata. The cap
  percentage is ALWAYS month-spend against the monthly cap, whatever
  the window (rule 56). The vault proxies it at
  `GET /api/v1/agents/costs/summary`; the C10 dashboard consumes the
  proxy.

## The six shipped agent kinds

`agents/definitions.py`: divination-companion,
scrying-journal-partner, ritual-aide, study-tutor,
correspondence-research-helper, synchronicity-reviewer. Each carries
a display name, a one-paragraph system-prompt scaffold, a default
READ-ONLY capability set, and a suggested model tier. Every prompt
embeds `NON_ORACULAR_RULE` verbatim (rule 54; regression-tested).
The installs endpoint canonicalises known kinds and keeps accepting
free-string custom kinds — agent types are plugin-extensible.

## Testing

- Backend: `backend/tests/test_vault_mcp.py` (method shapes, sealed +
  closed-tradition exclusion, auth, read-only) +
  `test_api_agents.py` (token mint regression) + the auth sweep.
- Daemon: `agent-daemon/tests/test_persistence.py` (window math,
  round trips, restart survival — PG tests need
  `THEOURGIA_AGENT_TEST_DATABASE_URL`, see `docker-compose.test.yml`),
  `test_definitions.py`, `test_api_costs.py`.
- Frontend: `AgentCostDashboardRoute.test.tsx` + the endpoints tests.

## Honestly not built yet (v1.1 queue)

- **Waker `--continue` resume window.** Every wake is a fresh
  `claude --print` process; the ~20× input-token saving from the
  resume window is designed (plan §2) but not implemented. Cost caps
  fully cover the fresh-wake path.
- Write capabilities (`write.notes`, `write.tags`,
  `write.entry_drafts`) and their per-tool consent UI.
- Divination reads beyond the four casting systems; `read.analytics`
  against saved queries.
- MCP token housekeeping (expired rows are inert but not swept) and
  revocation on install delete.
- A startup sweep marking orphaned RUNNING rows errored (today they
  settle on the first DELETE).
