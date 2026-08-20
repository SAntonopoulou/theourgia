/**
 * Spiritual maps — a figure of named nodes, worked one at a time.
 *
 * Web parity with the phone (20 Aug): the phone's spiritual map is a figure
 * whose nodes are worked and kept. Its figures are local, so on the web the
 * figure is *authored* here — a named map, a summary, a list of nodes — and
 * stored in the per-user settings store (`useMaps`, the same slice pattern as
 * adorations). The *work* of a node is kept to the record as an observance,
 * `subjectKey = map:<mapId>:<nodeId>:work`, matching the phone's convention, so
 * a node worked on the web shows in the phone's map on its next sync.
 */

import {
  Button,
  KeepingSheet,
  type KeepingValues,
  type RecordEntryWrite,
  type SpiritualMap,
  type SpiritualMapNode,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { amendObservance, keepObservance } from "../data/keepObservance.js";
import { useMyLocation } from "../data/useLocation.js";
import { mapNodeSubjectKey, useMaps, useSetMaps } from "../data/useMaps.js";
import { apiGet } from "../lib/api.js";
import { MOCK_LOCATION } from "../mocks/today.js";

let counter = 0;
function newId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // fall through
  }
  counter += 1;
  return `${prefix}-${counter}-${Date.now()}`;
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

