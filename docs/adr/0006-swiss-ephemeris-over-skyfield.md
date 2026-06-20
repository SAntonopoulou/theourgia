# ADR-0006: Swiss Ephemeris over Skyfield for astrology calculations

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** @SAntonopoulou
- **Tags:** #astronomy, #licensing, #precision

## Context and problem statement

Theourgia's astrological engine (Phase 03) computes planetary positions, aspects, houses, dignities, and electional searches across centuries of dates. The accuracy of these calculations directly affects the practitioner's work — a chart with even subtle inaccuracies in a critical degree placement can produce a wrong interpretation.

We must choose an astronomical library that provides arcsecond-or-better precision, supports the date ranges practitioners actually use (roughly 1800–2400 AD covers most use), handles all classical planets + asteroids + nodes + parts + fixed stars, and is licensable for an AGPL-3.0 project.

## Decision drivers

- Arcsecond-or-better precision (planetary positions, aspects, house cusps)
- Date range coverage (at minimum 1800–2400 AD; ideally wider)
- House system support (Placidus, Whole-sign, Koch, Regiomontanus, Campanus, etc.)
- Sidereal zodiac support with multiple ayanāṃśa selections (for Vedic work)
- License compatibility with AGPL-3.0
- Reproducibility against established astrology software (so practitioners can cross-check charts)
- Active maintenance + community

## Considered options

1. **Swiss Ephemeris (via `pyswisseph`)** — Astrodienst's library; dual-licensed AGPL + commercial
2. **Skyfield** — pure Python, MIT-licensed; uses NASA JPL DE ephemerides directly
3. **PyMeeus** — pure Python implementation of Meeus's algorithms; MIT-licensed
4. **Roll our own** — wrap NASA JPL Horizons via API or compute ephemerides from first principles

## Decision

**Swiss Ephemeris via `pyswisseph`.**

## Rationale

Swiss Ephemeris is the reference astronomical library for astrology software. It is what Astrodienst's own (excellent) astro.com runs on, what Solar Fire uses, what most serious astrological tools rely on. This matters for **reproducibility**: a chart computed in Theourgia should match charts computed in established tools, otherwise practitioners cannot cross-check.

Precision and date range coverage are arcsecond-grade out to ±13,000 years, far beyond anything practitioners need. House systems, asteroids, nodes, fixed stars are all natively supported.

The licensing situation is settled — see [plan/03-time-and-cosmos.md §Swiss Ephemeris licensing](../../plan/03-time-and-cosmos.md) and the [NOTICE](../../NOTICE) file. Because Theourgia is AGPL-3.0 (see [ADR-0002](0002-license-agpl-3-0.md)), we qualify automatically for Astrodienst's free AGPL path; no commercial license fee. We honor the attribution requirements (rendered in chart output, about page, NOTICE file). This applies to all use cases — self-hosted, federated, and (future) paid SaaS — as long as Theourgia stays AGPL.

**Skyfield (option 2)** is excellent and MIT-licensed; for a project that wanted broad license compatibility (e.g., closed-source astrological products) it would win. But:
- Skyfield works directly off JPL DE ephemerides without the Astrodienst-derived corrections and asteroid sets that astrologers use
- Astrology-specific tooling (house systems, dignities, ayanāṃśa, fixed star catalog) is not built in — we'd be reimplementing what Swiss Ephemeris already provides
- Charts computed against Skyfield will not exactly match charts computed against established astrology tools — a reproducibility gap that practitioners would notice

**PyMeeus (option 3)** is a teaching implementation of Meeus's classical algorithms. Lower precision than Swiss Ephemeris (~arcminute, not arcsecond) and lacks the astrology-domain helpers. Suitable for back-of-envelope work, not for a serious practitioner toolkit.

**Roll our own (option 4)** is the wrong answer. The math is solved; the operationally hard parts (asteroid orbital elements, fixed-star catalog, dignity-system implementations across traditions) are decades of accumulated knowledge in Swiss Ephemeris. Reimplementing this would multiply the project's bug surface for no benefit.

The decisive factor was reproducibility: practitioners moving between Solar Fire, astro.com, and Theourgia get the same charts, building trust. Skyfield would have been the right call if we were closed-source — but we're not, so Swiss Ephemeris's licensing path is free and its precision is uncompromised.

## Consequences

### Positive
- Arcsecond precision; reference-grade ephemeris
- Charts match established astrology tools — cross-verification works
- Full coverage of houses, dignities, sidereal zodiacs, asteroids, fixed stars
- No licensing fee (Theourgia's AGPL-3.0 status qualifies for the free path automatically)
- Active maintenance by Astrodienst (the astrology research firm itself)

### Negative / trade-offs
- Bundled `.se1` ephemeris data files are ~50MB for a useful date range (1800–2400). We ship this in the backend image; self-hosters wanting wider date ranges can download more.
- Attribution requirements (Swiss Ephemeris + JPL DE) must appear in user-visible surfaces. Documented; baked into chart-renderer defaults.
- Pyswisseph is a Cython wrapper around the C library — adds a build-time dependency. Mitigated by using the official prebuilt wheels where available.
- Cannot be used in closed-source / non-AGPL-compatible products. Acceptable; Theourgia is AGPL forever (see [ADR-0002](0002-license-agpl-3-0.md)).

### Neutral
- Plugin authors writing astrology extensions must also use Swiss Ephemeris (or another AGPL-compatible engine); plugin manifest declares license compatibility.

## Implementation notes

- Package: `pyswisseph >= 2.10`
- Ephemeris data path: `/app/data/ephe` in containers; configurable via `THEOURGIA_EPHE_PATH` env var
- Ephemeris range bundled in the image: **1800–2400 AD** (slim mode; ~50MB)
- Documentation explains how to download wider date ranges (e.g., for historical research into ancient practice)
- Attribution rendered in:
  - About page (Phase 02)
  - Chart output components (Phase 03)
  - `docs/about/credits.md` (Phase 00 — to be authored)

## References

- [Swiss Ephemeris](https://www.astro.com/swisseph/)
- [pyswisseph on PyPI](https://pypi.org/project/pyswisseph/)
- [Skyfield](https://rhodesmill.org/skyfield/) — the alternative we did not choose
- [NOTICE](../../NOTICE) — required attribution
- [plan/03-time-and-cosmos.md §Swiss Ephemeris licensing](../../plan/03-time-and-cosmos.md)
- [ADR-0002: License is AGPL-3.0-only](0002-license-agpl-3-0.md)
