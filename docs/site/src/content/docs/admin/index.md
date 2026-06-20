---
title: Admin guide (self-hosting)
description: How to deploy, operate, and maintain a Theourgia instance.
---

This section will hold self-hosting documentation: deployment, backups, migrations, monitoring, security.

Theourgia is currently in **planning phase**; the operational story is fully designed but not yet implemented. When phases 00–01 complete, this guide will cover:

- One-command deployment (Docker Compose or Helm)
- First-run setup wizard
- Multi-tenant deployment patterns (host shared Caddy + per-tenant snippets)
- Cloudflare R2 backup configuration
- Migration procedures (one-click with diff preview)
- Monitoring and observability
- Encryption mode configuration
- Federation peer management
- Disaster recovery

For now, see the project's [self-hoster reference Caddyfile](https://github.com/SAntonopoulou/theourgia/blob/main/Caddyfile.example) and the [agent-house deployment plan](https://github.com/SAntonopoulou/theourgia/tree/main/plan).
