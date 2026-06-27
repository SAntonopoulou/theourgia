/**
 * PluginSubmissionDetail — H10 Cluster A4 surface.
 *
 * When the submission is in "changes_requested", the reviewer notes
 * block renders FIRST (primary surface) above the timeline. For any
 * other state, the timeline + capabilities are the main view.
 *
 * Rule 49 — actor labels are human-readable strings the parent
 * supplies; this surface NEVER renders UUIDs.
 */

import type { CSSProperties } from "react";

import {
  BUTTONS,
  type CapabilityChip,
  HEADERS,
  type TimelineDotTone,
  type TimelineEntry,
  WITHDRAW_HINT,
} from "./copy.js";

export interface PluginSubmissionDetailSurfaceProps {
  /** When set, the reviewer-notes block renders at the top + Resubmit
   *  CTA shows. The textarea body renders verbatim in a `--font-mono`
   *  pre block. */
  reviewerNote?: {
    body: string;
    maintainerLabel?: string;
  };
  /** When the submission can be withdrawn (pending or under review),
   *  the Withdraw footer renders. Defaults to true. */
  canWithdraw?: boolean;
  /** When the submission has open reviewer feedback, the Resubmit CTA
   *  is shown above the timeline (links back to A2). */
  resubmitHref?: string;
  timeline: readonly TimelineEntry[];
  capabilities: readonly CapabilityChip[];
  /** Captions a "(unchanged since v1.4.2)" hint above the capability list. */
  capabilityHint?: string;
  onResubmit?: () => void;
  onWithdraw?: () => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 620,
  margin: "0 auto",
  padding: "26px 24px 40px",
  display: "flex",
  flexDirection: "column",
  gap: 26,
};

const SECTION_HEADING: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 16,
  color: "var(--ink)",
  marginBottom: 13,
};

function toneColor(tone: TimelineDotTone): string {
  switch (tone) {
    case "accent":
      return "var(--accent)";
    case "warn":
      return "var(--warn)";
    case "peer-ok":
      return "var(--peer-ok)";
    case "ink-mute":
      return "var(--ink-mute)";
  }
}

export function PluginSubmissionDetailSurface({
  reviewerNote,
  canWithdraw = true,
  resubmitHref,
  timeline,
  capabilities,
  capabilityHint,
  onResubmit,
  onWithdraw,
  className,
  style,
}: PluginSubmissionDetailSurfaceProps) {
  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      {reviewerNote ? (
        <section
          style={{
            padding: "18px 20px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--warn-border)",
            borderRadius: "var(--r-lg)",
            background: "var(--warn-soft)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              color: "var(--ink)",
              marginBottom: 4,
            }}
          >
            {HEADERS.changesRequestedTitle}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
              marginBottom: 13,
            }}
          >
            {HEADERS.changesRequestedSubtitle}
            {reviewerNote.maintainerLabel
              ? ` — ${reviewerNote.maintainerLabel}`
              : ""}
          </div>
          <pre
            style={{
              margin: 0,
              padding: "14px 16px",
              background: "var(--bg-sunk)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              lineHeight: 1.65,
              color: "var(--ink-soft)",
              whiteSpace: "pre-wrap",
            }}
          >
            {reviewerNote.body}
          </pre>
          {resubmitHref || onResubmit ? (
            <button
              type="button"
              onClick={() => {
                if (onResubmit) {
                  onResubmit();
                  return;
                }
                if (resubmitHref && typeof window !== "undefined") {
                  window.location.assign(resubmitHref);
                }
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                marginTop: 14,
                padding: "9px 16px",
                borderRadius: "var(--r-md)",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 13,
                borderWidth: 0,
                cursor: "pointer",
              }}
            >
              {BUTTONS.resubmitWithChanges}
            </button>
          ) : null}
        </section>
      ) : null}

      <section>
        <div style={SECTION_HEADING}>{HEADERS.timeline}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {timeline.map((t, idx) => {
            const last = idx === timeline.length - 1;
            const c = toneColor(t.tone);
            return (
              <div
                key={`${t.label}-${idx}`}
                style={{
                  display: "flex",
                  gap: 14,
                  paddingBottom: last ? 0 : 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: "none",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      background: c,
                      borderWidth: 2,
                      borderStyle: "solid",
                      borderColor: "var(--bg)",
                      boxShadow: `0 0 0 1px ${c}`,
                    }}
                  />
                  {!last ? (
                    <span
                      style={{
                        flex: 1,
                        width: 1,
                        background: "var(--line)",
                        marginTop: 3,
                      }}
                    />
                  ) : null}
                </div>
                <div style={{ flex: 1, minWidth: 0, marginTop: -3 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14.5,
                      color: "var(--ink)",
                    }}
                  >
                    {t.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                      marginTop: 2,
                    }}
                  >
                    {t.meta}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--ink)",
            marginBottom: 4,
          }}
        >
          {HEADERS.capabilities}
        </div>
        {capabilityHint ? (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
              marginBottom: 12,
            }}
          >
            {capabilityHint}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {capabilities.map((c) => (
            <div
              key={c.wireKey}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
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
          ))}
        </div>
      </section>

      {canWithdraw ? (
        <section
          style={{
            paddingTop: 6,
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
              flex: 1,
            }}
          >
            {WITHDRAW_HINT}
          </span>
          <button
            type="button"
            onClick={onWithdraw}
            style={{
              padding: "9px 16px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              background: "var(--warn-soft)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--warn)",
              cursor: "pointer",
            }}
          >
            {BUTTONS.withdraw}
          </button>
        </section>
      ) : null}
    </div>
  );
}
