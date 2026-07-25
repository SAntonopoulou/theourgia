# Theourgia — Data Contracts & Components · SUPPLEMENT for Designer Handoff H12 (The Keybearer's Record)

> Pairs with `agent_onboarding_H12.md` and the base + H01–H11 companions. Backend contracts are being built in
> parallel; these shapes are what the six surfaces render against, at the wire points the handoff names
> (`/api/v1/astragaloi/*`, verdict fields on workings, `/api/v1/curriculum/*`, events-feed extensions).

---

## A · Data contracts

```ts
type ISO = string;   // ISO-8601 with offset

// ——— Nav (Surface 1) ———
type Wing = "practice" | "platform";
type NavMode = "auto" | "drawer" | "rail" | "compact" | "full";   // auto follows media queries
interface NavState { active: string; wing: Wing; navMode: NavMode; awaitingJudgmentCount: number; }
// `active` is a SUPERSET of VaultNav's keys (+ astragaloi, ladder, awaitingjudgment). Nothing was removed.

// ——— Today (Surface 2) ———
type StationKey = "dawn" | "noon" | "dusk" | "night";
type StationState = "done" | "due" | "pending" | "missed";        // missed is --ink-mute, never red (rule 66)
interface RiteStation {
  key: StationKey; label: string; windowAt: ISO; adoration: string;
  state: StationState; keptAt?: ISO; isMinimum: boolean;          // true ONLY for dusk (rule 66)
}
interface RiteStreak { duskKeptDays: number; windowDays: number;  // "31 of the last 35 days"
  grid: (0|1|2)[];                                                // 0 not kept · 1 kept · 2 today/pending
}
interface LunarDay {                                              // GET /api/v1/events (extended)
  atticMonth: string; atticDay: number;                           // "Hekatombaion", 29
  phase: string; illumination: number;
  observance?: { name: string; note: string };                    // "Deipnon tonight — dark moon"
}
interface DueItem { kind: "talisman" | "rite" | "study" | "verdict"; title: string; detail: string;
  when: string; urgent: boolean; }                                // verdict items come from the queue below

// ——— Astragaloi (Surface 3) ———
type BoneFace = 1 | 3 | 4 | 6;                                    // NEVER 2 or 5 (rule 68)
type Valence = "favourable" | "withheld" | "refused";             // ✓ / ⏳ / ✗
interface AstragaloiCast {
  id: Id; at: ISO; faces: [BoneFace,BoneFace,BoneFace,BoneFace,BoneFace];
  sum: number;                                                    // 5–30; 6 and 29 are impossible
  source: "transcribed" | "simulated";                            // simulated is marked forever (rule 67)
  question?: string; declaredIntentId?: Id; journalEntryId?: Id;
  oracle: { god: string; epithet: string; verse: string; citation: string; valence: Valence };
  ladder: { sphere: number; sphereName: string;
    octave: "luminous" | "embodied" | "chthonic";                 // ≤10 / 11–20 / 21–30
    element: string };
  interpretation?: string;                                        // the operator's own — never generated
}
// The oracle corpus (56 verses + valences) is operator-supplied content. The surface renders the row it is
// given and NEVER synthesises a verse for a missing entry.

// ——— Two gates (Surface 4) ———
interface DeclaredIntent {                                        // rule 69 — a covenant
  text: string; sealedAt: ISO; keyFingerprint: string;
  immutable: true;                                                // no PATCH route exists, by design
}
type GateVerdict = "pass" | "fail" | "open";
interface Verdict {
  gate1: { verdict: GateVerdict; note?: string; judgedAt?: ISO }; // did it work? (repeatable)
  gate2: { verdict: GateVerdict; note?: string; judgedAt?: ISO }; // is it true? (coherent)
}
interface AwaitingJudgment { workingId: Id; title: string; declaredAt: ISO;
  gate1: GateVerdict; gate2: GateVerdict; ageDays: number; }      // queue = any gate still "open"
type ModuleState = "candidate" | "testing" | "installed" | "rejected";   // install-by-proof
interface PracticeModule { id: Id; name: string; detail: string; state: ModuleState;
  trial?: { startedAt: ISO; keptNights: number; ofNights: number }; }

// ——— Tetraktys (Surface 5) ———
type SphereState = "done" | "current" | "locked";
const SERPENT_ORDER = [10,9,8,7,4,5,6,3,2,1] as const;            // fixed
interface Sphere {
  number: 1|2|3|4|5|6|7|8|9|10; name: string; gloss: string; state: SphereState;
  curriculum: { title: string; kind: "reading"|"practice"|"deliverable"; complete: boolean;
    evidence?: { label: string; entryIds: Id[] } }[];             // dated evidence → journal entries
  gates: { text: string; met: boolean; metOn?: ISO }[];           // incl. preceptor countersign
  initiation?: { receivedAt: ISO; note: string; oathSealed: true };  // sealed styling
}
interface LadderProgress { currentSphere: number; phrase: string; } // "Sphere 9 · second month" — NEVER a %
```

