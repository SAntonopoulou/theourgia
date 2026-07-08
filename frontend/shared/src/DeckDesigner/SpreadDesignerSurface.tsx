/**
 * Spread designer — list + edit custom spreads with position layout.
 *
 * FEATURES §4 · "Custom deck + spread designer". Positions carry
 * ``x`` / ``y`` coordinates in the 0-100 percent range (normalised
 * so the canvas can rescale without breaking layouts). A preview
 * canvas draws the current spread with numbered squares.
 */

import { type CSSProperties, useState } from "react";

export interface SpreadDesignerPosition {
  index: number;
  name: string;
  meaning?: string;
  x?: number;
  y?: number;
  rotation?: number;
}

export interface SpreadSummary {
  id: string;
  name: string;
  slug: string;
  is_builtin: boolean;
  kind: string;
}

export interface SpreadDetail extends SpreadSummary {
  description: string | null;
  positions: SpreadDesignerPosition[];
  layout_json: Record<string, unknown>;
}

export interface SpreadDesignerSurfaceProps {
  spreads: SpreadSummary[];
  activeSpread: SpreadDetail | null;
  onSelectSpread: (id: string) => void;
  onCreateSpread: () => void;
  onDeleteSpread: (id: string) => void;
  onSaveSpread: (patch: Partial<SpreadDetail>) => void;
  className?: string;
  style?: CSSProperties;
}

const CANVAS_W = 320;
const CANVAS_H = 240;

