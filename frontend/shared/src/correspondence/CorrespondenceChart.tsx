/**
 * CorrespondenceChart — a subject read across its categories, each source's
 * value beside another's. The web mirror of the phone's correspondence screen:
 * pick a subject (Mars), read down the categories anything fills, and across
 * each the value every installed source gives. Where sources disagree it shows
 * both and resolves nothing.
 *
 * Tables come from installed correspondence-table packs (Agrippa, Liber 777),
 * read client-side; this component only renders what it is handed.
 */

import { type CSSProperties, useMemo, useState } from "react";

import {
  type CorrespondenceTable,
  categoriesFor,
  subjectsAcross,
  valueIn,
} from "./packCorrespondences.js";

export interface CorrespondenceChartProps {
  tables: readonly CorrespondenceTable[];
  className?: string;
  style?: CSSProperties;
}

/** "planet.saturn" → "Saturn"; "deity.greek" → "Greek". */
function humanize(key: string): string {
  const tail = key.includes(".") ? key.slice(key.lastIndexOf(".") + 1) : key;
  return tail
    .split(/[-_]/)
    .map((w) => (w ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const CHIP_BASE: CSSProperties = {
  padding: "6px 12px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  color: "var(--ink-soft)",
  fontSize: 13,
  cursor: "pointer",
};

export function CorrespondenceChart({ tables, className, style }: CorrespondenceChartProps) {
  const subjects = useMemo(() => subjectsAcross([...tables]), [tables]);
  const [subject, setSubject] = useState<string | null>(null);
  const active = subject ?? subjects[0] ?? null;
  const categories = useMemo(
    () => (active ? categoriesFor([...tables], active) : []),
    [tables, active],
  );

  if (tables.length === 0) {
    return (
      <div className={className} style={{ padding: "16px 4px", ...style }}>
        <p style={{ color: "var(--ink-mute)", fontSize: 13, lineHeight: 1.6 }}>
          No correspondence tables installed. Install a pack — Agrippa, Liber 777 — from Packs, and
          its subjects and sources appear here.
        </p>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ padding: "8px 4px 40px", maxWidth: 820, margin: "0 auto", ...style }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        {subjects.map((s) => {
          const on = s === active;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSubject(s)}
              style={
                on
                  ? {
                      ...CHIP_BASE,
                      color: "var(--ink)",
                      background: "var(--accent-soft)",
                      borderColor: "var(--accent)",
                    }
                  : CHIP_BASE
              }
            >
              {humanize(s)}
            </button>
          );
        })}
      </div>

      {active && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    color: "var(--ink-mute)",
                    fontSize: 11.5,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  {humanize(active)}
                </th>
                {tables.map((t) => (
                  <th
                    key={t.shortLabel}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      color: "var(--accent)",
                      fontSize: 12,
                      borderBottom: "1px solid var(--line)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.shortLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category}>
                  <td
                    style={{
                      padding: "8px 12px",
                      color: "var(--ink-soft)",
                      borderBottom: "1px solid var(--line)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {humanize(category)}
                  </td>
                  {tables.map((t) => {
                    const v = valueIn(t, active, category);
                    return (
                      <td
                        key={t.shortLabel}
                        style={{
                          padding: "8px 12px",
                          color: v ? "var(--ink)" : "var(--ink-faint, var(--ink-mute))",
                          borderBottom: "1px solid var(--line)",
                        }}
                      >
                        {v ?? "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
