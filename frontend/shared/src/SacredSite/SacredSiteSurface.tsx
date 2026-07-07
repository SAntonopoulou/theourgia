/**
 * SacredSiteSurface — H07 §S3 surface 19.
 *
 * Slide-in panel for a single site on the Pilgrimage Map. Displays:
 *   • Kind + stored precision chips
 *   • Map snippet (using the same SVG style as the parent map)
 *   • Quantized coordinates
 *   • Story / Linked workings / Linked media
 *   • Edit + Re-quantize precision (LOWER ONLY)
 *
 * Honesty + H07 rules wired:
 *   • Re-quantize panel uses `--warn` + `--warn-soft` background +
 *     `--warn-border`. Never `--danger` — the action is consequential
 *     but not destructive. Copy verbatim:
 *       "Lowering precision is irreversible — the precise coordinates
 *        are discarded. You cannot raise precision you no longer
 *        hold."
 *   • The precision radio for "raise" options is DISABLED (opacity
 *     0.4, cursor not-allowed). The site can only go LOWER. This
 *     enforces the H07 §S6.3 floor-only rule on a per-site basis.
 *   • Coordinate text shows the quantized lat/lng + the precision
 *     label in `--ink-mute` ("· quantized to ~1 km"). The exact
 *     coordinates are never shown when stored at coarser precision.
 *   • Linked workings + media surface as quiet stat rows / thumbs.
 *   • Edit + Re-quantize buttons sit on a `--line` border footer.
 *   • Close icon ✕ uses `--ink-mute` + `--line` ring, never `--danger`.
 */

import {
  type CSSProperties,
  type ReactElement,
  useMemo,
  useState,
} from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";

// ── Types ──────────────────────────────────────────────────────────

import type {
  PrecisionLevel,
  SiteKind,
} from "../PilgrimageMap/PilgrimageMapSurface.js";

export type SiteRequantizeChoice =
  | "1km"
  | "10km"
  | "country"
  | "unmapped";

export const SITE_KIND_LABEL: Record<SiteKind, string> = {
  sacred: "Sacred site",
  ancestral: "Ancestral",
  working: "Place of working",
  pilgrimage: "Pilgrimage",
  other: "Other",
};

const PRECISION_LABEL: Record<PrecisionLevel | "unmapped", string> = {
  exact: "Exact",
  "1km": "~1 km",
  "10km": "~10 km",
  country: "Country",
  hidden: "Hidden",
  unmapped: "Unmapped",
};

const STORED_PRECISION_CHIP: Record<PrecisionLevel | "unmapped", string> = {
  exact: "Stored exactly",
  "1km": "Stored as ~1 km",
  "10km": "Stored as ~10 km",
  country: "Stored at country",
  hidden: "Hidden",
  unmapped: "Unmapped",
};

export interface SacredSiteLinkedWorking {
  id: string;
  title: string;
  date_label: string;
}

export interface SacredSiteMediaThumb {
  id: string;
  url?: string | null;
}

export interface SacredSiteRecord {
  id: string;
  name: string;
  kind: SiteKind;
  /** The precision stored on the server. This is also the upper
   *  bound on what the practitioner can later quantize TO — they
   *  can only go lower (looser). */
  stored_precision: PrecisionLevel | "unmapped";
  /** Quantized coordinates already pre-applied to the stored
   *  precision. Format: "36.39° N, 22.48° E". */
  coord_label: string;
  story: string;
  linked_workings: readonly SacredSiteLinkedWorking[];
  linked_media: readonly SacredSiteMediaThumb[];
}

