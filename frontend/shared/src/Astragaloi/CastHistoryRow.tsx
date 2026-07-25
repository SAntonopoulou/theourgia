/**
 * CastHistoryRow — one earlier cast: date · faces · sum · god ·
 * question · the simulated mark (forever, rule 67) · valence glyph.
 */

import type { CSSProperties } from "react";

import type { AstragaloiCastRead } from "../api/types.js";
import { SimulatedChip } from "./SimulatedThrowBar.js";
import { ValenceGlyph } from "./ValenceGlyph.js";
import { VALENCE_TONES } from "./faces.js";

export interface CastHistoryRowProps {
  cast: AstragaloiCastRead;
  onSelect?: (cast: AstragaloiCastRead) => void;
  selected?: boolean;
  style?: CSSProperties;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function CastHistoryRow({ cast, onSelect, selected, style }: CastHistoryRowProps) {
  const tone = VALENCE_TONES[cast.oracle.valence];
  return (
    <button
      type="button"
      data-component="cast-history-row"
      data-cast-id={cast.id}
      data-simulated={cast.simulated ? "true" : "false"}
      aria-pressed={selected ?? false}
      onClick={() => onSelect?.(cast)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        width: "100%",
        textAlign: "left",
        padding: "12px 15px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: selected ? "var(--line-2)" : "var(--line)",
        borderRadius: "var(--r-md, 8px)",
        background: selected ? "var(--bg-3)" : "var(--bg-2)",
        cursor: "pointer",
        minHeight: 44,
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-mute)",
          flex: "none",
          width: 48,
        }}
      >
        {shortDate(cast.cast_at)}
      </span>
      <span
        data-faces
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12.5,
          color: "var(--ink-soft)",
          flex: "none",
          letterSpacing: "0.08em",
        }}
      >
        {cast.faces.join(" ")}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-mute)",
          flex: "none",
        }}
      >
        = {cast.sum}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: "var(--font-serif)",
          fontSize: 13.5,
          color: "var(--ink)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {cast.oracle.god_english}
        {cast.question ? ` · ${cast.question}` : ""}
      </span>
      {cast.simulated ? <SimulatedChip /> : null}
      <span
        data-valence={cast.oracle.valence}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: tone.soft,
          color: tone.color,
          flex: "none",
        }}
      >
        <ValenceGlyph glyph={tone.glyph} />
      </span>
    </button>
  );
}
