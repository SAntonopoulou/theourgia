/**
 * KeyRotation — H10 Cluster B5 surface copy.
 *
 * Rotation is ritual-make — the 4-step wizard cannot be skipped.
 * Revocation is one-tap (--warn-soft).
 */

export interface RotationStep {
  n: number;
  title: string;
  body: string;
}

export const ROTATION_STEPS: readonly RotationStep[] = [
  {
    n: 1,
    title: "Generate the new key",
    body: "A fresh Ed25519 keypair is created in your browser. The private half never reaches the server.",
  },
  {
    n: 2,
    title: "Re-sign your federation envelopes",
    body: "A background job re-signs your existing federated messages with the new key.",
  },
  {
    n: 3,
    title: "Publish the new public key",
    body: "Your DID document is updated so peers learn the new key.",
  },
  {
    n: 4,
    title: "Retire the old key",
    body: "The old key moves to your trusted history — peers can still verify older messages.",
  },
];

export const HEADERS = {
  currentKey: "Current key",
  rotate: "Rotate your key",
  rotateSubtitle:
    "Four steps, in order. The new private key is generated in your browser and never leaves this device.",
  history: "Trusted key history",
  historySubtitle:
    "Retired keys are kept so federation peers can still verify your older messages. They are never deleted.",
  emergencyRevoke: "Emergency revocation",
} as const;

export const BUTTONS = {
  beginRotation: "Begin rotation",
  revokeThisKey: "Revoke this key",
} as const;

export const CHIPS = {
  active: "active",
} as const;

export const REVOKE_BODY =
  "If you believe your key has been compromised, revoke immediately. Revocation propagates to your federation peers within 24 hours.";

export const FIELD_LABELS = {
  fingerprint: "Fingerprint",
  created: "Created",
  lastUsed: "Last used",
} as const;