export interface SacredSiteSurfaceProps {
  open: boolean;
  record: SacredSiteRecord;
  onClose: () => void;
  onEdit?: () => void;
  onRequantize?: (next: SiteRequantizeChoice) => void;
  onSelectWorking?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ── Precision ordering ────────────────────────────────────────────
//
// "Lower" = looser. The radio list omits "Exact" entirely when the
// site is stored looser than exact; any level at or above the
// stored level renders disabled.

const ORDER: (PrecisionLevel | "unmapped")[] = [
  "exact",
  "1km",
  "10km",
  "country",
  "unmapped",
];

function lowerOptions(
  stored: PrecisionLevel | "unmapped",
): { id: SiteRequantizeChoice | "exact"; label: string; disabled: boolean }[] {
  const storedIdx = ORDER.indexOf(stored);
  return ORDER.filter((p) => p !== "hidden").map((p) => {
    const idx = ORDER.indexOf(p);
    return {
      id: p as SiteRequantizeChoice | "exact",
      label: PRECISION_LABEL[p],
      disabled: idx <= storedIdx,
    };
  });
}

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

function PencilIcon(): ReactElement {
  return (
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
      <path d="M5 19l2.5-.6L19 7a2 2 0 0 0-3-3L4.6 15.5 4 18z" />
    </svg>
  );
}

// ── Map snippet (per the .dc.html stand-in) ───────────────────────

function MapSnippet({ kind }: { kind: SiteKind }): ReactElement {
  const pinColor = `var(--map-${kind})`;
  return (
    <svg
      viewBox="0 0 400 130"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect x={0} y={0} width={400} height={130} fill="var(--map-water)" />
      <path
        d="M0,40 C90,20 180,30 240,70 C280,96 220,130 140,130 L0,130 Z"
        fill="var(--map-land)"
        stroke="var(--line-2)"
      />
      <circle cx={250} cy={74} r={22} fill={pinColor} opacity={0.18} />
      <path
        d="M250,60 C256,60 261,65 261,71 C261,79 250,88 250,88 C250,88 239,79 239,71 C239,65 244,60 250,60 Z"
        fill={pinColor}
        stroke="var(--bg)"
        strokeWidth={1.5}
      />
    </svg>
  );
}

// ── Surface ───────────────────────────────────────────────────────

const SECTION_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: ".13em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 8,
};