export function SpreadDesignerSurface({
  spreads,
  activeSpread,
  onSelectSpread,
  onCreateSpread,
  onDeleteSpread,
  onSaveSpread,
  className,
  style,
}: SpreadDesignerSurfaceProps) {
  const [draft, setDraft] = useState<SpreadDesignerPosition[] | null>(null);
  const positions = draft ?? activeSpread?.positions ?? [];
  const canEdit = activeSpread && !activeSpread.is_builtin;

  const updatePosition = (
    index: number,
    patch: Partial<SpreadDesignerPosition>,
  ): void => {
    if (!activeSpread) return;
    const source = draft ?? activeSpread.positions;
    const next = source.map((p) =>
      p.index === index ? { ...p, ...patch } : p,
    );
    setDraft(next);
  };

  const addPosition = (): void => {
    if (!activeSpread) return;
    const source = draft ?? activeSpread.positions;
    const maxIndex = source.length
      ? Math.max(...source.map((p) => p.index))
      : -1;
    const next: SpreadDesignerPosition[] = [
      ...source,
      {
        index: maxIndex + 1,
        name: `Position ${maxIndex + 2}`,
        x: 50,
        y: 50,
      },
    ];
    setDraft(next);
  };

  const removePosition = (index: number): void => {
    if (!activeSpread) return;
    const source = draft ?? activeSpread.positions;
    setDraft(source.filter((p) => p.index !== index));
  };

  const commit = (): void => {
    if (draft) {
      onSaveSpread({ positions: draft });
      setDraft(null);
    }
  };

  return (
    <div
      className={className}
      data-component="spread-designer"
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr 340px",
        gap: "var(--space-4)",
        ...style,
      }}
    >
      <aside data-role="spread-list">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-2)",
          }}
        >
          <h3 style={{ font: "var(--type-eyebrow)", color: "var(--muted)" }}>
            Spreads
          </h3>
          <button
            type="button"
            onClick={onCreateSpread}
            style={{
              padding: "var(--space-1) var(--space-2)",
              background: "var(--accent)",
              color: "var(--bg)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              font: "var(--type-label)",
            }}
          >
            New
          </button>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {spreads.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                data-active={s.id === activeSpread?.id}
                onClick={() => onSelectSpread(s.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "var(--space-2)",
                  marginBottom: "var(--space-1)",
                  background:
                    s.id === activeSpread?.id ? "var(--bg-2)" : "transparent",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--ink)",
                  cursor: "pointer",
                  font: "var(--type-body)",
                }}
              >
                <div>{s.name}</div>
                <div
                  style={{
                    font: "var(--type-caption)",
                    color: "var(--muted)",
                  }}
                >
                  {s.kind}
                  {s.is_builtin ? " · built-in" : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section data-role="canvas-preview">
        {activeSpread ? (
          <>
            <div
              data-role="canvas"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                background: "var(--bg-2)",
                border: "1px solid var(--line-2)",
                position: "relative",
                marginBottom: "var(--space-3)",
              }}
            >
              {positions.map((p) => (
                <div
                  key={p.index}
                  data-position-index={p.index}
                  style={{
                    position: "absolute",
                    left: `${p.x ?? 50}%`,
                    top: `${p.y ?? 50}%`,
                    transform: `translate(-50%, -50%) rotate(${
                      p.rotation ?? 0
                    }deg)`,
                    width: 42,
                    height: 58,
                    background: "var(--bg)",
                    border: "1px solid var(--accent)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    font: "var(--type-caption)",
                    color: "var(--accent)",
                  }}
                  title={p.name}
                >
                  {p.index + 1}
                </div>
              ))}
            </div>
            {canEdit && draft && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={commit}
                  style={{
                    padding: "var(--space-2)",
                    background: "var(--accent)",
                    color: "var(--bg)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  Save positions
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  style={{
                    padding: "var(--space-2)",
                    background: "transparent",
                    color: "var(--ink)",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  Reset
                </button>
              </div>
            )}
          </>
        ) : (
          <p style={{ color: "var(--muted)" }}>
            Select a spread or create a new one to design its layout.
          </p>
        )}
      </section>

      <aside data-role="position-list">
        {activeSpread && (
          <>
            <h3
              style={{
                font: "var(--type-eyebrow)",
                color: "var(--muted)",
                marginBottom: "var(--space-2)",
              }}
            >
              Positions
            </h3>
            <ol
              style={{ listStyle: "none", padding: 0, margin: 0 }}
              data-role="position-list-ol"
            >
              {positions.map((p) => (
                <li
                  key={p.index}
                  style={{
                    padding: "var(--space-2)",
                    marginBottom: "var(--space-2)",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) =>
                      updatePosition(p.index, { name: e.target.value })
                    }
                    disabled={!canEdit}
                    style={inputStyle}
                    aria-label={`Position ${p.index + 1} name`}
                  />
                  <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <label
                      style={{
                        flex: 1,
                        font: "var(--type-label)",
                        color: "var(--muted)",
                      }}
                    >
                      x %
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={p.x ?? 50}
                        onChange={(e) =>
                          updatePosition(p.index, {
                            x: Number(e.target.value),
                          })
                        }
                        disabled={!canEdit}
                        style={inputStyle}
                      />
                    </label>
                    <label
                      style={{
                        flex: 1,
                        font: "var(--type-label)",
                        color: "var(--muted)",
                      }}
                    >
                      y %
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={p.y ?? 50}
                        onChange={(e) =>
                          updatePosition(p.index, {
                            y: Number(e.target.value),
                          })
                        }
                        disabled={!canEdit}
                        style={inputStyle}
                      />
                    </label>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removePosition(p.index)}
                      style={{
                        padding: "var(--space-1) var(--space-2)",
                        background: "transparent",
                        color: "var(--care)",
                        border: "1px solid var(--care)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        font: "var(--type-label)",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ol>
            {canEdit && (
              <button
                type="button"
                onClick={addPosition}
                style={{
                  padding: "var(--space-2)",
                  background: "transparent",
                  color: "var(--accent)",
                  border: "1px dashed var(--accent)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  width: "100%",
                  marginBottom: "var(--space-2)",
                }}
              >
                Add position
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => onDeleteSpread(activeSpread.id)}
                style={{
                  padding: "var(--space-2)",
                  background: "transparent",
                  color: "var(--care)",
                  border: "1px solid var(--care)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Delete spread
              </button>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "var(--space-1)",
  marginBottom: 4,
  background: "var(--bg-2)",
  color: "var(--ink)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius-sm)",
  font: "var(--type-body)",
};
