/**
 * PracticeLogs — verbatim copy + fixtures from
 * `Theourgia Practice Logs.dc.html`.
 *
 * Four practice logs cluster on one surface via an in-page
 * `role="tablist"` (dream · pathworking · āsana & breath ·
 * banishing). The fixtures (default dream text, default chip set,
 * default lucid value, default āsana, default banishing log entries)
 * stay verbatim — the design's editorial seeding is part of the
 * onboarding voice.
 *
 * The banishing seal-help copy is load-bearing: it's the client-side
 * signing UX promise (server stores ciphertext only) from the
 * H01-H03 cross-cutting pattern. Don't rephrase.
 */

export type PracticeLogTab = "dream" | "path" | "asana" | "banish";

export interface PracticeLogTabDef {
  key: PracticeLogTab;
  label: string;
}

/** Tab order — verbatim from the .dc.html `subDefs` array, line 305. */
export const PRACTICE_LOG_TABS: readonly PracticeLogTabDef[] = [
  { key: "dream", label: "Dream" },
  { key: "path", label: "Pathworking" },
  { key: "asana", label: "Āsana & breath" },
  { key: "banish", label: "Banishing" },
];

export const PRACTICE_LOGS_TITLE = "Practice log";
export const PRACTICE_LOGS_SUBTITLE =
  "Dreams · pathworking · āsana & breath · banishing";
export const PRACTICE_LOG_TABLIST_LABEL = "Log type";

/* ---------------- Dream panel ---------------- */

export const DREAM_HEADER = "On waking";
/** Timestamp shown next to the header. Empty by default — the
 *  consumer route derives it from the wake-time captured by the
 *  practitioner (or leaves it blank on a fresh entry). */
export const DREAM_TIMESTAMP = "";

export const DREAM_TEXTAREA_PLACEHOLDER =
  "Write the dream while it is still close — present tense, no tidying.";

export const DREAM_DEFAULT_TEXT = "";

export const DREAM_CHIPS_LABEL = "Symbols & figures";
export const DREAM_ADD_CHIP_LABEL = "+ add";

export type DreamChipKind = "symbol" | "figure";
export interface DreamChip {
  label: string;
  kind: DreamChipKind;
}

/** Empty by default — no fabricated dream symbols leak into every
 *  deploy. Consumers pass real chips from the practitioner's entry. */
export const DREAM_DEFAULT_CHIPS: readonly DreamChip[] = [];

/** Test/Storybook fixture — a plausible chip set for previewing the
 *  component. Never used as a runtime default. */
export const DREAM_DEMO_CHIPS: readonly DreamChip[] = [
  { label: "library", kind: "symbol" },
  { label: "descending water", kind: "symbol" },
  { label: "the lamp-bearer", kind: "figure" },
  { label: "a name withheld", kind: "symbol" },
  { label: "an unnamed figure", kind: "figure" },
];

export const DREAM_FELT_SENSE_LABEL = "Felt sense";
export const DREAM_FELT_SENSE_DEFAULT = "";

export const DREAM_LUCID_LABEL = "Lucid";
export const DREAM_LUCID_DEFAULT = false;

export const DREAM_SAVE_LABEL = "Save dream";

export const DREAM_RECENT_EYEBROW = "Recent dreams";
export const DREAM_LUCID_PILL = "lucid";

export interface DreamLogEntry {
  date: string;
  lucid: boolean;
  snippet: string;
}

/** Empty by default — consumer routes thread in the practitioner's
 *  real past dreams when the aggregated dream endpoint lands. No
 *  more fabricated "library / mirrors / rope of letters" specimens
 *  leak as if they were the user's own logs. */
export const DREAM_DEFAULT_LOG: readonly DreamLogEntry[] = [];

/** Test/Storybook fixture — three plausible past dreams for previewing
 *  the recent-rail. Never used as a runtime default. */
export const DREAM_DEMO_LOG: readonly DreamLogEntry[] = [
  {
    date: "20 Jun",
    lucid: true,
    snippet: "Knew I was dreaming at the threshold; chose to stay and ask.",
  },
  {
    date: "17 Jun",
    lucid: false,
    snippet: "A market of mirrors; my reflection sold something I could not see.",
  },
  {
    date: "14 Jun",
    lucid: false,
    snippet: "Climbing a rope of words; the knots were letters.",
  },
];

/* ---------------- Pathworking panel ---------------- */

export const PATH_TREE_EYEBROW = "The Tree · select a path";
export const PATH_TRUMP_LABEL = "Tarot trump";
export const PATH_ATTRIBUTION_LABEL = "Attribution";
export const PATH_VISION_LABEL = "What you saw";
export const PATH_INTEGRATION_LABEL = "Integration notes";
export const PATH_VISION_PLACEHOLDER =
  "The vision as it unfolded along the path…";
export const PATH_INTEGRATION_PLACEHOLDER =
  "What it asks of you in waking life…";
