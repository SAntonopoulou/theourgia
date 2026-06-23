/**
 * ChartPicker — modal opened from the ChartNode NodeView.
 *
 * Collects the parameters of a chart (kind · datetime · latitude ·
 * longitude · system) and asks the surrounding surface to compute
 * the snapshot via `useEditorData().fetchChart`. On success, the
 * picker hands the resulting snapshot to its `onPick` callback so the
 * NodeView writes it into the chart node's `snapshot` attr.
 *
 * If `fetchChart` is not provided by the parent surface, the modal
 * renders an explanatory note and disables the "Compute" CTA — the
 * editor still mounts, the form is visible, but no API call is made.
 */

import { type CSSProperties, useEffect, useState } from "react";

import { useEditorData, type ChartFetchRequest } from "./EditorContext.js";
import type { ChartSnapshot } from "./nodes/ChartNode.js";

const SCRIM_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const SCRIM_BG: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.55)",
};

const PANEL_STYLE: CSSProperties = {
  position: "relative",
  width: "min(520px, 100%)",
  maxHeight: "min(640px, 90vh)",
  display: "flex",
  flexDirection: "column",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg)",
  boxShadow: "0 24px 60px rgba(0,0,0,.5)",
};

export interface ChartPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (snapshot: ChartSnapshot, request: ChartFetchRequest) => void;
}

const KIND_OPTIONS: ChartFetchRequest["kind"][] = ["natal", "horary", "election"];
const SYSTEM_OPTIONS: ChartFetchRequest["system"][] = ["placidus", "whole-sign", "equal"];

function defaultRequest(): ChartFetchRequest {
  // Default to noon today in London — a sensible neutral starting point.
  const now = new Date();
  const noon = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
  );
  return {
    kind: "natal",
    datetime: noon.toISOString(),
    latitude: 51.5074,
    longitude: -0.1278,
    system: "placidus",
  };
}

export function ChartPicker({ open, onClose, onPick }: ChartPickerProps) {
  const ctx = useEditorData();
  const [req, setReq] = useState<ChartFetchRequest>(defaultRequest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  if (!open) return null;

  const liveAvailable = typeof ctx.fetchChart === "function";

  const handleCompute = async () => {
    if (ctx.fetchChart === undefined) return;
    setBusy(true);
    setError(null);
    try {
      const snapshot = await ctx.fetchChart(req);
      onPick(snapshot, req);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to compute chart");
    } finally {
      setBusy(false);
    }
  };

  const fieldStyle: CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--line)",
    borderRadius: "var(--r-sm)",
    background: "var(--bg-2)",
    color: "var(--ink)",
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    outline: "none",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontFamily: "var(--font-ui)",
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--ink-mute)",
    marginBottom: 4,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compose chart"
      data-component="editor-chart-picker"
      style={SCRIM_STYLE}
    >
      <div onClick={busy ? undefined : onClose} style={SCRIM_BG} aria-hidden="true" />
      <div style={PANEL_STYLE}>
        <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid var(--line)" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 21, margin: "0 0 4px" }}>
            Compose chart
          </h2>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              margin: 0,
            }}
          >
            The chart engine computes positions from the parameters; the snapshot is stored on the entry so it remains a faithful historical record.
          </p>
        </div>
        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, overflowY: "auto" }}>
          <div style={{ gridColumn: "1 / span 2" }}>
            <label style={labelStyle}>Kind</label>
            <div style={{ display: "flex", gap: 6 }}>
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setReq((r) => ({ ...r, kind: k }))}
                  aria-pressed={req.kind === k ? "true" : "false"}
                  style={{
                    padding: "6px 12px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: req.kind === k ? "var(--accent)" : "var(--line)",
                    borderRadius: "var(--r-pill)",
                    background: req.kind === k ? "var(--accent-soft)" : "transparent",
                    color: req.kind === k ? "var(--ink)" : "var(--ink-soft)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: "1 / span 2" }}>
            <label style={labelStyle}>Date and time (UTC)</label>
            <input
              type="datetime-local"
              value={req.datetime.slice(0, 16)}
              onChange={(e) =>
                setReq((r) => ({ ...r, datetime: new Date(e.target.value).toISOString() }))
              }
              style={fieldStyle}
              aria-label="Chart date and time"
            />
          </div>
          <div>
            <label style={labelStyle}>Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={req.latitude}
              onChange={(e) => setReq((r) => ({ ...r, latitude: Number(e.target.value) }))}
              style={fieldStyle}
              aria-label="Latitude"
            />
          </div>
          <div>
            <label style={labelStyle}>Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={req.longitude}
              onChange={(e) => setReq((r) => ({ ...r, longitude: Number(e.target.value) }))}
              style={fieldStyle}
              aria-label="Longitude"
            />
          </div>
          <div style={{ gridColumn: "1 / span 2" }}>
            <label style={labelStyle}>House system</label>
            <div style={{ display: "flex", gap: 6 }}>
              {SYSTEM_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReq((r) => ({ ...r, system: s }))}
                  aria-pressed={req.system === s ? "true" : "false"}
                  style={{
                    padding: "6px 12px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: req.system === s ? "var(--accent)" : "var(--line)",
                    borderRadius: "var(--r-pill)",
                    background: req.system === s ? "var(--accent-soft)" : "transparent",
                    color: req.system === s ? "var(--ink)" : "var(--ink-soft)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "12px 24px 20px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          {liveAvailable ? null : (
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--warn)",
                flex: 1,
              }}
            >
              Chart engine not wired in this surface — parameters can be entered but the snapshot can't be computed yet.
            </span>
          )}
          {error && (
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--warn)",
                flex: 1,
              }}
            >
              {error}
            </span>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              style={{
                padding: "8px 14px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "transparent",
                color: "var(--ink-soft)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCompute}
              disabled={!liveAvailable || busy}
              style={{
                padding: "8px 14px",
                border: "none",
                borderRadius: "var(--r-md)",
                background: !liveAvailable || busy ? "var(--bg-3)" : "var(--accent)",
                color: !liveAvailable || busy ? "var(--ink-mute)" : "var(--accent-ink)",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 13,
                cursor: !liveAvailable || busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Computing…" : "Compute chart"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
