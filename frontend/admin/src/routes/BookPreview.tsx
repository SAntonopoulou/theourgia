/**
 * Book Preview admin — print preview surface (Interior / Cover / Index toggle).
 *
 * Faithful port of ``Theourgia Book Preview.dc.html`` against the full
 * design — every panel, every switch, every value matched line-by-line:
 *
 *   · Section toggle in topbar: Interior · Cover · Index & glossary
 *   · Top-bar actions: Send to POD · Export print PDF
 *   · Stage centers a parchment specimen, with crop marks + bleed
 *     guide rendered as overlays
 *   · Interior: 312×460 chapter opener + 312×460 body w/ footnote + glossary marker
 *   · Cover: 300×460 BACK + 44×460 SPINE (vertical Cinzel text) +
 *     300×460 FRONT (gold border inset · unicursal heptagram · Cinzel
 *     title · gold rule · italic subtitle · byline)
 *   · Index: 660-wide parchment with "Index" h2 + 2-column entries
 *     (A/B/O/P sections with page-number leaders) + ❖ ornament divider
 *     + "Glossary" h2 with 3 entries
 *   · Right rail (284px): Trim size 2×2 grid (5×8 / 6×9 / 5.5×8.5 / A5),
 *     trim/page-count info card, Printer's marks switches (Crop /
 *     Bleed) with subtitles, section navigation with prev/next +
 *     4-thumbnail strip
 *   · Send to POD + Export print PDF are stubs until the
 *     print-pipeline substrate ships.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useState } from "react";

type Section = "interior" | "cover" | "index";
type Trim = "58" | "69" | "digest" | "a5";

const TRIM_LABELS: Record<Trim, string> = {
  "58": "5 × 8 in",
  "69": "6 × 9 in",
  digest: "5.5 × 8.5 in",
  a5: "148 × 210 mm",
};

function SegBtn({ value, current, onClick, label }: { value: Section; current: Section; onClick: () => void; label: string }) {
  const active = value === current;
  const style: CSSProperties = {
    padding: "6px 12px",
    fontFamily: "var(--font-ui)",
    fontSize: 12.5,
    color: active ? "var(--ink)" : "var(--ink-mute)",
    background: active ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${active ? "var(--line-2)" : "transparent"}`,
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.15s ease",
  };
  return (
    <button type="button" data-seg aria-pressed={active ? "true" : "false"} onClick={onClick} style={style}>
      {label}
    </button>
  );
}

function CropMarks() {
  const arm: CSSProperties = { position: "absolute", background: "var(--bg)" };
  return (
    <div aria-hidden="true">
      <span style={{ ...arm, top: -26, left: -26, width: 18, height: 1 }} />
      <span style={{ ...arm, top: -26, left: -26, width: 1, height: 18 }} />
      <span style={{ ...arm, top: -26, right: -26, width: 18, height: 1 }} />
      <span style={{ ...arm, top: -26, right: -26, width: 1, height: 18 }} />
      <span style={{ ...arm, bottom: -26, left: -26, width: 18, height: 1 }} />
      <span style={{ ...arm, bottom: -26, left: -26, width: 1, height: 18 }} />
      <span style={{ ...arm, bottom: -26, right: -26, width: 18, height: 1 }} />
      <span style={{ ...arm, bottom: -26, right: -26, width: 1, height: 18 }} />
    </div>
  );
}

function BleedFrame() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: -10, border: "1px dashed var(--bleed)", pointerEvents: "none" }}
    />
  );
}

function InteriorSpread() {
  return (
    <div style={{ display: "flex", boxShadow: "0 30px 70px rgba(0,0,0,.6)" }}>
      {/* LEFT — chapter opener */}
      <div
        style={{
          width: 312,
          height: 460,
          background: "var(--paper)",
          color: "var(--paper-ink)",
          padding: "46px 40px 40px",
          position: "relative",
          fontFamily: "var(--font-display)",
        }}
      >
        <div
          aria-hidden="true"
          style={{ boxShadow: "inset -22px 0 26px -22px rgba(80,60,30,.55)", position: "absolute", inset: 0, pointerEvents: "none" }}
        />
        <div style={{ textAlign: "center", marginBottom: 26, paddingTop: 30 }}>
          <span style={{ fontFamily: "var(--font-glyph)", color: "var(--paper-seal)", fontSize: 16 }}>❖</span>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--paper-soft)", margin: "16px 0 6px" }}>
            Chapter the Third
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 25, lineHeight: 1.15, margin: 0, color: "var(--paper-ink)" }}>
            The Preliminary
            <br />
            Invocation
          </h2>
          <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 14, color: "var(--paper-ink-soft)", marginTop: 8 }}>
            of the Bornless One
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 30px 24px" }}>
          <span style={{ flex: 1, height: 1, background: "var(--paper-rule)" }} />
          <span style={{ fontFamily: "var(--font-glyph)", color: "var(--paper-seal)", fontSize: 11 }}>✦</span>
          <span style={{ flex: 1, height: 1, background: "var(--paper-rule)" }} />
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.62, textAlign: "justify", margin: 0, textWrap: "pretty" } as CSSProperties}>
          <span style={{ float: "left", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 50, lineHeight: 0.74, padding: "6px 9px 0 0", color: "var(--paper-seal)" }}>T</span>
          hee I invoke, the Bornless one — who didst create the Earth and the Heavens; who didst create the Night and
          the Day. Thou art <span style={{ fontStyle: "italic" }}>Osorronophris</span>, whom no man hath seen at any time.
        </p>
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 30, display: "flex", justifyContent: "flex-start", fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--paper-soft)" }}>
          42
        </div>
      </div>

      {/* RIGHT — body w/ footnote + glossary marker */}
      <div
        style={{
          width: 312,
          height: 460,
          background: "var(--paper-2)",
          color: "var(--paper-ink)",
          padding: "46px 40px 40px",
          position: "relative",
          fontFamily: "var(--font-display)",
        }}
      >
        <div
          aria-hidden="true"
          style={{ boxShadow: "inset 22px 0 26px -22px rgba(80,60,30,.55)", position: "absolute", inset: 0, pointerEvents: "none" }}
        />
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--paper-soft)", textAlign: "right", marginBottom: 18 }}>
          The Bornless Working
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.58, textAlign: "justify", margin: "0 0 12px", textWrap: "pretty" } as CSSProperties}>
          Thou hast distinguished between the just and the unjust; thou didst make the female and the male. It is thou
          whose name the magician vibrates
          <a href="#fn1" style={{ color: "var(--paper-seal)", textDecoration: "none", fontSize: 10, verticalAlign: "super" }}>
            1
          </a>{" "}
          at the opening of the work, that the{" "}
          <span style={{ borderBottom: "1px dotted var(--paper-soft)" }} title="Glossary: Barbelo">
            Barbelo
          </span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 8, color: "var(--paper-seal)", verticalAlign: "super" }}>G</span>{" "}
          may answer.
        </p>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--paper-ink-soft)",
            textAlign: "center",
            margin: "14px 24px 0",
          }}
        >
          Ar · Thiao · Reibet ·<br />
          Atheleberseth · A · Blatha
        </p>
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 46 }}>
          <div style={{ width: 64, height: 1, background: "var(--paper-rule)", marginBottom: 7 }} />
          <p style={{ fontSize: 10, lineHeight: 1.5, color: "var(--paper-ink-soft)", margin: 0 }}>
            <span style={{ color: "var(--paper-seal)", verticalAlign: "super", fontSize: 8 }}>1</span> On vibration, see
            Regardie, <span style={{ fontStyle: "italic" }}>The Tree of Life</span>, p. 118. The barbarous names are
            not to be translated.
          </p>
        </div>
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 30, display: "flex", justifyContent: "flex-end", fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--paper-soft)" }}>
          43
        </div>
      </div>
    </div>
  );
}

