/**
 * ScryingPanel — medium picker · trance-mode link · speculum + textarea + record · past sessions.
 *
 * Verbatim from `Theourgia Divination Misc.dc.html` lines 216-252.
 * The trance-mode link uses --trance (B76 token); the audio hint
 * references the shared upload chrome (same as library quote audio
 * per B34 substrate).
 */

import { type CSSProperties, useState } from "react";

import {
  SCRY_AUDIO_HINT,
  SCRY_MEDIA_OPTIONS,
  SCRY_PAST_EYEBROW,
  SCRY_RECORD_LABEL,
  SCRY_SAVE_LABEL,
  SCRY_TEXT_PLACEHOLDER,
  SCRY_TRANCE_LABEL,
  type ScryMedium,
} from "./copy.js";
import { Speculum } from "./Speculum.js";

const MEDIUM_ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const MEDIUM_ICONS: Record<ScryMedium, React.ReactNode> = {
  mirror: (
    <svg {...MEDIUM_ICON_PROPS}>
      <circle cx="12" cy="11" r="7" />
      <path d="M9 19h6" />
    </svg>
  ),
  crystal: (
    <svg {...MEDIUM_ICON_PROPS}>
      <path d="M12 3l6 6-6 12-6-12z" />
    </svg>
  ),
  water: (
    <svg {...MEDIUM_ICON_PROPS}>
      <path d="M12 4c4 5 5 7 5 9a5 5 0 0 1-10 0c0-2 1-4 5-9z" />
    </svg>
  ),
  fire: (
    <svg {...MEDIUM_ICON_PROPS}>
      <path d="M12 3c2 4-1 5 0 8 2-1 2-3 2-3 2 2 3 4 3 6a5 5 0 0 1-10 0c0-3 3-4 5-11z" />
    </svg>
  ),
};

const MEDIUM_BUTTON_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 13px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-mute)",
  cursor: "pointer",
};

const MEDIUM_BUTTON_ON: CSSProperties = {
  ...MEDIUM_BUTTON_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

export interface ScrySessionLog {
  medium: ScryMedium;
  date: string;
  snippet: string;
}

export interface ScryingPanelProps {
  /** Initial selected medium. Defaults to 'mirror' per the mockup. */
  initialMedium?: ScryMedium;
  /** Past-sessions rail entries. */
  pastSessions?: readonly ScrySessionLog[];
  /** Optional href for the Trance-mode link (the existing
   *  Theourgia Trance Mode surface). */
  tranceHref?: string;
  onSave?: () => void;
  onRecord?: () => void;
  className?: string;
  style?: CSSProperties;
}

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

export function ScryingPanel({
  initialMedium = "mirror",
  pastSessions,
  tranceHref = "#",
  onSave,
  onRecord,
  className,
  style,
}: ScryingPanelProps) {
  const [medium, setMedium] = useState<ScryMedium>(initialMedium);
  const [vision, setVision] = useState("");

  const sessions =
    pastSessions ??
    ([
      {
        medium: "mirror" as const,
        date: "18 Jun",
        snippet:
          "A doorway with no lintel; a cold air moving outward, not in.",
      },
      {
        medium: "water" as const,
        date: "11 Jun",
        snippet:
          "Three lights beneath the surface, turning slowly widdershins.",
      },
      {
        medium: "crystal" as const,
        date: "02 Jun",
        snippet:
          "A woman's hand, holding a key the colour of old brass.",
      },
    ]);

  return (
    <div
      data-component="scrying-panel"
      className={`misc-cols${className ? ` ${className}` : ""}`}
      style={{
        display: "flex",
        gap: 26,
        alignItems: "flex-start",
        ...style,
      }}
    >
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        {/* Medium picker + trance link */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div
            role="group"
            aria-label="Speculum"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {SCRY_MEDIA_OPTIONS.map((opt) => {
              const on = medium === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={on}
                  data-medium={opt.key}
                  onClick={() => setMedium(opt.key)}
                  style={on ? MEDIUM_BUTTON_ON : MEDIUM_BUTTON_BASE}
                >
                  <span
                    style={{
                      display: "flex",
                      color: on ? "var(--accent)" : "currentColor",
                    }}
                    aria-hidden="true"
                  >
                    {MEDIUM_ICONS[opt.key]}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>

          <a
            href={tranceHref}
            data-trance-link
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--trance)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--trance)",
              textDecoration: "none",
            }}
          >
            <svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
            {SCRY_TRANCE_LABEL}
          </a>
        </div>

        {/* Speculum + capture */}
        <div
          data-speculum-frame
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-lg)",
            background:
              "radial-gradient(circle at 50% 38%, var(--bg-2), var(--bg-sunk) 70%)",
            padding: 30,
          }}
        >
          <Speculum medium={medium} />
          <div style={{ width: "100%", maxWidth: 540 }}>
            <textarea
              rows={4}
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              placeholder={SCRY_TEXT_PLACEHOLDER}
              data-vision-text
              style={{
                width: "100%",
                padding: "14px 16px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontSize: 15.5,
                lineHeight: 1.6,
                resize: "vertical",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 12,
              }}
            >
              <button
                type="button"
                onClick={onRecord}
                data-action="record"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 15px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line-2)",
                  borderRadius: "var(--r-md)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-soft)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <svg
                  width={15}
                  height={15}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
                {SCRY_RECORD_LABEL}
              </button>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                }}
              >
                {SCRY_AUDIO_HINT}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          data-action="save"
          onClick={onSave}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 18,
            padding: "9px 16px",
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
          {SCRY_SAVE_LABEL}
        </button>
      </div>

      <aside
        data-past-sessions
        className="misc-rail"
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
        <div style={{ ...EYEBROW, marginBottom: 12 }}>
          {SCRY_PAST_EYEBROW}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sessions.map((s, i) => (
            <div key={i} data-past-entry>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 3,
                }}
              >
                <span
                  style={{ display: "flex", color: "var(--ink-mute)" }}
                  aria-hidden="true"
                >
                  {MEDIUM_ICONS[s.medium]}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                  }}
                >
                  {SCRY_MEDIA_OPTIONS.find((m) => m.key === s.medium)?.label ??
                    s.medium}{" "}
                  · {s.date}
                </span>
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
                {s.snippet}
              </p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
