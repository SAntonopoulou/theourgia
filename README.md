# Theourgia

> *θεουργία* — "god-working"

A magickal journal CMS and full practitioner's toolkit. Open source, self-hostable, federated. For working magicians.

## Status

**Pre-alpha — planning phase.** No runnable code yet. The project is being designed end-to-end before implementation begins, in phases that prioritize architectural soundness and long-term maintainability over speed-to-MVP.

Read [PROJECT_PLAN.md](PROJECT_PLAN.md) for the vision, scope, and 16-phase roadmap.

## What this is

Theourgia is community infrastructure for practicing magicians — Thelemites, chaos magicians, Greek theurgists, witches, Hermeticists, ceremonialists, folk practitioners, and adjacent traditions. It treats magical practice as praxis worth recording rigorously, and treats data sovereignty as sacred.

What's planned (briefly):

- Multi-calendar overlays (Gregorian, Ancient Greek, Thelemic, Vedic, Coptic, Hebrew, Mayan, Egyptian decanic, …)
- Multi-tradition astrology engine (Western tropical, Hellenistic whole-sign, Vedic sidereal)
- Astrological election finder — "find me the best window for this working"
- Divination: tarot (with custom decks), I Ching, geomancy, runes, scrying, pendulum, bibliomancy, horary
- Sigil generation (multiple modes including formula-driven)
- Magic squares, talisman designer, magical circle builder
- Entity / spirit / god / ancestor / oath / contract ledger
- Gematria across multiple ciphers, with cross-journal value search
- Voces magicae library, transliteration, pronunciation
- Synchronicity log + "scientific illuminism" analytics
- Self-publishing of books (with Stripe), newsletters, RSS
- Federation between practitioner vaults and group hubs
- ActivityPub bridge for the wider Fediverse
- Plugin SDK for extensions (new traditions, divination systems, ciphers, calendars, etc.)

See [PROJECT_PLAN.md §4](PROJECT_PLAN.md) for the full feature catalog.

## Design principles

1. **Practitioner-grade depth.** No surface-level "spirituality app" features.
2. **Data sovereignty.** Self-hosted, local-first, user-controlled encryption.
3. **Quality over speed.** No MVP rush. Plan, build, test, document.
4. **Extensible by design.** Plugin architecture from day one.
5. **Security as foundation.** Encryption, auth, and threat modeling are first-class.
6. **Tradition-respectful.** No flattening of distinct practices.
7. **Documentation is product.** Self-hosters and contributors are first-class users.

## Privacy

**Zero telemetry. Ever.** Theourgia does not phone home. No analytics scripts ship. No usage tracking. No "anonymous" data collection. Your practice is yours. This is a hard guarantee, verified by automated test in CI.

## License

[AGPL-3.0](LICENSE). Free forever. This is community infrastructure, not a product.

## Documentation

- [PROJECT_PLAN.md](PROJECT_PLAN.md) — vision, scope, phasing index
- [ARCHITECTURE.md](ARCHITECTURE.md) — system design, trust model, data flow
- [plan/](plan/) — per-phase implementation plans (00 through 15)
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to get involved
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — community standards (with explicit respect for divergent magickal practice)
- [SECURITY.md](SECURITY.md) — vulnerability disclosure

## Maintainer

[@SAntonopoulou](https://github.com/SAntonopoulou)
