/**
 * Running an election on the web — the missing half of the elections surface.
 *
 * The site could read election-rule packs but not elect against the sky. This
 * grid-searches the coming days for the most favourable instants (POST
 * /astro/election/search), using one of the built-in recipes, and ranks the
 * windows with why each is favourable. The rule-pack reference stays below.
 */

import { useState } from "react";

import { useMyLocation } from "../data/useLocation.js";
import { apiPost } from "../lib/api.js";
import { MOCK_LOCATION } from "../mocks/today.js";

const PRESETS: { key: string; label: string }[] = [
  { key: "venus_talisman", label: "Consecrate a Venus talisman" },
  { key: "mercury_correspondence", label: "Consult Mercury, before correspondence" },
  { key: "hekate_working", label: "A Hekate working" },
];

const SPANS = [
  { label: "3 days", days: 3 },
  { label: "A week", days: 7 },
  { label: "A month", days: 30 },
];

interface ElectionResult {
  instant: string;
  score: number;
  passes_all: boolean;
  breakdown: { constraint?: unknown }[];
}
interface SearchResponse {
  elections: ElectionResult[];
  attribution: string;
}

export function ElectionFinder() {
  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;
  const [preset, setPreset] = useState(PRESETS[0]?.key ?? "venus_talisman");
  const [days, setDays] = useState(7);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (): Promise<void> => {
    setRunning(true);
    setError(null);
    try {
      const now = new Date();
      const end = new Date(now.getTime() + days * 86_400_000);
      const res = await apiPost<SearchResponse>("/astro/election/search", {
        preset,
        start: now.toISOString(),
        end: end.toISOString(),
        latitude: loc.lat,
        longitude: loc.lng,
        top_n: 5,
      });
      setResults(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The search failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <section
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        padding: 18,
        marginBottom: 24,
      }}
    >
      <h2
        style={{
          margin: "0 0 4px",
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 18,
          color: "var(--ink)",
        }}
      >
        Elect a window
      </h2>
      <p style={{ margin: "0 0 14px", fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)" }}>
        Search the coming days for the sky a recipe asks for, ranked by how well each moment answers.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {PRESETS.map((p) => {
          const on = p.key === preset;
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={on}
              onClick={() => setPreset(p.key)}
              style={{
                padding: "7px 13px",
                borderRadius: 999,
                border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                background: on ? "var(--accent-soft)" : "var(--bg)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {SPANS.map((s) => {
            const on = s.days === days;
            return (
              <button
                key={s.days}
                type="button"
                aria-pressed={on}
                onClick={() => setDays(s.days)}
                style={{
                  padding: "6px 11px",
                  borderRadius: 999,
                  border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                  background: on ? "var(--accent-soft)" : "var(--bg)",
                  color: "var(--ink-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => void run()}
          style={{
            padding: "8px 18px",
            borderRadius: "var(--r-md, 8px)",
            border: "1px solid var(--accent)",
            background: running ? "var(--bg)" : "var(--accent)",
            color: running ? "var(--ink-mute)" : "var(--on-accent, #fff)",
            fontFamily: "var(--font-ui)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: running ? "default" : "pointer",
          }}
        >
          {running ? "Searching…" : "Find favourable windows"}
        </button>
      </div>

      {error ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--danger)", marginTop: 12 }}>
          {error}
        </p>
      ) : null}

      {results ? (
        results.elections.length === 0 ? (
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-mute)", marginTop: 14 }}>
            No favourable window in this span — try a longer one.
          </p>
        ) : (
          <ol style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "grid", gap: 10 }}>
            {results.elections.map((r) => (
              <li
                key={r.instant}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md, 8px)",
                  padding: "10px 12px",
                  background: "var(--bg)",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display, var(--font-serif))",
                      fontSize: 15.5,
                      color: "var(--ink)",
                    }}
                  >
                    {new Date(r.instant).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 999,
                      border: "1px solid var(--line)",
                      color: r.passes_all ? "var(--accent)" : "var(--ink-mute)",
                    }}
                  >
                    {r.passes_all ? "All met" : "Partial"} · {Math.round(r.score * 100)}%
                  </span>
                </div>
                {r.breakdown.length > 0 ? (
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--ink-soft)",
                      marginTop: 4,
                    }}
                  >
                    {r.breakdown
                      .map((b) => (typeof b.constraint === "string" ? b.constraint : ""))
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )
      ) : null}
    </section>
  );
}
