/**
 * PluginCapabilityReviewModal — H09 Cluster A surface 3.
 *
 * **The H09 worked example.** Permission-grant chrome, not
 * consent-theatre.
 *
 * Faithful port of ``Theourgia Plugin Capability Review.dc.html``.
 *
 * Honesty rules wired (rule 31 · 33):
 *
 *   * Every capability is listed with plain English label +
 *     wire key + one-line consequence. NO "Grant all" shortcut.
 *   * The **ScrollGate** disables the Install/Update CTA until
 *     the user has scrolled the capability list to the bottom —
 *     the gesture proves intent. The footer note flips from
 *     "Scroll through every capability to continue" to
 *     "Reviewed" once the gate opens.
 *   * On **UPDATE**: "Newly-requested capabilities" sub-section
 *     (`--warn-soft` rows) precedes "Already-granted
 *     capabilities" (`--bg-2` rows).
 *   * **Tier-3 (Unverified)**: persistent `--warn-soft` callout
 *     at the top with verbatim disclosure + explicit ack
 *     checkbox below the footer note that gates Install on
 *     top of the scroll-gate.
 *   * Esc + scrim → cancel (never a silent grant).
 */

import {
  type CSSProperties,
  useEffect,
  useId,
  useState,
} from "react";

import { CapabilityRow, type CapabilityRowData } from "../PluginDetail/CapabilityRow.js";
import {
  PCR_CANCEL_CTA,
  PCR_GATE_NOTE_NEEDS_ACK,
  PCR_GATE_NOTE_NOT_REVIEWED,
  PCR_GATE_NOTE_REVIEWED,
  PCR_GRANTED_HEADING,
  PCR_HINT_NOT_REVIEWED,
  PCR_HINT_REVIEWED,
  PCR_INSTALL_CTA,
  PCR_NEW_BADGE,
  PCR_NEW_CAPS_HEADING,
  PCR_TIER3_ACK_LABEL,
  PCR_TIER3_DISCLOSURE,
  PCR_TITLE_SUFFIX,
  PCR_UPDATE_CTA,
} from "./copy.js";
import { useScrollGate } from "./ScrollGate.js";

// ─── Data shapes ──────────────────────────────────────────────────

export type CapabilityReviewScenario =
  | "install"
  | "update"
  | "tier3";