---

## B · API sketch

```
# Nav — no endpoint; wing persists in session/localStorage. awaitingJudgmentCount from the queue below.

# Today
GET /api/v1/events?window=today          -> LunarDay + observances (Attic calendar extension)
GET /api/v1/rite/stations?date=           -> RiteStation[4]        # dusk carries isMinimum
POST /api/v1/rite/stations/{key}/keep                              # marks kept; streak recomputes
GET /api/v1/rite/streak?days=35           -> RiteStreak            # dusk-only streak (rule 66)
GET /api/v1/due                           -> DueItem[]             # talismans + practice + curriculum + verdicts

# Astragaloi
POST /api/v1/astragaloi/casts   { faces, question?, source, declaredIntentId? } -> AstragaloiCast
     # 422 if any face ∉ {1,3,4,6} or if sum ∈ {6,29}; source is recorded immutably
GET  /api/v1/astragaloi/casts   ?valence=&source=  -> AstragaloiCast[]
PATCH /api/v1/astragaloi/casts/{id}   { interpretation }            # the operator's own reading only
POST /api/v1/astragaloi/casts/{id}/to-entry        -> { journalEntryId }

# Two gates (fields on workings/entries)
POST /api/v1/workings/{id}/intent   { text } -> DeclaredIntent      # seals; no update route exists (rule 69)
PUT  /api/v1/workings/{id}/verdict  <- Verdict                      # each gate pass|fail|open + note, stamped
GET  /api/v1/workings/awaiting-judgment -> AwaitingJudgment[]        # oldest first; drives the sidebar count
GET/PUT /api/v1/practice-modules[/{id}]  { state }                   # candidate→testing→installed|rejected

# Curriculum / ladder
GET /api/v1/curriculum/spheres            -> Sphere[]               # locked spheres return sealed curriculum
GET /api/v1/curriculum/spheres/{n}        -> Sphere
GET /api/v1/curriculum/progress           -> LadderProgress         # a phrase, never a percentage
```

---

## C · Components

```ts
// Nav
PracticeNav({ active, wing, navMode })      // foot switcher; "More tools" disclosure; quiet queue count
WingSwitcher({ wing })                       // one button, names its destination + that wing's sections
NavRailItem({ item })                        // 64px rail form: icon + accessible name + tooltip

// Today
LunarDayChip({ lunarDay })                   // Attic day + phase + observance state (--lunar)
ReshStationCard({ station })                 // done/due/pending/missed; dusk shows the `minimum viable` chip
ReshNextAdoration({ station })               // the next station's verse + window
ReshStreakGrid({ streak })                   // 5×7 dusk-kept grid; framed "a record, not a scoreboard"
SunArcDiagram({ stations })                  // dawn/noon/dusk marks on the day's arc
DueList({ items })                           // talisman · rite · study · verdict

// Astragaloi
BoneFaceGlyph({ face })                      // pip clusters for 1/3/4/6 ONLY (rule 68)
BoneFaceEntry({ index, value })              // 4-face grid per bone; live sum
OracleChannelCard({ oracle })                // god + epithet + hexameter + valence chip
LadderChannelCard({ ladder })                // sum → sphere, octave band chip, element ground, mini tetraktys
SimulatedCastNotice()                        // dashed, separated; marks the cast forever (rule 67)
CastHistoryRow({ cast })                     // faces · sum · god · question · simulated? · valence

// Two gates
IntentCovenantField({ intent })              // undeclared → textarea; sealed → --covenant rail + hour + fingerprint
GateCard({ gate })                           // pass/fail/open + note + stamp; border follows the verdict
AwaitingJudgmentQueue({ items })             // oldest first; two gate pips per row
PracticeModuleStateChip({ state })           // candidate · testing · installed · rejected

// Tetraktys
TetraktysFigure({ spheres, selected })       // 10 points in 4 rows AS NAVIGATION; serpent path dashed
SphereDetailPanel({ sphere })                // curriculum + evidence links + gates + countersign
SealedInitiationRecord({ initiation })       // sealed styling; "Unseal to read"
LadderProgressPhrase({ progress })           // "Sphere 9 · second month" — no bar, ever
```

