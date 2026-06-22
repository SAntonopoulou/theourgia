/**
 * VocesMagicae — verbatim copy + fixtures from
 * `Theourgia Voces Magicae Recorder.dc.html` (H05).
 *
 * Honesty (H05 §S2.4): a voce CANNOT be saved without a source
 * citation. The Save button stays disabled until the citation field
 * is non-empty; the required-state chrome uses `--accent` border
 * (NEVER `--danger`). The verbatim note below the buttons echoes
 * the constraint.
 *
 * Recordings append; deleting soft-deletes. Built-in voces (PGM
 * fixtures) are read-only; forking a built-in into a custom voce
 * preserves the citation link.
 */

export type VoceTradition =
  | "all"
  | "pgm"
  | "hekate"
  | "goetic"
  | "thelemic"
  | "vedic"
  | "norse"
  | "custom";

export type VoceScript = "greek" | "hebrew" | "latin" | "coptic" | "other";

export type PlanetaryAssoc =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn";

export type ElementalAssoc = "fire" | "water" | "air" | "earth";

export const VM_TOPBAR_TITLE = "Voces Magicae";
export const VM_TOPBAR_SUBTITLE =
  "The names of power — written, sounded, and sourced";

export const VM_SEARCH_PLACEHOLDER = "Search names & source text…";
export const VM_NEW_BUTTON_LABEL = "New voce";

/* ─── Tradition filter row ──────────────────────────────────── */

export interface TraditionDef {
  key: VoceTradition;
  label: string;
}

export const TRADITION_FILTERS: readonly TraditionDef[] = [
  { key: "all", label: "All" },
  { key: "pgm", label: "Greek Magical Papyri" },
  { key: "hekate", label: "Hekate-tradition" },
  { key: "goetic", label: "Goetic" },
  { key: "thelemic", label: "Thelemic" },
  { key: "vedic", label: "Vedic" },
  { key: "norse", label: "Norse" },
  { key: "custom", label: "Custom" },
];

/* ─── Voce row pluralisation ────────────────────────────────── */

export const VM_NO_RECORDING_LABEL = "no recording yet";
export function vmRecordingCountLabel(n: number): string {
  if (n === 0) return VM_NO_RECORDING_LABEL;
  return `${n} recording${n > 1 ? "s" : ""}`;
}

/* ─── Drawer copy ───────────────────────────────────────────── */

export const VM_ASSOCIATIONS_EYEBROW = "Associations";
export const VM_RECORDINGS_EYEBROW = "Recordings";
export const VM_RECORD_NEW_LABEL = "Record new";
/** Verbatim — load-bearing wellbeing tone. */
export const VM_EMPTY_RECORDINGS_NOTE =
  "No recording yet — sound it when you are ready, in your own voice.";
export const VM_USED_IN_WORKINGS_EYEBROW = "Used in workings";
export const VM_READONLY_PILL = "read-only";

/* ─── New-voce modal copy ───────────────────────────────────── */

export const VM_NEW_MODAL_TITLE = "A new voce";
export const VM_SOURCE_SCRIPT_LABEL = "Source script";
export const VM_VOCE_TEXT_LABEL = "Voce text";
export const VM_TRANSLITERATION_LABEL = "Transliteration";
export const VM_IPA_LABEL = "IPA";
export const VM_IPA_OPTIONAL_TAG = "· optional";
export const VM_IPA_PLACEHOLDER = "/pʰɔːr/";
export const VM_CITATION_LABEL = "Source citation";
export const VM_CITATION_REQUIRED_TAG = "· required";
export const VM_CITATION_PLACEHOLDER = "e.g. PGM IV. 1265–1274";
export const VM_PLANETARY_LABEL = "Planetary";
export const VM_ELEMENTAL_LABEL = "Elemental";
export const VM_NEW_CANCEL_LABEL = "Cancel";
export const VM_NEW_SAVE_LABEL = "Save voce";
/** Verbatim honesty footnote. */
export const VM_CITATION_REQUIRED_NOTE =
  "A voce cannot be saved without its source citation.";

/* ─── Default modal seeds (verbatim from the mockup) ────────── */

export const VM_NEW_DEFAULT_TEXT = "ΦΩΡ ΦΩΡΒΑ";
export const VM_NEW_DEFAULT_TRANSLIT = "phōr phōrba";

export interface ScriptOption {
  key: VoceScript;
  label: string;
}

export const SCRIPT_OPTIONS: readonly ScriptOption[] = [
  { key: "greek", label: "Greek" },
  { key: "hebrew", label: "Hebrew" },
  { key: "latin", label: "Latin" },
  { key: "coptic", label: "Coptic" },
  { key: "other", label: "Other" },
];

/** IPA keyboard helper glyphs — verbatim from the mockup line 288. */
export const IPA_KEYS: readonly string[] = [
  "ʃ",
  "θ",
  "ð",
  "ŋ",
  "ɣ",
  "χ",
  "ʔ",
  "ə",
  "ɔ",
  "ē",
];

