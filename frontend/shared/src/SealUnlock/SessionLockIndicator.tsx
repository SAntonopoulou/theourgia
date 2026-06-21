/**
 * SessionLockIndicator — the topbar pill that exposes the vault's
 * current locked/unlocked state and lets the practitioner toggle it.
 *
 * Per the H01-H03 supplement S3.1: this lives in the topbar on every
 * page that may render sealed content (Oaths is the canonical
 * consumer; Initiations + Search "sealed honesty" + Today ledger all
 * surface or depend on it).
 *
 * Tone: locking is the SAFE action — clicking the indicator while
 * unlocked locks immediately, no confirm. Clicking while locked
 * opens the SealUnlock dialog.
 *
 * Tokens: locked = `--seal*`; unlocked = `--os-active` (the same
 * green used for active oaths / active contracts / etc., scoped to
 * "the system is in a state where sealed reads are possible").
 */

import { type CSSProperties } from "react";

import { LockClosed, LockOpen } from "./icons.js";

export interface SessionLockIndicatorProps {
  locked: boolean;
  /** Fired when the indicator is pressed. The caller routes to:
   *  • open the SealUnlock dialog when `locked=true`
   *  • call its `onLock()` (drop the in-memory key) when `locked=false`
   */
  onToggle: () => void;
  className?: string;
  style?: CSSProperties;
}

export function SessionLockIndicator({
  locked,
  onToggle,
  className,
  style,
}: SessionLockIndicatorProps) {
  const text = locked ? "Vault locked" : "Vault unlocked";
  const ariaLabel = locked
    ? "Vault locked — unlock the vault"
    : "Vault unlocked — lock the vault";

  // Colours sourced verbatim from Theourgia Oaths.dc.html (vaultStyle
  // composition). The unlocked state uses `color-mix` to derive
  // surface + border tints from --os-active so the indicator harmonises
  // with the active oath status colour across themes.
  const unlockedStyle: CSSProperties = {
    color: "var(--os-active)",
    background: "color-mix(in srgb, var(--os-active) 12%, transparent)",
    border:
      "1px solid color-mix(in srgb, var(--os-active) 36%, transparent)",
  };
  const lockedStyle: CSSProperties = {
    color: "var(--seal)",
    background: "var(--seal-soft)",
    border: "1px solid var(--seal-border)",
  };

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 11px",
    borderRadius: 999,
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    cursor: "pointer",
    ...(locked ? lockedStyle : unlockedStyle),
    ...style,
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel}
      aria-pressed={!locked}
      className={className}
      style={base}
      data-locked={locked ? "true" : "false"}
    >
      {locked ? <LockClosed size={15} /> : <LockOpen size={15} />}
      {text}
    </button>
  );
}
