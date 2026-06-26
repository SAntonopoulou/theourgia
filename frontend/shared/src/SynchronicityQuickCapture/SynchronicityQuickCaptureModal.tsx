/**
 * SynchronicityQuickCaptureModal — H06 §S7.10.
 *
 * The fast-capture modal. Global keyboard shortcut opens it from
 * anywhere in the app; the practitioner types a description, picks
 * a category, optionally adjusts intensity / structured data /
 * suggested context, and hits Enter (or Capture).
 *
 * Honesty + H06 rules:
 *   • Sealed entries CANNOT be suggested as context (the backend
 *     B120 layer rejects them too — this is just defence in
 *     depth at the surface).
 *   • Intensity defaults to 5 (the middle of the scale), never
 *     to the top — anti-gamification.
 *   • The "Add details" expander defers the heavy fields. The
 *     happy path is description + category + Enter.
 *   • Capture button never carries --danger; cancel is quiet
 *     --line-2 + --ink-soft.
 *   • The context strip shows the practitioner's current
 *     astrological / planetary-hour context (provided by the
 *     route) — never auto-edited.
 */

import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type SyncCategory =
  | "number_sequence"
  | "name_occurrence"
  | "dream_spillover"
  | "animal_omen"
  | "song_lyric"
  | "overheard_speech"
  | "weather"
  | "object_encounter"
  | "electromagnetic"
  | "custom";

export interface SuggestedContextChip {
  id: string;
  label: string;
  /** "entry" | "entity" | "working" — used by the route to route
   *  the link into the right field on save. */
  kind: "entry" | "entity" | "working";
}

export interface SyncQuickCapturePayload {
  description: string;
  category: SyncCategory;
  intensity: number;
  structured_data: Record<string, string>;
  linked_entry_ids: string[];
  linked_entity_ids: string[];
  linked_working_ids: string[];
}

export interface SynchronicityQuickCaptureModalProps {
  open: boolean;
  /** Optional current-context strip shown under the heading. The
   *  route owns the live snapshot — "Now · 14:32 · ☉ Sun in Aries
   *  · Hour of Venus" or similar. */
  context_label?: string | null;
  /** Pre-computed suggested context chips. The user toggles them on
   *  / off; the surface adds them to the right linked-* array on
   *  submit. */
  suggested_context?: readonly SuggestedContextChip[];
  onClose: () => void;
  onCapture: (payload: SyncQuickCapturePayload) => void;
}

// ── Category definitions ───────────────────────────────────────────

const CATEGORIES: { id: SyncCategory; label: string; glyph: string }[] = [
  { id: "number_sequence", label: "Number", glyph: "1·1" },
  { id: "name_occurrence", label: "Name", glyph: "A·a" },
  { id: "dream_spillover", label: "Dream", glyph: "☽" },
  { id: "animal_omen", label: "Animal", glyph: "🦅" },
  { id: "song_lyric", label: "Song", glyph: "♪" },
  { id: "overheard_speech", label: "Overheard", glyph: "❝" },
  { id: "weather", label: "Weather", glyph: "☁" },
  { id: "object_encounter", label: "Object", glyph: "◇" },
  { id: "electromagnetic", label: "EM", glyph: "⚡" },
  { id: "custom", label: "Other", glyph: "✶" },
];

const STRUCTURED_FIELD_BY_CATEGORY: Partial<
  Record<SyncCategory, { key: string; label: string; placeholder: string }>
> = {
  number_sequence: {
    key: "number",
    label: "Number",
    placeholder: "e.g. 1111",
  },
  name_occurrence: {
    key: "name",
    label: "Name",
    placeholder: "Whose name?",
  },
  animal_omen: {
    key: "species",
    label: "Species",
    placeholder: "e.g. raven",
  },
  song_lyric: {
    key: "lyric",
    label: "Lyric / song",
    placeholder: "Title or fragment",
  },
};

const INTENSITY_LABELS: Record<number, string> = {
  1: "barely noticed",
  2: "soft",
  3: "soft",
  4: "fits the day",
  5: "fits the day",
  6: "striking",
  7: "striking",
  8: "stands out",
  9: "stands out",
  10: "impossible to ignore",
};

// ── Styles ────────────────────────────────────────────────────────

const SCRIM: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "56px 20px",
  overflow: "auto",
  zIndex: 90,
};

const DIALOG: CSSProperties = {
  width: 480,
  maxWidth: "100%",
  maxHeight: "calc(100vh - 96px)",
  overflowY: "auto",
  background: "var(--bg)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-lg)",
  boxShadow: "0 28px 70px rgba(0,0,0,.55)",
};

const SECTION_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

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

