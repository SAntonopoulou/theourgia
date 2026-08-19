# From the phone — transliteration (all scripts) and pack parity

**19 Aug 2026.** The phone has built transliteration end to end and needs the web
to match, and Sophia wants the site able to **install and use every pack the
phone can**. This note hands you the shared contract for both. It touches none
of your in-flight workshop files — it is spec + shared data.

Division Sophia set: **the phone builds the shared tables + the pipeline + the
importer framework; you build the per-kind consuming surfaces.** Where a piece
is clearly a web surface (a React modal, a pop-up), it is called out as yours.

---

## PART 1 — TRANSLITERATION, up to speed in all five scripts

### The state of play (from a scout of your repo)

Your transliteration has two halves that don't line up:
- **Reference tables** (native → Latin), 8 schemes in
  `backend/theourgia/core/linguistic/transliteration_schemes.py` — Greek/Hebrew/
  Sanskrit/Arabic/Coptic. These are good; the phone **reuses them verbatim**.
- **The input IME** (roman → native, "type Hekate → Ἑκάτη"): only
  `frontend/shared/src/LanguageIME/iastTransliterator.ts` works, and only for
  Sanskrit/IAST. Greek + Hebrew have a click palette but **no keystroke
  transducer**; **Coptic and Arabic have neither**. And the IME is orphaned —
  `LanguagePalette`/`transliterateIast` are imported nowhere; `NewVoceModal`
  uses raw text inputs. The docs claim the editor has the palette; it does not.

So "bring it up to speed" is real work, not a copy — but the phone has done the
hard part (authoring + blessing the tables), and it collapses to: **adopt one
shared file + a small longest-match engine, and all five scripts light up.**

### The shared artifact — copy this verbatim

`…/practiseapp/assets/transliteration/schemes.json` is canonical. It carries,
for all five scripts:
- **phonetic** (`latin_to_script`) — the forgiving "sound it out" input,
  **blessed by Sophia 19 Aug**. Greek, Coptic, Hebrew, Arabic (Sanskrit input
  is the ASCII→IAST intermediate; see the assembler below).
- **scholarly** (`script_to_latin`) — the 8 reference schemes, **transcribed
  verbatim from your `transliteration_schemes.py`**, plus Greek monotonic
  accent-folding added (ά→a … so accented corpus words read cleanly).

Ship the identical file on the web so a phone romanization and a web one are the
*same*. The phone loads it into a pure engine; you should too.

### The engine (mirror in TS — reference impl: phone's `transliteration.dart`)

**Longest-match substitution**, both directions: at each position the longest
`from` that matches wins (`th→θ` beats `t→τ`); ties keep authored order;
unmatched passes through. After a `latin_to_script` pass, a per-script
**finalize**:
- **Greek**: medial σ (U+03C3) → final ς (U+03C2) when followed by a non-Greek
  letter or end of string.
- **Hebrew**: at a word's end, כ→ך מ→ם נ→ן פ→ף צ→ץ.

That single loop + those two finalizers give you Greek/Coptic/Hebrew/Arabic
input and all the scholarly readings. ~40 lines of TS.

### Sanskrit → Devanagari (the one that isn't a flat table)

Sophia's call: Sanskrit voces are **Devanagari**, not IAST. Flow: roman →
IAST (the `sanskrit-iast-input` scheme in schemes.json) → a **syllabic
assembler**. Reference impl: phone's `devanagari.dart`. The rules:
- A consonant carries an inherent *a* (क = "ka"). Emit its base letter.
- If the next phoneme is a vowel: if it is `a`, emit nothing (inherent); else
  emit that vowel's **sign/matra** (ि ी ु …). Consume the vowel.
- If the next is another consonant / a special / end: emit **virama** ् (bare
  consonant → cluster join or word-final).
- Independent vowels (syllable-initial) use the full letter (अ आ इ …).
- `oṁ`/`auṁ` alone → the ligature ॐ; anusvara ं, visarga ः, candrabindu ँ.

And a **reader** for tap-a-word (Devanagari → IAST) that restores the inherent
*a* the flat table drops (कृष्ण must read "kṛṣṇa", not "kṛṣṇ") — reference impl
`devanagariToIast` in the same file.

### The blessed phonetic conventions (so you can sanity-check the tables)

- **Greek** — `e→ε o→ο` short; `ē→η ō→ω` and the familiar `w→ω`; digraphs
  `th ph ch kh ps ks`; diphthongs `ai ei oi au eu ou`; accents/breathings
  **dropped** in phonetic mode; final sigma automatic.
- **Coptic** — Greek letters as Greek; the six Demotic by digraph
  `sh→ϣ f→ϥ kh→ϧ h→ϩ j→ϫ ch→ϭ ti→ϯ`.
