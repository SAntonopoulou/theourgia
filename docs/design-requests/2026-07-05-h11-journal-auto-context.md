# H11 — Journal auto-context: moon · weather · calendars

**Request opened:** 2026-07-05
**Requested by:** Soror Ευ. Α.
**Scope:** design fidelity for a set of chrome affordances + one new
settings surface that make filling the journal *effortless* — every
entry automatically captures the astrological, meteorological, and
calendrical context of the moment it was written.

## The ask, in one breath

> When I write a journal entry, the moon phase, the current weather,
> the planetary hour, and the date in every calendar I care about
> should already be filled in. I shouldn't have to type them or
> remember to look them up. If I moved cities, or if it's overcast,
> or if it's a solar eclipse — the entry should know.

## Why now

The substrate is already there:

- **Swiss Ephemeris** (`backend/theourgia/services/astro/`) computes
  moon phase, planetary hours, aspects, and multi-tradition astrology
  to arcsecond precision. `/api/v1/astro/*` is live.
- **Multi-calendar** (Hebrew · Hijri · Mayan · Egyptian · Julian ·
  Liber Resh · Gregorian) exists in `services/calendars/`. Endpoints
  ship as Phase 03 substrate.
- **User location** is captured via `/api/v1/settings/location` (the
  Connection surface's "Set location" button in the current admin
  SPA). Astro calculations already consume it.

What's missing is (a) a **weather** source and (b) the **entry
composer chrome** that surfaces this context automatically at
compose time and persists it onto the entry.

## Surfaces to design

### Surface 1 · `EntryContextBanner`

A slim always-visible band inside the entry composer that shows,
right now, at the practitioner's stored location:

- **Moon phase** — glyph + name (Waxing Crescent · 32% illuminated)
  + tap-through to the astro dashboard
- **Planetary hour** — glyph + planet name (Hour of Mercury) +
  tap-through to the elections finder
- **Weather** — conditions + temperature (Overcast · 14°C · Athens)
  + wind if notable + tap-through to Wellbeing weather panel
- **Multi-calendar chip** — one line collapsed, expandable to five
  lines (Gregorian · Hebrew · Hijri · Julian · Egyptian · Mayan Long
  Count · Liber Resh). Practitioner picks in Settings which of the
  five they see collapsed; the rest live behind the expand affordance.

This banner is **read-only** — the practitioner cannot edit it. That
is the point: what the entry captured is what was true at the
moment. If the practitioner disagrees with the weather API, they can
attach a free-text note ("felt hotter than reported") but the
recorded value is the authoritative one at capture time.

**Design questions for you:**

- Where does the banner sit in the composer? Above the title? Below?
  A collapsible bar at the top? An always-visible sidebar?
- What's the visual density? All four chips inline, or grouped 2×2?
- What tone for "no weather available" (offline, or location unset)?
- Should the banner show a subtle "captured X seconds ago" freshness
  hint, or is that too fussy?

### Surface 2 · `AutoContextSettings` (`/settings/auto-context`)

A new sub-page under Settings → Preferences that lets the
practitioner tune what the composer auto-captures:

- **Moon phase** · always on / never / only for ritual + working
  entries
- **Planetary hour** · always on / never / only for ritual + working
- **Weather** · always on / never / with detail (temp + conditions
  + wind + pressure + humidity) / minimal (conditions only)
- **Which calendars** · pick 0-5 to show in the banner's collapsed
  state (all remain accessible via expand)
- **Weather provider** · Open-Meteo (default; no API key needed) /
  self-hosted / off. Documented that Open-Meteo is a
  privacy-respecting free API — no account, no tracking, EU-based.
- **Location strategy** · manual (as today) / detect on first
  compose (browser geolocation with explicit permission prompt) /
  detect always (permission granted per session)

**Design questions for you:**

- Toggles + segmented controls, matching the AccessibilityAndMotion
  surface's language? Or something more editorial for a settings
  page that shapes writing experience?
- Copy for the geolocation prompt — the practitioner is being asked
  to share location with the browser; how do we say it in the same
  care-first tone as the crisis-nudge copy?

### Surface 3 · `EntryContextViewer`

A read-only display block that shows the auto-captured context on
an *existing* entry — visible in the Editor when re-reading a
published/saved entry, and in the reader / public-page views if the
practitioner set the entry to "reveal context".

Practitioners can choose per-entry whether the auto-context is:

- **Hidden** — captured but not shown (default for personal entries)
- **Practitioner-only** — shown to you but not viewers/subscribers
- **Revealed** — shown in the reader (default for public
  publications, letting your readers see the context of a working)