function CoverSpread() {
  // Bars verbatim from the .dc.html barcode decoration.
  const barWidths = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1];
  return (
    <div style={{ display: "flex", boxShadow: "0 30px 70px rgba(0,0,0,.6)" }}>
      {/* BACK */}
      <div
        style={{
          width: 300,
          height: 460,
          background: "var(--cover-chrome-2)",
          color: "var(--cover-ink)",
          padding: "40px 34px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 15, lineHeight: 1.6, color: "var(--cover-soft)", margin: "0 0 18px" }}>
          "A working edition for the practitioner — the invocation set plainly, with the apparatus a serious student
          needs and nothing he does not."
        </p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 13, lineHeight: 1.65, color: "var(--cover-soft)", margin: 0 }}>
          This volume gathers the Preliminary Invocation, its history across the magical papyri, and a tested order of
          practice — annotated, sourced, and free of embellishment.
        </p>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
          <div aria-hidden="true" style={{ display: "flex", gap: 1.5, alignItems: "flex-end", height: 42 }}>
            {barWidths.map((w, i) => (
              <span key={i} style={{ width: w, height: "100%", background: "var(--cover-ink)" }} />
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--cover-mute)", textAlign: "right" }}>
            ISBN 978-0-00-000000-0
            <br />
            Theourgia Press
          </div>
        </div>
      </div>

      {/* SPINE */}
      <div
        style={{
          width: 44,
          height: 460,
          background: "var(--cover-chrome-3)",
          borderLeft: "1px solid rgba(0,0,0,.4)",
          borderRight: "1px solid rgba(0,0,0,.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontFamily: "'Cinzel', serif",
            fontSize: 14,
            letterSpacing: "0.12em",
            color: "var(--gold)",
            whiteSpace: "nowrap",
          }}
        >
          The Bornless Working &nbsp;·&nbsp; Theophrastos
        </div>
      </div>

      {/* FRONT */}
      <div
        style={{
          width: 300,
          height: 460,
          background: "var(--cover-chrome-2)",
          color: "var(--cover-ink)",
          padding: "46px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 14, border: "1px solid var(--gold-soft)", pointerEvents: "none" }}
        />
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--cover-mute)", marginBottom: 28 }}>
          A Practical Edition
        </div>
        <svg width="62" height="62" viewBox="0 0 40 40" fill="none" style={{ marginBottom: 26 }} aria-hidden="true">
          <circle cx="20" cy="20" r="18" stroke="var(--gold)" strokeWidth="1" />
          <circle cx="20" cy="20" r="12.5" stroke="var(--gold)" strokeWidth=".7" opacity=".6" />
          <path
            d="M20 4.5 L23.5 16 L35 16 L25.7 23 L29.3 34.5 L20 27.5 L10.7 34.5 L14.3 23 L5 16 L16.5 16 Z"
            fill="none"
            stroke="var(--gold)"
            strokeWidth=".8"
            strokeLinejoin="round"
            opacity=".85"
          />
        </svg>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 27, lineHeight: 1.2, margin: 0, color: "var(--cover-ink)" }}>
          THE BORNLESS
          <br />
          WORKING
        </h1>
        <div style={{ width: 40, height: 1, background: "var(--gold)", margin: "18px 0" }} />
        <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 15, color: "var(--cover-soft)" }}>
          An Invocation, Annotated
        </div>
        <div style={{ marginTop: "auto", fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.04em", color: "var(--cover-ink)" }}>
          Theophrastos
        </div>
      </div>
    </div>
  );
}

