/**
 * The keeping sheet — mood, body, a note — offered AFTER a practice is marked.
 *
 * The phone's rule is "write first, offer the sheet after, never gate the
 * mark": the observance is already recorded when this opens, so closing it
 * without a word simply leaves the mark as it stands. Keeping here amends the
 * observance already written. Mood and body are the phone's five points.
 */

import { type CSSProperties, useEffect, useRef, useState } from "react";

import { Button } from "../Button/Button.js";
import { BODY_LABELS, MOOD_LABELS } from "./observance.js";

export interface KeepingValues {
  /** 1..5 or null. */
  mood: number | null;
  /** 1..5 or null. */
  body: number | null;
  note: string;
}

export interface KeepingSheetProps {
  /** What was kept, for the heading — e.g. "Moonrise" or a rite's name. */
  title: string;
  subtitle?: string;
  onKeep: (values: KeepingValues) => void;
  onClose: () => void;
  busy?: boolean;
}

const SCALE_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 6,
};

function Scale({
  labels,
  value,
  onChange,
  name,
}: {
  labels: readonly string[];
  value: number | null;
  onChange: (v: number | null) => void;
  name: string;
}) {
  return (
    <div role="group" aria-label={name} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {labels.slice(1).map((label, i) => {
        const point = i + 1;
        const active = value === point;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : point)}
            style={{
              flex: "1 1 auto",
              padding: "7px 10px",
              borderRadius: 999,
              border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
              background: active ? "var(--accent-soft)" : "var(--bg-2)",
              color: active ? "var(--ink)" : "var(--ink-soft)",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function KeepingSheet({ title, subtitle, onKeep, onClose, busy }: KeepingSheetProps) {
  const [mood, setMood] = useState<number | null>(null);
  const [body, setBody] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  // Trap focus in on open, and let Escape close (the mark is already kept).
  useEffect(() => {
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      // The backdrop. Clicking it dismisses — the mark stands regardless.
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--ink) 45%, transparent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1000,
      }}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop stop-propagation; Escape closes the dialog. */}
      <div
        ref={cardRef}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: dialog receives focus on open.
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Keep ${title}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 100%)",
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          padding: 20,
          boxShadow: "0 12px 40px color-mix(in srgb, var(--ink) 25%, transparent)",
        }}
      >
        <h2
          style={{
            margin: "0 0 2px",
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 19,
            color: "var(--ink)",
          }}
        >
          {title}
        </h2>
        <p style={{ margin: "0 0 16px", fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)" }}>
          {subtitle ?? "Kept. Add how it was, if you like."}
        </p>

        <div style={{ marginBottom: 14 }}>
          <div style={SCALE_LABEL}>Mood</div>
          <Scale labels={MOOD_LABELS} value={mood} onChange={setMood} name="Mood" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={SCALE_LABEL}>Body</div>
          <Scale labels={BODY_LABELS} value={body} onChange={setBody} name="Body" />
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={SCALE_LABEL}>Note</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What came of it…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              border: "1px solid var(--line)",
              borderRadius: "var(--r-sm, 6px)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="quiet" onClick={onClose}>
            Skip
          </Button>
          <Button variant="primary" onClick={() => onKeep({ mood, body, note })} loading={busy}>
            Keep
          </Button>
        </div>
      </div>
    </div>
  );
}
