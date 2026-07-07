/**
 * AddPlaceModal — H07 §S3 surface 20.
 *
 * Modal for adding a new site to the Pilgrimage Map.
 *
 * Honesty + H07 rules wired:
 *   • Default precision is "~1 km", NOT exact. The footnote says
 *     so verbatim: "The default is ~1 km, not exact."
 *   • Nominatim attribution uses the `‡` glyph in `--accent` and
 *     a quiet `--ink-mute` body: "Search is provided by Nominatim
 *     (OpenStreetMap). Your query is visible to them."
 *   • Site-kind colour swatches use --map-{sacred,ancestral,
 *     working,pilgrimage,other}. Never --danger.
 *   • Seal toggle defaults OFF. When ON, the description copy
 *     reads: "Encrypts the coordinates and story on this device
 *     only. The passphrase is never sent to the server."
 *   • Save disabled until Name is non-empty.
 *   • Cancel uses --line-2 + --ink-soft. Never --danger.
 *   • "I don't want exact location" option is a first-class
 *     button next to "Click the map" / "Enter coordinates" — it
 *     toggles the precision floor to country and clears
 *     coordinates.
 */

import {
  type CSSProperties,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";
import { useFocusOnOpen } from "../hooks/useFocusOnOpen.js";
import type { SiteKind } from "../PilgrimageMap/PilgrimageMapSurface.js";

// ── Types ──────────────────────────────────────────────────────────

export type AddPlacePrecision =
  | "exact"
  | "1km"
  | "10km"
  | "country"
  | "unmapped";

export interface AddPlaceDraft {
  name: string;
  kind: SiteKind;
  search_query?: string | null;
  precision: AddPlacePrecision;
  story: string;
  seal: boolean;
}

export interface AddPlaceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (draft: AddPlaceDraft) => void;
  initial?: Partial<AddPlaceDraft>;
}

// ── Constants ─────────────────────────────────────────────────────

const KIND_DEFS: { id: SiteKind; label: string }[] = [
  { id: "sacred", label: "Sacred site" },
  { id: "ancestral", label: "Ancestral" },
  { id: "working", label: "Place of working" },
  { id: "pilgrimage", label: "Pilgrimage" },
  { id: "other", label: "Other" },
];

const PRECISION_DEFS: { id: AddPlacePrecision; label: string }[] = [
  { id: "exact", label: "Exact" },
  { id: "1km", label: "~1 km" },
  { id: "10km", label: "~10 km" },
  { id: "country", label: "Country" },
  { id: "unmapped", label: "Unmapped" },
];

// ── Icons ─────────────────────────────────────────────────────────

