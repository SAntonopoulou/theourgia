/**
 * The library of workings — the web reading of the phone's Workings screen.
 *
 * A working is a long operation, written and begun on the phone and read here:
 * its intent, whose chart it turns on, whether it has started, and its phases in
 * order — each with what the tradition asks before it opens, and whether that
 * has been declared met. On a narrow screen the list and the detail stack.
 */

import { type CSSProperties, useState } from "react";

import type { Working, WorkingItem } from "./recordWorkings.js";

export interface WorkingsLibraryProps {
  workings: readonly Working[];
  emptyMessage?: string;
  /** When given, each item gets a "Mark performed" action. */
  onPerform?: (item: WorkingItem, working: Working) => void;
  /** Subject keys (`working-item:<id>`) already performed today, shown Done ✓. */
  performedKeys?: ReadonlySet<string>;
  /** Authoring hooks. */
  onNew?: () => void;
  onEdit?: (working: Working) => void;
  className?: string;
  style?: CSSProperties;
}

const actionButton: CSSProperties = {
  padding: "7px 14px",
  borderRadius: "var(--r-md, 8px)",
  border: "1px solid var(--accent)",
  background: "var(--accent-soft)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  cursor: "pointer",
};

const CARD_BASE: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md, 8px)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  cursor: "pointer",
  marginBottom: 8,
};

const CARD_ACTIVE: CSSProperties = {
  ...CARD_BASE,
  borderColor: "var(--accent)",
  boxShadow: "inset 2px 0 0 var(--accent)",
};

const PILL: CSSProperties = {
  display: "inline-block",
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "2px 7px",
  borderRadius: 999,
  border: "1px solid var(--line-2, var(--line))",
  color: "var(--ink-soft)",
};

function statusLabel(w: Working): string {
  return w.started ? "In progress" : "Not yet begun";
}

