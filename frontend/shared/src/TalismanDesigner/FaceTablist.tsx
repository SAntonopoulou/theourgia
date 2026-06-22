/**
 * FaceTablist — in-page Front/Back role="tablist" living in the
 * topbar. Identical chrome to the other in-page tablists.
 */

import { type CSSProperties } from "react";

import {
  FACE_BACK_LABEL,
  FACE_FRONT_LABEL,
  FACE_TABLIST_LABEL,
  type TalismanFace,
} from "./copy.js";

const GROUP_STYLE: CSSProperties = {
  display: "flex",
  gap: 2,
  padding: 3,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: 8,
  background: "var(--bg-2)",
};

const TAB_BASE: CSSProperties = {
  padding: "6px 16px",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-mute)",
  background: "transparent",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
  borderRadius: 6,
  cursor: "pointer",
};

const TAB_ON: CSSProperties = {
  ...TAB_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--line-2)",
};

export interface FaceTablistProps {
  value: TalismanFace;
  onChange: (next: TalismanFace) => void;
  className?: string;
  style?: CSSProperties;
}

export function FaceTablist({
  value,
  onChange,
  className,
  style,
}: FaceTablistProps) {
  return (
    <div
      role="tablist"
      aria-label={FACE_TABLIST_LABEL}
      data-component="talisman-face-tablist"
      className={className}
      style={{ ...GROUP_STYLE, ...style }}
    >
      <button
        role="tab"
        type="button"
        aria-selected={value === "front"}
        data-face="front"
        onClick={() => onChange("front")}
        style={value === "front" ? TAB_ON : TAB_BASE}
      >
        {FACE_FRONT_LABEL}
      </button>
      <button
        role="tab"
        type="button"
        aria-selected={value === "back"}
        data-face="back"
        onClick={() => onChange("back")}
        style={value === "back" ? TAB_ON : TAB_BASE}
      >
        {FACE_BACK_LABEL}
      </button>
    </div>
  );
}
