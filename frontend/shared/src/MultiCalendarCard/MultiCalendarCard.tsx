/**
 * MultiCalendarCard — collapsible multi-calendar widget for the Today
 * landing surface (and the Calendar settings page).
 *
 * Per `Theourgia Today Widgets.dc.html`. Family-grouped rows
 * (solar → lunisolar → lunar → ritual), each row a button that
 * expands to show extras (key/value pairs) and an italic source note.
 * Includes loading skeleton, empty, and error states.
 *
 * Calendar *names* localise to the active locale ("Hebrew" → "עברית");
 * "Thelemic" stays "Thelemic" in every locale — Crowley's coinage
 * is a proper noun. The component takes pre-localised names from
 * the caller; this primitive does not own translation.
 */

import {
  type CSSProperties,
  type ReactNode,
  useState,
} from "react";

export type CalendarFamily = "solar" | "lunisolar" | "lunar" | "ritual";

const FAMILY_COLOR: Record<CalendarFamily, string> = {
  solar: "var(--fam-solar)",
  lunisolar: "var(--fam-lunisolar)",
  lunar: "var(--fam-lunar)",
  ritual: "var(--fam-ritual)",
};

const FAMILY_RANK: Record<CalendarFamily, number> = {
  solar: 0,
  lunisolar: 1,
  lunar: 2,
  ritual: 3,
};

export interface CalendarExtra {
  k: string;
  v: string;
}

export interface CalendarEntry {
  id: string;
  name: string;
  family: CalendarFamily;
  /** Default body — used by plain calendars (Gregorian / Julian). */
  longForm?: string;
  /** Ritual calendars (Thelemic) split the body into a 'primary' and
   *  'secondary' span ("Anno V∶xiii" + "· EV 2026"). */
  primary?: string;
  secondary?: string;
  /** RTL Hebrew rendering uses the --font-hebrew token and dir="rtl". */
  isHebrew?: boolean;
  extras?: CalendarExtra[];
  sourceNote?: string;
}

export type MultiCalendarState = "normal" | "loading" | "empty" | "error";

export interface MultiCalendarCardProps {
  calendars: CalendarEntry[];
  state?: MultiCalendarState;
  /** Initial expanded ids (controlled by caller if `expanded` is set). */
  defaultExpanded?: string[];
  /** If provided, makes expansion controlled. */
  expanded?: string[];
  onExpandedChange?: (next: string[]) => void;
  /** Render slot for the footer (e.g. "Enable more in Settings →"). */
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const cardShell: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg, 14px)",
  background: "var(--bg-2)",
  overflow: "hidden",
};

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        flex: "none",
        color: "var(--ink-mute)",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CalendarRow({
  entry,
  open,
  onToggle,
}: {
  entry: CalendarEntry;
  open: boolean;
  onToggle: () => void;
}) {
  const isRitual = entry.family === "ritual";
  const body = isRitual ? (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 9,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 17,
          color: "var(--ink)",
        }}
      >
        {entry.primary}
      </span>
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
        }}
      >
        {entry.secondary}
      </span>
    </div>
  ) : entry.isHebrew ? (
    <div
      dir="rtl"
      style={{
        fontFamily: "var(--font-hebrew)",
        fontSize: 16,
        color: "var(--ink)",
        textAlign: "right",
      }}
    >
      {entry.longForm}
    </div>
  ) : (
    <div
      style={{
        fontFamily: "var(--font-serif)",
        fontSize: 15,
        color: "var(--ink)",
      }}
    >
      {entry.longForm}
    </div>
  );

  return (
    <div
      data-calendar-id={entry.id}
      data-calendar-family={entry.family}
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "13px 16px",
          textAlign: "left",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: FAMILY_COLOR[entry.family],
            flex: "none",
          }}
        />
        <div style={{ flex: "none", width: 78 }}>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              color: "var(--ink)",
            }}
          >
            {entry.name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 9.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            {entry.family}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>{body}</div>
        <ChevronDown open={open} />
      </button>

      {open && (entry.extras?.length || entry.sourceNote) ? (
        <div
          style={{
            padding: "0 16px 14px 50px",
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          {entry.extras?.map((e) => (
            <div key={e.k} style={{ display: "flex", gap: 10 }}>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                  width: 96,
                  flex: "none",
                }}
              >
                {e.k}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-soft)",
                  flex: 1,
                }}
              >
                {e.v}
              </span>
            </div>
          ))}
          {entry.sourceNote ? (
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                fontStyle: "italic",
                marginTop: 2,
                paddingTop: 7,
                borderTop: "1px solid var(--line)",
              }}
            >
              {entry.sourceNote}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 13,
            padding: "15px 16px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span
            className="skel"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--bg-3)",
            }}
          />
          <span
            className="skel"
            style={{
              width: 64,
              height: 13,
              borderRadius: 3,
              background: "var(--bg-3)",
            }}
          />
          <span
            className="skel"
            style={{
              flex: 1,
              height: 13,
              borderRadius: 3,
              background: "var(--bg-3)",
            }}
          />
        </div>
      ))}
    </>
  );
}