export interface PluginCapabilityReviewModalProps {
  /** Plugin display name. */
  pluginName: string;
  /** Author DID — surfaced under the title in --font-mono. */
  authorDid: string;
  /** Granted (or being requested for the first time) capabilities. */
  capabilities: readonly CapabilityRowData[];
  /** ONLY for ``scenario === "update"``: capabilities the new
   *  version newly requests. Rendered in --warn-soft above the
   *  granted list. */
  newlyRequestedCapabilities?: readonly CapabilityRowData[];
  scenario: CapabilityReviewScenario;
  onCancel: () => void;
  onInstall: () => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────

export function PluginCapabilityReviewModal({
  pluginName,
  authorDid,
  capabilities,
  newlyRequestedCapabilities = [],
  scenario,
  onCancel,
  onInstall,
  className,
  style,
}: PluginCapabilityReviewModalProps) {
  const titleId = useId();
  const isUpdate = scenario === "update";
  const isTier3 = scenario === "tier3";

  const { open: scrolledEnd, containerProps } = useScrollGate();
  const [acked, setAcked] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const gateOk = scrolledEnd && (!isTier3 || acked);
  const gateNote = !scrolledEnd
    ? PCR_GATE_NOTE_NOT_REVIEWED
    : isTier3 && !acked
      ? PCR_GATE_NOTE_NEEDS_ACK
      : PCR_GATE_NOTE_REVIEWED;
  const installLabel = isUpdate ? PCR_UPDATE_CTA : PCR_INSTALL_CTA;
  const hint = scrolledEnd ? PCR_HINT_REVIEWED : PCR_HINT_NOT_REVIEWED;
  const hintColor = scrolledEnd
    ? "var(--peer-ok)"
    : "var(--ink-mute)";

  return (
    <div
      data-surface="plugin-capability-review"
      data-scenario={scenario}
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
        aria-labelledby={titleId}
        className={className}
        data-modal="plugin-capability-review"
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
        <header
          style={{
            padding: "20px 24px 15px",
            borderBottom: "1px solid var(--line)",
            flex: "none",
          }}
        >
          <h2
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              margin: 0,
              color: "var(--ink)",
            }}
          >
            {pluginName}
            {PCR_TITLE_SUFFIX}
          </h2>
          <div
            data-field="author-did"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-mute)",
              marginTop: 4,
            }}
          >
            {authorDid}
          </div>
        </header>

        <div
          {...containerProps}
          data-field="scroll-body"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "18px 24px",
          }}
        >
          {isTier3 ? (
            <div
              data-field="tier3-disclosure"
              role="note"
              style={{
                display: "flex",
                gap: 11,
                padding: "13px 15px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--warn-border)",
                borderRadius: "var(--r-md)",
                background: "var(--warn-soft)",
                marginBottom: 18,
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
                  width={19}
                  height={19}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l9 16H3z" />
                  <path d="M12 9v4M12 16h.01" />
                </svg>
              </span>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 13.5,
                  color: "var(--ink)",
                  lineHeight: 1.55,
                }}
              >
                {PCR_TIER3_DISCLOSURE}
              </div>
            </div>
          ) : null}

          {isUpdate && newlyRequestedCapabilities.length > 0 ? (
            <>
              <div
                data-field="new-caps-heading"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--warn)",
                  marginBottom: 9,
                }}
              >
                {PCR_NEW_CAPS_HEADING}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                  marginBottom: 20,
                }}
                data-field="new-capabilities-list"
              >
                {newlyRequestedCapabilities.map((c) => (
                  <CapabilityRow
                    key={c.wireKey}
                    {...c}
                    emphasised
                  />
                ))}
              </div>
              <div
                data-field="granted-caps-heading"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 9,
                }}
              >
                {PCR_GRANTED_HEADING}
              </div>
            </>
          ) : null}

          <div
            data-field="capabilities-list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 9,
            }}
          >
            {capabilities.map((c) => (
              <CapabilityRow key={c.wireKey} {...c} />
            ))}
          </div>

          <div
            data-field="scroll-hint"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
              marginTop: 18,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: hintColor,
            }}
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{
                opacity: scrolledEnd ? 0 : 1,
                transition: "opacity .2s ease",
              }}
            >
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
            {hint}
          </div>
        </div>

        <footer
          style={{
            flex: "none",
            borderTop: "1px solid var(--line)",
            padding: "15px 24px",
          }}
        >
          {isTier3 ? (
            <label
              data-field="tier3-ack"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                marginBottom: 13,
                cursor: "pointer",
              }}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={acked}
                onClick={() => setAcked((v) => !v)}
                data-field="ack-checkbox"
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
                  borderColor: acked
                    ? "var(--accent)"
                    : "var(--line-2)",
                  background: acked
                    ? "var(--accent)"
                    : "var(--bg-2)",
                  cursor: "pointer",
                }}
              >
                {acked ? (
                  <svg
                    width={13}
                    height={13}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent-ink)"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
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
                }}
              >
                {PCR_TIER3_ACK_LABEL}
              </span>
            </label>
          ) : null}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <span
              data-field="gate-note"
              style={{
                marginRight: "auto",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              {gateNote}
            </span>
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
              {PCR_CANCEL_CTA}
            </button>
            <button
              type="button"
              disabled={!gateOk}
              onClick={() => {
                if (gateOk) onInstall();
              }}
              data-action="install"
              data-gate-open={gateOk}
              style={
                gateOk
                  ? {
                      padding: "11px 22px",
                      borderRadius: "var(--r-md)",
                      background: "var(--accent)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--accent)",
                      color: "var(--accent-ink)",
                      fontFamily: "var(--font-ui)",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                    }
                  : {
                      padding: "11px 22px",
                      borderRadius: "var(--r-md)",
                      background: "var(--bg-3)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--line)",
                      color: "var(--ink-mute)",
                      fontFamily: "var(--font-ui)",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "not-allowed",
                    }
              }
            >
              {installLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Re-export the badge constant for stories.
export { PCR_NEW_BADGE };
