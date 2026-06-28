# Theourgia AI agent daemon

The optional Phase 16 companion process. Per the master plan + locked decisions with the operator 2026-06-28:

- **OFF by default.** A Theourgia deployment without this daemon is fully functional. The vault app does not require it.
- **Process supervision**: `systemd --user` (unit file at `systemd/theourgia-agent-daemon.service`).
- **MCP transport**: SSE over HTTP. The daemon listens on localhost (default `127.0.0.1:8002`) and dials the vault's MCP endpoint over a localhost port.
- **BYO keys**: Mode B — passphrase-encrypted at rest, decrypted in memory once per session. The daemon NEVER persists the plaintext.
- **Cost-cap timing**: at-wake budget reservation. The daemon estimates the run's max-spend, holds it back from the cap, and refunds the unused on completion. Default multiplier 1.4× the average of the last 10 runs.
- **Memory directories**: `/srv/theourgia/agents/<vault>/<agent-id>/` — human-editable markdown files (rule 59).

The H10 Cluster C surfaces (12 surfaces · `frontend/shared/src/Agent*`) all consume contracts this daemon implements. Until the daemon is built end-to-end, the surfaces operate against fixtures.

## Locked v1 honesty rules (50-60)

- Rule 50 — agents off by default. Empty install requires explicit capability grant + explicit BYO key.
- Rule 51 — agent never speaks first. No `notif.send` capability for agents.
- Rule 52 — closed-tradition content invisible (MCP query filters it out).
- Rule 53 — sealed content unreachable (architecturally — the daemon never holds the keys).
- Rule 54 — surface, never interpret. System prompts enforce.
- Rule 55 — activity summaries server-generated from MCP call patterns; never the model's own self-summary.
- Rule 56 — hard cost caps. At cap, the agent refuses to wake.
- Rule 57 — BYO keys always. Mode B passphrase encryption. No service-side key ever.
- Rule 58 — token usage broken down per-agent + per-session + fresh-vs-resume.
- Rule 59 — memory directory is human-editable; the on-disk path is exposed verbatim.
- Rule 60 — agent-free first-class forever.

## Status

Scaffold landed. Models + crypto + cost-cap + config + systemd unit live. Next batches: SSE MCP server, claude-subprocess waker, alembic migration 0001, end-to-end tests.