function ClockIcon(): ReactElement {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

// ── Surface ───────────────────────────────────────────────────────

export function SynchronicityQuickCaptureModal({
  open,
  context_label,
  suggested_context,
  onClose,
  onCapture,
}: SynchronicityQuickCaptureModalProps) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<SyncCategory>("number_sequence");
  const [intensity, setIntensity] = useState(5);
  const [structuredValue, setStructuredValue] = useState("");
  const [activeContextIds, setActiveContextIds] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Reset state on open.
  useEffect(() => {
    if (open) {
      setDescription("");
      setCategory("number_sequence");
      setIntensity(5);
      setStructuredValue("");
      setActiveContextIds([]);
      setDetailsOpen(false);
    }
  }, [open]);

  const structuredField = useMemo(
    () => STRUCTURED_FIELD_BY_CATEGORY[category],
    [category],
  );

  const canCapture = description.trim().length > 0;

  const submit = useCallback(() => {
    if (!canCapture) return;
    const linkedEntries: string[] = [];
    const linkedEntities: string[] = [];
    const linkedWorkings: string[] = [];
    for (const id of activeContextIds) {
      const chip = (suggested_context ?? []).find((c) => c.id === id);
      if (!chip) continue;
      if (chip.kind === "entry") linkedEntries.push(chip.id);
      else if (chip.kind === "entity") linkedEntities.push(chip.id);
      else if (chip.kind === "working") linkedWorkings.push(chip.id);
    }
    const structured: Record<string, string> = {};
    if (structuredField && structuredValue.trim()) {
      structured[structuredField.key] = structuredValue.trim();
    }
    onCapture({
      description: description.trim(),
      category,
      intensity,
      structured_data: structured,
      linked_entry_ids: linkedEntries,
      linked_entity_ids: linkedEntities,
      linked_working_ids: linkedWorkings,
    });
  }, [
    canCapture,
    description,
    category,
    intensity,
    structuredField,
    structuredValue,
    activeContextIds,
    suggested_context,
    onCapture,
  ]);

  if (!open) return null;

  return (
    <div
      data-component="sync-quick-capture-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Capture a synchronicity"
      style={SCRIM}
    >
      <div className="scroll" style={DIALOG}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "20px 24px 14px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                margin: 0,
              }}
            >
              Capture a synchronicity
            </h2>
            {context_label ? (
              <div
                data-context-label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginTop: 6,
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                }}
              >
                <ClockIcon />
                {context_label}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            data-close
            aria-label="Close"
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
              flex: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "18px 24px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Description */}
          <div>
            <textarea
              data-description
              autoFocus
              rows={3}
              value={description}
              placeholder="What did you notice?"
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  (e.metaKey || e.ctrlKey)
                ) {
                  e.preventDefault();
                  submit();
                }
              }}
              style={{
                width: "100%",
                padding: "13px 15px",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontSize: 16.5,
                lineHeight: 1.5,
                resize: "vertical",
              }}
            />
          </div>

          {/* Category */}
          <div>
            <div style={{ ...SECTION_LABEL, marginBottom: 9 }}>Category</div>
            <div
              role="radiogroup"
              aria-label="Category"
              style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
            >
              {CATEGORIES.map((c) => {
                const on = c.id === category;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-category={c.id}
                    onClick={() => setCategory(c.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 12px",
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
                        display: "flex",
                        color: on ? "var(--accent)" : "var(--ink-mute)",
                      }}
                      aria-hidden="true"
                    >
                      {c.glyph}
                    </span>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Structured data (per-category) */}
          {structuredField ? (
            <div data-structured-field>
              <label
                htmlFor="sqc-structured"
                style={{
                  display: "block",
                  ...SECTION_LABEL,
                  marginBottom: 8,
                }}
              >
                {structuredField.label}
              </label>
              <input
                id="sqc-structured"
                data-structured-input
                type="text"
                value={structuredValue}
                placeholder={structuredField.placeholder}
                onChange={(e) => setStructuredValue(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 13px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 16,
                }}
              />
            </div>
          ) : null}

          {/* Intensity */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={SECTION_LABEL}>Intensity</span>
              <span
                data-intensity-label
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 13.5,
                  color: "var(--ink-soft)",
                }}
              >
                {INTENSITY_LABELS[intensity] ?? "—"}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={intensity}
              data-intensity-slider
              aria-label="Intensity"
              onChange={(e) => setIntensity(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--ink-mute)",
                marginTop: 4,
                padding: "0 2px",
              }}
              aria-hidden="true"
            >
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          {/* Suggested context */}
          {suggested_context && suggested_context.length > 0 ? (
            <div data-suggested-context>
              <div style={{ ...SECTION_LABEL, marginBottom: 9 }}>
                Suggested context
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {suggested_context.map((x) => {
                  const on = activeContextIds.includes(x.id);
                  return (
                    <button
                      key={x.id}
                      type="button"
                      data-context-chip={x.id}
                      aria-pressed={on}
                      onClick={() =>
                        setActiveContextIds((arr) =>
                          on
                            ? arr.filter((y) => y !== x.id)
                            : [...arr, x.id],
                        )
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 11px",
                        borderRadius: 20,
                        border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                        background: on ? "var(--accent-soft)" : "var(--bg-2)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        color: on ? "var(--ink)" : "var(--ink-soft)",
                        cursor: "pointer",
                      }}
                    >
                      {x.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Add details expander */}
          <button
            type="button"
            data-details-toggle
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              alignSelf: "flex-start",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span
              style={{
                display: "flex",
                transform: detailsOpen
                  ? "rotate(90deg)"
                  : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
              aria-hidden="true"
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
            Add details · linked entries, entities, workings, location,
            weather
          </button>
          {detailsOpen ? (
            <div
              data-details-panel
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "14px 16px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  lineHeight: 1.5,
                }}
              >
                Full detail editing is on the Synchronicity Log page —
                this modal stays fast. Tap Capture, then open the entry
                from the log to add linked workings, location, weather,
                or a long-form note.
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 24px",
            borderTop: "1px solid var(--line)",
            background: "var(--bg-2)",
          }}
        >
          <span
            style={{
              marginRight: "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            ⌘ / Ctrl + Enter to capture
          </span>
          <button
            type="button"
            data-cancel
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-capture
            onClick={submit}
            disabled={!canCapture}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13.5,
              border: "none",
              cursor: canCapture ? "pointer" : "not-allowed",
              opacity: canCapture ? 1 : 0.55,
            }}
          >
            <span
              style={{ fontFamily: "var(--font-glyph)" }}
              aria-hidden="true"
            >
              ✶
            </span>
            Capture
          </button>
        </div>
      </div>
    </div>
  );
}
