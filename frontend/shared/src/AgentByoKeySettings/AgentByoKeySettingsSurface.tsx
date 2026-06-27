/**
 * AgentByoKeySettings — H10 Cluster C5 surface.
 *
 * Rule 57 — BYO only. The verbatim preamble is locked at the top.
 *
 * Secret-field discipline:
 *   - When `hasKey=true`: render the SECRET_MASK string (read-only)
 *     and a Reset button. The actual key is NEVER displayed.
 *   - When `hasKey=false`: render an editable input where the user
 *     pastes their key. The onSave callback receives the pasted value.
 *
 * Per-agent override list shows each agent's current key choice
 * ("shared key" / "own key"). Override button opens the override
 * flow (parent-routed).
 */

import { useState, type CSSProperties } from "react";

import {
  BUTTONS,
  HEADERS,
  HINTS,
  PER_AGENT_KEY_LABEL,
  type PerAgentKeyKind,
  RULE_57_PREAMBLE,
  SECRET_MASK,
} from "./copy.js";

export interface PerAgentKeyRow {
  id: string;
  name: string;
  kind: PerAgentKeyKind;
}

export interface AgentByoKeySettingsSurfaceProps {
  hasKey: boolean;
  perAgent: readonly PerAgentKeyRow[];
  onSaveKey?: (key: string) => void;
  onReset?: () => void;
  onConnectSubscription?: () => void;
  onOverrideAgent?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "26px 24px 48px",
};

export function AgentByoKeySettingsSurface({
  hasKey,
  perAgent,
  onSaveKey,
  onReset,
  onConnectSubscription,
  onOverrideAgent,
  className,
  style,
}: AgentByoKeySettingsSurfaceProps) {
  const [pasted, setPasted] = useState("");

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      {/* Rule 57 preamble — verbatim */}
      <div
        style={{
          padding: "16px 18px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-md)",
          background: "var(--accent-soft)",
          marginBottom: 26,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            color: "var(--ink)",
            lineHeight: 1.6,
          }}
        >
          {RULE_57_PREAMBLE}
        </div>
      </div>

      {/* Anthropic key */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 9,
        }}
      >
        {HEADERS.anthropicKey}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 7,
        }}
      >
        {hasKey ? (
          <>
            <input
              type="password"
              value={SECRET_MASK}
              readOnly
              aria-label="Stored Anthropic key (masked)"
              style={{
                flex: 1,
                minWidth: 0,
                padding: "10px 13px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-3)",
                color: "var(--ink-mute)",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                letterSpacing: "0.1em",
              }}
            />
            <button
              type="button"
              onClick={() => {
                onReset?.();
                setPasted("");
              }}
              style={{
                padding: "9px 15px",
                borderRadius: "var(--r-md)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-soft)",
                flex: "none",
                cursor: "pointer",
              }}
            >
              {BUTTONS.reset}
            </button>
          </>
        ) : (
          <>
            <input
              type="password"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="sk-ant-…"
              aria-label="Paste your Anthropic API key"
              style={{
                flex: 1,
                minWidth: 0,
                padding: "10px 13px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
              }}
            />
            <button
              type="button"
              disabled={pasted.trim().length === 0}
              onClick={() => onSaveKey?.(pasted.trim())}
              style={{
                padding: "9px 15px",
                borderRadius: "var(--r-md)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor:
                  pasted.trim().length === 0
                    ? "var(--line)"
                    : "var(--accent)",
                background:
                  pasted.trim().length === 0
                    ? "var(--bg-3)"
                    : "var(--accent-soft)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color:
                  pasted.trim().length === 0
                    ? "var(--ink-mute)"
                    : "var(--accent)",
                flex: "none",
                cursor:
                  pasted.trim().length === 0 ? "not-allowed" : "pointer",
              }}
            >
              Save
            </button>
          </>
        )}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          marginBottom: 26,
        }}
      >
        {HINTS.anthropicKey}
      </div>

      {/* Subscription */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 4,
        }}
      >
        {HEADERS.subscription}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          marginBottom: 11,
        }}
      >
        {HINTS.subscription}
      </div>
      <button
        type="button"
        onClick={onConnectSubscription}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          padding: "10px 17px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-md)",
          background: "transparent",
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          color: "var(--ink-soft)",
          marginBottom: 30,
          cursor: "pointer",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
          <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
        </svg>
        {BUTTONS.connectSubscription}
      </button>

      {/* Per-agent override */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 4,
        }}
      >
        {HEADERS.perAgentOverride}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          marginBottom: 12,
        }}
      >
        {HINTS.perAgentOverride}
      </div>
      <div
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          overflow: "hidden",
        }}
      >
        {perAgent.length === 0 ? (
          <div
            style={{
              padding: "16px 18px",
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-mute)",
            }}
          >
            No agents installed yet.
          </div>
        ) : (
          perAgent.map((a, idx) => (
            <div
              key={a.id}
              data-agent={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 15px",
                borderBottomWidth: idx < perAgent.length - 1 ? 1 : 0,
                borderBottomStyle: "solid",
                borderBottomColor: "var(--line)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink)",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {a.name}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                }}
              >
                {PER_AGENT_KEY_LABEL[a.kind]}
              </span>
              <button
                type="button"
                onClick={() => onOverrideAgent?.(a.id)}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--accent)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {BUTTONS.override}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
