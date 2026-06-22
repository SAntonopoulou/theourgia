/**
 * TalismanDesignerSurface — composes the H05 §E worked example.
 *
 * Four-zone composition:
 *   · Topbar — talisman name + FaceTablist + Export button
 *   · LayerPanel (280px) — z-ordered layer rail + Mirror button
 *   · Centre — TalismanCanvas + snap-grid switch + guide caption
 *   · Right rail (340px) — {layer}·settings + LayerConfig + metadata
 *     (name · purpose · linked election · linked working · materials)
 *     + Save talisman button
 *
 * Plus two overlays: ElectionPickerModal and SealedSaveDialog (the
 * committed-make moment with the --seal switch).
 *
 * Per H05 §E: the talisman is a composition of references —
 * `squareId` + `sigilIds[]` + inscriptions — rendered to SVG every
 * frame; never a stored bitmap.
 */

import { type CSSProperties, useState } from "react";

import {
  ELECTION_PREVIEW_DETAIL,
  ELECTION_PREVIEW_GLYPH,
  ELECTION_PREVIEW_WHEN,
  LINKED_ELECTION_FOOTER,
  LINKED_ELECTION_LABEL,
  LINKED_WORKING_CTA,
  TL_LINKED_WORKING_LABEL,
  MATERIALS_DEFAULT,
  MATERIALS_LABEL,
  MATERIALS_PLACEHOLDER,
  NAME_LABEL,
  PURPOSE_DEFAULT,
  PURPOSE_LABEL,
  SAVE_TALISMAN_BUTTON,
  SETTINGS_EYEBROW_TAIL,
  SNAP_GRID_LABEL,
  SNAP_GUIDES_CAPTION,
  THIS_TALISMAN_EYEBROW,
  TOPBAR_DEFAULT_NAME,
  layerByKey,
  type ElectionRow,
  type TalismanFace,
  type TalismanLayerKind,
} from "./copy.js";
import { ElectionPickerModal } from "./ElectionPickerModal.js";
import { FaceTablist } from "./FaceTablist.js";
import { LayerConfig } from "./LayerConfig.js";
import { LayerPanel } from "./LayerPanel.js";
import { SealedSaveDialog } from "./SealedSaveDialog.js";
import { TalismanCanvas } from "./TalismanCanvas.js";

const TOPBAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "12px 24px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const PANES_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  minHeight: 0,
  overflow: "hidden",
};

const MAIN_STYLE: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  background:
    "radial-gradient(ellipse at 50% 40%, var(--bg-2), var(--bg) 82%)",
  overflow: "hidden",
};

const RIGHT_RAIL_STYLE: CSSProperties = {
  flex: "0 0 340px",
  minWidth: 0,
  borderLeftWidth: 1,
  borderLeftStyle: "solid",
  borderLeftColor: "var(--line)",
  background: "var(--bg-2)",
  padding: "18px 18px 24px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
};

const FIELD_LABEL: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  color: "var(--ink-mute)",
  marginBottom: 6,
};

const INPUT_STYLE: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
};

export interface TalismanDesignerSurfaceProps {
  initialName?: string;
  initialFace?: TalismanFace;
  initialLayer?: TalismanLayerKind;
  initialElection?: ElectionRow | null;
  /** When true, the Save dialog's --seal switch starts ON. */
  initiationLinked?: boolean;
  onSave?: (payload: { title: string; sealed: boolean }) => void;
  className?: string;
  style?: CSSProperties;
}

