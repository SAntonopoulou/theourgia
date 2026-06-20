# ADR-0002: License is AGPL-3.0-only

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** @SAntonopoulou
- **Tags:** #licensing, #governance, #ethos

## Context and problem statement

Theourgia is software intended as **community infrastructure for practicing magicians**, not as a commercial product. The license we choose shapes who can use the software, who can build on it, and whether a future hosted service can be a closed-source revenue extraction. The maintainer is a lifelong member of the FSF and copyleft software movements and considers copyleft "the only way" — non-negotiable. The licensing choice should make that posture mechanical, not merely aspirational.

A secondary consideration: Theourgia depends on Swiss Ephemeris, which is dual-licensed (AGPL-3.0 OR commercial). To use the free path we must be AGPL-compatible.

## Decision drivers

- Mission is community infrastructure, not market capture
- Maintainer's strongly-held copyleft values
- Need for a license that *survives the maintainer* — future SaaS use cases cannot become an excuse to relicense
- Compatibility with Swiss Ephemeris's free path
- Plugin ecosystem implication: plugins should also be copyleft, not proprietary modules
- Plain-language usability for non-lawyer practitioners (we want the license to be understandable, not just enforceable)

## Considered options

1. **MIT** — maximal permissiveness, allows proprietary forks
2. **Apache-2.0** — like MIT but with explicit patent grant
3. **MPL-2.0** — file-level copyleft; weaker than GPL
4. **GPL-3.0** — strong copyleft for distribution; SaaS loophole (Section 13 of GPL doesn't apply)
5. **AGPL-3.0** — strong copyleft including for network use (closes the SaaS loophole)
6. **GPL-3.0 with Commons Clause** — adds "no commercial use" — incompatible with copyleft as commonly understood; not actually open source
7. **Custom "ethical source" license** — non-OSI-approved; community fragmentation risk

## Decision

**AGPL-3.0-only.**

## Rationale

AGPL-3.0 is the only well-known, OSI-approved license that:

1. Guarantees source-code openness even for network-deployed (SaaS) modifications via Section 13
2. Forces any derivative work (including plugins) to remain copyleft
3. Is unambiguously a Free Software / Open Source license that the FSF, OSI, and DFSG all bless
4. Allows commercial use (we are not anti-commerce; we are anti-proprietization) — magicians can charge for hosting, books, services, anything they like, while the software itself remains free

It also matches Swiss Ephemeris's free-path requirement, removing any need to pay Astrodienst CHF 700+ for a commercial license.

The Section 13 "network use" provision is the load-bearing part for Theourgia: a future hosted theourgia.com SaaS must publish its modifications, and any competing AGPL fork running a SaaS must do the same. This is by design — it's how the copyleft commitment survives the temptation of proprietary monetization.

MIT / Apache / MPL fail the "what if someone makes a closed-source fork?" test: under those licenses, they can. We don't want that to be possible.

GPL-3.0 (without the Affero clause) has the SaaS loophole: a competitor could run a proprietary modified version on their servers without ever shipping it, and never have to share modifications. AGPL-3.0 closes this.

"GPL with Commons Clause" and similar restricted licenses are not actually open source under OSI definitions and create community fragmentation. We reject restriction-via-license; if some use is wrong, the answer is community pressure and conduct enforcement, not license-level prohibition of payment.

## Consequences

### Positive
- The code is and remains free, forever — no version of Theourgia will ever be proprietary.
- Forks must publish modifications even when run as a service (closes the SaaS loophole).
- Plugin authors must use AGPL-compatible licenses, keeping the ecosystem copyleft.
- We qualify for Swiss Ephemeris's free AGPL path automatically; no commercial license fee.
- Maintainer's values are codified in the project's legal substrate.

### Negative / trade-offs
- AGPL is sometimes called "viral" and some companies refuse to use AGPL software at all — this limits adoption in certain corporate environments. This is acceptable; the audience is practitioners, not Fortune 500 IT departments.
- Future hosted-SaaS offerings cannot use the code as a moat — anyone can run a competing instance. By design (see [PROJECT_PLAN.md §8](../../PROJECT_PLAN.md) item 4).
- Some open-source projects with permissive licenses won't depend on AGPL code, limiting some upstream contributions. Mitigated by the project being community infrastructure with its own ecosystem.

### Neutral
- Attribution requirements from dependencies (Swiss Ephemeris specifically) must be honored in user-visible surfaces; see [ADR-0006](0006-swiss-ephemeris-over-skyfield.md) and [NOTICE](../../NOTICE).

## Implementation notes

- The `LICENSE` file at the repo root contains the full AGPL-3.0 text.
- Every package manifest (`pyproject.toml`, `package.json`) declares `AGPL-3.0-only`.
- Contributors agree their contributions are AGPL-3.0 via [CONTRIBUTING.md](../../CONTRIBUTING.md).
- This decision is treated as **immutable**. Any proposal to change it requires a community-wide discussion, the maintainer's explicit consent, and a superseding ADR. The maintainer has stated they will not consent.

## References

- [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html)
- [FSF: Why the AGPL](https://www.gnu.org/licenses/why-affero-gpl.html)
- [PROJECT_PLAN.md §8 item 4](../../PROJECT_PLAN.md) — SaaS posture commitment
- [memory: project_licensing_and_ethos](../../README.md) — full ethos statement
- [NOTICE](../../NOTICE) — third-party attribution under AGPL
