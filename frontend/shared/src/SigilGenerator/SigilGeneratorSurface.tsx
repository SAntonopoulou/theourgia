/**
 * SigilGeneratorSurface — composes the H05 Sigil Generator end-to-end.
 *
 * Three-pane composition: left mode rail · centre (config card →
 * preview tile with export menu → operations toolbar) · right
 * "carries" rail. Plus three overlays: Charge & save dialog,
 * Library slide-in, Owned-deck modal.
 *
 * All editorial copy lives in `./copy.ts`; the SVG engines live in
 * `../workshop/`; this file is pure composition + state plumbing.
 */

import { type CSSProperties, useState } from "react";

import { type CurveFamily, type PlanetKey } from "../workshop/index.js";

import { CarriesPanel } from "./CarriesPanel.js";
import { ChargeSaveDialog } from "./ChargeSaveDialog.js";
import { ConfigPanel, type CurveFamilyUI } from "./ConfigPanel.js";
import {
  INTENTION_DEFAULT,
  TOPBAR_SUBTITLE_TAIL,
  TOPBAR_TITLE,
  modeCitation,
  modeLabel,
  type SigilMode,
  type SigilPurpose,
} from "./copy.js";
import { ExportMenu } from "./ExportMenu.js";
import { ModeRail } from "./ModeRail.js";
import { OperationsToolbar } from "./OperationsToolbar.js";
import { OwnedDeckOverlay } from "./OwnedDeckOverlay.js";
import { SigilLibraryPanel, type SigilLibraryEntry } from "./SigilLibraryPanel.js";
import { SigilPreview } from "./SigilPreview.js";

const TOPBAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  padding: "14px 28px",
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
  overflowY: "auto",
  padding: "22px 26px",
  background:
    "radial-gradient(ellipse at 50% 30%, var(--bg-2), var(--bg) 80%)",
};

const PREVIEW_TILE: CSSProperties = {
  position: "relative",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-sunk)",
  padding: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 480,
};

const CONFIG_CARD: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
  padding: "18px 20px",
  marginBottom: 20,
};

export interface SigilGeneratorSurfaceProps {
  initialMode?: SigilMode;
  initialIntention?: string;
  initialSquare?: PlanetKey;
  initialFamily?: CurveFamilyUI;
  initialColor?: string;
  /**
   * Kamea trace handed across from another surface (typically the
   * B92 Magic Squares "Save as sigil" CTA). When set, the SigilPreview
   * draws this exact cell-value path instead of deriving one from the
   * intention. Cleared the moment the user changes mode or intention.
   */
  initialCellSequence?: readonly number[];
  library?: readonly SigilLibraryEntry[];
  onSave?: (payload: {
    title: string;
    purpose: SigilPurpose;
    mode: SigilMode;
    intention: string;
  }) => void;
  onOpenSigil?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function SigilGeneratorSurface({
  initialMode = "spare",
  initialIntention = INTENTION_DEFAULT,
  initialSquare = "saturn",
  initialFamily = "rose",
  initialColor = "var(--accent)",
  initialCellSequence,
  library,
  onSave,
  onOpenSigil,
  className,
  style,
}: SigilGeneratorSurfaceProps) {
  const [mode, setModeState] = useState<SigilMode>(initialMode);
  const [intention, setIntentionState] = useState(initialIntention);
  const [square, setSquare] = useState<PlanetKey>(initialSquare);
  const [family, setFamily] = useState<CurveFamilyUI>(initialFamily);
  // Kamea trace override is cleared the moment the user touches mode
  // or intention — at that point the deterministic random sequence
  // takes back over (the trace was a starting hint, not a lock).
  const [cellSequenceOverride, setCellSequenceOverride] = useState<
    readonly number[] | undefined
  >(initialCellSequence);
  const setMode = (next: SigilMode) => {
    setModeState(next);
    setCellSequenceOverride(undefined);
  };
  const setIntention = (next: string) => {
    setIntentionState(next);
    setCellSequenceOverride(undefined);
  };

  // Engine-level family: "bezier" UI choice maps to "polar" at render
  // (engine doesn't expose a bezier family — the polar curve carries
  // the closest visual character).
  const engineFamily: CurveFamily =
    family === "bezier" ? "polar" : family;
  const [color, setColor] = useState(initialColor);
  const [scale, setScale] = useState(320);
  const [rotate, setRotate] = useState(0);
  const [mirror, setMirror] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const handleSaveCommit = (payload: {
    title: string;
    purpose: SigilPurpose;
  }) => {
    onSave?.({ ...payload, mode, intention });
  };

  return (
    <div
      data-component="sigil-generator-surface"
      data-mode={mode}
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
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
            }}
          >
            {TOPBAR_TITLE}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {modeLabel(mode)}
            {TOPBAR_SUBTITLE_TAIL}
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            aria-label="Sigil library"
            data-action="open-library"
            onClick={() => setLibraryOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 13px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: 8,
              background: "var(--bg-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
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
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
              <circle cx={12} cy={12} r={2.5} />
            </svg>
            Library
          </button>
          <button
            type="button"
            aria-label="Owned-deck overlay"
            data-action="open-deck"
            onClick={() => setDeckOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: 8,
              background: "var(--bg-2)",
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect
                x={4}
                y={5}
                width={11}
                height={15}
                rx={1.5}
                transform="rotate(-7 9.5 12.5)"
              />
              <rect
                x={9}
                y={4}
                width={11}
                height={15}
                rx={1.5}
                transform="rotate(6 14.5 11.5)"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="sg-panes" style={PANES_STYLE}>
        <ModeRail value={mode} onChange={setMode} />

        <main className="scroll" style={MAIN_STYLE}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={CONFIG_CARD}>
              <ConfigPanel
                mode={mode}
                square={square}
                onSquareChange={setSquare}
                family={family}
                onFamilyChange={setFamily}
                intention={intention}
              />
            </div>

            <div style={PREVIEW_TILE}>
              <div style={{ position: "absolute", top: 14, right: 14 }}>
                <ExportMenu
                  open={exportOpen}
                  onToggle={() => setExportOpen((v) => !v)}
                />
              </div>
              <SigilPreview
                mode={mode}
                intention={intention}
                square={square}
                family={engineFamily}
                cellSequenceOverride={cellSequenceOverride}
                operations={{
                  color,
                  rotateDeg: rotate,
                  scalePercent: scale,
                  mirror,
                }}
              />
            </div>

            <OperationsToolbar
              scale={scale}
              rotate={rotate}
              color={color}
              onScale={setScale}
              onRotate={setRotate}
              onColor={setColor}
              onMirror={() => setMirror((v) => !v)}
            />
          </div>
        </main>

        <CarriesPanel
          intention={intention}
          onIntentionChange={setIntention}
          citation={modeCitation(mode)}
          onSave={() => setSaveOpen(true)}
        />
      </div>

      <ChargeSaveDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onCommit={handleSaveCommit}
      />
      <SigilLibraryPanel
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        sigils={library}
        onOpen={(id) => {
          onOpenSigil?.(id);
          setLibraryOpen(false);
        }}
      />
      <OwnedDeckOverlay
        open={deckOpen}
        onClose={() => setDeckOpen(false)}
      />
    </div>
  );
}
