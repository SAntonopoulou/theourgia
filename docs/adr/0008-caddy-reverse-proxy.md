# ADR-0008: Caddy as the reference reverse proxy

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** @SAntonopoulou
- **Tags:** #infrastructure, #networking, #tls

## Context and problem statement

Theourgia is self-hosted by design. Self-hosters need a reverse proxy at the front of their deployment to:

- Terminate TLS (Let's Encrypt or similar)
- Route by hostname (theourgia.com → frontend, docs.theourgia.com → docs)
- Serve as the single internet-facing process (everything else binds to localhost)
- Handle DNS-01 challenges (for cloudflared / proxied domains where HTTP-01 doesn't work)
- Support multi-tenant operation (multiple agents/projects sharing a single host)

We need to pick a reference reverse proxy that the project documents, tests against, and recommends. Self-hosters can use anything they like, but our docs and reference configs are for one tool.

## Decision drivers

- Automatic TLS (Let's Encrypt) handling, including DNS-01 for proxied domains
- Simple configuration syntax (self-hosters are not all networking experts)
- Good defaults (HTTP/2, HTTP/3, modern TLS, sensible security headers)
- Multi-tenant friendliness (per-site snippet files, validation-before-reload)
- Active maintenance + open source
- Container-friendly + bare-metal-friendly (some self-hosters won't use Docker)
- Cloudflare DNS plugin available (for DNS-01 with proxied domains, which our deployment uses)

## Considered options

1. **Caddy 2** — automatic TLS by default, simple Caddyfile syntax, modular plugins
2. **nginx** — battle-tested, fast, complex configuration
3. **Traefik** — Docker-native, dynamic configuration, opinionated
4. **HAProxy** — performance-focused, complex configuration, weaker TLS-automation story
5. **Apache HTTPD** — mature but feels dated for new projects

## Decision

**Caddy 2 as the reference reverse proxy.**

We document Traefik as a supported alternative (since some self-hosters strongly prefer it) but our Dockerfiles, compose files, and Caddyfiles are written for Caddy.

## Rationale

Caddy's defining feature is automatic TLS — out of the box, it manages Let's Encrypt certificates with zero configuration. For a project whose audience includes magicians who are not full-time SREs, this is the right default. The configuration syntax (Caddyfile) is also dramatically simpler than nginx's, which lowers the barrier for self-hosters writing their own configs.

Specific wins:

- **Caddyfile syntax** is human-readable and explicit. A tenant's snippet is typically 10–20 lines.
- **DNS-01 challenge support** via the official `caddy-dns/cloudflare` plugin is essential for our deployment: theourgia.com is Cloudflare-proxied, so HTTP-01 challenges can't reach the origin. DNS-01 works seamlessly.
- **Multi-tenant friendliness:** Caddy supports `import` of snippet directories, validates before reload, has no global state that one tenant can corrupt for another. This matches the agent-house pattern we already use (host shared Caddy + per-tenant snippets in `Caddyfile.d/*.caddy`).
- **Sensible security headers** can be set declaratively without extra modules.
- **HTTP/3 (QUIC) support** out of the box.
- **Caddy as a Go binary** is small, fast, single-file, easy to operate on bare metal as well as in containers.

**nginx (option 2)** is the obvious mature alternative but its Let's Encrypt story (via Certbot or acme.sh) is bolted-on and the configuration is famously complex for tenants doing their own setup.

**Traefik (option 3)** is excellent in Docker-heavy environments. We document it as an alternative because some self-hosters prefer its dynamic provider model. But its config is opinionated and (in our experience) somewhat surprising; Caddy is easier to read at a glance.

**HAProxy (option 4)** is the right call when raw L4/L7 performance and complex routing rules dominate. Overkill for our needs and weaker TLS-automation story.

**Apache (option 5)** — stable but feels dated for new projects. Less compelling on automatic TLS than Caddy.

## Consequences

### Positive
- Self-hosters need approximately zero TLS knowledge for the common case
- Multi-tenant pattern (host shared Caddy + per-tenant snippets) is well-supported
- The reference [Caddyfile.example](../../Caddyfile.example) is short and copyable
- Docker / non-Docker deploys are both first-class
- DNS-01 path works cleanly with Cloudflare-proxied domains

### Negative / trade-offs
- Caddy with the Cloudflare DNS plugin requires an `xcaddy` build (or downloading a prebuilt binary with the plugin enabled) — not just `apt install caddy`. Documented; the host-shared-Caddy setup on agent-house uses this pattern.
- Some self-hosters strongly prefer nginx and will write their own configs. Acceptable — we document the contract (which host:port the frontend container binds to, which paths are API vs. static) so any reverse proxy can sit in front.
- Caddy's reload-on-config-change is not always graceful for long-lived connections. Mitigated by the `caddy reload` ExecReload in our systemd unit + `--force` flag.

### Neutral
- The `caddy-reload` wrapper script (introduced in the agent-house multi-tenant deployment) validates configuration before reloading. Cohort-shared improvement that benefits all tenants.

## Implementation notes

Reference configurations:
- [Caddyfile.example](../../Caddyfile.example) — single-tenant self-hoster reference
- [frontend/Caddyfile.internal](../../frontend/Caddyfile.internal) — inside-the-container routing config (static + reverse-proxy to backend)
- Multi-tenant agent-house setup: see `/srv/agents/AGENT_HOUSE_DEPLOY_GUIDE.md` on the deployment server

Required Caddy modules:
- `caddy` core
- `caddy-dns/cloudflare` (for DNS-01 with Cloudflare-proxied domains)

Build pattern:
- For production: `xcaddy build --with github.com/caddy-dns/cloudflare` or download a prebuilt binary from caddyserver.com with the plugin selected
- For development: the `caddy:2-alpine` Docker image is sufficient since dev environments don't need real TLS

## References

- [Caddy documentation](https://caddyserver.com/docs/)
- [caddy-dns/cloudflare plugin](https://github.com/caddy-dns/cloudflare)
- [xcaddy](https://github.com/caddyserver/xcaddy)
- [Caddyfile.example](../../Caddyfile.example)
- [frontend/Caddyfile.internal](../../frontend/Caddyfile.internal)
- [ARCHITECTURE.md §9 Deployment Topology](../../ARCHITECTURE.md)
