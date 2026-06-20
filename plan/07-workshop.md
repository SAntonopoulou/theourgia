# Phase 07 — Workshop

> The making-of-things surface. Sigil generators (many modes), magic squares, talisman designers, magical circle builders, the tool/altar registry, voce magicae recording. The technomagickal heart of the application.

## Goal

Provide a suite of vector-graphics-based generators and a structured registry of physical tools, such that a magician can take a working from intention → sigil → talisman → ritual circle → consecrated tool → log entry, all within the system, with everything exportable to SVG/PDF for physical use.

## Dependencies

- Phase 00 (Foundations)
- Phase 01 (Core Architecture) — sigil / talisman / tool tables, attachments
- Phase 02 (Frontend Foundations) — canvas/SVG drawing primitives
- Phase 08 (Linguistic Tools) shares the gematria engine — workshop consumes but doesn't block

## Deliverables

### 1. Sigil generator
- `sigil` table: id, vault_id, source_text, mode, parameters (JSON), svg, png_cache, seed, created_at, notes, linked entities/workings
- **Generation modes (each fully implemented):**
  - **Spare letter elimination:** classical Austin Osman Spare method — strip vowels, eliminate repeats, compose remaining letterforms into a single glyph; offers automatic composition + manual refinement
  - **Kamea pathing:** trace the gematria values of the intention through a chosen planetary magic square; output a connected polyline on the square; selectable square (Saturn 3×3 through Moon 9×9)
  - **Rose Cross cipher:** map letters of the intention to positions on the Rose Cross diagram; trace connecting lines
  - **Pythagorean rosette:** number-to-position on a labeled rosette wheel; line trace
  - **Hebrew letter sigil:** Notarikon-style; each Hebrew letter has a positional convention; user can choose font/style for the letterforms
  - **Greek letter sigil:** isopsephic version of the same; classical Greek shapes
  - **Hashed-vector deterministic:** SHA-256 of (intention + salt) → seed → parametric curve (configurable family: Bezier, rose, lissajous, polar) → SVG. Same intention same sigil; one character changes everything.
  - **Harmonograph:** gematria values of intention map to oscillator frequencies; draw resulting trace
  - **User-supplied parametric formula:** the magician enters `r = f(θ, g, t)` where `g` is the gematria value; we render. Includes a small expression-evaluator with safe-mode (no arbitrary code execution).
  - **Freeform vector draw:** pen-tool-and-pressure-sensitive drawing on canvas
  - **Image upload:** user-provided sigil image; we vectorize via potrace; user refines
- **Operations on a sigil:** rename, recolor, resize, simplify, mirror, rotate, layer with other sigils, embed in talisman
- **Export:** SVG (primary), PNG, PDF (printable), DXF (for laser cutters)
- **Personal owned-deck helper:** a private mode that lets a user layer hand-traced art from a deck they personally own with sigil overlays for personal study. Not shareable. Not exportable for redistribution. Explicit owned-copy confirmation at use.

### 2. Magic squares (Kamea)
- All seven traditional planetary squares (Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon)
- Each square renders with: numerical cells, Hebrew gematria labels, planetary sigil derived from path through square (a separate sigil mode), arrows showing path of intention
- Custom squares: user can define an n×n square with custom numbering, save, label
- Integration with sigil generator: any Kamea is a usable sigil source

### 3. Talisman designer
- `talisman` table: id, vault_id, name, purpose, design (composite SVG), components (list of sigils, squares, names, borders), front and back, materials notes, intended consecration
- Canvas-based composer:
  - Layered: background (parchment / metal / wood texture / blank), border (configurable: Hebrew names of God, Greek epithets, planetary glyphs in a circle, custom inscription), central sigil(s), magic square embeds, additional inscriptions, charged image of the entity
  - Snap-to-circle layout
  - Color picker with traditional planetary color schemes
- Front + back composition
- Export: scaled SVG/PDF for printing, fabrication, engraving

