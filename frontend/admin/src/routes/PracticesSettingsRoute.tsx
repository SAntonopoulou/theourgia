/**
 * Practices — turn the built-in disciplines on or off.
 *
 * Web parity with the phone's Settings (`lib/domain/practice.dart`): the
 * eight disciplines the app ships knowing how to keep, each on by default and
 * switchable off. Backed by ``GET/PUT /api/v1/users/me/settings/practices``,
 * which persists only the switched-OFF set — so a discipline added in a later
 * version is on for everyone until they turn it off, matching the phone.
 *
 * A toggle writes immediately: the switch flips optimistically, the PUT
 * returns the authoritative list, and a failure rolls back with a toast.
 */

import {
  Button,
  EmptyState,
  type PracticeToggle,
  Skeleton,
  Switch,
  Toast,
  useApiCall,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";

export function PracticesSettingsRoute() {
  const { status, data, error, refresh } = useApiCall((signal) =>
    apiMethods.getMyPractices({ signal }),
  );

  // The list we render, held locally so a toggle feels instant. Seeded from
  // the server and re-seeded from every PUT response (the source of truth).
  const [view, setView] = useState<PracticeToggle[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setView(data.practices);
  }, [data]);

  async function toggle(key: string): Promise<void> {
    if (!view || saving) return;
    const before = view;
    const next = view.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p));
    setView(next); // optimistic
    setSaving(true);
    try {
      const res = await apiMethods.putMyPractices({
        disabled: next.filter((p) => !p.enabled).map((p) => p.key),
      });
      setView(res.practices); // reconcile with the server's answer
    } catch (e) {
      setView(before); // roll back
      Toast.push({
        tone: "warning",
        title: "That change didn't save",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ maxWidth: 640, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      <header style={{ marginBottom: 20 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 24,
            color: "var(--ink)",
          }}
        >
          Practices
        </h1>
        <p
          style={{
            margin: "6px 0 0",
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            color: "var(--ink-soft)",
            lineHeight: 1.5,
          }}
        >
          The disciplines the app keeps with you. Switch off what you don't practise — nothing is
          lost, and you can turn it back on any time.
        </p>
      </header>

      {status === "loading" || status === "idle" ? (
        <div style={{ display: "grid", gap: 10 }}>
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <Skeleton key={k} kind="rect" height={44} />
          ))}
        </div>
      ) : status === "error" ? (
        <EmptyState
          title="Couldn't load your practices"
          body={error?.message ?? "The request failed."}
          action={<Button onClick={() => void refresh()}>Try again</Button>}
        />
      ) : view ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
          {view.map((p) => (
            <li
              key={p.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "12px 8px",
                borderBottom: "1px solid var(--line-2)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flex: "none",
                  width: 28,
                  marginTop: 2,
                  textAlign: "center",
                  fontSize: 20,
                  color: "var(--ink-soft)",
                }}
              >
                {p.glyph}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Switch
                  label={p.label}
                  checked={p.enabled}
                  onChange={() => void toggle(p.key)}
                  disabled={saving}
                  style={{ display: "flex", width: "100%", justifyContent: "space-between" }}
                />
                <div
                  style={{
                    marginTop: 2,
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-soft)",
                    lineHeight: 1.4,
                  }}
                >
                  {p.detail}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