function EmptyState({ settingsLink }: { settingsLink?: ReactNode }) {
  return (
    <div style={{ padding: "30px 24px", textAlign: "center" }}>
      <svg
        aria-hidden="true"
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--ink-mute)"
        strokeWidth={1.4}
        style={{ marginBottom: 8 }}
      >
        <rect x="3" y="4.5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 2.5v4M16 2.5v4" />
      </svg>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>
        No calendars enabled
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-soft)",
          marginTop: 4,
          maxWidth: 280,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Choose which calendars appear here from your settings.
      </div>
      {settingsLink ? <div style={{ marginTop: 14 }}>{settingsLink}</div> : null}
    </div>
  );
}

function ErrorBanner() {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        gap: 11,
        padding: "16px 18px",
        background: "color-mix(in srgb, var(--danger) 8%, var(--bg-2))",
        borderLeftWidth: 3,
        borderLeftStyle: "solid",
        borderLeftColor: "var(--danger)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-glyph, var(--font-serif))",
          fontSize: 16,
          color: "var(--danger)",
          flex: "none",
        }}
      >
        ⚠
      </span>
      <div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            color: "var(--ink)",
          }}
        >
          Calendar service unreachable
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-soft)",
            marginTop: 1,
          }}
        >
          Your dates will reappear once the connection returns.
        </div>
      </div>
    </div>
  );
}

export function MultiCalendarCard({
  calendars,
  state = "normal",
  defaultExpanded,
  expanded: controlledExpanded,
  onExpandedChange,
  footer,
  className,
  style,
}: MultiCalendarCardProps) {
  const [uncontrolled, setUncontrolled] = useState<string[]>(
    defaultExpanded ?? [],
  );
  const expanded = controlledExpanded ?? uncontrolled;
  const setExpanded = (next: string[]) => {
    if (controlledExpanded === undefined) setUncontrolled(next);
    onExpandedChange?.(next);
  };

  const ordered = [...calendars].sort(
    (a, b) => FAMILY_RANK[a.family] - FAMILY_RANK[b.family],
  );

  return (
    <div
      className={className}
      data-component="multi-calendar-card"
      data-state={state}
      style={{ ...cardShell, ...style }}
    >
      {state === "normal" ? (
        <>
          {ordered.map((entry) => {
            const open = expanded.includes(entry.id);
            return (
              <CalendarRow
                key={entry.id}
                entry={entry}
                open={open}
                onToggle={() =>
                  setExpanded(
                    open
                      ? expanded.filter((id) => id !== entry.id)
                      : [...expanded, entry.id],
                  )
                }
              />
            );
          })}
          {footer ? (
            <div
              style={{
                padding: "11px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {footer}
            </div>
          ) : null}
        </>
      ) : null}

      {state === "loading" ? <LoadingSkeleton count={4} /> : null}
      {state === "empty" ? <EmptyState settingsLink={footer} /> : null}
      {state === "error" ? <ErrorBanner /> : null}
    </div>
  );
}
