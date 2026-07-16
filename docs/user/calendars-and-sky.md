# Calendars and the sky

Theourgia keeps time the way a magician does: in several calendars at
once, by planetary hours rather than office hours, and with the moon's
phase always in view. Most of this surfaces on the Today page (`/`),
stamps itself onto your journal entries, and can follow you into any
calendar application through a private feed.

## The multi-calendar engine

The vault computes every date in four calendar systems: **Gregorian**,
**Julian**, **Hebrew** (with proper month names — Nisan, Tammuz, and so
on, never "month 4"), and **Thelemic** (era-based year notation). These
appear on the Today page, in the auto-stamp on every journal entry, and
in the `/calendar` multi-calendar stamp block inside the editor. The
engine is pluggable, so additional calendars can arrive as plugins.

## Planetary hours

Planetary hours are computed from real sunrise and sunset at your
location, in the Chaldean order. The Today page shows the current
hour's ruler prominently and the full table of the day's twenty-four
hours, so you can plan a working for the hour of Venus rather than
"sometime this evening".

## Lunar phases

The Today page's lunar widget shows the current phase and illumination
percentage, rendered for your hemisphere. Behind it, the vault tracks
the astronomical event stream — new moons, quarters, full moons,
ingresses, stations retrograde and direct, and solar and lunar
eclipses — which is also what powers the events feed described below.

## Liber Resh

For magicians who keep the fourfold solar adorations, the vault
computes the day's four stations — sunrise, noon, sunset, midnight —
for your latitude, records each adoration you perform, and tracks your
current streak. Support threads through the product:

- A **Liber Resh** entry kind and a built-in "Liber Resh adoration"
  entry template (titled "Resh — {transition} {date}").
- A Liber Resh reference card on the Daily practice tracker
  (`/daily-practice`).
- An **Adorations (Liber Resh)** toggle on your calendar feed, which
  puts the four stations into any calendar application you subscribe
  from.

## Festivals

Festival overlays ship for five traditions, each entry carrying cited
sources that distinguish primary attestation, scholarly reconstruction,
and contemporary practice:

- **Wheel of the Year** — the eight Sabbats, with the modern synthesis
  honestly attributed.
- **Greek** — Anthesteria, Thesmophoria, Eleusinia, Panathenaia, and
  Pyanepsia.
- **Roman** — Lupercalia, Floralia, Vestalia, Saturnalia, and
  Compitalia, anchored on Ovid's *Fasti*.
- **Hekatean** — the monthly Deipnon and Noumenia, keyed to the lunar
  cycle.
- **Thelemic** — the Feasts of the Times, Crowleymas, and the Three
  Days of the Writing of the Book.

Hindu and Egyptian festival calendars are deliberately not included
yet: those traditions deserve consultation with practitioners before
the project ships data for them.

Festivals and astronomical events are served together for any date
range you ask about, and can be included in your calendar feed.

## The election finder

The vault can search forward through the ephemeris for the most
favourable moments that satisfy a set of astrological constraints. It
ships with three pre-built recipes — consecrating a Venus talisman,
consulting Mercury before correspondence, and a Hekate working — and
accepts custom constraint sets through the vault's API
(`POST /api/v1/astro/election/search`). A talisman in the designer can
carry a linked election, and the designer warns when the chosen
window has already passed without a recorded consecration.

## Calendar feeds (iCal)

The Calendar feed page (`/icalfeed`) manages a private, subscribable
iCal feed of your vault's time-keeping. Six independent toggles control
what the feed contains: planetary hours, lunar events, Liber Resh
adorations, workings, pilgrimage anniversaries, and custom events.

The feed lives at an unguessable token URL (`/ical/v1/{token}.ics`)
that works in any calendar client — Apple Calendar, Google Calendar,
Thunderbird, Fastmail, and the rest. If the URL ever leaks, one press
of **Regenerate** rotates the token; the old URL stops working
immediately.

The feed keeps the vault's honesty rules even outside the vault: on a
day where the only activity is sealed, the feed emits a single all-day
marker reading "N sealed entries today" — a count, with no title, no
description, and no location. Sealed pilgrimage anniversaries are
excluded from the feed entirely.

## A note on the Calendar page

The navigation's *Calendar* entry (`/calendar`) is currently a
signpost: the dedicated month-grid surface for feasts and lunations is
still on its way from design. The Today page is where the live
calendar and sky data lives day to day.
