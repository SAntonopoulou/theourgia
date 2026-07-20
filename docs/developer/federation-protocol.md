# Theourgia Federation Protocol Specification

**Status:** Draft v0.1 · authored 2026-06-26 ahead of the Phase 12 backend execution.
**Audience:** developers implementing an alternative client OR auditing the reference implementation.
**License:** the spec is dedicated to the public domain (CC0); the reference implementation is AGPLv3.

This document is the authoritative wire-format reference for the Theourgia native federation protocol. It is implementable WITHOUT reading the Python reference code in `theourgia/core/federation/`. Where reference code and this document disagree, the document is the spec — the code is wrong and must be fixed.

> **Plan reference:** `plan/12-federation.md` § 1 ("Federation protocol specification") calls for this document as a versioned spec.
>
> **Companion documents:**
>
> - `plan/12-federation.md` — product scope, hub model, group ritual coordinator.
> - `docs/developer/activitypub-extensions.md` — the separate ActivityPub adapter spec (Phase 13). The native protocol described HERE is independent of ActivityPub; the AP adapter translates at the boundary.

---

## 0. Conventions

- All wire serialization is JSON (RFC 8259). Field names are `snake_case`. Strings are UTF-8.
- All timestamps are RFC 3339 in UTC with `Z` suffix (e.g., `2026-06-26T19:00:00Z`).
- All UUIDs are RFC 4122 v4, lowercase, with dashes.
- All cryptographic byte sequences in JSON are encoded with **unpadded base64url** (RFC 4648 § 5).
- "MUST", "SHOULD", "MAY" follow RFC 2119.
- Examples are non-normative unless explicitly marked **normative**.

This spec versions itself separately from the Theourgia application version. The current spec version is **v0.1**.

---

## 1. Identity model

### 1.1. Decentralised Identifiers (DIDs)

Every actor — vault, hub, group, or service — is identified by a Theourgia DID with the following shape:

```
did:theourgia:{host}:{slug}
```

Where:

- `{host}` is the FQDN of the instance that issued the identity. RFC 1035 hostname, lowercase, no trailing dot. Punycode for IDN.
- `{slug}` is a stable identifier unique within the issuing instance. `[a-z0-9][a-z0-9_-]{0,62}`. Slugs are immutable after first issuance.

**Examples (normative for parser conformance):**

```
did:theourgia:hekate.example.com:sophia
did:theourgia:lodge.example.org:north-london-temple
did:theourgia:demo.theourgia.app:test-account-1
```

The DID is the canonical identity reference in every signed envelope. Display-name strings (handles, display names, avatars) are properties of the actor, NOT identifiers; they MAY change. The DID never does.

### 1.2. Key pair model

Each actor has at least one Ed25519 (RFC 8032) key pair. Public keys are published in the actor's identity document (§ 1.3); the private key never leaves the issuing instance.

Key identifiers within an instance are short strings (`[a-z0-9_-]{1,32}`), e.g., `k-2026-06` or `primary`. The full key reference in a signed envelope is `{did}#{key_id}`:

```
did:theourgia:hekate.example.com:sophia#primary
```

Rotation: an actor MAY publish multiple active public keys. An accepting peer MUST accept any active key for verification; an actor MUST sign with exactly one active key per envelope. Retired keys are marked `revoked: true` in the identity document with a `revoked_at` timestamp — peers SHOULD reject signatures where the signing key was revoked before the envelope's `sent_at` timestamp.

### 1.3. Identity document

Each actor publishes a JSON identity document at:

```
https://{host}/.well-known/theourgia/identity/{slug}
```

The response MUST be `application/json; charset=utf-8`. CORS is unrestricted (`Access-Control-Allow-Origin: *`). HEAD requests MUST return the same status as GET.

**Normative example:**