function IndexAndGlossary() {
  return (
    <div
      style={{
        width: 660,
        flex: "none",
        background: "var(--paper)",
        color: "var(--paper-ink)",
        boxShadow: "0 30px 70px rgba(0,0,0,.6)",
        padding: "56px 60px",
        fontFamily: "var(--font-display)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 25, margin: 0 }}>Index</h2>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--paper-soft)",
            padding: "4px 11px",
            border: "1px solid var(--paper-rule)",
            borderRadius: 999,
          }}
        >
          Auto-generated · 38 entries
        </span>
      </div>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--paper-soft)", margin: "0 0 22px" }}>
        Compiled from marked terms. Review before printing — entries can be merged, hidden, or added by hand.
      </p>
      <div style={{ columns: 2, columnGap: 48, fontSize: 14, lineHeight: 1.85 }}>
        {[
          {
            letter: "A",
            entries: [
              ["Adonai", "17, 42, 51"],
              ["Agla", "19"],
              ["Aeon, the", "8–11"],
            ],
          },
          {
            letter: "B",
            entries: [
              ["Barbelo", "43"],
              ["Bornless one", "3, 41–46"],
            ],
          },
          {
            letter: "O",
            entries: [["Osorronophris", "42"]],
          },
          {
            letter: "P",
            entries: [
              ["Pentagram, banishing", "22–25"],
              ["Papyri, magical", "5, 12"],
            ],
          },
        ].map((section) => (
          <div key={section.letter} style={{ breakInside: "avoid", marginBottom: 14 } as CSSProperties}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.1em", color: "var(--paper-seal)", marginBottom: 4 }}>
              {section.letter}
            </div>
            {section.entries.map(([term, pages]) => (
              <div key={term} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{term}</span>
                <span style={{ color: "var(--paper-soft)", fontVariantNumeric: "tabular-nums" } as CSSProperties}>{pages}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "18px 0 24px" }}>
        <span style={{ flex: 1, height: 1, background: "var(--paper-rule)" }} />
        <span style={{ fontFamily: "var(--font-glyph)", color: "var(--paper-seal)", fontSize: 13 }}>❖</span>
        <span style={{ flex: 1, height: 1, background: "var(--paper-rule)" }} />
      </div>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, margin: "0 0 16px" }}>Glossary</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14, lineHeight: 1.55 }}>
        <div>
          <span style={{ fontWeight: 700 }}>Barbelo</span>
          <span style={{ color: "var(--paper-ink-soft)" }}> — in Gnostic cosmology, the first emanation of the Father; the divine Mother-figure.</span>
        </div>
        <div>
          <span style={{ fontWeight: 700 }}>Osorronophris</span>
          <span style={{ color: "var(--paper-ink-soft)" }}> — a name of the Bornless One in the Graeco-Egyptian papyri; "Osiris made perfect."</span>
        </div>
        <div>
          <span style={{ fontWeight: 700 }}>Vibration</span>
          <span style={{ color: "var(--paper-ink-soft)" }}> — the resonant intonation of a divine name, felt in the body rather than merely spoken.</span>
        </div>
      </div>
    </div>
  );
}