export const PATH_VISION_DEFAULT = "";
export const PATH_SAVE_LABEL = "Save pathworking";
/** Default selected path. Path 25 = Samekh (middle pillar, Tiphareth
 *  ↔ Yesod). This is a structural choice — the Tree needs a
 *  highlighted starting path so the diagram isn't blank on first
 *  render. Not culture-specific content; the whole tree IS
 *  Kabbalistic. */
export const PATH_DEFAULT = 25;

/* ---------------- Āsana panel ---------------- */

export const ASANA_LABEL = "Āsana";
export const ASANA_DEFAULT_NAME = "";
export const ASANA_BREATH_LABEL = "Breath ratio";
export const ASANA_BREATH_DEFAULT = "";
export const ASANA_NOTES_LABEL = "After-practice notes";
export const ASANA_NOTES_PLACEHOLDER =
  "Steadiness, breath, where the mind went…";
export const ASANA_NOTES_DEFAULT = "";
export const ASANA_SAVE_LABEL = "Log session";
export const ASANA_BEGIN_LABEL = "Begin";
export const ASANA_PAUSE_LABEL = "Pause";
export const ASANA_RESET_LABEL = "Reset";

/** Initial timer seconds — zero until the practitioner starts a session. */
export const ASANA_TIMER_DEFAULT_SECONDS = 0;
/** Quiet stats — never gamified per H04 cross-cutting rule.  Values
 *  default to zeros; consumers thread in real totals when the
 *  aggregated practice endpoint lands. */
export const ASANA_STAT_HOURS = "0";
export const ASANA_STAT_HOURS_LABEL = "hours, cumulative";
export const ASANA_STAT_SESSIONS = "0";
export const ASANA_STAT_SESSIONS_LABEL = "sessions kept";
export const ASANA_RECENT_EYEBROW = "Recent";

export interface AsanaLogEntry {
  date: string;
  name: string;
  dur: string;
}

/** Empty by default — consumer routes thread in real practice
 *  history when the aggregated practice endpoint lands. */
export const ASANA_DEFAULT_LOG: readonly AsanaLogEntry[] = [];

/** Test/Storybook fixture — three sample sessions for previewing.
 *  Never used as a runtime default. */
export const ASANA_DEMO_LOG: readonly AsanaLogEntry[] = [
  { date: "20 Jun", name: "Siddhāsana", dur: "14:00" },
  { date: "18 Jun", name: "Sukhāsana", dur: "11:30" },
  { date: "15 Jun", name: "Vajrāsana", dur: "09:00" },
];

/* ---------------- Banishing panel ---------------- */

/** Rite options — verbatim from the .dc.html select on line 233. */
export const BANISH_RITE_OPTIONS: readonly string[] = [
  "LBRP — Lesser Banishing Ritual of the Pentagram",
  "LIRP — Lesser Invoking Ritual",
  "Star Ruby",
  "Qabalistic Cross",
  "Grounding — three breaths to the earth",
];

export const BANISH_TIME_DEFAULT = "";
export const BANISH_SEAL_LABEL = "Seal";
export const BANISH_SEAL_ACTIVE_LABEL = "Will seal";
export const BANISH_LOG_LABEL = "Log it";
export const BANISH_NOTE_PLACEHOLDER =
  "Optional note — how it felt, what it was for…";

/** sealHelp text — verbatim from .dc.html line 363. Load-bearing
 *  client-side-signing UX (cross-cutting pattern from H01-H03). */
export const BANISH_SEAL_HELP_OFF =
  "Banishing entries are stored as plain text by default. Turn on " +
  "Seal for any you want kept encrypted.";
export const BANISH_SEAL_HELP_ON =
  "This entry will be encrypted on this device. The server stores " +
  "only ciphertext — it cannot read the rite or the note.";

export const BANISH_RECENT_EYEBROW = "Recent";
export const BANISH_SEALED_PILL = "Sealed";

export interface BanishingLogEntry {
  when: string;
  rite: string;
  sealed: boolean;
  note: string;
}

/** Empty by default — consumer routes thread in the practitioner's
 *  real past banishing entries. No more fabricated "LBRP before the
 *  petition working · Grounding three breaths, garden" specimens
 *  leaking as if they were the user's own log. */
export const BANISH_DEFAULT_LOG: readonly BanishingLogEntry[] = [];

/** Test/Storybook fixture — five sample entries for previewing.
 *  Never used as a runtime default. */
export const BANISH_DEMO_LOG: readonly BanishingLogEntry[] = [
  {
    when: "Today · 14:23",
    rite: "LBRP",
    sealed: false,
    note: "Before the petition working",
  },
  {
    when: "Today · 07:10",
    rite: "Qabalistic Cross",
    sealed: false,
    note: "",
  },
  {
    when: "Yesterday · 22:40",
    rite: "Star Ruby",
    sealed: true,
    note: "",
  },
  {
    when: "Yesterday · 06:55",
    rite: "Grounding",
    sealed: false,
    note: "Three breaths, garden",
  },
  {
    when: "19 Jun · 23:15",
    rite: "LBRP",
    sealed: true,
    note: "",
  },
];

/** mm:ss formatter — port of .dc.html `fmt()` on line 300. */
export function formatTimerSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}
