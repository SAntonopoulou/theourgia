/**
 * OwnChartsEditor — the practitioner's authored correspondence charts, laid
 * out in the book's manner, interpreted for the web. Mirrors the phone's §10
 * (NOTE_FROM_THE_PHONE-correspondences-v2.md): rows down a scale — canonical
 * family or one's own — columns across, each column under ITS OWN source; the
 * key column stays pinned left as the grid grows; apparatus (source, mapping,
 * commentary) sits behind the column header, never inline. A blank cell is
 * absent; clearing one deletes it. Charts and columns soft-delete.
 *
 * Replaces CustomCorrespondenceEditor; legacy free-form tables arrive here
 * already converted by the backend (custom-scale charts, sourceless columns).
 */

import {
  Button,
  type OwnChart,
  type OwnChartColumn,
  type OwnChartRow,
  TAXONOMY_CATEGORIES,
  Toast,
  chartRows,
  columnAttribution,
  livingCharts,
  livingColumns,
  taxonomyFamilies,
  useApiCall,
} from "@theourgia/shared";
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
  return `chart-${idCounter}-${Date.now()}`;
}

/** "planet" → "Planet"; "sephira" → "Sephira". */
function familyLabel(family: string): string {
  return family ? family[0]?.toUpperCase() + family.slice(1) : family;
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

const keyCell = {
  position: "sticky" as const,
  left: 0,
  background: "var(--bg-2)",
  zIndex: 1,
  padding: "6px 10px",
  whiteSpace: "nowrap" as const,
  borderBottom: "1px solid var(--line)",
};

interface EditorProps {
  /** Called after a successful save, so the lookup can refresh its merge. */
  onSaved?: (charts: OwnChart[]) => void;
}

export function OwnChartsEditor({ onSaved }: EditorProps) {
  const loaded = useApiCall((signal) => apiMethods.getMyCorrespondenceCharts({ signal }));

  const [charts, setCharts] = useState<OwnChart[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  /** The cell whose note is being edited, if any. */
  const [noteAt, setNoteAt] = useState<{ columnId: string; rowKey: string } | null>(null);

  useEffect(() => {
    if (loaded.data) setCharts(loaded.data.charts);
  }, [loaded.data]);

  const living = livingCharts(charts);
  const open = living.find((c) => c.id === openId) ?? null;

  function mutate(next: OwnChart[]): void {
    setCharts(next);
    setDirty(true);
  }

  function updateChart(id: string, updater: (c: OwnChart) => OwnChart): void {
    mutate(charts.map((c) => (c.id === id ? updater(c) : c)));
  }

  function newChart(scaleFamily: string | null): void {
    const id = newId();
    mutate([
      ...charts,
      {
        id,
        name: "Untitled chart",
        scaleFamily,
        rows: [],
        columns: [],
        cells: {},
      },
    ]);
    setOpenId(id);
  }

  function deleteChart(id: string): void {
    // A tombstone, as on the phone — the grid stays for an undelete.
    updateChart(id, (c) => ({ ...c, deletedAt: new Date().toISOString() }));
    if (openId === id) setOpenId(null);
  }

  function addColumn(chartId: string): void {
    updateChart(chartId, (c) => ({
      ...c,
      columns: [...c.columns, { id: newId(), caption: "Untitled column" }],
    }));
  }

  function updateColumn(
    chartId: string,
    columnId: string,
    updater: (col: OwnChartColumn) => OwnChartColumn,
  ): void {
    updateChart(chartId, (c) => ({
      ...c,
      columns: c.columns.map((col) => (col.id === columnId ? updater(col) : col)),
    }));
  }

  function deleteColumn(chartId: string, columnId: string): void {
    updateColumn(chartId, columnId, (col) => ({
      ...col,
      deletedAt: new Date().toISOString(),
    }));
  }

  function addRow(chartId: string): void {
    updateChart(chartId, (c) => ({
      ...c,
      rows: [...c.rows, { key: newId(), label: "" }],
    }));
  }

  function updateRow(
    chartId: string,
    rowKey: string,
    updater: (r: OwnChartRow) => OwnChartRow,
  ): void {
    updateChart(chartId, (c) => ({
      ...c,
      rows: c.rows.map((r) => (r.key === rowKey ? updater(r) : r)),
    }));
  }

  function deleteRow(chartId: string, rowKey: string): void {
    updateChart(chartId, (c) => {
      const cells = Object.fromEntries(
        Object.entries(c.cells).map(([columnId, held]) => {
          const { [rowKey]: _gone, ...rest } = held;
          return [columnId, rest];
        }),
      );
      return { ...c, rows: c.rows.filter((r) => r.key !== rowKey), cells };
    });
  }

  function setCell(chartId: string, columnId: string, rowKey: string, value: string): void {
    updateChart(chartId, (c) => {
      const held = { ...(c.cells[columnId] ?? {}) };
      if (value.trim() === "") {
        // A blank cell IS the absent entry — clearing deletes, as on the phone.
        delete held[rowKey];
      } else {
        held[rowKey] = { ...held[rowKey], value };
      }
      return { ...c, cells: { ...c.cells, [columnId]: held } };
    });
  }

  function setNote(chartId: string, columnId: string, rowKey: string, note: string): void {
    updateChart(chartId, (c) => {
      const held = { ...(c.cells[columnId] ?? {}) };
      const cell = held[rowKey];
      if (!cell) return c; // a note rides a value; no value, nowhere to ride
      held[rowKey] = { ...cell, note: note.trim() === "" ? null : note };
      return { ...c, cells: { ...c.cells, [columnId]: held } };
    });
  }

  async function save(): Promise<void> {
    setSaving(true);
    try {
      // The backend refuses blank cell values (a blank cell is absent);
      // strip any that in-progress typing left behind.
      const cleaned = charts.map((c) => ({
        ...c,
        cells: Object.fromEntries(
          Object.entries(c.cells).map(([columnId, held]) => [
            columnId,
            Object.fromEntries(Object.entries(held).filter(([, cell]) => cell.value.trim() !== "")),
          ]),
        ),
      }));
      const res = await apiMethods.putMyCorrespondenceCharts({ charts: cleaned });
      setCharts(res.charts);
      setDirty(false);
      onSaved?.(res.charts);
      Toast.push({ tone: "success", title: "Saved", body: "Your charts are stored." });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "Couldn't save your charts",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ marginTop: 10 }}>
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
          Your charts
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <NewChartMenu onPick={newChart} />
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
        A chart is a table of your own — rows down a scale, a column for each source you set beside
        it. Each column names whose claim it is; one without a source stands as yours. A column of a
        canonical chart can be mapped into the lookup, where its values appear beside the installed
        packs&rsquo;.
      </p>

      {loaded.status === "loading" ? (
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>Loading…</p>
      ) : living.length === 0 ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-mute)" }}>
          No charts of your own yet. &ldquo;New chart&rdquo; begins one.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
          {living.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenId(openId === c.id ? null : c.id)}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                textAlign: "left",
                padding: "10px 14px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md, 10px)",
                background: openId === c.id ? "var(--accent-soft)" : "var(--bg-2)",
                color: "var(--ink)",
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
              }}
            >
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              <span style={{ color: "var(--ink-mute)", fontSize: 12 }}>
                {c.scaleFamily ? familyLabel(c.scaleFamily) : "Its own scale"} ·{" "}
                {livingColumns(c).length} {livingColumns(c).length === 1 ? "column" : "columns"}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && (
        <ChartGrid
          chart={open}
          noteAt={noteAt}
          onRename={(name) => updateChart(open.id, (c) => ({ ...c, name }))}
          onCommentary={(commentary) => updateChart(open.id, (c) => ({ ...c, commentary }))}
          onDelete={() => deleteChart(open.id)}
          onAddColumn={() => addColumn(open.id)}
          onColumn={(columnId, updater) => updateColumn(open.id, columnId, updater)}
          onDeleteColumn={(columnId) => deleteColumn(open.id, columnId)}
          onAddRow={() => addRow(open.id)}
          onRow={(rowKey, updater) => updateRow(open.id, rowKey, updater)}
          onDeleteRow={(rowKey) => deleteRow(open.id, rowKey)}
          onCell={(columnId, rowKey, value) => setCell(open.id, columnId, rowKey, value)}
          onNote={(columnId, rowKey, note) => setNote(open.id, columnId, rowKey, note)}
          onNoteAt={setNoteAt}
        />
      )}
    </section>
  );
}

