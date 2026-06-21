/**
 * Agents admin — AI agent surfaces (BYO keys, browser-extension-style consent).
 *
 * Port of ``Theourgia Agents.dc.html`` per the per-component ritual.
 * From `agent_onboarding.md §` Theourgia Agents:
 *   · **BYO keys** — "your keys never leave your instance". Surface
 *     this prominently. Done via the topbar subtitle ("Opt-in
 *     companions · your keys, your instance, your memory") + a small
 *     reassurance row above the detail panel.
 *   · Capability consent is **browser-extension-style** — granular
 *     accept/decline, every capability surfaced before activation.
 *   · Cost: from tokens × rates. "Approaching cap" → non-blocking
 *     Toast. **At cap** → modal. Threshold logic lands with the agent
 *     daemon substrate.
 *   · **Install/consent modal + memory-file editor are TODO** per the
 *     design notes — the inventory + per-agent detail surface is what
 *     ships here.
 *   · Activity log is human-readable narration, not raw logs.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useState } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

type AgentStatus = "active" | "dormant" | "disabled";

interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  model: "Sonnet" | "Opus" | "Haiku";
  cost: string;
  cap: string;
  capPct: number;
  bio: string;
}

interface Capability {
  label: string;
  granted: boolean;
  note?: string;
}

interface ActivityEvent {
  when: string;
  narration: string;
}

const AGENTS: Agent[] = [
  {
    id: "divination",
    name: "Divination Companion",
    status: "active",
    model: "Sonnet",
    cost: "$4.20",
    cap: "$20",
    capPct: 21,
    bio: "Reads your castings and entity notes, surfaces recurring symbols, and drafts interpretations for your review — never publishing on its own.",
  },
  {
    id: "scrying",
    name: "Scrying Partner",
    status: "dormant",
    model: "Opus",
    cost: "$1.10",
    cap: "$15",
    capPct: 7,
    bio: "Walks alongside trance work, capturing visionary detail in the moment and shaping it into the record afterward.",
  },
  {
    id: "ritual",
    name: "Ritual Aide",
    status: "active",
    model: "Haiku",
    cost: "$0.40",
    cap: "$10",
    capPct: 4,
    bio: "Reads ritual scripts aloud at your pace; cues correspondences without breaking the operation.",
  },
  {
    id: "study",
    name: "Study Tutor",
    status: "active",
    model: "Sonnet",
    cost: "$6.80",
    cap: "$25",
    capPct: 27,
    bio: "Walks primary sources with you, glossing obscure terms and tracing citations.",
  },
  {
    id: "correspondence",
    name: "Correspondence Helper",
    status: "disabled",
    model: "Haiku",
    cost: "$0.00",
    cap: "$10",
    capPct: 0,
    bio: "Looks up correspondences across traditions on request — never expands a synthesis without your sign-off.",
  },
  {
    id: "synchronicity",
    name: "Synchronicity Reviewer",
    status: "dormant",
    model: "Sonnet",
    cost: "$2.30",
    cap: "$15",
    capPct: 15,
    bio: "Notices motifs across synchronicity entries; queues a weekly digest for your review.",
  },
];

const CAPABILITIES: Capability[] = [
  { label: "Read divination castings", granted: true },
  { label: "Read entity index", granted: true },
  { label: "Write reading notes", granted: true, note: "on confirm" },
  { label: "Access the web", granted: false, note: "declined" },
];

const ACTIVITY: ActivityEvent[] = [
  { when: "14:30", narration: "Read 3 past Hekate readings; noted 2 recurring symbols — the Star, and the halcyon." },
  { when: "Yest.", narration: "Drafted an interpretation for your three-card spread; left it for your edit." },
  { when: "Mon", narration: "Cross-referenced the Chaldean Oracles citation you added to fr. 1." },
];

function statusColor(s: AgentStatus): string {
  if (s === "active") return "var(--success)";
  if (s === "dormant") return "var(--ink-mute)";
  return "var(--ink-mute)";
}

function statusLabel(s: AgentStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusDotColor(s: AgentStatus): string {
  // Custom palette per .dc.html — active = success, dormant = warm
  // mute, disabled = soft danger.
  if (s === "active") return "var(--success)";
  if (s === "dormant") return "var(--warning)";
  return "var(--ink-mute)";
}

function AgentRow({ agent, selected, onSelect }: { agent: Agent; selected: boolean; onSelect: () => void }) {
  const base: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "10px 11px",
    borderRadius: "var(--r-md)",
    background: selected ? "var(--accent-soft)" : "transparent",
    boxShadow: selected ? "inset 2px 0 0 var(--accent)" : "none",
    marginBottom: 2,
    border: "none",
    cursor: "pointer",
    color: "inherit",
    fontFamily: "inherit",
    textAlign: "left",
  };
  return (
    <button
      type="button"
      aria-pressed={selected ? "true" : "false"}
      onClick={onSelect}
      style={base}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusDotColor(agent.status), flex: "none" }} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink)" }}>{agent.name}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)" }}>
          {agent.status === "disabled" ? "disabled" : agent.cost} · {agent.model}
        </div>
      </div>
    </button>
  );
}

export function Agents() {
  const [activeId, setActiveId] = useState<string>(AGENTS[0]!.id);
  const active = AGENTS.find((a) => a.id === activeId) ?? AGENTS[0]!;

  useTopbar(
    () => ({
      title: "AI Agents",
      subtitle: "Opt-in companions · your keys, your instance, your memory",
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
          Install agent
        </button>
      ),
    }),
    [],
  );

  return (
    <div style={{ display: "flex", minHeight: 0, margin: "0 -28px", flex: 1 }}>
      {/* Agent list */}
      <div
        className="scroll"
        style={{
          flex: "none",
          width: 248,
          borderRight: `1px solid ${LINE}`,
          background: "var(--bg-2)",
          padding: "16px 14px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            padding: "0 8px 10px",
          }}
        >
          Installed · {AGENTS.length}
        </div>
        {AGENTS.map((a) => (
          <AgentRow key={a.id} agent={a} selected={a.id === activeId} onSelect={() => setActiveId(a.id)} />
        ))}
      </div>

      {/* Detail */}
      <main className="scroll" style={{ flex: 1, minWidth: 0, overflowY: "auto", minHeight: 0, padding: "26px 32px" }}>
        <div style={{ maxWidth: 780 }}>

          {/* BYO-key reassurance row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              border: `1px solid ${LINE_2}`,
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              marginBottom: 22,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="1.5" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-soft)" }}>
              Your API keys never leave your instance. Agents call the model directly from your vault.
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                background: "var(--accent-soft)",
                border: `1px solid ${LINE_2}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                flex: "none",
              }}
              aria-hidden="true"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 25, margin: 0 }}>{active.name}</h2>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: statusColor(active.status),
                    border: `1px solid ${statusColor(active.status)}`,
                    borderRadius: 999,
                    padding: "3px 9px",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(active.status) }} />
                  {statusLabel(active.status)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-soft)",
                    border: `1px solid ${LINE_2}`,
                    borderRadius: 999,
                    padding: "3px 9px",
                  }}
                >
                  {active.model}
                </span>
              </div>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 14.5, color: "var(--ink-soft)", margin: "6px 0 0", lineHeight: 1.5 }}>
                {active.bio}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>

            {/* Capabilities + Activity */}
            <div style={{ flex: "1 1 320px", minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 12 }}>
                Granted capabilities
              </div>
              <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--bg-2)" }}>
                {CAPABILITIES.map((c, i) => (
                  <div
                    key={c.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "12px 15px",
                      borderBottom: i < CAPABILITIES.length - 1 ? `1px solid ${LINE}` : "none",
                    }}
                  >
                    {c.granted ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mute)" strokeWidth="1.8" strokeLinecap="round" style={{ flex: "none" }} aria-hidden="true">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    )}
                    <span style={{ flex: 1, fontFamily: "var(--font-serif)", fontSize: 14.5, color: c.granted ? "var(--ink)" : "var(--ink-mute)" }}>
                      {c.label}
                      {c.note ? (
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}> · {c.note}</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", margin: "20px 0 10px" }}>
                Activity
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {ACTIVITY.map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 11 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", flex: "none", width: 58 }}>{e.when}</span>
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 }}>{e.narration}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Usage */}
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 12 }}>
                Token usage · this month
              </div>
              <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: 18 }}>
                <svg viewBox="0 0 220 54" width="100%" height="54" preserveAspectRatio="none" style={{ marginBottom: 14 }} aria-hidden="true">
                  <polyline points="6,46 26,40 46,44 66,32 86,36 106,24 126,30 146,18 166,26 186,14 206,20" fill="none" stroke="var(--accent)" strokeWidth="2" />
                </svg>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <div><div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>1.2M</div><div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)" }}>input</div></div>
                  <div><div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>340k</div><div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)" }}>output</div></div>
                  <div><div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>890k</div><div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)" }}>cache</div></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>
                  <span>Cost cap</span>
                  <span><span style={{ fontFamily: "var(--font-mono)", color: "var(--ink)" }}>{active.cost}</span> of {active.cap}</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: "var(--bg-sunk)", overflow: "hidden", marginBottom: 14 }}>
                  <div style={{ height: "100%", background: "var(--accent)", borderRadius: 4, width: `${active.capPct}%` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)", borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
                  <span>Fresh 18%</span>
                  <span>Resume 82%</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: 9,
                    border: `1px solid ${LINE_2}`,
                    borderRadius: "var(--r-md)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--ink)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  View memory
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: 9,
                    border: `1px solid ${LINE_2}`,
                    borderRadius: "var(--r-md)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--ink)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  Configure
                </button>
              </div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)", fontStyle: "italic", margin: "14px 0 0" }}>
                Memory editor and install wizard wire up with the agent-daemon substrate.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
