/**
 * BodySilhouette — line-only gender-neutral figure with marker overlay.
 *
 * Per `Theourgia Body Sensation.dc.html`. Six views are supported:
 * front · back · left · right · palm · sole. The SVG paths are
 * lifted verbatim from the designer's mockup — the line art IS the
 * asset. Morphology (slim · average · broad) only scales horizontally;
 * the underlying anatomy stays neutral.
 *
 * Click handlers:
 *   - `onPlace({ x, y })` — clicked on empty stage. x/y are normalized [0,1].
 *   - `onSelect(markerId)` — clicked on an existing marker.
 *
 * Marker visuals (color, dot vs glyph, intensity halo) are handled by
 * `SensationConfig` consumers; this component only sizes and positions
 * marker buttons.
 */

import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useCallback,
} from "react";

export type SilhouetteView =
  | "front"
  | "back"
  | "left"
  | "right"
  | "palm"
  | "sole";
export type BodyMorphology = "slim" | "average" | "broad";

export interface BodyMarker {
  id: string;
  /** Normalized [0,1]. */
  x: number;
  /** Normalized [0,1]. */
  y: number;
  view: SilhouetteView;
  /** Free-form sensation type key. */
  type: string;
  /** 0-10 (controls the halo diameter). */
  intensity: number;
  /** Hex color (drawn around the marker). */
  color: string;
  /** Free-text note captured by the practitioner. */
  notes?: string;
  /** Render slot for a glyph (defaults to a dot). */
  glyph?: ReactNode;
}

export interface BodySilhouetteProps {
  view: SilhouetteView;
  morphology?: BodyMorphology;
  markers?: BodyMarker[];
  selectedId?: string;
  onPlace?: (coord: { x: number; y: number }) => void;
  onSelect?: (markerId: string) => void;
  className?: string;
  style?: CSSProperties;
}

const SKIN = {
  fill: "var(--skin)",
  stroke: "var(--skin-line)",
  strokeWidth: 1.6,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};
const FAINT = {
  fill: "none",
  stroke: "var(--skin-line)",
  strokeWidth: 1,
  opacity: 0.5,
  strokeLinecap: "round" as const,
};

interface SilhouetteAssets {
  viewBox: string;
  paths: ReactNode;
  flip: boolean;
}

function buildSilhouette(view: SilhouetteView): SilhouetteAssets {
  if (view === "front" || view === "back") {
    const body =
      "M100 60 C92 60 86 62 84 70 C82 78 83 84 80 88 C72 92 66 100 64 116 L57 196 C56 203 51 205 50 212 C49 219 55 221 58 216 L66 200 C70 192 72 188 73 178 L78 132 C79 140 80 150 80 162 L80 236 C72 250 70 262 69 286 L66 360 C65 372 66 382 70 392 C73 399 82 399 84 391 C86 380 86 372 87 360 L92 290 C93 280 96 276 100 276 C104 276 107 280 108 290 L113 360 C114 372 114 380 116 391 C118 399 127 399 130 392 C134 382 135 372 134 360 L131 286 C130 262 128 250 120 236 L120 162 C120 150 121 140 122 132 L127 178 C128 188 130 192 134 200 L142 216 C145 221 151 219 150 212 C149 205 144 203 143 196 L136 116 C134 100 128 92 120 88 C117 84 118 78 116 70 C114 62 108 60 100 60 Z";
    const detail =
      view === "back" ? (
        <>
          <path d="M100 92 L100 232" {...FAINT} />
          <path d="M82 120 C90 126 92 132 92 140" {...FAINT} />
          <path d="M118 120 C110 126 108 132 108 140" {...FAINT} />
          <path d="M82 196 C90 200 110 200 118 196" {...FAINT} />
        </>
      ) : (
        <>
          <path d="M84 74 C92 80 108 80 116 74" {...FAINT} />
          <path d="M100 110 L100 150" {...FAINT} />
        </>
      );
    return {
      viewBox: "0 0 200 420",
      flip: false,
      paths: (
        <>
          <circle cx={100} cy={34} r={25} {...SKIN} />
          <path d={body} {...SKIN} />
          {detail}
        </>
      ),
    };
  }
  if (view === "left" || view === "right") {
    const body =
      "M104 60 C96 60 90 63 88 71 C86 79 88 85 84 90 C77 95 74 104 75 118 L78 150 C73 158 70 168 70 178 C70 196 76 206 80 214 C76 220 73 230 72 250 L70 360 C69 372 70 382 74 392 C77 399 86 399 88 391 C90 380 90 372 91 360 L96 270 C98 262 102 258 108 262 L112 360 C113 372 113 382 116 391 C119 398 127 398 129 391 C132 382 132 372 131 360 L128 248 C127 232 124 222 120 214 C124 206 128 196 128 178 L128 130 C128 110 122 92 112 86 C110 80 112 70 110 64 Z";
    return {
      viewBox: "0 0 200 420",
      flip: view === "right",
      paths: (
        <>
          <path
            d="M96 18 C84 20 76 30 76 42 C76 50 80 56 86 60 C90 62 96 62 104 60 L104 30 C104 22 102 18 96 18 Z"
            {...SKIN}
          />
          <path
            d="M76 40 C72 41 71 44 73 46 C74 47 76 47 77 46"
            {...SKIN}
          />
          <path d={body} {...SKIN} />
          <path d="M104 92 C112 120 112 180 100 214" {...FAINT} />
        </>
      ),
    };
  }
  if (view === "palm") {
    const hand =
      "M100 360 C78 360 70 340 70 312 L70 250 C68 240 64 232 60 220 C56 208 52 196 50 182 C49 174 56 170 61 176 C66 183 70 192 74 200 L74 150 C74 142 80 138 84 142 C87 145 87 150 87 156 L88 130 C88 122 94 118 98 122 C101 125 101 130 101 136 L101 124 C101 116 108 112 112 116 C115 119 115 124 115 132 L116 142 C117 134 123 132 127 136 C130 139 130 146 129 156 L126 210 C126 250 128 290 124 320 C121 344 118 360 100 360 Z";
    return {
      viewBox: "0 0 200 400",
      flip: false,
      paths: (
        <>
          <path d={hand} {...SKIN} />
          <path d="M88 158 C90 175 92 195 92 215" {...FAINT} />
          <path d="M101 150 C103 170 104 195 104 220" {...FAINT} />
          <path d="M114 158 C115 178 116 198 116 218" {...FAINT} />
          <path d="M86 250 C100 240 116 244 122 262" {...FAINT} />
        </>
      ),
    };
  }
  // sole
  const foot =
    "M100 40 C84 40 74 52 72 72 C70 92 74 110 78 130 L82 250 C80 300 78 340 86 364 C92 380 108 380 114 364 C122 340 120 300 118 250 L122 130 C126 110 130 92 128 72 C126 52 116 40 100 40 Z";
  return {
    viewBox: "0 0 200 400",
    flip: false,
    paths: (
      <>
        <path d={foot} {...SKIN} />
        <circle cx={84} cy={60} r={7} {...SKIN} />
        <circle cx={97} cy={54} r={6} {...SKIN} />
        <circle cx={108} cy={55} r={5} {...SKIN} />
        <circle cx={117} cy={60} r={4.5} {...SKIN} />
        <circle cx={124} cy={68} r={4} {...SKIN} />
        <path d="M86 150 C100 160 104 220 96 280" {...FAINT} />
      </>
    ),
  };
}

