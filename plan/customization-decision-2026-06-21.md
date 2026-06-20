# Per-vault customization — 2026-06-21

**Status:** Resolved. The customization boundary is locked. Implementation follows the existing plugin substrate; no new infrastructure required.

**Author:** Soror Ευ. Α. + Claude (collaboration session, 2026-06-21).

**Origin:** Open question #1 from the designer's `PROGRESS.md`: *"Per-vault customization depth (how much can a magician theme their public face?)"*

## Decision

> **Per-vault customization is bounded by the token shape. Pick a theme, mode, a11y prefs, and which calendars to layer; the public face content is yours. Anything beyond that ships as a plugin that extends the token shape without breaking it.**

The design system's ~70 CSS-variable tokens are the customization surface. Plugins can introduce *new values* for the same tokens (a new `data-theme`) and *new entries* into the same registries (calendars, glyphs, entity classes). Plugins cannot override component shapes, add raw hex outside the token system, replace primitives, or hide a11y features.

## What every user gets (core, no plugins)

| Customization | Where it lives | Notes |
|---|---|---|
| Theme: `base` / `hellenic` / `thelemic` | S10 `ui.theme` | Already implemented |
| Mode: `dark` / `light` | S10 `ui.mode` (or extend `ui.theme` model) | `dark` leads |
| A11y: high-contrast, CVD-safe, reduced-motion, font scale | S10 `a11y.*` | Already implemented |
| Sidebar position / density | S10 `ui.sidebar.*` / `ui.density` | Already implemented |
| Locale + timezone | S10 `i18n.locale_override` / `i18n.timezone` | Already implemented |
| **Public-face content**: avatar, display name, bio, featured essay, which sections show (writings / lineage / rituals / book) | Persona + per-feature toggles | Phase 02+ feature |
| Default calendar system + which secondary calendars to layer | S10 `i18n.timezone` plus a new `i18n.calendars` key | Adds a key to baseline settings |
| Default visibility on new entries | S10 `federation.publish_default` | Already implemented |

## What plugins can add

A "theme / calendar / tradition" plugin registers any of:

- **New `data-theme` value** — provides values for every existing token. E.g. `data-theme="vodou"` re-skins with the same UI shape.
- **New tradition-date resolver** — same shape as Scheduler's existing resolver for Beltane / Solstice / Mounukhiṓn. Adds a calendar a user can layer.
- **New glyphs in the engraving sprite** — extends `tokens/theourgia-icons.svg`; the `Glyph` component looks them up by name.
- **New entity-class types** — extends the entity model's `class` enum-ish set (`yokai`, `loa`, `kami`, etc.).
- **New ritual / divination tools** — Phase 06 plugin extension points.

The plugin substrate's capability allowlist (Phase 01 Batch 6) already enforces this — each capability is granted explicitly and the plugin cannot exceed it.

## What plugins CANNOT do

- Override individual UI components or layouts
- Add raw hex colors outside the token system
- Replace primitives, the overlay family, or the app shell
- Hide a11y features (high-contrast, CVD-safe, focus rings, keyboard nav, RTL)
- Disable visibility / sealed-encryption controls
- Bypass GDPR / authorization / audit

## Worked example — Tonalpohualli (Mesoamerican day-count)

A Mesoamerican practitioner installs a community bundle `bundle:tonalpohualli`:

1. The bundle's manifest declares capabilities: `register-token-override` (for a `mexica` theme), `register-calendar-resolver` (Tonalpohualli day-sign math), `register-glyph` (20 day-sign glyphs), `register-entity-class` (Aztec pantheon classes).
2. The install wizard shows these in the consent screen (existing addendum surface).
3. After install, the practitioner sees:
   - **Today screen:** "1 Cipactli · ☽ Waxing Gibbous · 14 Jun 2027" — the Tonalpohualli reading sits alongside Gregorian; the calendar layer is theirs to toggle.
   - **Entity medallions:** Aztec pantheon entries render with day-sign glyphs.
   - **(Optional) data-theme="mexica":** the entire UI re-skins with the bundle's gold-vermilion-jade token values; every component still works because they all consume `var(--accent)` etc.
4. They uninstall the bundle later — every customization the bundle added cleanly reverts (their content stays, their theme falls back to a shipped one).

## Why this works

- **Coherence preserved.** Every component still uses the same token shapes; nothing custom-renders. A user with three plugins installed sees consistent UI.
- **No chaos.** Plugins can re-skin; they can't restructure. The "ten thousand different blog themes" problem doesn't materialize.
- **Practitioners served.** Tradition-specific aesthetics + calendar + glyph + entity classes are available without forcing the project to ship every tradition.
- **Closed-tradition support.** Closed-tradition bundles can lock their visual choices to the tradition (a Vodou plugin's `data-theme="vodou"` could be the only theme available when the bundle is installed; existing addendum surface already supports this).
- **Reverts cleanly.** Bundle install / sandbox / uninstall flow is already designed (Theourgia Bundles + Bundle Install + Sandbox surfaces).

## What this means for ongoing work

- **No new substrate needed.** S10 (per-user settings) + S6 (plugin substrate from Phase 01) + the design system's token model already do this together.
- **Add to S10 baseline settings:** `i18n.calendars` (list of calendar systems the user wants layered, defaulting to `["gregorian"]`). Trivial addition when the calendar plugin pattern actually ships.
- **Public-face customization** (which sections show on the Profile / Blog) is a per-persona setting set, not a per-user-account setting set. When the persona model gains content-table FKs (Phase 02/03), these settings join it.
- **Wordmark direction:** approved by Sophia 2026-06-21.

## Open question deferred

The designer's question #2 — "*'first-light' onboarding that biases defaults by chosen tradition*" — is taken up separately. Customization-via-plugins (this decision) doesn't depend on the first-light question; they're independent.
