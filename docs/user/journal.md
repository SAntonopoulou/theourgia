# Journal

The journal is the spine of the vault: every observation, ritual
record, dream, and reading is an entry. Entries carry their own
astrological and calendar context, their own visibility level, and —
when you choose — their own seal.

## Entry kinds

Every entry has one of seventeen kinds. Five are general-purpose:
observation, ritual, divination, synchronicity, and capture (the kind
quick-capture uses). Twelve are specialised practitioner records: note,
ritual log, dream, working, magical record, pathworking, scrying, body
practice, meeting note, study note, Liber Resh, and blog post. Kinds
drive the filter chips on the journal list and the per-kind statistics.

## Writing

Open `/journal` and select **New entry**; the vault creates the entry
and opens it in the editor at `/editor/:id`. The title is editable in
place, and the body auto-saves as you write — there is no save button
to remember.

Below the title you will find:

- **Tags and tradition tags** — free-form labels plus a separate row
  for tradition tags. Tradition tags matter: entries tagged with a
  closed tradition are refused at publish time (see below).
- **The auto-stamp chip** — the astrological and calendar snapshot
  taken when the entry was created.

### Slash commands and magical blocks

Typing `/` in the body opens the block menu. Sixteen commands insert
purpose-built blocks:

`/sigil`, `/quote` (quote with citation), `/gematria`, `/sensation`
(body sensation diagram), `/entity` (reference to a being in your
ledger), `/ritual` (ritual log), `/chart`, `/tarot`, `/iching`,
`/geomancy`, `/runes`, `/voce` (vox magica), `/correspondence`
(correspondence table), `/calendar` (multi-calendar stamp of a
moment), `/voice` (audio recording with caption and transcript), and
`/video` (a privacy-enhanced YouTube embed that loads nothing until
scrolled into view and never autoplays).

The entity, quote, and chart blocks open pickers over your own entity
ledger, library, and charts.

### Writing in other scripts

The editor ships a language palette for polytonic Greek (breathings,
accents, iota subscript), Hebrew (letters, final forms, niqud,
cantillation), and Sanskrit (a devanagari reference row plus a
romanisation-to-IAST transducer — typing `Kri.s.na` yields Kriṣṇa).
Inline text can be marked with its language so the right typeface is
used.

## Auto-stamping

Every entry is stamped at creation with:

- **Sky state** — sun sign and degree, moon sign, phase, and
  illumination percentage, and the positions of Mercury, Venus, Mars,
  Jupiter, and Saturn, computed with the Swiss Ephemeris for your
  stored location (falling back to Greenwich if none is set).
- **Calendars** — the date in the Gregorian, Julian, Hebrew, and
  Thelemic calendars.

The stamp renders as a chip in the editor and as a context box above
published entries. If the ephemeris is briefly unavailable, the entry
is still created — a stamp is never allowed to block your writing.

## Visibility

Each entry has one of four visibility levels, from most to least
private: **Personal** (you alone), **Viewer** (your named private
viewers), **Hub** (every member of the hubs the entry is shared into),
and **Public**.

Raising privacy applies at once. Lowering it always asks first, and the
seriousness of the confirmation scales with the exposure — sharing to a
hub warns that *every* member will see it, and publishing warns
plainly: you can unpublish later, but you cannot un-read; assume
anything published may be copied.

## Sealing

Sealing is separate from visibility and stronger than all of it.
Sealing converts an entry to zero-knowledge encryption: the key never
leaves your device, and the server cannot read the entry, cannot search
it, and cannot recover it if the key is lost.

The consequences are enforced, not advisory: sealed entries cannot be
published (the server refuses), their bodies cannot be edited through
the ordinary save path, and they are excluded from server-side search
and from the gematria index. The seal control lives in the editor's
visibility chip.

## Publishing

The **Publish** button in the editor stamps the entry with a
publication time and promotes its visibility to Public, which places it
on your vault's public blog. Publishing is idempotent — pressing it
again never changes the original timestamp. Two refusals are built in:
sealed entries cannot be published, and entries carrying a
closed-tradition tag are refused with a respect-source notice.

## Comments

Comments are off by default everywhere. They can be enabled per entry
and per publication; when enabled, readers' comments arrive in a
moderation queue at `/comments-moderation` with pending, approved,
rejected, and spam states — nothing appears publicly without your
approval. The submission form carries a honeypot to shed automated
spam.

## Searching, honestly

The journal list at `/journal` filters by kind chips and by a text
search over titles and excerpts. Deeper searches — full-text search
over entry bodies, the cross-journal gematria search at
`/gematria/search`, and the query builder at `/query` — all share one
rule: sealed entries are never readable by search, and rather than
hiding that fact, results report how many sealed entries were excluded.
A search that says "3 sealed entries excluded" is telling you the
truth about what it could not see.

## Archiving

Deleting an entry is a soft archive — it disappears from lists and
statistics. Permanent removal happens only through the data-deletion
flows described in [Settings and security](settings-and-security.md).
