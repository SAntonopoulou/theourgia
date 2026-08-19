/**
 * FestivalCalendarReference — the web reference for a tradition's calendar.
 *
 * Not a live calendar: the phone marks today against the sky. Here each
 * installed calendar is shown as reference — how its months are counted, and
 * the days it keeps, each with when in the cycle it falls and what it is for.
 */

import type { CSSProperties } from "react";

import type { FestivalCalendar, Occasion } from "./packCalendar.js";

export interface NamedCalendar {
  title: string;
  calendar: FestivalCalendar;
}

export interface FestivalCalendarReferenceProps {
  calendars: readonly NamedCalendar[];
  className?: string;
  style?: CSSProperties;
}

function OccasionCard({ occasion }: { occasion: Occasion }) {
  return (
    <li
      style={{
        listStyle: "none",
        marginBottom: 14,
        paddingBottom: 12,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{occasion.name}</span>
        {occasion.when && (
          <span
            style={{
              fontSize: 11.5,
              color: "var(--accent)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: "1px 8px",
              whiteSpace: "nowrap",
            }}
          >
            {occasion.when}
          </span>
        )}
        {occasion.significator && (
          <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{occasion.significator}</span>
        )}
      </div>
      {occasion.summary && (
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink)", margin: "6px 0 0" }}>
          {occasion.summary}
        </p>
      )}
      {occasion.note && (
        <p
          style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-mute)", margin: "4px 0 0" }}
        >
          {occasion.note}
        </p>
      )}
      {occasion.tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {occasion.tags.map((tag) => (
            <span key={tag} style={{ fontSize: 11, color: "var(--ink-mute)" }}>
              #{tag}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

function CalendarSection({ title, calendar }: NamedCalendar) {
  const reckoning = calendar.reckonings[0];
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: "0 0 6px" }}>
        {title}
      </h2>

      {reckoning && reckoning.monthNames.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {reckoning.detail && (
            <p
              style={{
                fontSize: 12.5,
                lineHeight: 1.6,
                color: "var(--ink-mute)",
                margin: "0 0 6px",
              }}
            >
              {reckoning.detail}
            </p>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {reckoning.monthNames.map((month, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: month names are a fixed ordered list and may repeat
                key={`${month}-${i}`}
                style={{
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-sm, 4px)",
                  padding: "2px 7px",
                }}
              >
                {month}
              </span>
            ))}
          </div>
        </div>
      )}

      <ul style={{ padding: 0, margin: 0 }}>
        {calendar.occasions.map((occasion) => (
          <OccasionCard key={occasion.key} occasion={occasion} />
        ))}
      </ul>
    </section>
  );
}

export function FestivalCalendarReference({
  calendars,
  className,
  style,
}: FestivalCalendarReferenceProps) {
  const withDays = calendars.filter((c) => c.calendar.occasions.length > 0);
  if (withDays.length === 0) {
    return (
      <div className={className} style={{ padding: "16px 4px", ...style }}>
        <p style={{ color: "var(--ink-mute)", fontSize: 13, lineHeight: 1.6 }}>
          No calendar packs installed. Install a calendar from Packs — the Keybearers' Calendar, the
          Thelemic Calendar — and its days appear here, each with when it falls and what it is for.
          (The phone marks today against the sky; here the calendar is reference.)
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ padding: "8px 4px 40px", maxWidth: 720, margin: "0 auto", ...style }}
      className={className}
    >
      {withDays.map((c) => (
        <CalendarSection key={c.title} title={c.title} calendar={c.calendar} />
      ))}
    </div>
  );
}
