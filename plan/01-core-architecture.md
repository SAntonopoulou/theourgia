# Phase 01 — Core Architecture

> The structural bones of the system: the database, the authentication and authorization model, the encryption layer, the plugin substrate, the federation primitives, and the API contract. Nothing user-facing yet; everything later depends on getting this right.

## Goal

Build a coherent, secure, extensible backend foundation. After this phase, every subsequent feature has a place to live, a way to be persisted, a way to be authenticated, a way to be encrypted (when required), and a way to be extended.

## Dependencies

- Phase 00 (Foundations)

## Deliverables

### 1. Database core schema
- Postgres 16+ with extensions: `pgcrypto`, `pgvector`, `pg_trgm`, `unaccent`, `citext`
- Multi-vault tenancy via `vault_id` columns + row-level security policies
- Migrations baseline in Alembic
- Core tables (see ARCHITECTURE.md §4 for the full set; this phase covers identity, vaults, hubs, audit, plugin install scaffolding)
- Soft delete via `deleted_at` where retention matters; hard delete for ephemeral data
- All timestamp columns are `timestamptz`, stored in UTC
- All primary keys are UUIDv7 (sortable + globally unique)
- Database role separation: app role (DML), migration role (DDL), readonly role (analytics)

### 2. Authentication
- Local password auth with Argon2id (parameters tuned for ≥250ms on reference hardware)
- TOTP 2FA with QR provisioning, backup codes, recovery flow
- WebAuthn / passkey support (`webauthn` library)
- Session tokens: opaque random, 256-bit entropy, stored hashed in DB
- Refresh / rotation policy
- Account lockout with exponential backoff after failed attempts
- Email confirmation for new accounts (where email is configured)
- Password reset flow with single-use, short-lived tokens
- "Sign in from a new device" notification

### 3. Authorization
- Role model: `vault_owner`, `vault_collaborator`, `vault_viewer`, `hub_admin`, `hub_officer`, `hub_member`, `private_viewer`
- Per-resource visibility model: `personal` / `viewer` / `network:{hub_id}` / `public` / `sealed`
- PostgreSQL Row-Level Security policies enforce visibility at the database layer (defense in depth)
- Authorization decorator at API layer: `@requires(scope="entry.read", visibility="own_or_higher")`
- Audit log: every read of `sealed` content, every write across visibility tiers, every auth event

### 4. Encryption layer
- **Mode A (server-side at rest):** AES-256-GCM with per-vault data keys, wrapped by a server master key (in `SECRET_KEY` env or KMS)
- **Mode B (zero-knowledge):** content encrypted client-side with XChaCha20-Poly1305 via libsodium. Key derived from user passphrase via Argon2id; passphrase never leaves the browser. Server stores ciphertext + key derivation parameters only.
- Per-content-item flag chooses mode at write time
- Key rotation tooling for Mode A
- Recovery story for Mode B: backup of derived key encrypted under a recovery passphrase (user-chosen); explicit warnings at setup that lost passphrase = lost data
- Encrypted-search support deferred to Phase 04 (journal); design hooks present here

