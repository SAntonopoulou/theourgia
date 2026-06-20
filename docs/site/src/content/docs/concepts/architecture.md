---
title: Architecture overview
description: A short overview of Theourgia's architecture, pointing at the canonical detail in the repository.
---

Theourgia is a single codebase that can operate in three composable roles:

- **Vault** — one magician's personal instance (journal, library, entities, …)
- **Hub** — a group's shared instance (a coven, order, sodality)
- **Both** — one running deployment can host any combination

Components communicate via the **Theourgia federation protocol** (Ed25519-signed HTTP messages), with an optional **ActivityPub bridge** for public broadcast to the wider Fediverse.

## The short list

- **Backend:** Python 3.12+, FastAPI, SQLModel, Alembic, PostgreSQL 16+, Redis, Celery
- **Frontend:** Astro 4+ (public site), React 19 (admin SPA), Tiptap (editor)
- **Astronomy:** Swiss Ephemeris (arcsecond precision, AGPL path)
- **Reverse proxy:** Caddy 2 with Cloudflare DNS-01
- **Container deploy:** Docker Compose with prod + dev overrides
- **License:** AGPL-3.0 forever

## Read deeper

The canonical architecture document is **[ARCHITECTURE.md](https://github.com/SAntonopoulou/theourgia/blob/main/ARCHITECTURE.md)** in the GitHub repository. It covers:

- Top-level mental model (vault / hub / instance)
- Full data model (~50 tables)
- Security & trust model (encryption modes, threat model, GDPR)
- Federation protocol specification
- AI agent integration layer
- Plugin architecture
- Deployment topology
- Testing strategy

Architecture Decision Records covering specific choices (license, backend stack, frontend stack, database, astronomy library, editor, reverse proxy, monorepo, commits) live in **[docs/adr/](https://github.com/SAntonopoulou/theourgia/tree/main/docs/adr)**.

The per-phase implementation plans are in **[plan/](https://github.com/SAntonopoulou/theourgia/tree/main/plan)** — seventeen files, one per phase, each detailed enough to resume work cold.
