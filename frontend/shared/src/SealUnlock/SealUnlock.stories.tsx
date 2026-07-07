/**
 * SealUnlock — passphrase dialog for revealing sealed content.
 * Two policies: session (Oaths) and per-read (Initiations).
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { SealUnlock } from "./SealUnlock.js";
import { SealedBadge } from "./SealedBadge.js";
import { SessionLockIndicator } from "./SessionLockIndicator.js";

const meta = {
  title: "Overlays/SealUnlock",
  component: SealUnlock,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    open: false,
    policy: "session" as const,
    onUnlock: () => {},
    onCancel: () => {},
  },
} satisfies Meta<typeof SealUnlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SessionPolicy: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 24 }}>
        <SealUnlock
          open={open}
          policy="session"
          onUnlock={(_p, stay) => {
            console.log("Unlocked, stay =", stay);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
        {!open ? (
          <p style={{ color: "var(--ink-soft)" }}>
            Vault unlocked for this session. Refresh to re-open.
          </p>
        ) : null}
      </div>
    );
  },
};

export const PerReadPolicy: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 24 }}>
        <SealUnlock
          open={open}
          policy="per-read"
          onUnlock={(_p, stay) => {
            console.log("Unlocked once, stay =", stay);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
        {!open ? (
          <p style={{ color: "var(--ink-soft)" }}>
            Initiation revealed for this read. Per-read policy.
          </p>
        ) : null}
      </div>
    );
  },
};

export const WithErrorMessage: Story = {
  render: () => (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 24 }}>
      <SealUnlock
        open
        policy="session"
        errorMessage="Passphrase didn't decrypt — try again"
        onUnlock={() => {}}
        onCancel={() => {}}
      />
    </div>
  ),
};

// ─── Companion components ──────────────────────────────────────────────

export const SessionLockIndicatorPair: Story = {
  name: "SessionLockIndicator (locked + unlocked)",
  render: () => {
    const [locked, setLocked] = useState(true);
    return (
      <div
        style={{
          padding: 32,
          background: "var(--bg)",
          minHeight: 200,
          display: "flex",
          gap: 18,
          alignItems: "center",
        }}
      >
        <SessionLockIndicator
          locked={true}
          onToggle={() => setLocked(true)}
        />
        <SessionLockIndicator
          locked={false}
          onToggle={() => setLocked(false)}
        />
        <span style={{ color: "var(--ink-soft)" }}>
          Live: {locked ? "locked" : "unlocked"}
        </span>
        <SessionLockIndicator locked={locked} onToggle={() => setLocked(!locked)} />
      </div>
    );
  },
};

export const SealedBadgePair: Story = {
  name: "SealedBadge (sealed + public)",
  render: () => (
    <div
      style={{
        padding: 32,
        background: "var(--bg)",
        minHeight: 120,
        display: "flex",
        gap: 18,
        alignItems: "center",
      }}
    >
      <SealedBadge sealed />
      <SealedBadge sealed={false} />
      <SealedBadge sealed label="Encrypted" />
    </div>
  ),
};
