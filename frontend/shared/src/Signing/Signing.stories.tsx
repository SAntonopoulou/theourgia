/**
 * Signing UX family — PublicKeyShort · CanonicalBytes · SignatureRoster
 * · SignDialog · RevokeDialog.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { CanonicalBytes } from "./CanonicalBytes.js";
import { PublicKeyShort } from "./PublicKeyShort.js";
import { RevokeDialog } from "./RevokeDialog.js";
import {
  SignatureRoster,
  type SignatureRow,
} from "./SignatureRoster.js";
import { SignDialog } from "./SignDialog.js";

const meta = {
  title: "Signing",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 24,
      maxWidth: 720,
      background: "var(--bg)",
      color: "var(--ink-soft)",
    }}
  >
    {children}
  </div>
);

const SAMPLE_KEY = "9F2A7C4E1B8D3056A1F29C7B4E8D2A19";

const SAMPLE_CLAIM = {
  subject: "persona:aspasia",
  kind: "initiation",
  tradition: "Lyceum tradition",
  grade: "Minerval",
  granted_at: "20 March 2020",
  statement: "Initiation as Minerval in the Lyceum tradition.",
};

const SAMPLE_SIGS: SignatureRow[] = [
  {
    id: "s1",
    role: "self",
    signerLabel: "Soror Ευ. Α.",
    signerPublicKey: SAMPLE_KEY,
    signedAt: "21 March 2020",
    verify: "ok",
  },
  {
    id: "s2",
    role: "counter-sign",
    signerLabel: "L. Vespera, Lodge Master",
    signerPublicKey: "4B8E2A19F7C3D0568D3056A1F29C7B4E",
    signedAt: "22 March 2020",
    verify: "ok",
  },
];

const SAMPLE_SIGS_WITH_REVOCATION: SignatureRow[] = [
  ...SAMPLE_SIGS,
  {
    id: "r1",
    role: "revocation",
    signerLabel: "Soror Ευ. Α.",
    signerPublicKey: SAMPLE_KEY,
    signedAt: "12 April 2026",
    verify: "ok",
    reason:
      "Claim made in error — the grade was not in fact conferred on this date. Withdrawn so the record is true.",
  },
];

const SAMPLE_SIGS_FAILING: SignatureRow[] = [
  {
    id: "f1",
    role: "self",
    signerLabel: "Frater Lykourgos",
    signerPublicKey: "C1D9A0F37E2B4856029C7B4E8D2A19F7",
    signedAt: "14 April 2026",
    verify: "fail",
  },
  {
    id: "f2",
    role: "counter-sign",
    signerLabel: "Soror Ευ. Α.",
    signerPublicKey: SAMPLE_KEY,
    signedAt: "15 April 2026",
    verify: "ok",
  },
];

// ─── PublicKeyShort ────────────────────────────────────────────────

export const PublicKey_Default: Story = {
  name: "PublicKeyShort · Default",
  render: () => (
    <Frame>
      <PublicKeyShort keyHex={SAMPLE_KEY} />
    </Frame>
  ),
};

export const PublicKey_LongerForm: Story = {
  name: "PublicKeyShort · 6 + 6",
  render: () => (
    <Frame>
      <PublicKeyShort keyHex={SAMPLE_KEY} prefix={6} suffix={6} />
    </Frame>
  ),
};

// ─── CanonicalBytes ────────────────────────────────────────────────

export const Canonical_FormattedDefault: Story = {
  name: "CanonicalBytes · Formatted (default)",
  render: () => (
    <Frame>
      <CanonicalBytes value={SAMPLE_CLAIM} />
    </Frame>
  ),
};

export const Canonical_RawDefault: Story = {
  name: "CanonicalBytes · Raw JSON",
  render: () => (
    <Frame>
      <CanonicalBytes value={SAMPLE_CLAIM} defaultRaw />
    </Frame>
  ),
};

export const Canonical_WithUndefinedFiltered: Story = {
  name: "CanonicalBytes · undefined fields dropped",
  render: () => (
    <Frame>
      <CanonicalBytes
        value={{
          ...SAMPLE_CLAIM,
          grade: undefined, // dropped from canonical bytes
        }}
      />
    </Frame>
  ),
};

// ─── SignatureRoster ───────────────────────────────────────────────

export const Roster_TwoSignatures: Story = {
  name: "SignatureRoster · Self + Counter-sign",
  render: () => (
    <Frame>
      <SignatureRoster signatures={SAMPLE_SIGS} />
    </Frame>
  ),
};

export const Roster_WithRevocation: Story = {
  name: "SignatureRoster · Revocation appended",
  render: () => (
    <Frame>
      <SignatureRoster signatures={SAMPLE_SIGS_WITH_REVOCATION} />
    </Frame>
  ),
};

export const Roster_FailingSignature: Story = {
  name: "SignatureRoster · One signature fails verify",
  render: () => (
    <Frame>
      <SignatureRoster signatures={SAMPLE_SIGS_FAILING} />
    </Frame>
  ),
};

// ─── SignDialog ────────────────────────────────────────────────────

export const Sign_Open: Story = {
  name: "SignDialog · Open",
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 24 }}>
        <SignDialog
          open={open}
          canonical={SAMPLE_CLAIM}
          onSign={(p) => {
            console.log("sign", p.length, "chars");
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </div>
    );
  },
};

export const Sign_WithError: Story = {
  name: "SignDialog · Error message",
  render: () => (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 24 }}>
      <SignDialog
        open
        canonical={SAMPLE_CLAIM}
        errorMessage="Passphrase didn't unlock the signing key — try again"
        onSign={() => {}}
        onCancel={() => {}}
      />
    </div>
  ),
};

// ─── RevokeDialog ──────────────────────────────────────────────────

export const Revoke_Open: Story = {
  name: "RevokeDialog · Open",
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 24 }}>
        <RevokeDialog
          open={open}
          onRevoke={(reason) => {
            console.log("revoked:", reason);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </div>
    );
  },
};

export const Revoke_WithError: Story = {
  name: "RevokeDialog · Error message",
  render: () => (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 24 }}>
      <RevokeDialog
        open
        errorMessage="Signing failed — try again"
        onRevoke={() => {}}
        onCancel={() => {}}
      />
    </div>
  ),
};
