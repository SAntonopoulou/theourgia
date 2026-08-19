/**
 * ElectionReference — the web reference for the election rules.
 *
 * Not an elector: the phone scrubs a chart through time to find the hours a
 * matter may be begun. Here the rules are shown as themselves — the sixteen
 * matters, each with its place and significators, and the five rulesets read
 * clause by clause, every clause with the reason the corpus gives it.
 */

import type { CSSProperties } from "react";

import type { ElectionTemplates, Matter, Ruleset } from "./packElections.js";

export interface ElectionReferenceProps {
  templates: ElectionTemplates;
  className?: string;
  style?: CSSProperties;
}

function titleCase(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function MatterRow({ matter, rulesetName }: { matter: Matter; rulesetName: string }) {
  return (
    <li
      style={{
        listStyle: "none",
        marginBottom: 12,
        paddingBottom: 10,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 15 }}>{matter.name}</span>
        {matter.house > 0 && (
          <span
            style={{
              fontSize: 11.5,
              color: "var(--accent)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: "1px 8px",
              whiteSpace: "nowrap",
            }}
          >
            {matter.house}
            <sup>{ordinal(matter.house)}</sup> house
          </span>
        )}
        {matter.significators.length > 0 && (
          <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>
            {matter.significators.map(titleCase).join(", ")}
          </span>
        )}
      </div>
      {matter.summary && (
        <p
          style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-soft)", margin: "4px 0 0" }}
        >
          {matter.summary}
        </p>
      )}
      {rulesetName && (
        <div style={{ fontSize: 11.5, color: "var(--ink-mute)", marginTop: 3 }}>
          read as — {rulesetName}
        </div>
      )}
    </li>
  );
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function RulesetCard({ ruleset }: { ruleset: Ruleset }) {
  return (
    <section
      style={{
        marginBottom: 22,
        paddingBottom: 16,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, margin: "0 0 4px" }}>
        {ruleset.name}
      </h3>
      {ruleset.summary && (
        <p
          style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--ink-mute)", margin: "0 0 10px" }}
        >
          {ruleset.summary}
        </p>
      )}
      <ul style={{ padding: 0, margin: 0 }}>
        {ruleset.clauses.map((clause, i) => (
          <li
            key={`${clause.condition}-${i}`}
            style={{ listStyle: "none", marginBottom: 8, display: "flex", gap: 8 }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: clause.veto ? "var(--accent)" : "var(--ink-mute)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-sm, 4px)",
                padding: "1px 6px",
                whiteSpace: "nowrap",
                height: "fit-content",
                marginTop: 2,
              }}
            >
              {clause.veto ? "required" : "preferred"}
            </span>
            <span style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-soft)" }}>
              {clause.condition && (
                <span style={{ color: "var(--ink)" }}>{clause.condition}. </span>
              )}
              {clause.because}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ElectionReference({ templates, className, style }: ElectionReferenceProps) {
  const { matters, rulesets } = templates;
  if (matters.length === 0 && rulesets.length === 0) {
    return (
      <div className={className} style={{ padding: "16px 4px", ...style }}>
        <p style={{ color: "var(--ink-mute)", fontSize: 13, lineHeight: 1.6 }}>
          No election rules installed. Install Hellenistic Elections from Packs — the sixteen
          matters and the rulesets that read them — and they appear here as reference. (The phone
          finds the hours against a chart; here the rules are shown as themselves.)
        </p>
      </div>
    );
  }

  const rulesetName = new Map(rulesets.map((r) => [r.id, r.name]));
  return (
    <div
      style={{ padding: "8px 4px 40px", maxWidth: 720, margin: "0 auto", ...style }}
      className={className}
    >
      {matters.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: "0 0 12px" }}>
            The matters
          </h2>
          <ul style={{ padding: 0, margin: 0 }}>
            {matters.map((matter) => (
              <MatterRow
                key={matter.key}
                matter={matter}
                rulesetName={rulesetName.get(matter.ruleset) ?? ""}
              />
            ))}
          </ul>
        </section>
      )}

      {rulesets.length > 0 && (
        <section>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: "0 0 12px" }}>
            The rulesets
          </h2>
          {rulesets.map((ruleset) => (
            <RulesetCard key={ruleset.id} ruleset={ruleset} />
          ))}
        </section>
      )}
    </div>
  );
}
