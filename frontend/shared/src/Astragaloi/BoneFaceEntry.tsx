/**
 * BoneFaceEntry — transcription-first face entry for the five bones.
 *
 * Per ``AstragaloiCasting.dc.html``: five columns ("Bone 1"…"Bone 5"),
 * each a 2×2 grid of the four legal faces (rule 68 — there is no two
 * and no five), with a live sum note beneath. The component is
 * presentation-only; the caller owns the entry state.
 */

import type { CSSProperties } from "react";

import type { BoneFaceWire } from "../api/types.js";
import { _ } from "../i18n/index.js";
import { BoneFaceGlyph } from "./BoneFaceGlyph.js";
import { BONE_FACES, type BoneEntry, entryFilled, entrySum } from "./faces.js";

export interface BoneFaceEntryProps {
  /** Entry state — five slots, each a legal face or null. */
  value: readonly BoneEntry[];
  /** A face was picked for bone ``index`` (0-based). */
  onPick: (index: number, face: BoneFaceWire) => void;
  className?: string;
  style?: CSSProperties;
}

const FACE_BUTTON_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  borderRadius: "var(--r-md, 8px)",
  borderWidth: 1,
  borderStyle: "solid",
  cursor: "pointer",
  background: "var(--bg)",
  borderColor: "var(--line-2)",
  color: "var(--ink-mute)",
};

const FACE_BUTTON_ON: CSSProperties = {
  ...FACE_BUTTON_BASE,
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
  color: "var(--accent)",
};

export function BoneFaceEntry({ value, onPick, className, style }: BoneFaceEntryProps) {
  const filled = entryFilled(value);
  const sum = entrySum(value);
  const complete = filled === 5;
  const sumNote = complete
    ? _("Five faces recorded · {sum}", {
        sum: `${value.map((f) => String(f)).join(" + ")} = ${sum}`,
      })
    : _("{n} of five faces recorded", { n: filled });

  return (
    <div data-component="bone-face-entry" className={className} style={style}>
      <div className="as-bones" style={{ display: "flex", gap: 11, flexWrap: "wrap" }}>
        {value.map((picked, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: the bone's position is its identity
            key={i}
            data-bone-index={i}
            style={{ flex: "1 1 0", minWidth: 104 }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--ink-mute)",
                marginBottom: 6,
                textAlign: "center",
              }}
            >
              {_("Bone {n}", { n: i + 1 })}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 5,
              }}
            >
              {BONE_FACES.map((face) => {
                const on = picked === face;
                return (
                  <button
                    key={face}
                    type="button"
                    data-face={face}
                    aria-pressed={on}
                    aria-label={_("Bone {n}, face {f}", { n: i + 1, f: face })}
                    onClick={() => onPick(i, face)}
                    style={on ? FACE_BUTTON_ON : FACE_BUTTON_BASE}
                  >
                    <BoneFaceGlyph face={face} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div
        data-sum-note
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          marginTop: 14,
        }}
      >
        {sumNote}
      </div>
    </div>
  );
}
