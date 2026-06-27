/**
 * TierPromotion — H10 Cluster A7 surface.
 *
 * Rule 41 — promotion is NEVER auto. Every manual checklist item
 * must be ticked AND every automatic check must already pass before
 * the Promote button enables.
 */

import { useMemo, useState, type CSSProperties } from "react";

import {
  CHANGE_PLUGIN_LABEL,
  type ChecklistItem,
  CHECKLIST_SUBTITLE,
  GATE_NOTE,
  HEADERS,
  JUSTIFICATION_PLACEHOLDER,
  JUSTIFICATION_SUBTITLE,
  PROMOTE_LABEL,
} from "./copy.js";

export interface PluginPickerMeta {
  name: string;
  version: string;
  authorHandle: string;
  /** "in Community for 4 months". */
  inCommunityFor: string;
}

export interface TierPromotionSurfaceProps {
  plugin: PluginPickerMeta;
  /** Checklist mixes automatic (read-only) + manual (checkbox) items.
   *  Automatic items carry their satisfied state from the parent;
   *  manual items start as `satisfied: false` and toggle locally. */
  checklist: readonly ChecklistItem[];
  onChangePlugin?: () => void;
  onPromote?: (payload: {
    justification: string;
    manualChecksTicked: readonly string[];
  }) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "24px 24px 44px",
};

const SECTION_HEADING: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 16,
  color: "var(--ink)",
  marginBottom: 9,
};

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 5h16M4 5v14h16V5M9 5v14M4 12h5" />
    </svg>
  );
}

export function TierPromotionSurface({
  plugin,
  checklist,
  onChangePlugin,
  onPromote,
  className,
  style,
}: TierPromotionSurfaceProps) {
  const manualItems = useMemo(
    () => checklist.filter((c) => c.kind === "manual"),
    [checklist],
  );
  const autoItems = useMemo(
    () => checklist.filter((c) => c.kind === "automatic"),
    [checklist],
  );

  const [manualState, setManualState] = useState<Record<string, boolean>>(
    () => Object.fromEntries(manualItems.map((i) => [i.id, false])),
  );
  const [justification, setJustification] = useState("");

  const allManualTicked = manualItems.every((i) => manualState[i.id]);
  const allAutoSatisfied = autoItems.every((i) => i.satisfied);
  const canPromote = allManualTicked && allAutoSatisfied;

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      {/* Plugin picker */}
      <div style={SECTION_HEADING}>{HEADERS.communityPlugin}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "14px 16px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          marginBottom: 24,
        }}
      >
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: "var(--r-md)",
            flex: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            background: "var(--accent-soft)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
          }}
        >
          <CalendarIcon />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              color: "var(--ink)",
            }}
          >
            {plugin.name}{" "}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              {plugin.version}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {plugin.authorHandle} · {plugin.inCommunityFor}
          </div>
        </div>
        <button
          type="button"
          onClick={onChangePlugin}
          style={{
            padding: "7px 13px",
            borderRadius: "var(--r-md)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            background: "transparent",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          {CHANGE_PLUGIN_LABEL}
        </button>
      </div>

      {/* Checklist */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 4,
        }}
      >
        {HEADERS.promotionChecklist}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          marginBottom: 13,
        }}
      >
        {CHECKLIST_SUBTITLE}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 24,
        }}
      >
        {checklist.map((c) => {
          const checked =
            c.kind === "automatic" ? c.satisfied : !!manualState[c.id];
          const border = checked
            ? "var(--peer-ok-border)"
            : "var(--line)";
          const bg = checked ? "var(--peer-ok-soft)" : "var(--bg-2)";
          return (
            <div
              key={c.id}
              data-item={c.id}
              data-kind={c.kind}
              data-checked={checked}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: border,
                borderRadius: "var(--r-md)",
                background: bg,
              }}
            >
              {c.kind === "automatic" ? (
                <span
                  style={{
                    display: "flex",
                    color: checked ? "var(--peer-ok)" : "var(--ink-mute)",
                    flex: "none",
                  }}
                  aria-hidden="true"
                >
                  <CheckIcon />
                </span>
              ) : (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={c.label}
                  onClick={() =>
                    setManualState((s) => ({ ...s, [c.id]: !s[c.id] }))
                  }
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "var(--r-sm)",
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: checked
                      ? "var(--accent)"
                      : "var(--line-2)",
                    background: checked
                      ? "var(--accent)"
                      : "var(--bg-2)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {checked ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent-ink)"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12.5l4 4L19 7" />
                    </svg>
                  ) : null}
                </button>
              )}
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink)",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {c.label}
              </span>
              {c.kind === "automatic" ? (
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  auto
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Justification */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 4,
        }}
      >
        {HEADERS.justification}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          marginBottom: 10,
        }}
      >
        {JUSTIFICATION_SUBTITLE}
      </div>
      <textarea
        rows={3}
        value={justification}
        onChange={(e) => setJustification(e.target.value)}
        aria-label={HEADERS.justification}
        placeholder={JUSTIFICATION_PLACEHOLDER}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          color: "var(--ink)",
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          lineHeight: 1.55,
          resize: "vertical",
          marginBottom: 24,
        }}
      />

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "flex-end",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            marginRight: "auto",
          }}
        >
          {canPromote ? GATE_NOTE.ready : GATE_NOTE.blocked}
        </span>
        <button
          type="button"
          disabled={!canPromote}
          onClick={() =>
            onPromote?.({
              justification,
              manualChecksTicked: manualItems
                .filter((i) => manualState[i.id])
                .map((i) => i.id),
            })
          }
          style={{
            padding: "11px 22px",
            borderRadius: "var(--r-md)",
            background: canPromote ? "var(--accent)" : "var(--bg-3)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: canPromote ? "var(--accent)" : "var(--line)",
            color: canPromote ? "var(--accent-ink)" : "var(--ink-mute)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 14,
            cursor: canPromote ? "pointer" : "not-allowed",
          }}
        >
          {PROMOTE_LABEL}
        </button>
      </div>
    </div>
  );
}
