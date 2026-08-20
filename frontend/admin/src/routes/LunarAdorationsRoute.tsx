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

import { Button, type LunarTodayResponse, Toast, useApiCall, useTopbar } from "@theourgia/shared";

import { apiMethods } from "../data/api.js";
import { useAdorations, useSetAdorations } from "../data/useAdorations.js";
import { useMyLocation } from "../data/useLocation.js";
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
  const today = useApiCall<LunarTodayResponse>((signal) =>
    apiMethods.lunarToday({ lat: loc.lat, lng: loc.lng, tz, signal }),
  );

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
    </section>
  );
}
