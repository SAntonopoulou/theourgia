/**
 * Health admin — self-host node health dashboard.
 *
 * Port of ``Theourgia Health.dc.html`` per the per-component ritual.
 * From `agent_onboarding.md §` Theourgia Health:
 *   · Admin-only node health: overall status + service grid (operational
 *     / degraded / expiring).
 *   · **Everything is live ② / ③** — no static content. "Operational"
 *     must mean a real probe passed.
 *   · Cert / token expiry are real countdowns from expiry timestamps.
 *   · Refresh, drill into a service, run a check.
 *   · Pairs with **Federation** (peer reachability) and **Docs**
 *     (self-hosting).
 *
 * Per `feedback_follow_design_thread_deep.md` — the live-data contract
 * is the most important constraint here. The probe values rendered
 * below are placeholder demo data **clearly marked in code** so the
 * wiring pass can swap them for real /healthz probe results without
 * any "is this fake or real" ambiguity. Each card has a
 * ``data-probe-pending`` attribute that the substrate can target.
 *
 * Demo instance name swapped from the designer's "vault.sophia.…" to
 * "vault.demo.…" per the magickal-name rule (Settings → Federation will
 * show the real instance hostname once the operator names it at
 * install time).
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

type ServiceStatus = "operational" | "degraded" | "expiring";

interface ServiceProbe {
  /** Stable id used by the live-probe substrate to target this card. */
  id: string;
  label: string;
  status: ServiceStatus;
  /** Status label (verbatim from design — varies per service). */
  statusLabel: string;
  /** Sub-label: latency, count, version, etc. */
  detail: string;
  /** Optional inline meter (storage). */
  meterPercent?: number;
}

const SERVICES: ServiceProbe[] = [
  { id: "api", label: "API server", status: "operational", statusLabel: "Operational", detail: "p50 42ms · p99 180ms" },
  { id: "db", label: "Database", status: "operational", statusLabel: "Operational", detail: "18 / 100 connections · 2ms" },
  { id: "federation", label: "Federation peers", status: "degraded", statusLabel: "Degraded", detail: "3 / 4 reachable · hermetic.lodge down" },
  { id: "backups", label: "Backups", status: "operational", statusLabel: "Operational", detail: "last 2h ago · daily · encrypted" },
  { id: "migrations", label: "Migrations", status: "operational", statusLabel: "Up to date", detail: "0042_add_aliases · 3d ago" },
  { id: "plugins", label: "Plugins", status: "operational", statusLabel: "Operational", detail: "6 healthy · 0 errors" },
  { id: "agents", label: "Agent daemon", status: "operational", statusLabel: "Operational", detail: "3 active · 0 queued" },
  { id: "cloudflare", label: "Cloudflare token", status: "operational", statusLabel: "Valid", detail: "scopes ok · tunnel up" },
  { id: "tls", label: "TLS certificate", status: "expiring", statusLabel: "Expiring", detail: "14 days left · auto-renews in 7" },
  { id: "storage", label: "Storage", status: "operational", statusLabel: "Healthy", detail: "21 GB of 50 GB", meterPercent: 42 },
];

function statusColor(s: ServiceStatus): string {
  if (s === "operational") return "var(--success)";
  if (s === "expiring") return "var(--warning)";
  return "var(--warning)"; // degraded shares warning tone in the design
}

function statusBorder(s: ServiceStatus): string {
  return s === "operational" ? LINE : statusColor(s);
}

function ServiceCard({ probe }: { probe: ServiceProbe }) {
  const color = statusColor(probe.status);
  return (
    <div
      data-probe-pending="true"
      data-probe-id={probe.id}
      style={{
        border: `1px solid ${statusBorder(probe.status)}`,
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }} aria-hidden="true" />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 17, flex: 1 }}>{probe.label}</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color }}>{probe.statusLabel}</span>
      </div>
      {probe.meterPercent !== undefined ? (
        <>
          <div style={{ height: 6, borderRadius: 4, background: "var(--bg-sunk)", overflow: "hidden", marginTop: 4 }}>
            <div style={{ width: `${probe.meterPercent}%`, height: "100%", background: "var(--accent)", borderRadius: 4 }} />
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-mute)", marginTop: 6 }}>{probe.detail}</div>
        </>
      ) : (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-mute)" }}>{probe.detail}</div>
      )}
    </div>
  );
}

export function Health() {
  // Overall rollup — derived from the grid (placeholder until live probes wire up).
  const degraded = SERVICES.filter((s) => s.status === "degraded" || s.status === "expiring").length;
  const nominal = SERVICES.length - degraded;
  const overall: ServiceStatus = degraded > 0 ? "degraded" : "operational";
  const overallColor = statusColor(overall);

  useTopbar(
    () => ({
      title: "System Health",
      subtitle: "vault.demo.theourgia.net · self-hosted",
      after: (
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: "var(--r-md)",
            border: `1px solid ${LINE_2}`,
            background: "transparent",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 1 3 6.7M3 18v-4h4" />
          </svg>
          Run checks
        </button>
      ),
    }),
    [],
  );

  const overallBg: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "18px 22px",
    border: `1px solid ${overallColor}`,
    borderRadius: "var(--r-lg)",
    background: `color-mix(in srgb, ${overallColor} 10%, var(--bg-2))`,
    marginBottom: 26,
    flexWrap: "wrap",
  };

  return (
    <main className="scroll" style={{ overflowY: "auto", minHeight: 0, padding: "26px 32px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* overall rollup */}
        <div style={overallBg}>
          <span
            aria-hidden="true"
            style={{ width: 11, height: 11, borderRadius: "50%", background: overallColor, flex: "none" }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>
              {overall === "operational" ? "All systems operational" : "Mostly operational"}
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>
              {nominal} services nominal · {degraded} need attention · checked 30s ago
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-mute)" }}>
            uptime 99.94% · 38d
          </span>
        </div>

        {/* service grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {SERVICES.map((s) => (
            <ServiceCard key={s.id} probe={s} />
          ))}
        </div>

        {/* TODO: live-probe substrate */}
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            fontStyle: "italic",
            margin: "22px 0 0",
            maxWidth: "60ch",
            textAlign: "center",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Probe values shown are placeholder data — the live ②/③ health-check substrate wires up with the operations
          pass.
        </p>
      </div>
    </main>
  );
}
