# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Theourgia, please report it responsibly.

**Do not** open a public GitHub issue for security vulnerabilities.

Instead, open a **private security advisory** via GitHub:

→ **https://github.com/SAntonopoulou/theourgia/security/advisories/new**

We aim to acknowledge security reports within 72 hours, with an initial assessment within 7 days.

## Supported Versions

Theourgia is currently pre-release; no version has shipped yet. Once a stable version is released, this section will document which versions receive security updates.

## Scope

Vulnerabilities in any part of Theourgia's published code are in scope:

- The Theourgia backend (Python / FastAPI)
- The Theourgia frontend (Astro / React admin / Tiptap editor)
- Reference plugins shipped in this repository
- Deployment configurations and documentation that affect security posture

Out of scope:

- Vulnerabilities in third-party hosting platforms (Cloudflare, Hetzner, etc.) — please report to those vendors directly
- Vulnerabilities in unmodified upstream dependencies — please report upstream
- Self-hosted misconfigurations not stemming from documentation errors

## Disclosure Policy

We follow coordinated disclosure:

1. You report the vulnerability privately via the link above
2. We confirm receipt and begin assessment within 72 hours
3. We work on a fix; timeline depends on severity and complexity
4. A patched release is published
5. Public disclosure follows shortly after, crediting the reporter unless they prefer anonymity

## Security Features (planned)

Theourgia's security architecture is documented in [ARCHITECTURE.md §5](ARCHITECTURE.md). Highlights of the planned posture:

- **User-choice encryption per content item**: server-side at rest OR zero-knowledge client-side
- **TOTP 2FA** + **WebAuthn / passkeys**
- **Row-level security** enforced at the database layer
- **Plugin sandbox** with capability-based permissions
- **Signed federation messages** (Ed25519, HTTP Signatures)
- **Zero telemetry by default**, verified by automated test in CI

None of these are implemented yet (pre-alpha) but each is specified in detail before code is written.
