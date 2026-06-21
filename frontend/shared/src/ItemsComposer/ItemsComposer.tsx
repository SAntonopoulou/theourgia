/**
 * ItemsComposer — chip selector + "+ something else" free-text for
 * the canonical 14-item offering palette (Theourgia Offerings.dc.html
 * §items composer).
 *
 * Reuse pattern: anywhere a structured-but-extensible multi-pick is
 * needed — offering items, feeding methods, binding kinds, etc.
 * The default item list is the offering vocabulary; callers can
 * override with their own kinds.
 *
 * Per-item categories drive the colour via the `--cat-{liquid|solid
 * |body|time}` token family.
 */

import { type CSSProperties, useState } from "react";

export type ItemCategory = "liquid" | "solid" | "body" | "time";

export interface ItemKind {
  k: string;
  label: string;
  cat: ItemCategory;
}

export interface ChosenItem {
  k: string;
  qty?: string;
  unit?: string;
  custom?: boolean;
}

export interface ItemsComposerProps {
  value: ChosenItem[];
  onChange: (next: ChosenItem[]) => void;
  /** Override the canonical 14-item palette. */
  commonKinds?: readonly ItemKind[];
  /** Custom-input placeholder. Defaults to "+ something else". */
  customPlaceholder?: string;
  /** Custom-input add-button label. Defaults to "Add". */
  customAddLabel?: string;
  className?: string;
  style?: CSSProperties;
}

// Canonical offering palette from Theourgia Offerings.dc.html.
export const OFFERING_ITEMS: readonly ItemKind[] = [
  { k: "wine", label: "Wine", cat: "liquid" },
  { k: "water", label: "Water", cat: "liquid" },
  { k: "milk", label: "Milk", cat: "liquid" },
  { k: "honey", label: "Honey", cat: "liquid" },
  { k: "libation", label: "Libation", cat: "liquid" },
  { k: "incense", label: "Incense", cat: "solid" },
  { k: "food", label: "Food", cat: "solid" },
  { k: "flowers", label: "Flowers", cat: "solid" },
  { k: "money", label: "Money", cat: "solid" },
  { k: "blood", label: "Blood", cat: "body" },
  { k: "breath", label: "Breath", cat: "body" },
  { k: "song", label: "Song", cat: "body" },
  { k: "dance", label: "Dance", cat: "body" },
  { k: "time", label: "Time", cat: "time" },
];

function categoryColor(cat: ItemCategory): string {
  return `var(--cat-${cat})`;
}

export function ItemsComposer({
  value,
  onChange,
  commonKinds = OFFERING_ITEMS,
  customPlaceholder = "+ something else",
  customAddLabel = "Add",
  className,
  style,
}: ItemsComposerProps) {
  const [customText, setCustomText] = useState("");

  const byKey = new Map(commonKinds.map((k) => [k.k, k] as const));

  const isOn = (k: string) => value.some((v) => v.k === k);
  const toggleItem = (k: string) => {
    const present = isOn(k);
    onChange(
      present
        ? value.filter((v) => v.k !== k)
        : [...value, { k, qty: "", unit: "" }],
    );
  };

  const updateChosen = (idx: number, patch: Partial<ChosenItem>) => {
    const current = value[idx];
    if (!current) return;
    const next = value.slice();
    next[idx] = { ...current, ...patch };
    onChange(next);
  };

  const removeChosen = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const addCustom = () => {
    const v = customText.trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (isOn(key)) {
      setCustomText("");
      return;
    }
    onChange([...value, { k: key, qty: "", unit: "", custom: true }]);
    setCustomText("");
  };

  // Chip-row style (off / on).
  const chipBase: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 11px",
    borderRadius: 999,
    fontFamily: "var(--font-ui)",
    fontSize: 12.5,
    color: "var(--ink-soft)",
    background: "var(--bg-sunk)",
    border: "1px solid var(--line)",
    cursor: "pointer",
  };
  const chipOn: CSSProperties = {
    ...chipBase,
    color: "var(--ink)",
    background: "var(--accent-soft)",
    borderColor: "var(--line-2)",
  };

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 12, ...style }}>
      {/* Chip palette */}
      <div
        role="group"
        aria-label="Offering items"
        style={{ display: "flex", flexWrap: "wrap", gap: 7 }}
      >
        {commonKinds.map((item) => {
          const on = isOn(item.k);
          return (
            <button
              key={item.k}
              type="button"
              onClick={() => toggleItem(item.k)}
              aria-pressed={on}
              style={on ? chipOn : chipBase}
              data-on={on ? "true" : "false"}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: categoryColor(item.cat),
                }}
              />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Chosen items with qty + unit + remove */}
      {value.length > 0 ? (
        <ul
          aria-label="Chosen items"
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          {value.map((it, idx) => {
            const meta = byKey.get(it.k);
            const label = meta?.label ?? (it.k.charAt(0).toUpperCase() + it.k.slice(1));
            const cat = meta?.cat ?? "solid";
            return (
              <li
                key={`${it.k}-${idx}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-sunk)",
                  border: "1px solid var(--line)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: categoryColor(cat),
                    flex: "none",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--ink)",
                    flex: "0 0 120px",
                  }}
                >
                  {label}
                  {it.custom ? (
                    <span
                      style={{
                        marginLeft: 6,
                        fontFamily: "var(--font-ui)",
                        fontSize: 10.5,
                        color: "var(--ink-mute)",
                      }}
                    >
                      (custom)
                    </span>
                  ) : null}
                </span>
                <input
                  aria-label={`${label} quantity`}
                  type="text"
                  inputMode="numeric"
                  value={it.qty ?? ""}
                  placeholder="Qty"
                  onChange={(e) => updateChosen(idx, { qty: e.target.value })}
                  style={{
                    width: 70,
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    background: "var(--bg-2)",
                    padding: "6px 8px",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink)",
                  }}
                />
                <input
                  aria-label={`${label} unit`}
                  type="text"
                  value={it.unit ?? ""}
                  placeholder="Unit"
                  onChange={(e) => updateChosen(idx, { unit: e.target.value })}
                  style={{
                    width: 90,
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    background: "var(--bg-2)",
                    padding: "6px 8px",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeChosen(idx)}
                  aria-label={`Remove ${label}`}
                  style={{
                    marginLeft: "auto",
                    padding: "4px 8px",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Custom-text add */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          aria-label="Add a custom item"
          type="text"
          value={customText}
          placeholder={customPlaceholder}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          style={{
            flex: 1,
            border: "1px solid var(--line-2)",
            borderRadius: 8,
            background: "var(--bg-sunk)",
            padding: "9px 12px",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink)",
          }}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customText.trim()}
          style={{
            padding: "9px 14px",
            border: "1px solid var(--line-2)",
            borderRadius: 8,
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink)",
            background: customText.trim() ? "var(--accent-soft)" : "transparent",
            cursor: customText.trim() ? "pointer" : "not-allowed",
          }}
        >
          {customAddLabel}
        </button>
      </div>
    </div>
  );
}
