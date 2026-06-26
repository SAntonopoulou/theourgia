/**
 * ICalFeedSurface — H07 §S3 surface 21 (Cluster C close-out).
 *
 * An iCal feed exposing the practitioner's calendar to any external
 * client (Google · Apple · Thunderbird · Fastmail …).
 *
 * Honesty + H07 rules wired:
 *   • Sealed entries are EXCLUDED ENTIRELY from the feed. A day
 *     with sealed work surfaces as a single "N sealed entries
 *     today" marker — count only. The notice copy is verbatim:
 *       "Sealed entries never appear in the feed — even a private
 *        one. A day with sealed work shows a single 'N sealed
 *        entries today' marker, count only."
 *   • Visibility radios show only Private + Public. Private is the
 *     default. The note on each is verbatim from the .dc.html.
 *   • The feed URL renders in --font-mono + --ink-soft. The
 *     Regenerate URL action is a quiet --ink-mute link — never a
 *     --danger button. (Rotation is consequential but not
 *     destructive — old clients simply stop receiving updates.)
 *   • "Connected calendars" stat is quiet (--ink-mute body +
 *     --ink-soft number). No play-counts / leaderboards.
 *   • Includes is a checkbox set with verbatim labels.
 */

import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useMemo,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type ICalIncludeKey =
  | "resh"
  | "workings"
  | "pilgrimage"
  | "lunar"
  | "hours"
  | "custom";

export type ICalVisibility = "private" | "public";

export interface ICalIncludeDef {
  id: ICalIncludeKey;
  label: string;
  default: boolean;
}

export const ICAL_INCLUDES: ICalIncludeDef[] = [
  { id: "resh", label: "Daily Practice reminders", default: true },
  { id: "workings", label: "Working entries", default: true },
  {
    id: "pilgrimage",
    label: "Pilgrimage & sacred-site anniversaries",
    default: false,
  },
  { id: "lunar", label: "Lunar events · full & new moons", default: true },
  { id: "hours", label: "Planetary hour markers", default: false },
  { id: "custom", label: "Custom · cron-like syntax", default: false },
];

export interface ICalFeedRecord {
  feed_name: string;
  includes: Record<ICalIncludeKey, boolean>;
  visibility: ICalVisibility;
  /** A fully-rendered feed URL. Format: webcal://… */
  feed_url: string;
  /** Connected clients in the last 30 days. */
  connected_count: number;
}

export interface ICalFeedSurfaceProps {
  record: ICalFeedRecord;
  onChangeName?: (name: string) => void;
  onToggleInclude?: (id: ICalIncludeKey, next: boolean) => void;
  onChangeVisibility?: (v: ICalVisibility) => void;
  onCopyUrl?: () => void;
  onRegenerate?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ── Glyphs ────────────────────────────────────────────────────────

function CheckGlyph(): ReactElement {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent-ink)"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}

function CopyGlyph(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={9} y={9} width={11} height={11} rx={2} />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function SealGlyph(): ReactElement {
  return (
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
      <rect x={5} y={11} width={14} height={9} rx={2} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const SECTION_LABEL: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 7,
};

const SECTION_HEADER: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  margin: "0 0 14px",
};

const SECTION_WRAP: CSSProperties = {
  paddingBottom: 24,
  borderBottom: "1px solid var(--line)",
  marginBottom: 24,
};

const checkbox = (on: boolean): CSSProperties => ({
  width: 19,
  height: 19,
  borderRadius: 5,
  border: `1px solid ${on ? "var(--accent)" : "var(--line-2)"}`,
  background: on ? "var(--accent)" : "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
  marginTop: 1,
});

const radioStyle = (on: boolean): CSSProperties => ({
  width: 18,
  height: 18,
  borderRadius: "50%",
  border: `1px solid ${on ? "var(--accent)" : "var(--line-2)"}`,
  background: on ? "var(--accent)" : "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
  marginTop: 1,
});

// ── Surface ───────────────────────────────────────────────────────

const VIS_DEFS: { id: ICalVisibility; label: string; note: string }[] = [
  {
    id: "private",
    label: "Private",
    note: "Requires an authenticated URL — only you can subscribe.",
  },
  {
    id: "public",
    label: "Public",
    note: "Anyone with the URL can subscribe.",
  },
];

export function ICalFeedSurface({
  record,
  onChangeName,
  onToggleInclude,
  onChangeVisibility,
  onCopyUrl,
  onRegenerate,
  className,
  style,
}: ICalFeedSurfaceProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    onCopyUrl?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopyUrl]);

