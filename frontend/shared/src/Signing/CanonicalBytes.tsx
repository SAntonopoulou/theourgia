/**
 * CanonicalBytes — show "what the signature commits to."
 *
 * Per the H01-H03 supplement §S3.3: every signing surface shows the
 * canonical bytes BEFORE the signature is computed. Default rendering
 * is a formatted card (one row per key with the value beside it).
 * A "Show raw" toggle reveals the deterministic JSON the Ed25519
 * signature is actually computed over — so the user can verify the
 * exact bytes if they choose. Formatted by default, raw on demand.
 *
 * The component is presentation-only — the JSON serialisation is
 * the caller's responsibility (it must match the backend's
 * canonicalize() output exactly, byte-for-byte). For display, we
 * sort keys + pretty-print so the raw view is readable.
 */

import { type CSSProperties, useState } from "react";

export interface CanonicalBytesProps {
  /** The structured claim. Values must already be the canonical
   *  shape (strings / numbers / bools / null) the backend will see. */
  value: Record<string, unknown>;
  /** Optional title. Defaults to "What the signature commits to". */
  title?: string;
  /** Start in raw mode. Defaults to false (formatted). */
  defaultRaw?: boolean;
  /** Drop fields whose value is undefined from the display.
   *  Defaults to true — undefined fields don't enter the canonical
   *  bytes the signature covers. */
  dropUndefined?: boolean;
  className?: string;
  style?: CSSProperties;
}

const TITLE_DEFAULT = "What the signature commits to";

function humaniseKey(key: string): string {
  return key.replace(/_/g, " ");
}

function stableSortEntries(
  value: Record<string, unknown>,
  dropUndefined: boolean,
): Array<[string, unknown]> {
  const keys = Object.keys(value).sort();
  const entries: Array<[string, unknown]> = [];
  for (const k of keys) {
    const v = value[k];
    if (dropUndefined && v === undefined) continue;
    entries.push([k, v]);
  }
  return entries;
}

export function CanonicalBytes({
  value,
  title = TITLE_DEFAULT,
  defaultRaw = false,
  dropUndefined = true,
  className,
  style,
}: CanonicalBytesProps) {
  const [raw, setRaw] = useState(defaultRaw);
  const entries = stableSortEntries(value, dropUndefined);

  const wrapStyle: CSSProperties = {
    border: "1px solid var(--line)",
    borderRadius: "var(--r-lg)",
    background: "var(--bg-2)",
    overflow: "hidden",
    ...style,
  };

  return (
    <div
      className={className}
      style={wrapStyle}
      data-canonical-mode={raw ? "raw" : "formatted"}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "13px 16px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          {title}
        </span>
        <button
          type="button"
          onClick={() => setRaw(!raw)}
          aria-pressed={raw}
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-soft)",
            padding: "4px 11px",
            border: "1px solid var(--line-2)",
            borderRadius: 7,
            background: "transparent",
            cursor: "pointer",
          }}
        >
          {raw ? "Show formatted" : "Show raw"}
        </button>
      </div>
      <div style={{ padding: raw ? 0 : "6px 0" }}>
        {raw ? (
          <pre
            style={{
              margin: 0,
              padding: "12px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              lineHeight: 1.6,
              color: "var(--ink-soft)",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              background: "var(--bg-sunk)",
            }}
          >
            {formatJson(entries)}
          </pre>
        ) : (
          entries.map(([k, v], i) => (
            <div
              key={k}
              style={{
                display: "flex",
                gap: 14,
                padding: "9px 14px",
                borderTop: i ? "1px solid var(--line)" : "none",
              }}
            >
              <span
                style={{
                  flex: "none",
                  width: 92,
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                }}
              >
                {humaniseKey(k)}
              </span>
              <span
                style={{
                  minWidth: 0,
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink)",
                  wordBreak: "break-word",
                }}
              >
                {String(v)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatJson(entries: Array<[string, unknown]>): string {
  if (entries.length === 0) return "{}";
  const body = entries
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(",\n");
  return `{\n${body}\n}`;
}

export { formatJson as formatCanonicalJson };
