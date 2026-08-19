/**
 * TechniqueReference — the web reference for the timing techniques.
 *
 * Not a calculator: the phone runs these against a chart. Here each technique
 * is shown as the sources give it — what it is, how to read it, the places it
 * reads by, and where it misleads if handled carelessly. The techniques come
 * from installed astro-technique packs, read client-side.
 */

import type { CSSProperties } from "react";

import type { Technique } from "./packTechniques.js";

export interface TechniqueReferenceProps {
  techniques: readonly Technique[];
  className?: string;
  style?: CSSProperties;
}

function ProvenanceBadge({ provenance }: { provenance: string }) {
  const attested = provenance === "attested";
  return (
    <span
      style={{
        fontSize: 10.5,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "2px 7px",
        borderRadius: 999,
        border: "1px solid var(--line)",
        color: attested ? "var(--accent)" : "var(--ink-mute)",
        whiteSpace: "nowrap",
      }}
    >
      {provenance}
    </span>
  );
}

function TechniqueCard({ technique }: { technique: Technique }) {
  return (
    <section
      style={{
        marginBottom: 28,
        paddingBottom: 20,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, margin: 0 }}>
          {technique.name}
        </h2>
        {technique.provenance && <ProvenanceBadge provenance={technique.provenance} />}
      </div>

      {technique.summary && (
        <p style={{ color: "var(--ink-mute)", fontSize: 13, lineHeight: 1.6, margin: "8px 0 0" }}>
          {technique.summary}
        </p>
      )}

      {technique.reading.length > 0 && (
        <ol style={{ margin: "14px 0 0", paddingLeft: 20 }}>
          {technique.reading.map((step, i) => (
            // Steps are an ordered procedure; index is the stable identity.
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: reading steps are a fixed ordered list
              key={i}
              style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 6, color: "var(--ink)" }}
            >
              {step}
            </li>
          ))}
        </ol>
      )}

      {technique.houses && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 6,
            }}
          >
            The places
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {technique.houses.map((h) => (
              <li key={h.house} style={{ display: "flex", gap: 10, marginBottom: 4 }}>
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    color: "var(--accent)",
                    minWidth: 20,
                    textAlign: "right",
                  }}
                >
                  {h.house}
                </span>
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-soft)" }}>
                  {h.meaning}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {technique.cautions.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 6,
            }}
          >
            Handle with care
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {technique.cautions.map((caution, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: cautions are a fixed list
                key={i}
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  marginBottom: 4,
                  color: "var(--ink-mute)",
                }}
              >
                {caution}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function TechniqueReference({ techniques, className, style }: TechniqueReferenceProps) {
  if (techniques.length === 0) {
    return (
      <div className={className} style={{ padding: "16px 4px", ...style }}>
        <p style={{ color: "var(--ink-mute)", fontSize: 13, lineHeight: 1.6 }}>
          No technique packs installed. Install Hellenistic Techniques from Packs — profection,
          zodiacal releasing, the return of the Sun — and each appears here as a reference to read
          from. (The phone runs them against a chart; here they are the procedure itself.)
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ padding: "8px 4px 40px", maxWidth: 720, margin: "0 auto", ...style }}
      className={className}
    >
      {techniques.map((technique) => (
        <TechniqueCard key={technique.key} technique={technique} />
      ))}
    </div>
  );
}
