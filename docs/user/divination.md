# Divination

The divination workbench keeps your readings where your journal is,
so a spread thrown tonight can be linked, searched, and reconsidered
years later. Each system lives under its own tab at `/divination`, and
each reading you keep is stored in your vault — question, method,
result, and your interpretation.

## Tarot

The tarot table at `/divination/tarot` ships with the public-domain
Rider-Waite-Smith deck and five built-in spreads: Single Card, Three
Card (Past · Present · Future), Three Card (Situation · Action ·
Outcome), Celtic Cross, and Year Ahead.

When you cast, you choose how the cards are drawn:

- **Browser randomness** — your device's random number generator.
- **Hash of question** — deterministic: the same question always
  yields the same cards, a method some magicians prefer for its
  answerability.
- **Physical** — you shuffled real cards; enter what fell.
- **Mental** — you drew by inner sight; enter what came.

Cards land upright or reversed, and readings are saved with your
question and notes.

### Custom decks and spreads

The Deck Designer at `/deck-designer` has two workshops. The deck tab
builds your own decks — add, edit, and remove cards with the full
meaning fields. The spread tab designs custom layouts, placing
positions on a canvas and giving each position its own meaning. Custom
decks and spreads are yours alone: other people's vaults cannot see or
list them.

## I Ching

At `/divination/iching`, all sixty-four hexagrams in King Wen order,
cast by your choice of **three coins** or **yarrow stalks** (the two
methods have genuinely different line probabilities, and the vault
honours that). Changing lines are marked and the transformation
hexagram is derived. Readings are kept with the question and both
hexagrams.

## Geomancy

At `/divination/geomancy`, the sixteen figures with their rulerships.
A cast generates the four Mothers and runs the full cascade — Mothers,
Daughters, Nieces, Witnesses, Judge — or you can enter figures
manually if you generated them by hand (marks in sand, dots on paper).
The chart is cast into the twelve houses for interpretation.

## Runes

At `/divination/runes`, five complete rune rows are bundled:

- **Elder Futhark** (24 runes)
- **Younger Futhark**, Long Branch (16 runes, c. 800-1100 CE)
- **Anglo-Saxon Futhorc** (33 runes, meanings drawn from the
  Anglo-Saxon Rune Poem)
- **Armanen** (18 runes) — presented honestly as Guido von List's
  1902 modern reconstruction, not a historical row, with its
  misuse by racialist movements acknowledged rather than ignored
- **Northumbrian** (the extended row)

Castings and readings work as in the other systems.

### Bind-runes

The Bind-Rune Designer at `/bind-rune` layers runes from any of the
five rows over a shared stave into one bound mark, and exports the
result as an SVG file. Composition happens entirely on your device;
the designer does not yet save bind-runes into the vault, so keep the
exported file.

## Pendulum, bibliomancy, horary, and scrying

The **More** tab (`/divination/more`) gathers the quieter instruments.

- **Pendulum** — readings record the response (yes, no, maybe, or no
  response) with a confidence rating from one to five. A separate
  calibration log tracks how your pendulum actually performs — each
  calibration marked correct, incorrect, or ambiguous.
- **Bibliomancy** — capture the passage you opened to and its
  reference; saving logs it straight into your vault.
- **Horary** — a chart cast at the moment a question is asked, kept as
  a reading.
- **Scrying** — sessions record the medium (water bowl, black mirror,
  crystal, fire, smoke, ink in water, candle flame, or other) with
  start and end times, and feed a symbol index that is shared with the
  dream journal, so recurring symbols surface across both.

One honest caveat: on this panel, only bibliomancy currently saves
from the form itself. The pendulum, horary, and scrying panels tell
you so directly when you try — until their field sets land, log those
sessions from the Journal, where the pendulum and scrying entry kinds
and templates are ready.

## Tea-leaf readings

The vault includes a tasseography log with a dictionary of forty-one
traditional symbols, each with upright and inverted meanings and notes
on position in the cup. A tea-leaf reading records the question, the
tea, the symbols observed (with their position and orientation), your
interpretation — and, as a first-class field, your *intuitive notes*,
because reading leaves is not a mechanical procedure and the model
does not pretend it is. The log is currently reachable through the
vault's API (`/api/v1/divination/tea-leaves`), with the symbol
dictionary at `/api/v1/reference/tea-leaf-symbols`.

## Readings and your journal

Divination casts can also be embedded directly in journal entries with
the `/tarot`, `/iching`, `/geomancy`, and `/runes` slash commands —
useful when the reading is one moment inside a longer working record.
