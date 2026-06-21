/**
 * Transliterate admin — type in Latin, set in Greek or Hebrew.
 *
 * Faithful port of ``Theourgia Transliterate.dc.html``. Maps are
 * digraph-aware and identical to the source: ``GR`` (Greek) handles
 * ``th/ph/ch/ps``; ``HE`` (Hebrew) handles ``sh/ch/ts/th/ph``. Final
 * sigma normalisation runs on Greek output only.
 *
 * Default input ``Theophrastos`` — one of the demo personae (Theo).
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useState } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

type Script = "greek" | "hebrew";

const GR: Record<string, string> = {
  th: "θ", ph: "φ", ch: "χ", ps: "ψ",
  a: "α", b: "β", g: "γ", d: "δ", e: "ε", z: "ζ", h: "η", i: "ι",
  k: "κ", l: "λ", m: "μ", n: "ν", x: "ξ", o: "ο", p: "π", r: "ρ",
  s: "σ", t: "τ", u: "υ", y: "υ", w: "ω", c: "κ", f: "φ", v: "β", q: "κ",
};
const HE: Record<string, string> = {
  sh: "ש", ch: "ח", ts: "צ", th: "ת", ph: "פ",
  a: "א", b: "ב", g: "ג", d: "ד", e: "ה", h: "ה", v: "ו", w: "ו",
  u: "ו", o: "ו", z: "ז", t: "ט", y: "י", i: "י", k: "כ", l: "ל",
  m: "מ", n: "נ", s: "ס", p: "פ", q: "ק", r: "ר",
};
const DIGRAPHS_GR = ["th", "ph", "ch", "ps"];
const DIGRAPHS_HE = ["sh", "ch", "ts", "th", "ph"];

const GREEK_PALETTE = "α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω ϊ ΐ".split(" ");
const HEBREW_PALETTE = "א ב ג ד ה ו ז ח ט י כ ל מ נ ס ע פ צ ק ר ש ת ך ם ן ץ".split(" ");

function transliterate(text: string, script: Script): string {
  const map = script === "greek" ? GR : HE;
  const digraphs = script === "greek" ? DIGRAPHS_GR : DIGRAPHS_HE;
  const s = (text || "").toLowerCase();
  let out = "";
  let i = 0;
  while (i < s.length) {
    const two = s.substr(i, 2);
    if (digraphs.includes(two)) {
      out += map[two];
      i += 2;
      continue;
    }
    const c = s[i]!;
    if (c === " ") {
      out += " ";
      i++;
      continue;
    }
    out += map[c] !== undefined ? map[c] : /[a-z]/.test(c) ? "" : c;
    i++;
  }
  if (script === "greek") out = out.replace(/σ(?=\s|$)/g, "ς");
  return out;
}

export function Transliterate() {
  const [script, setScript] = useState<Script>("greek");
  const [input, setInput] = useState<string>("Theophrastos");

  const output = transliterate(input, script) || "—";
  const scriptName = script === "greek" ? "Greek" : "Hebrew";
  const outFont = script === "greek" ? "var(--font-display)" : "var(--font-hebrew)";
  const dir = script === "greek" ? "ltr" : "rtl";
  const hint =
    script === "greek"
      ? "th→θ · ph→φ · ch→χ · ps→ψ · h→η · w→ω"
      : "sh→ש · ch→ח · ts→צ · th→ת · ph→פ";
  const palette = script === "greek" ? GREEK_PALETTE : HEBREW_PALETTE;

  useTopbar(
    () => ({
      title: "Transliteration",
      subtitle: "Type in Latin, set the names in their own script",
      before: (
        <div role="group" aria-label="Script" style={{ display: "flex", gap: 2, padding: 3, border: `1px solid ${LINE}`, borderRadius: 8, background: "var(--bg-2)" }}>
          {(["greek", "hebrew"] as const).map((s) => {
            const active = script === s;
            const style: CSSProperties = {
              padding: "5px 13px",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: active ? "var(--ink)" : "var(--ink-mute)",
              background: active ? "var(--accent-soft)" : "transparent",
              border: `1px solid ${active ? LINE_2 : "transparent"}`,
              borderRadius: 6,
              cursor: "pointer",
            };
            return (
              <button key={s} type="button" data-script aria-pressed={active ? "true" : "false"} onClick={() => setScript(s)} style={style}>
                {s === "greek" ? "Greek" : "Hebrew"}
              </button>
            );
          })}
        </div>
      ),
    }),
    [script],
  );

  return (
    <main
      className="transliterate-root scroll"
      style={{ overflowY: "auto", minHeight: 0, padding: "34px 28px 60px" }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* INPUT */}
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 9 }}>
          Romanized input
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            border: `1px solid ${LINE_2}`,
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            marginBottom: 8,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mute)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true">
            <path d="M4 7V5h16v2M9 19h6M12 5v14" />
          </svg>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Romanized text"
            placeholder="theophrastos…"
            style={{
              flex: 1,
              fontFamily: "var(--font-serif)",
              fontSize: 19,
              color: "var(--ink)",
              minWidth: 0,
              background: "transparent",
              border: "none",
              outline: "none",
            }}
          />
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)", marginBottom: 24 }}>
          Digraphs map:{" "}
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-soft)" }}>{hint}</span>
        </div>

        {/* OUTPUT */}
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 9 }}>
          {scriptName}
        </div>
        <div
          style={{
            minHeight: 88,
            display: "flex",
            alignItems: "center",
            padding: "18px 22px",
            border: `1px solid var(--accent)`,
            borderRadius: "var(--r-md)",
            background: "var(--accent-soft)",
            marginBottom: 8,
          }}
        >
          <span
            dir={dir}
            lang={script === "greek" ? "el" : "he"}
            style={{
              fontFamily: outFont,
              fontSize: 38,
              lineHeight: 1.3,
              color: "var(--ink)",
              wordBreak: "break-word",
            }}
          >
            {output}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 30 }}>
          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) void navigator.clipboard.writeText(output);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--accent)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            Copy
          </button>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
            A guide, not gospel — adjust by hand where the tradition asks.
          </span>
        </div>

        {/* PALETTE */}
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 11 }}>
          {scriptName} palette
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {palette.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setInput((prev) => prev + ch)}
              style={{
                width: 46,
                height: 46,
                border: `1px solid ${LINE}`,
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                fontFamily: outFont,
                fontSize: 22,
                color: "var(--ink-soft)",
                cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)";
              }}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