**Design questions for you:**

- Where in the reader does this sit? Above the title? Below? Beside?
- What's the visual difference between practitioner-only and
  revealed? A subtle chip? A different border?
- On mobile, does context collapse into a single "context ▸" line?

## Backend contract (already lockable)

The composer would call one new endpoint at open time:

```
GET /api/v1/entries/context
  → {
      "captured_at": "2026-07-05T14:32:00+02:00",
      "location": {"lat": 37.9838, "lng": 23.7275, "label": "Athens, GR"},
      "moon": {"phase": "waxing_crescent", "illumination": 0.32,
               "phase_name": "Waxing Crescent",
               "next_phase_at": "2026-07-08T02:15:00Z"},
      "planetary_hour": {"planet": "mercury", "hour_index": 4,
                         "hour_of_day": "hour_of_mercury",
                         "next_hour_at": "2026-07-05T15:14:00+02:00"},
      "weather": {"conditions": "overcast", "temp_c": 14.2,
                  "wind_kph": 12, "wind_direction": "NE",
                  "provider": "open-meteo"},
      "calendars": {
        "gregorian": "2026-07-05",
        "hebrew": "20 Tammuz 5786",
        "hijri": "20 Muharram 1448",
        "julian": "22 June 2026",
        "egyptian": "20 Epiphi",
        "mayan_lc": "13.0.13.9.14",
        "liber_resh": "post-meridian, Ra-Hoor-Khuit"
      }
    }
```

Persisted onto the entry via new columns on the `entry` table:
`context_moon_phase`, `context_moon_illumination`,
`context_planetary_hour`, `context_weather` (JSONB),
`context_calendars` (JSONB), `context_captured_at`,
`context_captured_lat`, `context_captured_lng`. All nullable — an
entry composed with location unset or weather off simply has NULL
for the missing pieces.

## Honesty rules (design should encode)

- **№ 61** — auto-captured context is never fabricated. If the
  weather provider is unreachable, the field is absent, not
  synthesised from a stale cache.
- **№ 62** — the reveal-context choice is per-entry, not global. The
  practitioner decides each time whether readers see the frame.
- **№ 63** — the location that was used is recorded alongside the
  context. If you moved cities between entries, the ledger reflects
  it.
- **№ 64** — the calendar row is display, not truth. The
  authoritative timestamp is the UTC instant of `context_captured_at`.
- **№ 65** — weather providers must be privacy-respecting. Default
  Open-Meteo. No IP geolocation without explicit consent.

## Cross-cutting

This work touches four systems:

- **Composer chrome** (frontend/admin — Editor route)
- **Entry model** (backend — new columns + migration)
- **Weather service adapter** (backend — new
  `services/weather/{open_meteo,mock}.py`)
- **Settings surface** (frontend/shared — AutoContextSettings)

Roughly a 4-batch backend + 3-surface frontend piece.

## Not in scope for this handoff

- **Historical backfill.** Existing entries stay without auto-context.
  Only entries composed after the feature ships get it. (Backfill is
  a separate one-shot maintenance script that could ship in a later
  batch.)
- **Weather forecasting.** We capture *current* weather at compose
  time. Predicting weather at a future ritual time is election work
  and belongs in the Scheduler surface, not the Journal composer.
- **Local-only ephemeris.** The Swiss Ephemeris files ship with the
  app and produce astro data offline. Weather requires network. The
  offline case is a first-class concern — please indicate what the
  banner looks like when only some fields have values.

## What comes back to us

- Six `.dc.html` mockups: `EntryContextBanner` in compose mode ·
  `EntryContextBanner` in offline mode · `AutoContextSettings`
  full-page · `EntryContextViewer` practitioner-only ·
  `EntryContextViewer` revealed · geolocation permission dialog copy.
- Copy for every field label, including the calendar names in their
  own scripts (Hebrew, Arabic, Egyptian hieroglyphs are all in the
  Style Guide already).
- A settings section for AutoContext to slot into
  `AccountSettingsSurface`'s existing hub.
- Whatever new tokens the banner introduces (moon-phase glyphs beyond
  the eight already in the shared icon sprite, weather glyphs).

## Rough scope

I estimate 6 surfaces + tokens + 5 new honesty rules — smaller than
H07 (21 surfaces), similar to H04 (Daily Practice + Divination).
Should unblock a self-contained 2-3 week build.

---

Ready to hand off. Please let me know timing when you can.

Co-Authored-By: Claude Opus 4.7 (1M context)