const STAGE_W = 300;
const STAGE_H_DEFAULT = 430;
const STAGE_H_HAND = 420;

function morphScale(morph: BodyMorphology): number {
  if (morph === "slim") return 0.9;
  if (morph === "broad") return 1.12;
  return 1;
}

function MarkerDot({ marker }: { marker: BodyMarker }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: marker.color,
        display: "block",
      }}
    />
  );
}

export function BodySilhouette({
  view,
  morphology = "average",
  markers,
  selectedId,
  onPlace,
  onSelect,
  className,
  style,
}: BodySilhouetteProps) {
  const sil = buildSilhouette(view);
  const vbH = Number(sil.viewBox.split(" ")[3] ?? 420);
  const sx = (sil.flip ? -1 : 1) * morphScale(morphology);
  const STAGE_H = view === "palm" || view === "sole" ? STAGE_H_HAND : STAGE_H_DEFAULT;
  const visibleMarkers = (markers ?? []).filter((m) => m.view === view);

  const handleStageClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!onPlace) return;
      // Ignore clicks bubbled from marker buttons.
      const target = e.target as HTMLElement;
      if (target.closest("[data-marker-id]")) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      onPlace({ x, y });
    },
    [onPlace],
  );

  return (
    <div
      className={className}
      role="application"
      aria-label="Body figure — click to place a sensation marker"
      data-component="body-silhouette"
      data-view={view}
      data-morphology={morphology}
      onClick={handleStageClick}
      style={{
        position: "relative",
        width: STAGE_W,
        maxWidth: "100%",
        height: STAGE_H,
        cursor: onPlace ? "crosshair" : "default",
        ...style,
      }}
    >
      <svg
        viewBox={sil.viewBox}
        width="100%"
        height="100%"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <g transform={`translate(100,${vbH / 2}) scale(${sx},1) translate(-100,-${vbH / 2})`}>
          {sil.paths}
        </g>
      </svg>

      {visibleMarkers.map((m) => {
        const sel = m.id === selectedId;
        const d = 18 + m.intensity * 2.4;
        return (
          <button
            key={m.id}
            type="button"
            data-marker-id={m.id}
            data-marker-type={m.type}
            data-marker-intensity={m.intensity}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(m.id);
            }}
            aria-label={`${m.type} at intensity ${m.intensity}`}
            title={`${m.type} · ${m.intensity}/10`}
            style={{
              position: "absolute",
              left: `${m.x * 100}%`,
              top: `${m.y * 100}%`,
              width: d,
              height: d,
              transform: "translate(-50%,-50%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: m.color,
              background: `color-mix(in srgb, ${m.color} 22%, transparent)`,
              borderWidth: 1.5,
              borderStyle: "solid",
              borderColor: m.color,
              boxShadow: sel
                ? `0 0 0 3px var(--bg-2), 0 0 0 4.5px ${m.color}`
                : "0 1px 6px rgba(0,0,0,.3)",
              cursor: "pointer",
              zIndex: sel ? 3 : 2,
              padding: 0,
            }}
          >
            {m.glyph ?? <MarkerDot marker={m} />}
          </button>
        );
      })}
    </div>
  );
}
