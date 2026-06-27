/**
 * RegistryReviewDetail — H10 Cluster A6 surface · THE maintainer
 * worked example.
 *
 * Rule 44 invariants enforced in chrome:
 *
 *   · Verification panel is read-only. The state of each check is
 *     passed in by the parent (computed server-side).
 *   · Accept-as-Official is gated on (allChecksPass && ackChecked).
 *     If first submission, that's a separate "Full review required"
 *     note; once acked + all green, the button is live.
 *   · No approve-blind affordance — the layout always renders the
 *     verification panel + diff above the decision buttons.
 */

import { useState, type CSSProperties } from "react";

import {
  ACK_COPY,
  DECISION_LABELS,
  type DiffEntry,
  FIRST_SUBMISSION_NOTE,
  HEADERS,
  NOTES_PLACEHOLDER,
  type VerificationCheck,
  VERIFICATION_SUBTITLE,
} from "./copy.js";

export interface RegistryReviewDetailSurfaceProps {
  checks: readonly VerificationCheck[];
  /** Previous version label, e.g., "v2.2.0" — when undefined, this is a
   *  first submission and the diff section renders the FIRST_SUBMISSION_NOTE. */
  diffAgainstVersion?: string;
  diff: readonly DiffEntry[];
  manifestText: string;
  /** Label + href for the source-download CTA. */
  sourceLabel?: string;
  sourceHref?: string;
  onRequestChanges?: (notes: string) => void;
  onAcceptCommunity?: (notes: string) => void;
  onAcceptOfficial?: (notes: string) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 680,
  margin: "0 auto",
  padding: "24px 24px 40px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const SECTION_HEADING: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 16,
  color: "var(--ink)",
  marginBottom: 4,
};

function CheckIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function RegistryReviewDetailSurface({
  checks,
  diffAgainstVersion,
  diff,
  manifestText,
  sourceLabel = "Download source from GitHub release →",
  sourceHref = "#",
  onRequestChanges,
  onAcceptCommunity,
  onAcceptOfficial,
  className,
  style,
}: RegistryReviewDetailSurfaceProps) {
  const [notes, setNotes] = useState("");
  const [acked, setAcked] = useState(false);

  const allChecksPass = checks.every((c) => c.ok);
  const isFirstSubmission = !diffAgainstVersion;
  const officialEnabled = allChecksPass && acked && !isFirstSubmission;

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      {/* Verification panel */}
      <section>
        <div style={SECTION_HEADING}>{HEADERS.automaticVerification}</div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
            marginBottom: 12,
          }}
        >
          {VERIFICATION_SUBTITLE}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 9,
          }}
        >
          {checks.map((c) => {
            const tone = c.ok ? "peer-ok" : "warn";
            const color =
              tone === "peer-ok" ? "var(--peer-ok)" : "var(--warn)";
            const bg =
              tone === "peer-ok"
                ? "var(--peer-ok-soft)"
                : "var(--warn-soft)";
            const border =
              tone === "peer-ok"
                ? "var(--peer-ok-border)"
                : "var(--warn-border)";
            return (
              <div
                key={c.key}
                data-check={c.key}
                data-ok={c.ok}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: border,
                  borderRadius: "var(--r-md)",
                  background: bg,
                }}
              >
                <span
                  style={{ display: "flex", color, flex: "none" }}
                  aria-hidden="true"
                >
                  {c.ok ? <CheckIcon /> : <CrossIcon />}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 13.5,
                    color: "var(--ink)",
                  }}
                >
                  {c.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Diff */}
      <section>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--ink)",
            marginBottom: 12,
          }}
        >
          {isFirstSubmission
            ? HEADERS.diff
            : `${HEADERS.diff} against ${diffAgainstVersion}`}
        </div>
        {isFirstSubmission ? (
          <div
            style={{
              padding: "12px 14px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-soft)",
              marginBottom: 12,
            }}
          >
            {FIRST_SUBMISSION_NOTE}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {diff.map((d) => {
            if (d.kind === "added") {
              return (
                <div
                  key={d.wireKey}
                  data-kind="added"
                  style={{
                    padding: "11px 14px",
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
                      gap: 9,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        color: "var(--warn)",
                      }}
                    >
                      + added
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 14,
                        color: "var(--ink)",
                      }}
                    >
                      {d.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--warn)",
                      }}
                    >
                      {d.wireKey}
                    </span>
                  </div>
                  {d.consequence ? (
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11.5,
                        color: "var(--ink-mute)",
                      }}
                    >
                      {d.consequence}
                    </div>
                  ) : null}
                </div>
              );
            }
            if (d.kind === "removed") {
              return (
                <div
                  key={d.wireKey}
                  data-kind="removed"
                  style={{
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
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--ink-mute)",
                    }}
                  >
                    − removed
                  </span>{" "}
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 13.5,
                      color: "var(--ink-soft)",
                      textDecoration: "line-through",
                    }}
                  >
                    {d.label} ·{" "}
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                      }}
                    >
                      {d.wireKey}
                    </span>
                  </span>
                </div>
              );
            }
            return (
              <div
                key={d.wireKey}
                data-kind="unchanged"
                style={{
                  padding: "11px 14px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  opacity: 0.78,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-mute)",
                  }}
                >
                  · unchanged
                </span>{" "}
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 13.5,
                    color: "var(--ink-soft)",
                  }}
                >
                  {d.label} ·{" "}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                    }}
                  >
                    {d.wireKey}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Manifest + source */}
      <section>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--ink)",
            marginBottom: 10,
          }}
        >
          {HEADERS.manifestSource}
        </div>
        <pre
          style={{
            margin: "0 0 11px",
            padding: "13px 15px",
            background: "var(--bg-sunk)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            lineHeight: 1.55,
            color: "var(--ink-soft)",
            whiteSpace: "pre-wrap",
          }}
        >
          {manifestText}
        </pre>
        <a
          href={sourceHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 15px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink-soft)",
            textDecoration: "none",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 4v11M8 11l4 4 4-4M5 19h14" />
          </svg>
          {sourceLabel}
        </a>
      </section>

      {/* Reviewer notes */}
      <section>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--ink)",
            marginBottom: 10,
          }}
        >
          {HEADERS.reviewerNotes}
        </div>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-label={HEADERS.reviewerNotes}
          placeholder={NOTES_PLACEHOLDER}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            lineHeight: 1.5,
            resize: "vertical",
          }}
        />
      </section>

      {/* Decision */}
      <section
        style={{
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopStyle: "solid",
          borderTopColor: "var(--line)",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 11,
            marginBottom: 14,
            cursor: "pointer",
          }}
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={acked}
            aria-label="Acknowledge Official-tier review"
            onClick={() => setAcked(!acked)}
            style={{
              width: 20,
              height: 20,
              borderRadius: "var(--r-sm)",
              flex: "none",
              marginTop: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: acked ? "var(--accent)" : "var(--line-2)",
              background: acked ? "var(--accent)" : "var(--bg-2)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {acked ? (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-ink)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.5l4 4L19 7" />
              </svg>
            ) : null}
          </button>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 13.5,
              color: "var(--ink)",
              lineHeight: 1.5,
            }}
          >
            {ACK_COPY}
          </span>
        </label>
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            disabled={!allChecksPass}
            onClick={() => onRequestChanges?.(notes)}
            style={{
              padding: "11px 17px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              background: "var(--warn-soft)",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              color: "var(--warn)",
              cursor: allChecksPass ? "pointer" : "not-allowed",
              opacity: allChecksPass ? 1 : 0.5,
            }}
          >
            {DECISION_LABELS.requestChanges}
          </button>
          <button
            type="button"
            disabled={!allChecksPass}
            onClick={() => onAcceptCommunity?.(notes)}
            style={{
              padding: "11px 17px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--peer-ok-border)",
              background: "var(--peer-ok-soft)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13.5,
              color: "var(--peer-ok)",
              cursor: allChecksPass ? "pointer" : "not-allowed",
              opacity: allChecksPass ? 1 : 0.5,
            }}
          >
            {DECISION_LABELS.acceptCommunity}
          </button>
          <button
            type="button"
            disabled={!officialEnabled}
            onClick={() => onAcceptOfficial?.(notes)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "11px 17px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: officialEnabled
                ? "var(--peer-ok-border)"
                : "var(--line)",
              background: officialEnabled
                ? "var(--peer-ok-soft)"
                : "var(--bg-3)",
              color: officialEnabled
                ? "var(--peer-ok)"
                : "var(--ink-mute)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13.5,
              cursor: officialEnabled ? "pointer" : "not-allowed",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "currentColor",
              }}
            />
            {DECISION_LABELS.acceptOfficial}
          </button>
        </div>
      </section>
    </div>
  );
}
