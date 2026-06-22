/**
 * Editorial constants for the Divination Misc surface — verbatim
 * from `Theourgia Divination Misc.dc.html` (H04 handoff).
 *
 * Four sub-methods clustered under one `role="tablist"` per H04 §S7.2:
 *   pendulum · bibliomancy · horary · scrying
 */

export const DIVMISC_TITLE = "More divinations";
export const DIVMISC_SUBTITLE =
  "Pendulum · bibliomancy · horary · scrying";

export type DivMiscMethod = "pendulum" | "biblio" | "horary" | "scrying";

export const DIVMISC_METHOD_OPTIONS: ReadonlyArray<{
  key: DivMiscMethod;
  label: string;
}> = [
  { key: "pendulum", label: "Pendulum" },
  { key: "biblio", label: "Bibliomancy" },
  { key: "horary", label: "Horary" },
  { key: "scrying", label: "Scrying" },
];

// ─── Pendulum copy ──────────────────────────────────────────────

export const PEND_CALIBRATE_EYEBROW = "Calibrate this session";

export const PEND_CALIBRATE_NOTE =
  "A pendulum's answers can shift day to day. Set which swing means what before you ask.";

export const PEND_QUESTION_PLACEHOLDER =
  "Ask a yes / no / maybe question…";

export const PEND_ASK_LABEL = "Ask";

export const PEND_SESSION_LOG_EYEBROW = "This session's log";

export const PEND_DEFAULT_NOTE =
  "The swing along the body — your calibrated “yes.”";

// ─── Bibliomancy copy ───────────────────────────────────────────

export const BIBLIO_SOURCE_LABEL = "Source text · from your library";
export const BIBLIO_METHOD_LABEL = "Method";

export const BIBLIO_METHOD_NOTES: Record<
  "page-finger" | "random-line" | "verse-number",
  string
> = {
  "page-finger": "opened at random, finger laid on the page",
  "random-line": "a single line chosen by lot",
  "verse-number": "numbered by lot, then located",
};

export const BIBLIO_QUESTION_PLACEHOLDER =
  "Hold a question, or simply ask for guidance…";

export const BIBLIO_OPEN_LABEL = "Open at random";
export const BIBLIO_LOG_LABEL = "Log question & passage";

/** Default sources listed in the mockup (line 155). */
export const BIBLIO_DEFAULT_SOURCES: readonly string[] = [
  "The Chaldean Oracles",
  "Liber AL vel Legis",
  "The Picatrix",
  "Marcus Aurelius — Meditations",
];

// ─── Horary copy ────────────────────────────────────────────────

export const HORARY_MOMENT_EYEBROW = "The moment of the question";
export const HORARY_MOMENT_DEFAULT =
  "21 June 2026, 14:32 · Athens · cast at the moment the question was understood";

export const HORARY_SYSTEM_CAPTION =
  "Hellenistic horary · whole-sign houses";

export const HORARY_STEPS_EYEBROW = "Reading the chart, step by step";

export const HORARY_PROVISIONAL_EYEBROW = "Provisional judgement";

/** Verbatim provisional judgement (line 208) — caller may override
 *  via prop when the backend supplies a real cast. */
export const HORARY_PROVISIONAL_DEFAULT =
  "The significators apply to a sextile with mutual reception before the Moon leaves her sign — the matter perfects, though not without a delay marked by the intervening Saturn. A qualified yes.";

export const HORARY_SAVE_LABEL = "Save chart & reading";

/** Default workflow steps (verbatim from mockup lines 349-355). */
export const HORARY_DEFAULT_STEPS: ReadonlyArray<{
  n: string;
  title: string;
  value: string;
  note: string;
}> = [
  {
    n: "1",
    title: "Sect",
    value: "Day chart",
    note: "The Sun is above the horizon; the diurnal planets — Sun, Jupiter, Saturn — carry the most weight in judgement.",
  },
  {
    n: "2",
    title: "Querent",
    value: "Mercury, ruler of the Asc",
    note: "You are signified by Mercury, placed in the third house, applying and unobstructed.",
  },
  {
    n: "3",
    title: "Quesited",
    value: "Jupiter, ruler of the 9th",
    note: "The matter — the lineage petition, a ninth-house affair — is signified by Jupiter in the sixth.",
  },
  {
    n: "4",
    title: "Perfection",
    value: "By applying sextile",
    note: "Mercury applies to a sextile of Jupiter within orb before changing sign: the matter can come together.",
  },
  {
    n: "5",
    title: "Reception & witnesses",
    value: "Mutual reception; Saturn intervenes",
    note: "The two significators receive one another, easing the contact; but Saturn, the day's malefic, marks a delay before completion.",
  },
];

// ─── Scrying copy ───────────────────────────────────────────────

export type ScryMedium = "mirror" | "crystal" | "water" | "fire";

export const SCRY_MEDIA_OPTIONS: ReadonlyArray<{
  key: ScryMedium;
  label: string;
}> = [
  { key: "mirror", label: "Black mirror" },
  { key: "crystal", label: "Crystal" },
  { key: "water", label: "Water" },
  { key: "fire", label: "Fire" },
];

export const SCRY_TRANCE_LABEL = "Enter trance mode";

export const SCRY_TEXT_PLACEHOLDER =
  "Set down what comes — images, figures, words, the felt sense. Don't interpret yet.";

export const SCRY_RECORD_LABEL = "Record audio";

export const SCRY_AUDIO_HINT =
  "Audio attaches through the same upload as your library quote recordings.";

export const SCRY_SAVE_LABEL = "Save scrying session";

export const SCRY_PAST_EYEBROW = "Past sessions";
