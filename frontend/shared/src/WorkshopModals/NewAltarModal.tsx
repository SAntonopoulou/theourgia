/**
 * NewAltarModal — H07 §S3 Cluster A surface 2.
 *
 * Closes the B108-2e Tool Registry follow-up for altars. Analogous
 * to NewToolModal: the H05 surface emitted intent only; this modal
 * authors the fields and emits a structured payload mapping 1:1 to
 * the backend `CreateAltarInput` from B106.
 *
 * Honesty rules (H07):
 *   • Linked workings NOT captured here — added from the altar
 *     detail view. Same separation-of-concerns as Tool consecration.
 *   • Permanent toggle defaults OFF (matches backend convention).
 *   • Tool multi-select uses the practitioner's existing tools
 *     (consumer supplies via `tools` prop); the empty state nudges
 *     to the Tool Registry rather than offering an inline create.
 *   • Arrangement diagram is OPTIONAL — drag-drop OR "Skip for now"
 *     CTA, no soft-blocking.
 */

import {
  type CSSProperties,
  type ChangeEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";
import { useFocusOnOpen } from "../hooks/useFocusOnOpen.js";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import {
  NA_DESCRIPTION_LABEL,
  NA_DESCRIPTION_PLACEHOLDER,
  NA_DIAGRAM_HELP,
  NA_DIAGRAM_LABEL,
  NA_DIAGRAM_SKIP,
  NA_LINKED_NOTE,
  NA_NAME_LABEL,
  NA_PERMANENT_HELP,
  NA_PERMANENT_LABEL,
  NA_SAVE_LABEL,
  NA_TITLE,
  NA_TOOLS_EMPTY,
  NA_TOOLS_LABEL,
  WM_CANCEL_LABEL,
} from "./copy.js";

/** Lightweight projection of a Tool — what the picker needs to render. */
export interface ToolPickerOption {
  id: string;
  name: string;
  kind: string;
}

export interface NewAltarModalPayload {
  name: string;
  description: string | null;
  is_permanent: boolean;
  /** Selected tool ids in the order the practitioner picked them.
   *  The backend persists this order as render order on the diagram. */
  tool_ids: string[];
  /** Inline SVG markup when supplied; null when the practitioner
   *  chose "Skip for now". */
  arrangement_diagram_svg: string | null;
}

export interface NewAltarModalProps {
  open: boolean;
  onClose: () => void;
  /** The practitioner's existing tools — the multi-select picker
   *  draws from this list. Empty array shows the "no tools yet" nudge. */
  tools: readonly ToolPickerOption[];
  onSave?: (payload: NewAltarModalPayload) => void | Promise<void>;
}

const SCRIM: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const SCRIM_BG: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.55)",
};

const PANEL: CSSProperties = {
  position: "relative",
  width: "min(520px, 100%)",
  maxHeight: "90vh",
  overflowY: "auto",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg)",
  boxShadow: "0 24px 60px rgba(0,0,0,.5)",
  padding: "24px 26px 0",
};

const HEADING: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  margin: "0 0 18px",
};

const LABEL: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 8,
};

const INPUT_BASE: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 15,
};

const FOOTER: CSSProperties = {
  position: "sticky",
  bottom: 0,
  margin: "16px -26px 0",
  padding: "16px 24px 24px",
  borderTopWidth: 1,
  borderTopStyle: "solid",
  borderTopColor: "var(--line)",
  background: "var(--bg)",
};

const MAX_DIAGRAM_BYTES = 1_024 * 1024; // 1 MB per the H07 spec