export function SpiritualMapRoute() {
  useTopbar(
    () => ({ title: "Spiritual map", subtitle: "A figure of nodes, worked one at a time" }),
    [],
  );

  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;

  const query = useMaps();
  const setMaps = useSetMaps();
  const maps = query.data?.maps ?? [];

  // How many times each node has been worked, read from the synced record —
  // keyed by the node's subjectKey. A node worked on the phone shows here too.
  const [workedCounts, setWorkedCounts] = useState<Map<string, number>>(new Map());
  const [sheet, setSheet] = useState<{ entry: RecordEntryWrite; title: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const counts = new Map<string, number>();
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
            if (typeof key === "string" && key.startsWith("map:") && key.endsWith(":work")) {
              counts.set(key, (counts.get(key) ?? 0) + 1);
            }
          }
          since = page.next_since;
          if (!page.more) break;
        }
        if (!cancelled) setWorkedCounts(counts);
      } catch {
        // The counts simply don't show; working a node still records.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = (next: SpiritualMap[]): void => {
    setMaps.mutate(next, {
      onError: (e) =>
        Toast.push({
          tone: "warning",
          title: "That didn't save",
          body: e instanceof Error ? e.message : "Check your connection and try again.",
        }),
    });
  };

  const patchMap = (id: string, patch: (m: SpiritualMap) => SpiritualMap): void =>
    commit(maps.map((m) => (m.id === id ? patch(m) : m)));

  const addMap = (): void =>
    commit([...maps, { id: newId("map"), name: "Untitled map", summary: "", nodes: [] }]);
  const removeMap = (id: string): void => commit(maps.filter((m) => m.id !== id));
  const renameMap = (id: string, name: string): void => patchMap(id, (m) => ({ ...m, name }));
  const setSummary = (id: string, summary: string): void =>
    patchMap(id, (m) => ({ ...m, summary }));

  const addNode = (mapId: string): void =>
    patchMap(mapId, (m) => ({
      ...m,
      nodes: [...m.nodes, { id: newId("node"), name: "New node", note: "" }],
    }));
  const patchNode = (
    mapId: string,
    nodeId: string,
    patch: (n: SpiritualMapNode) => SpiritualMapNode,
  ): void =>
    patchMap(mapId, (m) => ({
      ...m,
      nodes: m.nodes.map((n) => (n.id === nodeId ? patch(n) : n)),
    }));
  const removeNode = (mapId: string, nodeId: string): void =>
    patchMap(mapId, (m) => ({ ...m, nodes: m.nodes.filter((n) => n.id !== nodeId) }));

  const work = async (map: SpiritualMap, node: SpiritualMapNode): Promise<void> => {
    const subjectKey = mapNodeSubjectKey(map.id, node.id);
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const entry = await keepObservance({
        subjectKey,
        occurrenceAt: now,
        subjectName: `${map.name} · ${node.name}`,
        location: { lat: loc.lat, lng: loc.lng },
      });
      setWorkedCounts((prev) => {
        const next = new Map(prev);
        next.set(subjectKey, (next.get(subjectKey) ?? 0) + 1);
        return next;
      });
      setSheet({ entry, title: `${map.name} · ${node.name}` });
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
        body: e instanceof Error ? e.message : "The work itself stands.",
      });
    } finally {
      setBusy(false);
      setSheet(null);
    }
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
        A spiritual map is a figure of nodes worked one at a time — a tree, a ladder, a set of
        spheres. Author the figure here; working a node keeps it to your record, and it crosses to
        the phone with everything else.
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
          Your maps
        </h2>
        <Button variant="quiet" onClick={addMap}>
          New map
        </Button>
      </div>

      {query.isPending ? (
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>Loading…</p>
      ) : maps.length === 0 ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-mute)" }}>
          No maps yet. “New map” starts one — name it, then add the nodes you work.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {maps.map((map) => (
            <div
              key={map.id}
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg, 14px)",
                padding: 16,
                background: "var(--bg-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <input
                  aria-label="Map name"
                  value={map.name}
                  onChange={(e) => renameMap(map.id, e.target.value)}
                  style={{ ...cellInput, flex: 1, fontSize: 16 }}
                />
                <button
                  type="button"
                  aria-label="Delete map"
                  title="Delete map"
                  onClick={() => removeMap(map.id)}
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

              <input
                aria-label="Map summary"
                placeholder="A line on what this figure is (optional)"
                value={map.summary}
                onChange={(e) => setSummary(map.id, e.target.value)}
                style={{ ...cellInput, marginBottom: 14 }}
              />

              <div style={{ display: "grid", gap: 8 }}>
                {map.nodes.length === 0 ? (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-ui)",
                      fontSize: 13,
                      color: "var(--ink-mute)",
                    }}
                  >
                    No nodes yet — add the first below.
                  </p>
                ) : (
                  map.nodes.map((node) => {
                    const worked = workedCounts.get(mapNodeSubjectKey(map.id, node.id)) ?? 0;
                    return (
                      <div
                        key={node.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1.4fr auto auto",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <input
                          aria-label="Node name"
                          value={node.name}
                          onChange={(e) =>
                            patchNode(map.id, node.id, (n) => ({ ...n, name: e.target.value }))
                          }
                          style={cellInput}
                        />
                        <input
                          aria-label="Node note"
                          placeholder="a word on this node (optional)"
                          value={node.note}
                          onChange={(e) =>
                            patchNode(map.id, node.id, (n) => ({ ...n, note: e.target.value }))
                          }
                          style={cellInput}
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void work(map, node)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "var(--r-sm, 6px)",
                            border: `1px solid ${worked > 0 ? "var(--accent)" : "var(--line)"}`,
                            background: worked > 0 ? "var(--accent-soft)" : "var(--bg)",
                            color: worked > 0 ? "var(--accent)" : "var(--ink-soft)",
                            fontFamily: "var(--font-ui)",
                            fontSize: 12,
                            cursor: busy ? "default" : "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {worked > 0 ? `Worked ×${worked}` : "Work"}
                        </button>
                        <button
                          type="button"
                          aria-label="Remove node"
                          title="Remove node"
                          onClick={() => removeNode(map.id, node.id)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--danger)",
                            cursor: "pointer",
                            fontSize: 14,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ marginTop: 12 }}>
                <Button variant="quiet" onClick={() => addNode(map.id)}>
                  Add node
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sheet && (
        <KeepingSheet
          title={sheet.title}
          subtitle="Worked. Add how it was, if you like."
          busy={busy}
          onKeep={(values) => void keepDetails(values)}
          onClose={() => setSheet(null)}
        />
      )}
    </section>
  );
}