function MarkSwitch({ on, onToggle, title, subtitle }: { on: boolean; onToggle: () => void; title: string; subtitle: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 2px",
        textAlign: "left",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        width: "100%",
        color: "inherit",
        fontFamily: "inherit",
      }}
    >
      <span
        data-mark
        aria-pressed={on ? "true" : "false"}
        style={{
          position: "relative",
          width: 38,
          height: 22,
          borderRadius: 999,
          border: `1px solid ${on ? "var(--gold)" : "var(--line-2)"}`,
          background: on ? "var(--gold)" : "var(--bg-3)",
          flex: "none",
          transition: "all 0.16s",
        }}
      >
        <span
          className="kn"
          style={{
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: on ? "var(--bg)" : "var(--ink-mute)",
            transition: "all 0.16s",
          }}
        />
      </span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 14, color: "var(--ink)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--ink-mute)" }}>{subtitle}</span>
      </span>
    </button>
  );
}

function TrimButton({ value, current, onClick, label }: { value: Trim; current: Trim; onClick: () => void; label: string }) {
  const active = value === current;
  return (
    <button
      type="button"
      data-trim
      aria-pressed={active ? "true" : "false"}
      onClick={onClick}
      style={{
        padding: 9,
        border: `1px solid ${active ? "var(--gold)" : "var(--line)"}`,
        borderRadius: "var(--r-md)",
        background: active ? "var(--gold-soft)" : "var(--bg)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: active ? "var(--ink)" : "var(--ink-soft)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line-2)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)";
      }}
    >
      {label}
    </button>
  );
}