function NewChartMenu({ onPick }: { onPick: (scaleFamily: string | null) => void }) {
  const [openMenu, setOpenMenu] = useState(false);
  return (
    <span style={{ position: "relative" }}>
      <Button variant="quiet" onClick={() => setOpenMenu((v) => !v)}>
        New chart
      </Button>
      {openMenu && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            zIndex: 5,
            minWidth: 220,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md, 10px)",
            background: "var(--bg-2)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            padding: 6,
          }}
        >
          <p
            style={{
              margin: "4px 8px 6px",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--ink-mute)",
            }}
          >
            Its rows run down
          </p>
          {taxonomyFamilies().map((family) => (
            <MenuItem
              key={family}
              label={familyLabel(family)}
              onClick={() => {
                setOpenMenu(false);
                onPick(family);
              }}
            />
          ))}
          <MenuItem
            label="A scale of your own"
            onClick={() => {
              setOpenMenu(false);
              onPick(null);
            }}
          />
        </div>
      )}
    </span>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "7px 10px",
        border: "none",
        borderRadius: "var(--r-sm, 6px)",
        background: "transparent",
        color: "var(--ink)",
        fontFamily: "var(--font-ui)",
        fontSize: 13.5,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-3, var(--bg))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}

interface GridProps {
  chart: OwnChart;
  noteAt: { columnId: string; rowKey: string } | null;
  onRename: (name: string) => void;
  onCommentary: (commentary: string) => void;
  onDelete: () => void;
  onAddColumn: () => void;
  onColumn: (columnId: string, updater: (c: OwnChartColumn) => OwnChartColumn) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddRow: () => void;
  onRow: (rowKey: string, updater: (r: OwnChartRow) => OwnChartRow) => void;
  onDeleteRow: (rowKey: string) => void;
  onCell: (columnId: string, rowKey: string, value: string) => void;
  onNote: (columnId: string, rowKey: string, note: string) => void;
  onNoteAt: (at: { columnId: string; rowKey: string } | null) => void;
}