### 5. Plugin substrate
- Plugin manifest schema (`plugin.toml` or similar):
  - name, version, author, license, description
  - declared extension points
  - declared capabilities (read entries, write entries, network, filesystem, etc.)
  - declared DB migrations (in plugin's own schema)
  - frontend bundle locations
- Plugin loader (backend): discovers, validates manifest, runs migrations in sandboxed schema, registers extension hooks
- Plugin loader (frontend): dynamic import of ES modules with restricted globals
- Capability sandbox: a `PluginContext` object exposes only capability-scoped APIs; raw DB / filesystem / network blocked
- Plugin install / uninstall flow (admin only)
- Plugin signature verification (deferred to Phase 14 but signature hook in place)

### 6. Federation primitives
- Per-instance Ed25519 keypair (generated at first start; stored encrypted)
- HTTP Signatures middleware for outbound and inbound federation requests
- Federation actor identity: `did:theourgia:{host}:{slug}` for vaults and hubs
- Capability token format (JWT-like, but Ed25519-signed and capability-scoped)
- Stub federation API endpoints: `/.well-known/theourgia/actor`, `/.well-known/theourgia/inbox`, outbox
- Full federation behavior deferred to Phase 12; primitives present here

### 7. API contract
- FastAPI app with versioned routes (`/api/v1`)
- OpenAPI schema published; generated client types for the frontend (orval or similar)
- Consistent error format (RFC 7807 `application/problem+json`)
- Rate limiting middleware (Redis-backed, per-IP and per-account)
- CORS policy (locked down by default; configurable for federation)
- Request ID propagation (correlation IDs for logs)
- Idempotency keys on mutating endpoints
- WebSocket scaffolding for realtime subscriptions

### 8. Observability
- Structured logging (JSON, with correlation IDs)
- Prometheus metrics endpoint (`/metrics`, internal network only)
- Health endpoints: `/healthz` (liveness), `/readyz` (readiness with DB + Redis check)
- Sentry integration scaffolding (opt-in via env var, off by default)
- **Strict zero-telemetry posture verified by automated test:** no outbound network calls except those triggered by explicit user actions (federation, AP, Stripe, plugin manifests, email delivery). CI test that diffs egress destinations against an allowlist. Documented as a marketed feature.

### 9. Backup & restore tooling (must ship from day one)
- Restic-based backup engine, scheduled via Celery beat
- **Default backend: Cloudflare R2** (S3-compatible) — configured via env vars
- Alternative backends: Hetzner Object Storage, Backblaze B2, MinIO, any S3-compatible target, local filesystem
- Encrypted backups: operator-controlled passphrase, never stored on the server
- Configurable schedule (default: daily full + 6-hour incrementals; weekly retention; configurable)
- One-command restore tested in CI: `just restore --from <snapshot-id>` recreates a working instance from a fresh database
- Backup health surface in admin dashboard (last success, last failure, snapshot count, total size, restore-test status)
- DR runbook in `docs/admin/disaster-recovery.md`

### 10. Network exposure invariants (security-critical)
- **Reference docker-compose:** Redis and PostgreSQL bind to internal Docker network only — never to the host's external interface
- CI test that scans reference compose files for inadvertent external port mappings of Redis / Postgres / Celery workers / metrics endpoint
- Caddy is the only externally-facing service in the reference deployment

## Design notes

- The encryption model is the single highest-stakes architectural decision in the project. Treat it accordingly: third-party crypto review before this phase closes.
- Row-level security policies are not optional. Application-layer authorization can be bypassed by a logic bug; RLS cannot.
- The plugin sandbox must be conservative on capabilities. We can always loosen it; we cannot tighten it without breaking existing plugins.
- Federation primitives are scaffolded here but not wired into product features yet. Resist the urge to implement federation early.

## Risks

- **Risk:** Zero-knowledge mode complexity leaks into every feature. **Mitigation:** Define a clean abstraction now — every persistence call passes through an `EncryptedField` adapter; downstream phases never deal with raw ciphertext.
- **Risk:** RLS policies become unmaintainable as the schema grows. **Mitigation:** Adopt a consistent policy template; codegen policies from a declarative spec where possible.
- **Risk:** Plugin sandbox is too loose. **Mitigation:** Treat the capability list as a security-critical surface; review every capability addition.

## Definition of Done

- [ ] Database migrations land cleanly on a fresh database and a populated one
- [ ] All core tables documented in `docs/developer/data-model.md`
- [ ] Encryption: round-trip tests for both modes, with property-based fuzzing
- [ ] Zero-knowledge mode: passphrase change, key rotation, recovery flow all exercised end-to-end
- [ ] RLS policies verified by tests that attempt unauthorized access at the DB layer
- [ ] Auth: 2FA enroll + backup codes + WebAuthn all tested
- [ ] Plugin: a hello-world plugin can be installed and its extension hook called
- [ ] Federation: HTTP signatures verified with a self-loopback test
- [ ] OpenAPI schema generated; client types built without warnings
- [ ] Third-party crypto/security review report filed in `docs/adr/`
- [ ] Load testing baseline established
