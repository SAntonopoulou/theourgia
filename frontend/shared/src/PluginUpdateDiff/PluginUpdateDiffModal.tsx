/**
 * PluginUpdateDiffModal — H09 Cluster B surface 17 · FINAL.
 *
 * Honesty rules wired:
 *
 *   * Changelog rendered as ReactNode the consumer provides
 *     (the surface treats it as already-safe).
 *   * NEW capabilities rendered in `--warn-soft` CapabilityRow.
 *   * REMOVED capabilities rendered in `--peer-ok-soft` rows
 *     (this is GOOD — surface-area reduction).
 *   * Migration steps listed verbatim with alembic id + label.
 *   * Apply CTA — `--accent` when no new caps; `--warn-soft`
 *     ("Review & apply") when new caps exist. Tapping the
 *     latter re-opens the Capability Review modal gated on
 *     the new caps only.
 */

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

import { useFocusTrap } from "../hooks/useFocusTrap.js";
import {
  CapabilityRow,
  type CapabilityRowData,
} from "../PluginDetail/CapabilityRow.js";
import {
  PUD_APPLY_CTA,
  PUD_APPLY_REVIEW_CTA,
  PUD_CANCEL_CTA,
  PUD_FOOTNOTE_NEW_CAPS,
  PUD_FOOTNOTE_NO_NEW,
  PUD_HEADING_CHANGELOG,
  PUD_HEADING_MIGRATIONS,
  PUD_HEADING_NEW_CAPS,
  PUD_HEADING_REMOVED_CAPS,
  PUD_TITLE_ARROW,
  PUD_TITLE_PREFIX,
} from "./copy.js";

export interface PluginUpdateMigrationStep {
  id: string;
  label: string;
}

export interface PluginUpdateDiffModalProps {
  pluginName: string;
  fromVersion: string;
  toVersion: string;
  /** Markdown body — rendered as ReactNode the consumer provides. */
  changelog: ReactNode;
  newCapabilities: readonly CapabilityRowData[];
  removedCapabilities: readonly CapabilityRowData[];
  migrationSteps: readonly PluginUpdateMigrationStep[];
  onCancel: () => void;
  onApply: () => void;
  className?: string;
  style?: CSSProperties;
}

export function PluginUpdateDiffModal({
  pluginName,
  fromVersion,
  toVersion,
  changelog,
  newCapabilities,
  removedCapabilities,
  migrationSteps,
  onCancel,
  onApply,
  className,
  style,
}: PluginUpdateDiffModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(panelRef, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const isNewCaps = newCapabilities.length > 0;
  const applyLabel = isNewCaps ? PUD_APPLY_REVIEW_CTA : PUD_APPLY_CTA;
  const footnote = isNewCaps ? PUD_FOOTNOTE_NEW_CAPS : PUD_FOOTNOTE_NO_NEW;
  const applyChrome: CSSProperties = isNewCaps
    ? {
        background: "var(--warn-soft)",
        borderColor: "var(--warn-border)",
        color: "var(--warn)",
      }
    : {
        background: "var(--accent)",
        borderColor: "var(--accent)",
        color: "var(--accent-ink)",
      };

  return (
    <div
      data-surface="plugin-update-diff"
      data-has-new-caps={isNewCaps}
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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plugin-update-diff-title"
        className={className}
        data-modal="plugin-update-diff"
        style={{
          width: 600,
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
            id="plugin-update-diff-title"
            data-field="title"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              margin: 0,
              color: "var(--ink)",
            }}
          >
            {PUD_TITLE_PREFIX}
            {pluginName} {fromVersion}
            {PUD_TITLE_ARROW}
            {toVersion}
          </h2>
        </header>

        <div
          className="scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "18px 24px",
          }}
        >
          <div style={kicker()}>{PUD_HEADING_CHANGELOG}</div>
          <div
            data-field="changelog"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              lineHeight: 1.65,
              color: "var(--ink-soft)",
              marginBottom: 22,
            }}
          >
            {changelog}
          </div>

          {newCapabilities.length > 0 ? (
            <>
              <div
                data-field="new-caps-heading"
                style={{
                  ...kicker(),
                  color: "var(--warn)",
                }}
              >
                {PUD_HEADING_NEW_CAPS}
              </div>
              <div
                data-field="new-capabilities"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                  marginBottom: 22,
                }}
              >
                {newCapabilities.map((c) => (
                  <CapabilityRow key={c.wireKey} {...c} emphasised />
                ))}
              </div>
            </>
          ) : null}

          {removedCapabilities.length > 0 ? (
            <>
              <div
                data-field="removed-caps-heading"
                style={{
                  ...kicker(),
                  color: "var(--peer-ok)",
                }}
              >
                {PUD_HEADING_REMOVED_CAPS}
              </div>
              <div
                data-field="removed-capabilities"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                  marginBottom: 22,
                }}
              >
                {removedCapabilities.map((c) => (
                  <div
                    key={c.wireKey}
                    data-capability-key={c.wireKey}
                    data-removed
                    style={{
                      padding: "13px 15px",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--peer-ok)",
                      borderRadius: "var(--r-md)",
                      background: "var(--peer-ok-soft)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                        marginBottom: 4,
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
                          color: "var(--peer-ok)",
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
                        color: "var(--ink-mute)",
                        lineHeight: 1.5,
                      }}
                    >
                      {c.consequence}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div style={kicker()}>{PUD_HEADING_MIGRATIONS}</div>
          <div
            data-field="migrations"
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              overflow: "hidden",
            }}
          >
            {migrationSteps.map((m, i) => (
              <div
                key={m.id}
                data-migration-id={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 15px",
                  borderBottomWidth:
                    i < migrationSteps.length - 1 ? 1 : 0,
                  borderBottomStyle: "solid",
                  borderBottomColor: "var(--line)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-soft)",
                  }}
                >
                  {m.id}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 13.5,
                    color: "var(--ink-soft)",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <footer
          style={{
            flex: "none",
            borderTop: "1px solid var(--line)",
            padding: "15px 24px",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <span
            data-field="footnote"
            style={{
              marginRight: "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: isNewCaps ? "var(--warn)" : "var(--ink-mute)",
            }}
          >
            {footnote}
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
            {PUD_CANCEL_CTA}
          </button>
          <button
            type="button"
            onClick={onApply}
            data-action="apply"
            style={{
              padding: "11px 20px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              ...applyChrome,
            }}
          >
            {applyLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

function kicker(): CSSProperties {
  return {
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--ink-mute)",
    marginBottom: 9,
  };
}