function CloseIcon(): ReactElement {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function SearchIcon(): ReactElement {
  return (
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
      <circle cx={11} cy={11} r={7} />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const SCRIM: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "36px 20px",
  overflow: "auto",
  zIndex: 80,
};

const DIALOG: CSSProperties = {
  width: 640,
  maxWidth: "100%",
  maxHeight: "calc(100vh - 72px)",
  overflowY: "auto",
  background: "var(--bg)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-lg)",
  boxShadow: "0 28px 70px rgba(0,0,0,.55)",
};

const SECTION_LABEL: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 7,
};

// ── Surface ───────────────────────────────────────────────────────

export function AddPlaceModal({
  open,
  onClose,
  onSave,
  initial,
}: AddPlaceModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<SiteKind>(initial?.kind ?? "pilgrimage");
  const [searchQuery, setSearchQuery] = useState(initial?.search_query ?? "");
  // Default precision is "~1 km", NOT exact (H07 rule).
  const [precision, setPrecision] = useState<AddPlacePrecision>(
    initial?.precision ?? "1km",
  );
  const [story, setStory] = useState(initial?.story ?? "");
  const [seal, setSeal] = useState(initial?.seal ?? false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // Escape closes; focus moves to the place-search field on open (b108-2fy/2g1 a11y sweep).
  useEscapeToClose(open, onClose);
  useFocusOnOpen(firstInputRef, open);

  // Reset on close so a re-open never leaks the prior session.
  useEffect(() => {
    if (!open) {
      setName(initial?.name ?? "");
      setKind(initial?.kind ?? "pilgrimage");
      setSearchQuery(initial?.search_query ?? "");
      setPrecision(initial?.precision ?? "1km");
      setStory(initial?.story ?? "");
      setSeal(initial?.seal ?? false);
    }
  }, [open, initial]);

  const canSave = useMemo(() => name.trim().length > 0, [name]);

  if (!open) return null;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      kind,
      search_query: (searchQuery ?? "").trim() || null,
      precision,
      story,
      seal,
    });
  };

  return (
    <div
      data-component="add-place-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Add a place"
      style={SCRIM}
    >
      <div className="scroll" style={DIALOG}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "20px 24px 14px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              margin: 0,
            }}
          >
            Add a place
          </h2>
          <button
            type="button"
            data-add-place-cancel-icon
            aria-label="Cancel"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line)",
              color: "var(--ink-mute)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <CloseIcon />
          </button>
        </div>

        <div
          style={{
            padding: "18px 24px 4px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Name (required) */}
          <div>
            <label style={SECTION_LABEL} htmlFor="add-place-name">
              Name <span style={{ color: "var(--accent)" }}>· required</span>
            </label>
            <input
              id="add-place-name"
              data-add-place-name
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={240}
              style={{
                width: "100%",
                padding: "11px 13px",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontSize: 16,
              }}
            />
          </div>

          {/* Site kind */}
          <div>
            <div style={{ ...SECTION_LABEL, marginBottom: 9 }}>Site kind</div>
            <div
              role="radiogroup"
              aria-label="Site kind"
              style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
            >
              {KIND_DEFS.map((k) => {
                const on = k.id === kind;
                return (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-add-place-kind={k.id}
                    onClick={() => setKind(k.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "8px 13px",
                      borderRadius: 20,
                      border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                      background: on ? "var(--accent-soft)" : "var(--bg-2)",
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      color: on ? "var(--ink)" : "var(--ink-soft)",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: `var(--map-${k.id})`,
                      }}
                      aria-hidden="true"
                    />
                    {k.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <div style={{ ...SECTION_LABEL, marginBottom: 8 }}>Location</div>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <span
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--ink-mute)",
                }}
                aria-hidden="true"
              >
                <SearchIcon />
              </span>
              <input
                ref={firstInputRef}
                type="text"
                data-add-place-search
                placeholder="Search a place…"
                value={searchQuery ?? ""}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Place search (Nominatim)"
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 33px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13.5,
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                "Click the map",
                "Enter coordinates",
                "I don't want exact location",
              ].map((label) => (
                <button
                  key={label}
                  type="button"
                  data-add-place-loc-option={label}
                  onClick={
                    label === "I don't want exact location"
                      ? () => setPrecision("country")
                      : undefined
                  }
                  style={{
                    padding: "7px 12px",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-2)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: "var(--ink-soft)",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              data-add-place-nominatim-note
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 7,
                marginTop: 9,
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                lineHeight: 1.4,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-glyph)",
                  color: "var(--accent)",
                  flex: "none",
                }}
                aria-hidden="true"
              >
                ‡
              </span>
              Search is provided by Nominatim (OpenStreetMap). Your query is
              visible to them.
            </div>
          </div>

          {/* Precision */}
          <div>
            <div style={{ ...SECTION_LABEL, marginBottom: 9 }}>Precision</div>
            <div
              role="radiogroup"
              aria-label="Precision"
              style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
            >
              {PRECISION_DEFS.map((p) => {
                const on = p.id === precision;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-add-place-prec={p.id}
                    onClick={() => setPrecision(p.id)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "var(--r-md)",
                      border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                      background: on ? "var(--accent-soft)" : "var(--bg-2)",
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      color: on ? "var(--ink)" : "var(--ink-soft)",
                      cursor: "pointer",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div
              data-add-place-prec-note
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginTop: 9,
                lineHeight: 1.45,
              }}
            >
              Recorded precision affects how this place is shown to you AND in
              any exports. The default is ~1 km, not exact.
            </div>
          </div>

          {/* Story (optional) */}
          <div>
            <label style={SECTION_LABEL} htmlFor="add-place-story">
              Story{" "}
              <span
                style={{
                  textTransform: "none",
                  letterSpacing: 0,
                  color: "var(--ink-mute)",
                }}
              >
                · optional
              </span>
            </label>
            <textarea
              id="add-place-story"
              data-add-place-story
              rows={2}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="What happened here, or why it matters…"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontSize: 14.5,
                lineHeight: 1.5,
                resize: "vertical",
              }}
            />
          </div>

          {/* Seal toggle */}
          <label
            data-add-place-seal-toggle
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 11,
              padding: "13px 15px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 36,
                height: 20,
                borderRadius: 11,
                background: seal ? "var(--seal-soft)" : "var(--bg-3)",
                border: `1px solid ${
                  seal ? "var(--seal-border)" : "var(--line-2)"
                }`,
                position: "relative",
                flex: "none",
                marginTop: 1,
                transition: "background 0.18s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 1,
                  left: seal ? 17 : 1,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: seal ? "var(--seal)" : "var(--ink-mute)",
                  transition: "left 0.18s ease",
                }}
              />
            </span>
            <input
              type="checkbox"
              checked={seal}
              onChange={(e) => setSeal(e.target.checked)}
              style={{
                position: "absolute",
                opacity: 0,
                pointerEvents: "none",
              }}
              aria-label="Seal this site"
            />
            <span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13.5,
                  color: "var(--ink)",
                }}
              >
                Seal this site
              </span>
              <br />
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                }}
              >
                Encrypts the coordinates and story on this device only. The
                passphrase is never sent to the server.
              </span>
            </span>
          </label>
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--line)",
            marginTop: 14,
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            data-add-place-cancel
            onClick={onClose}
            style={{
              padding: "11px 18px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-add-place-save
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: "11px 20px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              border: "none",
              cursor: canSave ? "pointer" : "not-allowed",
              opacity: canSave ? 1 : 0.55,
            }}
          >
            Save place
          </button>
        </div>
      </div>
    </div>
  );
}
