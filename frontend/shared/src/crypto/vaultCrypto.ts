/**
 * Mode B vault encryption — PBKDF2 + AES-GCM (Web Crypto).
 *
 * The Theourgia "sealed" rows (talismans, sealed entries, sealed
 * oaths, sealed initiations) follow the same Mode B contract:
 *
 *   • The client derives a key from the practitioner's passphrase
 *     + a per-vault salt via PBKDF2-SHA256.
 *   • The client encrypts the plaintext payload with AES-GCM.
 *   • The server receives ``{encrypted_payload_b64,
 *     encryption_iv_b64}`` and nulls out the plaintext columns.
 *   • To read, the client GETs the ciphertext, prompts for the
 *     passphrase, decrypts in memory. The key never leaves the
 *     device.
 *
 * This module is deliberately small. It does NOT manage:
 *   • Salt storage (callers supply it).
 *   • Per-session key caching (callers / SealUnlock handle policy).
 *   • Passphrase confirmation flow.
 *
 * Per the H05 supplement: AES-256-GCM with a 96-bit IV. PBKDF2
 * iteration count is 600_000 (OWASP 2023 baseline). Salts are
 * 16 bytes; IVs are 12 bytes (the GCM standard).
 */

const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = "SHA-256";
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Base64 encode a Uint8Array. Uses btoa via String.fromCharCode
 *  with chunked input to avoid the call-stack overflow on large
 *  payloads. */
export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Decode a base64 string back to a Uint8Array. Throws if the
 *  string is not valid base64. */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Derive an AES-GCM key from a passphrase + salt via PBKDF2. */
export async function deriveVaultKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt a JSON-stringifiable value with AES-GCM. Returns the
 *  base64-encoded ciphertext + IV — exactly what the server's
 *  /seal endpoint expects. */
export async function encryptVaultPayload(
  value: unknown,
  key: CryptoKey,
): Promise<{ encrypted_payload_b64: string; encryption_iv_b64: string }> {
  const plaintext = enc.encode(JSON.stringify(value));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      plaintext as BufferSource,
    ),
  );
  return {
    encrypted_payload_b64: bytesToBase64(ciphertext),
    encryption_iv_b64: bytesToBase64(iv),
  };
}

/** Decrypt a base64-encoded ciphertext + IV pair. Returns the
 *  parsed JSON value. Throws if decryption fails (wrong key, or
 *  tampered ciphertext — AES-GCM rejects either). */
export async function decryptVaultPayload<T>(
  encrypted_payload_b64: string,
  encryption_iv_b64: string,
  key: CryptoKey,
): Promise<T> {
  const ciphertext = base64ToBytes(encrypted_payload_b64);
  const iv = base64ToBytes(encryption_iv_b64);
  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    ),
  );
  return JSON.parse(dec.decode(plaintext)) as T;
}

/** Generate a fresh 16-byte salt for a new vault. Callers persist
 *  this alongside the user record (per the B54 substrate plan).
 *  The salt is NOT secret — it's stored server-side so the
 *  practitioner can recover the key on a new device by supplying
 *  the same passphrase. */
export function generateVaultSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}
