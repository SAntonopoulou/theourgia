/**
 * CustomCorrespondenceEditor — the practitioner's own correspondence tables.
 *
 * Sophia, 20 Aug: the shipped tables (Agrippa, 777) are read-only; people must
 * be able to build their own — a grid of subjects down the side, categories
 * across the top, and enter the values themselves. Backed by
 * ``GET/PUT /api/v1/users/me/settings/correspondences`` (one JSON blob per user,
 * no new table). Edits are local until "Save changes" PUTs the whole set.
 */

import { Button, type CustomCorrespondenceTable, Toast, useApiCall } from "@theourgia/shared";
import { useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";

let idCounter = 0;
function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  idCounter += 1;
  return `tbl-${idCounter}-${Date.now()}`;
}

const cellInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "5px 7px",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  border: "1px solid var(--line)",
  borderRadius: "var(--r-sm, 6px)",
  background: "var(--bg)",
  color: "var(--ink)",
};

const iconBtn = {
  border: "none",
  background: "transparent",
  color: "var(--ink-mute)",
  cursor: "pointer",
  fontSize: 15,
  lineHeight: 1,
  padding: "2px 6px",
};

export function CustomCorrespondenceEditor() {
  const loaded = useApiCall((signal) => apiMethods.getMyCorrespondences({ signal }));

  const [tables, setTables] = useState<CustomCorrespondenceTable[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded.data) setTables(loaded.data.tables);
  }, [loaded.data]);

  function mutate(next: CustomCorrespondenceTable[]): void {
    setTables(next);
    setDirty(true);
  }

  function updateTable(
    id: string,
    updater: (t: CustomCorrespondenceTable) => CustomCorrespondenceTable,
  ): void {
    mutate(tables.map((t) => (t.id === id ? updater(t) : t)));
  }

  function addTable(): void {
    mutate([...tables, { id: newId(), title: "Untitled table", columns: ["Attribute"], rows: [] }]);
  }

  function addColumn(id: string): void {
    updateTable(id, (t) => ({ ...t, columns: [...t.columns, `Column ${t.columns.length + 1}`] }));
  }

  function renameColumn(id: string, idx: number, name: string): void {
    updateTable(id, (t) => {
      const oldName = t.columns[idx];
      const columns = t.columns.map((c, i) => (i === idx ? name : c));
      const rows =
        oldName === undefined || oldName === name
          ? t.rows
          : t.rows.map((r) => {
              if (!(oldName in r.cells)) return r;
              const cells = { ...r.cells };
              cells[name] = cells[oldName] ?? "";
              delete cells[oldName];
              return { ...r, cells };
            });
      return { ...t, columns, rows };
    });
  }

  function removeColumn(id: string, idx: number): void {
    updateTable(id, (t) => {
      const gone = t.columns[idx];
      const columns = t.columns.filter((_, i) => i !== idx);
      const rows =
        gone === undefined
          ? t.rows
          : t.rows.map((r) => {
              if (!(gone in r.cells)) return r;
              const cells = { ...r.cells };
              delete cells[gone];
              return { ...r, cells };
            });
      return { ...t, columns, rows };
    });
  }

  function addRow(id: string): void {
    updateTable(id, (t) => ({ ...t, rows: [...t.rows, { subject: "", cells: {} }] }));
  }

  function removeRow(id: string, idx: number): void {
    updateTable(id, (t) => ({ ...t, rows: t.rows.filter((_, i) => i !== idx) }));
  }

  function setSubject(id: string, idx: number, subject: string): void {
    updateTable(id, (t) => ({
      ...t,
      rows: t.rows.map((r, i) => (i === idx ? { ...r, subject } : r)),
    }));
  }

  function setCell(id: string, rowIdx: number, column: string, value: string): void {
    updateTable(id, (t) => ({
      ...t,
      rows: t.rows.map((r, i) =>
        i === rowIdx ? { ...r, cells: { ...r.cells, [column]: value } } : r,
      ),
    }));
  }

  function removeTable(id: string): void {
    mutate(tables.filter((t) => t.id !== id));
  }

  async function save(): Promise<void> {
    setSaving(true);
    try {
      const res = await apiMethods.putMyCorrespondences({ tables });
      setTables(res.tables);
      setDirty(false);
      Toast.push({ tone: "success", title: "Saved", body: "Your tables are stored." });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "Couldn't save your tables",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ marginTop: 34 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 4,
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
          Your own tables
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="quiet" onClick={addTable}>
            New table
          </Button>
          <Button onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
      <p
        style={{
          margin: "0 0 18px",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--ink-soft)",
        }}
      >
        Build your own 777 — subjects down the side, categories across the top, your values in the
        cells. Nothing here is shared until you choose to.
      </p>

      {loaded.status === "loading" ? (
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>Loading…</p>
      ) : tables.length === 0 ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-mute)" }}>
          No tables of your own yet. “New table” starts one.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 28 }}>
          {tables.map((t) => (
            <div
              key={t.id}
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg, 14px)",
                padding: 16,
                background: "var(--bg-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <input
                  aria-label="Table title"
                  value={t.title}
                  onChange={(e) => updateTable(t.id, (tt) => ({ ...tt, title: e.target.value }))}
                  style={{
                    ...cellInput,
                    flex: 1,
                    fontFamily: "var(--font-display, var(--font-serif))",
                    fontSize: 17,
                  }}
                />
                <button
                  type="button"
                  aria-label="Delete table"
                  title="Delete table"
                  onClick={() => removeTable(t.id)}
                  style={{ ...iconBtn, color: "var(--danger)" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "4px 8px",
                          fontFamily: "var(--font-ui)",
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "var(--ink-mute)",
                          minWidth: 120,
                        }}
                      >
                        Subject
                      </th>
                      {t.columns.map((col, ci) => (
                        <th key={`col-${col}`} style={{ padding: "4px 6px", minWidth: 120 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <input
                              aria-label={`Column ${ci + 1} name`}
                              value={col}
                              onChange={(e) => renameColumn(t.id, ci, e.target.value)}
                              style={{ ...cellInput, fontWeight: 600 }}
                            />
                            <button
                              type="button"
                              aria-label={`Delete column ${col}`}
                              title="Delete column"
                              onClick={() => removeColumn(t.id, ci)}
                              style={iconBtn}
                            >
                              ✕
                            </button>
                          </div>
                        </th>
                      ))}
                      <th style={{ padding: "4px 6px" }}>
                        <Button variant="quiet" size="sm" onClick={() => addColumn(t.id)}>
                          + Column
                        </Button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r, ri) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: a grid row is positional and has no stable id; cells are fully controlled so reconciliation by index is safe here
                      <tr key={ri}>
                        <td style={{ padding: "3px 8px" }}>
                          <input
                            aria-label={`Row ${ri + 1} subject`}
                            value={r.subject}
                            placeholder="Subject"
                            onChange={(e) => setSubject(t.id, ri, e.target.value)}
                            style={cellInput}
                          />
                        </td>
                        {t.columns.map((col) => (
                          <td key={`cell-${col}`} style={{ padding: "3px 6px" }}>
                            <input
                              aria-label={`${r.subject || `Row ${ri + 1}`} — ${col}`}
                              value={r.cells[col] ?? ""}
                              onChange={(e) => setCell(t.id, ri, col, e.target.value)}
                              style={cellInput}
                            />
                          </td>
                        ))}
                        <td style={{ padding: "3px 6px", textAlign: "center" }}>
                          <button
                            type="button"
                            aria-label={`Delete row ${ri + 1}`}
                            title="Delete row"
                            onClick={() => removeRow(t.id, ri)}
                            style={{ ...iconBtn, color: "var(--danger)" }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 10 }}>
                <Button variant="quiet" size="sm" onClick={() => addRow(t.id)}>
                  + Row
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
