/**
 * PracticeModuleStateChip — install-by-proof lifecycle chip:
 * candidate · testing · installed · rejected.
 *
 * Nothing enters the daily rite on enthusiasm alone. Rejected is a
 * verdict, not a ban — its tone is ``--gate-fail`` (an alias of
 * ``--warn``), never ``--danger``.
 */

import type { CSSProperties } from "react";

import type { ModuleStatusWire } from "../api/types.js";
import { _ } from "../i18n/index.js";

export interface PracticeModuleStateChipProps {
  state: ModuleStatusWire;
  className?: string;
  style?: CSSProperties;
}

const CHIP_TONES: Record<
  ModuleStatusWire,
  { color: string; background: string; borderColor: string }
> = {
  candidate: { color: "var(--ink-mute)", background: "transparent", borderColor: "var(--line-2)" },
  testing: {
    color: "var(--accent)",
    background: "var(--accent-soft)",
    borderColor: "var(--accent)",
  },
  installed: {
    color: "var(--gate-pass)",
    background: "var(--gate-pass-soft)",
    borderColor: "var(--gate-pass)",
  },
  rejected: {
    color: "var(--gate-fail)",
    background: "var(--gate-fail-soft)",
    borderColor: "var(--gate-fail-soft)",
  },
};

export function PracticeModuleStateChip({ state, className, style }: PracticeModuleStateChipProps) {
  const tone = CHIP_TONES[state];
  return (
    <span
      data-component="practice-module-state-chip"
      data-module-state={state}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 11px",
        borderRadius: "var(--r-pill, 20px)",
        color: tone.color,
        background: tone.background,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: tone.borderColor,
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        flex: "none",
        ...style,
      }}
    >
      {_(state)}
    </span>
  );
}
