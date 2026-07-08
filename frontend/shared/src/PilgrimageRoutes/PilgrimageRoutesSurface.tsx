/**
 * Pilgrimage routes surface — list + edit + polyline preview.
 *
 * FEATURES §13 · "Pilgrimage routes — ordered sequences with notes".
 * Backend shipped in b108-2gx; this surface completes the flow.
 *
 * The polyline preview is a small SVG canvas that plots each stop
 * as a numbered dot and connects consecutive stops with a line.
 * Coordinates are derived from the stops' associated
 * pilgrimage_site x_norm / y_norm.
 */

import { type CSSProperties } from "react";

export interface RouteStop {
  id: string;
  site_id: string;
  order_index: number;
  notes: string | null;
}

export interface PilgrimageRouteSummary {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
}

export interface PilgrimageRouteDetail extends PilgrimageRouteSummary {
  stops: RouteStop[];
}

export interface StopCoord {
  site_id: string;
  name: string;
  x_norm: number;
  y_norm: number;
}

export interface PilgrimageRoutesSurfaceProps {
  routes: PilgrimageRouteSummary[];
  activeRoute: PilgrimageRouteDetail | null;
  siteCatalog: StopCoord[];
  onSelectRoute: (id: string) => void;
  onCreateRoute: () => void;
  onDeleteRoute: (id: string) => void;
  onSaveRouteMetadata: (patch: Partial<PilgrimageRouteDetail>) => void;
  onAddStop: (siteId: string) => void;
  onRemoveStop: (stopId: string) => void;
  onReorderStops: (stopIds: string[]) => void;
  className?: string;
  style?: CSSProperties;
}

const CANVAS_W = 320;
const CANVAS_H = 220;

