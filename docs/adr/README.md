# Architecture Decision Records (ADRs)

This directory holds Architecture Decision Records for Theourgia, following the [MADR](https://adr.github.io/madr/) format.

## What an ADR is

An ADR is a short document capturing a single significant architectural decision: what was decided, the context that made it relevant, the alternatives considered, the consequences. ADRs are written when a decision is made; they are not edited afterwards (instead, a new ADR supersedes the old one).

The point is not to write a textbook — it is to leave enough of a trail that a future contributor (or future-you) can understand *why* something is the way it is, without having to reconstruct the conversation that produced it.

## Conventions

- One ADR per decision
- Numbered sequentially: `NNNN-kebab-case-title.md`
- Use the MADR template (copy [template.md](template.md))
- Status: `proposed` → `accepted` → optionally `superseded by ADR-####` or `deprecated`
- ADRs are durable — never delete or rewrite an accepted ADR; supersede it with a new one
- Link from the relevant code, documentation, or commits when an ADR affects them

## Initial ADRs (planned, Phase 00)

| # | Title | Status |
|---|---|---|
| 0001 | Record architecture decisions | (planned) |
| 0002 | License is AGPL-3.0 | (planned) |
| 0003 | Backend stack: Python + FastAPI + SQLModel + Alembic | (planned) |
| 0004 | Frontend stack: Astro public site + React admin | (planned) |
| 0005 | PostgreSQL is the only supported database | (planned) |
| 0006 | Swiss Ephemeris over Skyfield for astrology | (planned) |
| 0007 | Tiptap as the editor foundation | (planned) |
| 0008 | Caddy as reference reverse proxy | (planned) |
| 0009 | Monorepo organization | (planned) |
| 0010 | Conventional Commits + semantic versioning | (planned) |

These will be authored in the second batch of Phase 00 work.
