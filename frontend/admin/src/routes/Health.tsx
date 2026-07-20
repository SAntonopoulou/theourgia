/**
 * Health — self-host node dashboard.
 *
 * Live-probe pass: the API + database status now come from a real
 * /api/v1/meta call. The remaining services (federation peers,
 * backups, migrations, plugins, agents, cloudflare, TLS, storage)
 * are labelled "probe pending" honestly instead of showing
 * fabricated demo numbers.
 *
 * The dashed border + muted status text distinguishes not-yet-probed
 * cards from probed cards. When an operator loads Health, the top
 * banner names how many probes are live vs pending so nothing is
 * ambiguous.
 */

import { useTopbar } from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { type CSSProperties } from "react";

import { apiMethods } from "../data/api.js";

const LINE = "var(--line)";

type ServiceStatus =
  | "operational"
  | "degraded"
  | "expiring"
  | "unavailable"
  | "pending";

interface ServiceProbe {
  id: string;
  label: string;
  status: ServiceStatus;
  statusLabel: string;
  detail: string;
  meterPercent?: number;
}

function statusColor(s: ServiceStatus): string {
  if (s === "operational") return "var(--success, #4a9d5a)";
  if (s === "expiring") return "var(--warning, #b8891a)";
  if (s === "pending") return "var(--ink-mute)";
  // degraded + unavailable share the warning tone (care palette — never
  // --danger, which is reserved for Visibility→Public).
  return "var(--warning, #b8891a)";
}

function statusBorder(s: ServiceStatus): string {
  if (s === "pending") return LINE;
  return s === "operational" ? LINE : statusColor(s);
}

function ServiceCard({ probe }: { probe: ServiceProbe }) {
  const color = statusColor(probe.status);
  const pending = probe.status === "pending";
  return (
    <div
      data-probe-id={probe.id}
      data-probe-live={pending ? "false" : "true"}
      style={{
        border: `${pending ? "1px dashed" : "1px solid"} ${statusBorder(probe.status)}`,
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        padding: "16px 18px",
        opacity: pending ? 0.72 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span
          style={{ width: 9, height: 9, borderRadius: "50%", background: color }}
          aria-hidden="true"
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 17,
            flex: 1,
          }}
        >
          {probe.label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color,
          }}
        >
          {probe.statusLabel}
        </span>
      </div>
      {probe.meterPercent !== undefined ? (
        <>
          <div
            style={{
              height: 6,
              borderRadius: 4,
              background: "var(--bg-sunk, var(--bg-3))",
              overflow: "hidden",
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: `${probe.meterPercent}%`,
                height: "100%",
                background: "var(--accent)",
                borderRadius: 4,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-mute)",
              marginTop: 6,
            }}
          >
            {probe.detail}
          </div>
        </>
      ) : (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          {probe.detail}
        </div>
      )}
    </div>
  );
}

const PAGE: CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "24px 24px 56px",
};

export function Health() {
  useTopbar(() => ({
    title: "Node health",
    subtitle: "Self-host probes · live service status",
  }));

  const metaQuery = useQuery({
    queryKey: ["health-meta"],
    queryFn: async () => apiMethods.getMeta(),
    refetchInterval: 30_000,
  });

  // v1-041: GET /api/v1/admin/health aggregates the per-service probes
  // (database, migrations, backups, federation, plugins, storage,
  // agents). Each probe is failure-isolated server-side.
  const healthQuery = useQuery({
    queryKey: ["admin-health"],
    queryFn: async () => apiMethods.getAdminHealth(),
    refetchInterval: 30_000,
  });

  const apiReachable = metaQuery.isSuccess && metaQuery.data !== undefined;
  const apiPending = metaQuery.isPending;
  const apiError = metaQuery.isError;

  const apiProbe: ServiceProbe = {
    id: "api",
    label: "API server",
    status: apiError ? "degraded" : apiReachable ? "operational" : "pending",
    statusLabel: apiError
      ? "Unreachable"
      : apiReachable
        ? "Operational"
        : apiPending
          ? "Checking…"
          : "Pending",
    detail: apiReachable
      ? `${metaQuery.data.instance_id} · v${metaQuery.data.version} · ${metaQuery.data.environment}`
      : apiError
        ? "GET /api/v1/meta failed"
        : "polling…",
  };

  // Backend probes map straight onto the ServiceProbe shape (snake →
  // camel on the two label fields).
  const backendProbes: ServiceProbe[] = (healthQuery.data?.probes ?? []).map(
    (p): ServiceProbe => ({
      id: p.id,
      label: p.label,
      status: p.status,
      statusLabel: p.status_label,
      detail: p.detail,
    }),
  );

  // TLS stays honestly pending — Caddy owns issuance/renewal, and the
  // backend behind the reverse proxy can't observe the edge cert.
  const tlsProbe: ServiceProbe = {
    id: "tls",
    label: "TLS certificate",
    status: "pending",
    statusLabel: "Managed by Caddy",
    detail: "issued + auto-renewed at the reverse proxy; not probed here",
  };

  const probes: ServiceProbe[] = healthQuery.isError
    ? [
        apiProbe,
        {
          id: "health",
          label: "Service probes",
          status: "degraded",
          statusLabel: "Unavailable",
          detail: "GET /api/v1/admin/health failed (admin scope required)",
        },
        tlsProbe,
      ]
    : [apiProbe, ...backendProbes, tlsProbe];

  const liveCount = probes.filter((p) => p.status !== "pending").length;
  const totalCount = probes.length;

  return (
    <div style={PAGE}>
      <div
        style={{
          padding: "14px 18px",
          border: "1px dashed var(--line-2)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-soft)",
          marginBottom: 24,
        }}
      >
        <strong style={{ color: "var(--ink)" }}>
          {liveCount}/{totalCount} probes live.
        </strong>{" "}
        Cards with a dashed border are not yet probed — the value shown is a
        placeholder label, not a measured status. When a probe is wired,
        the dashed border becomes solid and the status reflects a real
        measurement.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {probes.map((p) => (
          <ServiceCard key={p.id} probe={p} />
        ))}
      </div>
      <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
        <button
          type="button"
          onClick={() => void metaQuery.refetch()}
          disabled={metaQuery.isFetching}
          style={{
            padding: "8px 16px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          {metaQuery.isFetching ? "Checking…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
