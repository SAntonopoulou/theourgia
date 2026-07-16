# Linguistic Tools

Sacred languages carry number, and number carries pattern. The
linguistic tools let you compute gematria across many ciphers, search
your whole journal by numeric value, keep long-running studies with
frozen results, transliterate between scripts, and type polytonic Greek,
Hebrew, and Sanskrit without leaving the editor.

## Gematria calculator

At `/gematria`. Pick one or more ciphers from the rail on the left, type
a word or phrase, and read the values. Every bundled cipher cites a
public-domain source, marked with a double-dagger.

The bundled catalog spans six languages:

- **Greek** — Isopsephy (with digamma, koppa, and sampi) and Ordinal.
- **Hebrew** — Mispar Hechrachi (standard), Mispar Siduri (ordinal),
  Mispar Gadol (finals valued 500 and up), Mispar Katan (reduced), and
  Atbash (the reversal cipher).
- **English** — Simple, Crowley's ALW cipher, New Aeon English Qabalah
  (NAEQ), and a Hebrew-mapped scheme.
- **Arabic** — the Abjad values.
- **Sanskrit** — Katapayadi.
- **Coptic** — Coptic isopsephy.

When two or more selected ciphers agree on a value, the calculator
surfaces the cross-cipher resonance (the top five shared values). You
can also define your own cipher in the custom-cipher dialog — every
letter must be given a value before it saves. Custom ciphers belong to
your vault; a cipher without a source citation is marked as personal, so
results computed with it are always flagged as yours rather than
traditional.

## Cross-journal gematria search

At `/gematria/search`. Ask the question "where in my journal does 418
appear?" The search scans the gematria index built from your entries and
returns every phrase that sums to your target, in any cipher you select.

Three match modes:

- **Exact** — phrases summing to precisely the target value.
- **Near** — phrases within a distance you choose of the target.
- **Reduced** — matches by digit reduction.

Two honesty rules govern the results. Sealed entries are never indexed,
so their text can never appear here; if sealed content would have
matched, you see only a count of sealed matches, never the phrases.
And results computed with a personal cipher are labeled as such, so
resonance from your own scheme is never mistaken for a traditional one.
Results export to CSV.

## Studies and frozen snapshots

At `/studies`, with each study at its own page. A study is a named,
persistent question — a saved gematria search, a saved gematria
calculation, or a saved query-builder query — that you can run again
over time.

The discipline of the surface:

- A study's query is **immutable after the first save**. You can rename
  the study and edit its notes, but the question itself does not drift.
- Running a study produces a **frozen snapshot**: the results are
  recorded as they were at that moment and can never be edited. Only
  your notes on a snapshot stay writable.
- Running again creates a **new** snapshot; nothing is replaced.

This gives you an honest record: what you asked, when you asked it, and
exactly what the vault answered each time.

## Transliteration utility

At `/transliterations`. Convert text between scripts and romanization
systems using eight bundled public-domain schemes:

- **Greek** — Beta Code and ALA-LC.
- **Sanskrit** — IAST and Harvard-Kyoto.
- **Hebrew** — SBL Hebrew Romanization.
- **Arabic** — ISO 233 and DIN 31635.
- **Coptic** — SBL Coptic.

Each scheme's full character mapping is inspectable, so you can verify
any conversion by eye.

## Typing in sacred scripts

The journal editor includes a language input palette so you do not need
to install system keyboards:

- **Polytonic Greek** — breathings, accents, and iota subscript.
- **Hebrew** — the letters, final (sofit) forms, niqud vowel points, and
  cantillation marks.
- **Sanskrit** — IAST characters plus a Devanagari reference row.

For Sanskrit there is also a transducer that converts plain-keyboard
romanization into proper IAST as you type: `.rgveda` becomes ṛgveda,
`Kri.s.na` becomes Kriṣṇa, `Raama` becomes Rāma, and `OM` becomes oṁ.
