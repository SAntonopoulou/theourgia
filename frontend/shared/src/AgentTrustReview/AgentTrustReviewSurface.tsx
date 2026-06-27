/**
 * AgentTrustReview — H10 Cluster C12 surface.
 *
 * Renew + per-capability revoke + uninstall (memory preserved by
 * default; explicit "also delete memory" checkbox per rule 59).
 *
 * The "Capabilities changed since you installed it" banner appears
 * only when the parent passes a non-empty `addedSinceInstall` list.
 */

import { useState, type CSSProperties } from "react";

import {
  BUTTONS,
  type CurrentCapabilityRow,
  DELETE_MEMORY_LABEL_HINT,
  DELETE_MEMORY_LABEL_MAIN,
  HEADERS,
  RENEW_TILE,
  SUBTITLES,
  diffNoticeLine,
} from "./copy.js";

export interface AddedSinceInstall {
  label: string;
  wireKey: string;
}

export interface AgentTrustReviewSurfaceProps {
  capabilities: readonly CurrentCapabilityRow[];
  /** When non-empty, the warn-soft banner appears at the top. */
  addedSinceInstall?: readonly AddedSinceInstall[];
  onRenew?: () => void;
  onUninstall?: (payload: { alsoDeleteMemory: boolean }) => void;
  onToggleCapability?: (id: string, on: boolean) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "26px 24px 40px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      style={{
        position: "relative",
        width: 38,
        height: 22,
        borderRadius: 12,
        background: on ? "var(--accent)" : "var(--bg-3)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: on ? "var(--accent)" : "var(--line-2)",
        flex: "none",
        transition: "background .18s ease",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: on ? "var(--accent-ink)" : "var(--ink-mute)",
          transition: "left .18s ease",
        }}
      />
    </button>
  );
}

export function AgentTrustReviewSurface({
  capabilities,
  addedSinceInstall = [],
  onRenew,
  onUninstall,
  onToggleCapability,
  className,
  style,
}: AgentTrustReviewSurfaceProps) {
  const [offMap, setOffMap] = useState<Record<string, boolean>>({});
  const [alsoDeleteMemory, setAlsoDeleteMemory] = useState(false);

  const showDiffBanner = addedSinceInstall.length > 0;
  const newKeys = new Set(addedSinceInstall.map((a) => a.wireKey));

  const toggle = (id: string) => {
    const nextOff = !offMap[id];
    setOffMap((m) => ({ ...m, [id]: nextOff }));
    onToggleCapability?.(id, !nextOff);
  };

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      {showDiffBanner ? (
        <div
          role="alert"
          style={{
            padding: "15px 17px",
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
              marginBottom: 9,
            }}
          >
            <span style={{ display: "flex", color: "var(--warn)" }}>
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3l9 16H3z" />
                <path d="M12 9v4M12 16h.01" />
              </svg>
            </span>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                color: "var(--ink)",
              }}
            >
              {HEADERS.capabilitiesChanged}
            </div>
          </div>
          {addedSinceInstall.map((a) => (
            <div
              key={a.wireKey}
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13.5,
                color: "var(--ink-soft)",
                lineHeight: 1.5,
              }}
            >
              {diffNoticeLine(a.label, a.wireKey)}
            </div>
          ))}
        </div>
      ) : null}

      {/* Current capabilities with per-row revoke switch */}
      <section>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--ink)",
            marginBottom: 4,
          }}
        >
          {HEADERS.currentCapabilities}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
            marginBottom: 12,
          }}
        >
          {SUBTITLES.currentCapabilities}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {capabilities.map((c) => {
            const isNew = c.isNew ?? newKeys.has(c.wireKey);
            const on = !offMap[c.id];
            return (
              <div
                key={c.id}
                data-cap={c.id}
                data-cap-new={isNew}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: isNew ? "var(--warn-border)" : "var(--line)",
                  borderRadius: "var(--r-md)",
                  background: isNew ? "var(--warn-soft)" : "var(--bg-2)",
                }}
              >
                <Switch on={on} onToggle={() => toggle(c.id)} label={c.label} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 14,
                        color: "var(--ink)",
                      }}
                    >
                      {c.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: isNew ? "var(--warn)" : "var(--network)",
                        padding: "1px 7px",
                        borderRadius: "var(--r-sm)",
                        background: isNew
                          ? "rgba(0,0,0,.12)"
                          : "var(--network-soft)",
                      }}
                    >
                      {c.wireKey}
                    </span>
                    {isNew ? (
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 10,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--warn)",
                        }}
                      >
                        new
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Renew tile */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              color: "var(--ink)",
            }}
          >
            {RENEW_TILE.title}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginTop: 1,
            }}
          >
            {RENEW_TILE.hint}
          </div>
        </div>
        <button
          type="button"
          onClick={onRenew}
          style={{
            padding: "9px 17px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            flex: "none",
            cursor: "pointer",
          }}
        >
          {BUTTONS.renew}
        </button>
      </div>

      {/* Uninstall */}
      <section
        style={{
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopStyle: "solid",
          borderTopColor: "var(--line)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--ink)",
            marginBottom: 11,
          }}
        >
          {HEADERS.uninstall}
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            marginBottom: 14,
            cursor: "pointer",
          }}
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={alsoDeleteMemory}
            aria-label="Also delete this agent's memory"
            onClick={() => setAlsoDeleteMemory(!alsoDeleteMemory)}
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
              borderColor: alsoDeleteMemory
                ? "var(--accent)"
                : "var(--line-2)",
              background: alsoDeleteMemory
                ? "var(--accent)"
                : "var(--bg-2)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {alsoDeleteMemory ? (
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
            }}
          >
            {DELETE_MEMORY_LABEL_MAIN}{" "}
            <span style={{ color: "var(--ink-mute)" }}>
              {DELETE_MEMORY_LABEL_HINT}
            </span>
          </span>
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() =>
              onUninstall?.({ alsoDeleteMemory })
            }
            style={{
              padding: "11px 18px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              background: "var(--warn-soft)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13.5,
              color: "var(--warn)",
              cursor: "pointer",
            }}
          >
            {BUTTONS.uninstall}
          </button>
        </div>
      </section>
    </div>
  );
}
