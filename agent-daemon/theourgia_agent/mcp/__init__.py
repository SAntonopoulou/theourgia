"""Agent daemon's MCP layer.

The daemon plays both roles:

  · MCP **server** — exposes tools (= capability functions) to the
    `claude` subprocess that wakes for a run. Transport: SSE over
    HTTP, served from this daemon process.

  · MCP **client** — dials the vault's MCP endpoint for the actual
    read operations. The daemon NEVER touches vault data directly;
    every read goes through the vault, gets filtered for sealed +
    closed-tradition content (defence-in-depth: vault also filters),
    and is returned to the agent.

The capability vocabulary + the rule-52/53 filters are the load-
bearing primitives. They land here first; the SSE transport and the
vault-client land in follow-on commits.
"""
