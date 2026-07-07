/**
 * MagicalCircleSurface — composes the H05 Magical Circle end-to-end.
 *
 * 3-zone composition:
 *   · Topbar — name + Diameter input + Open library + Print-tile + Theme + Mode
 *   · RingsCompassRail (280px) — ring list + add/remove + 5 compass options
 *   · Centre — live SVG preview (boundary + rings + axes + compass labels + centre)
 *   · Right rail (320px) — {active ring}·content eyebrow + Kind picker
 *     + RingConfig card + Centre 2-col picker + used-in footnote + Save
 *
 * Plus a PresetCircleLibrary modal for PD circles (LBRP, Heptameron,
 * Goetic, Picatrix, Greek defixiones).
 *
 * Per H05 §S2.4: saved circles are immutable — the footer note states
 * this. The build side honours "Edit a new version" forks when the
 * /api/v1/circles endpoint ships.
 */

import { type CSSProperties, useState } from "react";

import { CentrePicker } from "./CentrePicker.js";
import { CirclePreview } from "./CirclePreview.js";
import {
  CENTRE_ELEMENT_EYEBROW,
  DEFAULT_DIAMETER_M,
  DIAMETER_LABEL,
  MC_KIND_LABEL,
  MC_TOPBAR_DEFAULT_NAME,
  OPEN_FROM_LIBRARY,
  PRINT_TILE_LABEL,
  RING_CONTENT_SUFFIX,
  RING_KINDS,
  SAVE_CIRCLE_BUTTON,
  USED_IN_NOTE_PREFIX,
  USED_IN_NOTE_TAIL,
  ringKindLabel,
  ringLabels,
  type CentreElement,
  type CirclePreset,
  type CompassTradition,
  type RingKind,
} from "./copy.js";
import { PresetCircleLibrary } from "./PresetCircleLibrary.js";
import { RingConfig } from "./RingConfig.js";
import { RingsCompassRail } from "./RingsCompassRail.js";

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
  alignItems: "center",
  justifyContent: "center",
  padding: 26,
  background:
    "radial-gradient(ellipse at 50% 42%, var(--bg-2), var(--bg) 84%)",
  overflow: "auto",
};

const RIGHT_RAIL_STYLE: CSSProperties = {
  flex: "0 0 320px",
  minWidth: 0,
  borderLeftWidth: 1,
  borderLeftStyle: "solid",
  borderLeftColor: "var(--line)",
  background: "var(--bg-2)",
  padding: "18px 18px 24px",
  overflowY: "auto",
};

export interface MagicalCircleSurfaceProps {
  initialName?: string;
  initialRings?: readonly RingKind[];
  initialActiveRing?: number;
  initialCompass?: CompassTradition;
  initialCentre?: CentreElement;
  /** "Used in N workings" — the quiet stat in the footer. */
  usedInCount?: number;
  onSave?: (payload: {
    name: string;
    rings: readonly RingKind[];
    compass: CompassTradition;
    centre: CentreElement;
    diameterMeters: number;
  }) => void;
  onLoadPreset?: (preset: CirclePreset) => void;
  className?: string;
  style?: CSSProperties;
}

