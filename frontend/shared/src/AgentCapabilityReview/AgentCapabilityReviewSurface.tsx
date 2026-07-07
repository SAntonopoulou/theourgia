/**
 * AgentCapabilityReview — H10 Cluster C4 surface · modal.
 *
 * Rules 31, 52, 53.
 *
 * Update mode renders new capabilities first in --warn-soft chrome
 * above the already-granted set. The same H09 useScrollGate primitive
 * gates the Approve button.
 */

import { useCallback, type CSSProperties } from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";
import { useScrollGate } from "../PluginCapabilityReview/ScrollGate.js";

import {
  type AgentCapabilityRow,
  BUTTONS,
  type CapabilityReviewScenario,
  GATE_NOTES,
  RULE_52_LINE,
  RULE_53_LINE,
  SCROLL_HINTS,
  SECTION_LABELS,
  TITLE,
} from "./copy.js";

export interface AgentCapabilityReviewSurfaceProps {
  scenario?: CapabilityReviewScenario;
  /** Agent display name + DID + version, rendered into the title row. */
  agentName: string;
  agentDid: string;
  agentVersion: string;
  /** Already-granted capabilities (install scenario: every cap goes here). */
  alreadyGranted: readonly AgentCapabilityRow[];
  /** Newly-requested capabilities (update scenario only — empty for install). */
  newlyRequested?: readonly AgentCapabilityRow[];
  onCancel?: () => void;
  onApprove?: () => void;
  className?: string;
  style?: CSSProperties;
}

const SECTION_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 9,
};

function ExclusionsIcon({ which }: { which: "sealed" | "closed" }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (which === "sealed") {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M5 5l14 14" />
    </svg>
  );
}

export function AgentCapabilityReviewSurface({
  scenario = "install",
  agentName,
  agentDid,
  agentVersion,
  alreadyGranted,
  newlyRequested = [],
  onCancel,
  onApprove,
  className,
  style,
}: AgentCapabilityReviewSurfaceProps) {
  const { open: scrolledEnd, containerProps } = useScrollGate();
  const isUpdate = scenario === "update";

  // Escape cancels the review (b108-2fz a11y sweep).
  const handleEsc = useCallback(() => {
    onCancel?.();
  }, [onCancel]);
  useEscapeToClose(true, handleEsc);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cr-title"
      className={className}
      style={{
        width: 560,
        maxWidth: "100%",
        maxHeight: "88vh",
        display: "flex",
        flexDirection: "column",
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
      <div
        style={{
          padding: "20px 24px 15px",
          borderBottomWidth: 1,
          borderBottomStyle: "solid",
          borderBottomColor: "var(--line)",
          flex: "none",
        }}
      >
        <h2
          id="cr-title"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 21,
            margin: 0,
            color: "var(--ink)",
          }}
        >
          {TITLE}
        </h2>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-mute)",
            marginTop: 4,
          }}
        >
          {agentName} · {agentDid} · v{agentVersion}
        </div>
      </div>

      <div
        className="scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "18px 24px",
        }}
        {...containerProps}
      >
        {isUpdate && newlyRequested.length > 0 ? (
          <>
            <div
              style={{ ...SECTION_LABEL, color: "var(--warn)" }}
              data-section="new-in-update"
            >
              {SECTION_LABELS.newInUpdate}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 9,
                marginBottom: 20,
              }}
            >
              {newlyRequested.map((c) => (
                <div
                  key={`new-${c.wireKey}-${c.label}`}
                  data-cap={c.wireKey}
                  data-cap-kind="new"
                  style={{
                    padding: "13px 15px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--warn-border)",
                    borderRadius: "var(--r-md)",
                    background: "var(--warn-soft)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 14.5,
                        color: "var(--ink)",
                      }}
                    >
                      {c.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11.5,
                        color: "var(--warn)",
                        padding: "1px 7px",
                        borderRadius: "var(--r-sm)",
                        background: "rgba(0,0,0,.12)",
                      }}
                    >
                      {c.wireKey}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      color: "var(--ink-soft)",
                      lineHeight: 1.5,
                    }}
                  >
                    {c.note}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{ ...SECTION_LABEL, color: "var(--ink-mute)" }}
              data-section="already-granted"
            >
              {SECTION_LABELS.alreadyGranted}
            </div>
          </>
        ) : null}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 9,
            marginBottom: 20,
          }}
        >
          {alreadyGranted.map((c) => (
            <div
              key={`granted-${c.wireKey}-${c.label}`}
              data-cap={c.wireKey}
              data-cap-kind="granted"
              style={{
                padding: "13px 15px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 5,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14.5,
                    color: "var(--ink)",
                  }}
                >
                  {c.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    color: "var(--network)",
                    padding: "1px 7px",
                    borderRadius: "var(--r-sm)",
                    background: "var(--network-soft)",
                  }}
                >
                  {c.wireKey}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  lineHeight: 1.5,
                }}
              >
                {c.note}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{ ...SECTION_LABEL, color: "var(--ink-mute)" }}
          data-section="never-visible"
        >
          {SECTION_LABELS.neverVisible}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            data-exclusion="sealed"
            style={{
              display: "flex",
              gap: 11,
              padding: "12px 14px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--seal-border)",
              borderRadius: "var(--r-md)",
              background: "var(--seal-soft)",
            }}
          >
            <span
              style={{
                display: "flex",
                color: "var(--seal)",
                flex: "none",
                marginTop: 1,
              }}
            >
              <ExclusionsIcon which="sealed" />
            </span>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink)",
                lineHeight: 1.5,
              }}
            >
              {RULE_53_LINE}
            </span>
          </div>
          <div
            data-exclusion="closed-tradition"
            style={{
              display: "flex",
              gap: 11,
              padding: "12px 14px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--seal-border)",
              borderRadius: "var(--r-md)",
              background: "var(--seal-soft)",
            }}
          >
            <span
              style={{
                display: "flex",
                color: "var(--seal)",
                flex: "none",
                marginTop: 1,
              }}
            >
              <ExclusionsIcon which="closed" />
            </span>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink)",
                lineHeight: 1.5,
              }}
            >
              {RULE_52_LINE}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            justifyContent: "center",
            marginTop: 16,
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: scrolledEnd ? "var(--peer-ok)" : "var(--ink-mute)",
          }}
          data-scroll-hint
        >
          {scrolledEnd ? SCROLL_HINTS.done : SCROLL_HINTS.pending}
        </div>
      </div>

      <div
        style={{
          flex: "none",
          borderTopWidth: 1,
          borderTopStyle: "solid",
          borderTopColor: "var(--line)",
          padding: "15px 24px",
          display: "flex",
          gap: 10,
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <span
          style={{
            marginRight: "auto",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
          data-gate-note
        >
          {scrolledEnd ? GATE_NOTES.reviewed : GATE_NOTES.scrollFirst}
        </span>
        <button
          type="button"
          onClick={onCancel}
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
          {BUTTONS.cancel}
        </button>
        <button
          type="button"
          disabled={!scrolledEnd}
          onClick={onApprove}
          style={{
            padding: "11px 22px",
            borderRadius: "var(--r-md)",
            background: scrolledEnd ? "var(--accent)" : "var(--bg-3)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: scrolledEnd ? "var(--accent)" : "var(--line)",
            color: scrolledEnd ? "var(--accent-ink)" : "var(--ink-mute)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 14,
            cursor: scrolledEnd ? "pointer" : "not-allowed",
          }}
        >
          {isUpdate ? BUTTONS.approveUpdate : BUTTONS.approve}
        </button>
      </div>
    </div>
  );
}
