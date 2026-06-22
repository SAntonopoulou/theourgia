/**
 * ToolDetailDrawer — right-side drawer (560px) with 7 sections.
 *
 * Sticky header with name + kind + close. Body:
 *   1. Photos
 *   2. Identity (description)
 *   3. Materials & dimensions (chip list + mono dims)
 *   4. Provenance
 *   5. Consecration — Consecrated card (--care palette) OR
 *      "Not yet" card with Link CTA + the verbatim honesty note
 *      ("Status follows the record …")
 *   6. Use history — eyebrow + "read-only" pill + entry rows
 *   7. Current location — text input
 *
 * No --danger anywhere; consecrated state uses --care*.
 */

import { type CSSProperties } from "react";

import {
  TR_CONSECRATED_ON_PREFIX,
  TR_CONSECRATION_EYEBROW,
  TR_CONSECRATION_HONESTY_NOTE,
  TR_CURRENT_LOCATION_EYEBROW,
  TR_IDENTITY_EYEBROW,
  TR_LINK_CONSECRATION_CTA,
  TR_MATERIALS_EYEBROW,
  TR_NOT_YET_BODY,
  TR_PROVENANCE_EYEBROW,
  TR_USE_HISTORY_EYEBROW,
  TR_USE_HISTORY_READONLY_PILL,
  toolKindLabel,
  type ToolRecord,
} from "./copy.js";
import { ToolKindIcon } from "./ToolKindIcon.js";

const SCRIM_WRAP: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  display: "flex",
  justifyContent: "flex-end",
};

const SCRIM_BG: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.5)",
};

const PANEL_STYLE: CSSProperties = {
  position: "relative",
  width: "min(560px, 100%)",
  height: "100%",
  overflowY: "auto",
  background: "var(--bg)",
  borderLeftWidth: 1,
  borderLeftStyle: "solid",
  borderLeftColor: "var(--line-2)",
  boxShadow: "-2px 0 30px rgba(0,0,0,.4)",
};

const HEADER_STYLE: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "16px 22px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.13em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 8,
};