```json
{
  "spec_version": "0.1",
  "did": "did:theourgia:hekate.example.com:sophia",
  "actor_type": "vault",
  "display_name": "Sophia",
  "avatar_url": "https://hekate.example.com/avatar/sophia.png",
  "keys": [
    {
      "key_id": "primary",
      "algorithm": "ed25519",
      "public_key_b64": "MCowBQYDK2VwAyEA...",
      "created_at": "2026-06-01T00:00:00Z",
      "revoked": false
    }
  ],
  "endpoints": {
    "inbox":      "https://hekate.example.com/api/v1/federation/inbox",
    "discovery":  "https://hekate.example.com/api/v1/federation/discovery",
    "heartbeat":  "https://hekate.example.com/api/v1/federation/heartbeat"
  },
  "instance_metadata": {
    "software_name": "theourgia",
    "software_version": "1.0",
    "protocol_versions_supported": ["0.1"]
  }
}
```

Fields:

- `actor_type` — one of `vault` / `hub` / `group` / `service`.
- `display_name` — UTF-8 string, max 240 characters. Mutable.
- `avatar_url` — optional HTTPS URL.
- `keys` — non-empty list. At least one entry MUST have `revoked: false`.
- `public_key_b64` — the Ed25519 public key in SubjectPublicKeyInfo DER (RFC 8410) encoded base64url unpadded. Per-Theourgia-instance keys are 32 raw bytes; the SubjectPublicKeyInfo wrapper adds a 12-byte prefix so peers can verify the algorithm OID before importing.
- `endpoints` — see § 4. All endpoints MUST be `https://` URLs on the issuing host.

Peers MUST cache identity documents with respect to the response's `Cache-Control` headers. When no `Cache-Control` is set, peers SHOULD assume a 24-hour TTL.

---

## 2. Transport

### 2.1. HTTPS only

All federation messages travel over HTTPS. TLS 1.3 minimum (TLS 1.2 MAY be supported for legacy peers but raises a deprecation warning on receipt; v0.2 of this spec removes TLS 1.2).

Self-signed certificates are rejected by default. Peers MAY configure an allow-list of self-signed peer fingerprints for development. Production deployments MUST use a CA-issued certificate.

### 2.2. HTTP Signatures (RFC 9421)

Every federation request MUST be signed using HTTP Message Signatures (RFC 9421) with the `ed25519` algorithm. The signature input MUST include the following components:

