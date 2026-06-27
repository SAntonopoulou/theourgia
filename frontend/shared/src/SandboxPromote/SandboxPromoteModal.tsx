/**
 * SandboxPromoteModal — H09 Cluster B surface 15.
 *
 * Rule 35: sandbox promotion is irrevocable. The body verbatim
 * states the consequence. The Promote CTA uses `--warn-soft`,
 * NEVER `--danger`.
 */

import { type CSSProperties, useEffect } from "react";

import {
  SP_BODY,
  SP_CANCEL_CTA,
  SP_PROMOTE_CTA,
  SP_REFERENCE_LINE_SUFFIX,
  SP_TITLE,
  SP_WHAT_WILL_MERGE_HEADING,
} from "./copy.js";

export interface SandboxPromoteShape {
  kind: string;
  count: string;
}

export interface SandboxPromoteModalProps {
  shapes: readonly SandboxPromoteShape[];
  /** Display-friendly count + noun, e.g. "3 entries". */
  existingReferencesLabel: string;
  onCancel: () => void;
  onPromote: () => void;
  className?: string;
  style?: CSSProperties;
}

export function SandboxPromoteModal({
  shapes,
  existingReferencesLabel,
  onCancel,
  onPromote,
  className,
  style,
}: SandboxPromoteModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      data-surface="sandbox-promote"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={SP_TITLE}
        className={className}
        data-modal="sandbox-promote"
        style={{
          width: 520,
          maxWidth: "100%",
          background: "var(--bg)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-lg)",
          boxShadow: "0 28px 70px rgba(0,0,0,.55)",
          overflow: "hidden",
          ...style,
        }}
      >
        <header
          style={{
            padding: "22px 24px 16px",
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "flex",
              color: "var(--warn)",
              flex: "none",
              marginTop: 1,
            }}
          >
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 16V4M8 8l4-4 4 4M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
            </svg>
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              margin: 0,
              color: "var(--ink)",
            }}
          >
            {SP_TITLE}
          </h2>
        </header>
        <div style={{ padding: "18px 24px" }}>
          <p
            data-field="body"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              color: "var(--ink-soft)",
              lineHeight: 1.6,
              margin: "0 0 18px",
            }}
          >
            {SP_BODY}
          </p>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 8,
            }}
          >
            {SP_WHAT_WILL_MERGE_HEADING}
          </div>
          <div
            data-field="shape-table"
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              overflow: "hidden",
              marginBottom: 18,
            }}
          >
            {shapes.map((s, i) => (
              <div
                key={`${s.kind}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 15px",
                  borderBottomWidth: i < shapes.length - 1 ? 1 : 0,
                  borderBottomStyle: "solid",
                  borderBottomColor: "var(--line)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13.5,
                    color: "var(--accent)",
                    width: 40,
                    textAlign: "right",
                  }}
                >
                  {s.count}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14,
                    color: "var(--ink)",
                  }}
                >
                  {s.kind}
                </span>
              </div>
            ))}
          </div>
          <div
            data-field="references-line"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 11,
              padding: "13px 15px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--sandbox-frame)",
              borderRadius: "var(--r-md)",
              background: "var(--sandbox-frame-soft)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "flex",
                color: "var(--sandbox-frame)",
                flex: "none",
                marginTop: 1,
              }}
            >
              <svg
                width={17}
                height={17}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
                <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
              </svg>
            </span>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13.5,
                color: "var(--ink)",
                lineHeight: 1.5,
              }}
            >
              {existingReferencesLabel}
              {SP_REFERENCE_LINE_SUFFIX}
            </span>
          </div>
        </div>
        <footer
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            data-action="cancel"
            style={{
              padding: "11px 18px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {SP_CANCEL_CTA}
          </button>
          <button
            type="button"
            onClick={onPromote}
            data-action="promote"
            style={{
              padding: "11px 22px",
              borderRadius: "var(--r-md)",
              background: "var(--warn-soft)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              color: "var(--warn)",
              cursor: "pointer",
            }}
          >
            {SP_PROMOTE_CTA}
          </button>
        </footer>
      </div>
    </div>
  );
}
