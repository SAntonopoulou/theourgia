/**
 * LadderProgressPhrase — where the walk stands, as a phrase.
 *
 * "Sphere 9 · Ennead" — NEVER a bar, never a percentage. The pace is
 * the operator's own; the record states position, not velocity.
 */

import type { CSSProperties } from "react";

import type { LadderProgressRead } from "../api/types.js";

export interface LadderProgressPhraseProps {
  progress: LadderProgressRead;
  className?: string;
  style?: CSSProperties;
}

export function LadderProgressPhrase({ progress, className, style }: LadderProgressPhraseProps) {
  return (
    <span
      data-component="ladder-progress-phrase"
      className={className}
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: 12.5,
        color: "var(--ink-mute)",
        ...style,
      }}
    >
      {progress.phrase}
    </span>
  );
}
