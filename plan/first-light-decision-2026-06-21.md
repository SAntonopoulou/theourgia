# First-light onboarding — 2026-06-21

**Status:** Resolved. Implementation deferred to Phase 02/03 alongside the signup flow.

**Author:** Soror Ευ. Α. + Claude (collaboration session, 2026-06-21).

**Origin:** Open question #2 from the designer's `PROGRESS.md`: *"'First-light' onboarding that biases defaults by chosen tradition — build it?"*

## Decision

**Yes — build it. As a short, opt-in flow that biases aesthetics, not identity.** Design the surface ourselves in the existing design system's vocabulary (the designer didn't mock it; we won't request another pass — the composition is small enough to compose from existing primitives and patterns).

## Scope

A new user signs up. On first launch they see a brief, skippable welcome sequence:

### Screen 1 — Identity (required)
- Display name + handle.
- These create the user's **default persona** (per `plan/persona-decision-2026-06-21.md`).

### Screen 2 — Starting aesthetic (optional, skippable)
- Three cards with miniature previews:
  - **Base** — tradition-neutral, Cardo, gold accent
  - **Hellenic** — GFS Didot, Greek calendar layer, Hellenist entity-class hints
  - **Thelemic** — Cinzel, Thelemic calendar layer, OTO-style entity-class hints
- A quiet **"Skip — I'll set this up later"** link as prominent as the cards. Skip = base.
- Plugins may register additional preset cards (see "Plugin extension" below).

### Screen 3 — Accessibility (optional, skippable)
- Quick toggles for high-contrast, large text, reduced motion.
- "Skip — I'll set this up later" affordance.

### Done
- Land on the Today screen.

## What the tradition picker actually does

- Writes `ui.theme` (S10 baseline setting) to the chosen value.
- Writes a primary calendar layer to `i18n.calendars` (a new baseline S10 key to add when the calendar plugin pattern actually ships — see `plan/customization-decision-2026-06-21.md`).
- For a few days after signup, the Today screen quietly suggests bundles relevant to the chosen aesthetic ("you might want to install the Hellenic Pantheon bundle"). This is a dismissible card, not a popup, not a required step.

**What the picker does NOT do:**
- Pre-populate entities, content, templates, or rituals.
- Force a tradition label onto the user (it's about aesthetic, not identity).
- Hide the other themes (the user can switch any time in Settings).
- Block first use (every screen is skippable).

## Why minimal, why aesthetic-not-identity

- The multi-tradition design is the project's identity — generic "welcome to your blank vault" wastes that. Three cards showing three coherent aesthetics is a free trust signal: "this app speaks multiple traditions" lands instantly.
- A picker that asks "what's your spiritual lineage" would feel reductive and gatekeeping. Naming the cards as aesthetics ("Hellenic feel" not "Are you a Hellenist") keeps it gentle.
- Eclectic practitioners — the majority — skip and land on base. Same destination, less polite questioning.
- Two screens max. The friction has to be paid for; one tasteful welcome moment is paid for, three screens of onboarding is not.

## Plugin extension

Consistent with `plan/customization-decision-2026-06-21.md`:

- Bundle manifests may declare a `first_light_preset` entry: `{ name, mini_preview_glyph, theme_value, default_calendars, hint_text }`.
- Bundles available pre-signup (shipped with the install, or in a "featured bundles" set) get their preset cards rendered alongside the three core ones.
- Out of the box: 3 preset cards (base / hellenic / thelemic) + Skip.

## Implementation notes (when this lands)

- **Visual vocabulary:** existing Card primitive (with `interactive` variant for clickable presets), Display type for the screen title, the engraving-icon glyphs for the mini-previews, the SegmentedControl for a11y toggles. No new primitives.
- **State:** each screen writes to S10 settings (or to the in-progress user-creation state on screen 1). Skipping advances without writing.
- **Hard rule respect:** the "Skip — I'll set this up later" copy must be exactly that — not a tiny gray link. It's offered alongside the choices, not hidden under them. (The customization-without-coercion stance.)
- **A11y:** as with every surface, focus-visible, ESC dismisses to the previous step, keyboard nav between cards, no native dialogs.
- **i18n:** all copy through `_()`. The card labels ("Hellenic feel", "Tradition-neutral", etc.) are user-facing strings — wrap them.
- **Tests:** snapshot of each screen's render at base/hellenic/thelemic × dark/light × high-contrast; "skip on screen 2 → settles to base" assertion; "skip on screen 1 → cannot proceed" assertion (it's the only required screen).

## When this lands

Alongside the **signup flow** in Phase 02 / Phase 03. It is not blocking for the design-system primitives (Batch 1) — first-light is a *use* of the primitives, not a prerequisite for them.

## Wordmark (designer open question #3)

Approved by Sophia 2026-06-21 in the same session. No further action.

## Summary — all three designer open questions resolved

| # | Question | Resolution | Doc |
|---|---|---|---|
| 1 | Per-vault customization depth | Bounded by token shape; plugins extend without restructuring | `plan/customization-decision-2026-06-21.md` |
| 2 | First-light onboarding | Yes, build it ourselves in the existing design vocabulary | This doc |
| 3 | Wordmark direction | Approved as drafted | (no doc; recorded in memory) |
