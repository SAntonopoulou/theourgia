/**
 * CustomSquareBuilderModal — H07 §S3 Cluster A surface 3.
 *
 * Unblocks the queued B92→B91 "Save as sigil" handoff for custom
 * squares (the MagicSquares surface's Build mode currently
 * auto-generates a valid n×n square; this modal lets the
 * practitioner author cell values by hand — useful for
 * reconstructing a square from a manuscript or testing a personal
 * construction).
 *
 * Honesty rule (H07): live magic-constant readouts are
 * OBSERVATIONAL, not gating. Sums that match the constant render
 * in `--money` (sober affirmation); sums that don't render in
 * `--ink-mute` (failing sums reported, NOT blocking). The square
 * saves either way with the server's computed `is_magic` flag —
 * the H05 honesty rule: report the truth, don't hide it.
 */

import {
  type CSSProperties,
  type KeyboardEvent,
  useMemo,
  useState,
} from "react";

import { magicConstant } from "../workshop/magicSquares.js";

import {
  CSB_ATTRIBUTION_HELP,
  CSB_ATTRIBUTION_LABEL,
  CSB_COLS_LABEL,
  CSB_DIAG_LABEL,
  CSB_GRID_LABEL,
  CSB_HELP_TAIL,
  CSB_NAME_LABEL,
  CSB_ORDER_LABEL,
  CSB_ROWS_LABEL,
  CSB_SAVE_LABEL,
  CSB_TITLE,
  WM_CANCEL_LABEL,
} from "./copy.js";

export interface CustomSquarePayload {
  name: string;
  order: number;
  cells: number[][];
  attribution: string | null;
}

export interface CustomSquareBuilderModalProps {
  open: boolean;
  onClose: () => void;
  /** Initial order. Defaults to 4 (per the H07 spec). */
  initialOrder?: number;
  onSave?: (payload: CustomSquarePayload) => void | Promise<void>;
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
  width: "min(640px, 100%)",
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

const MIN_ORDER = 3;
const MAX_ORDER = 12;

function buildEmptyCells(order: number): number[][] {
  return Array.from({ length: order }, () =>
    Array.from({ length: order }, () => 0),
  );
}

function sumRow(cells: number[][], i: number): number {
  return cells[i]!.reduce((acc, v) => acc + v, 0);
}

function sumCol(cells: number[][], j: number): number {
  let s = 0;
  for (let i = 0; i < cells.length; i++) s += cells[i]![j] ?? 0;
  return s;
}

function sumMainDiagonal(cells: number[][]): number {
  let s = 0;
  for (let i = 0; i < cells.length; i++) s += cells[i]![i] ?? 0;
  return s;
}

function sumAntiDiagonal(cells: number[][]): number {
  const n = cells.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += cells[i]![n - 1 - i] ?? 0;
  return s;
}

interface SumRowReadoutProps {
  label: string;
  sums: number[];
  expected: number;
}

function SumReadout({ label, sums, expected }: SumRowReadoutProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "var(--font-ui)",
        fontSize: 11.5,
        color: "var(--ink-mute)",
      }}
    >
      <span style={{ flex: "none", width: 60 }}>{label}</span>
      <span
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 12.5,
        }}
      >
        {sums.map((s, i) => {
          const matches = s === expected;
          return (
            <span
              key={i}
              data-sum-ok={matches}
              style={{
                color: matches ? "var(--money)" : "var(--ink-mute)",
              }}
            >
              {s}
              {matches ? " ✓" : ""}
            </span>
          );
        })}
      </span>
    </div>
  );
}

