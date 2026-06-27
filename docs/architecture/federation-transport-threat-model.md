# Federation Transport Threat Model

**Status:** Draft (build-side authored 2026-06-27, awaiting external review before `FEDERATION_TRANSPORT_ENABLED=true` ships)
**Scope:** Phase 12.5 (native Theourgia federation transport) + Phase 13 (ActivityPub interop) — cross-instance HTTP traffic, message authenticity, replay defence, capability delegation.

## Goal

Document the cryptographic + protocol assumptions cross-instance federation makes, the attack surface those assumptions present, and the mitigations in place. This document is a precondition to flipping the `FEDERATION_TRANSPORT_ENABLED` env gate to `true` on any production instance.

## Architecture overview

Theourgia exposes two parallel federation transports:

1. **Native Theourgia federation** — instance-to-instance, ActivityPub-incompatible, designed for the project's own protocol (Push / Pull / Mirror / Invite / RitualSchedule). Uses RFC 9421 HTTP Signatures with Ed25519. Actors are identified by Decentralized Identifiers (DIDs) of the form `did:theourgia:<host>[:<vault-slug>]`. Capability delegation uses Ed25519-signed JWTs.

2. **ActivityPub** — Fediverse interop. Same Ed25519 keys, but uses the older Cavage-draft HTTP Signature format for inbound compatibility (Mastodon et al. still emit Cavage). Outbound delivery emits RFC 9421 + Cavage simultaneously so peers can verify either way. Actors discoverable via `.well-known/webfinger`.

The cryptographic substrate (`theourgia/core/federation/`) is shared between the two — the same keypair signs both.

## Cryptographic choices

- **Ed25519** for signing. Faster + smaller than RSA-2048; the modern choice; widely supported by every Fediverse implementation.
- **RFC 9421** for the native protocol's HTTP signatures. The newer standard. Includes `(@method)`, `(@target-uri)`, `host`, `date`, `digest`, `created`, `nonce` parameters.
- **Cavage HTTP Signatures (draft-12)** for ActivityPub interop ONLY. We emit both; we accept either on inbound.
- **JWT EdDSA** for capability tokens. Strict claim validation: `iss`, `sub`, `aud`, `cap`, `iat`, `nbf`, `exp`, `jti`. Audience must match the receiving instance; expiry must be in the future; `jti` is recorded in the replay store.
- **SHA-256** for content digests (the `digest` header).

## Threat model

### T1 — Message tampering in transit

**Attack:** A man-in-the-middle modifies an outbound federation message (e.g., changes the recipient vault, alters the message body).

**Mitigation:** Every federation request is signed. The signature covers the request method, target URI, host, date, content digest, and the body bytes via the digest. Any modification invalidates the signature. The verifier rejects.

**Residual risk:** None for tampering. The signature is a hard barrier.

### T2 — Replay attacks

**Attack:** An attacker captures a signed message and replays it (e.g., re-delivers a Mirror request to spam the recipient).

**Mitigation:** RFC 9421 messages carry a `nonce` parameter and a `created` timestamp. The verifier records `(keyid, created, nonce)` in the `federation_nonce` table with a 5-minute expiry. Duplicate inserts violate the unique constraint and raise `ReplayDetectedError`. Messages older than 5 minutes are rejected outright (clock skew tolerance built in).

Capability tokens carry a `jti` claim recorded in the same store with the token's `exp` as expiry.

**Residual risk:** Clock skew greater than 5 minutes across instances would surface as transient failures. Operators should run NTP. The replay window is tunable via `THEOURGIA_FEDERATION_REPLAY_WINDOW_SECONDS`.

### T3 — Key compromise

**Attack:** An attacker steals an instance's federation private key and impersonates that instance.

**Mitigation:**

- Keys live at `/var/lib/theourgia/federation.key` with 0600 file permissions.
- Key rotation is supported via the H10 Cluster B5 (KeyRotation) surface — vault-side keys; instance-side rotation is an operator action via the admin CLI.
- Peers fetch the current public key from `.well-known/theourgia/actor` (native) or the actor object (ActivityPub); rotation propagates within the cache TTL (1 hour default).

**Residual risk:** Window of compromise between theft and rotation. Operators should monitor for unexpected outbound signed traffic in their audit logs and rotate immediately if suspicious. The `.well-known/theourgia/actor` endpoint emits the key with a `Cache-Control: public, max-age=3600` — peers may still verify with a stale key for up to an hour. We accept this tradeoff to avoid hammering origin servers; a shorter TTL would be a per-deployment choice.

### T4 — Actor impersonation

**Attack:** An attacker creates an account on their own instance claiming to be `did:theourgia:trusted-instance.example:famous-magician` and tries to federate as that identity.

**Mitigation:** DIDs are bound to the issuing instance's host segment. `did:theourgia:trusted-instance.example:famous-magician` signed by a key NOT held by `trusted-instance.example` is rejected at the signature-verify step (the verifier fetches the public key from `trusted-instance.example`'s `.well-known/theourgia/actor`, not from the request's claimed issuer).

**Residual risk:** If `trusted-instance.example` is malicious (or compromised), it can claim arbitrary user identities under its host. This is a fundamental property of any host-rooted identity system (Mastodon has the same property). Mitigated socially by the trust ledger model — peers choose which instances to federate with.

### T5 — Denial of service via signature verification cost

**Attack:** An attacker floods the inbox with bogus signed requests, each requiring an Ed25519 verify operation.

