/**
 * Lunar adorations — the four moon stations, and the adoration set said at them.
 *
 * Web parity with the phone (20 Aug): with lunar adorations enabled, choose
 * which adoration set is active — build a "Hekate" set, give words to each
 * station, activate it — and the active set names the stations on Today. The
 * station times come from `GET /api/v1/lunar/today`; the sets live in the
 * per-user settings store via `useAdorations` (shared with Today, so activating
 * a set renames Today's stations at once).
 */

import {
  Button,
  KeepingSheet,
  type KeepingValues,
  type LunarTodayResponse,
  type RecordEntryWrite,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";
import { amendObservance, keepObservance } from "../data/keepObservance.js";
import { useAdorations, useSetAdorations } from "../data/useAdorations.js";
import { useMyLocation } from "../data/useLocation.js";
import { apiGet } from "../lib/api.js";
import { MOCK_LOCATION } from "../mocks/today.js";

const LUNAR_STATIONS: { key: string; label: string }[] = [
  { key: "moonrise", label: "Moonrise" },
  { key: "upperCulmination", label: "Upper culmination" },
  { key: "moonset", label: "Moonset" },
  { key: "lowerCulmination", label: "Lower culmination" },
];

let counter = 0;
function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // fall through
  }
  counter += 1;
  return `adr-${counter}-${Date.now()}`;
}

const cellInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "6px 8px",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  border: "1px solid var(--line)",
  borderRadius: "var(--r-sm, 6px)",
  background: "var(--bg)",
  color: "var(--ink)",
};

