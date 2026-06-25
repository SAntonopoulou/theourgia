/**
 * Vault crypto round-trip tests.
 *
 * Validates the Mode B contract:
 *   • Same passphrase + salt → round-trip succeeds.
 *   • Wrong passphrase → decrypt rejects.
 *   • Tampered ciphertext → decrypt rejects (AES-GCM auth tag).
 *   • Different IVs produce different ciphertexts for the same
 *     plaintext (probabilistic but verifies non-determinism).
 */

import { describe, expect, it } from "vitest";

import {
  base64ToBytes,
  bytesToBase64,
  decryptVaultPayload,
  deriveVaultKey,
  encryptVaultPayload,
  generateVaultSalt,
} from "./vaultCrypto.js";

describe("vaultCrypto", () => {
  it("round-trips a JSON payload with the correct passphrase", async () => {
    const salt = generateVaultSalt();
    const key = await deriveVaultKey("correct horse battery staple", salt);
    const payload = {
      front_svg: "<svg>front</svg>",
      back_svg: "<svg>back</svg>",
      components: { sigil_ids: ["s1"], square_ids: ["sq1"] },
    };
    const sealed = await encryptVaultPayload(payload, key);
    const decrypted = await decryptVaultPayload(
      sealed.encrypted_payload_b64,
      sealed.encryption_iv_b64,
      key,
    );
    expect(decrypted).toEqual(payload);
  });

  it("rejects decryption with the wrong passphrase", async () => {
    const salt = generateVaultSalt();
    const goodKey = await deriveVaultKey("the right one", salt);
    const wrongKey = await deriveVaultKey("not the right one", salt);
    const sealed = await encryptVaultPayload({ secret: 1 }, goodKey);
    await expect(
      decryptVaultPayload(
        sealed.encrypted_payload_b64,
        sealed.encryption_iv_b64,
        wrongKey,
      ),
    ).rejects.toThrow();
  });

  it("rejects decryption when the ciphertext is tampered", async () => {
    const salt = generateVaultSalt();
    const key = await deriveVaultKey("a passphrase", salt);
    const sealed = await encryptVaultPayload({ secret: 1 }, key);
    // Flip the first byte of the ciphertext.
    const bytes = base64ToBytes(sealed.encrypted_payload_b64);
    bytes[0] = (bytes[0]! + 1) & 0xff;
    const tampered = bytesToBase64(bytes);
    await expect(
      decryptVaultPayload(tampered, sealed.encryption_iv_b64, key),
    ).rejects.toThrow();
  });

  it("produces different ciphertext for the same plaintext (random IV)", async () => {
    const salt = generateVaultSalt();
    const key = await deriveVaultKey("passphrase", salt);
    const payload = { same: "input" };
    const a = await encryptVaultPayload(payload, key);
    const b = await encryptVaultPayload(payload, key);
    expect(a.encryption_iv_b64).not.toBe(b.encryption_iv_b64);
    expect(a.encrypted_payload_b64).not.toBe(b.encrypted_payload_b64);
  });

  it("rejects decryption with the wrong salt (and hence wrong key)", async () => {
    const saltA = generateVaultSalt();
    const saltB = generateVaultSalt();
    const keyA = await deriveVaultKey("same passphrase", saltA);
    const keyB = await deriveVaultKey("same passphrase", saltB);
    const sealed = await encryptVaultPayload({ s: 1 }, keyA);
    await expect(
      decryptVaultPayload(
        sealed.encrypted_payload_b64,
        sealed.encryption_iv_b64,
        keyB,
      ),
    ).rejects.toThrow();
  });

  it("base64 round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 254, 255]);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it("generateVaultSalt returns 16 bytes of high-entropy material", () => {
    const a = generateVaultSalt();
    const b = generateVaultSalt();
    expect(a.length).toBe(16);
    expect(b.length).toBe(16);
    // Two random salts colliding is astronomically unlikely.
    expect(a).not.toEqual(b);
  });
});