export function PilgrimageRoutesSurface({
  routes,
  activeRoute,
  siteCatalog,
  onSelectRoute,
  onCreateRoute,
  onDeleteRoute,
  onSaveRouteMetadata,
  onAddStop,
  onRemoveStop,
  onReorderStops,
  className,
  style,
}: PilgrimageRoutesSurfaceProps) {
  const siteById = new Map(siteCatalog.map((s) => [s.site_id, s]));

  const orderedStops = activeRoute
    ? activeRoute.stops.slice().sort((a, b) => a.order_index - b.order_index)
    : [];

  const availableSites = siteCatalog.filter(
    (s) => !orderedStops.some((st) => st.site_id === s.site_id),
  );

  const moveStop = (index: number, delta: number): void => {
    if (!activeRoute) return;
    const next = [...orderedStops];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    const b = next[target]!;
    next[index] = b;
    next[target] = a;
    onReorderStops(next.map((s) => s.id));
  };

  return (
    <div
      className={className}
      data-component="pilgrimage-routes"
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr 260px",
        gap: "var(--space-4)",
        ...style,
      }}
    >
      <aside data-role="route-list">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-2)",
          }}
        >
          <h3 style={{ font: "var(--type-eyebrow)", color: "var(--muted)" }}>
            Routes
          </h3>
          <button type="button" onClick={onCreateRoute} style={smallPrimary}>
            New
          </button>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {routes.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                data-active={r.id === activeRoute?.id}
                onClick={() => onSelectRoute(r.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "var(--space-2)",
                  marginBottom: "var(--space-1)",
                  background:
                    r.id === activeRoute?.id ? "var(--bg-2)" : "transparent",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--ink)",
                  cursor: "pointer",
                  font: "var(--type-body)",
                }}
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section data-role="route-canvas">
        {activeRoute ? (
          <>
            <label
              style={{
                display: "block",
                font: "var(--type-label)",
                marginBottom: "var(--space-1)",
              }}
            >
              Name
              <input
                type="text"
                defaultValue={activeRoute.name}
                onBlur={(e) =>
                  onSaveRouteMetadata({ name: e.target.value })
                }
                style={inputStyle}
              />
            </label>
            <label
              style={{
                display: "block",
                font: "var(--type-label)",
                marginBottom: "var(--space-2)",
              }}
            >
              Description
              <textarea
                defaultValue={activeRoute.description ?? ""}
                onBlur={(e) =>
                  onSaveRouteMetadata({ description: e.target.value })
                }
                rows={2}
                style={{ ...inputStyle, fontFamily: "var(--font-ui)" }}
              />
            </label>

            <svg
              data-role="route-polyline"
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              width="100%"
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--line-2)",
                maxWidth: 480,
              }}
              aria-label="Route preview"
            >
              {orderedStops.length > 1 && (
                <polyline
                  points={orderedStops
                    .map((s) => {
                      const c = siteById.get(s.site_id);
                      if (!c) return "";
                      return `${c.x_norm * CANVAS_W},${c.y_norm * CANVAS_H}`;
                    })
                    .filter(Boolean)
                    .join(" ")}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              )}
              {orderedStops.map((s, i) => {
                const c = siteById.get(s.site_id);
                if (!c) return null;
                const cx = c.x_norm * CANVAS_W;
                const cy = c.y_norm * CANVAS_H;
                return (
                  <g key={s.id} data-stop-id={s.id}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={10}
                      fill="var(--bg)"
                      stroke="var(--accent)"
                      strokeWidth={1.5}
                    />
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 11,
                        fill: "var(--accent)",
                      }}
                    >
                      {i + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
            <button
              type="button"
              onClick={() => onDeleteRoute(activeRoute.id)}
              style={{
                ...destructiveStyle,
                marginTop: "var(--space-3)",
              }}
            >
              Delete route
            </button>
          </>
        ) : (
          <p style={{ color: "var(--muted)" }}>
            Choose a route or create a new one to design its path.
          </p>
        )}
      </section>

      <aside data-role="stop-editor">
        {activeRoute && (
          <>
            <h3
              style={{
                font: "var(--type-eyebrow)",
                color: "var(--muted)",
                marginBottom: "var(--space-2)",
              }}
            >
              Stops ({orderedStops.length})
            </h3>
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {orderedStops.map((s, i) => {
                const site = siteById.get(s.site_id);
                return (
                  <li
                    key={s.id}
                    data-stop-id={s.id}
                    style={{
                      padding: "var(--space-2)",
                      marginBottom: "var(--space-2)",
                      border: "1px solid var(--line-2)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div style={{ marginBottom: 4 }}>
                      #{i + 1} · {site?.name ?? s.site_id}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => moveStop(i, -1)}
                        disabled={i === 0}
                        style={smallStyle}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStop(i, 1)}
                        disabled={i === orderedStops.length - 1}
                        style={smallStyle}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveStop(s.id)}
                        style={{ ...smallStyle, color: "var(--care)" }}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>

            <label
              style={{
                display: "block",
                font: "var(--type-label)",
                color: "var(--muted)",
                marginTop: "var(--space-3)",
              }}
            >
              Add stop
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onAddStop(e.target.value);
                    e.target.value = "";
                  }
                }}
                style={inputStyle}
                aria-label="Add stop"
                defaultValue=""
              >
                <option value="">Choose a site…</option>
                {availableSites.map((s) => (
                  <option key={s.site_id} value={s.site_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </aside>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "var(--space-2)",
  marginBottom: "var(--space-2)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius-sm)",
};

const smallPrimary: CSSProperties = {
  padding: "var(--space-1) var(--space-2)",
  background: "var(--accent)",
  color: "var(--bg)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  font: "var(--type-label)",
};

const smallStyle: CSSProperties = {
  padding: "var(--space-1) var(--space-2)",
  background: "transparent",
  color: "var(--ink)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  font: "var(--type-label)",
};

const destructiveStyle: CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  background: "transparent",
  color: "var(--care)",
  border: "1px solid var(--care)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  font: "var(--type-label)",
};
