/**
 * ServitorTaskCard — one task assigned to a servitor.
 *
 * Per `Theourgia Servitors.dc.html`. Description (display serif) +
 * status pill (TaskStatus) on the right, meta line (when assigned /
 * scope / standing-charge), and an optional italic outcome line that
 * the practitioner records when the task is read complete.
 *
 * Four task statuses with their own `--ts-*` tokens — pending,
 * in-progress, completed, abandoned. "Abandoned" uses the muted dust
 * token (--ts-abandoned), NEVER red. The matter-of-fact ledger
 * language is the H03 cross-cutting rule: a servitor's task left
 * undone is information.
 */

import { type CSSProperties } from "react";

export type TaskStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "abandoned";

export interface TaskStatusMeta {
  label: string;
  color: string;
}

export const TASK_STATUS_META: Record<TaskStatus, TaskStatusMeta> = {
  pending: { label: "Pending", color: "var(--ts-pending)" },
  "in-progress": { label: "In progress", color: "var(--ts-progress)" },
  completed: { label: "Completed", color: "var(--ts-completed)" },
  abandoned: { label: "Abandoned", color: "var(--ts-abandoned)" },
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "pending",
  "in-progress",
  "completed",
  "abandoned",
];

export interface ServitorTaskCardProps {
  /** Stable id used for keying + the data attribute. */
  id: string;
  /** Task description (display serif, multiline). */
  description: string;
  status: TaskStatus;
  /** Free-text meta line ("Standing charge · since 2 Feb"). */
  meta?: string;
  /** Optional outcome line — italic serif, rendered below meta. */
  outcome?: string;
  className?: string;
  style?: CSSProperties;
}

export function ServitorTaskCard({
  id,
  description,
  status,
  meta,
  outcome,
  className,
  style,
}: ServitorTaskCardProps) {
  const m = TASK_STATUS_META[status];
  return (
    <div
      className={className}
      data-component="servitor-task-card"
      data-task-id={id}
      data-task-status={status}
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--bg-3)",
        padding: "12px 14px",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <p
          style={{
            margin: 0,
            flex: 1,
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            lineHeight: 1.45,
            color: "var(--ink)",
          }}
        >
          {description}
        </p>
        <span
          data-task-status-pill
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "2px 8px",
            borderRadius: 999,
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            color: "var(--ink-soft)",
            background: `color-mix(in srgb, ${m.color} 14%, transparent)`,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: `color-mix(in srgb, ${m.color} 32%, transparent)`,
            flex: "none",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: m.color,
            }}
          />
          {m.label}
        </span>
      </div>
      {meta ? (
        <div
          data-task-meta
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            marginTop: 6,
          }}
        >
          {meta}
        </div>
      ) : null}
      {outcome ? (
        <div
          data-task-outcome
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13,
            fontStyle: "italic",
            color: "var(--ink-soft)",
            marginTop: 5,
          }}
        >
          {outcome}
        </div>
      ) : null}
    </div>
  );
}
