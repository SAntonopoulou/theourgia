# Astro vectors — how the phone and the site are kept saying the same thing

**15 August 2026.** Sophia: *"either shared tests or a shared engine … like the
same engine on the phone and on the website."*

We looked, and most of the engine is **already shared**:

| layer | shared? |
|---|---|
| planetary positions | ✓ Swiss Ephemeris — `sweph` in Dart, `pyswisseph` here |
| sidereal / ayanamsa | ✓ the same `SE_SIDM_*` constants reaching the same C |
| rules, readings, house meanings, cautions | ✓ pack data, once `astro-techniques` imports |
| **genuinely duplicated code** | **8 primitives, all arithmetic** |

Across all thirty-five phone packs the named computations are:

> `band-lookup` · `cycle-of` · `profect-annual` · `profect-monthly` ·
> `solar-return` · `sum-of-faces` · `table-lookup` · `zodiacal-releasing`

Two of those are generic lookups over pack data rather than astrology.

## Why vectors and not one compiled core

A Rust or C core reached by FFI from both sides would remove drift by
construction — and would add a cross-compilation toolchain to *both* projects,
for Android, iOS and the server, paid again at every Flutter and NDK upgrade.
astropractise has already lost time to 16 KB page-size alignment on native
libraries; that is the tax native code charges, and it lands on one person.

⚠ **Revisit that decision if primary directions or circumambulation come to the
web.** Those are numerically delicate — arcs of ascension, obliquity, the
places where two honest implementations differ in the fourth decimal and
nobody can say which is right. They are on the phone and are *not* among the
eight. Revisit it too if the list passes roughly fifteen: eight is small
enough to keep honest by testing, and fifteen probably is not.

## The rule that keeps this working

> **A new primitive without a vector is not finished.**

That is the thing that actually rots — somebody adds a ninth and nobody
notices there is no fixture. It belongs written down, not remembered.

## What the fixture is

`astro-vectors.json` — known instants, places and natal data, with what
**practiseapp computed** for them. This side must reproduce it exactly.

The phone is the source of truth, so a disagreement is this side's to fix
unless the phone is demonstrably wrong.

## Where the eight stand

| primitive | vectors | site implementation |
|---|---|---|
| `sum-of-faces` | ✓ emitted | `core/divination/derive.py` |
| `cycle-of` | ✓ emitted | `core/divination/derive.py` |
| `band-lookup` | ✓ emitted | `core/divination/derive.py` |
| `table-lookup` | ✓ emitted | `core/divination/derive.py` |
| `profect-annual` | ✓ | `core/astro/profections.py` |
| `profect-monthly` | — | — |
| `solar-return` | — | — |
| `zodiacal-releasing` | — | — |

⚠ The four derivation cases were **emitted by practiseapp running** —
`test/emit_astro_vectors_test.dart` over there prints them, and it is a
generator wearing a test's clothes. Regenerate rather than hand-edit them.

⚠ Three behaviours a careful reading of the Dart still gets wrong, all now
pinned by vectors:

* **A table miss leaves the key ABSENT**, not present-and-empty. The phone
  does `if (value.isEmpty) continue`, so the layer drops out. A reader showing
  "Named: —" where the phone shows nothing is giving a different reading.
* **Band boundaries are inclusive** and bands are tried **in declared order**.
  Sorting them changes the answer for any pack whose bands overlap, and
  nothing stops a pack from overlapping them.
* **Values are strings all the way.** The layers chain, and a table keyed by
  `"10"` is not found by `10`.

## What it found on the first day

⚠ **Annual profections disagreed by a whole year.** Same person, same instant —
born 2 March 1984 at 18:00 UTC, Ascendant in Leo, asked on the morning of
their 2026 birthday:

| | age | house | sign |
|---|---|---|---|
| site, as it was | 42 | 7th | 11th |
| phone | 41 | 6th | 10th |

Different house, different lord of the year.

**Cause:** this side counted completed years between two *dates*, so the year
turned at midnight. The phone counts between two *moments*, so it turns at the
hour of birth. Every birthday, for up to a day, they said different things —
and for anyone born in the evening, for most of the day.

The sign and house arithmetic were identical. It was only the age.

**Fix:** `profection_at(born: datetime, at: datetime, ascendant_sign)` was
added and is now the one to use. `profection_for_date` is kept for callers
holding nothing but a date and is documented as lossy — it also has a second
problem, that taking a date at all means somebody upstream already chose a
timezone, so two people asking at the same instant from Auckland and Los
Angeles get different lords.

⚠ Nothing on the site called either function outside its own tests, so this
was safe to change. **Check that again before changing it further.**
