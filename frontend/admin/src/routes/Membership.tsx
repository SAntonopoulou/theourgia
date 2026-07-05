/**
 * Membership admin — hub officers' member management.
 *
 * Port of ``Theourgia Membership.dc.html`` against the per-component
 * ritual (see ``feedback_read_dc_html_before_building.md`` +
 * ``feedback_follow_design_thread_deep.md``):
 *
 *   · `.dc.html` read end-to-end
 *   · `agent_onboarding.md §` Theourgia Membership — admin half of a Hub:
 *     stats, petitions to read (admit/decline), degree-filtered roster
 *     with identity glyph + office + degree + standing dot, by-degree
 *     breakdown, dues/standing rail. Two ends of one flow: petitions
 *     originate on the public Hub page (Batch 14 ``/hub/[slug]``),
 *     resolve here.
 *   · `agent_data_and_components.md` — Members are **identities**, shown
 *     with the identity they present to this hub. Standing
 *     (good/dues-owing/suspended) is real state with downstream effects.
 *     Gated by **permissions** (only officers).
 *
 * Demo "Sophia" member swapped to "Aspasia" (magickal-name rule —
 * placeholder data only).
 */

import { ConfirmDialog, useTopbar } from "@theourgia/shared";
import { type CSSProperties, type ReactNode, useState } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

type Degree = "all" | "I°" | "II°" | "III°";

interface RosterRow {
  glyph: string;
  name: string;
  office: string;
  degree: "I°" | "II°" | "III°";
  standing: "Good standing" | "Dues owing" | "Suspended";
  standingTone: "success" | "warning" | "mute";
}

interface Petition {
  glyph: string;
  name: string;
  note: string;
}

// Hub roster endpoint /api/v1/hubs/{id}/members returns real data once a hub is selected; this default view stays empty.
const ROSTER: RosterRow[] = [];

// Petition endpoint /api/v1/hubs/{id}/petitions returns real data once wired; empty by default.
const PETITIONS: Petition[] = [];

function standingColor(tone: RosterRow["standingTone"]): string {
  return tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : "var(--ink-mute)";
}

function Glyph({ children, size = 32, fontSize = 14 }: { children: ReactNode; size?: number; fontSize?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--accent-soft)",
        border: `1px solid ${LINE_2}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-glyph)",
        color: "var(--accent)",
        fontSize,
        flex: "none",
      }}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function StatCard({ value, label, tone }: { value: string; label: string; tone?: "success" | "warning" }) {
  const color =
    tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : "var(--ink)";
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-md)", background: "var(--bg-2)", padding: "14px 16px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1, color }}>{value}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function DegreePill({ value, active, onClick }: { value: Degree | "I°" | "II°" | "III°" | "all"; active: boolean; onClick: () => void }) {
  const label = value === "all" ? "All" : value;
  const baseStyle: CSSProperties = {
    padding: "5px 11px",
    border: `1px solid ${active ? LINE_2 : LINE}`,
    background: active ? "var(--accent-soft)" : "transparent",
    borderRadius: 999,
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    color: active ? "var(--ink)" : "var(--ink-soft)",
    cursor: "pointer",
  };
  return (
    <button type="button" data-deg aria-pressed={active ? "true" : "false"} onClick={onClick} style={baseStyle}>
      {label}
    </button>
  );
}

function DegreeBar({ label, count, percent }: { label: string; count: number; percent: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-soft)", width: 34, flex: "none" }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 5, background: "var(--bg-sunk)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percent}%`, background: "var(--accent)" }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-mute)" }}>{count}</span>
    </div>
  );
}

