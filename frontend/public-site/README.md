# Theourgia — Public Site

Astro 4+ application serving the public-facing surfaces of Theourgia:

- Landing page at theourgia.com
- Per-vault public pages (blog, books, public profile)
- Per-hub public pages
- Documentation reading surfaces (developer/user docs are served from `docs/`; this app surfaces them)
- RSS / Atom / JSON Feed endpoints
- Publication / book sales pages

## Status

**Planning phase — empty placeholder package.** Implementation begins with Phase 02 (Frontend Foundations).

Until then, the live `theourgia.com` is served by a static placeholder page on the host server. See the deployment docs.

## Development

From the **repository root**:

```bash
pnpm --filter @theourgia/public-site dev
```

## License

[AGPL-3.0-only](../../LICENSE).
