/**
 * Oracle admin — I Ching + Geomancy casts.
 *
 * Faithful port of ``Theourgia Oracle.dc.html``. The design provides
 * working engine implementations (marked ACCURATE) for both:
 *   · I Ching — 3-coin cast per line, King Wen sequence lookup
 *   · Geomancy — 4 Mothers → 4 Daughters (transpose) → 4 Nieces
 *     (combine) → 2 Witnesses → Judge
 *
 * Custom token: `--div: #7E91CE` (= `--info` / `--c-divination`) is
 * declared in the source `<style>` block; scoped here as the same
 * shared token.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useMemo, useState } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

type Method = "iching" | "geo";

// ════════════════════════════════════════════════════════════════════════════
// I CHING
// ════════════════════════════════════════════════════════════════════════════
const TRIGRAMS: { n: string; g: string }[] = [
  { n: "Earth", g: "☷" },
  { n: "Thunder", g: "☳" },
  { n: "Water", g: "☵" },
  { n: "Lake", g: "☱" },
  { n: "Mountain", g: "☶" },
  { n: "Fire", g: "☲" },
  { n: "Wind", g: "☴" },
  { n: "Heaven", g: "☰" },
];
const TRIGRAM_PINYIN = ["Kun", "Zhen", "Kan", "Dui", "Gen", "Li", "Xun", "Qian"];
const KW_TO = ["Qian", "Zhen", "Kan", "Gen", "Kun", "Xun", "Li", "Dui"];
const KW: Record<string, number[]> = {
  Qian: [1, 34, 5, 26, 11, 9, 14, 43],
  Zhen: [25, 51, 3, 27, 24, 42, 21, 17],
  Kan: [6, 40, 29, 4, 7, 59, 64, 47],
  Gen: [33, 62, 39, 52, 15, 53, 56, 31],
  Kun: [12, 16, 8, 23, 2, 20, 35, 45],
  Xun: [44, 32, 48, 18, 46, 57, 50, 28],
  Li: [13, 55, 63, 22, 36, 37, 30, 49],
  Dui: [10, 54, 60, 41, 19, 61, 38, 58],
};
const HEX_NAMES = [
  "",
  "The Creative", "The Receptive", "Difficulty at the Beginning", "Youthful Folly", "Waiting", "Conflict",
  "The Army", "Holding Together", "Taming Power of the Small", "Treading", "Peace", "Standstill",
  "Fellowship", "Great Possession", "Modesty", "Enthusiasm", "Following", "Work on the Decayed",
  "Approach", "Contemplation", "Biting Through", "Grace", "Splitting Apart", "Return",
  "Innocence", "Taming Power of the Great", "Nourishment", "Great Preponderance", "The Abysmal Water",
  "The Clinging Fire", "Influence", "Duration", "Retreat", "Power of the Great", "Progress",
  "Darkening of the Light", "The Family", "Opposition", "Obstruction", "Deliverance", "Decrease",
  "Increase", "Breakthrough", "Coming to Meet", "Gathering Together", "Pushing Upward", "Oppression",
  "The Well", "Revolution", "The Cauldron", "The Arousing Thunder", "Keeping Still", "Development",
  "The Marrying Maiden", "Abundance", "The Wanderer", "The Gentle Wind", "The Joyous Lake",
  "Dispersion", "Limitation", "Inner Truth", "Small Preponderance", "After Completion", "Before Completion",
];
const HEX_IMAGES: Record<number, string> = {
  1: "The movement of heaven is full of power. Strong and untiring — act, but in accord with the time.",
  63: "Water over fire: each thing in its place, yet completion already breeds the next disorder. Hold the order with care.",
  64: "Fire over water: not yet across. The crossing is possible but the footing matters — proceed deliberately.",
};

type Line = 6 | 7 | 8 | 9;
const isYang = (v: Line) => (v === 7 || v === 9 ? 1 : 0);
const isChanging = (v: Line) => v === 6 || v === 9;

function trigValue(a: number, b: number, c: number): number {
  return a + 2 * b + 4 * c;
}
function hexFor(lines: Line[]): { num: number; lower: string; upper: string } {
  const lower = TRIGRAM_PINYIN[trigValue(isYang(lines[0]!), isYang(lines[1]!), isYang(lines[2]!))]!;
  const upper = TRIGRAM_PINYIN[trigValue(isYang(lines[3]!), isYang(lines[4]!), isYang(lines[5]!))]!;
  const num = KW[lower]![KW_TO.indexOf(upper)]!;
  return { num, lower, upper };
}
function composition(lines: Line[]): string {
  const upper = TRIGRAMS[trigValue(isYang(lines[3]!), isYang(lines[4]!), isYang(lines[5]!))]!;
  const lower = TRIGRAMS[trigValue(isYang(lines[0]!), isYang(lines[1]!), isYang(lines[2]!))]!;
  return `${upper.g} ${upper.n} over ${lower.g} ${lower.n}`;
}
function imageFor(num: number): string {
  return (
    HEX_IMAGES[num] ??
    `The cast stands as ${HEX_NAMES[num]}. Read it against your question, and against the lines that move.`
  );
}

function castOneLine(): Line {
  // 3 coins, heads = 1 (yang) tails = 0; sum 0..3; value = 6 + heads → 6..9
  let heads = 0;
  for (let i = 0; i < 3; i++) heads += Math.random() < 0.5 ? 1 : 0;
  return (6 + heads) as Line;
}

function HexLine({ value, marked }: { value: Line; marked?: boolean }) {
  const yang = isYang(value) === 1;
  const changing = marked && isChanging(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {yang ? (
        <div style={{ width: 108, height: 11, borderRadius: 2, background: "var(--ink)" }} />
      ) : (
        <div style={{ width: 108, height: 11, display: "flex", justifyContent: "space-between" }}>
          <div style={{ width: 46, height: 11, borderRadius: 2, background: "var(--ink)" }} />
          <div style={{ width: 46, height: 11, borderRadius: 2, background: "var(--ink)" }} />
        </div>
      )}
      {changing ? (
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
      ) : (
        <div style={{ width: 8 }} />
      )}
    </div>
  );
}

function Hexagram({ lines, marked }: { lines: Line[]; marked?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {[5, 4, 3, 2, 1, 0].map((i) => (
        <HexLine key={i} value={lines[i]!} marked={marked} />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GEOMANCY
// ════════════════════════════════════════════════════════════════════════════
type Figure = [number, number, number, number]; // 1 or 2 per row

const GEO_FIG_NAMES: Record<string, string> = {
  "1111": "Via",
  "1112": "Cauda Draconis",
  "1121": "Puer",
  "1122": "Fortuna Minor",
  "1211": "Puella",
  "1212": "Amissio",
  "1221": "Carcer",
  "1222": "Laetitia",
  "2111": "Caput Draconis",
  "2112": "Conjunctio",
  "2121": "Acquisitio",
  "2122": "Rubeus",
  "2211": "Fortuna Major",
  "2212": "Albus",
  "2221": "Tristitia",
  "2222": "Populus",
};

const GEO_MEANINGS: Record<string, string> = {
  Via: "The Way — change, a journey, things in motion. Yes, but expect the road to turn.",
  Populus: "The People — a gathering, no clear single will. Wait; the matter is not yours alone.",
  Acquisitio: "Gain — what is sought is obtained. A favourable verdict for the venture.",
  Amissio: "Loss — what is held slips away. Better to wait, or to let go cleanly.",
  "Fortuna Major": "Greater Fortune — strong, lasting success won by one’s own power.",
  "Fortuna Minor": "Lesser Fortune — swift success, but fleeting. Move quickly and lightly.",
  Laetitia: "Joy — upward movement, health, good cheer. The omen is bright.",
  Tristitia: "Sorrow — things bend downward; patience and endurance are asked.",
  Conjunctio: "Union — a meeting, a joining of matters. Favourable for partnership.",
  Carcer: "The Prison — binding, delay, isolation. Hold; the time is not free.",
  Albus: "White — peace and clarity, but slow. Wise counsel, cool judgement.",
  Rubeus: "Red — passion, haste, disorder. An unfavourable, unstable verdict.",
  Puer: "The Boy — force, ardour, rash energy. Good for contests, poor for peace.",
  Puella: "The Girl — harmony, attraction, gentleness. Favourable in most matters.",
  "Caput Draconis": "The Dragon’s Head — a threshold, a good beginning. Enter.",
  "Cauda Draconis": "The Dragon’s Tail — an ending, an exit. Good only for letting go.",
};

function figName(f: Figure): string {
  return GEO_FIG_NAMES[f.join("")] ?? "—";
}
function combine(a: Figure, b: Figure): Figure {
  return a.map((r, i) => (r === b[i] ? 2 : 1)) as Figure;
}
function castMother(): Figure {
  return [1, 2, 3, 4].map(() => (Math.random() < 0.5 ? 1 : 2)) as Figure;
}

function GeoFigDraw({ fig, color }: { fig: Figure; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      {fig.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 10, height: 8 }}>
          {r === 1 ? (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color ?? "var(--ink-soft)" }} />
          ) : (
            <>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: color ?? "var(--ink-soft)" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: color ?? "var(--ink-soft)" }} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function GeoFigCard({ fig, label, accent }: { fig: Figure; label: string; accent?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "14px 8px",
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
      }}
    >
      <div style={{ minHeight: 44, display: "flex", alignItems: "center" }}>
        <GeoFigDraw fig={fig} color={accent ? "var(--div)" : "var(--ink-soft)"} />
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--ink)", textAlign: "center", lineHeight: 1.1 }}>
        {figName(fig)}
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-mute)" }}>
        {label}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════

export function Oracle() {
  const [method, setMethod] = useState<Method>("iching");
  const [lines, setLines] = useState<Line[]>([7, 8, 7, 9, 8, 6]);
  const [mothers, setMothers] = useState<Figure[]>([
    [1, 2, 1, 1],
    [2, 1, 1, 2],
    [1, 1, 2, 2],
    [2, 2, 1, 1],
  ]);

  // — I Ching derived —
  const { prim, rel, changeIdx } = useMemo(() => {
    const prim = hexFor(lines);
    const relLines = lines.map((v) => (isChanging(v) ? ((v === 9 ? 8 : 7) as Line) : v)) as Line[];
    const rel = { ...hexFor(relLines), lines: relLines };
    const changeIdx = lines.map((v, i) => (isChanging(v) ? i + 1 : 0)).filter(Boolean);
    return { prim: { ...prim, lines }, rel, changeIdx };
  }, [lines]);
  const hasChange = changeIdx.length > 0;

  // — Geomancy derived —
  const { daughters, rWit, lWit, judge } = useMemo(() => {
    const daughters: Figure[] = [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => mothers[j]![i]!)) as Figure[];
    const nieces: Figure[] = [
      combine(mothers[0]!, mothers[1]!),
      combine(mothers[2]!, mothers[3]!),
      combine(daughters[0]!, daughters[1]!),
      combine(daughters[2]!, daughters[3]!),
    ];
    const rWit = combine(nieces[0]!, nieces[1]!);
    const lWit = combine(nieces[2]!, nieces[3]!);
    const judge = combine(rWit, lWit);
    return { daughters, rWit, lWit, judge };
  }, [mothers]);

  useTopbar(
    () => ({
      title: "Oracle",
      subtitle: "Cast and read — the answer is in the question",
      before: (
        <div role="group" aria-label="Method" style={{ display: "flex", gap: 2, padding: 3, border: `1px solid ${LINE}`, borderRadius: 8, background: "var(--bg-2)" }}>
          {(["iching", "geo"] as const).map((m) => {
            const active = method === m;
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
              <button key={m} type="button" data-method aria-pressed={active ? "true" : "false"} onClick={() => setMethod(m)} style={style}>
                {m === "iching" ? "I Ching" : "Geomancy"}
              </button>
            );
          })}
        </div>
      ),
    }),
    [method],
  );

  return (
    <div
      className="oracle-root scroll"
      style={{
        overflowY: "auto",
        minHeight: 0,
        padding: "28px 28px 60px",
        // Per Theourgia Oracle.dc.html line 23:
        //   --div: #7E91CE (= --c-divination / --info)
        //   --div-soft: rgba(126,145,206,.14)
        ["--div" as string]: "var(--c-divination)",
        ["--div-soft" as string]: "color-mix(in srgb, var(--c-divination) 14%, transparent)",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Question card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            border: `1px solid ${LINE_2}`,
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            marginBottom: 28,
          }}
        >
          <span style={{ fontFamily: "var(--font-glyph)", color: "var(--div)", fontSize: 16, flex: "none" }} aria-hidden="true">❖</span>
          <span style={{ flex: 1, fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 17, color: "var(--ink)" }}>
            Should I bring the working forward to the solstice?
          </span>
          <button
            type="button"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
              flex: "none",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)"; }}
          >
            Edit
          </button>
        </div>

        {/* I CHING */}
        {method === "iching" ? (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 30 }}>
            <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
              <div style={{ display: "flex", gap: 30, alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <Hexagram lines={lines} marked />
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-mute)", marginTop: 4 }}>cast</div>
                </div>
                {hasChange ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", alignSelf: "center", color: "var(--ink-mute)" }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <Hexagram lines={rel.lines} />
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-mute)", marginTop: 4 }}>becoming</div>
                    </div>
                  </>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setLines([0, 1, 2, 3, 4, 5].map(castOneLine))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "11px 24px",
                  borderRadius: "var(--r-md)",
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 14,
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
                </svg>
                Cast the coins
              </button>
            </div>

            <div style={{ flex: "1 1 360px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 11, marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--accent)" }}>{prim.num}</span>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, margin: 0, lineHeight: 1.1 }}>{HEX_NAMES[prim.num]}</h2>
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-mute)", marginBottom: 18 }}>{composition(lines)}</div>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: 1.65, color: "var(--ink-soft)", margin: "0 0 20px" }}>
                {imageFor(prim.num)}
              </p>
              {hasChange ? (
                <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-md)", background: "var(--bg-2)", padding: "16px 18px" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 10.5,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--ink-mute)",
                      marginBottom: 8,
                    }}
                  >
                    Changing lines · {changeIdx.join(", ")}
                  </div>
                  <p style={{ fontFamily: "var(--font-serif)", fontSize: 14.5, lineHeight: 1.55, color: "var(--ink-soft)", margin: "0 0 12px" }}>
                    The moving lines carry the reading from the cast hexagram toward what it is becoming.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, paddingTop: 12, borderTop: `1px solid ${LINE}` }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--accent)" }}>{rel.num}</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.1 }}>{HEX_NAMES[rel.num]}</div>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>{composition(rel.lines)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14.5, color: "var(--ink-mute)" }}>
                  No changing lines — the situation is stable. Read the hexagram as it stands.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* GEOMANCY */}
        {method === "geo" ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)" }}>
                The shield · cast the four Mothers
              </div>
              <button
                type="button"
                onClick={() => setMothers([castMother(), castMother(), castMother(), castMother()])}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "9px 18px",
                  borderRadius: "var(--r-md)",
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 13,
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
                </svg>
                Cast anew
              </button>
            </div>

            {/* mothers + daughters row */}
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 10 }}>
              Mothers &amp; Daughters
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))", gap: 10, marginBottom: 24 }}>
              {mothers.map((m, i) => (
                <GeoFigCard key={`m${i}`} fig={m} label={`Mother ${i + 1}`} />
              ))}
              {daughters.map((d, i) => (
                <GeoFigCard key={`d${i}`} fig={d} label={`Daughter ${i + 1}`} />
              ))}
            </div>

            {/* judge */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "stretch" }}>
              <div style={{ flex: "1 1 320px", minWidth: 0, border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: "20px 22px" }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 14 }}>
                  Witnesses &amp; Judge
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 12 }}>
                  <GeoFigCard fig={rWit} label="Right witness" accent />
                  <GeoFigCard fig={judge} label="The Judge" accent />
                  <GeoFigCard fig={lWit} label="Left witness" accent />
                </div>
              </div>
              <div style={{ flex: "1 1 280px", minWidth: 0, border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: "20px 22px" }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 10 }}>
                  The verdict
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 23, color: "var(--accent)" }}>{figName(judge)}</span>
                </div>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", margin: 0 }}>
                  {GEO_MEANINGS[figName(judge)] ?? "Read the Judge against your question; it speaks the verdict of the whole shield."}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Save reading row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 30,
            paddingTop: 20,
            borderTop: `1px solid ${LINE}`,
          }}
        >
          <a
            href="/editor"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              borderRadius: "var(--r-md)",
              border: `1px solid ${LINE_2}`,
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-soft)",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-2)";
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-soft)";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 4h11l3 3v13H5zM8 4v5h7" />
            </svg>
            Save reading to journal
          </a>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
            The cast, the question, and your reading are kept together.
          </span>
        </div>
      </div>
    </div>
  );
}
