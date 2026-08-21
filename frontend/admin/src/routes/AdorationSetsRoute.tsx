/**
 * Adoration sets — choose which set of words a rite is said in, for a body.
 *
 * The web parity for the phone's adoration-set screen, and the same for solar
 * (Liber Resh) as for lunar: build a set, give each station its words, and make
 * it the one in use. Backed by the synced record store (see
 * `data/adorationRecords`), so a set chosen here crosses to the phone. There is
 * no default — until a set is created (or adopted from a pack) and activated, a
 * body has no words, exactly as on the phone.
 */

import { useQueryClient } from "@tanstack/react-query";
import {
  type AdorationBody,
  Button,
  type RecordedAdorationSet,
  STATION_LABELS,
  Toast,
  stationKeysFor,
  useTopbar,
} from "@theourgia/shared";
import { useState } from "react";

import {
  ADORATION_SETS_KEY,
  activateAdorationSet,
  createAdorationSet,
  deleteAdorationSet,
  renameAdorationSet,
  useAdorationSets,
  writeStationAdoration,
} from "../data/adorationRecords.js";

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

export function AdorationSetsRoute({
  body,
  title,
  subtitle,
}: {
  body: AdorationBody;
  title: string;
  subtitle: string;
}) {
  useTopbar(() => ({ title, subtitle }), [title, subtitle]);

  const qc = useQueryClient();
  const query = useAdorationSets();
  const all = query.data ?? [];
  const sets = all.filter((s) => s.body === body);
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ADORATION_SETS_KEY });

  const guard = async (work: () => Promise<void>): Promise<void> => {
    setBusy(true);
    try {
      await work();
      await refresh();
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't save",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const stations = stationKeysFor(body);
  const bodyWord = body === "lunar" ? "moon" : "sun";

  const scriptAt = (set: RecordedAdorationSet, key: string): string =>
    set.adorations.find((a) => a.stationKeys.includes(key))?.script ?? "";

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
        The {bodyWord} crosses four stations each day. Build a set — give each station its words —
        and make it active; the active set is the one Today reads. Nothing is said until you do:
        there is no default set.
      </p>

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
          Your sets
        </h2>
        <Button
          variant="quiet"
          disabled={busy}
          onClick={() =>
            void guard(async () => {
              await createAdorationSet(body, "Untitled set");
            })
          }
        >
          New set
        </Button>
      </div>

      {query.isPending ? (
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>Loading…</p>
      ) : sets.length === 0 ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-mute)" }}>
          No sets yet. “New set” starts one — then give each station its words and activate it.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {sets.map((set) => (
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
                    name={`active-${body}-set`}
                    checked={set.active}
                    disabled={busy}
                    onChange={() => void guard(() => activateAdorationSet(all, set.id))}
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
                  defaultValue={set.name}
                  disabled={busy}
                  onBlur={(e) => {
                    if (e.target.value !== set.name) {
                      void guard(() => renameAdorationSet(set, e.target.value));
                    }
                  }}
                  style={{ ...cellInput, flex: 1, fontSize: 16 }}
                />
                <button
                  type="button"
                  aria-label="Delete set"
                  title="Delete set"
                  disabled={busy}
                  onClick={() => void guard(() => deleteAdorationSet(set))}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--danger)",
                    cursor: busy ? "default" : "pointer",
                    fontSize: 15,
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {stations.map((key, i) => (
                  <label key={key} style={{ display: "grid", gap: 4 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 12.5,
                        color: "var(--ink-soft)",
                      }}
                    >
                      {STATION_LABELS[key] ?? key}
                    </span>
                    <textarea
                      defaultValue={scriptAt(set, key)}
                      placeholder="the words said here"
                      rows={2}
                      disabled={busy}
                      onBlur={(e) => {
                        if (e.target.value !== scriptAt(set, key)) {
                          void guard(() =>
                            writeStationAdoration({
                              set,
                              stationKey: key,
                              script: e.target.value,
                              orderIndex: i,
                            }),
                          );
                        }
                      }}
                      style={{ ...cellInput, resize: "vertical", lineHeight: 1.5 }}
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

export function LunarAdorationSetsRoute() {
  return (
    <AdorationSetsRoute
      body="lunar"
      title="Lunar adorations"
      subtitle="The four moon stations, and the words said at them"
    />
  );
}

export function SolarAdorationSetsRoute() {
  return (
    <AdorationSetsRoute
      body="solar"
      title="Solar adorations"
      subtitle="The four sun stations, and the words said at them"
    />
  );
}