export function LunarAdorationsRoute() {
  useTopbar(
    () => ({ title: "Lunar adorations", subtitle: "The four moon stations, and whose they are" }),
    [],
  );

  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // deps: recompute when the stored location replaces the Greenwich stand-in.
  const today = useApiCall<LunarTodayResponse>(
    (signal) => apiMethods.lunarToday({ lat: loc.lat, lng: loc.lng, tz, signal }),
    { deps: [loc.lat, loc.lng, tz] },
  );

  // Which of today's stations are already kept (from the synced record), plus
  // the keeping sheet offered after a mark.
  const [keptKeys, setKeptKeys] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<{ entry: RecordEntryWrite; title: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stationKeys = new Set(LUNAR_STATIONS.map((s) => s.key));
        const todayStr = new Date().toDateString();
        const kept = new Set<string>();
        let since = 0;
        for (;;) {
          const page = await apiGet<{
            entries: {
              kind: string;
              deleted_at_utc?: string | null;
              doc?: Record<string, unknown> | null;
            }[];
            next_since: number;
            more: boolean;
          }>(`/record/entries?since=${since}&limit=500`);
          for (const e of page.entries ?? []) {
            if (e.kind !== "observance" || e.deleted_at_utc) continue;
            const key = e.doc?.subjectKey;
            const occ = e.doc?.occurrenceAt;
            if (
              typeof key === "string" &&
              stationKeys.has(key) &&
              typeof occ === "string" &&
              new Date(occ).toDateString() === todayStr
            ) {
              kept.add(key);
            }
          }
          since = page.next_since;
          if (!page.more) break;
        }
        if (!cancelled) setKeptKeys(kept);
      } catch {
        // The marks simply don't show as kept; marking still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mark = async (key: string, label: string): Promise<void> => {
    const at = today.data?.stations.find((s) => s.key === key)?.at;
    setBusy(true);
    try {
      const entry = await keepObservance({
        subjectKey: key,
        occurrenceAt: at ?? new Date().toISOString(),
        location: { lat: loc.lat, lng: loc.lng },
      });
      setKeptKeys((prev) => new Set(prev).add(key));
      setSheet({ entry, title: label });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't keep",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const keepDetails = async (values: KeepingValues): Promise<void> => {
    if (!sheet) return;
    setBusy(true);
    try {
      await amendObservance(sheet.entry, values);
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "The note didn't save",
        body: e instanceof Error ? e.message : "The mark itself stands.",
      });
    } finally {
      setBusy(false);
      setSheet(null);
    }
  };

  const query = useAdorations();
  const setAdorations = useSetAdorations();
  const all = query.data?.sets ?? [];
  const lunar = all.filter((s) => s.body === "lunar");

  const commit = (lunarSets: typeof lunar): void => {
    const others = all.filter((s) => s.body !== "lunar");
    setAdorations.mutate([...others, ...lunarSets], {
      onError: (e) =>
        Toast.push({
          tone: "warning",
          title: "That didn't save",
          body: e instanceof Error ? e.message : "Check your connection and try again.",
        }),
    });
  };

  const addSet = (): void =>
    commit([
      ...lunar,
      {
        id: newId(),
        name: "Untitled set",
        body: "lunar",
        active: lunar.length === 0,
        stations: {},
      },
    ]);
  const activate = (id: string): void => commit(lunar.map((s) => ({ ...s, active: s.id === id })));
  const rename = (id: string, name: string): void =>
    commit(lunar.map((s) => (s.id === id ? { ...s, name } : s)));
  const setStation = (id: string, key: string, text: string): void =>
    commit(
      lunar.map((s) => (s.id === id ? { ...s, stations: { ...s.stations, [key]: text } } : s)),
    );
  const remove = (id: string): void => commit(lunar.filter((s) => s.id !== id));

  const timeFor = (key: string): string => {
    const at = today.data?.stations.find((s) => s.key === key)?.at;
    if (!at) return "—";
    return new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <section style={{ maxWidth: 720, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      <p
        style={{
          margin: "0 0 20px",
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          color: "var(--ink-soft)",
          lineHeight: 1.5,
        }}
      >
        The moon crosses four stations each day. Build an adoration set — give words to each station
        — and make it active; the active set is what Today shows.
      </p>

      {/* Today's four station times */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 26,
        }}
      >
        {LUNAR_STATIONS.map((st) => (
          <div
            key={st.key}
            style={{
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md, 8px)",
              background: "var(--bg-2)",
            }}
          >
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-soft)" }}>
              {st.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 16,
                color: "var(--ink)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {timeFor(st.key)}
            </div>
            <button
              type="button"
              disabled={busy || keptKeys.has(st.key)}
              onClick={() => void mark(st.key, st.label)}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "6px 8px",
                borderRadius: "var(--r-sm, 6px)",
                border: `1px solid ${keptKeys.has(st.key) ? "var(--accent)" : "var(--line)"}`,
                background: keptKeys.has(st.key) ? "var(--accent-soft)" : "var(--bg)",
                color: keptKeys.has(st.key) ? "var(--accent)" : "var(--ink-soft)",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                cursor: busy || keptKeys.has(st.key) ? "default" : "pointer",
              }}
            >
              {keptKeys.has(st.key) ? "Kept ✓" : "Mark kept"}
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 20,
            color: "var(--ink)",
          }}
        >
          Your adoration sets
        </h2>
        <Button variant="quiet" onClick={addSet}>
          New set
        </Button>
      </div>

      {query.isPending ? (
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>Loading…</p>
      ) : lunar.length === 0 ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-mute)" }}>
          No sets yet. “New set” starts one (name it “Hekate”, give each station its words).
        </p>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {lunar.map((set) => (
            <div
              key={set.id}
              style={{
                border: `1px solid ${set.active ? "var(--accent)" : "var(--line)"}`,
                borderRadius: "var(--r-lg, 14px)",
                padding: 16,
                background: "var(--bg-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
                  <input
                    type="radio"
                    name="active-lunar-set"
                    checked={set.active}
                    onChange={() => activate(set.id)}
                    aria-label={`Make ${set.name} the active set`}
                  />
                  <span
                    style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-soft)" }}
                  >
                    {set.active ? "Active" : "Activate"}
                  </span>
                </label>
                <input
                  aria-label="Set name"
                  value={set.name}
                  onChange={(e) => rename(set.id, e.target.value)}
                  style={{ ...cellInput, flex: 1, fontSize: 16 }}
                />
                <button
                  type="button"
                  aria-label="Delete set"
                  title="Delete set"
                  onClick={() => remove(set.id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--danger)",
                    cursor: "pointer",
                    fontSize: 15,
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {LUNAR_STATIONS.map((st) => (
                  <label key={st.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        width: 130,
                        flex: "none",
                        fontFamily: "var(--font-ui)",
                        fontSize: 12.5,
                        color: "var(--ink-soft)",
                      }}
                    >
                      {st.label}
                    </span>
                    <input
                      value={set.stations[st.key] ?? ""}
                      placeholder="the words said here"
                      onChange={(e) => setStation(set.id, st.key, e.target.value)}
                      style={cellInput}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {sheet ? (
        <KeepingSheet
          title={sheet.title}
          subtitle="Kept. Add how the adoration was, if you like."
          onKeep={(v) => void keepDetails(v)}
          onClose={() => setSheet(null)}
          busy={busy}
        />
      ) : null}
    </section>
  );
}