export function SacredSiteSurface({
  open,
  record,
  onClose,
  onEdit,
  onRequantize,
  onSelectWorking,
  className,
  style,
}: SacredSiteSurfaceProps) {
  const [reqOpen, setReqOpen] = useState(false);
  const [chosen, setChosen] = useState<
    SiteRequantizeChoice | "exact" | null
  >(null);

  // Escape closes the modal (b108-2fy a11y sweep).
  useEscapeToClose(open, onClose);

  const options = useMemo(
    () => lowerOptions(record.stored_precision),
    [record.stored_precision],
  );

  if (!open) return null;

  const handleApply = () => {
    if (!chosen || chosen === "exact") return;
    onRequantize?.(chosen);
    setReqOpen(false);
    setChosen(null);
  };

  const storedPrecisionChip = STORED_PRECISION_CHIP[record.stored_precision];

  return (
    <aside
      role="dialog"
      aria-label={`Site detail: ${record.name}`}
      data-component="sacred-site-surface"
      className={className}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(440px, calc(100vw - 24px))",
        background: "var(--bg-2)",
        borderLeft: "1px solid var(--line)",
        boxShadow: "-12px 0 36px rgba(0,0,0,.32)",
        overflowY: "auto",
        zIndex: 70,
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 24px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          data-site-kind-color
          style={{
            width: 11,
            height: 11,
            borderRadius: "50%",
            background: `var(--map-${record.kind})`,
            flex: "none",
            boxShadow: `0 0 0 2px var(--bg-2)`,
          }}
          aria-hidden="true"
        />
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            margin: 0,
            flex: 1,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {record.name}
        </h2>
        <button
          type="button"
          data-site-close
          aria-label="Close"
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--r-md)",
            border: "1px solid var(--line)",
            background: "transparent",
            color: "var(--ink-mute)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
            cursor: "pointer",
          }}
        >
          <CloseIcon />
        </button>
      </header>

      <div style={{ padding: "18px 24px 36px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <span
            data-site-kind-chip
            style={{
              padding: "3px 10px",
              border: "1px solid var(--line-2)",
              borderRadius: 20,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-soft)",
            }}
          >
            {SITE_KIND_LABEL[record.kind]}
          </span>
          <span
            data-site-precision-chip
            style={{
              padding: "3px 10px",
              border: "1px solid var(--line-2)",
              borderRadius: 20,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {storedPrecisionChip}
          </span>
        </div>

        <div style={SECTION_LABEL}>Location</div>
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              height: 130,
              background: "var(--map-water)",
              position: "relative",
            }}
          >
            <MapSnippet kind={record.kind} />
          </div>
          <div
            data-site-coord
            style={{
              padding: "9px 13px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-soft)",
              borderTop: "1px solid var(--line)",
            }}
          >
            {record.coord_label}{" "}
            {record.stored_precision !== "exact" &&
            record.stored_precision !== "unmapped" ? (
              <span style={{ color: "var(--ink-mute)" }}>
                · quantized to {PRECISION_LABEL[record.stored_precision]}
              </span>
            ) : null}
          </div>
        </div>

        <div style={SECTION_LABEL}>Story</div>
        <p
          data-site-story
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15.5,
            lineHeight: 1.6,
            color: "var(--ink-soft)",
            margin: "0 0 20px",
          }}
        >
          {record.story}
        </p>

        {record.linked_workings.length > 0 ? (
          <>
            <div style={SECTION_LABEL}>Linked workings</div>
            <div
              data-linked-workings
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                marginBottom: 20,
              }}
            >
              {record.linked_workings.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  data-linked-working={w.id}
                  onClick={() => onSelectWorking?.(w.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 2px",
                    borderBottom: "1px solid var(--line)",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-display)",
                      fontSize: 15,
                      color: "var(--ink)",
                    }}
                  >
                    {w.title}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {w.date_label}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {record.linked_media.length > 0 ? (
          <>
            <div style={{ ...SECTION_LABEL, marginBottom: 10 }}>
              Linked media
            </div>
            <div
              data-linked-media
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 22,
                flexWrap: "wrap",
              }}
            >
              {record.linked_media.map((t) => (
                <div
                  key={t.id}
                  data-linked-media-thumb={t.id}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: "var(--r-sm)",
                    background:
                      t.url ?
                        `center/cover no-repeat url(${t.url})` :
                        `radial-gradient(ellipse at 40% 35%, var(--map-${record.kind}) 0%, transparent 70%), var(--bg-sunk)`,
                    border: "1px solid var(--line)",
                    backgroundBlendMode: "soft-light",
                  }}
                />
              ))}
            </div>
          </>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 10,
            paddingTop: 18,
            borderTop: "1px solid var(--line)",
          }}
        >
          <button
            type="button"
            data-site-edit
            onClick={onEdit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              cursor: "pointer",
            }}
          >
            <PencilIcon />
            Edit
          </button>
          <button
            type="button"
            data-requantize-toggle
            onClick={() => setReqOpen((v) => !v)}
            aria-expanded={reqOpen}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            Re-quantize precision
          </button>
        </div>

        {reqOpen ? (
          <div
            data-requantize-panel
            style={{
              marginTop: 14,
              border: "1px solid var(--warn-border)",
              borderRadius: "var(--r-md)",
              background: "var(--warn-soft)",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink)",
                marginBottom: 8,
              }}
            >
              Lower the recorded precision
            </div>
            <div
              role="radiogroup"
              aria-label="Precision"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
                marginBottom: 10,
              }}
            >
              {options.map((opt) => {
                const current = opt.id === record.stored_precision;
                const isOn = chosen === opt.id;
                return (
                  <label
                    key={opt.id}
                    data-requantize-option={opt.id}
                    data-disabled={opt.disabled}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      cursor: opt.disabled ? "not-allowed" : "pointer",
                      opacity: opt.disabled ? 0.4 : 1,
                    }}
                  >
                    <input
                      type="radio"
                      name="site-precision"
                      disabled={opt.disabled}
                      checked={isOn}
                      onChange={() => {
                        if (opt.id !== "exact") {
                          setChosen(opt.id);
                        }
                      }}
                      style={{
                        position: "absolute",
                        opacity: 0,
                        pointerEvents: "none",
                      }}
                      aria-label={opt.label}
                    />
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: `1px solid ${
                          isOn ? "var(--accent)" : "var(--line-2)"
                        }`,
                        background: isOn ? "var(--accent)" : "transparent",
                        flex: "none",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 13,
                        color: "var(--ink)",
                      }}
                    >
                      {opt.label}
                    </span>
                    {current ? (
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 10.5,
                          color: "var(--ink-mute)",
                        }}
                      >
                        current
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
            <div
              data-requantize-warn
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--warn)",
                lineHeight: 1.45,
                marginBottom: 12,
              }}
            >
              Lowering precision is irreversible — the precise coordinates
              are discarded. You cannot raise precision you no longer hold.
            </div>
            <button
              type="button"
              data-requantize-apply
              onClick={handleApply}
              disabled={!chosen || chosen === "exact"}
              style={{
                padding: "9px 16px",
                borderRadius: "var(--r-md)",
                background: "var(--warn)",
                color: "var(--bg)",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 13,
                border: "none",
                cursor:
                  !chosen || chosen === "exact" ? "not-allowed" : "pointer",
                opacity: !chosen || chosen === "exact" ? 0.55 : 1,
              }}
            >
              Apply
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
