/**
 * NewToolModal — H07 §S3 Cluster A surface 1.
 *
 * Closes the B108-2e Tool Registry follow-up: the H05 surface
 * emitted only `onNew(view)` (intent); this modal authors the
 * fields and emits a structured payload mapping 1:1 to the backend
 * `CreateToolInput` from B106.
 *
 * Honesty rules (H07):
 *   • Consecration is NOT a field here — set via the
 *     `/tools/{id}/consecrate` sub-resource only, which requires a
 *     real working entry. Footer microcopy makes this explicit.
 *   • Photos are NOT uploaded from this modal — a separate
 *     affordance on the Tool detail view keeps create and upload
 *     concerns isolated.
 *   • Empty optionals submit as `null`, not empty string (the
 *     backend treats them identically; the surface stays honest).
 *   • Save disabled until Name + Kind are both filled. The "Other"
 *     kind reveals a free-text label input.
 */

import {
  type CSSProperties,
  type KeyboardEvent,
  useMemo,
  useState,
} from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";
import { ToolKindIcon } from "../ToolRegistry/ToolKindIcon.js";

import {
  NT_ACQUIRED_LABEL,
  NT_CONSECRATION_NOTE,
  NT_DIMENSIONS_LABEL,
  NT_DIM_HEIGHT,
  NT_DIM_LENGTH,
  NT_DIM_WEIGHT,
  NT_DIM_WIDTH,
  NT_KIND_LABEL,
  NT_KIND_LABELS,
  NT_LOCATION_LABEL,
  NT_LOCATION_PLACEHOLDER,
  NT_MATERIALS_LABEL,
  NT_MATERIALS_PLACEHOLDER,
  NT_NAME_LABEL,
  NT_OTHER_PLACEHOLDER,
  NT_PROVENANCE_LABEL,
  NT_PROVENANCE_PLACEHOLDER,
  NT_SAVE_LABEL,
  NT_TITLE,
  WM_CANCEL_LABEL,
} from "./copy.js";

// Mirror the backend's ToolKindWire union (from B106). Listed in the
// H07 designer order (14 kinds; "Other" reveals a free-text label).
export type NewToolKind =
  | "athame"
  | "wand"
  | "chalice"
  | "pentacle"
  | "censer"
  | "bell"
  | "sword"
  | "lamp"
  | "mirror"
  | "bowl"
  | "statue"
  | "robe"
  | "cingulum"
  | "other";

export interface NewToolModalPayload {
  name: string;
  kind: NewToolKind;
  /** Set only when `kind === "other"`. Free-text label the
   *  practitioner chose. Routes append this to `name` server-side
   *  or carry it as a separate field, per backend convention. */
  otherLabel: string | null;
  materials: string[];
  dimensions: {
    length_cm: number | null;
    width_cm: number | null;
    height_cm: number | null;
    weight_g: number | null;
  };
  provenance: string | null;
  acquisition_date: string | null;
  current_location: string | null;
}

export interface NewToolModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (payload: NewToolModalPayload) => void | Promise<void>;
}

const SCRIM: CSSProperties = {
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

const PANEL: CSSProperties = {
  position: "relative",
  width: "min(520px, 100%)",
  maxHeight: "90vh",
  overflowY: "auto",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg)",
  boxShadow: "0 24px 60px rgba(0,0,0,.5)",
  padding: "24px 26px 0",
};

const HEADING: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  margin: "0 0 18px",
};

const LABEL: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 8,
};

const INPUT_BASE: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 15,
};

const KIND_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
};

const FOOTER: CSSProperties = {
  position: "sticky",
  bottom: 0,
  margin: "16px -26px 0",
  padding: "16px 24px 24px",
  borderTopWidth: 1,
  borderTopStyle: "solid",
  borderTopColor: "var(--line)",
  background: "var(--bg)",
};

// ── Component ──────────────────────────────────────────────────────

