/**
 * Writing a rite on the web — one field, marked up as you type, previewed live.
 *
 * The phone's insight (see `riteScript.ts`): a rite is not a form of sixty boxes
 * but one text with the lightest marks — `(instructions)`, `# sections`,
 * `*vibrated*` names. So this is a name, a line of summary, and one script field,
 * with the same parser rendering a live preview beside it. What is written here
 * crosses to the phone as a `ritual` document.
 */

import { type CSSProperties, useState } from "react";

import { Button } from "../Button/Button.js";
import { RITE_SYNTAX_HINT } from "./riteScript.js";
import { RiteScriptView } from "./RiteScriptView.js";

export interface RiteDraft {
  name: string;
  summary: string;
  script: string;
}

export interface RiteEditorProps {
  /** The rite being edited, or undefined for a new one. */
  initial?: RiteDraft;
  onSave: (draft: RiteDraft) => void;
  onCancel: () => void;
  /** Present only for an existing rite. */
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

export function RiteEditor({ initial, onSave, onCancel, onDelete, busy }: RiteEditorProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [script, setScript] = useState(initial?.script ?? "");

  const canSave = name.trim().length > 0 && !busy;

  return (
    <div>
      <div style={{ display: "grid", gap: 14, marginBottom: 16, maxWidth: 520 }}>
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
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <label>
          <div style={fieldLabel}>The rite</div>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={16}
            placeholder="(face East) I call upon *ΙΑΩ*&#10;&#10;# The Cross&#10;Unto Thee…"
            style={{ ...field, fontFamily: "var(--font-serif)", fontSize: 15, resize: "vertical" }}
          />
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginTop: 6,
            }}
          >
            {RITE_SYNTAX_HINT}
          </div>
        </label>

        <div>
          <div style={fieldLabel}>As performed</div>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md, 8px)",
              background: "var(--bg-2)",
              padding: "12px 14px",
              minHeight: 200,
            }}
          >
            <RiteScriptView script={script} emptyMessage="Your words will appear here as you type." />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center" }}>
        <Button
          variant="primary"
          disabled={!canSave}
          loading={busy}
          onClick={() => onSave({ name: name.trim(), summary: summary.trim(), script })}
        >
          {initial ? "Save changes" : "Write the rite"}
        </Button>
        <Button variant="quiet" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        {onDelete ? (
          <Button variant="danger" onClick={onDelete} disabled={busy} style={{ marginLeft: "auto" }}>
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}
