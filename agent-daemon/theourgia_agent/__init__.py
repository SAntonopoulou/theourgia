"""Theourgia AI agent daemon — opt-in, optional, agent-free deployable.

Phase 16. Separate process from the main FastAPI app. Talks to the
vault over a localhost HTTP port (SSE for MCP, REST for control).
Per-vault scoping; closed-tradition + sealed content are unreachable
at the architecture level — the daemon never holds the keys to
decrypt sealed content even if the magician wanted it to.

Decisions locked with the user 2026-06-28:

  · Process supervision: systemd-user
  · MCP transport: SSE over HTTP
  · BYO keys: Mode B (passphrase-encrypted at rest, decrypted in
    memory once per session)
  · Cost-cap timing: at-wake budget reservation
  · Queue backend (for federation outbound): Celery + Valkey
"""

from theourgia_agent.__about__ import __version__

__all__ = ["__version__"]
