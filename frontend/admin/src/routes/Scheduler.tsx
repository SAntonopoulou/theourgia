/**
 * Scheduler admin — time-released content queue + tradition-date picker.
 *
 * Port of ``Theourgia Scheduler.dc.html``. Per
 * ``agent_onboarding.md §`` — polymorphic queue across entries, posts,
 * newsletter issues, publications. The by-date / by-tradition toggle
 * resolves Solstice / Beltane / planetary-hour symbols to real dates
 * via §10.7 ephemeris (real ② / ③ when the engine ships).
 *
 * Content-type color tokens are scoped locally on `.scheduler-root` —
 * `--c-post`, `--c-news`, `--c-pub`, `--c-course` — until they move
 * into the shared layer.
 */

import { ConfirmDialog, useTopbar } from "@theourgia/shared";
import { type CSSProperties, useState } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

type View = "queue" | "calendar";
type ScheduleMode = "date" | "tradition";
type Tradition = "solstice" | "fullmoon" | "lammas" | "beltane";

interface QueueRow {
  id: string;
  type: "newsletter" | "post" | "publication";
  typeLabel: string;
  typeColor: string;
  day: string;
  month: string;
  title: string;
  meta: string;
  traditionAnchor?: { glyph: string; label: string };
}

const QUEUE: QueueRow[] = [
  {
    id: "newsletter-7",
    type: "newsletter",
    typeLabel: "Newsletter",
    typeColor: "var(--c-news)",
    day: "21",
    month: "Jun",
    title: "Newsletter №7 — the Solstice issue",
    meta: "12:00 · Subscribers",
  },
  {
    id: "liber-resh",
    type: "post",
    typeLabel: "Blog post",
    typeColor: "var(--c-post)",
    day: "25",
    month: "Jun",
    title: "Liber Resh — a year charted",
    meta: "18:00 · Network · as Frater Sub Rosā",
  },
  {
    id: "equinox-essay",
    type: "post",
    typeLabel: "Blog post",
    typeColor: "var(--c-post)",
    day: "22",
    month: "Sep",
    title: "On equilibrium, and the scales of Maat",
    meta: "auto-dated",
    traditionAnchor: { glyph: "♎", label: "Autumn Equinox" },
  },
  {
    id: "bornless",
    type: "publication",
    typeLabel: "Publication",
    typeColor: "var(--c-pub)",
    day: "01",
    month: "May ’27",
    title: "The Bornless Working — a practical edition",
    meta: "",
    traditionAnchor: { glyph: "🜂", label: "Beltane 2027" },
  },
];

interface CurriculumStep {
  number: string;
  title: string;
  status: "released" | "next" | "scheduled";
  statusLabel: string;
}

const CURRICULUM: CurriculumStep[] = [
  { number: "I", title: "The Foundation of the Temple", status: "released", statusLabel: "Released" },
  { number: "II", title: "The Lesser Banishing", status: "released", statusLabel: "Released" },
  { number: "III", title: "The Middle Pillar", status: "next", statusLabel: "Unlocks Mon 23 Jun" },
  { number: "IV", title: "The Vision of the Sphere", status: "scheduled", statusLabel: "30 Jun" },
  { number: "V–VII", title: "The Higher Rungs", status: "scheduled", statusLabel: "Jul" },
];

const TRADITION_OPTIONS: { key: Tradition; glyph: string; label: string; resolvesTo: string; hour: string }[] = [
  { key: "solstice", glyph: "☀", label: "Summer Solstice", resolvesTo: "Sat 21 June 2026 · 09:30", hour: "Hour of the Sun · planetary" },
  { key: "fullmoon", glyph: "☽", label: "Next Full Moon", resolvesTo: "Tue 21 July 2026 · 14:46", hour: "Lunar zenith · Capricorn" },
  { key: "lammas", glyph: "🜃", label: "Lammas · Lughnasadh", resolvesTo: "Sat 1 Aug 2026 · sunrise", hour: "Cross-quarter · first harvest" },
  { key: "beltane", glyph: "🜂", label: "Beltane 2027", resolvesTo: "Sat 1 May 2027 · sunrise", hour: "Cross-quarter · fire returns" },
];

