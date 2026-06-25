"""Workshop domain — pure helpers + bundled fixtures.

Shared across the Workshop routers (sigils, magic squares, talismans,
circles, tools/altars, voces). Anything in this module is content,
not user-row data:

* :mod:`theourgia.core.workshop.planetary_squares` — the 7 Agrippa
  planetary magic squares (Saturn 3×3 → Moon 9×9). Immutable; ship
  as Python constants so they can never be silently mutated.
* :mod:`theourgia.core.workshop.preset_circles` — public-domain
  preset circles (LBRP, Heptameron, etc.). Templates only — loading
  a preset POSTs a new row; no FK back to the preset.
* :mod:`theourgia.core.workshop.bundled_voces` — the PGM IV
  voces-magicae starter library. Cross-vault read; fork-into-vault
  is the only mutation path.

Bundled fixtures are NOT seeded as DB rows — they live as constants
so they can never be soft-deleted, audited, or accidentally edited.
"""
