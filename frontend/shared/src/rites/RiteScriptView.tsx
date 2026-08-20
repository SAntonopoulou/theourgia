/**
 * A written rite, rendered as it is performed — the web mirror of the phone's
 * `RiteScriptView`.
 *
 * Instructions are set quieter and smaller than the words: in the dark the
 * liturgy is what is being read and the direction is glanced at, so giving them
 * equal weight would make the page harder to find your place in. A vibrated
 * name is coloured and letter-spaced, because a name held and sounded out takes
 * longer on the tongue and the line should look like it takes longer to say.
 */

import type { CSSProperties } from "react";

import { type ScriptSpan, isRiteEmpty, parseRite } from "./riteScript.js";

export interface RiteScriptViewProps {
  script: string;
  emptyMessage?: string;
  className?: string;
  style?: CSSProperties;
}

const HEADING_STYLE: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  margin: "16px 0 4px",
};

const LINE_STYLE: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 16,
  lineHeight: 1.6,
  color: "var(--ink)",
  margin: 0,
};

function spanStyle(span: ScriptSpan): CSSProperties | undefined {
  if (span.kind === "instruction") {
    return { color: "var(--ink-mute)", fontStyle: "italic", fontSize: 13.5 };
  }
  if (span.emphasised) {
    return { color: "var(--accent)", letterSpacing: "0.09em" };
  }
  return undefined;
}

export function RiteScriptView({ script, emptyMessage, className, style }: RiteScriptViewProps) {
  if (isRiteEmpty(script)) {
    return (
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-mute)", ...style }}>
        {emptyMessage ?? "Nothing written yet."}
      </p>
    );
  }
  const blocks = parseRite(script);
  return (
    <div className={className} style={style}>
      {blocks.map((block, i) => {
        // Blocks have no stable id — index is the honest key for a parsed view
        // that is fully re-derived whenever the script changes.
        const key = i;
        if (block.kind === "heading") {
          return (
            <div key={key} style={HEADING_STYLE}>
              {block.text}
            </div>
          );
        }
        if (block.kind === "break") {
          return <div key={key} style={{ height: 12 }} />;
        }
        return (
          <p key={key} style={LINE_STYLE}>
            {block.spans.map((span, j) => (
              <span key={j} style={spanStyle(span)}>
                {span.text}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
