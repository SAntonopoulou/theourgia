/**
 * Connection — dev-only diagnostic route.
 *
 * Calls the three real backend endpoints (healthz, readyz, meta) via the
 * API client and shows the responses. Also surfaces the auth-context
 * status so the substrate is visibly proven.
 */

import {
  Badge,
  Banner,
  Button,
  Card,
  type HealthStatus,
  type Meta,
  PromptDialog,
  StatusDot,
  useAuth,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";

import { API_BASE_URL, API_MODE, apiMethods } from "../data/api.js";
import { putMyLocation } from "../data/useLocation.js";

interface ProbeState<T> {
  status: "idle" | "loading" | "ok" | "error";
  data?: T;
  error?: string;
}

function useProbe<T>(fn: () => Promise<T>): [ProbeState<T>, () => void] {
  const [state, setState] = useState<ProbeState<T>>({ status: "idle" });
  const run = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await fn();
      setState({ status: "ok", data });
    } catch (e) {
      setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }, [fn]);
  useEffect(() => {
    void run();
  }, [run]);
  return [state, run];
}

function ProbeRow<T>({ label, state }: { label: string; state: ProbeState<T> }) {
  const dotKind =
    state.status === "ok"
      ? "ok"
      : state.status === "error"
        ? "error"
        : state.status === "loading"
          ? "pending"
          : "neutral";
  const text =
    state.status === "ok"
      ? "ok"
      : state.status === "loading"
        ? "loading…"
        : state.status === "error"
          ? `error · ${state.error}`
          : "idle";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        paddingBottom: "var(--space-3, 12px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink)" }}>{label}</span>
        <StatusDot status={dotKind as "ok" | "error" | "pending" | "neutral"} label={text} />
      </div>
      {state.data !== undefined ? (
        <pre
          style={{
            margin: 0,
            padding: "var(--space-2, 8px) var(--space-3, 12px)",
            backgroundColor: "var(--bg-sunk, var(--bg))",
            color: "var(--ink-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--type-caption, 11px)",
            borderRadius: "var(--r-sm, 4px)",
            overflowX: "auto",
          }}
        >
          {JSON.stringify(state.data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

export function Connection() {
  const [health, refreshHealth] = useProbe<HealthStatus>(
    useCallback(() => apiMethods.getHealth(), []),
  );
  const [readyz, refreshReadyz] = useProbe<HealthStatus>(
    useCallback(() => apiMethods.getReadiness(), []),
  );
  const [meta, refreshMeta] = useProbe<Meta>(useCallback(() => apiMethods.getMeta(), []));
  const auth = useAuth();
  const [signinOpen, setSigninOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5, 24px)",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-1, 4px)" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--type-caption, 11px)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Dev · API connection probe
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: "var(--type-h1, 32px)",
            color: "var(--ink)",
          }}
        >
          Connection
        </h1>
        <p style={{ margin: 0, color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}>
          Live calls to <code>/healthz</code>, <code>/readyz</code>, and <code>/api/v1/meta</code>{" "}
          through the shared API client. Use this to verify the substrate end-to-end after each
          deploy.
        </p>
      </header>

      {API_MODE === "mock" ? (
        <Banner
          tone="info"
          title="Mock mode"
          body="The API client is resolving fixtures locally — no backend is reachable. Set VITE_THEOURGIA_API_BASE at build time to switch to live mode."
        />
      ) : (
        <Banner tone="success" title="Live mode" body={`Calling ${API_BASE_URL}.`} />
      )}

      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-3, 12px)",
          }}
        >
          <h2
            style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "var(--type-h3, 18px)" }}
          >
            Endpoints
          </h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              refreshHealth();
              refreshReadyz();
              refreshMeta();
            }}
          >
            Refresh
          </Button>
        </div>
        <ProbeRow label="GET /healthz" state={health} />
        <ProbeRow label="GET /readyz" state={readyz} />
        <ProbeRow label="GET /api/v1/meta" state={meta} />
      </Card>

      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-3, 12px)",
          }}
        >
          <h2
            style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "var(--type-h3, 18px)" }}
          >
            Auth context
          </h2>
          <Badge
            tone={
              auth.status === "authenticated"
                ? "success"
                : auth.status === "checking"
                  ? "info"
                  : "neutral"
            }
          >
            {auth.status}
          </Badge>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-mute)" }}>
              session.display_name
            </span>
            <span style={{ color: "var(--ink)" }}>{auth.session?.display_name ?? "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-mute)" }}>
              session.vault_id
            </span>
            <span style={{ color: "var(--ink)" }}>{auth.session?.vault_id ?? "—"}</span>
          </div>
          {auth.error ? (
            <div
              style={{
                color: "var(--danger)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--type-caption, 11px)",
              }}
            >
              {auth.error.message}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <Button size="sm" variant="secondary" onClick={() => void auth.refresh()}>
              refresh()
            </Button>
            <Button size="sm" variant="quiet" onClick={() => void auth.signOut()}>
              signOut()
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                void auth.signInWebAuthn().catch(() => {
                  // Error already surfaced onto auth.error
                });
              }}
              disabled={auth.status === "authenticated"}
            >
              Sign in with passkey
            </Button>
            <Button
              size="sm"
              variant="quiet"
              onClick={() => setSigninOpen(true)}
              disabled={auth.status === "authenticated"}
            >
              Demo signin
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setLocationOpen(true)}
              disabled={auth.status !== "authenticated"}
            >
              Set location
            </Button>
          </div>
        </div>
      </Card>

      <PromptDialog
        open={signinOpen}
        title="Demo signin"
        label="Magickal name"
        placeholder="Soror Ευ. Α."
        validate={(v) => (v.trim().length < 1 ? "A name is required." : null)}
        confirmLabel="Sign in"
        onSubmit={(value) => {
          setSigninOpen(false);
          void auth.signInDemo({ magickal_name: value }).catch(() => {
            // signInDemo already surfaces the error into auth.error
          });
        }}
        onCancel={() => setSigninOpen(false)}
      />

      <PromptDialog
        open={locationOpen}
        title="Set your location"
        label="lat,lng (decimal degrees)"
        placeholder="51.4769, 0.0"
        defaultValue=""
        validate={(v) => {
          const m = v.split(",").map((s) => Number.parseFloat(s.trim()));
          if (m.length !== 2 || m.some(Number.isNaN)) return "Format: lat,lng (e.g. 51.4769, 0.0)";
          const [lat, lng] = m as [number, number];
          if (lat < -90 || lat > 90) return "Latitude must be between -90 and 90";
          if (lng < -180 || lng > 180) return "Longitude must be between -180 and 180";
          return null;
        }}
        confirmLabel="Save"
        onSubmit={(value) => {
          setLocationOpen(false);
          const [lat, lng] = value.split(",").map((s) => Number.parseFloat(s.trim())) as [
            number,
            number,
          ];
          void putMyLocation({ lat, lng }).catch(() => {
            // surfaces via the user noticing CelestialBand didn't update
          });
        }}
        onCancel={() => setLocationOpen(false)}
      />
    </div>
  );
}