export function CustomSquareBuilderModal({
  open,
  onClose,
  initialOrder = 4,
  onSave,
}: CustomSquareBuilderModalProps) {
  const [name, setName] = useState("");
  const [order, setOrder] = useState(
    Math.min(MAX_ORDER, Math.max(MIN_ORDER, initialOrder)),
  );
  const [cells, setCells] = useState<number[][]>(() =>
    buildEmptyCells(initialOrder),
  );
  const [attribution, setAttribution] = useState("");

  const saveDisabled = useMemo(() => name.trim() === "", [name]);

  const expected = magicConstant(order);

  const rowSums = useMemo(
    () => Array.from({ length: order }, (_, i) => sumRow(cells, i)),
    [cells, order],
  );
  const colSums = useMemo(
    () => Array.from({ length: order }, (_, j) => sumCol(cells, j)),
    [cells, order],
  );
  const diagSums = useMemo(
    () => [sumMainDiagonal(cells), sumAntiDiagonal(cells)],
    [cells],
  );

  if (!open) return null;

  function changeOrder(next: number): void {
    const clamped = Math.min(MAX_ORDER, Math.max(MIN_ORDER, next));
    setOrder(clamped);
    setCells(buildEmptyCells(clamped));
  }

  function setCell(i: number, j: number, value: number): void {
    setCells((prev) =>
      prev.map((row, ri) =>
        ri === i ? row.map((c, cj) => (cj === j ? value : c)) : row,
      ),
    );
  }

  function focusCell(i: number, j: number): void {
    const next = document.querySelector<HTMLInputElement>(
      `[data-csb-cell='${i}-${j}']`,
    );
    next?.focus();
    next?.select();
  }

  function handleCellKey(
    e: KeyboardEvent<HTMLInputElement>,
    i: number,
    j: number,
  ): void {
    if (e.key === "ArrowUp" && i > 0) {
      e.preventDefault();
      focusCell(i - 1, j);
    } else if (e.key === "ArrowDown" && i < order - 1) {
      e.preventDefault();
      focusCell(i + 1, j);
    } else if (e.key === "ArrowLeft" && j > 0) {
      e.preventDefault();
      focusCell(i, j - 1);
    } else if (e.key === "ArrowRight" && j < order - 1) {
      e.preventDefault();
      focusCell(i, j + 1);
    }
  }

  function handleSave(): void {
    if (saveDisabled) return;
    onSave?.({
      name: name.trim(),
      order,
      cells: cells.map((row) => [...row]),
      attribution: attribution.trim() === "" ? null : attribution,
    });
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={CSB_TITLE}
      data-component="custom-square-builder-modal"
      style={SCRIM}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div style={PANEL}>
        <h2 style={HEADING}>{CSB_TITLE}</h2>

        {/* Name */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="csb-name" style={LABEL}>
            {CSB_NAME_LABEL}
          </label>
          <input
            id="csb-name"
            type="text"
            value={name}
            maxLength={240}
            onChange={(e) => setName(e.target.value)}
            data-csb-name
            style={INPUT_BASE}
          />
        </div>

        {/* Order */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL}>{CSB_ORDER_LABEL}</label>
          <div
            role="group"
            aria-label={CSB_ORDER_LABEL}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
            }}
          >
            {Array.from({ length: MAX_ORDER - MIN_ORDER + 1 }, (_, i) => {
              const n = MIN_ORDER + i;
              const on = order === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  data-csb-order={n}
                  onClick={() => changeOrder(n)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "var(--r-md)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: on ? "var(--accent)" : "var(--line)",
                    background: on
                      ? "var(--accent-soft)"
                      : "var(--bg-2)",
                    color: on ? "var(--ink)" : "var(--ink-soft)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    cursor: "pointer",
                    minWidth: 36,
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL}>{CSB_GRID_LABEL}</label>
          <div
            data-csb-grid
            role="grid"
            aria-label={`${order}×${order} square`}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${order}, minmax(0, 1fr))`,
              gap: 4,
              padding: 10,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
            }}
          >
            {cells.map((row, i) =>
              row.map((value, j) => (
                <input
                  key={`${i}-${j}`}
                  type="number"
                  value={value === 0 ? "" : value}
                  onChange={(e) =>
                    setCell(i, j, Number(e.target.value) || 0)
                  }
                  onKeyDown={(e) => handleCellKey(e, i, j)}
                  data-csb-cell={`${i}-${j}`}
                  aria-label={`Row ${i + 1} Column ${j + 1}`}
                  style={{
                    width: "100%",
                    padding: "8px 4px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line)",
                    borderRadius: "var(--r-sm)",
                    background: "var(--bg)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    textAlign: "center",
                    minHeight: 36,
                  }}
                />
              )),
            )}
          </div>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              <span style={{ flex: "none", width: 60 }}>Constant</span>
              <span
                data-csb-constant
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--accent)",
                }}
              >
                {expected}
              </span>
              <span style={{ color: "var(--ink-mute)", fontSize: 11 }}>
                = {order} × ({order}² + 1) / 2
              </span>
            </div>
            <SumReadout
              label={CSB_ROWS_LABEL}
              sums={rowSums}
              expected={expected}
            />
            <SumReadout
              label={CSB_COLS_LABEL}
              sums={colSums}
              expected={expected}
            />
            <SumReadout
              label={CSB_DIAG_LABEL}
              sums={diagSums}
              expected={expected}
            />
          </div>
          <p
            style={{
              margin: "10px 0 0",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              lineHeight: 1.45,
            }}
          >
            {CSB_HELP_TAIL}
          </p>
        </div>

        {/* Attribution */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="csb-attribution" style={LABEL}>
            {CSB_ATTRIBUTION_LABEL}
          </label>
          <input
            id="csb-attribution"
            type="text"
            value={attribution}
            maxLength={480}
            onChange={(e) => setAttribution(e.target.value)}
            placeholder={CSB_ATTRIBUTION_HELP}
            data-csb-attribution
            style={{ ...INPUT_BASE, fontSize: 14 }}
          />
        </div>

        {/* Footer */}
        <div style={FOOTER}>
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
              {CSB_SAVE_LABEL}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