function ChartGrid({
  chart,
  noteAt,
  onRename,
  onCommentary,
  onDelete,
  onAddColumn,
  onColumn,
  onDeleteColumn,
  onAddRow,
  onRow,
  onDeleteRow,
  onCell,
  onNote,
  onNoteAt,
}: GridProps) {
  const [showCommentary, setShowCommentary] = useState(false);
  const [apparatusFor, setApparatusFor] = useState<string | null>(null);

  const rows = chartRows(chart);
  const columns = livingColumns(chart);
  const custom = !chart.scaleFamily;
  const notedCell = noteAt === null ? undefined : chart.cells[noteAt.columnId]?.[noteAt.rowKey];
  const notedColumn = noteAt === null ? undefined : columns.find((c) => c.id === noteAt.columnId);
  const notedRow = noteAt === null ? undefined : rows.find((r) => r.key === noteAt.rowKey);

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        padding: 16,
        background: "var(--bg-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <input
          aria-label="Chart name"
          value={chart.name}
          onChange={(e) => onRename(e.target.value)}
          style={{
            ...cellInput,
            flex: 1,
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 17,
          }}
        />
        <Button variant="quiet" size="sm" onClick={() => setShowCommentary((v) => !v)}>
          Commentary
        </Button>
        <button
          type="button"
          aria-label="Delete chart"
          title="Delete chart"
          onClick={onDelete}
          style={{ ...iconBtn, color: "var(--danger)" }}
        >
          ✕
        </button>
      </div>
      <p
        style={{
          margin: "0 0 12px",
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
        }}
      >
        {custom
          ? "A scale of your own — its rows are yours to coin, and it stands apart from the lookup."
          : `Rows are the canon's ${familyLabel(chart.scaleFamily ?? "")} scale, in the canon's order.`}
      </p>

      {showCommentary && (
        <textarea
          aria-label="Chart commentary"
          value={chart.commentary ?? ""}
          onChange={(e) => onCommentary(e.target.value)}
          placeholder="The why and whence — kept beside the grid, not in it."
          rows={3}
          style={{ ...cellInput, marginBottom: 12, resize: "vertical" }}
        />
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%" }}>
          <thead>
            <tr>
              <th style={{ ...keyCell, minWidth: 130, textAlign: "left" }}>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--ink-mute)",
                  }}
                >
                  {custom ? "Rows" : familyLabel(chart.scaleFamily ?? "")}
                </span>
              </th>
              {columns.map((column) => (
                <th
                  key={column.id}
                  style={{
                    padding: "4px 6px",
                    minWidth: 150,
                    borderBottom: "1px solid var(--line)",
                    verticalAlign: "top",
                  }}
                >
                  <input
                    aria-label={`Caption of ${columnAttribution(column)} column`}
                    value={column.caption}
                    onChange={(e) =>
                      onColumn(column.id, (c) => ({ ...c, caption: e.target.value }))
                    }
                    style={{ ...cellInput, fontWeight: 600 }}
                  />
                  <button
                    type="button"
                    onClick={() => setApparatusFor(apparatusFor === column.id ? null : column.id)}
                    style={{
                      ...iconBtn,
                      display: "block",
                      padding: "3px 2px 0",
                      fontSize: 11.5,
                      fontFamily: "var(--font-ui)",
                      color: column.categoryKey ? "var(--accent)" : "var(--ink-mute)",
                      whiteSpace: "nowrap",
                    }}
                    title="Source, mapping and commentary"
                  >
                    {columnAttribution(column)}
                    {column.categoryKey ? " · mapped" : ""} ▾
                  </button>
                </th>
              ))}
              <th style={{ padding: "4px 6px", borderBottom: "1px solid var(--line)" }}>
                <Button variant="quiet" size="sm" onClick={onAddColumn}>
                  + Column
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td style={keyCell}>
                  {custom ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <input
                        aria-label="Row label"
                        value={row.label}
                        placeholder="Row"
                        onChange={(e) => onRow(row.key, (r) => ({ ...r, label: e.target.value }))}
                        style={{ ...cellInput, minWidth: 90 }}
                      />
                      <button
                        type="button"
                        aria-label={`Delete row ${row.label || row.key}`}
                        title="Delete row"
                        onClick={() => onDeleteRow(row.key)}
                        style={{ ...iconBtn, color: "var(--danger)" }}
                      >
                        ✕
                      </button>
                    </span>
                  ) : (
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 13.5,
                        color: "var(--ink)",
                      }}
                    >
                      {row.glyph ? (
                        <span style={{ color: "var(--accent)", marginRight: 6 }}>{row.glyph}</span>
                      ) : null}
                      {row.label}
                    </span>
                  )}
                </td>
                {columns.map((column) => {
                  const cell = chart.cells[column.id]?.[row.key];
                  return (
                    <td
                      key={column.id}
                      style={{ padding: "3px 6px", borderBottom: "1px solid var(--line)" }}
                    >
                      <input
                        aria-label={`${row.label || row.key} — ${column.caption}`}
                        value={cell?.value ?? ""}
                        onChange={(e) => onCell(column.id, row.key, e.target.value)}
                        onFocus={() => onNoteAt({ columnId: column.id, rowKey: row.key })}
                        title={cell?.note ?? undefined}
                        style={{
                          ...cellInput,
                          borderColor: cell?.note ? "var(--accent)" : "var(--line)",
                        }}
                      />
                    </td>
                  );
                })}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {custom && (
        <div style={{ marginTop: 10 }}>
          <Button variant="quiet" size="sm" onClick={onAddRow}>
            + Row
          </Button>
        </div>
      )}

      {apparatusFor !== null &&
        (() => {
          const column = columns.find((c) => c.id === apparatusFor);
          if (!column) return null;
          return (
            <ColumnApparatus
              column={column}
              custom={custom}
              onColumn={(updater) => onColumn(column.id, updater)}
              onDelete={() => {
                setApparatusFor(null);
                onDeleteColumn(column.id);
              }}
            />
          );
        })()}

      {noteAt !== null && notedCell && (
        <div style={{ marginTop: 12 }}>
          <label
            style={{
              display: "block",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            <span style={{ display: "block", marginBottom: 4 }}>
              Note — {notedRow?.label ?? noteAt.rowKey} · {notedColumn?.caption ?? ""}
            </span>
            <input
              value={notedCell.note ?? ""}
              onChange={(e) => onNote(noteAt.columnId, noteAt.rowKey, e.target.value)}
              placeholder="An aside for this one value — edition, caveat, cross-reference."
              style={cellInput}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function ColumnApparatus({
  column,
  custom,
  onColumn,
  onDelete,
}: {
  column: OwnChartColumn;
  custom: boolean;
  onColumn: (updater: (c: OwnChartColumn) => OwnChartColumn) => void;
  onDelete: () => void;
}) {
  const source = column.source ?? null;
  function setSource(patch: Partial<NonNullable<OwnChartColumn["source"]>>): void {
    onColumn((c) => {
      const next = { title: "", ...(c.source ?? {}), ...patch };
      // No title, no source — the column stands as the practitioner's own.
      return { ...c, source: next.title.trim() === "" ? null : next };
    });
  }
  return (
    <div
      style={{
        marginTop: 14,
        padding: 12,
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md, 10px)",
        background: "var(--bg)",
        display: "grid",
        gap: 8,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--ink-mute)",
        }}
      >
        {column.caption} — its source
      </p>
      <p
        style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-soft)" }}
      >
        Whose claim this column is. Left empty, it stands as your own.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: 8 }}>
        <input
          aria-label="Source title"
          placeholder="Title"
          value={source?.title ?? ""}
          onChange={(e) => setSource({ title: e.target.value })}
          style={cellInput}
        />
        <input
          aria-label="Source author"
          placeholder="Author"
          value={source?.author ?? ""}
          onChange={(e) => setSource({ author: e.target.value || null })}
          style={cellInput}
        />
        <input
          aria-label="Source year"
          placeholder="Year"
          inputMode="numeric"
          value={source?.year ?? ""}
          onChange={(e) => {
            const year = Number.parseInt(e.target.value, 10);
            setSource({ year: Number.isNaN(year) ? null : year });
          }}
          style={cellInput}
        />
      </div>
      <input
        aria-label="Source note"
        placeholder="Note (edition, page, locus)"
        value={source?.note ?? ""}
        onChange={(e) => setSource({ note: e.target.value || null })}
        style={cellInput}
      />
      {!custom && (
        <label
          style={{
            display: "grid",
            gap: 4,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-soft)",
          }}
        >
          Stands in the lookup as
          <select
            value={column.categoryKey ?? ""}
            onChange={(e) => onColumn((c) => ({ ...c, categoryKey: e.target.value || null }))}
            style={{ ...cellInput, cursor: "pointer" }}
          >
            <option value="">This chart only</option>
            {TAXONOMY_CATEGORIES.map((category) => (
              <option key={category.key} value={category.key}>
                {category.label}
              </option>
            ))}
          </select>
          <span style={{ color: "var(--ink-mute)" }}>
            Mapped, its values appear in Look up beside the installed packs.
          </span>
        </label>
      )}
      <textarea
        aria-label="Column commentary"
        placeholder="Commentary — why and whence."
        value={column.commentary ?? ""}
        onChange={(e) => onColumn((c) => ({ ...c, commentary: e.target.value }))}
        rows={2}
        style={{ ...cellInput, resize: "vertical" }}
      />
      <div>
        <Button variant="quiet" size="sm" onClick={onDelete}>
          Delete column
        </Button>
      </div>
    </div>
  );
}
