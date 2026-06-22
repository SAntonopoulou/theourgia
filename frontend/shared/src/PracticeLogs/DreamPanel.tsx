/**
 * DreamPanel — "On waking" composer + Recent dreams rail.
 *
 * Verbatim from `Theourgia Practice Logs.dc.html` lines 103-147.
 * The chip system distinguishes symbol (var(--accent*)) vs figure
 * (var(--div*)). The Lucid switch defaults on per design (line 127
 * aria-checked="true").
 */

import { type CSSProperties, useState } from "react";

import {
  DREAM_ADD_CHIP_LABEL,
  DREAM_CHIPS_LABEL,
  DREAM_DEFAULT_CHIPS,
  DREAM_DEFAULT_LOG,
  DREAM_DEFAULT_TEXT,
  DREAM_FELT_SENSE_DEFAULT,
  DREAM_FELT_SENSE_LABEL,
  DREAM_HEADER,
  DREAM_LUCID_DEFAULT,
  DREAM_LUCID_LABEL,
  DREAM_LUCID_PILL,
  DREAM_RECENT_EYEBROW,
  DREAM_SAVE_LABEL,
  DREAM_TEXTAREA_PLACEHOLDER,
  DREAM_TIMESTAMP,
  type DreamChip,
  type DreamChipKind,
  type DreamLogEntry,
} from "./copy.js";

const SAVE_ICON = (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 4h11l3 3v13H5zM8 4v5h7" />
  </svg>
);

const CHIP_PALETTE: Record<DreamChipKind, { border: string; color: string }> = {
  symbol: { border: "var(--accent-soft)", color: "var(--accent)" },
  figure: { border: "var(--div-soft)", color: "var(--div)" },
};

const EYEBROW_STYLE: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 8,
};

const INPUT_STYLE: CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 14,
};

export interface DreamPanelProps {
  initialText?: string;
  initialChips?: readonly DreamChip[];
  initialFeltSense?: string;
  initialLucid?: boolean;
  recent?: readonly DreamLogEntry[];
  onSave?: (payload: {
    text: string;
    chips: readonly DreamChip[];
    feltSense: string;
    lucid: boolean;
  }) => void;
  className?: string;
  style?: CSSProperties;
}

export function DreamPanel({
  initialText = DREAM_DEFAULT_TEXT,
  initialChips = DREAM_DEFAULT_CHIPS,
  initialFeltSense = DREAM_FELT_SENSE_DEFAULT,
  initialLucid = DREAM_LUCID_DEFAULT,
  recent = DREAM_DEFAULT_LOG,
  onSave,
  className,
  style,
}: DreamPanelProps) {
  const [text, setText] = useState(initialText);
  const [feltSense, setFeltSense] = useState(initialFeltSense);
  const [lucid, setLucid] = useState(initialLucid);

  const handleSave = () => {
    onSave?.({ text, chips: initialChips, feltSense, lucid });
  };

  return (
    <div
      data-component="dream-panel"
      className={`log-cols ${className ?? ""}`}
      style={{
        display: "flex",
        gap: 26,
        alignItems: "flex-start",
        ...style,
      }}
    >
      {/* Main column */}
      <div
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-lg)",
          background: "var(--bg-2)",
          padding: "22px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{ fontFamily: "var(--font-display)", fontSize: 18 }}
          >
            {DREAM_HEADER}
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            {DREAM_TIMESTAMP}
          </span>
        </div>

        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={DREAM_TEXTAREA_PLACEHOLDER}
          aria-label={DREAM_HEADER}
          data-dream-text
          style={{
            width: "100%",
            padding: "13px 15px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg)",
            color: "var(--ink)",
            fontFamily: "var(--font-serif)",
            fontSize: 16,
            lineHeight: 1.6,
            resize: "vertical",
            marginBottom: 18,
          }}
        />

        <label style={EYEBROW_STYLE}>{DREAM_CHIPS_LABEL}</label>
        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          {initialChips.map((chip) => {
            const palette = CHIP_PALETTE[chip.kind];
            return (
              <span
                key={chip.label}
                data-chip
                data-chip-kind={chip.kind}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 11px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: palette.border,
                  borderRadius: "var(--r-pill, 20px)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: palette.color,
                }}
              >
                {chip.label}
              </span>
            );
          })}
          <button
            type="button"
            data-action="add-chip"
            style={{
              padding: "5px 11px",
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-pill, 20px)",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {DREAM_ADD_CHIP_LABEL}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <label
              htmlFor="dream-felt-sense"
              style={{ ...EYEBROW_STYLE, marginBottom: 7 }}
            >
              {DREAM_FELT_SENSE_LABEL}
            </label>
            <input
              id="dream-felt-sense"
              type="text"
              value={feltSense}
              onChange={(e) => setFeltSense(e.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              alignSelf: "flex-end",
              padding: "10px 14px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              cursor: "pointer",
            }}
          >
            <button
              type="button"
              role="switch"
              aria-checked={lucid}
              data-lucid-switch
              onClick={() => setLucid((v) => !v)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 11,
                background: lucid
                  ? "var(--accent-soft)"
                  : "var(--bg-sunk)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: lucid ? "var(--accent)" : "var(--line-2)",
                position: "relative",
                flex: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 1,
                  right: lucid ? 1 : "auto",
                  left: lucid ? "auto" : 1,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: lucid ? "var(--accent)" : "var(--ink-mute)",
                }}
              />
            </button>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink)",
              }}
            >
              {DREAM_LUCID_LABEL}
            </span>
          </label>
        </div>

        <button
          type="button"
          data-action="save-dream"
          onClick={handleSave}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            cursor: "pointer",
          }}
        >
          {SAVE_ICON}
          {DREAM_SAVE_LABEL}
        </button>
      </div>

      {/* Recent rail */}
      <aside
        className="log-rail"
        style={{
          flex: "none",
          width: 300,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-lg)",
          background: "var(--bg-2)",
          padding: 20,
          alignSelf: "stretch",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            marginBottom: 12,
          }}
        >
          {DREAM_RECENT_EYEBROW}
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {recent.map((d, i) => (
            <div
              key={`${d.date}-${i}`}
              data-recent-entry
              style={{
                paddingBottom: 14,
                borderBottomWidth: i === recent.length - 1 ? 0 : 1,
                borderBottomStyle: "solid",
                borderBottomColor: "var(--line)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                  }}
                >
                  {d.date}
                </span>
                {d.lucid ? (
                  <span
                    data-lucid-pill
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 10,
                      padding: "1px 7px",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--accent-soft)",
                      borderRadius: "var(--r-pill, 20px)",
                      color: "var(--accent)",
                    }}
                  >
                    {DREAM_LUCID_PILL}
                  </span>
                ) : null}
              </div>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 14,
                  lineHeight: 1.45,
                  color: "var(--ink-soft)",
                  margin: 0,
                }}
              >
                {d.snippet}
              </p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