**Mitigation:**

- Ed25519 verify is fast (~30µs on commodity hardware) — far cheaper than RSA.
- Rate-limit middleware at the FastAPI layer caps inbound requests per peer.
- Inbox endpoint deferred to a queue worker (Phase 13 follow-on); the synchronous handler returns 202 after a cheap pre-check.

**Residual risk:** Determined DoS still possible. Operators should put Cloudflare or equivalent in front of `theourgia.com` production deployments.

### T6 — Capability token theft

**Attack:** A capability token is leaked (e.g., logged to a file readable by the attacker, captured from a misconfigured proxy).

**Mitigation:**

- Tokens are short-lived — typical lifetime is 5 minutes; max is 1 hour (enforced in the issuer).
- Tokens are scoped — `cap` claim names the specific capabilities granted; an attacker can only exercise those capabilities.
- Tokens are audience-bound — `aud` claim names the recipient instance; another instance attempting to use the token gets rejected.
- `jti` replay detection means the same token can only be used once per recipient.

**Residual risk:** Within the token's lifetime, an attacker who steals a token can perform the granted action once at the named audience. This is the same property OAuth bearer tokens have; the short TTL is the primary defence. Tokens are NEVER logged in plaintext (logging middleware redacts `Authorization` and `X-Capability-Token` headers).

### T7 — Closed-tradition content leakage via federation

**Attack:** A magician federates an entry tagged closed-tradition; another instance receives it; that instance's UI surfaces it freely.

**Mitigation:** Closed-tradition entries are **never** included in outbound federation messages. The publisher's federation worker filters them out at message-construction time. This is enforced by property tests (Phase 16 §12) — the generator produces arbitrary mixed-tag entries, and the worker output is asserted to contain zero closed-tradition tags.

**Residual risk:** Once federated, content sovereignty belongs to the recipient instance. We cannot enforce the recipient's UI behavior. Mitigated by trust ledger — magicians choose which instances to federate with, and the protocol propagates the closed-tradition tag so recipient instances CAN honor it.

### T8 — Sealed content leakage via federation

**Attack:** A magician's vault is compromised; the attacker tries to use federation to exfiltrate sealed content.

**Mitigation:** Sealed content is stored as ciphertext. The federation worker can ONLY emit ciphertext. The decryption key never leaves the magician's device. The recipient instance receives ciphertext + a key-hint, with no path to plaintext.

**Residual risk:** None for the sealed-content invariant. The architecture makes plaintext unreachable to the federation layer.

### T9 — ActivityPub format-confusion attack

**Attack:** A federated note arrives with content claiming to be one type (Note) but structured as another (Article with embedded HTML).

**Mitigation:** Inbound ActivityPub messages are parsed against a strict Pydantic schema (per-type). Format confusion fails schema validation; the message is rejected.

**Residual risk:** Schema bugs are inevitable. The mitigation depends on the build side keeping the schema tight + the property tests broad. External security review prior to enablement covers this surface.

### T10 — Outbound delivery failures masking attacks

**Attack:** An attacker compromises the network path to a recipient instance; outbound messages fail; the sender keeps retrying with fresh signatures, exposing more potential side-channels.

**Mitigation:**

- Retry policy is exponential backoff with a 24-hour deadline.
- After deadline, the message is dead-lettered (recorded but not retried).
- Federation peers that consistently fail delivery surface in the audit log; operators can manually intervene.

**Residual risk:** Limited. The audit log makes patterns visible.

## Pre-enablement checklist

Before `FEDERATION_TRANSPORT_ENABLED=true` ships on any production instance:

- [ ] External security review of `theourgia/core/federation/` (sender + verifier + capability tokens + replay store).
- [ ] External security review of the inbox handler (Phase 13 follow-on).
- [ ] Second test instance provisioned and federation verified end-to-end (push, pull, mirror, signed envelopes accepted on both sides).
- [ ] Load test of inbox under sustained signed traffic (target: 100 req/sec sustained without queue backup).
- [ ] Operator-facing runbook for key rotation (instance-side) tested.
- [ ] Operator-facing runbook for revoking a federated peer tested.
- [ ] Audit log retention verified — federation events kept for at least 90 days by default; operators may extend.
- [ ] WebFinger rate-limit verified — discovery floods don't bring the instance down.

## What's deliberately out of scope

- **Onion routing / Tor integration.** Phase 12+ optionally exposes a Tor hidden service for the entire instance; the federation transport runs on whatever transport the operator chose. We don't try to layer mixnet semantics on top.
- **Forward secrecy at the message level.** ActivityPub messages are not forward-secret; nor are Theourgia native messages. This is a property of the underlying signed-envelope model. Message bodies that need forward secrecy use sealed content (which is end-to-end encrypted client-side; federation only carries ciphertext).
- **Anonymous federation.** All federation requires an identity. Anonymous publication uses the public reader (Phase 10), not federation.

## Open questions for external reviewer

1. Is the 5-minute replay window appropriate? Mastodon uses 12 hours; we chose 5 minutes for tighter defence but operators with significant clock skew may need to widen.
2. Should we publish a CSP header on the WebFinger response to prevent embedding? Currently we don't — WebFinger is read-only JSON and embedding is a non-issue.
3. Is the capability token TTL ceiling (1 hour) appropriate for our delegation use cases?

---

*Build-side authored by Soror Ευ. Α., 2026-06-27. Draft pending external review.*
