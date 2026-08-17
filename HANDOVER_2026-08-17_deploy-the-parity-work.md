# Handover — 17 August 2026

**For: the agent working in `theourgia/`.**
From: the agent working across `astropractise/`, `theourgia/` and `practiseapp/`.

Read the first section before anything else. It is the only urgent one.

---

## 1. ⚠ THE SITE HAS NOT BEEN DEPLOYED SINCE 25 JULY

Sophia asked today why she still sees Talismans and Sigils on the site when
they were hidden two days ago. **They were hidden. The site is not running the
code that hides them.**

```
deployed  https://theourgia.com/app/assets/index-nLVXTqWk.js
          last-modified: Sat, 25 Jul 2026 19:06:07 GMT

commit    b30b8e3  2026-08-15  "The site shows only what the phone shows,
                                until a feature is finished"
```

Three weeks of work — the whole parity effort, the nav hiding, spiritual maps,
device link codes — **is committed and has never reached the server.**

⚠ Do not try to diagnose this by grepping the deployed bundle for the hidden
feature names. It is misleading and I nearly drew the wrong conclusion from it.
`HIDDEN_UNTIL_FINISHED` filters `PRACTICE_WING_SECTIONS` into
`VISIBLE_PRACTICE_SECTIONS`, and **both survive into the bundle** — so the
strings `"talismans"` and `"awaitingjudgment"` appear whether or not the
filtering is present. The `last-modified` header is the honest check.

### What to do

1. Rebuild `frontend/` and deploy it.
2. **Verify from outside**, not from the build log: re-fetch the asset and
   confirm `last-modified` has moved, then load `/app` and confirm the nav.
3. Check whether the backend is equally stale. I did not verify the API's
   deployed version and you should not assume it matches the frontend.

### ⚠ There is a second surface, and it is not covered by the nav work

`https://theourgia.com/` is the **public marketing site** (Astro,
`frontend/public-site`, built 22 July). It is a different application from
`/app`, and `PracticeNav` does not touch it. It currently advertises:

| feature | mentions on the live landing page |
|---|---|
| circle | 40 |
| library | 5 |
| sigil | 4 |
| analytics | 4 |
| entities | 2 |
| tool registry | 1 |

Sophia's instruction was *"hide all the features except those specific ones
that I mentioned above from the theourgia site until they are totally
finished"*. A landing page promising sigils and analytics to a visitor is the
same promise the nav was making, made louder and to strangers. **I did not
touch the marketing site and it needs the same pass.** Ask her whether she
wants the copy cut or reworded — that is a voice decision, not a code one, and
it is hers.

---

## 2. ⚠ We are working against each other on the same features

You have uncommitted work in `MagicSquares/`, `MagicalCircle/`,
`SigilGenerator/`, `ToolRegistry/`, `WorkshopModals/`, plus
`0088_talisman_lifecycle_scrying_protocol.py`, `talismans.py` and
`scrying.py`.

I hid **those exact features** from the nav on 15 August, on Sophia's
instruction that the site show only what the phone shows, *"the mobile
application being the source of truth"*.

**Neither of us is wrong and this needs her to arbitrate, not us.** The
readings that fit both facts:

- She wants them finished *and* hidden until they are — in which case your
  work continues and the nav stays as it is until each one lands.
- The hiding was meant to be narrower than I made it.
- She changed her mind after 15 August, and I have not been told.

⚠ **Do not resolve this by editing `HIDDEN_UNTIL_FINISHED` on your own
judgement, and I will not either.** Whoever removes a key from that set is
making a call about what is finished enough to show a stranger. Ask her.

I have left your work untouched — every commit I made staged individual files.
Please extend me the same courtesy on `PracticeNav.tsx`, the vectors, and the
bundle converter.

---

## 3. The pack converter was dropping data, and I fixed it

`23b2185`. This one is worth reading in full because the failure mode is
instructive and it was **mine**.

`tool/pack_to_mbf.py::_items_from` walked only payload keys whose value was a
`list`. That is most of them — so all thirty-five phone packs converted, every
digest verified, and **twenty-one keys went missing across the set in
silence.** I reported "35/35 packs, 621 items, all digests verified" and it was
true and it did not mean what it appeared to.