export function Membership() {
  const [degree, setDegree] = useState<Degree | "I°" | "II°" | "III°" | "all">("all");
  const [decision, setDecision] = useState<{ petition: Petition; action: "admit" | "decline" } | null>(null);

  useTopbar(
    () => ({
      title: "Membership",
      subtitle: "Ordo Theurgica · Officers",
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
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Invite
        </button>
      ),
    }),
    [],
  );

  const filtered = degree === "all" ? ROSTER : ROSTER.filter((m) => m.degree === degree);

  return (
    <main className="scroll" style={{ overflowY: "auto", minHeight: 0, padding: "24px 28px 60px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 26 }}>
        <div style={{ flex: "3 1 540px", minWidth: 0 }}>

          {/* stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 26 }}>
            <StatCard value="47" label="Initiates" />
            <StatCard value="2" label="Petitions" tone="warning" />
            <StatCard value="3" label="Officers" />
            <StatCard value="41" label="In good standing" tone="success" />
          </div>

          {/* petitions */}
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 12 }}>
            Petitions to read
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 30 }}>
            {PETITIONS.map((p) => (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  border: "1px solid var(--warning)",
                  borderRadius: "var(--r-md)",
                  background: "color-mix(in srgb, var(--warning) 7%, transparent)",
                  padding: "14px 18px",
                }}
              >
                <Glyph size={38} fontSize={16}>{p.glyph}</Glyph>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{p.name}</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>{p.note}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setDecision({ petition: p, action: "decline" })}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "var(--r-sm)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-mute)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)";
                  }}
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => setDecision({ petition: p, action: "admit" })}
                  style={{
                    padding: "7px 15px",
                    borderRadius: "var(--r-sm)",
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 12.5,
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                  }}
                >
                  Admit · I°
                </button>
              </div>
            ))}
          </div>

          {/* roster */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)" }}>
              Roster
            </span>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
              <DegreePill value="all" active={degree === "all"} onClick={() => setDegree("all")} />
              <DegreePill value="III°" active={degree === "III°"} onClick={() => setDegree("III°")} />
              <DegreePill value="II°" active={degree === "II°"} onClick={() => setDegree("II°")} />
              <DegreePill value="I°" active={degree === "I°"} onClick={() => setDegree("I°")} />
            </div>
          </div>

          <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--bg-2)" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr .7fr 1fr auto",
                gap: 12,
                padding: "10px 18px",
                borderBottom: `1px solid ${LINE}`,
                background: "var(--bg-3)",
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
              }}
            >
              <span>Member</span>
              <span>Degree</span>
              <span>Standing</span>
              <span />
            </div>
            {filtered.map((m, i) => (
              <div
                key={m.name}
                className="roster-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr .7fr 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "13px 18px",
                  borderBottom: i < filtered.length - 1 ? `1px solid ${LINE}` : "none",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "var(--bg-3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                  <Glyph size={32} fontSize={14}>{m.glyph}</Glyph>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 15.5, lineHeight: 1.1, color: "var(--ink)" }}>{m.name}</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)" }}>{m.office}</div>
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-soft)" }}>{m.degree}</span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: standingColor(m.standingTone),
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: standingColor(m.standingTone) }} />
                  {m.standing}
                </span>
                <button
                  type="button"
                  aria-label={`Manage ${m.name}`}
                  style={{
                    width: 30,
                    height: 30,
                    border: `1px solid ${LINE}`,
                    borderRadius: "var(--r-sm)",
                    color: "var(--ink-mute)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)";
                  }}
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
        </div>

        {/* RIGHT RAIL */}
        <aside style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: "var(--bg-2)", border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", padding: "18px 20px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 14 }}>
              By degree
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <DegreeBar label="III°" count={8} percent={18} />
              <DegreeBar label="II°" count={15} percent={36} />
              <DegreeBar label="I°" count={24} percent={55} />
            </div>
          </div>
          <div style={{ background: "var(--bg-2)", border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", padding: "16px 20px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 11 }}>
              Dues &amp; standing
            </div>
            {[
              { label: "In good standing", value: "41", color: "var(--success)" },
              { label: "Dues owing", value: "5", color: "var(--warning)" },
              { label: "Suspended", value: "1", color: "var(--ink-mute)" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>{row.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: row.color }}>{row.value}</span>
              </div>
            ))}
            <a
              href="/hub/ordo-theurgica"
              className="hub-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--accent)",
                marginTop: 11,
                textDecoration: "none",
                transition: "gap 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.gap = "10px";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.gap = "6px";
              }}
            >
              Public hub page →
            </a>
          </div>
        </aside>
      </div>

      {/* Themed admit / decline confirm. */}
      <ConfirmDialog
        open={decision !== null}
        title={
          decision?.action === "admit"
            ? `Admit ${decision.petition.name} at I°?`
            : `Decline ${decision?.petition.name ?? "petitioner"}?`
        }
        body={
          decision?.action === "admit"
            ? "A new membership at first degree will be created. The petitioner will see the decision on their profile and may attend lodge as a member."
            : "The petitioner is notified that the officers did not admit them at this reading. They may petition again at the next equinox."
        }
        confirmLabel={decision?.action === "admit" ? "Admit at I°" : "Decline petition"}
        cancelLabel="Cancel"
        tone={decision?.action === "admit" ? "constructive" : "neutral"}
        onConfirm={() => {
          // Real admit/decline calls land with the Hub backend.
          setDecision(null);
        }}
        onCancel={() => setDecision(null)}
      />
    </main>
  );
}
