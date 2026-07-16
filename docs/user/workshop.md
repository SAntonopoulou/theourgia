# The Workshop

The Workshop is where you make things: sigils, magic squares, talismans,
magical circles, bind-runes, and the registry of the physical tools on
your altar. Everything you design here is saved to your vault, exports
as a scalable vector graphic (SVG), and can be referenced from journal
entries, workings, and other designs.

The Workshop overview lives at `/workshop`; each maker has its own page,
listed below.

## Sigil generator

At `/sigils`. Type an intention, choose a construction mode, and refine
the result. Eleven modes are available:

- **Spare letter elimination** — the classical method: strike repeated
  letters, compose the remainder into a glyph, automatically or by hand.
- **Kamea pathing** — trace your intention's letter values through a
  planetary magic square of your choosing.
- **Rose Cross cipher** — map letters to positions on the Rose Cross
  diagram and connect them.
- **Pythagorean rosette** — numbers to positions on a labeled wheel.
- **Hebrew letter sigil** — Notarikon-style letterform composition.
- **Greek letter sigil** — the isopsephic equivalent, with classical
  Greek letter shapes.
- **Hashed vector** — a deterministic curve seeded from your intention
  plus a salt; the same input always redraws the same sigil.
- **Harmonograph** — letter values become oscillator frequencies for a
  Lissajous-style figure.
- **Parametric formula** — write your own curve formula; it runs in a
  sandbox, so a typo cannot harm anything.
- **Freeform draw** — a pen tool for drawing by hand.
- **Image upload** — trace an uploaded image into a vector you can refine.

A saved sigil records its intention, mode, parameters, drawing, and seed,
and those are fixed once saved — the making is committed. To develop a
sigil further, fork it: the fork keeps the lineage and gives you a fresh
version to change. Each sigil also carries a purpose (workshop draft,
consecrated, gift, or personal study).

## Magic squares

At `/magic-squares`. The seven planetary squares of Agrippa — Saturn
(3 by 3) through the Moon (9 by 9) — are bundled and immutable; they are
reference constants, not editable rows. You can also build custom squares
of any order. The vault checks your arithmetic for you: a square is only
marked magic when every row, column, and both main diagonals sum to the
magic constant. A custom square's order is fixed after creation, since
changing it would invalidate the cells.

## Talisman designer

At `/talismans`. A talisman is a composition: sigils and squares from
your vault, inscriptions, and name-rings arranged in layers, with a front
and a back face. The faces render from the composition, so editing a
component updates the whole.

Two honesty rules shape this surface:

- **A consecrated talisman is read-only.** Once you link a talisman to
  its consecration working, editing requires a fork — the consecrated
  original stays as it was.
- **A sealed talisman is encrypted on your device.** When you seal a
  talisman, your browser derives a key from your passphrase (PBKDF2 with
  600,000 iterations) and encrypts the design with AES-256-GCM before
  anything leaves your machine. The server stores only ciphertext and
  clears the plaintext. Reading it back prompts for your passphrase and
  decrypts in memory; the key never leaves your device, and the server
  cannot recover the design if the passphrase is lost.

## Magical circle builder

At `/circles`. Compose a circle from one to six concentric rings, each
carrying an inscription (in any script), a row of glyphs, an image, or
nothing. Compass points can hold archangels, wind gods, watchtowers, or
custom content, and the centre can embed one of your sigils or squares —
or one of the seven planetary fixtures directly. Five public-domain
preset circles are bundled as starting points. Circles fork rather than
overwrite: a fork records its parent, and that lineage cannot be edited
by hand.

## Bind-rune designer

At `/bind-rune`. Layer runes over a shared stave into one bound mark.
The rune picker draws from the bundled rune rows, including the Younger
Futhark, the Anglo-Saxon Futhorc, the Armanen row, and the standalone
Northumbrian set. Composition happens entirely in your browser and the
result exports as SVG. Saving bind-runes into the sigil vault is not
wired yet — export what you make.

## Tool and altar registry

At `/tools`. A record for each physical tool: name, kind (athame, wand,
chalice, pentacle, censer, bell, sword, lamp, mirror, bowl, statue,
robe, cingulum, or other), description, materials, photos, provenance,
and history. Tools group into altar collections for specific workings or
permanent setups.

Consecration is deliberate here: you cannot type a consecration date into
the edit form. Marking a tool consecrated requires linking it to a real
working entry in your journal, and un-consecrating is its own separate
action — so the record stays honest, and honest mistakes stay correctable.

## Voces magicae

At `/voces`. A library of words of power. Thirty-two public-domain
entries are bundled — drawn from the Greek Magical Papyri, the Sefer
Yetzirah, the Lemegeton, the Heptameron, and Sanskrit sources — each with
original script, transliteration, pronunciation, and source citation.
Fork a bundled entry to annotate it, or add your own. Every entry you
create must carry a source citation; the field cannot be left empty or
cleared later. You can attach audio recordings of your own pronunciation
to any entry.

The bundled corpus is also browsable read-only, with filtering by
tradition, at `/voces-library` — see the Linguistic Tools guide.