/* ─── Glyph maps ────────────────────────────────────────────── */

export const PLANETARY_GLYPH: Record<PlanetaryAssoc, string> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
};

export const PLANETARY_NAME: Record<PlanetaryAssoc, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
};

export const ELEMENTAL_GLYPH: Record<ElementalAssoc, string> = {
  fire: "🜂",
  water: "🜄",
  air: "🜁",
  earth: "🜃",
};

export const ELEMENTAL_NAME: Record<ElementalAssoc, string> = {
  fire: "Fire",
  water: "Water",
  air: "Air",
  earth: "Earth",
};

export const ELEMENTAL_COLOUR: Record<ElementalAssoc, string> = {
  fire: "var(--fire)",
  water: "var(--water)",
  air: "var(--air)",
  earth: "var(--earth)",
};

/* ─── Demo voces (verbatim from the mockup `voces()`) ───────── */

export interface VoceEntity {
  name: string;
  glyph: string;
}

export interface VoceRecording {
  /** Duration label ("0:06"). */
  d: string;
  /** Short date label ("12 Jun", "Today"). */
  date: string;
  /** Deterministic seed for the waveform thumbnail. */
  seed: number;
}

export interface VoceWorking {
  title: string;
  date: string;
}

export interface VoceRecord {
  id: string;
  text: string;
  translit: string;
  ipa: string;
  citation: string;
  trad: Exclude<VoceTradition, "all">;
  builtin: boolean;
  planets: readonly PlanetaryAssoc[];
  elements: readonly ElementalAssoc[];
  entities: readonly VoceEntity[];
  recs: readonly VoceRecording[];
  workings: readonly VoceWorking[];
}

export const DEMO_VOCES: readonly VoceRecord[] = [
  {
    id: "iao",
    text: "ΙΑΩ",
    translit: "Iaō",
    ipa: "/i.a.ɔ́ː/",
    citation: "PGM XIII. 207 (public domain)",
    trad: "pgm",
    builtin: true,
    planets: ["sun"],
    elements: [],
    entities: [],
    recs: [
      { d: "0:06", date: "12 Jun", seed: 3 },
      { d: "0:05", date: "02 May", seed: 7 },
    ],
    workings: [{ title: "Solar invocation at dawn", date: "21 Mar" }],
  },
  {
    id: "ablanathanalba",
    text: "ΑΒΛΑΝΑΘΑΝΑΛΒΑ",
    translit: "Ablanathanalba",
    ipa: "/a.bla.na.tʰa.ná.lba/",
    citation: "PGM IV. 1474 — the palindrome of protection",
    trad: "pgm",
    builtin: true,
    planets: ["saturn"],
    elements: ["earth"],
    entities: [],
    recs: [{ d: "0:11", date: "10 Jun", seed: 5 }],
    workings: [{ title: "Warding of the threshold", date: "08 Jun" }],
  },
  {
    id: "brimo",
    text: "ΒΡΙΜΩ",
    translit: "Brimō",
    ipa: "/bri.mɔ̌ː/",
    citation: "An epithet of Hekate; Apollonius, Argonautica III",
    trad: "hekate",
    builtin: true,
    planets: ["moon"],
    elements: ["water"],
    entities: [{ name: "Hekate", glyph: "☽" }],
    recs: [{ d: "0:04", date: "15 Jun", seed: 2 }],
    workings: [{ title: "Deipnon at the dark moon", date: "15 Jun" }],
  },
  {
    id: "askei-kataskei",
    text: "ΑΣΚΕΙ ΚΑΤΑΣΚΕΙ",
    translit: "Askei Kataskei",
    ipa: "/as.kéi̯ ka.tas.kéi̯/",
    citation: "The Ephesia Grammata (Ephesian Letters), 4th c. BCE",
    trad: "pgm",
    builtin: true,
    planets: [],
    elements: ["fire", "water", "air", "earth"],
    entities: [],
    recs: [],
    workings: [],
  },
  {
    id: "semeseilam",
    text: "ΣΕΜΕΣΕΙΛΑΜ",
    translit: "Semeseilam",
    ipa: "/se.me.sêi̯.lam/",
    citation: "PGM IV. 1810 — “the eternal sun”",
    trad: "pgm",
    builtin: true,
    planets: ["sun"],
    elements: ["fire"],
    entities: [],
    recs: [{ d: "0:07", date: "30 May", seed: 9 }],
    workings: [],
  },
  {
    id: "phor-phorba",
    text: "ΦΩΡ ΦΩΡΒΑ",
    translit: "phōr phōrba",
    ipa: "/pʰɔːr pʰɔːr.ba/",
    citation: "PGM IV. 1265 — Hekate-Selene name",
    trad: "hekate",
    builtin: false,
    planets: ["moon"],
    elements: ["earth"],
    entities: [{ name: "Hekate", glyph: "☽" }],
    recs: [{ d: "0:05", date: "Today", seed: 4 }],
    workings: [{ title: "My own evening rite", date: "Yesterday" }],
  },
];