export function NewToolModal({ open, onClose, onSave }: NewToolModalProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<NewToolKind | null>(null);
  const [otherLabel, setOtherLabel] = useState("");
  const [materials, setMaterials] = useState<string[]>([]);
  const [materialInput, setMaterialInput] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightG, setWeightG] = useState("");
  const [provenance, setProvenance] = useState("");
  const [acquired, setAcquired] = useState("");
  const [location, setLocation] = useState("");

  // Escape closes the modal (b108-2fy a11y sweep).
  useEscapeToClose(open, onClose);

  const saveDisabled = useMemo(
    () => name.trim() === "" || kind === null,
    [name, kind],
  );

  if (!open) return null;

  function parseNum(v: string): number | null {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function nullIfEmpty(v: string): string | null {
    return v.trim() === "" ? null : v;
  }

  function commitMaterialInput(): void {
    const v = materialInput.trim();
    if (v === "") return;
    if (!materials.includes(v)) setMaterials((arr) => [...arr, v]);
    setMaterialInput("");
  }

  function handleMaterialKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") {
      e.preventDefault();
      commitMaterialInput();
    }
  }

  function removeMaterial(v: string): void {
    setMaterials((arr) => arr.filter((m) => m !== v));
  }

  function handleSave(): void {
    if (saveDisabled || kind === null) return;
    onSave?.({
      name: name.trim(),
      kind,
      otherLabel: kind === "other" ? nullIfEmpty(otherLabel) : null,
      materials,
      dimensions: {
        length_cm: parseNum(lengthCm),
        width_cm: parseNum(widthCm),
        height_cm: parseNum(heightCm),
        weight_g: parseNum(weightG),
      },
      provenance: nullIfEmpty(provenance),
      acquisition_date: nullIfEmpty(acquired),
      current_location: nullIfEmpty(location),
    });
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={NT_TITLE}
      data-component="new-tool-modal"
      style={SCRIM}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div style={PANEL}>
        <h2 style={HEADING}>{NT_TITLE}</h2>

        {/* Name */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="nt-name" style={LABEL}>
            {NT_NAME_LABEL}
          </label>
          <input
            id="nt-name"
            type="text"
            value={name}
            maxLength={240}
            onChange={(e) => setName(e.target.value)}
            data-nt-name
            style={INPUT_BASE}
          />
        </div>

        {/* Kind grid */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL}>{NT_KIND_LABEL}</label>
          <div role="group" aria-label="Tool kind" style={KIND_GRID}>
            {NT_KIND_LABELS.map(([k, label]) => {
              const on = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  data-kind={k}
                  onClick={() => setKind(k as NewToolKind)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "11px 6px",
                    borderRadius: "var(--r-md)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: on ? "var(--accent)" : "var(--line)",
                    background: on ? "var(--accent-soft)" : "var(--bg-2)",
                    color: on ? "var(--ink)" : "var(--ink-soft)",
                    cursor: "pointer",
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    minHeight: 64,
                  }}
                >
                  <ToolKindIcon
                    kind={k as NewToolKind}
                    size={20}
                    color={on ? "var(--accent)" : "var(--ink-soft)"}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          {kind === "other" ? (
            <input
              type="text"
              value={otherLabel}
              onChange={(e) => setOtherLabel(e.target.value)}
              placeholder={NT_OTHER_PLACEHOLDER}
              aria-label={NT_OTHER_PLACEHOLDER}
              data-nt-other
              style={{ ...INPUT_BASE, marginTop: 8, fontSize: 14 }}
            />
          ) : null}
        </div>

        {/* Materials */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL}>{NT_MATERIALS_LABEL}</label>
          <div
            data-nt-materials
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
              padding: "8px 10px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
            }}
          >
            {materials.map((m) => (
              <span
                key={m}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: "var(--accent-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink)",
                }}
              >
                {m}
                <button
                  type="button"
                  aria-label={`Remove ${m}`}
                  onClick={() => removeMaterial(m)}
                  style={{
                    display: "flex",
                    border: "none",
                    background: "transparent",
                    color: "var(--ink-mute)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <svg
                    width={11}
                    height={11}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </span>
            ))}
            <input
              type="text"
              value={materialInput}
              onChange={(e) => setMaterialInput(e.target.value)}
              onKeyDown={handleMaterialKeyDown}
              onBlur={commitMaterialInput}
              placeholder={NT_MATERIALS_PLACEHOLDER}
              aria-label={NT_MATERIALS_PLACEHOLDER}
              data-nt-material-input
              style={{
                flex: 1,
                minWidth: 120,
                border: "none",
                background: "transparent",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                padding: 4,
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Dimensions */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL}>{NT_DIMENSIONS_LABEL}</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
            }}
          >
            {(
              [
                [NT_DIM_LENGTH, lengthCm, setLengthCm, "length"],
                [NT_DIM_WIDTH, widthCm, setWidthCm, "width"],
                [NT_DIM_HEIGHT, heightCm, setHeightCm, "height"],
                [NT_DIM_WEIGHT, weightG, setWeightG, "weight"],
              ] as const
            ).map(([dimLabel, value, setter, key]) => (
              <div key={key}>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10.5,
                    color: "var(--ink-mute)",
                    marginBottom: 4,
                  }}
                >
                  {dimLabel}
                </div>
                <input
                  type="number"
                  min={0}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder="0"
                  aria-label={dimLabel}
                  data-nt-dim={key}
                  style={{
                    ...INPUT_BASE,
                    padding: "9px 10px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Provenance */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="nt-provenance" style={LABEL}>
            {NT_PROVENANCE_LABEL}
          </label>
          <textarea
            id="nt-provenance"
            rows={2}
            maxLength={1000}
            value={provenance}
            onChange={(e) => setProvenance(e.target.value)}
            placeholder={NT_PROVENANCE_PLACEHOLDER}
            data-nt-provenance
            style={{
              ...INPUT_BASE,
              fontSize: 14.5,
              lineHeight: 1.5,
              resize: "vertical",
            }}
          />
        </div>

        {/* Acquisition date + Current location */}
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div style={{ flex: "0 0 160px" }}>
            <label htmlFor="nt-acquired" style={LABEL}>
              {NT_ACQUIRED_LABEL}
            </label>
            <input
              id="nt-acquired"
              type="date"
              value={acquired}
              onChange={(e) => setAcquired(e.target.value)}
              data-nt-acquired
              style={{
                ...INPUT_BASE,
                padding: "9px 12px",
                color: "var(--ink-soft)",
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
              }}
            />
          </div>
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <label htmlFor="nt-location" style={LABEL}>
              {NT_LOCATION_LABEL}
            </label>
            <input
              id="nt-location"
              type="text"
              maxLength={480}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={NT_LOCATION_PLACEHOLDER}
              data-nt-location
              style={{
                ...INPUT_BASE,
                padding: "9px 12px",
                fontSize: 14.5,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={FOOTER}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 14,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              lineHeight: 1.45,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-glyph)",
                color: "var(--accent)",
                flex: "none",
              }}
            >
              ‡
            </span>
            {NT_CONSECRATION_NOTE}
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
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
              {WM_CANCEL_LABEL}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveDisabled}
              aria-disabled={saveDisabled}
              data-action="save"
              style={{
                padding: "11px 20px",
                borderRadius: "var(--r-md)",
                background: saveDisabled
                  ? "var(--bg-3)"
                  : "var(--accent)",
                color: saveDisabled
                  ? "var(--ink-mute)"
                  : "var(--accent-ink)",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                cursor: saveDisabled ? "not-allowed" : "pointer",
                opacity: saveDisabled ? 0.7 : 1,
              }}
            >
              {NT_SAVE_LABEL}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