export function WorkingsLibrary({
  workings,
  emptyMessage,
  onPerform,
  performedKeys,
  onNew,
  onEdit,
  className,
  style,
}: WorkingsLibraryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(workings[0]?.id ?? null);

  if (workings.length === 0) {
    return (
      <div style={style}>
        {onNew ? (
          <div style={{ marginBottom: 14 }}>
            <button type="button" onClick={onNew} style={actionButton}>
              New working
            </button>
          </div>
        ) : null}
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            color: "var(--ink-mute)",
            lineHeight: 1.5,
            maxWidth: 460,
          }}
        >
          {emptyMessage ??
            "The operations you are running will appear here once your phone syncs — or begin one here."}
        </p>
      </div>
    );
  }

  const selected = workings.find((w) => w.id === selectedId) ?? workings[0];

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(220px, 300px) 1fr",
        gap: 24,
        alignItems: "start",
        ...style,
      }}
    >
      <nav aria-label="Your workings" style={{ minWidth: 0 }}>
        {onNew ? (
          <button
            type="button"
            onClick={onNew}
            style={{ ...actionButton, width: "100%", marginBottom: 10 }}
          >
            New working
          </button>
        ) : null}
        {workings.map((w) => {
          const isActive = w.id === selected?.id;
          return (
            <button
              key={w.id}
              type="button"
              aria-current={isActive ? "true" : undefined}
              onClick={() => setSelectedId(w.id)}
              style={isActive ? CARD_ACTIVE : CARD_BASE}
            >
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-display, var(--font-serif))",
                  fontSize: 15.5,
                }}
              >
                {w.name || "Untitled working"}
              </span>
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  marginTop: 4,
                }}
              >
                {statusLabel(w)}
                {w.stages.length > 0 ? ` · ${w.stages.length} stages` : ""}
              </span>
            </button>
          );
        })}
      </nav>

      {selected ? (
        <article style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <h2
              style={{
                fontFamily: "var(--font-display, var(--font-serif))",
                fontSize: 22,
                margin: "0 0 2px",
                color: "var(--ink)",
              }}
            >
              {selected.name || "Untitled working"}
            </h2>
            <span style={PILL}>{statusLabel(selected)}</span>
            {onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(selected)}
                style={{
                  marginLeft: "auto",
                  padding: "5px 12px",
                  borderRadius: "var(--r-sm, 6px)",
                  border: "1px solid var(--line)",
                  background: "var(--bg-2)",
                  color: "var(--ink-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
            ) : null}
          </div>
          {selected.summary ? (
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink-soft)",
                margin: "0 0 8px",
              }}
            >
              {selected.summary}
            </p>
          ) : null}
          {selected.subjectName ? (
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
                margin: "0 0 14px",
              }}
            >
              For {selected.subjectName}
            </p>
          ) : null}

          {selected.items.length > 0 ? (
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 8,
                }}
              >
                What it asks
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                {selected.items.map((item) => {
                  const done = performedKeys?.has(`working-item:${item.id}`) ?? false;
                  const stageName = item.stageId
                    ? (selected.stages.find((s) => s.id === item.stageId)?.name ?? null)
                    : null;
                  return (
                    <li
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--r-md, 8px)",
                        padding: "8px 12px",
                        background: "var(--bg-2)",
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: "block",
                            fontFamily: "var(--font-display, var(--font-serif))",
                            fontSize: 15,
                            color: "var(--ink)",
                          }}
                        >
                          {item.title}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 11.5,
                            color: "var(--ink-mute)",
                          }}
                        >
                          {item.cadence === "timesADay"
                            ? `${item.perDay}× a day`
                            : item.cadence === "daily"
                              ? "Daily"
                              : "Once"}
                          {stageName ? ` · ${stageName}` : ""}
                        </span>
                        {item.script ? (
                          <details style={{ marginTop: 4 }}>
                            <summary
                              style={{
                                fontFamily: "var(--font-ui)",
                                fontSize: 11.5,
                                color: "var(--accent)",
                                cursor: "pointer",
                              }}
                            >
                              The words
                            </summary>
                            <p
                              style={{
                                fontFamily: "var(--font-serif)",
                                fontSize: 14,
                                color: "var(--ink-soft)",
                                lineHeight: 1.6,
                                whiteSpace: "pre-line",
                                margin: "6px 0 0",
                              }}
                            >
                              {item.script}
                            </p>
                          </details>
                        ) : null}
                      </span>
                      {onPerform ? (
                        done ? (
                          <span
                            style={{
                              fontFamily: "var(--font-ui)",
                              fontSize: 12,
                              color: "var(--accent)",
                            }}
                          >
                            Done ✓
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onPerform(item, selected)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "var(--r-sm, 6px)",
                              border: "1px solid var(--accent)",
                              background: "var(--accent-soft)",
                              color: "var(--ink)",
                              fontFamily: "var(--font-ui)",
                              fontSize: 12,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Mark performed
                          </button>
                        )
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {selected.stages.length === 0 ? (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-mute)" }}>
              No stages written.
            </p>
          ) : (
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {selected.stages.map((stage, i) => (
                <li
                  key={stage.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md, 8px)",
                    padding: "10px 12px",
                    background: "var(--bg-2)",
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        color: "var(--ink-mute)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display, var(--font-serif))",
                        fontSize: 15,
                        color: "var(--ink)",
                      }}
                    >
                      {stage.name || "Unnamed stage"}
                    </span>
                    <span
                      style={{
                        ...PILL,
                        color: stage.declared ? "var(--accent)" : "var(--ink-mute)",
                        borderColor: stage.declared ? "var(--accent)" : "var(--line)",
                      }}
                    >
                      {stage.declared ? "Declared" : "Awaiting"}
                    </span>
                  </div>
                  {stage.criterion ? (
                    <p
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 14,
                        color: "var(--ink-soft)",
                        margin: "6px 0 0",
                        lineHeight: 1.5,
                      }}
                    >
                      {stage.criterion}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </article>
      ) : null}
    </div>
  );
}
