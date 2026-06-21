# Phase 03 — Batch 25: Festival overlays with source provenance

> Multi-tradition sacred calendar. Every entry carries at least one citation typed as primary / scholarly / community so a practitioner can judge what's ancient attestation, what's modern reconstruction, what's contemporary observance.

## Provenance invariant

`Festival.__post_init__` rejects construction without at least one `Citation`. The registry has no way around this — it's a constructor-level guarantee. Three citation kinds:

- **`primary`** — an ancient or medieval source (Hesiod, Plutarch, Ovid, the Mishnah, the *Liber AL*).
- **`scholarly`** — a modern academic source (Burkert, Parker, Beard/North/Price).
- **`community`** — a contemporary practitioner publication or established community practice.

The frontend Today widget (Batch 27) will surface this distinction so users can see at a glance whether they're observing well-attested ancient practice or honest modern reconstruction.

## Substrate

`backend/theourgia/core/festivals/`:
- `base.py` — `Tradition` / `CitationKind` enums, `Citation` / `Festival` / `FestivalInstance` dataclasses, registry helpers.
- `sabbats.py` — Wheel of the Year (8 sabbats); quarter days via astronomical Sun-longitude bisection; cross-quarters at fixed civil dates per modern consensus, with primary sources for the underlying Celtic / Germanic observances (Bede, Sanas Cormaic).
- `hekatean.py` — Deipnon (24h ending at the dark moon) + Noumenia (24h beginning after the new moon). Reuses the events.py new-moon detector.
- `greek.py` — 5 Athenian festivals (Anthesteria, Thesmophoria, Eleusinia, Panathenaia, Pyanepsia). Lunar-month-keyed via approximate Attic→Gregorian conversion: each Attic month is the lunar month whose new moon falls in its canonical Gregorian window.
- `roman.py` — 5 Roman festivals (Lupercalia, Floralia, Vestalia, Saturnalia, Compitalia) on fixed civil dates from the Calendar of Numa, anchored to Ovid's *Fasti*.
- `thelemic.py` — 4 Feasts of the Times + Crowleymas + Three Days of the Writing of the Book.

## Sources of record

Each tradition's `_X_SOURCES` constant collects the bedrock references — these are the citations that appear on every entry plus festival-specific additions where appropriate.

**Wheel of the Year:**
- Janet & Stewart Farrar, *The Witch's God* (1989) — community / Wiccan systematization
- Ronald Hutton, *The Stations of the Sun* (1996) — scholarly history of the modern eightfold cycle
- Bede, *De temporum ratione* (725) — primary attestation of Anglo-Saxon Geola, Ēostre
- Sanas Cormaic (900) — primary attestation of Beltane
- Máire Mac Néill, *The Festival of Lughnasa* (1962) — scholarly folkloric study

**Greek:**
- Robert Parker, *Athenian Religion: A History* (1996) and *Polytheism and Society at Athens* (2005)
- Walter Burkert, *Greek Religion* (1985)
- Aristophanes, *Thesmophoriazusae* (-411) — primary for Thesmophoria
- Homeric Hymn to Demeter (-650) — primary for Eleusinia
- George Mylonas, *Eleusis and the Eleusinian Mysteries* (1961) — scholarly
- Plutarch, *Life of Theseus* (100) — primary for Pyanepsia

**Roman:**
- Ovid, *Fasti* (8 AD) — the day-by-day primary source for January through June
- Beard / North / Price, *Religions of Rome* (1998) — scholarly synthesis
- Fasti Antiates Maiores (-60) — primary inscribed pre-Julian calendar
- Macrobius, *Saturnalia* (400) — primary on Saturnalia
- W. Warde Fowler, *Roman Festivals of the Period of the Republic* (1899) — scholarly

**Hekatean:**
- Plutarch — primary references to Hekate's monthly suppers
- Aristophanes, *Plutus* (-388) — primary
- Plato, *Laws* (-360) — primary for Noumenia
- Burkert, *Greek Religion* — scholarly
- Sara Mastros, *Polytheistic Monasticism* (2022) — community systematization

**Thelemic:**
- *Liber AL vel Legis* (1904) — primary for the Feasts of the Times (II:36-43)
- Crowley, *Magick: Liber ABA* (1929) — primary practical
- Crowley, *Confessions* (1929) — primary biographical
- Crowley, *The Equinox of the Gods* (1936) — primary on the 1904 inauguration

## Deferred — Hindu and Egyptian festivals

Per `plan/03-time-and-cosmos.md` Risks §"Festival data quality / cultural appropriation concerns", Hindu and Egyptian festival data is **not** shipped in this batch. Both traditions require consultation with practitioners before inclusion. The shape is in place: `Tradition.HINDU` and `Tradition.EGYPTIAN` enum values exist in `base.py`; registration is a one-file follow-up once consultation is done.

This mirrors the pattern in `feedback_wellbeing_copy_never_improvise.md` (the Sacred Well Directory placeholder) — substrate ready, content awaits review.

## Tests

`backend/tests/test_festivals.py` — 23 tests:
- 3 provenance invariants (every entry cites at least one source; constructor rejects zero-source entries; every citation has a typed kind).
- 3 tradition coverage (5 traditions populated; Wheel of the Year has exactly 8 sabbats; Thelemic includes the 4 Feasts of the Times).
- 3 astronomical anchors (Litha aligns with the summer solstice; Yule aligns with winter solstice; Ostara and Thelemic spring equinox align to within 1 second of each other since both use the same Sun-longitude bisection).
- 3 cross-quarter civil dates (Imbolc Feb 1, Beltane May 1, Samhain Oct 31).
- 2 Roman fixed dates (Lupercalia Feb 15, Saturnalia Dec 17–24).
- 3 Hekatean lunar tests (Deipnon occurs 12–13× per year, Noumenia matches, Noumenia follows Deipnon).
- 3 Greek lunar-window tests (Anthesteria late-winter, Thesmophoria mid-autumn, Eleusinia 7-day duration).
- 2 year-stream tests (sorted; ≥40 instances per year).
- 1 custom-festival registration test (plugin extension point).

**1083 backend tests pass** (+23 new). No regressions.

## Phase 03 DoD status after this batch

| Item | Status |
|---|---|
| All built-in calendars round-trip and render with locale awareness | 🟡 4 of 11 calendars shipped |
| Astrology engine validated against reference charts | ✅ |
| Multi-tradition house calculations cross-checked | 🟡 2 of 9 systems shipped |
| Planetary hours validated against published tables | ✅ |
| Event stream populated for ±50 years from current date | 🟡 Computation shipped; persistence is Phase 04 |
| Election finder returns sensible results | ⏳ Batch 26 |
| Liber Resh transitions fire at correct local times | ⏳ Batch 26 |
| Frontend chart renderer accessible | ⏳ Batch 27 |
| **All festival entries cite at least one primary or scholarly source** | **✅ (this batch — invariant enforced at construction time)** |