export function BookPreview() {
  const [section, setSection] = useState<Section>("interior");
  const [trim, setTrim] = useState<Trim>("69");
  const [crop, setCrop] = useState(true);
  const [bleed, setBleed] = useState(true);

  useTopbar(
    () => ({
      title: "Book preview",
      subtitle: "The Bornless Working · a practical edition",
      before: (
        <div role="group" aria-label="Section" style={{ display: "flex", gap: 2, padding: 3, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-2)" }}>
          <SegBtn value="interior" current={section} onClick={() => setSection("interior")} label="Interior" />
          <SegBtn value="cover" current={section} onClick={() => setSection("cover")} label="Cover" />
          <SegBtn value="index" current={section} onClick={() => setSection("index")} label="Index & glossary" />
        </div>
      ),
      after: (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-md)",
              fontSize: 13,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 7l9-4 9 4-9 4z" />
              <path d="M3 7v10l9 4 9-4V7M12 11v10" />
            </svg>
            Send to POD
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: "var(--r-md)",
              background: "var(--gold)",
              color: "var(--bg)",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z" />
            </svg>
            Export print PDF
          </button>
        </div>
      ),
    }),
    [section],
  );

  const navLabel = section === "cover" ? "Cover" : section === "index" ? "Back matter" : "Spread";
  const navValue = section === "cover" ? "Back · Spine · Front" : section === "index" ? "Index · pp. 198–204" : "3 of 24 · pp. 42–43";

  return (
    <div
      className="book-preview-root"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: 1,
        margin: "0 -28px",
        background: "var(--bg-sunk)",
        // Paper tokens (parchment for Interior + Index)
        ["--paper" as string]: "#F2E9D4",
        ["--paper-2" as string]: "#EEE4CC",
        ["--paper-ink" as string]: "#2B2114",
        ["--paper-ink-soft" as string]: "#5B4B33",
        ["--paper-soft" as string]: "#8A7857",
        ["--paper-rule" as string]: "#C9B68C",
        ["--paper-seal" as string]: "#8C2F23",
        // Cover tokens — uses the chrome palette (dark cover stock, gold foil)
        ["--cover-chrome-2" as string]: "var(--bg-2)",
        ["--cover-chrome-3" as string]: "var(--bg-3)",
        ["--cover-ink" as string]: "var(--ink)",
        ["--cover-soft" as string]: "var(--ink-soft)",
        ["--cover-mute" as string]: "var(--ink-mute)",
        ["--gold" as string]: "var(--accent)",
        ["--gold-soft" as string]: "var(--accent-soft)",
        ["--bleed" as string]: "#5C8B8C",
      }}
    >
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* STAGE */}
        <div
          className="surround scroll"
          style={{
            flex: 1,
            overflow: "auto",
            background: "var(--bg-sunk)",
            padding: 48,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            minHeight: 0,
          }}
        >
          <div style={{ position: "relative", flex: "none" }}>
            {crop ? <CropMarks /> : null}
            {bleed ? <BleedFrame /> : null}
            {section === "interior" ? <InteriorSpread /> : null}
            {section === "cover" ? <CoverSpread /> : null}
            {section === "index" ? <IndexAndGlossary /> : null}
          </div>
        </div>

        {/* RIGHT RAIL */}
        <aside
          className="rail scroll"
          style={{
            width: 284,
            flex: "none",
            overflowY: "auto",
            background: "var(--bg-2)",
            borderLeft: "1px solid var(--line)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          {/* Trim size */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 11,
              }}
            >
              Trim size
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              <TrimButton value="58" current={trim} onClick={() => setTrim("58")} label="5 × 8 in" />
              <TrimButton value="69" current={trim} onClick={() => setTrim("69")} label="6 × 9 in" />
              <TrimButton value="digest" current={trim} onClick={() => setTrim("digest")} label="5.5 × 8.5" />
              <TrimButton value="a5" current={trim} onClick={() => setTrim("a5")} label="A5" />
            </div>
            <div
              style={{
                marginTop: 11,
                padding: "10px 12px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg)",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-soft)",
                lineHeight: 1.5,
              }}
            >
              Trim <span style={{ color: "var(--ink)" }}>{TRIM_LABELS[trim]}</span> · bleed 0.125 in
              <br />
              Page count 224 · perfect bound
            </div>
          </div>

          {/* Printer's marks */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 11,
              }}
            >
              Printer's marks
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <MarkSwitch on={crop} onToggle={() => setCrop(!crop)} title="Crop marks" subtitle="Where the page is cut" />
              <MarkSwitch on={bleed} onToggle={() => setBleed(!bleed)} title="Bleed guide" subtitle="0.125 in safe overrun" />
            </div>
          </div>

          {/* Navigation */}
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                }}
              >
                {navLabel}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                aria-label="Previous"
                style={{
                  width: 36,
                  height: 36,
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md)",
                  color: "var(--ink-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <div style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink)" }}>{navValue}</div>
              <button
                type="button"
                aria-label="Next"
                style={{
                  width: 36,
                  height: 36,
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md)",
                  color: "var(--ink-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            {/* page thumbnail strip — 4 slots, second slot highlighted gold */}
            <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
              <span style={{ flex: 1, height: 40, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--bg)" }} />
              <span style={{ flex: 1, height: 40, border: "1px solid var(--gold)", borderRadius: "var(--r-sm)", background: "var(--gold-soft)" }} />
              <span style={{ flex: 1, height: 40, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--bg)" }} />
              <span style={{ flex: 1, height: 40, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--bg)" }} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