export function NewAltarModal({
  open,
  onClose,
  tools,
  onSave,
}: NewAltarModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [diagramSvg, setDiagramSvg] = useState<string | null>(null);
  const [diagramError, setDiagramError] = useState<string | null>(null);
  const [diagramFilename, setDiagramFilename] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Escape closes; focus moves to the Name field on open (b108-2fy/2g1 a11y sweep).
  useEscapeToClose(open, onClose);
  useFocusOnOpen(firstInputRef, open);
  useFocusTrap(panelRef, open);

  const saveDisabled = useMemo(() => name.trim() === "", [name]);

  if (!open) return null;

  function toggleTool(id: string): void {
    setSelectedTools((arr) =>
      arr.includes(id) ? arr.filter((t) => t !== id) : [...arr, id],
    );
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    setDiagramError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DIAGRAM_BYTES) {
      setDiagramError(
        "Diagram exceeds 1 MB. Pick a smaller file, or skip and add one later.",
      );
      return;
    }
    if (!file.type.includes("svg")) {
      setDiagramError(
        "Diagram must be an SVG. PNG / JPEG attachments live on the altar's photo affordance.",
      );
      return;
    }
    try {
      const text = await file.text();
      setDiagramSvg(text);
      setDiagramFilename(file.name);
    } catch {
      setDiagramError("Could not read the file.");
    }
  }

  function skipDiagram(): void {
    setDiagramSvg(null);
    setDiagramFilename(null);
    setDiagramError(null);
  }

  function handleSave(): void {
    if (saveDisabled) return;
    onSave?.({
      name: name.trim(),
      description: description.trim() === "" ? null : description,
      is_permanent: isPermanent,
      tool_ids: selectedTools,
      arrangement_diagram_svg: diagramSvg,
    });
    onClose();
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={NA_TITLE}
      data-component="new-altar-modal"
      style={SCRIM}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div style={PANEL}>
        <h2 style={HEADING}>{NA_TITLE}</h2>

        {/* Name */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="na-name" style={LABEL}>
            {NA_NAME_LABEL}
          </label>
          <input
            ref={firstInputRef}
            id="na-name"
            type="text"
            value={name}
            maxLength={240}
            onChange={(e) => setName(e.target.value)}
            data-na-name
            style={INPUT_BASE}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="na-description" style={LABEL}>
            {NA_DESCRIPTION_LABEL}
          </label>
          <textarea
            id="na-description"
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={NA_DESCRIPTION_PLACEHOLDER}
            data-na-description
            style={{
              ...INPUT_BASE,
              fontSize: 14.5,
              lineHeight: 1.5,
              resize: "vertical",
            }}
          />
        </div>

        {/* Permanent toggle */}
        <label
          data-na-permanent-row
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 11,
            padding: "13px 15px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: isPermanent ? "var(--accent)" : "var(--line)",
            borderRadius: "var(--r-md)",
            background: isPermanent
              ? "var(--accent-soft)"
              : "var(--bg-2)",
            marginBottom: 18,
            cursor: "pointer",
          }}
        >
          <button
            type="button"
            role="switch"
            aria-checked={isPermanent}
            aria-label={NA_PERMANENT_LABEL}
            data-na-permanent
            onClick={() => setIsPermanent((v) => !v)}
            style={{
              width: 36,
              height: 20,
              borderRadius: 11,
              background: isPermanent
                ? "var(--accent-soft)"
                : "var(--bg-3)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: isPermanent
                ? "var(--accent)"
                : "var(--line-2)",
              position: "relative",
              flex: "none",
              marginTop: 1,
              padding: 0,
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 1,
                left: isPermanent ? 17 : 1,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: isPermanent
                  ? "var(--accent)"
                  : "var(--ink-mute)",
              }}
            />
          </button>
          <span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink)",
              }}
            >
              {NA_PERMANENT_LABEL}
            </span>
            <br />
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
            >
              {NA_PERMANENT_HELP}
            </span>
          </span>
        </label>

        {/* Tools multi-select */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL}>{NA_TOOLS_LABEL}</label>
          {tools.length === 0 ? (
            <div
              data-na-tools-empty
              style={{
                padding: "12px 14px",
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
              }}
            >
              {NA_TOOLS_EMPTY}
            </div>
          ) : (
            <div
              data-na-tools
              role="group"
              aria-label={NA_TOOLS_LABEL}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                padding: "8px 10px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
              {tools.map((t) => {
                const on = selectedTools.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    data-tool-id={t.id}
                    onClick={() => toggleTool(t.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 11px",
                      borderRadius: 20,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: on
                        ? "var(--accent)"
                        : "var(--line-2)",
                      background: on
                        ? "var(--accent-soft)"
                        : "var(--bg)",
                      color: on ? "var(--ink)" : "var(--ink-soft)",
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      cursor: "pointer",
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Arrangement diagram */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="na-diagram" style={LABEL}>
            {NA_DIAGRAM_LABEL}
          </label>
          {diagramSvg ? (
            <div
              data-na-diagram-preview
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-glyph)",
                  color: "var(--accent)",
                }}
              >
                ✓
              </span>
              <span
                style={{
                  flex: 1,
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {diagramFilename ?? "Diagram attached"}
              </span>
              <button
                type="button"
                onClick={skipDiagram}
                data-action="clear-diagram"
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--r-md)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line-2)",
                  background: "transparent",
                  color: "var(--ink-mute)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  position: "relative",
                  padding: "16px 12px",
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: "var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  textAlign: "center",
                }}
              >
                <input
                  id="na-diagram"
                  type="file"
                  accept="image/svg+xml,.svg"
                  onChange={handleFileChange}
                  data-na-diagram-input
                  aria-label={NA_DIAGRAM_LABEL}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-soft)",
                  }}
                >
                  Drag-drop or click to attach SVG
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                    marginTop: 4,
                  }}
                >
                  {NA_DIAGRAM_HELP}
                </div>
              </div>
              <button
                type="button"
                onClick={skipDiagram}
                data-action="skip-diagram"
                style={{
                  marginTop: 8,
                  padding: 0,
                  background: "transparent",
                  border: "none",
                  color: "var(--ink-mute)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {NA_DIAGRAM_SKIP}
              </button>
              {diagramError ? (
                <div
                  data-na-diagram-error
                  style={{
                    marginTop: 8,
                    padding: "8px 11px",
                    borderRadius: "var(--r-md)",
                    background: "var(--warn-soft)",
                    color: "var(--warn)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                  }}
                  role="status"
                >
                  {diagramError}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={FOOTER}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 14,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              lineHeight: 1.45,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-glyph)",
                color: "var(--accent)",
                flex: "none",
              }}
            >
              ‡
            </span>
            {NA_LINKED_NOTE}
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              data-action="cancel"
              style={{
                padding: "11px 18px",
                borderRadius: "var(--r-md)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              {WM_CANCEL_LABEL}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveDisabled}
              aria-disabled={saveDisabled}
              data-action="save"
              style={{
                padding: "11px 20px",
                borderRadius: "var(--r-md)",
                background: saveDisabled
                  ? "var(--bg-3)"
                  : "var(--accent)",
                color: saveDisabled
                  ? "var(--ink-mute)"
                  : "var(--accent-ink)",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                cursor: saveDisabled ? "not-allowed" : "pointer",
                opacity: saveDisabled ? 0.7 : 1,
              }}
            >
              {NA_SAVE_LABEL}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
