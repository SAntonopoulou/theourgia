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
} from "@theourgia/shared";

import { usePractices, useSetPractices } from "../data/usePractices.js";

export function PracticesSettingsRoute() {
  // Shared cache — the same one Today reads, so a toggle here shows there with
  // no reload. The mutation updates the cache optimistically.
  const query = usePractices();
  const setPractices = useSetPractices();

  const view = query.data?.practices ?? null;
  const status = query.isPending ? "loading" : query.isError ? "error" : "ok";
  const error = query.error;
  const saving = setPractices.isPending;
  const refresh = (): void => {
    void query.refetch();
  };

  function toggle(key: string): void {
    if (!view || saving) return;
    // The new enabled state of each row; the switched-off set is what we PUT.
    const nextEnabled = (p: PracticeToggle): boolean => (p.key === key ? !p.enabled : p.enabled);
    const disabled = view.filter((p) => !nextEnabled(p)).map((p) => p.key);
    setPractices.mutate(
      { disabled },
      {
        onError: (e) =>
          Toast.push({
            tone: "warning",
            title: "That change didn't save",
            body: e instanceof Error ? e.message : "Check your connection and try again.",
          }),
      },
    );
  }

  return (
    <section style={{ maxWidth: 680 }}>
      <header style={{ marginBottom: 20 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 24,
            color: "var(--ink)",
          }}
        >
          Practices
        </h2>
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

      {status === "loading" ? (
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
