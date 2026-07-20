export {
  base64ToBytes,
  bytesToBase64,
  decryptSealedPayloadB64,
  decryptVaultPayload,
  decryptVaultPayloadWithSalt,
  deriveVaultKey,
  encryptVaultPayload,
  encryptVaultPayloadWithSalt,
  generateVaultSalt,
  sealToEnvelope,
  type SealedEnvelopeV1,
} from "./vaultCrypto.js";
