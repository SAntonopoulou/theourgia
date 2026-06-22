/**
 * ToolCard — grid card for a single tool record.
 *
 * Layout: square photo tile (radial-gradient by tint) + name +
 * kindLabel + consecration pill. Consecrated → --care palette;
 * unconsecrated → muted --line border. Never red.
 */

import { type CSSProperties } from "react";

import {
  TR_CONSECRATED_PREFIX,
  TR_NOT_YET_CONSECRATED,
  toolKindLabel,
  type ToolRecord,
} from "./copy.js";
import { ToolKindIcon } from "./ToolKindIcon.js";

const CARD_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
  overflow: "hidden",
  textAlign: "left",
  cursor: "pointer",
  padding: 0,
};

const PILL_STYLE_CONSECRATED: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 9px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--care-line)",
  borderRadius: "var(--r-pill, 20px)",
  background: "var(--care-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  color: "var(--care)",
};

const PILL_STYLE_PENDING: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 9px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-pill, 20px)",
  background: "transparent",
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  color: "var(--ink-mute)",
};

function CheckIcon() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}

export interface ToolCardProps {
  tool: ToolRecord;
  onOpen?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function ToolCard({ tool, onOpen, className, style }: ToolCardProps) {
  const consecrated = !!tool.consDate;
  return (
    <button
      type="button"
      data-tool-card={tool.id}
      data-consecrated={consecrated}
      onClick={() => onOpen?.(tool.id)}
      className={className}
      style={{ ...CARD_STYLE, ...style, border: "1px solid var(--line)" }}
    >
      <div
        style={{
          aspectRatio: "1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(ellipse at 50% 40%, ${tool.tint}, var(--bg-sunk))`,
          borderBottomWidth: 1,
          borderBottomStyle: "solid",
          borderBottomColor: "var(--line)",
          color: "var(--accent)",
        }}
      >
        <ToolKindIcon kind={tool.kind} size={44} />
      </div>
      <div style={{ padding: "13px 14px" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            lineHeight: 1.15,
            color: "var(--ink)",
          }}
        >
          {tool.name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            margin: "2px 0 9px",
          }}
        >
          {toolKindLabel(tool.kind)}
        </div>
        {consecrated ? (
          <span data-pill="consecrated" style={PILL_STYLE_CONSECRATED}>
            <CheckIcon />
            {TR_CONSECRATED_PREFIX}
            {tool.consDate}
          </span>
        ) : (
          <span data-pill="pending" style={PILL_STYLE_PENDING}>
            {TR_NOT_YET_CONSECRATED}
          </span>
        )}
      </div>
    </button>
  );
}