---

## D · Tokens
12 aliases, no new hues: `--lunar/-soft` · `--station-done/-soft` · `--station-due/-soft` ·
`--station-missed/-soft` · `--gate-pass/-soft` · `--gate-fail/-soft` · `--gate-open/-soft` ·
`--sphere-current/-soft` · `--sphere-done/-soft` · `--sphere-locked` · `--covenant/-soft/-line`. Mapped to
`--peer-ok` / `--accent` / `--warn` / `--ink-mute` / `--moon` / `--seal`. **`--danger` unused.** Every surface
body uses `var(--token)` only — no raw hex — so the values transfer 1:1 to the app's token classes.

---

## E · Worked example — `TodayPracticeDashboard.dc.html`

**Step 1 — What it shows.** The operator's landing surface, rebuilt so that opening Theourgia *is* opening the
practice. Above the fold: what day it is in the Attic calendar and what that day asks (the lunar chip), the
four stations of the daily rite with the one that must be kept marked as such, and what is due. Below: quick
capture, the planetary hour, and recent entries. It is also the first mount of the `LiberResh` family, which
has been built and tested but rendered nowhere.

**Step 2 — Four-bucket audit.** *Structure:* AppShell (`PracticeNav active="today"`) → lunar chip → rite
section (four station cards + sun arc + streak grid) → quick-capture/planetary-hour pair → due list → recent.
*Content:* `LunarDay` (Attic month/day, phase, observance), four `RiteStation`s with their adorations,
`RiteStreak`, `DueItem[]`, recent entries with their awaiting-judgment flag. *Behavior:* keeping a station
marks it and recomputes the streak; the due row's verdict item routes to the two-gate surface; capture chips
preselect the entry kind. *Derived:* each station's card/icon/button styling from its state; the sun-arc mark
positions; the streak grid cells; the due row's urgency colouring.

**Step 3 — The traps.** (a) **Dusk is the minimum viable station (rule 66)** — it carries the `minimum viable`
chip and the only primary CTA, and the section subhead says the rule in words: *"the streak holds if dusk is
done."* The other three are kept or not, without penalty. (b) **The streak is not pressure** — it is labelled
*"a record, not a scoreboard"* and gaps render as empty cells, not failures; there is no longest-streak
number, no percentage, no celebration when a day is kept. (c) **A missed station is `--ink-mute`, never red** —
absence, not alarm. (d) **The lunar chip carries the observance, not just the phase** — "Deipnon tonight — dark
moon" is the actionable part; the phase percentage is secondary. (e) **Undischarged verdicts appear in Due** —
the record does not quietly forget an unfinished judgment.

**Step 4 — Wire it.** `GET /events?window=today` for the lunar chip; `GET /rite/stations` for the four cards
(dusk arrives with `isMinimum:true`); `GET /rite/streak?days=35` for the grid; `GET /due` for the due row,
which merges talisman recharges, rite obligations, curriculum items, and `awaiting-judgment` entries. Keeping a
station is `POST /rite/stations/{key}/keep`. The `LiberResh` components mount unchanged — Dawn/Noon/Dusk/Night
is a prop-level relabel of the existing four-station family, not a fork.

**Step 5 — Tone & a11y.** Serif for content, `--font-ui` for micro-labels, `--font-mono` for times and counts.
Phone-first: stations stack to one column, the lunar chip wraps, targets ≥44px in the drawer. The sun arc and
streak grid are labelled images with text equivalents. Reduced-motion respected; nothing animates on a kept
station. Reuse the **state-not-score** discipline anywhere practice is displayed.

*Base + H01–H11 companions cover all earlier models and prior worked examples.*