function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const make = (v: View): CSSProperties => ({
    padding: "5px 11px",
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    color: v === value ? "var(--ink)" : "var(--ink-mute)",
    background: v === value ? "var(--accent-soft)" : "transparent",
    border: "none",
    cursor: "pointer",
  });
  return (
    <div role="group" aria-label="View" style={{ display: "flex", gap: 2, padding: 3, border: `1px solid ${LINE}`, borderRadius: 8, background: "var(--bg-2)" }}>
      <button type="button" aria-pressed={value === "queue"} onClick={() => onChange("queue")} style={make("queue")}>Queue</button>
      <button type="button" aria-pressed={value === "calendar"} onClick={() => onChange("calendar")} style={make("calendar")}>Calendar</button>
    </div>
  );
}

export function Scheduler() {
  const [view, setView] = useState<View>("queue");
  const [schedMode, setSchedMode] = useState<ScheduleMode>("tradition");
  const [trad, setTrad] = useState<Tradition>("solstice");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);

  useTopbar(
    () => ({
      title: "Scheduler",
      subtitle: `${QUEUE.length} queued · next release in 2 days`,
      before: <ViewToggle value={view} onChange={setView} />,
      after: (
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Schedule new
        </button>
      ),
    }),
    [view],
  );

  const resolved = TRADITION_OPTIONS.find((t) => t.key === trad)!;

  return (
    <main
      className="scheduler-root scroll"
      style={{
        overflowY: "auto",
        minHeight: 0,
        padding: "24px 28px",
        // Per Theourgia Scheduler.dc.html line 24:
        //   --c-post:#CDBE9E (= --c-journal — parchment ivory)
        //   --c-news:#7E91CE (= --c-divination — cool blue)
        //   --c-pub:#C2554A  (= --c-working — red)
        //   --c-course:#6BA892 (= --c-synchronicity — green)
        ["--c-post" as string]: "var(--c-journal)",
        ["--c-news" as string]: "var(--c-divination)",
        ["--c-pub" as string]: "var(--c-working)",
        ["--c-course" as string]: "var(--c-synchronicity)",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 24 }}>

        {/* LEFT */}
        <div style={{ flex: "3 1 500px", minWidth: 0 }}>
          {view === "queue" ? (
            <>
              {/* Next release feature */}
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)", margin: "0 0 12px" }}>
                Next out · in 2 days
              </div>
              <div style={{ border: `1px solid ${LINE_2}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: "22px 24px", marginBottom: 30 }}>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-post)" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--c-post)" }} />
                        Blog post · essay
                      </span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}>as Theophrastos</span>
                    </div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 25, lineHeight: 1.12, margin: "0 0 12px" }}>
                      On the discipline of the magical record
                    </h2>
                    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)", marginBottom: 18 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3.5" y="5" width="17" height="15" rx="2" />
                          <path d="M3.5 9.5h17M8 3v4M16 3v4" />
                        </svg>
                        Sat 21 June · 09:00
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontFamily: "var(--font-glyph)", color: "var(--accent)" }}>☀</span>
                        Summer Solstice
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mute)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                        </svg>
                        Public
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => setReleaseOpen(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
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
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 3l14 9-14 9z" />
                        </svg>
                        Release now
                      </button>
                      <button type="button" style={secondaryBtn}>Edit</button>
                      <button type="button" style={secondaryBtn}>Reschedule</button>
                      <button
                        type="button"
                        onClick={() => setCancelOpen(true)}
                        style={{
                          padding: "9px 14px",
                          borderRadius: "var(--r-md)",
                          fontFamily: "var(--font-ui)",
                          fontSize: 13,
                          color: "var(--ink-mute)",
                          marginLeft: "auto",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)"; }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <div style={{ width: 108, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: `1px solid ${LINE}`, paddingLeft: 18 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 34, color: "var(--accent)", lineHeight: 1 }}>2</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-mute)", marginTop: 4 }}>days left</div>
                  </div>
                </div>
              </div>

              {/* Queue list */}
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)", margin: "0 0 12px" }}>
                Scheduled
              </div>
              <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--bg-2)", marginBottom: 30 }}>
                {QUEUE.map((row, i) => (
                  <div
                    key={row.id}
                    style={{
                      display: "flex",
                      gap: 15,
                      padding: "15px 18px",
                      borderBottom: i < QUEUE.length - 1 ? `1px solid ${LINE}` : "none",
                      alignItems: "center",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-3)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    <span style={{ width: 3, alignSelf: "stretch", borderRadius: 3, background: row.typeColor, flex: "none" }} aria-hidden="true" />
                    <div style={{ width: 54, flex: "none", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 21, lineHeight: 1 }}>{row.day}</div>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, textTransform: "uppercase", color: "var(--ink-mute)" }}>{row.month}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: row.typeColor }}>{row.typeLabel}</span>
                        {row.traditionAnchor ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--accent)" }}>
                            <span style={{ fontFamily: "var(--font-glyph)" }}>{row.traditionAnchor.glyph}</span>
                            {row.traditionAnchor.label} {row.meta ? `· ${row.meta}` : ""}
                          </span>
                        ) : (
                          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)" }}>{row.meta}</span>
                        )}
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>{row.title}</div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Manage ${row.title}`}
                      style={{
                        width: 32,
                        height: 32,
                        border: `1px solid ${LINE}`,
                        borderRadius: "var(--r-sm)",
                        color: "var(--ink-mute)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)"; }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                        <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
                        <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
                        <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Curriculum unlock */}
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)", margin: "0 0 12px" }}>
                Curriculum · timed release
              </div>
              <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 13, marginBottom: 18 }}>
                  <span style={{ width: 38, height: 38, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--c-course) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-course)", flex: "none" }} aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 5.5h11a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4z" />
                      <path d="M20 5.5h-3a2 2 0 0 0-2 2V18" />
                    </svg>
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 19, lineHeight: 1.15 }}>The Ladder of Ascent — a seven-part course</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)", marginTop: 3 }}>
                      For subscribers · one rung unlocks each Monday
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-soft)", flex: "none" }}>3 / 7</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--bg-sunk)", overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ width: "43%", height: "100%", background: "var(--c-course)" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {CURRICULUM.map((step) => {
                    const isNext = step.status === "next";
                    const isReleased = step.status === "released";
                    const labelColor = isNext ? "var(--accent)" : "var(--ink-mute)";
                    const wrapperStyle: CSSProperties = {
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "8px 0",
                      borderTop: isNext ? `1px solid ${LINE}` : "none",
                      borderBottom: isNext ? `1px solid ${LINE}` : "none",
                    };
                    return (
                      <div key={step.number} style={wrapperStyle}>
                        {isReleased ? (
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--c-course)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M8.5 12.5l2.5 2.5 4.5-5" />
                          </svg>
                        ) : isNext ? (
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7.5v5" />
                            <circle cx="12" cy="15.5" r=".4" fill="currentColor" />
                          </svg>
                        ) : (
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mute)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true">
                            <rect x="5" y="11" width="14" height="9" rx="1.5" />
                            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                          </svg>
                        )}
                        <span style={{ flex: 1, fontFamily: isNext ? "var(--font-display)" : "var(--font-serif)", fontSize: isNext ? 15.5 : 15, color: isReleased ? "var(--ink-soft)" : isNext ? "var(--ink)" : "var(--ink-mute)" }}>
                          {step.number} · {step.title}
                        </span>
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: labelColor }}>{step.statusLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>June 2026</h2>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" aria-label="Previous month" style={navBtn}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></button>
                  <button type="button" aria-label="Next month" style={navBtn}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg></button>
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                  textAlign: "center",
                  padding: "40px 0",
                  fontStyle: "italic",
                }}
              >
                The month grid lands with the ephemeris substrate — calendar cells render content dots from the queue
                + tradition-anchor glyphs computed live. Queue view above is the working surface for now.
              </div>
              <div style={{ display: "flex", gap: 18, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${LINE}`, fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)", flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--c-post)" }} />Post</span>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--c-news)" }} />Newsletter</span>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid var(--accent)" }} />Today</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: tradition-date picker */}
        <aside style={{ flex: "1 1 290px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: "var(--bg-2)", border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", padding: "18px 20px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 6 }}>Schedule a release</div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, lineHeight: 1.5, color: "var(--ink-mute)", margin: "0 0 14px" }}>
              Pick a clock date, or a date in the tradition — Theourgia computes the rest.
            </p>

            <div role="group" aria-label="Schedule mode" style={{ display: "flex", gap: 2, padding: 3, border: `1px solid ${LINE}`, borderRadius: 8, background: "var(--bg)", marginBottom: 16 }}>
              {[
                { key: "date" as const, label: "By date" },
                { key: "tradition" as const, label: "By tradition date" },
              ].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={schedMode === m.key}
                  onClick={() => setSchedMode(m.key)}
                  style={{
                    padding: "5px 11px",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: schedMode === m.key ? "var(--ink)" : "var(--ink-mute)",
                    background: schedMode === m.key ? "var(--accent-soft)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {schedMode === "date" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)", marginBottom: 6 }}>Date & time</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", border: `1px solid ${LINE_2}`, borderRadius: "var(--r-md)", background: "var(--bg)" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mute)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink)" }}>21 Jun 2026 · 09:00</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)", marginBottom: 6 }}>Timezone</div>
                  <div style={{ padding: "10px 12px", border: `1px solid ${LINE}`, borderRadius: "var(--r-md)", background: "var(--bg)", fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>
                    Europe/Athens · GMT+3
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)", marginBottom: 8 }}>Choose a sacred date</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {TRADITION_OPTIONS.map((opt) => {
                    const active = trad === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        data-trad
                        aria-pressed={active ? "true" : "false"}
                        onClick={() => setTrad(opt.key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 11px",
                          border: `1px solid ${active ? "var(--accent)" : LINE}`,
                          borderRadius: "var(--r-md)",
                          background: active ? "var(--accent-soft)" : "var(--bg)",
                          textAlign: "left",
                          cursor: "pointer",
                          color: "inherit",
                          fontFamily: "inherit",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-glyph)", color: "var(--accent)", fontSize: opt.key === "lammas" || opt.key === "beltane" ? 14 : 15, flex: "none" }}>{opt.glyph}</span>
                        <span style={{ flex: 1, fontFamily: "var(--font-serif)", fontSize: 14.5, color: "var(--ink)" }}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ padding: "13px 15px", border: "1px solid var(--accent)", borderRadius: "var(--r-md)", background: "var(--accent-soft)" }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 5 }}>Resolves to</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)", lineHeight: 1.2 }}>{resolved.resolvesTo}</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-soft)", marginTop: 3 }}>{resolved.hour}</div>
                </div>
              </div>
            )}

            <button
              type="button"
              style={{
                width: "100%",
                marginTop: 16,
                padding: 10,
                borderRadius: "var(--r-md)",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 13,
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              Add to queue
            </button>
          </div>

          <div style={{ background: "var(--bg-2)", border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", padding: "16px 20px" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }} aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, lineHeight: 1.55, color: "var(--ink-soft)", margin: 0 }}>
                Tradition dates re-compute every year. Schedule "Beltane" once and it returns each cross-quarter — no almanac needed.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={releaseOpen}
        title="Release now?"
        body="The post goes live immediately and is no longer in the queue. You can edit it after release, but the original send goes out as-is."
        confirmLabel="Release now"
        cancelLabel="Wait"
        tone="constructive"
        onConfirm={() => setReleaseOpen(false)}
        onCancel={() => setReleaseOpen(false)}
      />
      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this release?"
        body="The post stays as a draft. Re-schedule it any time."
        confirmLabel="Cancel release"
        cancelLabel="Keep scheduled"
        tone="destructive"
        onConfirm={() => setCancelOpen(false)}
        onCancel={() => setCancelOpen(false)}
      />
    </main>
  );
}

const secondaryBtn: CSSProperties = {
  padding: "9px 16px",
  borderRadius: "var(--r-md)",
  border: `1px solid ${LINE_2}`,
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  background: "transparent",
  cursor: "pointer",
};

const navBtn: CSSProperties = {
  width: 32,
  height: 32,
  border: `1px solid ${LINE_2}`,
  borderRadius: "var(--r-md)",
  color: "var(--ink-soft)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  cursor: "pointer",
};