### 4. Magical circle builder
- Concentric rings: configurable count, each with its own content
- Per-ring content: inscription (English, Greek, Hebrew, Latin, custom font), glyph row (planetary, zodiacal, elemental, custom), single image (entity portrait, sigil), or blank
- Compass points: configurable per-quarter (e.g., archangels Raphael / Michael / Gabriel / Uriel; or Greek wind gods; or four watchtowers)
- Central element: pentagram, hexagram, unicursal hexagram, magic circle (with name), custom sigil, or blank
- Scale: real-world meters, with a printable tile mode (print on multiple sheets and assemble)
- Library of preset circles: LBRP banishing pentagrams arrangement, Heptameron-style spirit triangle adjacency, Goetic triangle of art, etc. (where source materials are public domain)
- Export: SVG, PDF (with tile mode), DXF

### 5. Tool / altar registry
- `tool` table: id, vault_id, name, kind (wand, athame, chalice, pentacle/disc, censer, bell, sword, lamp, mirror, bowl, statue, cingulum, robe, talisman, drinking cup, libation cup, etc.), description, materials, dimensions, photos, provenance (where acquired or made, by whom), creation date, consecration date, consecration ritual reference (link to working), history of use (recent uses), current location/storage
- `altar` table: a collection of tools currently arranged for a specific working or permanent setup; layout diagram; photos
- Per-tool history: which workings, which entities, which offerings have involved it
- "Recommend a tool" suggestion when designing a working ("This is a Hekate working at the dark moon — you have these consecrated tools attributed to her")

### 6. Voces magicae recorder
- Record-and-replay voce magicae (barbarous names of power)
- Library of recorded chants per ritual / per entity
- Pronunciation reference: user can record themselves, save to library
- Used in ritual mode: chant playback during ritual execution (optional)
- Linked to entities (e.g., Hekate's voces magicae from PGM IV.2785–2890)

### 7. Frontend
- Sigil studio: mode selector → intention input → parameter configuration → live preview → refinement → save
- Magic square viewer / editor
- Talisman composer (canvas + layer panel)
- Circle builder (concentric-ring composer)
- Tool registry browser and tool detail page
- Voce magicae library

### 8. APIs
- `GET/POST/PATCH/DELETE /api/v1/sigils`
- `POST /api/v1/sigils/generate` — server-side generation for complex modes
- `GET/POST /api/v1/talismans`
- `GET/POST /api/v1/circles`
- `GET/POST /api/v1/tools`
- `GET/POST /api/v1/altars`
- `GET/POST /api/v1/voces` — voce magicae recordings

## Design notes

- Everything renders SVG. SVG is the lingua franca for export — printable, etchable, manipulable.
- The user-supplied parametric formula evaluator must be sandboxed. Use a small whitelist (sin, cos, sqrt, pow, etc.) and a safe expression parser. No arbitrary code execution.
- Talisman and circle designers benefit hugely from a snap-grid and snap-to-circle helpers. Implement them.
- The owned-deck personal-use helper is a quiet feature for personal study with decks the user owns. It must explicitly forbid sharing or exporting redistributable copies.

## Risks

- **Risk:** Sigil aesthetics — algorithmic sigils can look uniform/boring. **Mitigation:** Diverse modes; manual refinement; mix-and-layer support.
- **Risk:** Canvas / SVG performance with complex talismans. **Mitigation:** Lazy rendering; raster preview at low zoom; vector at high zoom.
- **Risk:** Real-world scaling for printed circles is error-prone. **Mitigation:** Print-test mode that generates a 10cm calibration square; user measures with a ruler before printing the full circle.

## Definition of Done

- [ ] All sigil modes generate consistent, exportable SVGs
- [ ] Kamea squares correct and rendered with full attributions
- [ ] Talisman composer functional with front + back
- [ ] Magical circle builder produces print-tiled output that assembles correctly
- [ ] Tool registry full CRUD + recommendation engine
- [ ] Voce magicae recording and playback works
- [ ] Personal-use Thoth helper has all redistribution prevention controls verified
- [ ] All exports validated by physically printing one of each
