# Phase 02 — Batch 6: Today surface + CelestialBand

> Sixth implementation batch of Phase 02 (Frontend Foundations).
>
> **Scope target:** the first *real* product surface — Today / Home — plus the **CelestialBand** domain control it depends on (planetary hour + lunar phase indicator, self-updating). Until this batch, every route was a placeholder; Today is the first one with actual interactive content.

## Why Today first

Per the design's app information architecture, Today is the landing page after the user opens their vault. It's the "what's now" surface — what time is it in the celestial sense, what entries are recent, what should the magician notice. It composes a lot of the design system at once:

- CelestialBand (new — this batch)
- Avatar + identity greeting
- Stat tiles (entries this week, etc.)
- Card (recent entries)
- EmptyState (when there are no recent entries)
- Toast (quick-capture feedback)

So it's a good first-surface stress test: every primitive layer gets exercised in a realistic composition.

## What this batch includes

- **CelestialBand** — a self-updating horizontal band that shows:
  - Current planetary hour + which planet rules it (Sun / Moon / Mars / Mercury / Jupiter / Venus / Saturn)
  - Current lunar phase + illumination percent
  - Today's solar position relative to sunrise/sunset
  - Visual: a horizontal strip with day/night gradient, current-time marker, planetary glyph
  - Auto-updates every minute via `setInterval`
- **Today surface** at `/` (replaces the placeholder):
  - Greeting block: Avatar + magickal name + the current planetary hour as a Stat
  - CelestialBand at the top
  - Recent-entries Card (mocked data — actual API integration is a later batch)
  - Quick-capture Button → opens PromptDialog → fires a Toast
  - EmptyState when "no entries today" (toggleable mock)

## Out of scope (later batches)

- **API integration** — backend's API is up but there's no client yet. Today uses mock seed data. Real fetch lands in the API-client batch.
- **Auth** — the AppShell still shows VaultNav unconditionally. Login + WebAuthn flow lands in the auth batch.
- **Sunrise/sunset for arbitrary lat/lng with full precision** — we use the suncalc library (MIT, ~5KB) since the formulas are non-trivial. Defer rolling our own to a later batch if there's a reason.
- **Astrological correspondences beyond the 7 classical planets** — Uranus/Neptune/Pluto wait for a later batch (the design's planetary-hour spec is classical).

## Dependencies

- `suncalc@^1.9.0` — sunrise/sunset + moon illumination calculations. MIT-licensed, no transitive deps.
- All Batches 1–5 primitives (`@theourgia/shared`)

## Component shape

```ts
interface CelestialBandProps {
  /** Latitude in degrees. */
  lat: number;
  /** Longitude in degrees. */
  lng: number;
  /** Override "now" for testing or playback. */
  now?: Date;
  /** Optional self-update interval in ms. Default 60000. Pass null to disable. */
  refreshMs?: number | null;
  /** Compact variant (one line) for header use. */
  variant?: "compact" | "full";
}
```

The CelestialBand renders, in order:
1. Day-night strip (horizontal: dawn → noon → dusk → midnight → dawn)
2. Current-time marker (a vertical line + glyph at the right offset)
3. Sub-label row: planetary hour (e.g. "Hour of Mars · 9 of 12 day-hours"), lunar phase (e.g. "Waning Gibbous · 73%"), gregorian date

Planetary hour algorithm:
- Day-hours = (sunset − sunrise) / 12
- Night-hours = (next sunrise − sunset) / 12
- Day ruler: Sun on Sunday … Saturn on Saturday (the standard correspondence)
- First day-hour is the day ruler; subsequent hours cycle through the Chaldean order:
  Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon (then back to Saturn)

## Today surface

`frontend/admin/src/routes/Today.tsx`:

```tsx
function Today() {
  const identity = MOCK_IDENTITY;            // Soror Ευ. Α.
  const location = DEFAULT_LOCATION;         // Greenwich for now (lat 51.4769, lng 0)
  const recentEntries = MOCK_ENTRIES;        // 3-4 seed entries

  return (
    <Stack>
      <Header>
        <Avatar identity={identity} size="lg" />
        <Greeting now={Date.now()} name={identity.name} />
      </Header>
      <CelestialBand lat={location.lat} lng={location.lng} />
      <Stats>...</Stats>
      <RecentEntries entries={recentEntries} />
      <QuickCaptureButton />
    </Stack>
  );
}
```

The mock seed lives in `frontend/admin/src/mocks/today.ts`; later batches replace it with API calls.

## Tests

For CelestialBand:
- Renders the current planetary hour glyph + label
- Renders the lunar-phase label + percentage
- Compact variant collapses to one line
- Auto-updates after `refreshMs` (using fake timers)
- Hand-tests for the planetary-hour algorithm against known fixtures (e.g. 2026-06-21 at Greenwich at noon = Hour of Sun on a Sunday)
- Accepts a fixed `now` for reproducible tests

For Today:
- Renders the greeting + CelestialBand + Stats + entries Card
- QuickCapture Button opens PromptDialog
- Submitting the prompt fires a Toast

Target ~20-25 new tests.

## Test plan

- `pnpm test` — 261 + new tests pass
- `pnpm typecheck` — clean
- `pnpm lint` — clean
- `pnpm deploy:dev` — ships + verify

## Acceptance criteria

1. CelestialBand exported from `@theourgia/shared`.
2. Today surface renders at `/admin/` with real CelestialBand + mock data.
3. The CelestialBand updates live (visible by changing the system clock or via the `now` prop).
4. Tests pass; typecheck + lint clean; deployed to dev.theourgia.com.

## What this batch deliberately does NOT do

- Real API calls (mocks only)
- Real auth (always-authenticated assumption stays)
- Sunrise/sunset edge cases for polar latitudes — defer
- Multi-calendar overlays — Hellenic / Hebrew / Coptic calendars wait for CalendarDate
- IndexedDB / local persistence for the mock data — pure render-time mocks for now

## Risks + mitigations

- **suncalc TypeScript types.** suncalc is a CommonJS package. Mitigation: it has `@types/suncalc` available; install both.
- **CelestialBand visual fidelity to the design.** The handoff describes the band but doesn't have a single .dc.html for it. Mitigation: hand-roll a clean version using the token palette; iterate visual after first review.
- **Default location.** Without auth + user settings, we don't know the user's lat/lng. Mitigation: default to Greenwich (51.4769° N, 0° E); make it configurable when settings + auth ship.

## Plan-doc-discipline

Same as prior batches.
