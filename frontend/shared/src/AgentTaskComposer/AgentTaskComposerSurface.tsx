/**
 * AgentTaskComposer — H10 Cluster C6 surface.
 *
 * Rule 51 — the magician initiates. The agent never starts a task
 * on its own.
 *
 * Rule 54 — placeholder + hint use "surface" / "draw your attention
 * to" tone. NO "interpret"/"decode"/"tell you what it means".
 */

import { useState, type CSSProperties } from "react";

import {
  HEADERS,
  type ScopeOption,
  SCOPE_HINT,
  START_LABEL,
  TASK_HINT,
} from "./copy.js";

export interface AgentTaskComposerSurfaceProps {
  /** Editorial preamble — agent-type-specific. */
  preamble: string;
  /** Placeholder rendered into the task textarea. */
  placeholder?: string;
  /** Scope options — the FIRST entry is the default (granted scope). */
  scopes: readonly ScopeOption[];
  /** Disable Start when cost-cap is hit or agent is inactive. */
  disabledReason?: string;
  busy?: boolean;
  onStart?: (payload: { task: string; scopeId: string }) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "28px 24px 48px",
};

const SECTION_HEADING: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 15,
  color: "var(--ink)",
  marginBottom: 9,
};

function RadioDot({ on }: { on: boolean }) {
  return (
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: on ? "var(--accent)" : "var(--line-2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
      aria-hidden="true"
    >
      {on ? (
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "var(--accent)",
          }}
        />
      ) : null}
    </span>
  );
}

export function AgentTaskComposerSurface({
  preamble,
  placeholder = "What would you like the agent to look at?",
  scopes,
  disabledReason,
  busy = false,
  onStart,
  className,
  style,
}: AgentTaskComposerSurfaceProps) {
  const defaultScopeId = scopes[0]?.id ?? "";
  const [task, setTask] = useState("");
  const [scopeId, setScopeId] = useState(defaultScopeId);

  const canStart =
    task.trim().length > 0 && !disabledReason && !busy && scopeId !== "";

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 15,
          lineHeight: 1.65,
          color: "var(--ink-soft)",
          margin: "0 0 24px",
        }}
      >
        {preamble}
      </p>

      <div style={SECTION_HEADING}>{HEADERS.task}</div>
      <textarea
        rows={4}
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder={placeholder}
        aria-label={HEADERS.task}
        style={{
          width: "100%",
          padding: "13px 15px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          color: "var(--ink)",
          fontFamily: "var(--font-serif)",
          fontSize: 15,
          lineHeight: 1.55,
          resize: "vertical",
          marginBottom: 9,
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          marginBottom: 26,
        }}
      >
        {TASK_HINT}
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 15,
          color: "var(--ink)",
          marginBottom: 4,
        }}
      >
        {HEADERS.scope}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          marginBottom: 11,
        }}
      >
        {SCOPE_HINT}
      </div>
      <div
        role="radiogroup"
        aria-label={HEADERS.scope}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 30,
        }}
      >
        {scopes.map((s) => {
          const on = scopeId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-scope={s.id}
              onClick={() => setScopeId(s.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                width: "100%",
                padding: "11px 14px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: on ? "var(--accent)" : "var(--line)",
                borderRadius: "var(--r-md)",
                background: on ? "var(--accent-soft)" : "var(--bg-2)",
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
                color: "inherit",
              }}
            >
              <RadioDot on={on} />
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink)",
                }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "flex-end",
        }}
      >
        {disabledReason ? (
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--warn)",
              marginRight: "auto",
            }}
          >
            {disabledReason}
          </span>
        ) : null}
        <button
          type="button"
          disabled={!canStart}
          onClick={() => onStart?.({ task: task.trim(), scopeId })}
          style={{
            padding: "11px 22px",
            borderRadius: "var(--r-md)",
            background: canStart ? "var(--accent)" : "var(--bg-3)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: canStart ? "var(--accent)" : "var(--line)",
            color: canStart ? "var(--accent-ink)" : "var(--ink-mute)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 14,
            cursor: canStart ? "pointer" : "not-allowed",
          }}
        >
          {START_LABEL}
        </button>
      </div>
    </div>
  );
}