  const includes = useMemo(
    () =>
      ICAL_INCLUDES.map((def) => ({
        ...def,
        on: record.includes[def.id] ?? def.default,
      })),
    [record.includes],
  );

  return (
    <div
      data-component="ical-feed-surface"
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "13px 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
            }}
          >
            Calendar feed
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            An iCal feed of your practice, for any external calendar.
          </div>
        </div>
      </header>

      <main
        className="scroll"
        style={{ overflowY: "auto", minHeight: 0, padding: "30px 26px 60px" }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Feed name */}
          <div style={{ marginBottom: 24 }}>
            <label style={SECTION_LABEL} htmlFor="ical-feed-name">
              Feed name
            </label>
            <input
              id="ical-feed-name"
              data-ical-name
              type="text"
              value={record.feed_name}
              onChange={(e) => onChangeName?.(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 13px",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontSize: 16,
              }}
            />
          </div>

          {/* Includes */}
          <div style={SECTION_WRAP}>
            <h2 style={SECTION_HEADER}>What to include</h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 11 }}
            >
              {includes.map((i) => (
                <label
                  key={i.id}
                  data-ical-include={i.id}
                  data-on={i.on}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 11,
                    cursor: "pointer",
                  }}
                >
                  <span style={checkbox(i.on)}>{i.on ? <CheckGlyph /> : null}</span>
                  <input
                    type="checkbox"
                    checked={i.on}
                    onChange={(e) =>
                      onToggleInclude?.(i.id, e.target.checked)
                    }
                    style={{
                      position: "absolute",
                      opacity: 0,
                      pointerEvents: "none",
                    }}
                    aria-label={i.label}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 15,
                      color: "var(--ink)",
                    }}
                  >
                    {i.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div style={SECTION_WRAP}>
            <h2 style={SECTION_HEADER}>Visibility</h2>
            <div
              role="radiogroup"
              aria-label="Visibility"
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {VIS_DEFS.map((v) => {
                const on = v.id === record.visibility;
                return (
                  <label
                    key={v.id}
                    data-ical-visibility={v.id}
                    data-on={on}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 11,
                      cursor: "pointer",
                    }}
                  >
                    <span style={radioStyle(on)}>
                      {on ? (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "var(--accent-ink)",
                          }}
                        />
                      ) : null}
                    </span>
                    <input
                      type="radio"
                      name="ical-visibility"
                      checked={on}
                      onChange={() => onChangeVisibility?.(v.id)}
                      style={{
                        position: "absolute",
                        opacity: 0,
                        pointerEvents: "none",
                      }}
                      aria-label={v.label}
                    />
                    <span>
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 15,
                          color: "var(--ink)",
                        }}
                      >
                        {v.label}
                      </span>
                      <br />
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11.5,
                          color: "var(--ink-mute)",
                        }}
                      >
                        {v.note}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Feed URL */}
          <div style={SECTION_WRAP}>
            <h2 style={SECTION_HEADER}>Feed URL</h2>
            <div
              data-ical-url-row
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                overflow: "hidden",
                marginBottom: 10,
              }}
            >
              <span
                data-ical-url
                style={{
                  flex: 1,
                  padding: "11px 13px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                  color: "var(--ink-soft)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {record.feed_url}
              </span>
              <button
                type="button"
                data-ical-copy
                onClick={handleCopy}
                style={{
                  padding: "11px 14px",
                  borderLeft: "1px solid var(--line-2)",
                  color: "var(--ink-soft)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <CopyGlyph />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              data-ical-regenerate
              onClick={onRegenerate}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              Regenerate URL
            </button>
          </div>

          {/* Sealed notice */}
          <div
            data-ical-sealed-notice
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "13px 15px",
              border: "1px solid var(--seal-border)",
              borderRadius: "var(--r-md)",
              background: "var(--seal-soft)",
              marginBottom: 24,
            }}
          >
            <span
              style={{
                display: "flex",
                color: "var(--seal)",
                flex: "none",
                marginTop: 1,
              }}
              aria-hidden="true"
            >
              <SealGlyph />
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-soft)",
                lineHeight: 1.45,
              }}
            >
              Sealed entries never appear in the feed — even a private one. A
              day with sealed work shows a single "N sealed entries today"
              marker, count only.
            </span>
          </div>

          {/* Connected count */}
          <div data-ical-connected>
            <h2 style={SECTION_HEADER}>Connected calendars</h2>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-mute)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--ink-soft)",
                }}
              >
                {record.connected_count}
              </span>{" "}
              clients subscribed in the last 30 days
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