export function MagicalCircleSurface({
  initialName = MC_TOPBAR_DEFAULT_NAME,
  // Empty structural default — a single blank ring, no compass
  // tradition assigned, blank centre. The mockup seeded three rings
  // (glyphs · glyphs · inscription), archangel cardinals, and a
  // hexagram centre so every fresh circle looked like a fully-built
  // composition. That leaked as if the practitioner had already
  // started designing.
  initialRings = ["blank"],
  initialActiveRing = 0,
  initialCompass = "custom",
  initialCentre = "blank",
  usedInCount = 3,
  onSave,
  onLoadPreset,
  className,
  style,
}: MagicalCircleSurfaceProps) {
  const [name, setName] = useState(initialName);
  const [diameter, setDiameter] = useState<string>(
    String(DEFAULT_DIAMETER_M),
  );
  const [rings, setRings] = useState<RingKind[]>([...initialRings]);
  const [activeRing, setActiveRing] = useState(initialActiveRing);
  const [compass, setCompass] = useState<CompassTradition>(initialCompass);
  const [centre, setCentre] = useState<CentreElement>(initialCentre);
  const [printTile, setPrintTile] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const labels = ringLabels(rings.length);
  const activeRingLabel = labels[activeRing] ?? "Ring";
  const activeKind = rings[activeRing] ?? "blank";

  const handleAddRing = () => {
    setRings((r) => (r.length < 6 ? [...r, "blank"] : r));
  };
  const handleRemoveRing = () => {
    setRings((r) => {
      if (r.length <= 1) return r;
      const next = r.slice(0, -1);
      setActiveRing((a) => Math.min(a, next.length - 1));
      return next;
    });
  };
  const handlePickKind = (kind: RingKind) => {
    setRings((r) =>
      r.map((existing, i) => (i === activeRing ? kind : existing)),
    );
  };

  const handleSave = () => {
    const parsedDiameter = Number.parseFloat(diameter) || DEFAULT_DIAMETER_M;
    onSave?.({
      name,
      rings,
      compass,
      centre,
      diameterMeters: parsedDiameter,
    });
  };

  return (
    <div
      data-component="magical-circle-surface"
      data-compass={compass}
      data-centre={centre}
      data-ring-count={rings.length}
      data-active-ring={activeRing}
      data-print-tile={printTile}
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
            data-circle-name
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginLeft: 8,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          {DIAMETER_LABEL}
          <input
            type="text"
            value={diameter}
            onChange={(e) => setDiameter(e.target.value)}
            data-diameter
            style={{
              width: 48,
              padding: "7px 8px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              textAlign: "center",
            }}
          />
          m
        </label>
        <button
          type="button"
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
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 5h13l3 3v11H4z" />
            <path d="M8 5v14" />
          </svg>
          {OPEN_FROM_LIBRARY}
        </button>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <button
              type="button"
              role="switch"
              aria-checked={printTile}
              aria-label="Print-tile preview"
              data-action="toggle-print-tile"
              onClick={() => setPrintTile((v) => !v)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 11,
                background: printTile
                  ? "var(--accent-soft)"
                  : "var(--bg-3)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: printTile
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
                  left: printTile ? 17 : 1,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: printTile
                    ? "var(--accent)"
                    : "var(--ink-mute)",
                }}
              />
            </button>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-soft)",
              }}
            >
              {PRINT_TILE_LABEL}
            </span>
          </label>
        </div>
      </header>

      <div className="ci-panes" style={PANES_STYLE}>
        <RingsCompassRail
          ringKinds={rings}
          activeRing={activeRing}
          onPickRing={setActiveRing}
          onAddRing={handleAddRing}
          onRemoveRing={handleRemoveRing}
          compass={compass}
          onPickCompass={setCompass}
        />

        <div style={MAIN_STYLE}>
          <CirclePreview
            rings={rings.map((kind) => ({ kind }))}
            compass={compass}
            centre={centre}
            printTile={printTile}
          />
        </div>

        <aside
          data-component="magical-circle-right-rail"
          className="scroll ci-side"
          style={RIGHT_RAIL_STYLE}
        >
          <div
            data-ring-eyebrow
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 12,
            }}
          >
            {activeRingLabel}
            {RING_CONTENT_SUFFIX}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginBottom: 8,
              }}
            >
              {MC_KIND_LABEL}
            </div>
            <div
              role="group"
              aria-label="Ring kind"
              style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
            >
              {RING_KINDS.map((kind) => {
                const on = activeKind === kind.key;
                return (
                  <button
                    key={kind.key}
                    type="button"
                    aria-pressed={on}
                    data-kind={kind.key}
                    onClick={() => handlePickKind(kind.key)}
                    style={{
                      padding: "6px 11px",
                      borderRadius: "var(--r-md)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: on ? "var(--accent)" : "var(--line)",
                      background: on ? "var(--accent-soft)" : "var(--bg-2)",
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: on ? "var(--ink)" : "var(--ink-soft)",
                      cursor: "pointer",
                    }}
                  >
                    {ringKindLabel(kind.key)}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            data-ring-config-card
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              padding: 15,
              marginBottom: 22,
            }}
          >
            <RingConfig kind={activeKind} />
          </div>

          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 10,
            }}
          >
            {CENTRE_ELEMENT_EYEBROW}
          </div>
          <div style={{ marginBottom: 22 }}>
            <CentrePicker value={centre} onChange={setCentre} />
          </div>

          <div
            data-used-in
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              marginBottom: 16,
            }}
          >
            <svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink-mute)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flex: "none" }}
              aria-hidden="true"
            >
              <path d="M12 6c-2-1.3-4.6-1.5-7-.9v12.4c2.4-.6 5-.4 7 .9 2-1.3 4.6-1.5 7-.9V5.1c-2.4-.6-5-.4-7 .9z" />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
            >
              {USED_IN_NOTE_PREFIX}
              <span style={{ color: "var(--ink-soft)" }}>{usedInCount}</span>
              {USED_IN_NOTE_TAIL}
            </span>
          </div>

          <button
            type="button"
            data-action="save-circle"
            onClick={handleSave}
            style={{
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
            {SAVE_CIRCLE_BUTTON}
          </button>
        </aside>
      </div>

      <PresetCircleLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onLoad={(p) => {
          onLoadPreset?.(p);
          setName(p.name);
        }}
      />
    </div>
  );
}
