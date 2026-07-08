/**
 * LanguagePalette — click-to-insert character palette.
 *
 * b108-2gz · FEATURES §2 + §7 — "software keyboard for polytonic
 * Greek, Hebrew with niqud, IAST Sanskrit; romanization-to-script
 * autocompletion".
 *
 * Consumer wires `onInsert(char)` — the palette is presentational.
 * Three tabs: Greek (polytonic), Hebrew (with niqud), Sanskrit (IAST).
 */

import { type CSSProperties, useState } from "react";

export type PaletteScript = "greek" | "hebrew" | "iast";

interface Section {
  label: string;
  chars: readonly string[];
}

const GREEK_SECTIONS: readonly Section[] = [
  {
    label: "Lowercase",
    chars: "αβγδεζηθικλμνξοπρστυφχψω".split(""),
  },
  {
    label: "Uppercase",
    chars: "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ".split(""),
  },
  {
    label: "Smooth breathing (ψιλή)",
    chars: "ἀἐἠἰὀὐὠ".split(""),
  },
  {
    label: "Rough breathing (δασεῖα)",
    chars: "ἁἑἡἱὁὑὡ".split(""),
  },
  {
    label: "Acute (ὀξεῖα)",
    chars: "άέήίόύώ".split(""),
  },
  {
    label: "Circumflex (περισπωμένη)",
    chars: "ᾶῆῖῦῶ".split(""),
  },
  {
    label: "Iota subscript",
    chars: "ᾳῃῳ".split(""),
  },
  {
    label: "Archaic",
    chars: "ϛϟϡ".split(""),
  },
];

const HEBREW_SECTIONS: readonly Section[] = [
  {
    label: "Letters",
    chars: "אבגדהוזחטיכלמנסעפצקרשת".split(""),
  },
  {
    label: "Sofit (final)",
    chars: "ךםןףץ".split(""),
  },
  {
    label: "Niqud (vowels)",
    chars: "ְֱֲֳִֵֶַָֹֻ".split(""),
  },
  {
    label: "Cantillation",
    chars: "ּֽ".split(""),
  },
];

const IAST_SECTIONS: readonly Section[] = [
  {
    label: "Long vowels",
    chars: "āīūṝḹ".split(""),
  },
  {
    label: "Retroflex + nasal",
    chars: "ṇṭḍṛṃṅñ".split(""),
  },
  {
    label: "Sibilants + spirants",
    chars: "śṣḥ".split(""),
  },
  {
    label: "Devanagari (reference)",
    chars: "ॐअआइईउऊऋऌएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह".split(""),
  },
];

const SCRIPT_LABELS: Record<PaletteScript, string> = {
  greek: "Greek (polytonic)",
  hebrew: "Hebrew (niqud)",
  iast: "Sanskrit (IAST)",
};

const SCRIPT_SECTIONS: Record<PaletteScript, readonly Section[]> = {
  greek: GREEK_SECTIONS,
  hebrew: HEBREW_SECTIONS,
  iast: IAST_SECTIONS,
};

const SCRIPT_FONT: Record<PaletteScript, string> = {
  greek: "var(--font-greek, var(--font-serif))",
  hebrew: "var(--font-hebrew, var(--font-serif))",
  iast: "var(--font-serif)",
};

export interface LanguagePaletteProps {
  /** Called with the character that was clicked. */
  onInsert: (char: string) => void;
  /** Which script tab starts active. */
  initialScript?: PaletteScript;
  className?: string;
  style?: CSSProperties;
}

export function LanguagePalette({
  onInsert,
  initialScript = "greek",
  className,
  style,
}: LanguagePaletteProps) {
  const [script, setScript] = useState<PaletteScript>(initialScript);
  const isRtl = script === "hebrew";
  const sections = SCRIPT_SECTIONS[script];

  return (
    <div
      data-primitive="language-palette"
      data-script={script}
      className={className}
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        role="tablist"
        aria-label="Language palette"
        style={{
          display: "flex",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg-3)",
        }}
      >
        {(Object.keys(SCRIPT_LABELS) as PaletteScript[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={script === k}
            onClick={() => setScript(k)}
            style={{
              flex: 1,
              padding: "9px 14px",
              border: "none",
              background: "transparent",
              borderBottom:
                script === k
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
              color: script === k ? "var(--ink)" : "var(--ink-mute)",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            {SCRIPT_LABELS[k]}
          </button>
        ))}
      </div>
      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {sections.map((section) => (
          <div key={section.label}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 6,
              }}
            >
              {section.label}
            </div>
            <div
              dir={isRtl ? "rtl" : "ltr"}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
              }}
            >
              {section.chars.map((ch, i) => (
                <button
                  key={`${section.label}-${i}`}
                  type="button"
                  onClick={() => onInsert(ch)}
                  aria-label={`Insert ${ch}`}
                  style={{
                    minWidth: 32,
                    padding: "5px 8px",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-sm)",
                    background: "var(--bg)",
                    color: "var(--ink)",
                    fontFamily: SCRIPT_FONT[script],
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  {ch || "·"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