export interface ToolDetailDrawerProps {
  open: boolean;
  tool: ToolRecord | null;
  onClose: () => void;
  onLinkConsecration?: (toolId: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function ToolDetailDrawer({
  open,
  tool,
  onClose,
  onLinkConsecration,
  className,
  style,
}: ToolDetailDrawerProps) {
  if (!open || !tool) return null;
  const consecrated = !!tool.consDate;
  const consBg = consecrated ? "var(--care-soft)" : "var(--bg-2)";
  const consBorder = consecrated ? "var(--care-line)" : "var(--line)";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tool detail"
      data-component="tool-detail-drawer"
      data-tool-id={tool.id}
      data-consecrated={consecrated}
      className={className}
      style={{ ...SCRIM_WRAP, ...style }}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div className="scroll" style={PANEL_STYLE}>
        <div style={HEADER_STYLE}>
          <div>
            <div
              data-tool-name
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                lineHeight: 1.1,
              }}
            >
              {tool.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              {toolKindLabel(tool.kind)}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            data-action="close"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              color: "var(--ink-mute)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <svg
              width={17}
              height={17}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: 22 }}>
          {/* Photos */}
          <div
            data-section="photos"
            style={{ display: "flex", gap: 10, marginBottom: 22 }}
          >
            <div
              style={{
                flex: 2,
                aspectRatio: "4 / 3",
                borderRadius: "var(--r-md)",
                background: `radial-gradient(ellipse at 50% 40%, ${tool.tint}, var(--bg-sunk))`,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              <ToolKindIcon kind={tool.kind} size={80} />
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  flex: 1,
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                }}
              />
              <button
                type="button"
                data-action="add-photo"
                aria-label="Add photo"
                style={{
                  flex: 1,
                  borderRadius: "var(--r-md)",
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: "var(--line-2)",
                  color: "var(--ink-mute)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Identity */}
          <div data-section="identity" style={{ marginBottom: 20 }}>
            <div style={EYEBROW}>{TR_IDENTITY_EYEBROW}</div>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                lineHeight: 1.55,
                color: "var(--ink-soft)",
                margin: 0,
              }}
            >
              {tool.desc}
            </p>
          </div>

          {/* Materials + dimensions */}
          <div data-section="materials" style={{ marginBottom: 20 }}>
            <div style={EYEBROW}>{TR_MATERIALS_EYEBROW}</div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 10,
              }}
            >
              {tool.materials.map((m) => (
                <span
                  key={m}
                  data-material={m}
                  style={{
                    padding: "4px 11px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line-2)",
                    borderRadius: "var(--r-pill, 20px)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: "var(--ink-soft)",
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
              }}
            >
              {tool.dims}
            </div>
          </div>

          {/* Provenance */}
          <div data-section="provenance" style={{ marginBottom: 20 }}>
            <div style={EYEBROW}>{TR_PROVENANCE_EYEBROW}</div>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14.5,
                lineHeight: 1.55,
                color: "var(--ink-soft)",
                margin: 0,
              }}
            >
              {tool.prov}
            </p>
          </div>

          {/* Consecration */}
          <div
            data-section="consecration"
            style={{
              marginBottom: 20,
              padding: "15px 16px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: consBorder,
              borderRadius: "var(--r-md)",
              background: consBg,
            }}
          >
            <div style={EYEBROW}>{TR_CONSECRATION_EYEBROW}</div>
            {consecrated ? (
              <>
                <div
                  data-consecrated-line
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 15,
                    color: "var(--ink)",
                    marginBottom: 6,
                  }}
                >
                  {TR_CONSECRATED_ON_PREFIX}
                  {tool.consDate}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--accent)",
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
                  >
                    <path d="M12 6c-2-1.3-4.6-1.5-7-.9v12.4c2.4-.6 5-.4 7 .9 2-1.3 4.6-1.5 7-.9V5.1c-2.4-.6-5-.4-7 .9z" />
                  </svg>
                  {tool.consWorking}
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14.5,
                    color: "var(--ink-soft)",
                    marginBottom: 10,
                  }}
                >
                  {TR_NOT_YET_BODY}
                </div>
                <button
                  type="button"
                  data-action="link-consecration"
                  onClick={() => onLinkConsecration?.(tool.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 14px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line-2)",
                    borderRadius: "var(--r-md)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--ink-soft)",
                    background: "transparent",
                    cursor: "pointer",
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
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {TR_LINK_CONSECRATION_CTA}
                </button>
                <p
                  data-honesty-note
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                    lineHeight: 1.4,
                    margin: "9px 0 0",
                  }}
                >
                  {TR_CONSECRATION_HONESTY_NOTE}
                </p>
              </>
            )}
          </div>

          {/* Use history */}
          <div data-section="use-history" style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <span style={{ ...EYEBROW, marginBottom: 0 }}>
                {TR_USE_HISTORY_EYEBROW}
              </span>
              <span
                data-readonly-pill
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  color: "var(--ink-mute)",
                  padding: "1px 7px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-pill, 20px)",
                }}
              >
                {TR_USE_HISTORY_READONLY_PILL}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {tool.history.length === 0 ? (
                <p
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-mute)",
                    margin: 0,
                  }}
                >
                  No workings have referenced this tool yet.
                </p>
              ) : (
                tool.history.map((h, i) => (
                  <div
                    key={i}
                    data-history-row={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 2px",
                      borderBottomWidth: 1,
                      borderBottomStyle: "solid",
                      borderBottomColor: "var(--line)",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontFamily: "var(--font-display)",
                          fontSize: 15,
                          color: "var(--ink)",
                        }}
                      >
                        {h.title}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontFamily: "var(--font-ui)",
                          fontSize: 11.5,
                          color: "var(--ink-mute)",
                        }}
                      >
                        {h.entity}
                      </span>
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11.5,
                        color: "var(--ink-mute)",
                      }}
                    >
                      {h.date}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Current location */}
          <div data-section="location">
            <div style={EYEBROW}>{TR_CURRENT_LOCATION_EYEBROW}</div>
            <input
              type="text"
              defaultValue={tool.location}
              data-location-input
              style={{
                width: "100%",
                padding: "10px 12px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontSize: 14,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