- `@method`
- `@target-uri`
- `host`
- `date`
- `digest` (the request body's SHA-256 digest, see § 2.3)
- `x-theourgia-key` (the signer's DID#key_id reference; see § 1.2)

**Normative example signing string:**

```
"@method": POST
"@target-uri": https://hekate.example.com/api/v1/federation/inbox
"host": hekate.example.com
"date": Fri, 26 Jun 2026 19:00:00 GMT
"digest": sha-256=:aBcDeFgHiJkLmNoPqRsT...:
"x-theourgia-key": did:theourgia:lodge.example.org:north-london-temple#primary
"@signature-params": ("@method" "@target-uri" "host" "date" "digest" "x-theourgia-key");created=1735232400;keyid="did:theourgia:lodge.example.org:north-london-temple#primary";alg="ed25519"
```

The signature MUST be placed in the `Signature` header. The corresponding `Signature-Input` header carries the parameters.

Peers verifying a signature MUST:

1. Resolve the `x-theourgia-key` value to the public key via the identity document (§ 1.3). Cache lookups per § 1.3.
2. Verify the body digest matches the actual body.
3. Verify the signature.
4. Verify the `date` header is within ±300 seconds of the receiver's wall clock (§ 5.2).

Verification failure on ANY of these steps MUST return HTTP 401 with an error envelope (§ 7).

### 2.3. Body digest

The `Digest` header (RFC 9530) carries the SHA-256 of the request body:

```
Digest: sha-256=:base64url(sha256(body)):
```

For requests with no body, the digest is computed over the empty byte string and MUST still be present.

---

## 3. Envelope format

Every federation message is wrapped in a uniform envelope:

```json
{
  "spec_version": "0.1",
  "message_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "message_type": "Push",
  "sender_did": "did:theourgia:lodge.example.org:north-london-temple",
  "recipient_did": "did:theourgia:hekate.example.com:sophia",
  "sent_at": "2026-06-26T19:00:00Z",
  "expires_at": "2026-06-26T19:05:00Z",
  "in_reply_to": null,
  "body": { ... }
}
```

Required fields:

- `spec_version` — string. Negotiated on first contact (§ 8). Both sides MUST verify mutual support.
- `message_id` — UUID v4. UNIQUE per sender; receivers MUST dedupe (§ 5.1).
- `message_type` — see § 4.
- `sender_did` / `recipient_did` — full DIDs.
- `sent_at` — RFC 3339 UTC timestamp. The signature's `date` header MUST match within ±5 seconds.
- `expires_at` — UTC timestamp. Receivers MUST reject envelopes where `now() > expires_at`. Default 5 minutes from `sent_at` for synchronous calls; up to 1 hour for `Mirror` / `RitualSchedule`.
- `in_reply_to` — optional `message_id` of the envelope this responds to. Used for capability acknowledgments + ritual updates.
- `body` — message-type-specific payload (§ 4).

Envelopes never carry sensitive plaintext outside `body`. The envelope itself is integrity-checked via the HTTP Signature (§ 2.2).

---

## 4. Message types

The protocol defines exactly **ten** message types in v0.1. Implementations MUST reject envelopes with an unknown `message_type` and SHOULD log the rejection for instance-admin review.

### 4.1. `Push`

A vault pushes content to a hub the vault is a member of.

```json
{
  "message_type": "Push",
  "body": {
    "content_kind": "entry",
    "content_id": "...",
    "visibility_scope": "network:f47ac10b-...",
    "payload": { ... }
  }
}
```

`content_kind` ∈ `{entry, divination, publication, ritual_log, body_practice}`. The hub indexes the pushed content under the named visibility scope. Hub admins curate per § 9 of the Phase 12 plan.

**Honesty rule:** sealed content NEVER federates. The sending vault MUST reject any Push attempt on a sealed entry at the local route, BEFORE the envelope is signed. The receiving hub MUST also reject if any body field is shaped like ciphertext (heuristic: presence of `vault_crypto_envelope` field).

### 4.2. `Pull`

A hub or peer requests content the sender is authorized to read.

```json
{
  "message_type": "Pull",
  "body": {
    "content_id": "...",
    "since": "2026-06-20T00:00:00Z"
  }
}
```

Response is a `Push`-shaped envelope with the content. Pull requests require a valid capability token (§ 6).

### 4.3. `Mirror`

A hub mirrors a piece of pushed content from one of its members to other members. Mirrors are subject to the original sender's revocation: the hub MUST honour `Revoke` (§ 4.6) within 5 minutes of receipt.

```json
{
  "message_type": "Mirror",
  "body": {
    "origin_message_id": "f47ac10b-...",
    "origin_sender_did": "did:theourgia:hekate.example.com:sophia",
    "content_kind": "entry",
    "payload": { ... }
  }
}
```

### 4.4. `Invite`

A hub admin invites an actor (vault) to join.

```json
{
  "message_type": "Invite",
  "body": {
    "hub_did": "did:theourgia:lodge.example.org:north-london-temple",
    "proposed_role": "member",
    "invitation_token": "...",
    "note": "Welcome — the Wednesday working group is open if you want it."
  }
}
```

`invitation_token` is a 32-byte url-safe-base64 random string. The invitee accepts via § 4.5.

### 4.5. `Accept`

Acceptance of an Invite, a capability grant, or a follow.

```json
{
  "message_type": "Accept",
  "in_reply_to": "f47ac10b-...",
  "body": {
    "accepted_kind": "invite",
    "invitation_token": "..."
  }
}
```

`accepted_kind` ∈ `{invite, capability, follow}`. The token in the body MUST match the token in the original envelope; non-matching tokens MUST be rejected (resistant to envelope-swap attacks).

### 4.6. `Revoke`

Reverses a prior `Push` / `Mirror` / capability grant / membership.

```json
{
  "message_type": "Revoke",
  "body": {
    "revokes_kind": "push",
    "origin_message_id": "f47ac10b-...",
    "reason": "Content updated; please pull the new version."
  }
}
```

`revokes_kind` ∈ `{push, mirror, capability, membership}`. Receivers MUST remove the targeted content within 5 minutes of receipt and emit a `RevokeAcknowledged` confirmation back to the sender.

**Honesty disclosure:** the plan locks the verbatim disclosure "content already mirrored may persist in caches" — Revoke is a best-effort signal, not a guarantee. The reference UI surfaces this.

### 4.7. `RitualSchedule`

A hub officer schedules a group ritual.

> **Wire key (v1-033):** the native inbox dispatches on the body's
> `type` field; `RitualSchedule` travels as `"type": "ritual.schedule"`.
> The receiving instance creates a local mirror ritual (no local
> organizer) for every roster DID that resolves to one of its vaults,
> idempotently per `ritual_id`.

```json
{
  "message_type": "RitualSchedule",
  "body": {
    "ritual_id": "...",
    "hub_did": "...",
    "title": "Hekate's Deipnon",
    "description": "Tiptap JSON",
    "scheduled_for_utc": "2026-06-30T19:00:00Z",
    "location_kind": "dispersed",
    "participants": [ { "did": "...", "role": "officiant" }, ... ],
    "required_correspondences": [ "..." ],
    "shared_script": { ... },
    "shared_sigil_ids": [],
    "shared_voce_ids": []
  }
}
```

`location_kind` ∈ `{physical, virtual, dispersed}`. `physical` carries a free-text address; `virtual` carries a URL; `dispersed` carries no further field.

The receiving instance MUST emit notifications to each participant per the participant's notification settings.

### 4.8. `RitualUpdate`

Fragment posts during a ritual + the post-mortem assembly.

```json
{
  "message_type": "RitualUpdate",
  "in_reply_to": "{RitualSchedule.message_id}",
  "body": {
    "ritual_id": "...",
    "update_kind": "fragment",
    "fragment_body": "I felt the temperature drop just before the third invocation."
  }
}
```

`update_kind` ∈ `{start, fragment, completion, postmortem_entry, egregore_registration}`.

> **Wire key (v1-033):** `RitualUpdate` travels as
> `"type": "ritual.update"`. `start` (added in v1-033) is sent by the
> origin when the organizer begins the working, so participant
> instances open their mirrors for fragment posting; `completion` and
> `egregore_registration` are likewise origin-only, while `fragment`
> and `postmortem_entry` also flow from participant instances back to
> the origin. `egregore_registration` registers the declared EGREGORE
> entity in every participating vault on the receiving instance.

**Frozen once final:** the H08 honesty rule 22 applies — once a ritual is in `COMPLETED` state, the script + voces + correspondences are FROZEN. A `RitualUpdate` envelope with `update_kind=fragment` on a completed ritual MUST be rejected.

### 4.9. `Comment`

A federated comment on a public entry / publication. Federated comments default to the receiving vault's moderation queue (§ 6.4).

```json
{
  "message_type": "Comment",
  "in_reply_to": null,
  "body": {
    "target_kind": "publication",
    "target_id": "...",
    "body": "Thank you for this — your treatment of the Greek text was illuminating."
  }
}
```

### 4.10. `Heartbeat`

A periodic "still alive" signal between peer instances. Sent at most once per 15 minutes per peer.

```json
{
  "message_type": "Heartbeat",
  "body": {
    "spec_versions_supported": ["0.1"],
    "actor_count_hint": 42,
    "last_inbound_message_at": "2026-06-26T18:55:00Z"
  }
}
```

`actor_count_hint` is approximate (within ±10%); used for federation directory listings. Instances that don't want to publish this number MAY omit the field.

---

## 5. Receiver requirements

### 5.1. Idempotency

Receivers MUST dedupe by `message_id`. A duplicate envelope is acknowledged with HTTP 200 + an empty body (the original effect persists). Replay attacks are mitigated by the combination of the `expires_at` window and the `date` header check (§ 2.2).

Dedupe windows: receivers MUST keep at least 24 hours of `message_id` history. Implementations using SQL persist (`UNIQUE (sender_did, message_id)`) are sufficient.

### 5.2. Clock skew

Receivers MUST verify the `date` header is within ±300 seconds of their wall clock. Skew beyond that is rejected with 401 and a clear error code (`clock_skew`) so the sender's logs can pinpoint the cause.

NTP is REQUIRED for production peers.

### 5.3. Body validation

Receivers MUST validate every body field per the message type's contract BEFORE writing to durable storage. Malformed envelopes are rejected with 400; partial writes are not acceptable.

### 5.4. Rate limits

Receivers MAY enforce per-sender rate limits. The recommended default is 60 envelopes per minute per `sender_did`. Excess returns 429 with a `retry_after_seconds` field in the error envelope.

---

## 6. Capability tokens

Most fine-grained operations (cross-vault Pull, hub-admin actions performed on another instance) require a capability token issued by the resource owner.

### 6.1. Token format

Capability tokens are JWT-like (RFC 7519) with the following constraints:

- `alg`: `EdDSA` (only).
- `typ`: `theourgia+capability`.
- Signed by the resource owner's Ed25519 key.
- Compact serialization only (no JWE wrapping).

**Normative claim set:**

```json
{
  "iss": "did:theourgia:hekate.example.com:sophia",
  "sub": "did:theourgia:lodge.example.org:north-london-temple",
  "iat": 1735232400,
  "exp": 1735236000,
  "jti": "...",
  "scope": "pull:entry:f47ac10b-...",
  "use_count": 1,
  "use_max": 5
}
```

- `iss` — the resource owner.
- `sub` — the actor authorized to use the token.
- `scope` — colon-delimited (`{action}:{kind}:{id}`). Actions: `pull` / `mirror` / `comment` / `subscribe`. No wildcard scopes — explicit per resource.
- `use_count` / `use_max` — single-use tokens carry `use_max=1`; multi-use tokens up to 100.

### 6.2. Token lifetime

Default 1 hour (`exp - iat = 3600`). Long-lived tokens (up to 30 days) MAY be issued for known long-running operations (e.g., a hub indexing a member's pushed entries) but MUST carry an explicit `purpose` claim in addition to `scope`.

### 6.3. Revocation

Each issuer maintains a public revocation list at:

```
https://{host}/.well-known/theourgia/revoked-capabilities/{slug}
```

The list is a JSON array of `jti` strings. Implementations MUST consult this list at acceptance time. Caching: 60-second TTL maximum.

### 6.4. Comment moderation queue

`Comment` envelopes do NOT require a capability token to be received — they're accepted into the receiving vault's moderation queue. Per H08 honesty rule 27, federated comments default to MANUAL approval for vaults; the comment is invisible to the public until the vault owner approves.

---

## 7. Error envelope

Errors are returned with the matching HTTP status code AND a JSON body in this shape:

```json
{
  "error": {
    "code": "clock_skew",
    "message": "envelope.sent_at is 412 seconds behind receiver clock",
    "spec_section": "5.2"
  }
}
```

Defined error codes (extensible by spec version):

| Code | HTTP | Section |
|---|---|---|
| `signature_invalid` | 401 | § 2.2 |
| `signature_missing` | 401 | § 2.2 |
| `key_revoked` | 401 | § 1.2 |
| `key_unknown` | 401 | § 1.3 |
| `clock_skew` | 401 | § 5.2 |
| `envelope_expired` | 401 | § 3 |
| `digest_mismatch` | 401 | § 2.3 |
| `unknown_message_type` | 400 | § 4 |
| `body_malformed` | 400 | § 5.3 |
| `duplicate_message_id` | 200 | § 5.1 |
| `capability_required` | 403 | § 6 |
| `capability_invalid` | 403 | § 6 |
| `capability_revoked` | 403 | § 6.3 |
| `rate_limited` | 429 | § 5.4 |
| `sealed_content_rejected` | 422 | § 4.1 |
| `ritual_frozen` | 409 | § 4.8 |
| `peer_blocked` | 403 | § 8.2 |
| `spec_version_unsupported` | 400 | § 8.1 |

---

## 8. Versioning

### 8.1. Negotiation

On first contact, the sender MUST send a `Heartbeat` envelope. The receiver responds with a `Heartbeat` of its own. Both sides exchange `spec_versions_supported` arrays. Subsequent envelopes use the highest mutually-supported version.

If no mutually-supported version exists, both sides log the failure and stop attempting. The receiver returns `spec_version_unsupported` on subsequent attempts.

### 8.2. Backward-compatibility policy

- **Patch-level changes** (e.g., 0.1.1 → 0.1.2) MUST NOT change wire format. They MAY add error codes.
- **Minor changes** (0.1 → 0.2) MAY add new message types or fields. Receivers running an older minor version MUST ignore unknown fields and reject unknown message types with `unknown_message_type` rather than crashing.
- **Major changes** (0.x → 1.x) MAY break compatibility. The negotiation step (§ 8.1) catches incompatible pairs.

The spec version published in the identity document (§ 1.3) is the LATEST version the instance supports. The `protocol_versions_supported` array enumerates ALL supported versions.

---

## 9. Trust and abuse handling

### 9.1. Per-instance block

Any instance MAY publish a blocklist of peer DIDs / hostnames:

```
https://{host}/.well-known/theourgia/blocklist
```

Returns a JSON array of `{ "did": "...", "reason": "..." }` entries OR `{ "host": "..." }` entries for whole-instance blocks.

### 9.2. Community blocklist

Per H08 honesty rule 29, the community-maintained blocklist is OPT-IN. The spec defines a discovery format:

```
https://{host}/.well-known/theourgia/blocklist-subscriptions
```

Returns a JSON array of upstream blocklist URLs the instance has CHOSEN to subscribe to. The list is informational — peers MAY use it to evaluate instance reputation but MUST NOT auto-block based on another instance's subscriptions.

### 9.3. Reporting

Federated content can be reported via:

```
POST /api/v1/federation/report
```

Body shape:

```json
{
  "target_message_id": "...",
  "target_sender_did": "...",
  "reason": "spam | harassment | impersonation | csam | other",
  "details": "..."
}
```

The receiving instance routes the report to its admin queue. The Phase 12 backend implements this as a `Report` table joined to the audit log.

---

## 10. Security threat model

### 10.1. Replay attacks

Mitigated by:

- `message_id` dedupe (§ 5.1)
- `expires_at` window (§ 3)
- HTTP signature `date` header check (§ 2.2, § 5.2)

### 10.2. Envelope swap

Mitigated by:

- Body digest in the signature (§ 2.2)
- `Accept` token-in-body match check (§ 4.5)

### 10.3. Key compromise

Mitigated by:

- Key rotation (§ 1.2) without re-issuing DIDs
- Revocation list (§ 6.3) with 60-second cache TTL
- Out-of-band emergency revocation: instance admins MAY publish a signed emergency-revocation message via a separate `.well-known/theourgia/emergency-revoke` endpoint that's checked on EVERY signature verification (no caching)

### 10.4. Sealed content leakage

Sealed entries NEVER federate. Defence in depth:

- Sender refuses to wrap a sealed entry in a `Push` envelope at the local route (returns 422 to the local caller).
- Receiver checks for the `vault_crypto_envelope` heuristic and returns `sealed_content_rejected` if found.
- The audit log records both ends of the rejection.

### 10.5. Group ritual frozen state

Per H08 rule 22 and § 4.8 of this document: once a ritual is COMPLETED, the script + voces + correspondences are FROZEN. A `RitualUpdate` envelope with `update_kind=fragment` on a completed ritual MUST be rejected with `ritual_frozen`. Post-mortem reflections (`update_kind=postmortem_entry`) ARE accepted on completed rituals — each participant gets exactly one.

---

## 11. Conformance

An implementation is conformant with v0.1 if and only if it:

1. Resolves identity documents per § 1.3.
2. Signs every outbound envelope with HTTP Signatures per § 2.2.
3. Verifies every inbound signature, including the body digest.
4. Honours the `expires_at` window.
5. Implements all 10 message types per § 4 (rejecting unknown types).
6. Dedupes by `message_id` per § 5.1.
7. Implements capability-token verification per § 6.
8. Returns errors in the format defined in § 7.
9. Negotiates spec versions per § 8.1.
10. Refuses to wrap sealed content per § 4.1 / § 10.4.

### 11.1. Test vectors

The reference implementation ships a test-vector bundle at:

```
backend/tests/federation/test_vectors/
```

Each vector is a `{request.json, response.json, expected_signature.txt}` triple covering:

- Each message type (10 vectors).
- Each error code (~18 vectors).
- Signature verification with a published key pair (5 vectors).
- Spec-version negotiation (3 vectors).

Alternative implementations SHOULD run their conformance suite against these vectors before claiming v0.1 compatibility.

### 11.2. Negative-test vectors

Vectors for rejected envelopes (replay, expired, sealed content, frozen ritual, mismatched digest, etc.) ship alongside the positive vectors. A conformant implementation produces the expected error code for each.

---

## 12. Out of scope for v0.1

The following are deferred to future spec versions. Implementations MAY ship them as instance-specific extensions but they MUST NOT change the wire format until a spec version defines them.

- **Direct messages** between practitioners (H08 rule 25 — no auto-DMs; the design surface itself is deferred).
- **Group encryption** — sealed-group-only content. Today, sealed content is per-vault; sealed shared rituals are an open design problem.
- **ActivityPub bridging** within the native protocol. AP runs alongside as an adapter (see `docs/developer/activitypub-extensions.md`).
- **Network-aggregate analytics** with differential privacy. Deferred per Phase 09 scope.
- **Subdomain-per-vault** routing. Deferred to Phase 15.
- **Streaming envelope delivery** (server-sent events). Today, peers poll the inbox; SSE is a future optimisation.

---

## 13. Spec history

- **v0.1** (2026-06-26): initial draft authored ahead of Phase 12 backend execution. Derived from `plan/12-federation.md` and the H08 design request. Reviewed by: build side (Soror Ευ. Α.); pending external implementer review.

Each future version adds an entry here. Removed fields/types are listed with their last-supported version. Breaking changes (major-version bumps) include a migration note.

---

## Appendix A. Reference Python types

```python
from datetime import datetime
from typing import Literal, NotRequired, TypedDict
from uuid import UUID


MessageType = Literal[
    "Push", "Pull", "Mirror", "Invite", "Accept",
    "Revoke", "RitualSchedule", "RitualUpdate",
    "Comment", "Heartbeat",
]


class Envelope(TypedDict):
    spec_version: str
    message_id: str  # UUID v4
    message_type: MessageType
    sender_did: str
    recipient_did: str
    sent_at: str  # RFC 3339 UTC
    expires_at: str
    in_reply_to: str | None
    body: dict


class IdentityKey(TypedDict):
    key_id: str
    algorithm: Literal["ed25519"]
    public_key_b64: str
    created_at: str
    revoked: bool
    revoked_at: NotRequired[str]


class IdentityDocument(TypedDict):
    spec_version: str
    did: str
    actor_type: Literal["vault", "hub", "group", "service"]
    display_name: str
    avatar_url: NotRequired[str]
    keys: list[IdentityKey]
    endpoints: dict
    instance_metadata: dict
```

---

## Appendix B. Minimal worked example

A vault on `hekate.example.com` pushes an entry to a hub on `lodge.example.org`.

**1.** Vault resolves the hub's identity document (cached).

**2.** Vault constructs the envelope:

```json
{
  "spec_version": "0.1",
  "message_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "message_type": "Push",
  "sender_did": "did:theourgia:hekate.example.com:sophia",
  "recipient_did": "did:theourgia:lodge.example.org:north-london-temple",
  "sent_at": "2026-06-26T19:00:00Z",
  "expires_at": "2026-06-26T19:05:00Z",
  "in_reply_to": null,
  "body": {
    "content_kind": "entry",
    "content_id": "5d6e7f8a-...",
    "visibility_scope": "network:f47ac10b-...",
    "payload": {
      "title": "Wednesday banishing",
      "body": "...",
      "occurred_at": "2026-06-25T19:00:00Z"
    }
  }
}
```

**3.** Vault computes `Digest: sha-256=:...:` over the JSON body.

**4.** Vault signs the request per RFC 9421 with its `primary` Ed25519 key. The `Signature-Input` header carries the parameters; `Signature` carries the base64url signature.

**5.** Vault POSTs to `https://lodge.example.org/api/v1/federation/inbox`.

**6.** Hub:
   - Resolves the vault's identity (cached if recently fetched).
   - Verifies signature, digest, clock skew.
   - Checks `message_id` against the dedupe table.
   - Validates body fields.
   - Persists the Push.
   - Returns HTTP 200 with empty body.

**7.** Hub admin sees the new submission in the curation queue (§ 9 of the Phase 12 plan).

Failure at any step returns the appropriate error envelope (§ 7).

---

*End of spec v0.1.*
