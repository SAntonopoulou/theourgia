/**
 * AgentMemoryReader — H10 Cluster C9 surface.
 *
 * Rule 59 — human-editable. The component is controlled: parent owns
 * the file list + content + activeFile. Edit toggles to an inline
 * textarea; Save fires onSave(activeFile, body). Archive fires
 * onArchive(activeFile). Add fires onAdd().
 */

import { useEffect, useState, type CSSProperties } from "react";

import { BUTTONS, EDIT_HINT, SECTION_LABELS } from "./copy.js";

export interface MemoryFileMeta {
  /** File name as it appears on disk (e.g., "recurring-symbols.md"). */
  name: string;
  /** Display-friendly meta line ("2.1 KB · 2 hours ago"). */
  meta: string;
}

export interface AgentMemoryReaderSurfaceProps {
  files: readonly MemoryFileMeta[];
  /** Currently selected file's name. */
  activeFile: string;
  /** Body of the active file (markdown source). */
  content: string;
  onSelectFile?: (name: string) => void;
  onAdd?: () => void;
  onArchive?: (name: string) => void;
  onSave?: (name: string, body: string) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 920,
  margin: "0 auto",
  padding: "24px 24px 40px",
  display: "grid",
  gridTemplateColumns: "260px 1fr",
  gap: 20,
  alignItems: "start",
};

const PANEL_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

function FileIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function AgentMemoryReaderSurface({
  files,
  activeFile,
  content,
  onSelectFile,
  onAdd,
  onArchive,
  onSave,
  className,
  style,
}: AgentMemoryReaderSurfaceProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  // Re-sync the draft when the underlying file or content changes.
  useEffect(() => {
    setDraft(content);
    setEditing(false);
  }, [content, activeFile]);

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      {/* File list */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span style={PANEL_LABEL}>{SECTION_LABELS.memoryFiles}</span>
          <button
            type="button"
            onClick={onAdd}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--accent)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {BUTTONS.add}
          </button>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          {files.map((f) => {
            const on = f.name === activeFile;
            return (
              <button
                key={f.name}
                type="button"
                data-file={f.name}
                aria-pressed={on}
                onClick={() => onSelectFile?.(f.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "9px 11px",
                  borderRadius: "var(--r-md)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: on ? "var(--line-2)" : "transparent",
                  background: on ? "var(--bg-2)" : "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                  color: "inherit",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    color: "var(--ink-mute)",
                    flex: "none",
                  }}
                >
                  <FileIcon />
                </span>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12.5,
                      color: "var(--ink)",
                    }}
                  >
                    {f.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 10.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {f.meta}
                  </div>
                </div>
              </button>
            );
          })}
          {files.length === 0 ? (
            <div
              style={{
                padding: "12px 11px",
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink-mute)",
                lineHeight: 1.5,
              }}
            >
              The agent hasn't written any memory yet. It will write its
              first notes after the next wake.
            </div>
          ) : null}
        </div>
      </div>

      {/* Viewer */}
      <div
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-lg)",
          background: "var(--bg-2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "13px 16px",
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            borderBottomColor: "var(--line)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--ink)",
              flex: 1,
              minWidth: 0,
            }}
            data-active-file
          >
            {activeFile}
          </span>
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(content);
                }}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  padding: "6px 11px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {BUTTONS.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSave?.(activeFile, draft);
                  setEditing(false);
                }}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 12.5,
                  color: "var(--accent-ink)",
                  background: "var(--accent)",
                  padding: "6px 13px",
                  borderRadius: "var(--r-md)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--accent)",
                  cursor: "pointer",
                }}
              >
                {BUTTONS.save}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onArchive?.(activeFile)}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  padding: "6px 11px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {BUTTONS.archive}
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-soft)",
                  padding: "6px 12px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <EditIcon />
                {BUTTONS.edit}
              </button>
            </>
          )}
        </div>
        {editing ? (
          <div style={{ padding: "14px 16px" }} data-mode="editing">
            <textarea
              rows={12}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={`Edit ${activeFile}`}
              style={{
                width: "100%",
                padding: "13px 15px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg)",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                lineHeight: 1.65,
                resize: "vertical",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginTop: 10,
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              {EDIT_HINT}
            </div>
          </div>
        ) : (
          <pre
            data-mode="reading"
            style={{
              margin: 0,
              padding: "18px 20px",
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              lineHeight: 1.7,
              color: "var(--ink-soft)",
              whiteSpace: "pre-wrap",
            }}
          >
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
