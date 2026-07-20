# Memorial Key-Share Threat Model

**Status:** Draft (build-side authored 2026-07-16, v1-018 · plan/15 §13)
**Scope:** The executor key-share ceremony — `POST /api/v1/memorial/key-share`, `POST /api/v1/memorial/key-share/verify`, the `memorial_config.key_share_envelope` column, and `theourgia/core/crypto/shamir.py`.

## Goal

Let a magician give their designated digital executor(s) the ability to recover a secret (typically the Mode B vault key material) after memorial mode activates — without the server ever *storing* that secret, and without any single executor share revealing anything on its own.

## What the mechanism is

1. The **client supplies a secret** (base64) plus the parameters `n` (shares to issue) and `k` (threshold to reconstruct).
2. The **server splits** the secret via Shamir's Secret Sharing over GF(256) (`theourgia/core/crypto/shamir.py` — pure Python, AES polynomial 0x11b, CSPRNG coefficients from `secrets`).
3. The `n` shares are **returned exactly once** in the HTTP response — the same contract as backup codes. They are never persisted, never logged.
4. The server stores only a **commitment envelope** in `memorial_config.key_share_envelope`:

   ```json
   {"v": 1, "algo": "shamir-gf256", "n": 3, "k": 2,
    "commitment": "sha256:<hex>", "created_at": "<iso8601>"}
   ```

5. The magician distributes the shares **out-of-band** (paper in a safe, a lawyer's envelope, one per executor — their choice; the product deliberately does not transport shares).
6. **Recovery**: the executor(s) combine `k` shares client-side and call `/memorial/key-share/verify`, which compares SHA-256 of the candidate against the stored commitment (constant-time compare) and returns `{"verified": bool}` — storing nothing.

## Security properties

### Perfect secrecy below the threshold

Shamir sharing over GF(256) is **information-theoretically** secure: for any `k - 1` shares, every candidate secret is exactly equally likely — the shares carry literally zero information about the secret, independent of computational power. (Formally: for each candidate secret byte there is exactly one degree-`k-1` polynomial through the known points and that candidate; the random coefficients make all candidates equiprobable.) This is not a hardness assumption; it is a counting argument. The consequence tested in `tests/test_memorial_followups.py`: combining `k - 1` shares yields a uniformly wrong value, and only the commitment can distinguish right from wrong.

### Reconstruction integrity comes from the commitment, not the scheme

Plain Shamir cannot detect wrong or tampered shares — any `k` points interpolate to *some* value. The stored SHA-256 commitment is the integrity anchor: a reconstruction from tampered shares fails `/verify`. The commitment reveals nothing useful about a high-entropy secret (a 256-bit vault key is not enumerable); see "residual risks" for low-entropy secrets.

## Threat model

### T1 — Server database compromise

**Attack:** An attacker dumps the database hoping to recover the vault secret.

**Mitigation:** The database holds only the commitment (a SHA-256 hash) and the parameters. Neither the secret nor any share is ever written to the database, disk, or logs.

**Residual risk:** If the secret is low-entropy (a guessable passphrase rather than a random key), the commitment enables an offline guessing attack. The intended input is the client-derived Mode B **key** (32 random bytes), not the passphrase; the UI copy asks for key material. A v1.1 hardening could swap the plain hash for a salted, memory-hard commitment.

### T2 — Server compromise during the split request

**Attack:** An attacker with code execution on the server captures the secret while `POST /key-share` is in flight.

**Mitigation (partial — this is the honest v1 limitation):** The secret transits the request body under TLS and exists in server memory only for the duration of the request. The endpoints log nothing; the test suite asserts that no fragment of the secret or shares reaches the log stream. There is no persistence path.

**Residual risk:** A fully compromised server sees the secret transiently. **This is the known, accepted v1 limitation.** The v1.1 upgrade is client-side splitting (the browser runs SSS itself and submits only the commitment), which removes server sight entirely — the server-side `shamir.py` then remains as the reference/verification implementation. Until then, the ceremony's security reduces to the server's integrity *at the moment of the split* — afterwards, compromise gains nothing.

### T3 — A single executor acting early or a lost share

**Attack:** One executor tries to open the vault before the magician's death; or one share is lost/stolen.

**Mitigation:** Choose `k ≥ 2`. Any `k - 1` shares reveal nothing (perfect secrecy above). A stolen single share is useless; a lost single share still leaves `n - 1 ≥ k` holders able to recover (when `n > k`).

**Residual risk:** Collusion of `k` executors recovers the secret at any time — Shamir has no time-lock. The memorial *trigger* (state machine + executor notification) is advisory workflow, not a cryptographic gate. Magicians should pick executors accordingly; a cryptographic time-lock is out of scope for v1.

### T4 — Replaying or re-running the ceremony

**Attack:** An attacker (or a confused user) re-runs `POST /key-share`, hoping old shares still work or to swap the commitment.

**Mitigation:** Regeneration **replaces** the envelope; previously issued shares no longer verify. The endpoint requires an authenticated session and refuses while the vault is memorialized (a memorialized vault's settings are frozen until reactivation).

### T5 — Share transport interception

**Attack:** Intercepting shares on their way to the executors.

**Mitigation:** Out of scope by design — the product never transports shares. They appear once in the authenticated HTTPS response to the magician, who chooses the out-of-band channel. The UI says they are shown once and never stored.

## What `/verify` deliberately is and is not

- It is an **integrity oracle for the legitimate recovery flow**: "did my combined shares reconstruct the right secret?" — nothing is stored, nothing is logged.
- It is **not** an unseal endpoint. Theourgia has no `/unseal`; sealed content is decrypted client-side only (Mode B contract). A verified secret is used by the *client* to decrypt.
- v1 scopes `/verify` to an authenticated session (the operator, or whoever legitimately operates the account during estate handling). The executor-facing guided-unlock surface — which must work without the owner's credentials — ships with the guided steps documentation (`docs/user/digital-inheritance.md`, plan/15 §13) and will need its own gating design (e.g. an executor token issued at notification time). Noted as follow-up work.

## v1 → v1.1 upgrade path

| Property | v1 (this batch) | v1.1 (planned) |
| --- | --- | --- |
| Who runs SSS split | Server (`shamir.py`) | Client (browser, libsodium/WASM or pure JS) |
| Server sees secret | Transiently, during split + verify | Never |
| Server stores | Commitment + params | Commitment + params (unchanged) |
| Verify | Server compares SHA-256 | Client compares; server endpoint optional |

The wire format (share = x-byte ‖ y-bytes, GF(256), AES polynomial) is standard so a future client-side implementation interoperates with shares issued today.
