/**
 * PathworkingPanel — Tree of Life selector + path detail composer.
 *
 * Tree SVG coords + path adjacency are ported verbatim from
 * `Theourgia Practice Logs.dc.html` lines 287-298. Path metadata
 * (Hebrew letter, trump, attribution, route) comes from B79's
 * `TREE_OF_LIFE_PATHS`.
 *
 * The default selection is path 25 (Samekh — Temperance — Tiphareth
 * → Yesod), matching the mockup state on line 273.
 */

import { type CSSProperties, useState } from "react";

import {
  TREE_OF_LIFE_PATHS,
  type TreeOfLifePath,
} from "../practice/treeOfLife.js";
import {
  PATH_ATTRIBUTION_LABEL,
  PATH_DEFAULT,
  PATH_INTEGRATION_LABEL,
  PATH_INTEGRATION_PLACEHOLDER,
  PATH_SAVE_LABEL,
  PATH_TREE_EYEBROW,
  PATH_TRUMP_LABEL,
  PATH_VISION_DEFAULT,
  PATH_VISION_LABEL,
  PATH_VISION_PLACEHOLDER,
} from "./copy.js";

const SAVE_ICON = (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 4h11l3 3v13H5zM8 4v5h7" />
  </svg>
);

/** 10 sephiroth pixel coords — verbatim S array, .dc.html line 289. */
const TREE_NODES: readonly [number, number][] = [
  [100, 22], // Kether
  [158, 58], // Chokmah
  [42, 58], // Binah
  [158, 118], // Chesed
  [42, 118], // Geburah
  [100, 150], // Tiphareth
  [158, 205], // Netzach
  [42, 205], // Hod
  [100, 238], // Yesod
  [100, 288], // Malkuth
];

/** 22 path adjacency pairs into TREE_NODES — verbatim .dc.html line 290. */
const TREE_EDGES: readonly [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 5],
  [1, 2],
  [1, 5],
  [1, 3],
  [2, 5],
  [2, 4],
  [3, 4],
  [3, 5],
  [3, 6],
  [4, 5],
  [4, 7],
  [5, 6],
  [5, 8],
  [5, 7],
  [6, 7],
  [6, 8],
  [6, 9],
  [7, 8],
  [7, 9],
  [8, 9],
];

/** Edge index → path number (11..32) — verbatim .dc.html line 291. */
const PATH_NUMBERS: readonly number[] = Array.from(
  { length: 22 },
  (_, i) => 11 + i,
);

const EYEBROW_STYLE: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 7,
};

const TEXTAREA_STYLE: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 15,
  lineHeight: 1.55,
  resize: "vertical",
};

const META_TILE_STYLE: CSSProperties = {
  flex: "1 1 130px",
  padding: "11px 14px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
};

export interface PathworkingPanelProps {
  initialPath?: number;
  initialVision?: string;
  initialIntegration?: string;
  onSave?: (payload: {
    path: TreeOfLifePath;
    vision: string;
    integration: string;
  }) => void;
  className?: string;
  style?: CSSProperties;
}

export function PathworkingPanel({
  initialPath = PATH_DEFAULT,
  initialVision = PATH_VISION_DEFAULT,
  initialIntegration = "",
  onSave,
  className,
  style,
}: PathworkingPanelProps) {
  const [pathNum, setPathNum] = useState(initialPath);
  const [vision, setVision] = useState(initialVision);
  const [integration, setIntegration] = useState(initialIntegration);

  const path = TREE_OF_LIFE_PATHS[pathNum] ?? TREE_OF_LIFE_PATHS[PATH_DEFAULT]!;

  const handleSave = () => {
    onSave?.({ path, vision, integration });
  };

  return (
    <div
      data-component="pathworking-panel"
      className={`log-cols ${className ?? ""}`}
      style={{
        display: "flex",
        gap: 28,
        alignItems: "flex-start",
        ...style,
      }}
    >
      {/* Tree column */}
      <div style={{ flex: "none", textAlign: "center" }}>
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
          {PATH_TREE_EYEBROW}
        </div>
        <div
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-lg)",
            background:
              "linear-gradient(180deg, var(--bg-2), var(--bg-sunk))",
            padding: 18,
          }}
        >
          <svg
            width={200}
            height={310}
            viewBox="0 0 200 310"
            aria-label={`Tree of Life, path ${pathNum} highlighted`}
            data-tree-svg
          >
            {TREE_EDGES.map(([a, b], i) => {
              const num = PATH_NUMBERS[i]!;
              const on = num === pathNum;
              const [x1, y1] = TREE_NODES[a]!;
              const [x2, y2] = TREE_NODES[b]!;
              return (
                <line
                  key={num}
                  data-edge-path={num}
                  data-on={on}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={on ? "var(--accent)" : "var(--line-2)"}
                  strokeWidth={on ? 3 : 1.4}
                  style={{ cursor: "pointer" }}
                  onClick={() => setPathNum(num)}
                />
              );
            })}
            {TREE_NODES.map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={10}
                fill="var(--bg-3)"
                stroke="var(--ink-mute)"
                strokeWidth={1.4}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Detail + composer column */}
      <div style={{ flex: "1 1 380px", minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--accent-soft)",
              background: "var(--accent-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            <span
              data-path-hebrew
              style={{
                fontFamily: "var(--font-hebrew)",
                fontSize: 30,
                color: "var(--accent)",
              }}
            >
              {path.hebrew}
            </span>
          </div>
          <div>
            <div
              data-path-heading
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                lineHeight: 1.05,
              }}
            >
              Path {path.number} · {path.letter}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-mute)",
              }}
            >
              {path.route}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div style={META_TILE_STYLE} data-meta="trump">
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 4,
              }}
            >
              {PATH_TRUMP_LABEL}
            </div>
            <div
              style={{ fontFamily: "var(--font-display)", fontSize: 15 }}
            >
              {path.trump}
            </div>
          </div>
          <div style={META_TILE_STYLE} data-meta="attribution">
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 4,
              }}
            >
              {PATH_ATTRIBUTION_LABEL}
            </div>
            <div
              style={{ fontFamily: "var(--font-display)", fontSize: 15 }}
            >
              {path.attribution}
            </div>
          </div>
        </div>

        <label htmlFor="path-vision" style={EYEBROW_STYLE}>
          {PATH_VISION_LABEL}
        </label>
        <textarea
          id="path-vision"
          rows={4}
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          placeholder={PATH_VISION_PLACEHOLDER}
          data-path-vision
          style={{ ...TEXTAREA_STYLE, marginBottom: 16 }}
        />

        <label htmlFor="path-integration" style={EYEBROW_STYLE}>
          {PATH_INTEGRATION_LABEL}
        </label>
        <textarea
          id="path-integration"
          rows={2}
          value={integration}
          onChange={(e) => setIntegration(e.target.value)}
          placeholder={PATH_INTEGRATION_PLACEHOLDER}
          data-path-integration
          style={{ ...TEXTAREA_STYLE, marginBottom: 18 }}
        />

        <button
          type="button"
          data-action="save-pathworking"
          onClick={handleSave}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            cursor: "pointer",
          }}
        >
          {SAVE_ICON}
          {PATH_SAVE_LABEL}
        </button>
      </div>
    </div>
  );
}