- **Hebrew** — **unpointed**; `t→ת` (tet via `T`), `s→ס`, `k→כ` (qof `q`),
  `ch→ח`, `v→ו`, `sh→ש`, `ts/tz→צ`; matres only; final forms automatic.
- **Arabic** — **dotted emphatics** `.s→ص .d→ض .t→ط .z→ظ .h→ح`; digraphs
  `th kh dh sh gh`; consonantal, long vowels `aa→ا ii→ي uu→و`.

### The two surfaces (yours)

1. **Type-it-as-it-sounds in voces entry.** `NewVoceModal`'s "voce text" field
   gets an affordance (the phone uses a small keyboard icon on the field) that
   opens the tool pre-set to the chosen `source_script`; on "use", it fills the
   field with the native word. The tool = script picker + roman input + live
   native preview (two fields, not in-place — digraphs and the cursor never
   fight). The phone's `TransliterationPanel` is the reference.
2. **Tap-a-word POP-UP.** Sophia: "click a word in the gematria tabs to get its
   transliteration — a small pop-up on the web." In `GematriaCalculator` (and
   any word list), a word is clickable → a pop-up shows the word large + its
   scholarly reading (native→Latin, via the reader; Sanskrit via the
   inherent-a Devanagari reader). The phone's `WordReadingSheet` is the model
   (a slide-up there, a pop-up here).

### Optionally: `POST /api/v1/transliterate`

`plan/08-linguistic-tools.md:77` specced it and it doesn't exist. Not needed if
the web ships schemes.json client-side (the phone does; no server round-trip).
Skip unless you want server parity.

---

## PART 2 — PACK PARITY (#87): the site must install + use every pack

### The gap (from a scout)

Serving works (`/packs/feed.xml` + 39 `.mbf`). **Installing/using does not, end
to end:**
1. **Nothing on the web reads the feed.** No feed client, no browse-and-install.
   (Mirror the phone's `rss_pack_feed.dart`.)
2. **The install UI is mounted nowhere.** `BundleInstallPreviewModal` +
   `bundlesPreview`/`bundlesImport`/`importBundledPackage` exist but no route
   uses them; `BundleLibrary` is list/remove only. Even the 7 first-party
   `bundled` packages can't be installed from the UI.
3. **Only `spiritual-maps` materializes on import.** `KIND_IMPORTERS`
   (`backend/theourgia/core/bundles/importer.py:495`) has real importers for
   only 6 kinds; every other feed kind (gematria-systems, gematria-word-lists,
   election-templates, oracle-deck, festival-calendar, astro-techniques,
   divination-*, ritual-set/session/sitting, speech-model) imports
   opaque-but-listed = stored, not usable.
4. **Consuming surfaces ignore installed packs.** `GematriaCalculator` runs on
   built-in `BUNDLED_CIPHERS`, `Election` on built-in scoring, audio on its own
   Whisper — none read installed-pack data.
5. **correspondence-table + directional-frame have no home** on the web at all
   (not on the feed, no surface). `correspondence-table` is the 19-Aug
   correspondences note; `directional-frame` is the ritual compass.
6. **Per-account "installed packs" doesn't sync** phone↔web (`InstalledBundle`
   is per-owner but not on the `record_entry` sync shelf). This is the
   account-level module-sync both sides still lack — ties into #48.

Note: the `registry_bridge` 503 is a **different subsystem** (the code-plugin
marketplace), not packs. Don't chase it for this.

### Division

- **Phone-owned / shared:** the `.mbf` format + `read_mbf` (already the same
  module both sides use), the feed shape, and the phone's own install/consume
  (done). The phone will also design the **per-account installed-packs sync**
  contract as part of #48 and hand it over.
- **Yours (site surfaces + importers):** the feed client, the browse+install UI
  (wire the existing `BundleInstallPreviewModal`), the **importers** for the
  remaining kinds, and making `GematriaCalculator`/`Election`/etc. read
  installed packs. This is the big lift and it is squarely your repo's surfaces.
- If you'd rather the phone author the backend importer framework (it fits the
  "phone builds importers" split Sophia named), say so in a return note and it
  will — but it lives in your backend, so you owning it avoids collisions with
  your in-flight work.

---

## What the phone has shipped (local, unpushed — batching holds)

Transliteration, phone: `892a912` engine+schemes.json, `bc0b51b` Devanagari
assembler, `e890a46` the tool, `79b9a2c` voces+gematria input wiring, `5d64d0c`
tap-a-word slide-up + Devanagari reader. All suite-green. The web half is yours;
the shared file and the algorithms above are everything you need to match it.

— the phone
