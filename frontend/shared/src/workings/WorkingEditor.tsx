/**
 * Writing a working on the web — the operation, and the items a day asks of it.
 *
 * A working is a rite kept over time; its performable items each have a cadence
 * (once, daily, or so many times a day). This edits the working's name, summary
 * and subject, and its list of items; on save each becomes a `working` /
 * `working-item` document in the record, crossing to the phone. (Phase
 * authoring — stages — stays on the phone for now; items are what a day asks.)
 */

import { type CSSProperties, useState } from "react";

import { Button } from "../Button/Button.js";

export interface WorkingItemInput {
  /** Present for an item that already exists (preserved on save). */
  id?: string;
  createdAt?: string | null;
  title: string;
  cadence: string;
  perDay: number;
  /** The phase this item belongs to, or null for a "throughout" item. The
   *  editor never touches it — phases are authored on the phone or arrive
   *  from a pack, and a save that dropped the assignment would silently
   *  flatten a staged operation. Carried, never edited. */
  stageId?: string | null;
  /** The item's own script, carried untouched for the same reason. */
  script?: string;
  /** A rite of the practitioner's this item points at, carried untouched. */
  ritualId?: string | null;
  /** Local-only React key. */
  _uid?: number;
}

export interface WorkingDraft {
  name: string;
  summary: string;
  subjectName: string;
  items: WorkingItemInput[];
}

export interface WorkingEditorProps {
  initial?: WorkingDraft;
  onSave: (draft: WorkingDraft, removedItems: WorkingItemInput[]) => void;
  onCancel: () => void;
  onDelete?: () => void;
  busy?: boolean;
}

const fieldLabel: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 5,
};

const field: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  fontFamily: "var(--font-ui)",
  fontSize: 14,
  border: "1px solid var(--line)",
  borderRadius: "var(--r-sm, 6px)",
  background: "var(--bg)",
  color: "var(--ink)",
};

const CADENCES = [
  { key: "once", label: "Once" },
  { key: "daily", label: "Daily" },
  { key: "timesADay", label: "× a day" },
];

let uidSeq = 0;

export function WorkingEditor({ initial, onSave, onCancel, onDelete, busy }: WorkingEditorProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [subjectName, setSubjectName] = useState(initial?.subjectName ?? "");
  const [items, setItems] = useState<WorkingItemInput[]>(() =>
    (initial?.items ?? []).map((i) => ({ ...i, _uid: uidSeq++ })),
  );
  const [removed, setRemoved] = useState<WorkingItemInput[]>([]);

  const patch = (uid: number, over: Partial<WorkingItemInput>): void =>
    setItems((list) => list.map((i) => (i._uid === uid ? { ...i, ...over } : i)));

  const addItem = (): void =>
    setItems((list) => [...list, { title: "", cadence: "daily", perDay: 1, _uid: uidSeq++ }]);

  const removeItem = (uid: number): void =>
    setItems((list) => {
      const gone = list.find((i) => i._uid === uid);
      if (gone?.id) setRemoved((r) => [...r, gone]);
      return list.filter((i) => i._uid !== uid);
    });

  const canSave = name.trim().length > 0 && !busy;

  return (
    <div>
      <div style={{ display: "grid", gap: 14, marginBottom: 18, maxWidth: 520 }}>
        <label>
          <div style={fieldLabel}>Name</div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={field} />
        </label>
        <label>
          <div style={fieldLabel}>Summary</div>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One line — what it is for"
            style={field}
          />
        </label>
        <label>
          <div style={fieldLabel}>For (a subject, optional)</div>
          <input
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="Whose chart it turns on, if any"
            style={field}
          />
        </label>
      </div>

      <div style={fieldLabel}>What it asks each day</div>
      <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0, display: "grid", gap: 8 }}>
        {items.map((it) => (
          <li
            key={it._uid}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md, 8px)",
              padding: "8px 10px",
              background: "var(--bg-2)",
            }}
          >
            <input
              value={it.title}
              onChange={(e) => patch(it._uid as number, { title: e.target.value })}
              placeholder="An item — a rite, an oration…"
              style={{ ...field, flex: "2 1 200px", width: "auto" }}
            />
            <select
              value={it.cadence}
              onChange={(e) => patch(it._uid as number, { cadence: e.target.value })}
              style={{ ...field, flex: "0 0 auto", width: "auto" }}
            >
              {CADENCES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            {it.cadence === "timesADay" ? (
              <input
                type="number"
                min={1}
                max={24}
                value={it.perDay}
                onChange={(e) =>
                  patch(it._uid as number, { perDay: Math.max(1, Number(e.target.value) || 1) })
                }
                style={{ ...field, width: 60, flex: "0 0 auto" }}
              />
            ) : null}
            <button
              type="button"
              aria-label="Remove item"
              title="Remove"
              onClick={() => removeItem(it._uid as number)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--danger)",
                cursor: "pointer",
                fontSize: 15,
                marginLeft: "auto",
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <Button variant="quiet" onClick={addItem} disabled={busy}>
        Add item
      </Button>

      <div style={{ display: "flex", gap: 10, marginTop: 22, alignItems: "center" }}>
        <Button
          variant="primary"
          disabled={!canSave}
          loading={busy}
          onClick={() =>
            onSave(
              {
                name: name.trim(),
                summary: summary.trim(),
                subjectName: subjectName.trim(),
                // Everything but the local key survives the save — including
                // the fields this editor does not edit (stageId, script,
                // ritualId), so a staged working is never flattened here.
                items: items.map(({ _uid, ...rest }) => ({
                  ...rest,
                  title: rest.title.trim(),
                })),
              },
              removed,
            )
          }
        >
          {initial ? "Save changes" : "Begin the working"}
        </Button>
        <Button variant="quiet" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        {onDelete ? (
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={busy}
            style={{ marginLeft: "auto" }}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}