> ⚠ A digest over a document that is missing the payload's largest key is a
> correct digest of the wrong thing. Verifying thirty-five of them proved the
> ZIP was intact and **nothing whatever about the conversion.**

Keep that where you can see it. Integrity checks verify what you hand them.

What was going missing:

- **`shape`, `instrument`, `castVerb`, `id`, `name`, `summary`** on both
  divination systems. The payload *is* the system; its lists are its parts.
  Without `shape` — `{count: 5, faces: [1, 3, 4, 6]}` — nothing can say how
  many knucklebones to cast, so the Tetraktys oracle arrived as seventy-three
  orphan faces belonging to nothing.
- **`words`** — the actual word data — on five packs. **34.9 MB**: Sepher
  Sephiroth's 2453 rows, the Arabic Ayaspell's 294,131.

The fix recognises three kinds of top-level key. Lists become items as before.
Scalars describe the payload's **subject** and become one item, `ref
"self:<slug>"`, emitted first. A dict big enough to be data becomes an
**asset**, which is what MBF's `assets/**` exists for.

⚠ **Bulk is decided by measuring, not by inferring from types.** My first
attempt called anything containing a list "bulk", which swept up `shape` and
crashed on `count: 5` being an int. What a value is made of says nothing; how
much of it there is says everything. The packs leave no borderline case —
largest non-bulk is ~40 bytes, smallest bulk is 121 KB.

**Signature change:** `convert()` and `convert_bundle()` now return a third
value, the assets. `tests/test_correspondences_from_the_phone.py` was updated.

Re-converted all 35: **627 items, 5 assets, 34.9 MB, zero digest mismatches,
zero source payload keys unaccounted for.** Pinned by the new
`tests/test_pack_conversion.py` — synthetic cases run anywhere, real-pack cases
skip when `practiseapp` is not checked out beside this repo.

### ⚠ Two MBF type names were wrong. I renamed them; nothing had been built on them yet

- `word-list` → was `voces-library`. That is **this site's own name** for voces
  magicae (`models/voces.py`: `source_text`, IPA, a *required* per-row
  citation). A phone `word-list` is a gematria index. Importing one as the
  other would have put 2453 Hebrew entries into the voces table, every one
  failing the H05 citation rule for a reason that was never about honesty.
  Now **`gematria-word-lists`**.
- `number-system` → was `magical-alphabets`, which means a *script* like
  Theban. A number-system is a numeration: several methods over one script,
  plus the rules saying whether ᾳ folds to α. `cipher-definitions` is not the
  home either — a `Cipher` here is **one** letter-value table and cannot hold
  four methods and a fold map. Now **`gematria-systems`**.

Both are the failure the existing `correspondences` note in `manifest.py`
already warns about: one type name over two shapes is how a format rots. That
note is why I checked, and it earned its keep.

---

## 4. The astrology engines agree, and there is now a rule with teeth

`098c33c`. All **eight** shared primitives have vectors emitted by practiseapp
*running* — not transcribed from reading it.

`test_all_eight_primitives_are_covered` **fails** on a missing one. It used to
merely report the gap, which is the version that lets the arrangement rot. A
ninth primitive on the phone fails the suite.

> **A new primitive without a vector is not finished.**

`solar-return` was the last, and porting it surfaced three things a careful
reading of the Dart still gets wrong. Each was confirmed by breaking the Python
on purpose and watching which vector failed:

- The midpoint is **truncated** integer microseconds (`~/ 2` on a Duration).
  Python's `/ 2` rounds to the nearest *even* microsecond, so the two sides
  diverge on an odd span and every later halving inherits it.
- **Dart's `double.sign` makes zero its own sign.** A probe landing exactly on
  the target matches *neither* end and takes the else branch. Spelling it
  `x < 0` — the obvious Python — folds zero in with the positives and widens a
  bracket that should not widen. Caught by **one** vector, 337.75°, which is
  the low bracket edge exactly and exists for that reason alone.
- `_birthdayIn` keeps seconds and no finer.

⚠ The vectors drive a **linear Sun**, deliberately. The primitive is the
bisection. Pinning a real return instant would pin the `.se1` files and break
the fixture the day they are updated, for a reason that is not a disagreement.
That both sides read the same real ephemeris is a *separate* guarantee:
`EPHEMERIS_SOURCE`, and `test_this_deployment_is_on_the_swiss_files`.

⚠ **Swiss Ephemeris falls back to Moshier silently** when its files are
missing. Everything works and nobody finds out until two devices disagree
about somebody's chart. If you touch the deployment, do not drop
`backend/data/ephe/`.

---

## 5. The importers — scoped, designed, not built

This is the next substantial piece and I stopped before it. **Read this before
starting; it will save you a wrong turn I already took.**

### ⚠ The real scope is 13 kinds, not 37

`TYPE_CATALOG` has 37 entries and is **aspirational**. Counted from the
thirty-five converted bundles, the phone actually ships **13**:

```
astro-techniques  divination-derivations  divination-fields
divination-systems  election-templates  festival-calendar
gematria-systems  gematria-word-lists  oracle-deck
ritual-set  session-protocols  sitting-forms  spiritual-maps
```

`spiritual-maps` has an importer. **Twelve to write.** Building importers for
catalogue entries no pack ships is speculative work.

### ⚠ Three registered importers are unreachable

`KIND_IMPORTERS` has `entities`, `recipes` and `voces` — **none of which is in
`TYPE_CATALOG`.** A bundle declaring them is refused by the manifest validator
before the importer runs. Either the names are wrong or they are dead code.
I did not touch them; worth an hour of somebody's attention.

### The design I recommend, and why

Follow the precedent `models/spiritual_map.py` already set and argued: **store
the document whole as JSONB**, with columns only for what a list needs.

Sophia's requirement is *"capable of running both ways for all the features."*
Round-tripping is what makes shredding unsafe — a relational decomposition must
decide, for each of thirteen kinds, which fields deserve columns, and every
field it declines is **dropped silently**. The web shows the item, the
practitioner edits it, and the sync back to the phone returns something thinner
than what was sent. Nobody sees it happen. That is not a sync, it is a slow
deletion.

I drafted a single `pack_item` table — one row per item, `kind` discriminator,
unique on `(owner_id, kind, slug, ref)` so reimport updates rather than
accumulates. Thirteen tables would be thirteen migrations carrying identical
columns.

⚠ **The draft is at
`/tmp/claude-1000/-home-sophia-Documents-development-astropractise/b8fdf979-01e4-44f3-bbca-94821a698aa0/scratchpad/pack_item.py.draft`
and is deliberately NOT in the repo.** A `table=True` model with no migration
makes `alembic autogenerate` want to create it, and you would have got a
mystery migration in the middle of your talisman work. Copy it in when you
start, together with its migration. Head is currently `0088`, single, so yours
is `0089`.

The honest cost of one table with a `kind`: **the database cannot check what is
inside a document.** A malformed `oracle-deck` is as storable as a good one.
The check has to live at import.

### ⚠ One decision that is Sophia's, not ours

The gematria word lists are **34.9 MB** across five packs. Importing that into
Postgres per user is a real choice. My recommendation is the metadata row plus
a **lazily fetched asset**, since the converter now writes them as MBF assets
with their own digests — but she has not been asked and I did not want it
decided by whoever happened to write the importer.

---

## 6. What is *not* done, so nobody reports it as done

- **The site is not deployed.** §1. Everything else here is downstream of it.
- The **marketing site** still advertises unfinished features. §1.
- **Twelve importers.** §5.
- **Teaching the phone to read `.mbf`** — and it must accept both formats for
  at least one release, because packs are already installed on Sophia's phones.
- **Downloading modules from the web to the phone.**
- The **record model**, separate from the journal. Homepage quick links are
  blocked on it.
- **Voces magicae in the app.**
- **The Hellenistic astrology module** — §7, which is the whole of it.
- **Resend** — key and verified domain both ready, three env vars needed in the
  compose map. ⚠ `.env` does not reach the container; compose takes an
  explicit `environment:` map. That cost a restart to learn.

## Verified state at handover

| | |
|---|---|
| theourgia backend | 3922 passed, 18 skipped |
| practiseapp | 2167 passed |
| astropractise | 310 passed |
| alembic heads | `0088`, single |
| my commits | `098c33c`, `23b2185` — individually staged files only |
| your working tree | untouched |

⚠ The backend suite figure is from **before** your talisman and scrying work
landed. Re-run it rather than quoting mine.

---

## 7. A complete Hellenistic astrology module — what exists and what is missing

Sophia asked for this specifically. It replaces the vaguer line that used to
sit in §6, which was **wrong in a way worth naming**: I had listed *nakshatras,
the ayanamsas and the missing house divisions* as "the astrology gap". None of
those belongs in a Hellenistic module. See "Not Hellenistic" at the end.

### ⚠ First, the thing nobody has written down: there are THREE engines

| codebase | what it is strong at |
|---|---|
| **astropractise** `lib/domain/astrology/` | the **doctrine** — sect, lots, dignities, conditions, length of life, predominator, ascensional times |
| **practiseapp** `lib/domain/astrology/` | the **predictive techniques** — solar returns, antiscia, primary directions, progressions, transits |
| **theourgia** `backend/theourgia/core/astro/` | the **least of the three** — chart, houses, aspects, transits, profections, releasing, solar returns, planetary hours |

They are close to **complementary**, and neither Dart codebase is a superset of
the other. Concretely:

- astropractise has **no** solar returns, antiscia, fixed stars or lunar nodes.
- practiseapp has **no** lots, no bonification/maltreatment, no enclosure, no
  length-of-life, no predominator.
- ⚠ **Zodiacal releasing is implemented to four levels in astropractise and to
  one level everywhere else.** This site's `releasing.py` was ported from the
  phone, so it inherited the phone's single level — meaning **the site was
  ported from the less complete of the two available implementations.** That
  was not a decision anybody made; it followed from "the phone is the source of
  truth", which is the right rule for *magickal* content and the wrong one for
  Hellenistic doctrine.

⚠ **Before writing any Hellenistic code here, check astropractise first.** The
odds are good it is already there, thought through, and sourced.

### The checklist

`A` = astropractise · `P` = practiseapp (phone) · `S` = this site.
✓ implemented · **—** absent.

**Foundations**

| doctrine | A | P | S |
|---|:-:|:-:|:-:|
| Whole sign houses ⚠ settled; do not add quadrant systems | ✓ | ✓ | ✓ |
| Sect — day/night, sect light, benefic & malefic of sect, contrary to sect | ✓ | ✓ | partial |
| The twelve places and their topics (`places.dart`) | ✓ | ✓ | partial |
| Angularity — pivots, epanaphorai, apoklimata | ✓ | ✓ | ✓ |
| Planetary joys | ✓ | ✓ | — |
| Thema Mundi (teaching device, and the source of the rulership scheme) | ✓ | — | — |

**Rulership and dignity**

| doctrine | A | P | S |
|---|:-:|:-:|:-:|
| Domicile, exaltation, detriment, fall | ✓ | ✓ | — |
| Bounds ⚠ **Egyptian *and* Ptolemaic — they differ, and a module must say which it used** | ✓ | ✓ | partial |
| Decans / faces (Egyptian order) | ✓ | ✓ | partial |
| Triplicity rulers (Dorothean: day, night, participating) | ✓ | ✓ | — |
| Domicile-lord chains / oikodespotes | ✓ | — | — |

**Configuration and condition**

| doctrine | A | P | S |
|---|:-:|:-:|:-:|
| Aspects by **sign** as well as by degree ⚠ the Hellenistic set only — no minor aspects | ✓ | ✓ | degree only |
| Applying vs separating | ✓ | ✓ | ✓ |
| Overcoming, dexter/sinister, superiority | ✓ | partial | — |
| Bonification and maltreatment (`conditions.dart`) | ✓ | — | — |
| Enclosure / besiegement (`enclosure.dart`) | ✓ | — | — |
| Solar phase — cazimi, combustion, under the beams, oriental/occidental, stations, retrogradation (`solar_phase.dart`) | ✓ | ✓ | — |
| Lunar phase, waxing and waning, the Moon's course | ✓ | ✓ | ✓ |
| **Doryphory** (spear-bearing / bodyguards) | — | — | — |

**Lots** — all seven Hermetic lots are in `astropractise/lib/domain/astrology/lots.dart`

| doctrine | A | P | S |
|---|:-:|:-:|:-:|
| Fortune, Spirit, Eros, Necessity, Courage, Victory, Nemesis | ✓ | — | — |
| Fortune as a second Ascendant; the places counted from it | ✓ | — | — |
| Topical lots (marriage, children, father, …) | partial | — | — |

**Time-lord and predictive**

| doctrine | A | P | S |
|---|:-:|:-:|:-:|
| Annual profections | ✓ | ✓ | ✓ |
| Monthly profections | ✓ | ✓ | ✓ |
| Daily profections | ✓ | — | — |
| Zodiacal releasing — **four levels** | ✓ | L1 | L1 |
| Loosing of the bond, all three readings | ✓ | ✓ | ✓ |
| Releasing from **Spirit** as well as Fortune | ✓ | partial | partial |
| Circumambulation through the bounds | ✓ | ✓ | — |
| Ascensional times / rising times of signs ⚠ needed by both of the above | ✓ | ✓ | — |
| Primary directions | ✓ | ✓ | — |
| Solar returns | — | ✓ | ✓ |
| Transits — to natal **and to the profected** places | ✓ | ✓ | natal only |
| **Decennials** (Valens, 10y 9m) | — | — | — |
| Firdaria ⚠ Persian, post-Hellenistic — include only if Sophia wants it | — | — | — |

**Length of life and the master of the nativity**

| doctrine | A | P | S |
|---|:-:|:-:|:-:|
| Hyleg / releaser (`length_of_life.dart`) | ✓ | — | — |
| Alcocoden / giver of years | partial | — | — |
| Predominator (`predominator.dart`) | ✓ | — | — |

**Remaining**

| doctrine | A | P | S |
|---|:-:|:-:|:-:|
| Antiscia and contra-antiscia | — | ✓ | — |
| Fixed stars, and parans | — | partial | — |
| Lunar nodes | — | ✓ | — |
| Dodekatemoria / twelfth-parts | — | — | — |
| Monomoiria | — | — | — |

### ⚠ Missing from all three

Nothing here is exotic; each appears in the surviving sources and each is
absent everywhere:

1. **Doryphory** — bodyguarding. In astropractise's `FEATURE_SPEC.md` and its
   `CANON-03` research notes but not in code.
2. **Decennials** — Valens' 10-year-9-month periods.
3. **Dodekatemoria** (twelfth-parts) and **monomoiria** (individual degrees).
4. **Parans**, and a Hellenistic fixed-star set.
5. **Daily profections** exist only in astropractise.

### ⚠ NOT Hellenistic — do not add these in the name of completeness

I had this wrong in the previous draft, so it is worth stating plainly:

- **Nakshatras** and **all ayanamsas / the sidereal zodiac.** Hellenistic
  astrology is **tropical**. The phone carries these for its own general
  astrology and they are legitimate there — they are not a gap in a Hellenistic
  module and porting them here in the name of parity would be wrong.
- **Quadrant house systems** — Placidus, Koch, Regiomontanus. Sophia's standing
  instruction: *"whole sign houses are consistent across all of Hellenistic
  astrology — we don't change the method."* Porphyry existed in the period, but
  the method is settled. **"Missing house divisions" is not a gap.**
- **Modern planets**, asteroids, Chiron.
- **Minor aspects** — semisextile, quincunx, quintile and the rest.
- **Secondary progressions** — later tradition. The phone has them; that is the
  phone's business.

### What I would actually do

1. **Do not port doctrine from the phone to this site.** For anything
   Hellenistic, astropractise is the better source and the phone is not
   authoritative — the releasing-levels case above is what that mistake looks
   like when it has already happened.
2. **Raise this site's releasing to four levels**, from astropractise's
   `releasing.dart`, and vector it. It is the largest single correctness gap
   here and the work is bounded.
3. Treat the rest as one decision rather than twenty: **the doctrine layer
   (sect, lots, dignities, conditions) is what this site lacks**, and it is
   arithmetic over positions, so it is vector-able exactly like the eight.
4. ⚠ **Revisit the vectors-not-a-shared-core decision before porting primary
   directions or circumambulation.** Those are numerically delicate — arcs of
   ascension, obliquity, the places two honest implementations differ in the
   fourth decimal and nobody can say which is right. The reasoning, including
   when to change our minds, is in `tests/vectors/README.md`. That file also
   says to revisit if the shared-primitive list passes roughly fifteen; the
   doctrine layer would take it past that on its own.
