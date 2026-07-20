# Theourgia plugin registry

The author/reviewer/public side of [`plugins.theourgia.com`](https://plugins.theourgia.com).

Lives in this monorepo alongside `backend/` (the vault host) and `frontend/`. The two backends share crypto primitives (Ed25519 + RFC 9421 + DID format) but otherwise run as independent FastAPI apps with their own databases.

## Scope

- **Public**: browse plugins, view plugin detail, view author profile.
- **Author**: submit / withdraw plugin versions; file vulnerability advisories.
- **Maintainer (multi-maintainer from day 1)**: review queue, accept / request changes, tier promotion, advisory verification, maintainer-roster management.

Per H10 rules 41–44:

- Submissions are never auto-promoted (rule 41).
- License is SPDX-validated, blocking, against an explicit allowlist (rule 42).
- Severity is low/medium/high — no `critical` (rule 43).
- Maintainer review shows the diff; no approve-blind (rule 44).

## Release hosting (v1-032)

The registry hosts release archives itself — a vault fetches, verifies,
and installs without trusting a third-party file host.

- `POST /api/v1/author/plugins/{slug}/releases/{version}/artifact` —
  DID-authenticated raw-bytes upload (tar.gz/zip, capped at 10 MB,
  stored as DB bytea; the registry has no object-storage substrate and
  v1 archives are small source packages). The `X-Artifact-Signature`
  header carries the author's Ed25519 signature over the
  domain-separated payload
  `theourgia-plugin-artifact-v1\n<slug>\n<version>\n<sha256-hex>` —
  verified at upload against the author's registered key, stored, and
  republished on every download. Artifacts are immutable (409 on
  re-upload).
- `GET /api/v1/plugins/{slug}/releases` — accepted releases only.
- `GET /api/v1/plugins/{slug}/releases/{version}/download` — archive
  bytes plus `X-Artifact-Sha256`, `X-Artifact-Signature`,
  `X-Author-Did`, `X-Author-Public-Key` headers. Tombstoned plugins and
  withdrawn versions return **410** with the author's reason (rule 40 —
  existing installs keep working; new fetches see the notice).

## SSO trust model (v1-032)

`POST /api/v1/auth/sso-session` lets a magician who is signed in to a
**trusted vault host** become an authorized registry author without a
separate account:

1. The vault mints a short-lived assertion
   (`kind=registry-sso`, `issuer_host`, `subject_did`, `display_name`,
   `audience`, `expires_at`, optional `public_key_pem`) and signs its
   canonical JSON bytes (sorted keys, compact separators) with the
   vault's **federation** Ed25519 keypair — the key it already
   publishes at `/.well-known/theourgia/actor`.
2. The registry accepts the assertion only when the issuer is on
   `THEOURGIA_REGISTRY_TRUSTED_VAULT_HOSTS` (v1 default:
   `["theourgia.com"]` — plugins.theourgia.com trusts theourgia.com and
   nothing else), the `audience` names this registry's `instance_id`,
   the assertion has not expired, and the signature verifies against
   the public key fetched live from the issuer's well-known actor
   document. The trusted-host check runs **before** any outbound fetch
   so an untrusted issuer cannot make the registry dial arbitrary
   hosts.
3. On success the registry maps `subject_did` to an Author row
   (creating it on first sight) and returns an HMAC-signed session
   token (24 h TTL, `session_secret`-keyed, stateless).

Key-caching rule: an assertion may carry the author's registry signing
key (`public_key_pem`). It is cached **only when the Author row has no
key yet** — SSO can bootstrap a signing identity but can never rotate
one. Rotation stays a deliberate, maintainer-mediated operation, so a
compromised vault session cannot silently swap the key that signed
every published release.

What the trust model does NOT claim: the registry does not verify who
is behind the vault session — it delegates that entirely to the
trusted vault host. Adding a host to the trusted list is a statement
that its operator's authentication is trusted end-to-end.

## Running

```sh
cd registry
pip install -e .[test]
alembic upgrade head
uvicorn theourgia_registry.api.app:app --host 0.0.0.0 --port 8001
```

## Status

Scaffold landed at H10 Cluster A kickoff (models + alembic 0001 +
schema-locked endpoints + license allowlist). v1-032 added release
artifact hosting (alembic 0002), the download/verify contract, and the
SSO bridge to the vault host. Deployment of plugins.theourgia.com
itself is an infra task and has not happened yet.
