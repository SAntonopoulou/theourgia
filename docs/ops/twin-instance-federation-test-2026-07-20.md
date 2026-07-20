# Twin-instance federation test — 2026-07-20

Tier 3 #16. Two independent Theourgia instances, separate databases and
Redis, federation transport enabled, exercising the real production
code paths (`deliver`, `process_pending`, `drain_pending`, the AP inbox
handler) over real HTTP on loopback.

## Setup

- **alpha** — `did:theourgia:alpha.twin.test`, port 8795, DB `instance_a`
- **beta** — `did:theourgia:beta.twin.test`, port 8796, DB `instance_b`
- Both migrated 0001→0081 on a fresh `pgvector/pgvector:pg16`.
- Mutual peer registration; ActivityPub enabled with auto follower
  approval on both.

## What was exercised, and the observed result

| Step | Mechanism | Result |
|---|---|---|
| 1. alpha → signed `Follow` → beta inbox | `outbound.deliver` signs (Ed25519, RFC 9421); beta's inbox verifies by resolving alpha's key from the registered peer base_url | **202**, stored `follow.request` PENDING |
| 2. beta processes inbox | `inbox_processor.process_pending` | auto-approved → `activitypub_follower` row created → signed `Accept` enqueued |
| 3. beta drains queue → `Accept` → alpha | `delivery_queue.drain_pending` signs + POSTs | **delivered=1**; alpha verified beta's signature → stored `follow.accept` PENDING |
| 4. replay guard | identical signed bytes POSTed twice to beta's inbox | **first 202, second 409** (nonce store rejects the replay) |

Bidirectional signature verification is proven by construction: an
unverified request 401s and is never stored; both receivers stored the
activity, so both signatures verified against the sender's published
key fetched from the peer's actor document.

## Defects found and fixed (v1-029)

The test caught five things unit tests could not:

1. **`select` NameError** in the peer-base-url lookup added to
   `federation_inbox.py` — the DB-backed resolver path had no unit
   coverage (the resolver test injects a lambda). AP inbox 500'd until
   fixed.
2. **Peer key resolution ignored the registered base_url** — it fetched
   `https://{host-from-DID}` only, so a peer on a nonstandard port (or
   a LAN lab) could never be verified. Registered peers now resolve
   against their stored base_url; unknown DIDs keep the strict path.
3. **`deliver` rejected non-https URLs unconditionally** — added the
   `THEOURGIA_FEDERATION_ALLOW_INSECURE_HTTP` LAB-ONLY flag (default
   off; documented as never-for-internet).
4. **Peer-add rejected non-https base_urls** — same flag.
5. **`resolve_inbox_url` didn't resolve http actor inboxes** — same
   flag, fourth site. All four https-only gates now share one flag.

Each fix carries a regression test; the flag defaults off, so
production posture is unchanged.

## Separate blocker surfaced (task #36, NOT a federation bug)

`Vault` is constructed in **zero** non-test modules. A fresh install
creates a User at sign-in but never a Vault, yet AP actor resolution
(`Vault.slug`), key rotation, and voces state all require one. The
test had to insert vault rows by hand to proceed. AP federation is
impossible on any real install until a provisioning path exists. Prod
must be checked for a vault row. This is the highest-priority open
item.

## Verdict

The native + ActivityPub federation transport works end-to-end between
two instances: signed delivery, signature verification, inbox
processing, follow/accept round-trip, and replay rejection all
confirmed live. Group ritual cross-instance and DP cross-vault
aggregates (which depend on this transport) are unblocked, pending the
vault-provisioning fix.