export function TalismanDesignerSurface({
  initialName = TOPBAR_DEFAULT_NAME,
  initialFace = "front",
  initialLayer = "square",
  initialElection,
  initiationLinked = false,
  onSave,
  className,
  style,
}: TalismanDesignerSurfaceProps) {
  const [face, setFace] = useState<TalismanFace>(initialFace);
  const [layer, setLayer] = useState<TalismanLayerKind>(initialLayer);
  const [snapGrid, setSnapGrid] = useState(true);
  const [name, setName] = useState(initialName);
  const [purpose, setPurpose] = useState(PURPOSE_DEFAULT);
  const [materials, setMaterials] = useState(MATERIALS_DEFAULT);
  const [election] = useState<ElectionRow | null | undefined>(initialElection);
  const [electionOpen, setElectionOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const layerDef = layerByKey(layer);

  const electionWhen = election?.when ?? ELECTION_PREVIEW_WHEN;
  const electionDetail = election?.detail ?? ELECTION_PREVIEW_DETAIL;
  const electionGlyph = election?.glyph ?? ELECTION_PREVIEW_GLYPH;

  return (
    <div
      data-component="talisman-designer-surface"
      data-face={face}
      data-layer={layer}
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR_STYLE}>
        <div style={{ minWidth: 0 }}>
          <div
            data-talisman-name
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
        </div>
        <FaceTablist value={face} onChange={setFace} />
      </header>

      <div className="tl-panes" style={PANES_STYLE}>
        <LayerPanel
          face={face}
          value={layer}
          onChange={setLayer}
          onMirror={() => {
            /* Mirror semantics land with the layer model API. */
          }}
        />

        <main style={MAIN_STYLE}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 26,
              minHeight: 0,
            }}
          >
            <TalismanCanvas face={face} snapGrid={snapGrid} />
          </div>
          <div
            data-canvas-footer
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              padding: 12,
              borderTopWidth: 1,
              borderTopStyle: "solid",
              borderTopColor: "var(--line)",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                cursor: "pointer",
              }}
            >
              <button
                type="button"
                role="switch"
                aria-checked={snapGrid}
                data-snap-grid-switch
                onClick={() => setSnapGrid((v) => !v)}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 11,
                  background: snapGrid
                    ? "var(--accent-soft)"
                    : "var(--bg-3)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: snapGrid
                    ? "var(--accent)"
                    : "var(--line-2)",
                  position: "relative",
                  flex: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 1,
                    left: snapGrid ? 17 : 1,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: snapGrid
                      ? "var(--accent)"
                      : "var(--ink-mute)",
                  }}
                />
              </button>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-soft)",
                }}
              >
                {SNAP_GRID_LABEL}
              </span>
            </label>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              {SNAP_GUIDES_CAPTION}
            </span>
          </div>
        </main>

        <aside
          data-component="talisman-metadata-rail"
          className="scroll tl-side"
          style={RIGHT_RAIL_STYLE}
        >
          <div
            data-settings-eyebrow
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 12,
            }}
          >
            {layerDef.label}
            {SETTINGS_EYEBROW_TAIL}
          </div>
          <div
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              padding: 16,
              marginBottom: 20,
            }}
          >
            <LayerConfig layer={layer} />
          </div>

          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 12,
            }}
          >
            {THIS_TALISMAN_EYEBROW}
          </div>

          <label style={FIELD_LABEL}>{NAME_LABEL}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-meta-name
            style={{
              ...INPUT_STYLE,
              fontFamily: "var(--font-display)",
              fontSize: 15,
              marginBottom: 14,
            }}
          />

          <label style={FIELD_LABEL}>{PURPOSE_LABEL}</label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            data-meta-purpose
            style={{
              ...INPUT_STYLE,
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              marginBottom: 16,
            }}
          />

          <div style={FIELD_LABEL}>{LINKED_ELECTION_LABEL}</div>
          <button
            type="button"
            data-action="open-election"
            onClick={() => setElectionOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              width: "100%",
              padding: "11px 13px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              marginBottom: 8,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-glyph)",
                color: "var(--accent)",
                fontSize: 18,
                flex: "none",
              }}
            >
              {electionGlyph}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink)",
                }}
              >
                {electionWhen}
              </span>
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                {electionDetail}
              </span>
            </span>
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink-mute)"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <p
            data-election-footer
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              lineHeight: 1.4,
              margin: "0 0 16px",
            }}
          >
            {LINKED_ELECTION_FOOTER}
          </p>

          <div style={FIELD_LABEL}>{TL_LINKED_WORKING_LABEL}</div>
          <button
            type="button"
            data-action="link-working"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "11px 13px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              marginBottom: 16,
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {LINKED_WORKING_CTA}
          </button>

          <label style={FIELD_LABEL}>{MATERIALS_LABEL}</label>
          <textarea
            rows={2}
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
            placeholder={MATERIALS_PLACEHOLDER}
            data-meta-materials
            style={{
              ...INPUT_STYLE,
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              lineHeight: 1.45,
              resize: "vertical",
              marginBottom: 18,
            }}
          />

          <button
            type="button"
            data-action="save-talisman"
            onClick={() => setSaveOpen(true)}
            style={{
              marginTop: "auto",
              width: "100%",
              padding: 12,
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
            }}
          >
            {SAVE_TALISMAN_BUTTON}
          </button>
        </aside>
      </div>

      <ElectionPickerModal
        open={electionOpen}
        onClose={() => setElectionOpen(false)}
      />
      <SealedSaveDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onConfirm={onSave}
        initialTitle={name}
        initiationLinked={initiationLinked}
      />
    </div>
  );
}
